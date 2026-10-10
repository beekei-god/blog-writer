import { Router } from "express";
import { z } from "zod";
import { errorText } from "../../shared/labels";
import { MODEL_CHOICES, STAGES, type ModelChoice, type Stage } from "../../shared/types";
import { testDatalab } from "../datalab";
import { getRules, resetRules, saveRules } from "../rules";
import { ImageOptionsSchema, WritingOptionsSchema } from "../schema";
import { testImageApiKey } from "../images/api";
import { getImageApiKey, getNaverKeys, getSearchAdKeys, saveImageApiKey, saveNaverKeys, saveSearchAdKeys, saveWordPressAuth } from "../secrets";
import { testSearchAd } from "../searchad";
import { getSettings, saveSettings } from "../store";
import { testWordPress } from "../wordpress";
import { wordpressStatus, wrap } from "./util";

/** 설정, 글쓰기 규칙, 데이터랩 키, 이미지 API 키, 워드프레스 연결 */
export const router = Router();

const SettingsSchema = z
  .object({
    // 블로그는 각각 따로 설정한다 (기본 블로그 없음). 글을 올릴 때마다 올릴 블로그를 고른다.
    naverBlogId: z.string().trim().max(200).optional(),
    tistoryBlogId: z.string().trim().max(200).optional(),
    images: ImageOptionsSchema,
    /** 새 작업의 분량·말투 기본값 (새 글을 만들 때 기억된다) */
    writing: WritingOptionsSchema.optional(),
    wordpressUrl: z.string().trim().max(200).optional(),
    models: z.object(Object.fromEntries(STAGES.map((s) => [s, z.enum(MODEL_CHOICES)])) as Record<Stage, z.ZodEnum<{ [K in ModelChoice]: K }>>),
  })
  .superRefine((v, ctx) => {
    // 블로그별 값을 각각 검사한다.
    for (const key of ["naverBlogId", "tistoryBlogId"] as const) {
      if (v[key] && !/^[\w-]+$/.test(v[key]!)) ctx.addIssue({ code: "custom", path: [key], message: "영문/숫자/_/- 만 가능합니다" });
    }
    if (v.wordpressUrl && !/^(https:\/\/)?[\w.-]+(:\d+)?(\/[\w./-]*)?$/.test(v.wordpressUrl)) {
      ctx.addIssue({ code: "custom", path: ["wordpressUrl"], message: "워드프레스 사이트 주소는 https:// 주소여야 합니다. (예: https://myblog.com)" });
    }
  });

router.get("/api/settings", wrap(async (_req, res) => res.json(await getSettings())));

router.put(
  "/api/settings",
  wrap(async (req, res) => {
    const parsed = SettingsSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: parsed.error.issues[0].message });
    const next = { ...parsed.data, writing: parsed.data.writing ?? (await getSettings()).writing };
    await saveSettings(next);
    res.json(next);
  }),
);

// 글쓰기 규칙: 작업을 시작할 때마다 새로 읽으므로 저장 즉시 다음 작업부터 적용된다.
router.get("/api/rules", wrap(async (_req, res) => res.json(await getRules())));
router.put(
  "/api/rules",
  wrap(async (req, res) => {
    const parsed = z.object({ content: z.string().trim().min(1).max(50_000) }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "규칙 내용이 비어 있거나 너무 깁니다." });
    res.json(await saveRules(parsed.data.content + "\n"));
  }),
);
router.post("/api/rules/reset", wrap(async (_req, res) => res.json(await resetRules())));

// ───── 데이터랩 키 (값은 돌려주지 않고 설정 여부만 알려 준다) ─────
router.get(
  "/api/datalab",
  wrap(async (_req, res) => {
    const keys = await getNaverKeys();
    res.json({ configured: !!keys, clientIdHint: keys ? `${keys.clientId.slice(0, 4)}…` : null });
  }),
);
router.put(
  "/api/datalab",
  wrap(async (req, res) => {
    const parsed = z.object({ clientId: z.string().trim().min(1), clientSecret: z.string().trim().min(1) }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Client ID와 Client Secret을 모두 입력하세요." });
    try {
      await testDatalab(parsed.data);
    } catch (e) {
      return void res.status(400).json({ error: errorText(e) });
    }
    await saveNaverKeys(parsed.data);
    res.json({ configured: true, clientIdHint: `${parsed.data.clientId.slice(0, 4)}…` });
  }),
);
router.delete(
  "/api/datalab",
  wrap(async (_req, res) => {
    await saveNaverKeys(null);
    res.json({ configured: !!(await getNaverKeys()), clientIdHint: null });
  }),
);

// ───── 네이버 검색광고 API 키 (키워드 탐색. 값은 돌려주지 않고 설정 여부와 고객 ID 앞부분만 알려 준다) ─────
const searchAdStatus = async () => {
  const k = await getSearchAdKeys();
  return { configured: !!k, customerIdHint: k ? `${k.customerId.slice(0, 3)}…` : null, fromEnv: !!k?.fromEnv };
};
router.get("/api/searchad", wrap(async (_req, res) => res.json(await searchAdStatus())));
router.put(
  "/api/searchad",
  wrap(async (req, res) => {
    const parsed = z
      .object({ customerId: z.string().trim().min(1).max(40), apiKey: z.string().trim().min(1).max(200), secretKey: z.string().trim().min(1).max(200) })
      .safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "고객 ID, API 키, 비밀 키를 모두 입력하세요." });
    try {
      await testSearchAd(parsed.data);
    } catch (e) {
      return void res.status(400).json({ error: errorText(e) });
    }
    await saveSearchAdKeys(parsed.data);
    res.json(await searchAdStatus());
  }),
);
router.delete(
  "/api/searchad",
  wrap(async (_req, res) => {
    await saveSearchAdKeys(null);
    res.json(await searchAdStatus());
  }),
);

// ───── 이미지 API 키 (Gemini, OpenAI. 값은 돌려주지 않고 설정 여부만 알려 준다) ─────
const IMAGE_APIS = ["gemini", "chatgpt"] as const;
const keyStatus = async (ai: (typeof IMAGE_APIS)[number]) => {
  const k = await getImageApiKey(ai);
  return { configured: !!k, hint: k ? `${k.key.slice(0, 6)}…` : null, fromEnv: !!k?.fromEnv };
};
const imageApiStatus = async () => ({ gemini: await keyStatus("gemini"), chatgpt: await keyStatus("chatgpt") });
const ImageApiParam = z.enum(IMAGE_APIS);

router.get("/api/image-api", wrap(async (_req, res) => res.json(await imageApiStatus())));
router.put(
  "/api/image-api/:ai",
  wrap(async (req, res) => {
    const ai = ImageApiParam.safeParse(req.params.ai);
    if (!ai.success) return void res.status(404).json({ error: "알 수 없는 이미지 API입니다." });
    const parsed = z.object({ key: z.string().trim().min(1).max(500) }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "API 키를 입력하세요." });
    try {
      await testImageApiKey(ai.data, parsed.data.key);
    } catch (e) {
      return void res.status(400).json({ error: errorText(e) });
    }
    await saveImageApiKey(ai.data, parsed.data.key);
    res.json(await imageApiStatus());
  }),
);
router.delete(
  "/api/image-api/:ai",
  wrap(async (req, res) => {
    const ai = ImageApiParam.safeParse(req.params.ai);
    if (!ai.success) return void res.status(404).json({ error: "알 수 없는 이미지 API입니다." });
    await saveImageApiKey(ai.data, null);
    res.json(await imageApiStatus());
  }),
);

// ───── 워드프레스 API 연결 (Application Password는 저장만 하고 화면으로 돌려주지 않는다) ─────
router.get(
  "/api/wordpress",
  wrap(async (_req, res) => res.json(await wordpressStatus())),
);
router.put(
  "/api/wordpress",
  wrap(async (req, res) => {
    const parsed = z.object({ username: z.string().trim().min(1).max(200), appPassword: z.string().trim().min(1).max(200) }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "사용자명과 Application Password를 모두 입력하세요." });
    try {
      await testWordPress(parsed.data);
    } catch (e) {
      return void res.status(400).json({ error: errorText(e) });
    }
    await saveWordPressAuth(parsed.data);
    res.json(await wordpressStatus());
  }),
);
router.delete(
  "/api/wordpress",
  wrap(async (_req, res) => {
    await saveWordPressAuth(null);
    res.json(await wordpressStatus());
  }),
);
