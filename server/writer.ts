import { MAX_TAGS, type ImageOptions, type Post, type PostBlock, type Source, type TagDetail, type WritingOptions, type WritingTone } from "../shared/types";
import { countBodyChars, DEFAULT_TARGET_CHARS, maxBodyChars, targetRange } from "../shared/length";
import { toneName, toneProblem } from "../shared/tone";
import { runClaude } from "./claude";
import { PostSchema, POST_JSON_SCHEMA } from "./schema";

/** 말투별 지시. 모든 말투가 글쓰기 규칙의 존댓말과 "확인된 사실만" 규칙을 그대로 지킨다. */
export const TONE_GUIDE: Record<WritingTone, string> = {
  info: "정보형 (존댓말 + 칼럼체): 합니다체로 통일하세요. 본문 문장(소제목·표 칸 제외)은 모두 '~입니다', '~합니다', '~됩니다', '~있습니다'처럼 '니다'로 끝나야 하고, '~요', '~해요', '~이에요', '~죠'와 반말('~한다', '~이다')은 한 문장도 쓰지 마세요. 신문 칼럼처럼 차분하고 객관적으로, 배경 → 핵심 사실 → 의미·주의점 순서로 논리 있게 풀어 쓰세요. 감탄사·유행어·이모티콘·질문으로 말 걸기('~하시죠?')는 쓰지 마세요. 예: '이번 청약은 무주택 세대주만 신청할 수 있습니다. 접수는 10월 6일 하루 동안 진행됩니다.'",
  friendly:
    "친근형 (해요체 + 수다형): 해요체로 통일하세요. 본문 문장(소제목·표 칸 제외)은 모두 '~해요', '~이에요', '~있어요', '~죠', '~거든요'처럼 '요'로 끝나야 하고, '~입니다', '~합니다', '~한다' 같은 합니다체·반말은 한 문장도 쓰지 마세요. 옆에서 수다 떨듯 독자에게 자주 말을 걸고('이 부분 은근 헷갈리시죠?', '여기서 꼭 챙길 게 하나 있어요'), 가벼운 감탄과 공감 표현('와, 생각보다 간단하죠?')을 곳곳에 넣으세요. 정보는 정확하게 전하세요. 예: '먼저 자격부터 볼게요. 무주택 세대주라면 신청할 수 있어요. 생각보다 조건이 간단하죠?'",
  story:
    "스토리형 (스토리텔링 + 일기체 + 유머): 존댓말 일기체로 쓰세요. 본문 문장(소제목·표 칸 제외)은 모두 '~했어요', '~더라고요', '~였어요', '~있었어요', '~거든요'처럼 '요'로 끝나야 하고, '~입니다', '~합니다', '~했다' 같은 합니다체·반말은 한 문장도 쓰지 마세요. 독자가 겪을 법한 상황이나 장면으로 시작해 이야기 흐름 속에서 정보를 하나씩 풀고, 가볍고 재치 있는 유머나 혼잣말('그때 알았어요, 달력부터 봐야 한다는 걸')을 곳곳에 넣으세요. 도입부 2~3문장 안에 핵심 답도 함께 밝히세요. 글쓴이가 실제로 겪은 일처럼 경험·후기·대화를 지어내지 말고, '이런 상황이라면' 같은 가정이나 독자의 입장으로 이야기를 풀어 주세요. 사실·숫자·날짜는 정확하게 쓰세요. 예: '아침에 공고를 열었더니 접수일이 딱 하루뿐이더라고요. 달력부터 확인했어요.'",
  summary:
    "정리형 (Q&A + 요약 리스트): 소제목을 독자가 검색할 법한 질문으로 쓰고(예: '❓ 신청 자격은 어떻게 되나요?'), 소제목 바로 아래 첫 문단에서 결론을 한두 문장으로 먼저 답하세요. 설명은 짧은 문장과 목록·표 위주로 정리하고, 글 끝 핵심 요약은 목록으로 쓰세요. 어미는 해요체('~해요') 또는 합니다체('~합니다') 중 하나로 글 전체를 통일하고 섞지 마세요. 반말('~한다')은 쓰지 마세요.",
};

/** 말투 지시 (고르지 않은 예전 작업은 글쓰기 규칙대로라 빈 문자열) */
export const toneSection = (tone?: WritingTone) =>
  tone ? `\n## 말투 (가장 중요한 요구입니다. 글쓰기 규칙의 문체보다 우선하며, 존댓말과 확인된 사실만 쓰는 규칙은 그대로 지킬 것)\n- ${TONE_GUIDE[tone]}\n` : "";

/** 글 쓰기 요청의 맨 끝에 한 번 더 붙이는 말투 확인 (긴 지시 앞부분이 잊히지 않게) */
const toneReminder = (tone?: WritingTone) => (tone ? `\n\n## 말투 최종 확인 (${toneName(tone)})\n- ${TONE_GUIDE[tone]}\n- 다 쓴 뒤 모든 문장의 끝을 이 말투로 다시 확인하고, 어긋난 문장은 고쳐서 내세요.` : "");

const BASE_SYSTEM = (rules: string, today: string, writing?: WritingOptions) => {
  const target = writing?.targetChars ?? DEFAULT_TARGET_CHARS;
  const [lo, hi] = targetRange(target);
  return `당신은 한국어 블로그 작가입니다. 리서치 노트를 바탕으로 블로그 글 한 편을 씁니다.
아래 "글쓰기 규칙"을 모든 항목에서 지키세요. 내용과 문체는 규칙이 우선하고(분량${writing ? "과 말투" : ""}는 아래 항목이 규칙보다 우선), 출력 필드 구조는 아래 "출력 형식"을 따르세요.
오늘 날짜는 ${today}(한국 시간)입니다.

<글쓰기_규칙>
${rules}
</글쓰기_규칙>

## 분량 (반드시 지킬 것)
- 본문 목표는 공백 포함 약 ${target.toLocaleString()}자입니다. ${lo.toLocaleString()}~${hi.toLocaleString()}자로 쓰고, ${maxBodyChars(target).toLocaleString()}자를 넘기지 마세요. 글쓰기 규칙에 적힌 분량보다 이 목표가 우선합니다.
- 제목, 이미지, 글 끝 "참고 자료" 목록, 태그는 이 분량에 들어가지 않습니다.
- 정보가 많으면 중요도가 낮은 섹션을 빼고, 빼낸 내용은 omittedItems에 "분량 때문에 뺌"으로 적으세요.
- 확인된 자료가 목표를 채우기에 부족하면 지어내거나 같은 말을 되풀이하지 말고 짧게 끝내세요.
${toneSection(writing?.tone)}
## 출력 형식
- 사실은 리서치 노트에 출처와 함께 있는 것만 씁니다. 노트의 "찾지 못한 항목"은 본문에 쓰지 말고 omittedItems에 넣으세요.
- blocks 종류: heading(소제목), paragraph(문단), list(목록), quote(인용), table(표), image(이미지).
- paragraph 안에서는 문장이 끝날 때마다 줄바꿈 문자(\n)로 줄을 나누세요. 한 문단은 2~4줄이고, 한두 문장으로 끝나는 짧은 내용은 한 줄 문단으로 둬도 됩니다. 문단 사이에 빈 문단을 만들지 마세요.
- 굵은 글씨는 텍스트 안에서 **이렇게** 표시합니다. 그 밖의 마크다운 문법(#, *, [링크](url), 표 문법)은 쓰지 마세요. 표는 table 블록으로 만드세요.
- 링크는 "기관/페이지 이름: https://..." 형태의 일반 텍스트로 쓰고, 리서치 출처 목록에 있는 URL만 씁니다.
- table의 headers와 모든 rows는 칸 수가 같아야 하고 모든 칸이 채워져 있어야 합니다. 채울 수 없는 행은 빼세요.
- 규칙에서 "채팅 답변"이나 "사용자에게 안내"하라고 한 내용은 본문에 넣지 마세요. 본문에서 뺀 항목만 omittedItems에 짧게 적습니다.
- titleCandidates는 3개, title은 그중 가장 좋은 것과 똑같이 쓰세요.
- tagDetails: 태그마다 source(출처)와 query(확인에 쓴 검색어)를 적습니다. tag에는 '#'을 붙이지 마세요.
  - source가 "자동완성"이면 아래 "네이버 자동완성" 목록에 실제로 있는 표현만, query에는 그 목록의 검색어를 쓰세요.
  - source가 "함께 많이 찾는"이면 아래 "네이버 함께 많이 찾는" 목록에 실제로 있는 표현만, query에는 그 목록의 검색어를 쓰세요. 규칙의 "연관검색어"는 이 출처에 해당합니다.
  - "스마트블록 주제"는 이번에 수집하지 못했으므로 그 출처의 태그는 만들지 마세요.
  - 자동완성·함께 많이 찾는 목록에는 다른 지역·단지·상품 이야기도 섞여 있습니다. 이 글 내용과 실제로 맞는 표현만 고르세요.
  - "본문 고유명사"는 본문에 실제로 나오는 고유명사·지역명만 씁니다.`;
};

export const STYLE_GUIDE: Record<ImageOptions["style"], string> = {
  ghibli:
    "지브리풍 애니메이션 배경/장면입니다. 글의 내용을 한 장면(인물, 장소, 소품)으로 은유해서 그리세요. 다이어그램·도표·차트는 이 스타일에 맞지 않으니 쓰지 마세요.",
  realistic:
    "실사 사진입니다. 실제로 카메라로 찍을 수 있는 구체적인 장면(장소, 사물, 행동)만 묘사하세요. 추상 개념·도표·인포그래픽은 쓰지 말고, 사람 얼굴 클로즈업은 피하세요.",
  anime:
    "일본 애니메이션 스타일 장면입니다. 글의 내용을 인물의 행동과 배경이 있는 한 장면으로 그리세요. 다이어그램·도표는 쓰지 마세요.",
  flat: "단순한 도형·아이콘·다이어그램 위주의 벡터 일러스트입니다. 개념이나 관계를 도식으로 보여 줘도 좋습니다.",
};

function imageInstructions(o: ImageOptions): string {
  if (!o.thumbnail && o.bodyImages === 0) {
    return "\n- 이미지는 넣지 마세요. thumbnail 필드를 생략하고 image 블록도 만들지 마세요.";
  }
  const textRule =
    o.provider === "claude"
      ? "prompt는 한국어로 쓰세요. 이미지 안에 들어갈 글자는 prompt가 아니라 headline 필드에 쓰세요."
      : "prompt는 영어로, 장면·구도·배경·소품·인물의 행동·색감을 구체적으로 쓰세요. 이미지 안에 들어갈 글자는 prompt가 아니라 headline 필드에 쓰세요(따로 넣어 줍니다). 화풍은 별도로 붙으니 prompt에 화풍 이름(지브리, 실사 등)은 쓰지 마세요.";
  const parts = ["\n## 이미지 (본문과의 연관성이 가장 중요합니다)"];
  parts.push(`- 화풍: ${STYLE_GUIDE[o.style]}`);
  parts.push(
    "- 모든 이미지에는 basis 필드가 있습니다. basis에는 그 이미지가 그리는 본문의 문장(또는 소제목)을 글에 쓴 그대로 인용하세요. 그 다음에 basis에 나온 구체적인 대상·상황·수치·사례가 보이도록 prompt를 쓰세요.",
  );
  parts.push(
    "- 어느 글에나 붙일 수 있는 범용 이미지(악수하는 사람, 노트북 앞의 사람, 전구, 상승 화살표 등)는 금지입니다. 이 글의 주제어와 해당 섹션의 핵심 내용이 이미지만 봐도 짐작되어야 합니다.",
  );
  parts.push(
    "- 한 글 안의 이미지는 서로 다른 내용을 그리되, 같은 화풍·색감·등장인물 설정을 유지하세요.",
  );
  parts.push(
    o.thumbnail
      ? [
          "- thumbnail 필드 (검색 결과에서 클릭을 부르는 대표 이미지):",
          "  - headline: 이미지 가운데에 크게 들어갈 한국어 문구. 8~16자, 2줄 이내. 본문에 실제로 있는 핵심 사실(날짜·금액·대상·혜택·숫자)로 만들고, 제목을 그대로 옮기지 말고 한눈에 읽히게 줄이세요. 과장·낚시성 표현과 본문에 없는 내용은 금지입니다. 예: '10월 6일 단 하루', '무주택 세대주만 신청'.",
          "  - basis: headline의 근거가 된 본문 문장을 그대로 인용하세요.",
          "  - prompt: headline과 함께 보일 배경 장면. 글의 핵심 대상(장소·사물·상황)이 바로 보이는 구체적인 장면으로, 가운데에 글자가 들어갈 여백을 두고 대비가 강한 색으로 쓰세요. 글자 자체는 prompt에 쓰지 마세요 (headline이 따로 들어갑니다).",
          "  - alt: 한국어 대체 텍스트.",
        ].join("\n")
      : "- thumbnail 필드는 생략하세요.",
  );
  parts.push(
    o.bodyImages > 0
      ? [
          `- 본문 중간에 type이 "image"인 블록을 정확히 ${o.bodyImages}개 넣으세요. 각각 서로 다른 소제목 섹션 안에서, 그림이 설명하는 문단 바로 뒤에 두세요. 첫 블록이나 마지막 블록, "참고한 자료" 섹션에는 두지 마세요.`,
          "- 본문 이미지의 headline: 이미지 안에 글자를 넣으면 이해에 도움이 될 때(핵심 수치·날짜·단계 이름·비교 항목) 4~20자 한국어 문구로 쓰세요. 본문에 있는 사실만 쓰고, 글자가 필요 없는 그림이면 빈 문자열로 두세요.",
        ].join("\n")
      : '- type이 "image"인 블록은 만들지 마세요.',
  );
  parts.push(`- ${textRule}`);
  return parts.join("\n");
}

export interface WriteInput {
  jobId?: string;
  topic: string;
  rules: string;
  today: string;
  notes: string;
  sources: Source[];
  searchQuestion: string;
  mainKeyword: string;
  subKeywords: string[];
  autocomplete: Record<string, string[]>;
  related: Record<string, string[]>;
  options: ImageOptions;
  /** 분량·말투 (없으면 기본 분량, 글쓰기 규칙대로의 말투) */
  writing?: WritingOptions;
}

const KIND_LABEL: Record<NonNullable<Source["kind"]>, string> = {
  official: "공식",
  press: "언론",
  blog: "개인 블로그(참고용)",
  other: "기타",
};

export async function writePost(input: WriteInput, onProgress: (m: string) => void = () => {}): Promise<Post> {
  const sourceList = input.sources
    .map((s) => `- [${KIND_LABEL[s.kind ?? "other"]}] ${s.title}: ${s.url}`)
    .join("\n");
  const fmt = (m: Record<string, string[]>) =>
    Object.entries(m)
      .map(([q, items]) => `- 검색어 "${q}": ${items.join(", ")}`)
      .join("\n");
  const acList = fmt(input.autocomplete);
  const relList = fmt(input.related);

  const prompt = `주제: ${input.topic}

## 리서치 단계에서 정한 방향 (더 나은 것이 있으면 바꿔도 됩니다)
- 검색 질문: ${input.searchQuestion}
- 메인 키워드: ${input.mainKeyword}
- 서브 키워드: ${input.subKeywords.join(", ")}

## 네이버 자동완성 (${input.today} 수집)
${acList || "(수집 실패)"}

## 네이버 함께 많이 찾는 (${input.today} 수집)
${relList || "(이번 키워드에는 없음 → 이 출처의 태그는 만들지 마세요)"}

## 리서치 노트
${input.notes}

## 리서치 출처
${sourceList || "(없음)"}${toneReminder(input.writing?.tone)}`;

  const raw = await runClaude<unknown>({
    system: systemFor(input),
    prompt,
    schema: POST_JSON_SCHEMA,
    effort: "high",
    timeoutMs: 15 * 60_000,
    stage: "writing",
    jobId: input.jobId,
  });

  let parsed = ParsedPostSchema.parse(raw);

  parsed = await enforceTone(parsed, input, onProgress);
  parsed = await enforceLength(parsed, input, onProgress);
  const finalChars = countBodyChars(parsed);
  const target = input.writing?.targetChars ?? DEFAULT_TARGET_CHARS;
  if (finalChars > maxBodyChars(target)) {
    onProgress(`줄인 뒤에도 본문이 ${finalChars.toLocaleString()}자입니다. 초안 화면에서 직접 줄여 주세요.`);
  } else if (finalChars < targetRange(target)[0]) {
    onProgress(`본문이 ${finalChars.toLocaleString()}자로 목표(약 ${target.toLocaleString()}자)보다 짧습니다. 확인된 자료가 부족하면 짧아질 수 있습니다.`);
  }
  const verified = verifyTagSources(dedupeTags(parsed.tagDetails ?? []), input);
  if (verified.dropped.length) {
    onProgress(`수집 목록에 없는 태그 ${verified.dropped.length}개 제외: ${verified.dropped.join(", ")}`);
  }
  const tagDetails = verified.kept.slice(0, MAX_TAGS);
  const post: Post = {
    ...parsed,
    tags: tagDetails.map((t) => t.tag),
    tagDetails,
    tagsCheckedAt: input.today,
    blocks: stripUpdateLines(parsed.blocks.filter((b) => b.type !== "table" || isCompleteTable(b))),
  };
  const result = enforceImageOptions(post, input.options);
  const madeBody = result.blocks.filter((b) => b.type === "image").length;
  if (madeBody < input.options.bodyImages) {
    onProgress(`본문 이미지 ${input.options.bodyImages}개 중 ${madeBody}개만 만들어졌습니다. 이미지가 부족한 만큼 글에 들어가지 않습니다.`);
  }
  return result;
}

type ParsedPost = Omit<Post, "tags">;
/** 모델이 내는 글 (태그는 tagDetails에서 따로 정한다) */
const ParsedPostSchema = PostSchema.omit({ tags: true });
const systemFor = (input: Pick<WriteInput, "rules" | "today" | "options" | "writing">) =>
  BASE_SYSTEM(input.rules, input.today, input.writing) + imageInstructions(input.options);

/** "최종 업데이트: 2026.10.04" 같은 날짜 표시줄. 글쓰기 규칙에서 금지했지만 모델이 쓰더라도 본문에서 뺀다. */
const UPDATE_LINE = /^(최종|마지막)?\s*(업데이트|수정|갱신|작성|확인)\s*(일|날짜|일자)?\s*[:：]?\s*\d{4}\s*[.\-/년]/;
export function stripUpdateLines(blocks: PostBlock[]): PostBlock[] {
  return blocks.filter((b) => !(b.type === "paragraph" && b.text.length <= 40 && UPDATE_LINE.test(b.text.replace(/\*\*/g, "").trim())));
}

/**
 * 결과 문장 끝이 고른 말투와 어긋나면(예: 합니다체를 골랐는데 해요체가 섞임) 사실·구성은 그대로 두고 말투만 고쳐 다시 쓰게 한다 (1번).
 * 말투를 고르지 않은 작업이거나, 문장이 너무 적어 판단하기 어려우면 아무것도 하지 않는다.
 */
export async function enforceTone(
  parsed: ParsedPost,
  input: Pick<WriteInput, "rules" | "today" | "options" | "jobId" | "writing">,
  onProgress: (m: string) => void,
): Promise<ParsedPost> {
  const tone = input.writing?.tone;
  if (!tone) return parsed;
  const problem = toneProblem(parsed, tone);
  if (!problem) return parsed;
  onProgress(`말투가 ${toneName(tone)}과 다릅니다 (${problem}). 말투만 고쳐 다시 쓰는 중`);
  const rewritten = await runClaude<unknown>({
    system: systemFor(input),
    prompt: `아래 블로그 글(JSON)의 문장 끝이 선택한 말투(${toneName(tone)})와 맞지 않습니다. ${problem}.
같은 JSON 구조로, 본문의 모든 문장(소제목·표 칸 제외)을 선택한 말투로 고쳐서 다시 내 주세요.
- 사실·숫자·날짜·출처·링크는 바꾸거나 새로 만들지 마세요. 문장 수와 분량, 소제목·표·목록 구성도 그대로 두세요.
- 이미지 블록(basis·prompt·alt), 제목, 제목 후보, 태그, 태그 근거, 뺀 항목은 그대로 두세요.
- 말투 지시를 한 문장도 빠짐없이 지키세요: ${TONE_GUIDE[tone]}

${JSON.stringify(parsed)}`,
    schema: POST_JSON_SCHEMA,
    effort: "medium",
    timeoutMs: 10 * 60_000,
    stage: "writing",
    jobId: input.jobId,
  });
  const fixed = ParsedPostSchema.parse(rewritten);
  const left = toneProblem(fixed, tone);
  if (left) onProgress(`말투를 고쳐 다시 썼지만 아직 다릅니다 (${left}). 초안 화면에서 확인해 주세요.`);
  return fixed;
}

/** 분량 초과 시 사실은 유지한 채 줄여 다시 쓰게 한다 (최대 2번). */
export async function enforceLength(
  parsed: ParsedPost,
  input: Pick<WriteInput, "rules" | "today" | "options" | "jobId" | "writing">,
  onProgress: (m: string) => void,
): Promise<ParsedPost> {
  const target = input.writing?.targetChars ?? DEFAULT_TARGET_CHARS;
  const max = maxBodyChars(target);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const chars = countBodyChars(parsed);
    if (chars <= max) break;
    onProgress(`본문 ${chars.toLocaleString()}자 → ${max.toLocaleString()}자 이내로 줄이는 중 (${attempt}차)`);
    const shortened = await runClaude<unknown>({
      system: systemFor(input),
      prompt: `아래 블로그 글(JSON)의 본문이 공백 포함 ${chars.toLocaleString()}자로, 상한 ${max.toLocaleString()}자를 넘습니다.
${target.toLocaleString()}자 안팎이 되도록 줄여서 같은 JSON 구조로 다시 내 주세요.
- 글자수는 "참고 자료" 소제목 앞까지만, 공백 포함으로 셉니다.
- 사실·숫자·날짜·출처는 바꾸거나 새로 만들지 마세요. 중복 설명, 긴 예시, 중요도가 낮은 섹션부터 줄이세요.
- 표·목록은 유지하되 덜 중요한 행은 뺄 수 있습니다. 뺀 내용은 omittedItems에 "분량 때문에 뺌"으로 추가하세요.
- 도입부(결론 먼저), 핵심 요약, 참고 자료 목록, 이미지 블록(basis·prompt·alt)은 그대로 두세요.
- 제목 후보와 태그는 그대로 두되 본문에서 빠진 내용과 맞지 않는 태그는 빼세요.

${JSON.stringify(parsed)}`,
      schema: POST_JSON_SCHEMA,
      effort: "medium",
      timeoutMs: 10 * 60_000,
      stage: "writing",
      jobId: input.jobId,
    });
    parsed = ParsedPostSchema.parse(shortened);
  }
  return parsed;
}

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/**
 * 출처가 "자동완성"/"함께 많이 찾는"인 태그는 실제 수집 목록의 표현(공백 무시, 일부분 허용)인지 확인한다.
 * 목록에 없으면 뺀다. 확인 검색어(query)는 실제로 그 표현이 나온 검색어로 바로잡는다.
 */
export function verifyTagSources(
  details: TagDetail[],
  input: Pick<WriteInput, "autocomplete" | "related">,
): { kept: TagDetail[]; dropped: string[] } {
  const lists: Partial<Record<TagDetail["source"], Record<string, string[]>>> = {
    자동완성: input.autocomplete,
    "함께 많이 찾는": input.related,
  };
  const kept: TagDetail[] = [];
  const dropped: string[] = [];
  for (const t of details) {
    if (t.source === "스마트블록 주제") {
      dropped.push(`#${t.tag}(${t.source})`); // 수집하지 않는 출처라 근거가 없다
      continue;
    }
    const list = lists[t.source];
    if (!list) {
      kept.push(t);
      continue;
    }
    const tag = norm(t.tag);
    const entries = Object.entries(list);
    const hit =
      entries.find(([q, items]) => q === t.query && items.some((it) => norm(it).includes(tag))) ??
      entries.find(([, items]) => items.some((it) => norm(it).includes(tag)));
    if (hit) kept.push({ ...t, query: hit[0] });
    else dropped.push(`#${t.tag}(${t.source})`);
  }
  return { kept, dropped };
}

function dedupeTags(details: TagDetail[]): TagDetail[] {
  const seen = new Set<string>();
  return details
    .map((t) => ({ ...t, tag: t.tag.replace(/^#+/, "").trim() }))
    .filter((t) => t.tag && !seen.has(t.tag) && seen.add(t.tag));
}

/** 규칙: 빈 칸, "-", "미정" 같은 표시가 있는 행은 뺀다. 남은 행이 없으면 표 자체를 뺀다. */
export function isCompleteTable(b: Extract<PostBlock, { type: "table" }>): boolean {
  const bad = (c: string) => !c.trim() || /^(-|–|—|미정|확인\s*중|없음)$/.test(c.trim());
  b.rows = b.rows.filter((r) => r.length === b.headers.length && !r.some(bad));
  return b.headers.length > 0 && b.rows.length > 0;
}

/** 모델이 개수를 어겨도 사용자가 정한 옵션을 지킨다. */
export function enforceImageOptions(post: Post, o: ImageOptions): Post {
  let bodyLeft = o.bodyImages;
  const blocks = post.blocks.filter((b) => {
    if (b.type !== "image") return true;
    return bodyLeft-- > 0;
  });
  return { ...post, thumbnail: o.thumbnail ? post.thumbnail : undefined, blocks };
}
