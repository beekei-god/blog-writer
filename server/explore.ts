import type { KeywordSection } from "../shared/types";
import { errorText } from "../shared/labels";
import { listRecommendations } from "./recommend";
import { getSearchAdKeys, type SearchAdKeys } from "./secrets";
import { lookupKeywords, parseHints, SearchAdError, splitHints } from "./searchad";
import { fetchTrending } from "./trends";

/** 입력이 없을 때 지금 뜨는 검색어에서 조회할 개수 (검색광고는 5개씩 나눠 부르므로 두 번) */
export const TRENDING_LIMIT = 10;
/** 입력이 없을 때 살펴볼 최근 주제 추천 기록 수 */
export const RECOMMENDATION_LIMIT = 3;
/** 주제 추천에서 뽑은 기준 키워드 최대 개수 */
const RECOMMENDATION_SEEDS = 5;

/**
 * 키워드 탐색.
 * - 키워드를 입력했으면 그 키워드(최대 5개)의 연관 키워드.
 * - 입력이 없으면 ① 지금 뜨는 검색어(구글 트렌드)와 ② 최근 주제 추천의 분야·기준 키워드를 기준으로 각각 찾는다.
 * 검색광고 키가 없으면 null (호출한 쪽에서 "미설정"으로 처리).
 */
export async function exploreKeywords(input: string): Promise<{ sections: KeywordSection[] } | null> {
  const keys = await getSearchAdKeys();
  if (!keys) return null;
  const typed = parseHints(input);
  if (typed.length) {
    return { sections: [{ id: "input", title: "입력한 키워드", seeds: typed, rows: await lookupKeywords(keys, typed) }] };
  }
  return { sections: await exploreWithoutInput(keys) };
}

async function exploreWithoutInput(keys: SearchAdKeys): Promise<KeywordSection[]> {
  const sections: KeywordSection[] = [];

  // ① 지금 뜨는 검색어 (구글 트렌드)
  let trendTerms: { term: string; traffic?: string }[] = [];
  let trendError: string | undefined;
  try {
    trendTerms = (await fetchTrending()).slice(0, TRENDING_LIMIT);
  } catch (e) {
    trendError = errorText(e);
  }
  const trendSeeds = [...new Set(trendTerms.flatMap((t) => splitHints(t.term)))];
  const traffic = new Map(trendTerms.map((t) => [t.term.replace(/\s+/g, ""), t.traffic ?? ""] as const).filter(([, v]) => v));
  // 구글 트렌드를 못 가져온 것은 이 덩어리만 오류로 보여 준다. 검색광고 키 오류·호출 한도는 전체 오류로 위로 던진다.
  sections.push(
    trendError
      ? { id: "trending", title: "지금 뜨는 검색어", seeds: [], rows: [], error: trendError }
      : {
          id: "trending",
          title: "지금 뜨는 검색어",
          note: "구글 트렌드의 오늘 급상승 검색어(한국)를 기준으로 네이버 월간 검색량을 봅니다.",
          seeds: trendSeeds,
          rows: await lookupKeywords(keys, trendSeeds, traffic),
        },
  );

  // ② 최근 주제 추천의 분야·기준 키워드
  const recs = (await listRecommendations()).filter((r) => r.status === "done").slice(0, RECOMMENDATION_LIMIT);
  const recSeeds = [...new Set(recs.flatMap((r) => splitHints(r.anchorKeyword || r.field)))].slice(0, RECOMMENDATION_SEEDS);
  if (recSeeds.length) {
    sections.push({
      id: "recommendation",
      title: "최근 주제 추천의 분야",
      note: `최근 주제 추천(${recs.map((r) => r.field).join(", ")})의 분야·기준 키워드를 기준으로 찾습니다.`,
      seeds: recSeeds,
      rows: await lookupKeywords(keys, recSeeds),
    });
  }
  if (!trendTerms.length && !recSeeds.length) {
    // 둘 다 기준이 없다: 구글 트렌드 오류만으로는 알 수 없으니 이유를 분명히 알려 준다
    throw new SearchAdError(`입력한 키워드가 없고 탐색할 기준도 없습니다. 키워드를 입력하거나, 주제 추천을 한 번 해 보세요.${trendError ? ` (지금 뜨는 검색어: ${trendError})` : ""}`);
  }
  return sections;
}
