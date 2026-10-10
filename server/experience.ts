import { z } from "zod";
import { MAX_EXPERIENCE_CHARS } from "../shared/types";
import { runClaude } from "./claude";

const ResultSchema = z.object({ memo: z.string() });

/**
 * 리뷰 글의 "경험 메모" 초안을 만든다. 웹에서 대상을 조사해 장단점·특징·추천 대상을 빈칸 없이 구체적으로 채운다.
 * 단, 글쓴이가 직접 겪었다고 단정할 수 있는 사실(사용 기간, 구매·이용 경위, 실제 겪은 일)은 지어내지 않고
 * 조사한 내용을 평가 문장으로 쓴다. 글쓴이는 이 초안을 자기 경험에 맞게 고칠 수 있다.
 */
export async function draftExperienceMemo(topic: string, onProgress: (m: string) => void = () => {}): Promise<string> {
  const raw = await runClaude<unknown>({
    system: `당신은 블로그 리뷰 글을 준비하는 글쓴이를 돕는 도우미입니다. 주어진 대상을 웹에서 조사하고 분석해서 "경험 메모" 초안을 만듭니다. 글쓴이가 이 메모를 고쳐 쓴 뒤 리뷰 본문의 근거로 씁니다.

## 규칙
- 웹 검색으로 대상의 특징·장점·아쉬운 점·사용자 평가를 조사하고, 확인된 내용을 구체적으로(수치·기능·조건 포함) 쓰세요. 빈칸이나 "[직접 입력]" 같은 자리 표시는 남기지 마세요.
- 확인되지 않은 내용은 쓰지 마세요.
- 글쓴이가 실제로 겪었다고 단정할 수 있는 사실(사용 기간, 구매·이용 경위, 며칠 써 본 결과, 개인 에피소드)은 지어내지 마세요. 대신 조사한 내용을 "~한 점이 장점입니다", "~는 아쉬운 부분입니다"처럼 평가 문장으로 쓰세요.
- 형식은 줄마다 "- "로 시작하는 8~10줄: 대상 소개 1줄 → 좋은 점 3줄 → 아쉬운 점 3줄 → 추천 대상 1줄 → 맞지 않는 대상 1줄.
- 각 줄은 한국어 한 문장으로 쓰고, 마크다운 문법은 "- " 외에 쓰지 마세요.`,
    prompt: `리뷰 대상: ${topic}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["memo"],
      properties: { memo: { type: "string" } },
    },
    tools: ["WebSearch", "WebFetch"],
    effort: "medium",
    timeoutMs: 8 * 60_000,
    stage: "writing",
    onToolUse: (name, i) => {
      if (name === "WebSearch") onProgress(`웹 검색: ${String(i.query ?? "")}`);
      else if (name === "WebFetch") onProgress(`페이지 읽는 중: ${String(i.url ?? "")}`);
    },
  });
  const memo = ResultSchema.parse(raw).memo.trim().slice(0, MAX_EXPERIENCE_CHARS);
  if (!memo) throw new Error("경험 메모 초안을 만들지 못했습니다. 다시 시도해 주세요.");
  return memo;
}
