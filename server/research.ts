import { z } from "zod";
import type { Source } from "../shared/types";
import { runClaude } from "./claude";

const SYSTEM = (rules: string, today: string) => `당신은 블로그 글 작성을 위한 리서치 담당자입니다.
오늘 날짜는 ${today}(한국 시간)입니다. 검색어와 자료의 최신성 판단에 이 날짜를 쓰세요.

아래 "글쓰기 규칙"은 글 작성 단계에서 지켜야 할 규칙입니다. 특히 "확인된 내용만 사용" 항목을 지킬 수 있도록, 글에 필요한 사실을 빠짐없이 출처와 함께 모으세요.

<글쓰기_규칙>
${rules}
</글쓰기_규칙>

## 리서치 방법
- WebSearch로 서로 다른 관점의 쿼리를 여러 번 검색하고, 핵심 페이지는 WebFetch로 원문을 열어 확인하세요.
- 공식 자료(정부·공공기관, 공고문, 주최사·예매처 공지)를 먼저 찾고, 그다음 언론 보도, 개인 블로그는 보조로만 쓰세요.
- WebFetch는 페이지 원문 전체를 읽어 비용이 큽니다. 사용자가 준 링크 말고는 공식 자료와 핵심 원문 위주로 최대 6개만 여세요. 검색 결과 요약으로 이미 확인되는 사실은 다시 열지 마세요.
- 사용자가 준 참고 링크는 모두 WebFetch로 열어 표, 장단점, 진행 방식, 문의처, 관련 링크까지 빠짐없이 노트에 옮기세요.
- notes에는 사실마다 [출처 URL]을 붙이세요. 개인 블로그에서 온 수치는 "(참고용)"이라고 표시하세요.
- 자료끼리 다르면 하나를 고르지 말고 각각의 값과 출처를 적고 "공고문 확인 필요"라고 표시하세요.
- 찾으려 했지만 찾지 못한 항목은 notes 끝의 "찾지 못한 항목" 목록에 적으세요. 추측으로 채우지 마세요.
- sources에는 실제로 연 페이지만 넣고, kind로 official(공식) / press(언론) / blog(개인 블로그) / other 를 표시하세요.
- searchQuestion: 이 글이 답할 검색 질문 한 문장. mainKeyword: 메인 키워드 1개. subKeywords: 서브 키워드 2~3개 (롱테일 우선).`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["searchQuestion", "mainKeyword", "subKeywords", "notes", "sources"],
  properties: {
    searchQuestion: { type: "string" },
    mainKeyword: { type: "string" },
    subKeywords: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "kind"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          kind: { type: "string", enum: ["official", "press", "blog", "other"] },
        },
      },
    },
  },
};

const ResultSchema = z.object({
  searchQuestion: z.string(),
  mainKeyword: z.string(),
  subKeywords: z.array(z.string()),
  notes: z.string().min(1),
  sources: z.array(
    z.object({ title: z.string(), url: z.string(), kind: z.enum(["official", "press", "blog", "other"]) }),
  ),
});

export type ResearchResult = Omit<z.infer<typeof ResultSchema>, "sources"> & { sources: Source[] };

export async function deepResearch(
  input: { topic: string; links: string[]; rules: string; today: string; jobId?: string },
  onProgress: (msg: string) => void,
): Promise<ResearchResult> {
  const linkText = input.links.length
    ? `\n\n## 사용자가 준 참고 링크 (모두 열어서 반영)\n${input.links.map((l) => `- ${l}`).join("\n")}`
    : "";

  const raw = await runClaude<unknown>({
    system: SYSTEM(input.rules, input.today),
    prompt: `주제: ${input.topic}${linkText}\n\n이 주제로 블로그 글을 쓰기 위한 리서치 노트를 작성해 주세요.`,
    tools: ["WebSearch", "WebFetch"],
    schema: SCHEMA,
    effort: "high",
    timeoutMs: 20 * 60_000,
    stage: "research",
    jobId: input.jobId,
    onToolUse: (name, input) => {
      if (name === "WebSearch") onProgress(`웹 검색: ${String(input.query ?? "")}`);
      else if (name === "WebFetch") onProgress(`페이지 읽는 중: ${String(input.url ?? "")}`);
    },
  });

  const parsed = ResultSchema.parse(raw);
  const unique = new Map(parsed.sources.filter((s) => /^https?:\/\//i.test(s.url)).map((s) => [s.url, s]));
  return { ...parsed, notes: parsed.notes.trim(), sources: [...unique.values()] };
}
