import { z } from "zod";
import type { ImageProvider, ImageStyle, Post } from "../../shared/types";
import { runClaude } from "../claude";
import { STYLE_GUIDE } from "../writer";

/**
 * 이미지를 만들기 직전에 본문을 다시 보고, 이미지마다 "무엇을 그릴지(prompt)"와 "이미지 안에 넣을 문구(headline)"를 정한다.
 * - 이미지가 놓인 섹션(소제목과 그 아래 내용)의 구체적인 대상·상황·수치가 그림에 드러나게 한다.
 * - 만드는 AI(Claude는 한국어, Gemini·ChatGPT는 영어)와 스타일에 맞는 설명으로 다시 쓴다. AI를 바꿔 다시 만들 때도 맞는다.
 * - 이미지 안의 글자는 prompt가 아니라 headline으로 따로 받는다. 글자가 깨지지 않게 생성 쪽에서 정확한 문구로 넣는다.
 */
export interface PlanTarget {
  /** "thumbnail" 또는 "body-<블록 번호>" */
  key: string;
  kind: "thumbnail" | "body";
  /** 본문 이미지의 블록 번호 */
  index?: number;
  basis?: string;
  prompt: string;
  headline?: string;
}

const ResultSchema = z.object({
  images: z.array(z.object({ key: z.string(), headline: z.string(), basis: z.string(), prompt: z.string().min(1) })),
});
export type PlanResult = z.infer<typeof ResultSchema>["images"][number];

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["images"],
  properties: {
    images: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "headline", "basis", "prompt"],
        properties: { key: { type: "string" }, headline: { type: "string" }, basis: { type: "string" }, prompt: { type: "string" } },
      },
    },
  },
};

/** 블록 번호를 붙인 본문 (이미지는 자리 표시) */
function bodyOutline(post: Post): string {
  return post.blocks
    .map((b, i) => {
      switch (b.type) {
        case "heading":
          return `[${i}] ## ${b.text.replace(/\*\*/g, "")}`;
        case "paragraph":
        case "quote":
          return `[${i}] ${b.text.replace(/\*\*/g, "")}`;
        case "list":
          return `[${i}] ${b.items.map((it) => `- ${it.replace(/\*\*/g, "")}`).join(" / ")}`;
        case "table":
          return `[${i}] (표) ${[b.headers, ...b.rows].map((r) => r.join(" | ")).join(" ; ")}`;
        case "image":
          return `[${i}] <이미지 자리>`;
      }
    })
    .join("\n")
    .slice(0, 9000);
}

export async function planImages(
  post: Post,
  provider: ImageProvider,
  style: ImageStyle,
  targets: PlanTarget[],
  jobId: string,
): Promise<PlanResult[]> {
  const promptRule =
    provider === "claude"
      ? "prompt는 한국어로, 도형·아이콘·도식으로 그릴 수 있는 장면을 구체적으로 쓰세요."
      : "prompt는 영어로, 장면·구도·배경·소품·인물의 행동·색감을 구체적으로 쓰세요. 화풍 이름(지브리, 실사 등)은 쓰지 마세요(따로 붙습니다).";
  const request = targets
    .map((t) =>
      t.kind === "thumbnail"
        ? `- key "thumbnail": 대표 썸네일 (글 전체의 핵심). 제목: ${post.title}`
        : `- key "${t.key}": 본문 블록 [${t.index}] 자리의 이미지. 연결된 본문: ${t.basis ? `“${t.basis.replace(/\*\*/g, "").slice(0, 200)}”` : "(없음)"} / 지금 설명: ${t.prompt.slice(0, 200)}`,
    )
    .join("\n");

  const raw = await runClaude<unknown>({
    system: `당신은 블로그 이미지 기획자입니다. 글을 읽고 요청된 이미지마다 무엇을 그릴지 정합니다.

## 규칙
- 이미지는 그것이 놓인 섹션(바로 앞 소제목부터 다음 소제목 전까지)의 구체적인 대상·상황·수치·사례가 그림에서 드러나야 합니다. 어느 글에나 붙일 수 있는 범용 이미지(악수, 노트북 앞의 사람, 전구, 상승 화살표 등)는 금지입니다.
- 화풍: ${STYLE_GUIDE[style]} 이 화풍에 맞게 그릴 수 있는 장면만 쓰세요.
- 한 글 안의 이미지는 서로 다른 내용을 그리되, 같은 화풍·색감·등장인물 설정을 유지하세요.
- ${promptRule}
- 이미지 안에 글자를 넣어도 됩니다. 단, 글자는 prompt에 쓰지 말고 headline에만 쓰세요(정확한 문구로 따로 넣습니다). prompt에는 글자가 들어갈 자리(여백, 띠, 상자)만 묘사하세요.
- headline은 본문에 실제로 있는 사실(날짜·금액·대상·혜택·수치·단계 이름)로만 만드세요. 과장·낚시성 표현과 본문에 없는 내용은 금지입니다.
  - 썸네일: 검색 결과에서 눌러 보고 싶게 만드는 8~16자 한국어 문구, 2줄 이내(줄바꿈은 \\n). 제목을 그대로 옮기지 말고 한눈에 읽히게 줄이세요. 문구와 핵심 대상은 가운데에 모아, 목록에서 정사각형으로 잘려도 보이게 하세요.
  - 본문 이미지: 그림을 이해하는 데 도움이 될 때만 4~20자 한국어 라벨·수치·단계 이름. 글자가 필요 없으면 빈 문자열.
- basis는 그 이미지의 근거가 된 본문 문장을 글에 쓴 그대로 인용하세요.
- 요청된 key마다 정확히 하나씩 돌려주세요.`,
    prompt: `글 제목: ${post.title}\n요약: ${post.summary}\n\n## 본문 (앞의 [번호]는 블록 번호)\n${bodyOutline(post)}\n\n## 기획할 이미지\n${request}`,
    schema: JSON_SCHEMA,
    effort: "low",
    timeoutMs: 4 * 60_000,
    stage: "images",
    jobId,
  });
  const parsed = ResultSchema.parse(raw).images;
  const byKey = new Map(parsed.map((p) => [p.key, p]));
  return targets.flatMap((t) => {
    const r = byKey.get(t.key);
    return r ? [{ ...r, headline: r.headline.trim().slice(0, 60) }] : [];
  });
}
