import express, { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { bodyImageKey, bodyIndexOf, STYLES_BY_PROVIDER } from "../../shared/types";
import { isImageBusy, isRunning, runImage, runImages } from "../pipeline";
import { ImageOptionsSchema } from "../schema";
import { getJob, jobImageDir, log, removeImageFile, updateJob } from "../store";
import { markBusy, wrap } from "./util";

/** 이미지: 다시 만들기, 한 장만 다시 만들기, 직접 올리기, 미리보기 */
export const router = Router();

router.post(
  "/api/jobs/:id/regenerate-images",
  wrap(async (req, res) => {
    const job = await getJob(String(req.params.id));
    if (!job?.post) return void res.status(400).json({ error: "초안이 없습니다." });
    if (isRunning(job.id)) return void res.status(409).json({ error: "이미 진행 중입니다." });
    const body = z
      .object({
        style: z.enum(["flat", "ghibli", "realistic", "anime"]).optional(),
        provider: z.enum(["claude", "gemini", "chatgpt"]).optional(),
        /** 썸네일만 다른 AI·스타일로 */
        thumbnailProvider: z.enum(["claude", "gemini", "chatgpt"]).optional(),
        thumbnailStyle: z.enum(["flat", "ghibli", "realistic", "anime"]).optional(),
        onlyFailed: z.boolean().optional(),
        /** 썸네일이 없는 글에 썸네일을 추가로 만든다 (다른 이미지는 그대로) */
        addThumbnail: z.boolean().optional(),
      })
      .safeParse(req.body ?? {});
    if (!body.success) return void res.status(400).json({ error: "이미지 옵션 값이 올바르지 않습니다." });
    const { style, provider, thumbnailProvider, thumbnailStyle, onlyFailed, addThumbnail } = body.data;
    if (addThumbnail) {
      await updateJob(job.id, (j) => {
        j.imageOptions = { ...j.imageOptions, thumbnail: true };
        if (j.post && !j.post.thumbnail) {
          const summary = j.post.summary?.trim();
          // 문구(headline)와 장면은 이미지를 만들기 직전에 본문을 보고 정한다 (pipeline.makeImages → planThumbnail).
          // 그게 실패할 때를 위한 기본 장면만 넣어 둔다.
          j.post.thumbnail = {
            basis: j.post.title,
            prompt: `블로그 글 "${j.post.title}"의 대표 썸네일. ${summary ? `핵심 내용: ${summary}. ` : ""}글의 주제가 한눈에 보이는 한 장면.`,
            alt: j.post.title,
          };
        }
      });
    }
    if (style || provider || thumbnailProvider || thumbnailStyle) {
      const current = (await getJob(job.id))!.imageOptions;
      const next = ImageOptionsSchema.safeParse({
        ...current,
        ...(provider && { provider }),
        ...(style && { style }),
        ...(thumbnailProvider && { thumbnailProvider }),
        ...(thumbnailStyle && { thumbnailStyle }),
      });
      if (!next.success) return void res.status(400).json({ error: next.error.issues[0].message });
      await updateJob(job.id, (j) => {
        j.imageOptions = next.data;
      });
    }
    await markBusy(job.id, "generating_images");
    void runImages(job.id, addThumbnail ? "thumbnail" : onlyFailed ? "failed" : "all");
    res.status(202).json({ ok: true });
  }),
);

// 이미지 한 장만 다시 만들기: target은 "thumbnail" 또는 "body-<블록 번호>".
// 고른 AI·스타일은 이번에만 쓰고 글의 이미지 설정은 바꾸지 않는다 (다른 이미지에 영향 없음).
// 다른 이미지를 한 장씩 다시 만드는 중이어도 받는다 (동시에 만든다). 다른 단계가 돌거나 그 이미지를 만드는 중이면 409.
router.post(
  "/api/jobs/:id/images/:target/regenerate",
  wrap(async (req, res) => {
    const job = await getJob(String(req.params.id));
    if (!job?.post) return void res.status(400).json({ error: "초안이 없습니다." });
    if (isImageBusy(job.id, String(req.params.target))) return void res.status(409).json({ error: "이미 진행 중입니다." });
    const body = z
      .object({
        provider: z.enum(["claude", "gemini", "chatgpt"]),
        style: z.enum(["flat", "ghibli", "realistic", "anime"]),
        method: z.enum(["api", "chrome"]).optional(),
      })
      .safeParse(req.body ?? {});
    if (!body.success) return void res.status(400).json({ error: "AI와 스타일을 골라 주세요." });
    const { provider, style, method } = body.data;
    if (!STYLES_BY_PROVIDER[provider].includes(style)) {
      return void res.status(400).json({ error: "Claude(SVG)는 플랫 일러스트만 그릴 수 있습니다. 다른 스타일은 Gemini 또는 ChatGPT를 고르세요." });
    }
    const target = String(req.params.target);
    const index = bodyIndexOf(target);
    const exists = target === "thumbnail" ? !!job.post.thumbnail : index !== null && job.post.blocks[index]?.type === "image";
    if (!exists) return void res.status(404).json({ error: "다시 만들 이미지를 찾지 못했습니다. 화면을 새로고침해 주세요." });
    if (target === "thumbnail" && !job.imageOptions.thumbnail) {
      // 썸네일이 꺼진 채로 남아 있으면 만들 대상에서 빠지므로 켠다
      await updateJob(job.id, (j) => {
        j.imageOptions = { ...j.imageOptions, thumbnail: true };
      });
    }
    await markBusy(job.id, "generating_images");
    await updateJob(job.id, (j) => {
      j.imageRunsOnly = true;
    });
    void runImage(job.id, index === null ? "thumbnail" : bodyImageKey(index), { provider, style }, method);
    res.status(202).json({ ok: true });
  }),
);

// 이미지 직접 올리기: target은 "thumbnail" 또는 "body-<블록 번호>". 본문은 이미지 바이너리 그대로.
const UPLOAD_EXT: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif" };
router.post(
  "/api/jobs/:id/images/:target",
  express.raw({ type: Object.keys(UPLOAD_EXT), limit: "20mb" }),
  wrap(async (req, res) => {
    const job = await getJob(String(req.params.id));
    if (!job?.post) return void res.status(400).json({ error: "초안이 없습니다." });
    // 다른 이미지를 한 장씩 만드는 중이면 올릴 수 있다. 다른 단계가 돌거나 바로 그 이미지를 만드는 중이면 막는다.
    if (isImageBusy(job.id, String(req.params.target))) return void res.status(409).json({ error: "진행 중인 작업이 끝난 뒤에 올려 주세요." });
    const ext = UPLOAD_EXT[String(req.headers["content-type"] ?? "").split(";")[0]];
    if (!ext || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return void res.status(400).json({ error: "PNG, JPG, WEBP, GIF 이미지만 올릴 수 있습니다." });
    }
    const target = String(req.params.target);
    const index = bodyIndexOf(target);
    const exists = target === "thumbnail" ? !!job.post.thumbnail : index !== null && job.post.blocks[index]?.type === "image";
    if (!exists) return void res.status(404).json({ error: "이미지를 넣을 자리를 찾지 못했습니다. 화면을 새로고침해 주세요." });

    const name = `${target}-upload-${Date.now()}${ext}`;
    const dir = jobImageDir(job.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), req.body);
    let oldFile = undefined as string | undefined;
    await updateJob(job.id, (j) => {
      const b = index !== null ? j.post?.blocks[index] : undefined;
      const spec = target === "thumbnail" ? j.post?.thumbnail : b?.type === "image" ? b : undefined;
      if (!spec) return;
      oldFile = spec.file;
      spec.file = name;
      delete spec.error;
      delete spec.errorKind;
      delete spec.errorProvider;
    });
    if (oldFile && oldFile !== name) await removeImageFile(job.id, oldFile); // 새 이미지가 기록된 뒤에 예전 파일 삭제
    await log(job.id, `${target === "thumbnail" ? "썸네일" : `본문 이미지 #${index}`}을 직접 올린 이미지로 바꿨습니다.`);
    res.json({ file: name });
  }),
);

// 생성된 이미지 미리보기 (파일명은 basename으로 제한)
router.get("/api/images/:id/:file", (req, res) => {
  const file = path.join(jobImageDir(String(req.params.id)), path.basename(String(req.params.file)));
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.status(404).end();
  });
});
