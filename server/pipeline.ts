import { countBodyChars } from "../shared/length";
import { aiFor, bodyImageKey, bodyIndexOf, imageKey, imageSpecAt, imageSpecsOf, methodFor, type ImageMethod, type ImageOptions, type ImageProvider, type ImageScope, type ImageStyle, type Job, type Post, type WritingOptions } from "../shared/types";
import { type BlogCategory, type BlogStatus, type Platform, type PublishMode, settingsFor } from "../shared/types";
import { postWithClaudeInChrome } from "./browser/blogPost";
import { isBlocked, markBlocked } from "./browser/blockedSites";
import { SiteBlockedError } from "./browser/claudeChrome";
import { kstText, publishedText, PublishStepError, type PublishRequest } from "./browser/publish";
import { postWithChrome } from "./browser/runner";
import { postNaverInUserChrome, userChromeSupported } from "./browser/userChrome";
import { CancelledError, throwIfCancelled, withCancel } from "./cancel";
import { getImageApiKey } from "./secrets";
import { collectTargets, generateImages } from "./images";
import { collectNaverSuggestions } from "./naver";
import { planImages, type PlanTarget } from "./images/plan";
import { deepResearch } from "./research";
import { proposeEdit } from "./editPost";
import { pickNaverTopic } from "./naverTopic";
import { getRules, todayKST } from "./rules";
import { serialQueue } from "./fsutil";
import { getJob, getSettings, log, updateJob } from "./store";
import { writePost } from "./writer";
import { publishToWordPress } from "./wordpress";
import { errorText, PLATFORM_LABEL, PUBLISH_MODE_LABEL, TONE_LABEL } from "../shared/labels";

const running = new Set<string>();
// Claude in Chrome 작업(블로그 작성, Gemini·ChatGPT 이미지)은 같은 크롬을 쓰므로 하나씩 실행한다.
export const enqueueBrowser = serialQueue();

/** 그 블로그의 상태만 바꾼다 (다른 블로그의 상태는 그대로). 글 자체는 초안 검토로 돌아온다 */
function setBlogStatus(j: Job, p: Platform, status: BlogStatus) {
  j.blogs = { ...j.blogs, [p]: { status, at: new Date().toISOString() } };
  j.status = "draft_ready";
}

const NO_IMAGES: ImageOptions = { thumbnail: false, bodyImages: 0, provider: "claude", style: "flat" };
const optionsOf = (job: { imageOptions?: Partial<ImageOptions> }): ImageOptions => ({ ...NO_IMAGES, ...job.imageOptions });

/** 초안이 있는 작업. 없으면 "작성된 초안이 없습니다." 오류 */
async function requireDraft(id: string): Promise<Job & { post: Post }> {
  const job = await getJob(id);
  if (!job?.post) throw new Error("작성된 초안이 없습니다.");
  return job as Job & { post: Post };
}

/** 단계가 실패하거나 중지되면 기록하고 초안이 있으면 초안 상태로 돌린다 (중지는 오류로 남기지 않는다). */
async function failStep(id: string, e: unknown, cancelledMsg: string, failPrefix: string) {
  const cancelled = e instanceof CancelledError;
  await log(id, cancelled ? cancelledMsg : `${failPrefix}: ${errorText(e)}`);
  await updateJob(id, (j) => {
    j.status = j.post ? "draft_ready" : "failed";
    j.error = cancelled ? undefined : errorText(e);
  });
}

/** 한 장씩 다시 만드는 중인 이미지 (작업 id → 이미지 키). 이것만 돌고 있으면 다른 이미지는 동시에 더 만들 수 있다 */
const imageRuns = new Map<string, Set<string>>();

/** 작업에서 무엇이든 진행 중인지 (초안 수정·블로그 등록·삭제 등을 막는 기준) */
export function isRunning(id: string) {
  return running.has(id) || !!imageRuns.get(id)?.size;
}

/** 이미지 한 장을 다시 만들거나 올리지 못하는 상태인지: 다른 단계가 돌고 있거나 바로 그 이미지를 만드는 중 */
export function isImageBusy(id: string, target: string) {
  return running.has(id) || !!imageRuns.get(id)?.has(target);
}

/** 리서치 → 글 작성 → 이미지 생성까지. 블로그 입력은 사용자가 초안을 검토한 뒤 직접 시작한다. */
export function runDraft(id: string) {
  if (running.has(id)) return Promise.resolve();
  return withCancel(id, () => doDraft(id));
}

async function doDraft(id: string) {
  if (running.has(id)) return;
  running.add(id);
  try {
    const job = await getJob(id);
    if (!job) return;
    const options = optionsOf(job);

    await updateJob(id, (j) => {
      j.status = "researching";
      j.error = undefined;
    });
    // 규칙은 작업마다 새로 읽는다 → 화면에서 고친 규칙이 다음 작업부터 바로 적용된다.
    const rules = await getRules();
    const today = todayKST();
    await updateJob(id, (j) => {
      j.rulesSnapshot = rules.content;
    });
    await log(id, `글쓰기 규칙 적용 (${rules.isDefault ? "기본 규칙" : `수정본, ${new Date(rules.updatedAt!).toLocaleString("ko-KR")}`})`);
    await log(id, `딥서칭 시작: ${job.topic}`);
    let lastProgress = "";
    const links = job.links ?? [];
    const research = await deepResearch({ topic: job.topic, links, rules: rules.content, today, jobId: id }, (m) => {
      if (m !== lastProgress) {
        lastProgress = m;
        void log(id, m);
      }
    });
    await updateJob(id, (j) => {
      j.researchNotes = research.notes;
      j.sources = research.sources;
      j.status = "writing";
    });

    throwIfCancelled();
    const keywords = [research.mainKeyword, ...research.subKeywords];
    await log(id, `키워드: ${keywords.join(", ")} → 네이버 자동완성·함께 많이 찾는 수집`);
    const { autocomplete, related } = await collectNaverSuggestions(keywords);
    const acCount = Object.values(autocomplete).flat().length;
    const relCount = Object.values(related).flat().length;
    await log(
      id,
      `자동완성 ${acCount}개, 함께 많이 찾는 ${relCount}개 수집` +
        (relCount ? "" : " (이 키워드들은 함께 많이 찾는 영역이 없거나 꺼져 있음)"),
    );

    const w = job.writingOptions;
    await log(id, `규칙에 맞춰 글 작성 중${w ? ` (분량 약 ${w.targetChars.toLocaleString()}자, 말투 ${TONE_LABEL[w.tone]})` : ""}`);
    const post = await writePost({
      jobId: id,
      topic: job.topic,
      rules: rules.content,
      today,
      notes: research.notes,
      sources: research.sources,
      searchQuestion: research.searchQuestion,
      mainKeyword: research.mainKeyword,
      subKeywords: research.subKeywords,
      autocomplete,
      related,
      options,
      writing: job.writingOptions,
    }, (m) => void log(id, m));
    await updateJob(id, (j) => {
      j.post = post;
      delete j.editProposal; // 새 초안이면 이전 글에 대한 고치기 제안은 쓸 수 없다
    });
    await log(id, `글 작성 완료: ${post.title} (본문 ${countBodyChars(post).toLocaleString()}자)`);

    await makeImages(id, job.topic, options);
    await updateJob(id, (j) => {
      j.status = "draft_ready";
    });
    await log(id, "초안 완성");
  } catch (e) {
    await log(id, e instanceof CancelledError ? "작업을 중지했습니다." : `실패: ${errorText(e)}`);
    await updateJob(id, (j) => {
      j.status = j.post ? "draft_ready" : "failed";
      j.error = e instanceof CancelledError && j.post ? undefined : errorText(e);
    });
    return;
  } finally {
    running.delete(id);
  }
}

type EditOpts = { prompt: string; range?: { start: number; end: number }; writing?: WritingOptions };

/**
 * 프롬프트로 글 고치기를 시작한다 (글 전체 또는 range 블록 범위). 제안을 "만드는 중"으로 먼저 기록해 두고 백그라운드에서 Claude가 고친다.
 * 고친 결과는 글에 바로 넣지 않고 제안으로 남긴다 (적용은 사용자가 비교해 보고 정한다).
 * 다른 작업이 진행 중이면 false. 만드는 동안 글 수정·블로그 올리기·이미지 작업은 막힌다 (isRunning).
 */
export async function startEdit(id: string, opts: EditOpts): Promise<boolean> {
  if (isRunning(id)) return false;
  running.add(id);
  try {
    await updateJob(id, (j) => {
      j.editProposal = { prompt: opts.prompt, range: opts.range, writing: opts.writing, status: "running", createdAt: new Date().toISOString() };
    });
  } catch (e) {
    running.delete(id);
    throw e;
  }
  void withCancel(id, () => doEdit(id, opts));
  return true;
}

async function doEdit(id: string, opts: EditOpts) {
  const say = (m: string) => void log(id, m);
  try {
    throwIfCancelled();
    const job = await requireDraft(id);
    // 분량·말투를 바꿔 다시 쓰면 새 값으로, 저장된 조사 자료를 바탕으로 쓴다. 그 밖에는 작업의 분량·말투를 따른다.
    const result = await proposeEdit({
      post: job.post,
      prompt: opts.prompt,
      range: opts.range,
      writing: opts.writing ?? job.writingOptions,
      rewrite: opts.writing && { notes: job.researchNotes ?? "", sources: job.sources },
      rules: (await getRules()).content,
      today: todayKST(),
      jobId: id,
      onProgress: say,
    });
    throwIfCancelled(); // 결과가 나온 순간에 중지했으면 제안으로 남기지 않는다
    await updateJob(id, (j) => {
      j.editProposal = { prompt: opts.prompt, range: opts.range, writing: opts.writing, status: "ready", createdAt: j.editProposal?.createdAt ?? new Date().toISOString(), ...result };
    });
    say(`고친 결과가 준비됐습니다. 바뀐 부분을 보고 적용하세요. (${result.note})`);
  } catch (e) {
    if (e instanceof CancelledError) {
      await updateJob(id, (j) => void delete j.editProposal);
      say("글 고치기를 중지했습니다.");
    } else {
      const error = errorText(e);
      await updateJob(id, (j) => {
        j.editProposal = { prompt: opts.prompt, range: opts.range, writing: opts.writing, status: "failed", createdAt: j.editProposal?.createdAt ?? new Date().toISOString(), error };
      });
      say(`글 고치기 실패: ${error}`);
    }
  } finally {
    running.delete(id);
  }
}

/**
 * 이미지만 다시 생성 (초안 수정 후 / 일부 실패 시 / 썸네일 추가). 작업 전체를 잡으므로 다른 단계와 함께 돌지 않는다.
 */
export function runImages(id: string, scope: ImageScope = "all") {
  if (isRunning(id)) return Promise.resolve();
  running.add(id);
  return withCancel(id, async () => {
    try {
      await imagesStep(id, scope);
    } finally {
      running.delete(id);
      await updateJob(id, (j) => {
        j.status = "draft_ready";
      });
    }
  });
}

/**
 * 이미지 한 장만 다시 생성. 다른 이미지와 동시에 만들 수 있다 (크롬으로 만드는 것은 크롬 큐에서 하나씩).
 * ai: 이번에만 쓸 AI·스타일 (글의 이미지 설정은 바꾸지 않는다)
 * method: Gemini/ChatGPT를 API로(키가 있을 때) 만들지, 크롬에서 만들지 (이번에만 쓴다)
 */
export function runImage(id: string, target: "thumbnail" | `body-${number}`, ai: { provider: ImageProvider; style: ImageStyle }, method: ImageMethod = "api") {
  if (isImageBusy(id, target)) return Promise.resolve();
  const set = imageRuns.get(id) ?? new Set<string>();
  set.add(target);
  imageRuns.set(id, set);
  return withCancel(id, async () => {
    try {
      await imagesStep(id, target, ai, method);
    } finally {
      set.delete(target);
      if (!set.size && imageRuns.get(id) === set) imageRuns.delete(id);
      // 다른 이미지가 아직 만들어지는 중이면 상태는 그대로 둔다.
      await updateJob(id, (j) => {
        if (isRunning(id)) return;
        j.status = "draft_ready";
        delete j.imageRunsOnly;
      });
    }
  });
}

async function imagesStep(id: string, scope: ImageScope, ai?: { provider: ImageProvider; style: ImageStyle }, method?: ImageMethod) {
  try {
    const job = await requireDraft(id);
    await updateJob(id, (j) => {
      j.error = undefined;
    });
    const options = optionsOf(job);
    // 한 장만 만드는 경우라 그 종류의 AI·스타일·방법만 이번 실행에서 바꿔 쓴다 (저장하지 않음).
    // 그 밖에는 글을 만들 때 고른 방법을 그대로 쓴다.
    const runOptions: ImageOptions = !ai
      ? options
      : scope === "thumbnail"
        ? { ...options, thumbnailProvider: ai.provider, thumbnailStyle: ai.style, thumbnailMethod: method }
        : { ...options, provider: ai.provider, style: ai.style, method };
    await makeImages(id, job.topic, runOptions, scope);
  } catch (e) {
    const cancelled = e instanceof CancelledError;
    await log(id, cancelled ? "이미지 생성을 중지했습니다." : `이미지 생성 실패: ${errorText(e)}`);
    await updateJob(id, (j) => {
      j.error = cancelled ? undefined : errorText(e);
    });
  }
}

async function makeImages(id: string, topic: string, options: ImageOptions, scope: ImageScope = "all") {
  const job = await getJob(id);
  if (!job?.post) return;
  const targets = collectTargets(job.post, options, scope);
  const count = targets.length;
  if (count === 0) {
    if (scope === "failed") await log(id, "다시 만들 실패한 이미지가 없습니다.");
    if (scope === "thumbnail") await log(id, "썸네일이 없거나 꺼져 있어 만들 것이 없습니다.");
    if (bodyIndexOf(scope) !== null) await log(id, "다시 만들 이미지를 찾지 못했습니다. 초안에서 지워졌을 수 있습니다.");
    return;
  }

  // 다른 이미지가 동시에 만들어지고 있을 수 있어 목록을 덮어쓰지 않고 이번 대상만 더하고 뺀다.
  const keys: string[] = targets.map(imageKey);
  await updateJob(id, (j) => {
    j.status = "generating_images";
    j.generatingImages = [...new Set([...(j.generatingImages ?? []), ...keys])];
    j.regeneratingImages = [...new Set([...(j.regeneratingImages ?? []), ...targets.filter((t) => t.spec.file).map(imageKey)])];
  });
  try {
    await makeImagesInner(id, topic, options, scope, count);
  } finally {
    await updateJob(id, (j) => {
      j.generatingImages = j.generatingImages?.filter((k) => !keys.includes(k));
      j.regeneratingImages = j.regeneratingImages?.filter((k) => !keys.includes(k));
      if (!j.generatingImages?.length) delete j.generatingImages;
      if (!j.regeneratingImages?.length) delete j.regeneratingImages;
    });
  }
}

async function makeImagesInner(id: string, topic: string, options: ImageOptions, scope: ImageScope, count: number) {
  const job = (await getJob(id))!;
  if (!job.post) return;
  const say = (m: string) => void log(id, m);
  const thumbAi = aiFor(options, "thumbnail");
  const bodyAi = aiFor(options, "body");
  const single = scope === "thumbnail" ? thumbAi : bodyIndexOf(scope) !== null ? bodyAi : null;
  const aiText = single ? `${single.provider}, ${single.style}` : options.thumbnail && options.bodyImages > 0
    ? `썸네일: ${thumbAi.provider}, ${thumbAi.style} / 본문: ${bodyAi.provider}, ${bodyAi.style}`
    : `${bodyAi.provider}, ${bodyAi.style}`;
  const what =
    scope === "thumbnail" ? "썸네일 " : bodyIndexOf(scope) !== null ? `본문 이미지 #${bodyIndexOf(scope)} ` : `이미지 ${scope === "failed" ? `${count}개 다시 ` : ""}`;
  say(`${what}생성 시작 (${aiText})`);
  // 만들기 직전에 본문을 다시 보고 이미지마다 설명(prompt)과 이미지 안 문구(headline)를 정한다.
  // 만드는 AI·스타일에 맞는 언어로 다시 쓰므로 AI를 바꿔 다시 만들 때도 맞는다. 직접 고친 이미지는 건드리지 않는다.
  const planTargets: PlanTarget[] = collectTargets(job.post, options, scope)
    .filter((t) => !t.spec.userEdited)
    .map((t) =>
      t.kind === "thumbnail"
        ? { key: "thumbnail", kind: "thumbnail" as const, basis: t.spec.basis, prompt: t.spec.prompt, headline: t.spec.headline }
        : { key: bodyImageKey(t.index), kind: "body" as const, index: t.index, basis: t.spec.basis, prompt: t.spec.prompt, headline: t.spec.headline },
    );
  if (planTargets.length) {
    say(`본문을 참고해 이미지 ${planTargets.length}개의 설명과 문구를 정하는 중`);
    // 썸네일과 본문 이미지의 AI·스타일이 다르면 따로 기획한다 (설명 언어와 화풍이 다르다).
    const groups = new Map<string, { provider: ImageProvider; style: ImageStyle; list: PlanTarget[] }>();
    for (const t of planTargets) {
      const ai = aiFor(options, t.kind);
      const key = `${ai.provider}|${ai.style}`;
      if (!groups.has(key)) groups.set(key, { ...ai, list: [] });
      groups.get(key)!.list.push(t);
    }
    for (const g of groups.values()) {
      try {
        const plans = await planImages(job.post, g.provider, g.style, g.list, id);
        await updateJob(id, (j) => {
          for (const p of plans) {
            const spec = imageSpecAt(j.post, p.key);
            if (!spec || spec.userEdited) continue;
            spec.prompt = p.prompt;
            spec.basis = p.basis || spec.basis;
            if (p.headline) spec.headline = p.headline;
            else delete spec.headline;
          }
        });
        for (const p of plans) say(`${p.key === "thumbnail" ? "썸네일" : `이미지 #${bodyIndexOf(p.key)}`}: ${p.headline ? `문구 “${p.headline.replace(/\n/g, " / ")}”` : "문구 없음"}`);
      } catch (e) {
        if (e instanceof CancelledError) throw e;
        say(`이미지 설명을 본문에 맞춰 다시 정하지 못해 기존 설명으로 만듭니다: ${errorText(e)}`);
      }
    }
  }

  // Claude(SVG)와 이미지 API는 크롬을 쓰지 않아 큐 없이 (다른 이미지와 동시에) 돌려도 된다.
  // 크롬(Claude in Chrome)으로 만드는 Gemini/ChatGPT는 사용자의 크롬을 조작하므로 직렬화한다.
  const post = (await getJob(id))?.post ?? job.post;
  let usesChrome = false;
  for (const t of collectTargets(post, options, scope)) {
    const { provider } = aiFor(options, t.kind);
    if (provider !== "claude" && (methodFor(options, t.kind) === "chrome" || !(await getImageApiKey(provider)))) usesChrome = true;
  }
  if (usesChrome) {
    await enqueueBrowser(() => generateImages(id, topic, post, options, say, scope));
  } else {
    await generateImages(id, topic, post, options, say, scope);
  }
  const after = await getJob(id);
  const failed = after?.post ? imageSpecsOf(after.post).filter((s) => s.error).length : 0;
  if (failed) say(`이미지 ${failed}개 생성 실패 — 초안 화면의 각 이미지에서 이유를 확인하고 "이미지 다시 생성"으로 한 장씩 다시 만들 수 있습니다.`);
}

export function runPost(id: string, opts: { platform: Platform; mode?: PublishMode; scheduledAt?: string; category?: BlogCategory }) {
  // 브라우저 큐에서 기다리는 동안에도 진행 중으로 표시해 중복 작성·수정·삭제를 막는다.
  if (running.has(id)) return Promise.resolve();
  running.add(id);
  return withCancel(id, async () => {
    // 워드프레스는 API로 올리므로 크롬을 쓰지 않는다 (크롬 큐를 거치지 않는다).
    const platform = opts.platform; // 올릴 블로그는 글을 올릴 때마다 고른다 (기본 블로그 없음)
    if (platform === "wordpress") return doWordPressPost(id, opts.mode ?? "draft", opts.scheduledAt, opts.category);
    const mode = opts.mode ?? "draft";
    // 네이버 블로그는 발행 창에서 "주제"를 고른다 (네이버에만 있음). 글 내용을 보고 Claude가 정하며, 크롬 대기열에 들어가기 전에 끝낸다.
    let topic: string | undefined;
    if (platform === "naver" && mode !== "draft") {
      try {
        const job = await getJob(id);
        if (job?.post) topic = (await pickNaverTopic(job.post, id, (m) => void log(id, m))) ?? undefined;
      } catch (e) {
        await failStep(id, e, "블로그 작성을 중지했습니다.", "블로그 작성 실패"); // 중지
        running.delete(id);
        return;
      }
    }
    return enqueueBrowser(() => doPost(id, platform, { mode, scheduledAt: opts.scheduledAt, category: opts.category, topic }));
  });
}

/** 워드프레스 REST API로 등록한다. 사이트가 돌려준 글 상태(draft/future/publish)대로 작업 상태를 정한다. */
async function doWordPressPost(id: string, mode: PublishMode, scheduledAt?: string, category?: BlogCategory) {
  try {
    throwIfCancelled();
    const job = await requireDraft(id);
    const settings = await getSettings();
    await updateJob(id, (j) => {
      j.status = "posting";
      j.postingTo = "wordpress";
      j.error = undefined;
    });
    await log(id, `워드프레스 API로 ${PUBLISH_MODE_LABEL[mode]} 시작${category ? ` (카테고리: ${category.name})` : ""}`);
    const say = (m: string) => void log(id, m);
    const r = await publishToWordPress(job.post, id, settings, mode, scheduledAt, job.wordpress, say, category);
    const status: BlogStatus = r.wpStatus === "publish" ? "published" : r.wpStatus === "future" ? "scheduled" : "posted";
    await updateJob(id, (j) => {
      j.wordpress = { postId: r.postId, link: r.link, mode: r.mode, scheduledAt: r.scheduledAt, mediaIds: r.mediaIds };
      setBlogStatus(j, "wordpress", status);
    });
    const done = { published: "발행했습니다", scheduled: "예약했습니다", posted: "임시저장했습니다" }[status];
    await log(id, `워드프레스에 ${done}: ${r.link}`);
    if ((mode === "publish" && status !== "published") || (mode === "schedule" && status !== "scheduled")) {
      await log(id, `확인 필요: ${PUBLISH_MODE_LABEL[mode]}을 요청했지만 사이트에서는 "${r.wpStatus}" 상태입니다. 사용자 권한을 확인하세요.`);
    }
  } catch (e) {
    await failStep(id, e, "워드프레스 등록을 중지했습니다.", "워드프레스 등록 실패");
  } finally {
    running.delete(id);
  }
}

/**
 * 크롬으로 네이버·티스토리에 올린다. 늘 임시저장을 먼저 하고, 예약발행·자동발행이면 이어서 발행 창에서 발행한다.
 * 발행 창에서 멈추면(PublishStepError) 글은 임시저장된 채이므로 상태를 임시저장 완료로 두고 이유를 오류로 남긴다.
 */
async function doPost(id: string, platform: Platform, publish: PublishRequest) {
  try {
    throwIfCancelled(); // 브라우저 큐에서 기다리는 동안 중지했으면 시작하지 않는다
    const job = await requireDraft(id);
    // 고른 블로그의 ID로 맞춘 설정 (기본 블로그와 달라도 된다)
    const settings = settingsFor(await getSettings(), platform);
    await updateJob(id, (j) => {
      j.status = "posting";
      j.postingTo = platform;
      j.error = undefined;
    });
    await log(id, `${PLATFORM_LABEL[platform]} 작성 시작 (${PUBLISH_MODE_LABEL[publish.mode]}${publish.mode === "schedule" ? `: ${kstText(publish.scheduledAt!)}` : ""}${publish.category ? `, 카테고리: ${publish.category.name}` : ""}${publish.topic ? `, 주제: ${publish.topic}` : ""})`);
    const say = (m: string) => void log(id, m);
    // Claude in Chrome이 막는 블로그는 제한을 우회하지 않고 다른 방법으로 쓴다.
    // - 네이버 + macOS: 평소 크롬의 새 탭에서 (이미 로그인된 크롬, 새 창·로그인 불필요)
    // - 그 밖: 예전 자동 조작(앱 전용 크롬)
    const useUserChrome = settings.platform === "naver" && userChromeSupported();
    const fallback = async () => {
      throwIfCancelled();
      if (useUserChrome) {
        const r = await postNaverInUserChrome(job.post, id, settings, say, { publish });
        await log(id, `평소 크롬에서 임시저장 완료 (이미지 ${r.imagesInserted}개).${publish.mode === "draft" ? " 크롬에 열린 탭에서 확인한 뒤 직접 발행하세요." : ""}`);
        for (const p of r.problems) await log(id, `확인 필요: ${p}`);
      } else {
        const problems = await postWithChrome(job.post, id, settings, say, publish);
        await log(id, "자동 조작으로 임시저장 완료");
        for (const p of problems) await log(id, `확인 필요: ${p}`);
      }
    };
    const how = useUserChrome ? "평소 크롬" : "자동 조작(앱 전용 크롬)";
    if (await isBlocked(settings.platform)) {
      await log(id, `이 블로그는 Claude in Chrome이 막는 사이트라 ${how}으로 진행합니다.`);
      await fallback();
    } else {
      try {
        const result = await postWithClaudeInChrome(job.post, id, settings, say, publish);
        await log(id, `임시저장 완료 (이미지 ${result.imagesInserted}개): ${result.message}`);
        for (const p of result.problems) await log(id, `확인 필요: ${p}`);
      } catch (e) {
        if (!(e instanceof SiteBlockedError)) throw e;
        await markBlocked(settings.platform, e.detail);
        await log(id, `Claude in Chrome이 이 블로그 접속을 막아서 ${how}으로 이어서 진행합니다. 다음부터는 바로 이 방법으로 합니다.`);
        await fallback();
      }
    }
    const status: BlogStatus = publish.mode === "publish" ? "published" : publish.mode === "schedule" ? "scheduled" : "posted";
    if (publish.mode !== "draft") await log(id, `${PLATFORM_LABEL[platform]}에 ${publishedText(publish)}.`);
    await updateJob(id, (j) => setBlogStatus(j, platform, status));
  } catch (e) {
    if (e instanceof PublishStepError) {
      // 임시저장까지는 됐다.
      await log(id, e.message);
      // 발행 창 단계를 실제 화면에 맞게 고칠 수 있도록 멈춘 순간의 화면 구조를 남긴다.
      if (e.dialog) await log(id, `발행 창 구조 (문제 확인용, 글 본문은 빠짐):\n${e.dialog}`);
      await updateJob(id, (j) => {
        setBlogStatus(j, platform, "posted");
        j.error = e.message;
      });
      return;
    }
    await failStep(id, e, "블로그 작성을 중지했습니다. 크롬에 열린 탭에 일부만 들어갔을 수 있으니 확인하세요.", "블로그 작성 실패");
  } finally {
    running.delete(id);
  }
}
