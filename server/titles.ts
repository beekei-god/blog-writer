import { z } from "zod";
import { blockText } from "../shared/blockDiff";
import type { Post } from "../shared/types";
import { runClaude } from "./claude";

const TITLE_COUNT = 3;
/** 본문은 앞부분만 보여 준다 (제목은 도입부·소제목만으로도 충분하다) */
const BODY_LIMIT = 4000;

const ResultSchema = z.object({ titleCandidates: z.array(z.string()) });

/**
 * 지금 글 내용으로 제목 후보만 새로 만든다 (글은 바꾸지 않는다).
 * 글쓰기 규칙의 제목 기준(메인 키워드 앞쪽, 25~35자 안팎, 검색 의도·날짜·숫자)을 따르고, 지금 제목·예전 후보와 다른 표현으로 낸다.
 */
export async function regenerateTitles(input: { post: Post; topic: string; rules: string; today: string; jobId: string }): Promise<string[]> {
  const { post } = input;
  const body = post.blocks
    .filter((b) => b.type !== "image")
    .map(blockText)
    .join("\n")
    .slice(0, BODY_LIMIT);
  const raw = await runClaude<unknown>({
    system: `당신은 한국어 블로그 편집자입니다. 이미 쓴 블로그 글의 제목 후보를 새로 냅니다.
아래 "글쓰기 규칙"의 제목 기준을 지키세요. 오늘 날짜는 ${input.today}(한국 시간)입니다.

<글쓰기_규칙>
${input.rules}
</글쓰기_규칙>

## 제목 후보
- titleCandidates에 제목 후보를 정확히 ${TITLE_COUNT}개 내세요. 서로 다른 각도(검색 의도·대상·날짜나 숫자)로 쓰세요.
- 지금 제목과 예전 후보를 그대로 되풀이하지 마세요.
- 본문에 실제로 있는 사실(날짜·금액·대상·숫자)만 쓰세요. 낚시성 표현과 같은 키워드 반복은 피하세요.
- 굵게(**)·따옴표·이모지·마크다운 없이 제목 글자만 쓰세요.`,
    prompt: `주제: ${input.topic}
지금 제목: ${post.title}
예전 후보: ${post.titleCandidates?.join(" / ") || "(없음)"}
${post.searchQuestion ? `검색 질문: ${post.searchQuestion}\n` : ""}${post.mainKeyword ? `메인 키워드: ${post.mainKeyword}\n` : ""}${post.subKeywords?.length ? `서브 키워드: ${post.subKeywords.join(", ")}\n` : ""}요약: ${post.summary}

## 본문
${body}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["titleCandidates"],
      properties: { titleCandidates: { type: "array", items: { type: "string" } } },
    },
    effort: "low",
    timeoutMs: 3 * 60_000,
    stage: "writing",
    jobId: input.jobId,
  });
  const titles = [...new Set(ResultSchema.parse(raw).titleCandidates.map((t) => t.replace(/\*\*/g, "").trim()).filter(Boolean))].slice(0, TITLE_COUNT);
  if (!titles.length) throw new Error("제목 후보를 만들지 못했습니다. 다시 시도해 주세요.");
  return titles;
}
