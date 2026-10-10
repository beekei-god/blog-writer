import { Router } from "express";
import { z } from "zod";
import { errorText, MANUAL_STATUS_LABEL, PLATFORM_LABEL, PLATFORM_SHORT_LABEL } from "../../shared/labels";
import { MAX_TARGET_CHARS, MIN_TARGET_CHARS } from "../../shared/length";
import { imageSpecsOf, MANUAL_STATUSES, PLATFORMS, MAX_LINKS, NAVER_MINUTE_STEP, settingsFor, type ImageSpec, type Post } from "../../shared/types";
import { extensionStatus, INSTALL_URL } from "../browser/claudeChrome";
import { cancelJob } from "../cancel";
import { isRunning, runDraft, runPost } from "../pipeline";
import { saveLastCategory } from "../categories";
import { BlogCategorySchema, ImageOptionsSchema, PostSchema, WritingOptionsSchema } from "../schema";
import { createJob, deleteJob, getJob, getSettings, listJobs, log, saveSettings, updateJob } from "../store";
import { checkSchedule, normalizeSite, wordpressSiteOf } from "../wordpress";
import { isCompleteTable } from "../writer";
import { regenerateTitles } from "../titles";
import { getRules, todayKST } from "../rules";
import { markBusy, wordpressStatus, wrap } from "./util";

/** 글(작업): 만들기·읽기·초안 수정·블로그 등록·상태 변경·중지·다시 시도·삭제 */
export const router = Router();

type ImageResult = Pick<ImageSpec, "file" | "error" | "errorKind" | "errorProvider">;
const resultOf = (s: ImageSpec): ImageResult => ({ file: s.file, error: s.error, errorKind: s.errorKind, errorProvider: s.errorProvider });

/**
 * 이미지 파일·실패 기록은 서버가 정한다. 화면이 예전 초안을 저장해도 새로 만든 이미지 기록을 덮어쓰지 않게,
 * 같은 이미지(프롬프트가 같은 것, 없으면 같은 순서)의 결과는 서버에 있는 값을 쓴다.
 */
function keepImageResults(next: Post, prev: Post | undefined): Post {
  if (!prev) return next;
  const prevImages = imageSpecsOf(prev);
  const used = new Set<ImageSpec>();
  const nextImages = imageSpecsOf(next);
  const sameCount = prevImages.length === nextImages.length;
  nextImages.forEach((spec, i) => {
    const match =
      prevImages.find((p) => !used.has(p) && p.prompt === spec.prompt) ?? (sameCount && !used.has(prevImages[i]) ? prevImages[i] : undefined);
    if (!match) return;
    used.add(match);
    Object.assign(spec, resultOf(match));
    for (const k of ["file", "error", "errorKind", "errorProvider"] as const) if (spec[k] === undefined) delete spec[k];
  });
  return next;
}

router.get("/api/jobs", wrap(async (_req, res) => res.json(await listJobs())));

router.post(
  "/api/jobs",
  wrap(async (req, res) => {
    const parsed = z
      .object({
        topic: z.string().trim().min(2).max(300),
        images: ImageOptionsSchema,
        /** 분량·말투. 없으면 마지막으로 쓴 값 */
        writing: WritingOptionsSchema.optional(),
        links: z.array(z.string().trim().url().regex(/^https?:\/\//i)).max(MAX_LINKS).default([]),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const msg =
        issue.path[0] === "links"
          ? "참고 링크는 http(s)로 시작하는 주소여야 합니다."
          : issue.path[0] === "topic"
            ? issue.code === "too_big"
              ? "주제는 300자 이하로 입력하세요."
              : "주제를 2자 이상 입력하세요."
            : issue.path[0] === "writing"
              ? `본문 분량은 ${MIN_TARGET_CHARS.toLocaleString()}~${MAX_TARGET_CHARS.toLocaleString()}자 사이로, 말투는 목록에서 고르세요.`
              : issue.message;
      return void res.status(400).json({ error: msg });
    }
    const { topic, images, links } = parsed.data;
    const settings = await getSettings();
    const writing = parsed.data.writing ?? settings.writing;
    // 마지막으로 쓴 이미지·분량·말투 옵션을 다음 작업의 기본값으로 기억한다.
    await saveSettings({ ...settings, images, writing });
    const job = await createJob(topic, images, links, writing);
    void runDraft(job.id);
    res.status(201).json(job);
  }),
);

router.get(
  "/api/jobs/:id",
  wrap(async (req, res) => {
    const job = await getJob(String(req.params.id));
    if (!job) return void res.status(404).json({ error: "not found" });
    res.json(job);
  }),
);

// 초안 수정 (제목/본문/태그)
router.put(
  "/api/jobs/:id/post",
  wrap(async (req, res) => {
    const parsed = PostSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "글 형식이 올바르지 않습니다." });
    if (isRunning(String(req.params.id))) return void res.status(409).json({ error: "작업 진행 중에는 수정할 수 없습니다." });
    const job = await updateJob(String(req.params.id), (j) => {
      const next = keepImageResults(parsed.data, j.post);
      next.blocks = next.blocks.filter((b) => b.type !== "table" || isCompleteTable(b));
      j.post = next;
    });
    if (!job) return void res.status(404).json({ error: "not found" });
    res.json(job);
  }),
);

// 제목 후보만 새로 만든다. 글에는 넣지 않고 돌려준다 (화면이 후보로 보여 주고, 저장은 화면의 자동 저장으로 한다)
router.post(
  "/api/jobs/:id/titles",
  wrap(async (req, res) => {
    const job = await getJob(String(req.params.id));
    if (!job) return void res.status(404).json({ error: "not found" });
    if (!job.post) return void res.status(400).json({ error: "초안이 없습니다." });
    if (isRunning(job.id)) return void res.status(409).json({ error: "진행 중인 작업이 끝난 뒤에 다시 만들어 주세요." });
    const rules = job.rulesSnapshot ?? (await getRules()).content;
    const titleCandidates = await regenerateTitles({ post: job.post, topic: job.topic, rules, today: todayKST(), jobId: job.id });
    await log(job.id, `제목 후보를 다시 만들었습니다: ${titleCandidates.join(" / ")}`);
    res.json({ titleCandidates });
  }),
);

router.post(
  "/api/jobs/:id/post-to-blog",
  wrap(async (req, res) => {
    const job = await getJob(String(req.params.id));
    if (!job?.post) return void res.status(400).json({ error: "초안이 없습니다." });
    if (isRunning(job.id)) return void res.status(409).json({ error: "이미 진행 중입니다." });
    const body = z
      .object({
        mode: z.enum(["draft", "schedule", "publish"]).default("draft"),
        scheduledAt: z.iso.datetime().optional(),
        /** 이 글을 올릴 블로그. 기본 블로그가 없으므로 항상 직접 고른다. */
        platform: z.enum(["naver", "tistory", "wordpress"]),
        /** 고른 카테고리 (없으면 블로그 기본). 워드프레스는 사이트의 카테고리 ID가 필요하다 */
        category: BlogCategorySchema.optional(),
      })
      .safeParse(req.body ?? {});
    if (!body.success) {
      return void res.status(400).json({ error: body.error.issues[0]?.path[0] === "category" ? "카테고리 값이 올바르지 않습니다." : "올릴 블로그를 선택하세요." });
    }
    const { mode, scheduledAt, platform, category } = body.data;
    if (platform === "wordpress" && category && !category.id) {
      return void res.status(400).json({ error: "워드프레스 카테고리는 사이트 목록에서 골라 주세요." });
    }
    const all = await getSettings();
    const settings = settingsFor(all, platform);
    if (!settings.blogId) {
      return void res.status(400).json({ error: `먼저 설정에서 ${PLATFORM_SHORT_LABEL[platform]} ${platform === "wordpress" ? "사이트 주소" : "블로그 ID"}를 입력하세요.` });
    }
    if (platform === "wordpress") {
      // 워드프레스는 API로 올린다 (크롬·확장 프로그램 불필요). 임시저장·예약발행·자동발행 모두 가능.
      try {
        normalizeSite(wordpressSiteOf(all));
        if (mode === "schedule") checkSchedule(scheduledAt);
      } catch (e) {
        return void res.status(400).json({ error: errorText(e) });
      }
      if (!(await wordpressStatus()).configured) {
        return void res.status(400).json({ error: "워드프레스 연결 정보가 없습니다. 설정 → 워드프레스 설정에서 연결하세요." });
      }
    } else {
      // 크롬으로 올리는 블로그도 임시저장·예약발행·자동발행을 고른다 (늘 임시저장을 먼저 하고 발행 창에서 발행한다).
      if (mode === "schedule") {
        try {
          checkSchedule(scheduledAt);
        } catch (e) {
          return void res.status(400).json({ error: errorText(e) });
        }
        if (platform === "naver" && new Date(scheduledAt!).getUTCMinutes() % NAVER_MINUTE_STEP) {
          return void res.status(400).json({ error: `네이버 예약 시각은 ${NAVER_MINUTE_STEP}분 단위로 고를 수 있습니다.` });
        }
      }
      if (!(await extensionStatus()).installed) {
        return void res.status(400).json({ error: `블로그 작성은 Claude in Chrome 확장 프로그램으로 합니다. 크롬에 설치해 주세요: ${INSTALL_URL}` });
      }
    }
    await markBusy(job.id, "posting", platform);
    await saveLastCategory(platform, category); // 다음에 이 블로그에 올릴 때 처음 값으로 쓴다
    void runPost(job.id, { mode, scheduledAt, platform, category });
    res.status(202).json({ ok: true });
  }),
);

// 초안이 있는 글은 블로그마다 상태를 직접 바꾼다 (앱이 블로그에 올리거나 발행하지는 않고 표시만 바꾼다).
// 올리지 않음·임시저장 완료·발행완료 중에서 고르고, 다른 블로그의 상태는 그대로 둔다. 발행 예약은 앱이 예약발행했을 때만 생긴다.
router.put(
  "/api/jobs/:id/blogs/:platform/status",
  wrap(async (req, res) => {
    const platform = PLATFORMS.find((p) => p === req.params.platform);
    const parsed = z.object({ status: z.enum(MANUAL_STATUSES) }).safeParse(req.body);
    if (!platform || !parsed.success) return void res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
    const id = String(req.params.id);
    const job = await getJob(id);
    if (!job) return void res.status(404).json({ error: "not found" });
    if (isRunning(id)) return void res.status(409).json({ error: "이미 진행 중입니다." });
    const { status } = parsed.data;
    const current = job.blogs?.[platform]?.status ?? "none";
    if (!job.post) return void res.status(400).json({ error: "초안이 없는 글은 블로그 상태를 바꿀 수 없습니다." });
    if (current === status) {
      return void res.status(400).json({ error: `${PLATFORM_LABEL[platform]}에서 이미 ${MANUAL_STATUS_LABEL[status]} 상태입니다.` });
    }
    const next = await updateJob(id, (j) => {
      const blogs = { ...j.blogs };
      if (status === "none") delete blogs[platform];
      else blogs[platform] = { status, at: new Date().toISOString() };
      j.blogs = blogs;
      j.error = undefined;
    });
    await log(id, `${PLATFORM_LABEL[platform]} 상태를 ${MANUAL_STATUS_LABEL[status]}(으)로 표시했습니다.`);
    res.json(next);
  }),
);

router.post(
  "/api/jobs/:id/cancel",
  wrap(async (req, res) => {
    if (!cancelJob(String(req.params.id))) return void res.status(409).json({ error: "중지할 작업이 없습니다." });
    await log(String(req.params.id), "중지 요청을 받았습니다. 지금 단계를 멈추는 중입니다.");
    res.status(202).json({ ok: true });
  }),
);

router.post(
  "/api/jobs/:id/retry",
  wrap(async (req, res) => {
    const job = await getJob(String(req.params.id));
    if (!job) return void res.status(404).json({ error: "not found" });
    if (isRunning(job.id)) return void res.status(409).json({ error: "이미 진행 중입니다." });
    await markBusy(job.id, "researching");
    void runDraft(job.id);
    res.status(202).json({ ok: true });
  }),
);

router.delete(
  "/api/jobs/:id",
  wrap(async (req, res) => {
    if (isRunning(String(req.params.id))) return void res.status(409).json({ error: "진행 중인 작업은 삭제할 수 없습니다." });
    await deleteJob(String(req.params.id));
    res.status(204).end();
  }),
);
