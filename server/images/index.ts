import path from "node:path";
import { IMAGE_ERROR_INFO, type ImageErrorKind } from "../../shared/imageErrors";
import { aiFor, bodyIndexOf, imageKey, type ImageOptions, type ImageProvider, type ImageScope, type ImageSpec, type Post } from "../../shared/types";
import { CancelledError, throwIfCancelled } from "../cancel";
import { jobImageDir, removeImageFile, updateJob } from "../store";
import { errorKindOf } from "./errors";
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

/** 생성 결과(파일명 또는 오류)를 job 파일에 바로 기록한다. */
async function record(jobId: string, t: Target, patch: Outcome) {
  let oldFile = undefined as string | undefined;
  const job = await updateJob(jobId, (j) => {
    if (!j.post) return;
    const spec =
      t.kind === "thumbnail"
        ? j.post.thumbnail
        : (() => {
            const b = j.post!.blocks[t.index];
            return b?.type === "image" ? b : undefined;
          })();
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

export function countImages(post: Post, options: ImageOptions, scope: ImageScope = "all") {
  return collectTargets(post, options, scope).length;
}

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
        await record(jobId, t, { file: path.basename(file) });
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
    await record(jobId, t, { error: msg, errorKind, errorProvider: aiOf(t).provider });
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

  // Gemini / ChatGPT: Claude in Chrome으로 한 장씩 (사용자의 크롬과 로그인을 그대로 쓴다)
  await runAll(
    targets.filter((t) => aiOf(t).provider !== "claude"),
    (t, base) => generateWithWebAi(aiOf(t).provider as WebAi, t.spec.prompt, aiOf(t).style, base, { jobId, log, headline: t.spec.headline, kind: t.kind }),
  );
}
