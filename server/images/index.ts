import path from "node:path";
import { IMAGE_ERROR_INFO, type ImageErrorKind } from "../../shared/imageErrors";
import { aiFor, bodyIndexOf, imageKey, imageSpecAt, methodFor, type ImageOptions, type ImageProvider, type ImageScope, type ImageSpec, type Post } from "../../shared/types";
import { CancelledError, throwIfCancelled } from "../cancel";
import { jobImageDir, removeImageFile, updateJob } from "../store";
import { getImageApiKey } from "../secrets";
import { generateWithApi } from "./api";
import { errorKindOf } from "./errors";
import { imageRequest } from "./styles";
import { generateSvgImage } from "./svg";
import { generateWithWebAi, type WebAi } from "./webAi";
import { errorText } from "../../shared/labels";

export type Target =
  | { kind: "thumbnail"; spec: ImageSpec }
  | { kind: "body"; index: number; spec: ImageSpec };

/** scope: 전부 / 아직 파일이 없는(실패했거나 만들지 못한) 이미지만 / 썸네일만 / 본문 이미지 한 장 */
export function collectTargets(post: Post, options: ImageOptions, scope: ImageScope = "all"): Target[] {
  const targets: Target[] = [];
  if (options.thumbnail && post.thumbnail) targets.push({ kind: "thumbnail", spec: post.thumbnail });
  post.blocks.forEach((b, index) => {
    if (b.type === "image") targets.push({ kind: "body", index, spec: b });
  });
  if (scope === "failed") return targets.filter((t) => !t.spec.file);
  if (scope === "thumbnail") return targets.filter((t) => t.kind === "thumbnail");
  const index = bodyIndexOf(scope);
  if (index !== null) return targets.filter((t) => t.kind === "body" && t.index === index);
  return targets;
}

type Outcome = { file: string } | { error: string; errorKind: ImageErrorKind; errorProvider: ImageProvider };

/** 생성 결과(파일명 또는 오류)를 job 파일에 바로 기록한다. key: "thumbnail" 또는 "body-<블록 번호>" */
async function record(jobId: string, key: string, patch: Outcome) {
  let oldFile = undefined as string | undefined;
  const job = await updateJob(jobId, (j) => {
    const spec = imageSpecAt(j.post, key);
    if (!spec) return;
    if ("file" in patch) {
      oldFile = spec.file;
      spec.file = patch.file;
      delete spec.error;
      delete spec.errorKind;
      delete spec.errorProvider;
    } else {
      delete spec.file;
      Object.assign(spec, patch);
    }
  });
  // 새 이미지가 저장된 뒤에만 예전 파일을 지운다.
  if (oldFile && "file" in patch && oldFile !== patch.file) await removeImageFile(jobId, oldFile);
  return job;
}

/** 직접 올린 이미지 파일을 기록한다 (오류 기록은 지우고, 예전 파일은 기록한 뒤에 지운다). */
export const recordImageFile = (jobId: string, key: string, file: string) => record(jobId, key, { file });

/** 실패한 이미지는 오류로 기록하고 계속 진행한다 (글 전체를 실패시키지 않는다). */
export async function generateImages(
  jobId: string,
  topic: string,
  post: Post,
  options: ImageOptions,
  log: (m: string) => void,
  scope: ImageScope = "all",
) {
  const targets = collectTargets(post, options, scope);
  if (!targets.length) return;
  const dir = jobImageDir(jobId);
  const stamp = Date.now();
  const nameOf = (t: Target) => `${imageKey(t)}-${stamp}`;
  const label = (t: Target) => (t.kind === "thumbnail" ? "썸네일" : `본문 이미지 #${t.index}`);

  // 썸네일과 본문 이미지는 서로 다른 AI로 만들 수 있다 (대상마다 자기 AI·스타일을 쓴다).
  const aiOf = (t: Target) => aiFor(options, t.kind);
  let done = 0;

  async function runAll(list: Target[], gen: (t: Target, outBase: string) => Promise<string>) {
    for (const t of list) {
      throwIfCancelled();
      log(`이미지 생성 ${++done}/${targets.length}: ${label(t)}`);
      try {
        const file = await gen(t, path.join(dir, nameOf(t)));
        await record(jobId, imageKey(t), { file: path.basename(file) });
      } catch (e) {
        if (e instanceof CancelledError) throw e; // 중지는 실패로 기록하지 않는다 (만들어 둔 이미지는 그대로)
        await fail(t, e);
      }
    }
  }

  async function fail(t: Target, e: unknown) {
    const msg = errorText(e);
    const errorKind = errorKindOf(e);
    log(`${label(t)} 생성 실패 — ${IMAGE_ERROR_INFO[errorKind].title}: ${msg.split("\n")[0].slice(0, 200)}`);
    await record(jobId, imageKey(t), { error: msg, errorKind, errorProvider: aiOf(t).provider });
  }

  // Claude(SVG)는 빠르고 로그인이 필요 없으니 먼저 만든다.
  await runAll(
    targets.filter((t) => aiOf(t).provider === "claude"),
    async (t, base) => {
      const file = `${base}.png`;
      await generateSvgImage(t.spec.prompt, t.kind, file, topic, jobId, t.spec.headline);
      return file;
    },
  );

  // Gemini / ChatGPT: API 키가 있으면 API로 만든다. 키가 없거나 사용자가 크롬을 고르면(썸네일·본문 따로) Claude in Chrome으로 한 장씩 (사용자의 크롬과 로그인을 그대로 쓴다).
  // API가 실패해도 크롬으로 저절로 넘기지 않는다. 실패로 기록하고, 화면에서 다시 하거나 크롬에서 만들기를 고른다.
  await runAll(
    targets.filter((t) => aiOf(t).provider !== "claude"),
    async (t, base) => {
      const { provider, style } = aiOf(t);
      const ai = provider as WebAi;
      if (methodFor(options, t.kind) === "api" && (await getImageApiKey(ai))) {
        log(`${ai === "gemini" ? "Gemini" : "OpenAI"} API로 이미지를 만듭니다.`);
        return generateWithApi(ai, imageRequest(t.spec.prompt, style, t.spec.headline, t.kind), base);
      }
      return generateWithWebAi(ai, t.spec.prompt, style, base, { jobId, log, headline: t.spec.headline, kind: t.kind });
    },
  );
}
