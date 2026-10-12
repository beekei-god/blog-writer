import { bodyTexts } from "./length";
import type { Post } from "./types";

/** 제목·본문에 같은 키워드(메인·서브)를 그 표현 그대로 쓸 수 있는 횟수 */
export const KEYWORD_LIMIT = { title: 1, body: 2 } as const;

/**
 * 키워드 횟수와 검색 의도 지시 (글 작성과 제목 다시 만들기가 같이 쓴다).
 * 횟수 세는 기준은 아래 keywordOveruse와 같다.
 */
export const KEYWORD_RULES = `## 키워드 횟수와 검색 의도
- 제목: 메인·서브 키워드마다 그 표현 그대로는 1번만 쓰세요. 같은 키워드를 제목 안에서 되풀이하지 마세요.
- 본문(도입부·소제목·문단·목록·표, 글 끝 "참고 자료"는 제외): 메인·서브 키워드마다 그 표현 그대로는 본문 전체에서 최대 2번까지만 쓰세요. 메인 키워드는 도입부에서 1번 쓰고 필요하면 본문에서 1번 더 쓸 수 있으며, 그 밖에는 '이 보조금', '지원금'처럼 대명사·동의어·연관어로 바꿔 쓰세요. 더 긴 키워드 안에 들어 있는 짧은 키워드는 따로 세지 않습니다(예: 서브 키워드 '전기차 보조금 신청 방법'을 쓰면 메인 키워드 '전기차 보조금'은 쓴 것으로 세지 않음).
- 검색 의도: 제목과 본문은 검색 질문에 답하는 내용이어야 합니다. 제목만 보고도 이 글이 그 질문에 답한다는 것을 알 수 있게 쓰세요. 본문은 도입부에서 질문의 답을 먼저 밝히고, 소제목은 그 질문을 검색한 사람이 이어서 알고 싶어 할 내용(대상·조건·방법·일정·주의점 등)으로 구성하세요. 검색 의도와 관계없는 배경 설명·홍보성 내용은 넣지 마세요.`;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** 띄어쓰기와 대소문자를 무시하고 키워드를 찾는 정규식 ("전기차 보조금" = "전기차보조금") */
const pattern = (k: string) => new RegExp(Array.from(k.replace(/\s+/g, "")).map(escape).join("\\s*"), "gi");

/**
 * 키워드마다 그 표현 그대로 나온 횟수. 긴 키워드부터 세고 지워서, 긴 키워드 안에 들어 있는 짧은 키워드는 따로 세지 않는다.
 */
export function countKeywords(text: string, keywords: string[]): Map<string, number> {
  const uniq = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))];
  const counts = new Map<string, number>();
  for (const k of [...uniq].sort((a, b) => b.replace(/\s+/g, "").length - a.replace(/\s+/g, "").length)) {
    const re = pattern(k);
    counts.set(k, text.match(re)?.length ?? 0);
    text = text.replace(re, "\u0000");
  }
  return counts;
}

export interface KeywordOveruse {
  where: "제목" | "본문";
  keyword: string;
  count: number;
}

/** 제목·본문에서 허용 횟수(KEYWORD_LIMIT)를 넘게 쓴 키워드 */
export function keywordOveruse(post: Pick<Post, "title" | "blocks" | "mainKeyword" | "subKeywords">): KeywordOveruse[] {
  const keywords = [post.mainKeyword ?? "", ...(post.subKeywords ?? [])];
  const out: KeywordOveruse[] = [];
  for (const [where, text, limit] of [
    ["제목", post.title, KEYWORD_LIMIT.title],
    ["본문", bodyTexts(post).join("\n").replace(/\*\*/g, ""), KEYWORD_LIMIT.body],
  ] as const) {
    for (const [keyword, count] of countKeywords(text, keywords)) if (count > limit) out.push({ where, keyword, count });
  }
  return out;
}
