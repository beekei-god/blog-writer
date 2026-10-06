import { countBodyChars } from "../shared/length";
import { aiFor, bodyImageKey, bodyIndexOf, imageKey, type ImageOptions, type ImageProvider, type ImageScope, type ImageStyle } from "../shared/types";
import { type Platform, type PublishMode, settingsFor } from "../shared/types";
import { postWithClaudeInChrome } from "./browser/blogPost";
import { isBlocked, markBlocked } from "./browser/blockedSites";
import { SiteBlockedError } from "./browser/claudeChrome";
import { postWithChrome } from "./browser/runner";
import { postNaverInUserChrome, userChromeSupported } from "./browser/userChrome";
import { CancelledError, throwIfCancelled, withCancel } from "./cancel";
import { collectTargets, countImages, generateImages } from "./images";
import { collectNaverSuggestions } from "./naver";
import { planImages, type PlanTarget } from "./images/plan";
import { deepResearch } from "./research";
import { getRules, todayKST } from "./rules";
import { serialQueue } from "./fsutil";
import { getJob, getSettings, log, updateJob } from "./store";
import { writePost } from "./writer";
import { publishToWordPress } from "./wordpress";
import { errorText } from "../shared/labels";

const running = new Set<string>();
// Claude in Chrome 작업(블로그 작성, Gemini·ChatGPT 이미지)은 같은 크롬을 쓰므로 하나씩 실행한다.
const enqueueBrowser = serialQueue();

const NO_IMAGES: ImageOptions = { thumbnail: false, bodyImages: 0, provider: "claude", style: "flat" };
const optionsOf = (job: { imageOptions?: Partial<ImageOptions> }): ImageOptions => ({ ...NO_IMAGES, ...job.imageOptions });

export function isRunning(id: string) {
  return running.has(id);
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

    await log(id, "규칙에 맞춰 글 작성 중");
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
    }, (m) => void log(id, m));
    await updateJob(id, (j) => {
      j.post = post;
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

/**
 * 이미지만 다시 생성 (초안 수정 후 / 일부 실패 시 / 썸네일만 / 한 장만).
 * ai: 한 장만 만들 때 이번에만 쓸 AI·스타일 (글의 이미지 설정은 바꾸지 않는다)
 */
export function runImages(id: string, scope: ImageScope = "all", ai?: { provider: ImageProvider; style: ImageStyle }) {
  if (running.has(id)) return Promise.resolve();
  return withCancel(id, () => doImages(id, scope, ai));
}

async function doImages(id: string, scope: ImageScope, ai?: { provider: ImageProvider; style: ImageStyle }) {
  if (running.has(id)) return;
  running.add(id);
  try {
    const job = await getJob(id);
    if (!job?.post) throw new Error("작성된 초안이 없습니다.");
    await updateJob(id, (j) => {
      j.error = undefined;
    });
    const options = optionsOf(job);
    // 한 장만 만드는 경우라 그 종류의 AI·스타일만 이번 실행에서 바꿔 쓴다 (저장하지 않음)
    const runOptions: ImageOptions = !ai
      ? options
      : scope === "thumbnail"
        ? { ...options, thumbnailProvider: ai.provider, thumbnailStyle: ai.style }
        : { ...options, provider: ai.provider, style: ai.style };
    await makeImages(id, job.topic, runOptions, scope);
    await updateJob(id, (j) => {
      j.status = "draft_ready";
    });
  } catch (e) {
    const cancelled = e instanceof CancelledError;
    await log(id, cancelled ? "이미지 생성을 중지했습니다." : `이미지 생성 실패: ${errorText(e)}`);
    await updateJob(id, (j) => {
      j.status = "draft_ready";
      j.error = cancelled ? undefined : errorText(e);
    });
  } finally {
    running.delete(id);
  }
}

async function makeImages(id: string, topic: string, options: ImageOptions, scope: ImageScope = "all") {
  const job = await getJob(id);
  if (!job?.post) return;
  const count = countImages(job.post, options, scope);
  if (count === 0) {
    if (scope === "failed") await log(id, "다시 만들 실패한 이미지가 없습니다.");
    if (scope === "thumbnail") await log(id, "썸네일이 없거나 꺼져 있어 만들 것이 없습니다.");
    if (bodyIndexOf(scope) !== null) await log(id, "다시 만들 이미지를 찾지 못했습니다. 초안에서 지워졌을 수 있습니다.");
    return;
  }

  await updateJob(id, (j) => {
    j.status = "generating_images";
    const targets = collectTargets(job.post!, options, scope);
    j.generatingImages = targets.map(imageKey);
    j.regeneratingImages = targets.filter((t) => t.spec.file).map(imageKey);
  });
  try {
    await makeImagesInner(id, topic, options, scope, count);
  } finally {
    await updateJob(id, (j) => {
      delete j.generatingImages;
      delete j.regeneratingImages;
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
    const groups = new Map<string, { provider: ImageOptions["provider"]; style: ImageOptions["style"]; list: PlanTarget[] }>();
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
            const spec = p.key === "thumbnail" ? j.post?.thumbnail : (() => {
              const b = j.post?.blocks[bodyIndexOf(p.key) ?? -1];
              return b?.type === "image" ? b : undefined;
            })();
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

  // Claude(SVG)는 별도 헤드리스 크롬으로 PNG만 만들어 큐 없이 돌려도 된다.
  // Gemini/ChatGPT는 Claude in Chrome으로 사용자의 크롬을 조작하므로 직렬화한다.
  const post = (await getJob(id))?.post ?? job.post;
  const usesWebAi = collectTargets(post, options, scope).some((t) => aiFor(options, t.kind).provider !== "claude");
  if (usesWebAi) {
    await enqueueBrowser(() => generateImages(id, topic, post, options, say, scope));
  } else {
    await generateImages(id, topic, post, options, say, scope);
  }
  const after = await getJob(id);
  const failed = [after?.post?.thumbnail, ...(after?.post?.blocks ?? [])].filter(
    (s) => s && "error" in s && s.error,
  ).length;
  if (failed) say(`이미지 ${failed}개 생성 실패 — 초안 화면에서 이유를 확인하고 다른 AI로 다시 만들 수 있습니다.`);
}

export function runPost(id: string, opts: { platform: Platform; mode?: PublishMode; scheduledAt?: string }) {
  // 브라우저 큐에서 기다리는 동안에도 진행 중으로 표시해 중복 작성·수정·삭제를 막는다.
  if (running.has(id)) return Promise.resolve();
  running.add(id);
  return withCancel(id, async () => {
    // 워드프레스는 API로 올리므로 크롬을 쓰지 않는다 (크롬 큐를 거치지 않는다).
    const platform = opts.platform; // 올릴 블로그는 글을 올릴 때마다 고른다 (기본 블로그 없음)
    if (platform === "wordpress") return doWordPressPost(id, opts.mode ?? "draft", opts.scheduledAt);
    return enqueueBrowser(() => doPost(id, platform));
  });
}

const MODE_LABEL: Record<PublishMode, string> = { draft: "임시저장", schedule: "예약발행", publish: "자동발행" };

/** 워드프레스 REST API로 등록한다. 사이트가 돌려준 글 상태(draft/future/publish)대로 작업 상태를 정한다. */
async function doWordPressPost(id: string, mode: PublishMode, scheduledAt?: string) {
  try {
    throwIfCancelled();
    const job = await getJob(id);
    if (!job?.post) throw new Error("작성된 초안이 없습니다.");
    const settings = await getSettings();
    await updateJob(id, (j) => {
      j.status = "posting";
      j.postingTo = "wordpress";
      j.error = undefined;
    });
    await log(id, `워드프레스 API로 ${MODE_LABEL[mode]} 시작`);
    const say = (m: string) => void log(id, m);
    const r = await publishToWordPress(job.post, id, settings, mode, scheduledAt, job.wordpress, say);
    const status = r.wpStatus === "publish" ? "published" : r.wpStatus === "future" ? "scheduled" : "posted";
    await updateJob(id, (j) => {
      j.wordpress = { postId: r.postId, link: r.link, mode: r.mode, scheduledAt: r.scheduledAt, mediaIds: r.mediaIds };
      j.status = status;
    });
    const done = { published: "발행했습니다", scheduled: "예약했습니다", posted: "임시저장했습니다" }[status];
    await log(id, `워드프레스에 ${done}: ${r.link}`);
    if ((mode === "publish" && status !== "published") || (mode === "schedule" && status !== "scheduled")) {
      await log(id, `확인 필요: ${MODE_LABEL[mode]}을 요청했지만 사이트에서는 "${r.wpStatus}" 상태입니다. 사용자 권한을 확인하세요.`);
    }
  } catch (e) {
    const cancelled = e instanceof CancelledError;
    await log(id, cancelled ? "워드프레스 등록을 중지했습니다." : `워드프레스 등록 실패: ${errorText(e)}`);
    await updateJob(id, (j) => {
      j.status = j.post ? "draft_ready" : "failed";
      j.error = cancelled ? undefined : errorText(e);
    });
  } finally {
    running.delete(id);
  }
}

async function doPost(id: string, platform: Platform) {
  try {
    throwIfCancelled(); // 브라우저 큐에서 기다리는 동안 중지했으면 시작하지 않는다
    const job = await getJob(id);
    if (!job?.post) throw new Error("작성된 초안이 없습니다.");
    // 고른 블로그의 ID로 맞춘 설정 (기본 블로그와 달라도 된다)
    const settings = settingsFor(await getSettings(), platform);
    await updateJob(id, (j) => {
      j.status = "posting";
      j.postingTo = platform;
      j.error = undefined;
    });
    await log(id, `${settings.platform} 작성 시작`);
    const say = (m: string) => void log(id, m);
    // Claude in Chrome이 막는 블로그는 제한을 우회하지 않고 다른 방법으로 쓴다.
    // - 네이버 + macOS: 평소 크롬의 새 탭에서 (이미 로그인된 크롬, 새 창·로그인 불필요)
    // - 그 밖: 예전 자동 조작(앱 전용 크롬)
    const useUserChrome = settings.platform === "naver" && userChromeSupported();
    const fallback = async () => {
      throwIfCancelled();
      if (useUserChrome) {
        const r = await postNaverInUserChrome(job.post!, id, settings, say);
        await log(id, `평소 크롬에서 임시저장 완료 (이미지 ${r.imagesInserted}개). 크롬에 열린 탭에서 확인한 뒤 직접 발행하세요.`);
        for (const p of r.problems) await log(id, `확인 필요: ${p}`);
      } else {
        await postWithChrome(job.post!, id, settings, say);
        await log(id, "자동 조작으로 임시저장 완료");
      }
    };
    const how = useUserChrome ? "평소 크롬" : "자동 조작(앱 전용 크롬)";
    if (await isBlocked(settings.platform)) {
      await log(id, `이 블로그는 Claude in Chrome이 막는 사이트라 ${how}으로 진행합니다.`);
      await fallback();
    } else {
      try {
        const result = await postWithClaudeInChrome(job.post, id, settings, say);
        await log(id, `임시저장 완료 (이미지 ${result.imagesInserted}개): ${result.message}`);
        for (const p of result.problems) await log(id, `확인 필요: ${p}`);
      } catch (e) {
        if (!(e instanceof SiteBlockedError)) throw e;
        await markBlocked(settings.platform, e.detail);
        await log(id, `Claude in Chrome이 이 블로그 접속을 막아서 ${how}으로 이어서 진행합니다. 다음부터는 바로 이 방법으로 합니다.`);
        await fallback();
      }
    }
    await updateJob(id, (j) => {
      j.status = "posted";
    });
  } catch (e) {
    const cancelled = e instanceof CancelledError;
    await log(id, cancelled ? "블로그 작성을 중지했습니다. 크롬에 열린 탭에 일부만 들어갔을 수 있으니 확인하세요." : `블로그 작성 실패: ${errorText(e)}`);
    await updateJob(id, (j) => {
      j.status = j.post ? "draft_ready" : "failed";
      j.error = cancelled ? undefined : errorText(e);
    });
  } finally {
    running.delete(id);
  }
}
