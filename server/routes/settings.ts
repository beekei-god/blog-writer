import { Router } from "express";
import { z } from "zod";
import { errorText } from "../../shared/labels";
import { MODEL_CHOICES, STAGES, type ModelChoice, type Stage } from "../../shared/types";
import { testDatalab } from "../datalab";
import { getRules, resetRules, saveRules } from "../rules";
import { ImageOptionsSchema } from "../schema";
import { getNaverKeys, saveNaverKeys, saveWordPressAuth } from "../secrets";
import { getSettings, saveSettings } from "../store";
import { listCategories, testWordPress, WordPressError } from "../wordpress";
import { wordpressStatus, wrap } from "./util";

/** 설정, 글쓰기 규칙, 데이터랩 키, 워드프레스 연결 */
export const router = Router();

const SettingsSchema = z
  .object({
    // 블로그는 각각 따로 설정한다 (기본 블로그 없음). 글을 올릴 때마다 올릴 블로그를 고른다.
    naverBlogId: z.string().trim().max(200).optional(),
    tistoryBlogId: z.string().trim().max(200).optional(),
    images: ImageOptionsSchema,
    wordpressUrl: z.string().trim().max(200).optional(),
    wordpressCategoryId: z.number().int().positive().optional(),
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
    await saveSettings(parsed.data);
    res.json(parsed.data);
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
router.get(
  "/api/wordpress/categories",
  wrap(async (_req, res) => {
    try {
      res.json(await listCategories());
    } catch (e) {
      res.status(e instanceof WordPressError ? 400 : 500).json({ error: errorText(e) });
    }
  }),
);
