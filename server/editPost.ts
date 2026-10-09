import { z } from "zod";
import { countBodyChars, MAX_BODY_CHARS } from "../shared/length";
import type { EditProposal, Post, PostBlock } from "../shared/types";
import { runClaude } from "./claude";
import { isCompleteTable } from "./writer";

/**
 * 프롬프트로 글 고치기: 사용자가 쓴 수정 요청대로 글 전체 또는 선택한 블록 범위를 고치거나 내용을 더한다.
 * - 이미지 블록은 새로 만들거나 지우지 않고 원래 이미지(파일 포함)를 그대로 쓴다. Claude에게는 ref만 보여 주고 서버가 되돌려 붙인다.
 * - 범위를 고를 때는 그 범위의 블록만 새 블록들로 바꾼다. 범위 밖의 글은 건드리지 않는다.
 * - 결과는 바로 글에 넣지 않고 제안(EditProposal)으로 돌려준다. 적용은 사용자가 비교해 보고 정한다.
 */
export const EDIT_PROMPT_MAX = 2000;

type TextBlockType = "heading" | "paragraph" | "quote";
const textBlock = (type: TextBlockType) => ({
  type: "object",
  additionalProperties: false,
  required: ["type", "text"],
  properties: { type: { const: type }, text: { type: "string" } },
});
const strArr = { type: "array", items: { type: "string" } };

const BLOCKS_SCHEMA = {
  type: "array",
  items: {
    anyOf: [
      textBlock("heading"),
      textBlock("paragraph"),
      textBlock("quote"),
      { type: "object", additionalProperties: false, required: ["type", "items"], properties: { type: { const: "list" }, items: strArr } },
      {
        type: "object",
        additionalProperties: false,
        required: ["type", "headers", "rows"],
        properties: { type: { const: "table" }, headers: strArr, rows: { type: "array", items: strArr } },
      },
      { type: "object", additionalProperties: false, required: ["type", "ref"], properties: { type: { const: "image" }, ref: { type: "string" } } },
    ],
  },
};

/** 글 전체는 제목·요약도 같이 받고, 범위만 고칠 때는 블록과 변경 요약만 받는다 */
const jsonSchema = (whole: boolean) => ({
  type: "object",
  additionalProperties: false,
  required: whole ? ["title", "summary", "note", "blocks"] : ["note", "blocks"],
  properties: { ...(whole ? { title: { type: "string" }, summary: { type: "string" } } : {}), note: { type: "string" }, blocks: BLOCKS_SCHEMA },
});

const ResultSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  note: z.string(),
  blocks: z.array(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("heading"), text: z.string() }),
      z.object({ type: z.literal("paragraph"), text: z.string() }),
      z.object({ type: z.literal("quote"), text: z.string() }),
      z.object({ type: z.literal("list"), items: z.array(z.string()) }),
      z.object({ type: z.literal("table"), headers: z.array(z.string()), rows: z.array(z.array(z.string())) }),
      z.object({ type: z.literal("image"), ref: z.string() }),
    ]),
  ),
});

/** Claude에게 보여 주는 블록: 번호(i)를 붙이고, 이미지는 파일 대신 ref(img-1…)와 대체 텍스트만 보인다 */
function shown(blocks: PostBlock[], offset: number, refOf: Map<PostBlock, string>): string {
  return blocks
    .map((b, k) => JSON.stringify(b.type === "image" ? { i: offset + k, type: "image", ref: refOf.get(b), alt: b.alt } : { i: offset + k, ...b }))
    .join("\n");
}

const SYSTEM = (rules: string, today: string, whole: boolean, chars: number) => `당신은 한국어 블로그 작가이자 편집자입니다. 이미 쓴 블로그 글을 사용자의 "수정 요청"대로 고치거나 내용을 덧붙입니다.
오늘 날짜는 ${today}(한국 시간)입니다.

<글쓰기_규칙>
${rules}
</글쓰기_규칙>

## 고치는 방법
- 요청한 부분만 고치세요. 요청과 상관없는 문장은 표현까지 그대로 두세요. 글쓰기 규칙(문체, 구조, 확인된 사실만 쓰기 등)은 고치거나 더한 부분에도 똑같이 지키세요.
- 새 사실은 수정 요청에 적힌 내용, 글에 이미 있는 자료·출처, 웹 검색(WebSearch·WebFetch)으로 확인한 것만 쓰세요. 확인하지 못한 사실은 쓰지 말고 note에 "확인하지 못해 뺐다"고 적으세요. 웹 검색은 새 사실이 필요할 때만 하고, 페이지 열람(WebFetch)은 최대 4개까지만 하세요.
- 링크는 확인한 URL만, "기관/페이지 이름: https://..." 형태의 일반 텍스트로 쓰세요. 새로 참고한 자료는 글 끝 "참고 자료" 목록에 더하세요(그 목록이 고치는 범위 안에 있을 때).
- 분량: 본문은 공백 포함 ${MAX_BODY_CHARS.toLocaleString()}자를 넘기지 마세요(제목·이미지·"참고 자료" 목록은 제외). 지금 본문은 ${chars.toLocaleString()}자입니다. 내용을 더하면 덜 중요한 문장을 줄여 맞추세요.
- 이미지 블록({"type":"image","ref":"img-1"}…)은 새로 만들거나 지우지 마세요. 보이는 이미지 블록을 빠짐없이 한 번씩, ref를 그대로 blocks에 넣으세요. 위치는 요청에 맞게 옮겨도 됩니다.
- blocks 종류: heading(소제목), paragraph(문단), list(목록), quote(인용), table(표), image(이미지).
- paragraph 안에서는 문장이 끝날 때마다 줄바꿈 문자(\\n)로 줄을 나누세요. 한 문단은 2~4줄이고, 문단 사이에 빈 문단을 만들지 마세요.
- 굵은 글씨는 텍스트 안에서 **이렇게** 표시합니다. 그 밖의 마크다운 문법(#, *, [링크](url), 표 문법)은 쓰지 마세요. 표는 table 블록으로 만들고, headers와 모든 rows는 칸 수가 같고 모든 칸이 채워져 있어야 합니다.
- note에는 무엇을 어떻게 고쳤는지 한두 문장으로 쓰세요. 고칠 것이 없다고 판단하면 그 이유를 쓰고 블록은 그대로 돌려주세요.
${
  whole
    ? "- 글 전체를 고칩니다. title과 summary도 함께 돌려주세요(바꿀 필요가 없으면 그대로). blocks에는 글의 모든 블록을 순서대로 돌려주세요."
    : "- 지정한 범위의 블록만 고칩니다. blocks에는 그 범위를 대신할 블록들만 돌려주세요(범위 앞뒤의 블록은 보이는 문맥일 뿐이니 돌려주지 마세요). 고치지 않을 블록도 범위 안에 있으면 그대로 포함해서 돌려주세요."
}`;

export interface EditInput {
  post: Post;
  prompt: string;
  /** 고칠 블록 범위. 없으면 글 전체 */
  range?: { start: number; end: number };
  rules: string;
  today: string;
  jobId: string;
  onProgress: (m: string) => void;
}

/** 고친 결과(제안). 글에는 아직 넣지 않는다 */
export type EditResult = Required<Pick<EditProposal, "before" | "after" | "note" | "charsBefore" | "charsAfter">> & Pick<EditProposal, "title" | "summary">;

export async function proposeEdit(input: EditInput): Promise<EditResult> {
  const { post, range } = input;
  const whole = !range;
  const start = range?.start ?? 0;
  const end = range?.end ?? post.blocks.length - 1;
  const before = post.blocks.slice(start, end + 1);
  const charsBefore = countBodyChars(post);

  // 이미지는 ref로만 보여 주고, 결과에서 원래 이미지(파일 포함)를 되돌려 붙인다.
  const refOf = new Map<PostBlock, string>();
  const imageByRef = new Map<string, Extract<PostBlock, { type: "image" }>>();
  for (const b of before) {
    if (b.type !== "image") continue;
    const ref = `img-${imageByRef.size + 1}`;
    refOf.set(b, ref);
    imageByRef.set(ref, b);
  }

  const context = (blocks: PostBlock[], offset: number) => (blocks.length ? shown(blocks, offset, new Map()) : "(없음)");
  const prompt = `## 수정 요청
${input.prompt.trim()}

## 글
제목: ${post.title}
요약: ${post.summary}
${
  whole
    ? `\n## 고칠 블록 (글 전체, 모든 블록)\n${shown(before, start, refOf)}`
    : `\n## 범위 앞의 블록 (문맥, 고치지 않음)\n${context(post.blocks.slice(Math.max(0, start - 2), start), Math.max(0, start - 2))}\n\n## 고칠 블록 (#${start}~#${end})\n${shown(before, start, refOf)}\n\n## 범위 뒤의 블록 (문맥, 고치지 않음)\n${context(post.blocks.slice(end + 1, end + 3), end + 1)}`
}`;

  input.onProgress(whole ? "프롬프트로 글 전체를 고치는 중" : `프롬프트로 블록 #${start}~#${end}를 고치는 중`);
  const raw = await runClaude<unknown>({
    system: SYSTEM(input.rules, input.today, whole, charsBefore),
    prompt,
    schema: jsonSchema(whole),
    tools: ["WebSearch", "WebFetch"],
    effort: "medium",
    timeoutMs: 20 * 60_000,
    stage: "writing",
    jobId: input.jobId,
    onToolUse: (name, i) => {
      if (name === "WebSearch") input.onProgress(`웹 검색: ${String(i.query ?? "")}`);
      else if (name === "WebFetch") input.onProgress(`페이지 읽는 중: ${String(i.url ?? "")}`);
    },
  });
  const parsed = ResultSchema.parse(raw);

  // 이미지는 모두 한 번씩, 원래 이미지 그대로
  const used = new Set<string>();
  const after: PostBlock[] = [];
  for (const b of parsed.blocks) {
    if (b.type === "image") {
      const orig = imageByRef.get(b.ref);
      if (!orig || used.has(b.ref)) throw new Error("이미지 블록을 바꿔서 결과를 쓸 수 없습니다. 다시 시도해 주세요.");
      used.add(b.ref);
      after.push(orig);
      continue;
    }
    if (b.type === "table" && !isCompleteTable(b)) continue; // 칸이 비어 있는 표는 뺀다
    after.push(b);
  }
  if (used.size !== imageByRef.size) throw new Error("이미지 블록이 빠져서 결과를 쓸 수 없습니다. 다시 시도해 주세요.");
  if (whole && !after.length) throw new Error("글 전체를 고친 결과에 본문이 없습니다. 다시 시도해 주세요.");

  const title = whole ? parsed.title?.trim() || post.title : undefined;
  const summary = whole ? parsed.summary?.trim() ?? post.summary : undefined;
  const merged = [...post.blocks.slice(0, start), ...after, ...post.blocks.slice(end + 1)];
  const unchanged = JSON.stringify(after) === JSON.stringify(before) && (!whole || (title === post.title && summary === post.summary));
  if (unchanged) throw new Error(`바꿀 부분이 없다고 판단했습니다: ${parsed.note.trim() || "요청을 더 구체적으로 써 주세요."}`);

  return {
    before,
    after,
    ...(whole ? { title, summary } : {}),
    note: parsed.note.trim(),
    charsBefore,
    charsAfter: countBodyChars({ blocks: merged }),
  };
}

/**
 * 제안을 글에 적용한다. 제안을 만든 뒤 그 범위의 글이 바뀌었으면(직접 고쳤거나 이미지를 추가·삭제했거나) null.
 */
export function applyProposal(post: Post, p: EditProposal): Post | null {
  if (p.status !== "ready" || !p.before || !p.after) return null;
  const start = p.range?.start ?? 0;
  const end = p.range?.end ?? post.blocks.length - 1;
  if (JSON.stringify(post.blocks.slice(start, end + 1)) !== JSON.stringify(p.before)) return null;
  if (!p.range && p.before.length !== post.blocks.length) return null;
  return {
    ...post,
    ...(p.title ? { title: p.title } : {}),
    ...(p.summary !== undefined && !p.range ? { summary: p.summary } : {}),
    blocks: [...post.blocks.slice(0, start), ...p.after, ...post.blocks.slice(end + 1)],
  };
}
