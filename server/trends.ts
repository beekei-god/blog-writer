/**
 * 지금 뜨는 검색어: 구글 트렌드의 한국 일일 급상승 검색어 (공개 RSS, 키 필요 없음).
 * 네이버에는 공개된 인기 검색어가 없어(실시간 검색어 서비스 종료) 구글 기준으로 대신한다. 한국 블로그 분야와 맞지 않는 검색어(스포츠 경기 등)도 섞인다.
 */
/** 시험용으로만 바꾼다 (TRENDS_URL). 평소에는 공식 주소를 쓴다 */
const URL_KR = process.env.TRENDS_URL || "https://trends.google.com/trending/rss?geo=KR";
/** 가져온 목록을 이 시간 동안 다시 쓴다 (자주 눌러도 구글을 계속 부르지 않게) */
const CACHE_MS = 10 * 60_000;

export interface TrendingTerm {
  term: string;
  /** 구글이 알려 주는 대략의 검색 규모 ("200+", "10000+") */
  traffic?: string;
}

export class TrendsError extends Error {}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'" };
const decode = (s: string) =>
  s
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();

/** RSS에서 항목마다 첫 <title>(검색어)과 <ht:approx_traffic>을 읽는다. 항목 안의 뉴스 제목은 <ht:news_item_title>이라 섞이지 않는다 */
export function parseTrending(xml: string): TrendingTerm[] {
  const out: TrendingTerm[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = /<title>([\s\S]*?)<\/title>/.exec(m[1]);
    const term = title ? decode(title[1]) : "";
    if (!term || out.some((o) => o.term === term)) continue;
    const traffic = /<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/.exec(m[1]);
    out.push({ term, ...(traffic && decode(traffic[1]) ? { traffic: decode(traffic[1]) } : {}) });
  }
  return out;
}

let cache: { at: number; terms: TrendingTerm[] } | null = null;

/** 지금 뜨는 검색어. 실패하면 TrendsError (호출한 쪽이 그 덩어리만 오류로 보여 준다) */
export async function fetchTrending(now = Date.now()): Promise<TrendingTerm[]> {
  if (cache && now - cache.at < CACHE_MS) return cache.terms;
  let xml: string;
  try {
    const res = await fetch(URL_KR, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new TrendsError(`구글 트렌드가 ${res.status}로 응답했습니다.`);
    xml = await res.text();
  } catch (e) {
    if (e instanceof TrendsError) throw e;
    throw new TrendsError(`구글 트렌드에 연결하지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
  }
  const terms = parseTrending(xml);
  if (!terms.length) throw new TrendsError("구글 트렌드에서 검색어를 읽지 못했습니다 (형식이 바뀌었을 수 있습니다).");
  cache = { at: now, terms };
  return terms;
}

/** 시험에서 캐시를 비운다 */
export const clearTrendingCache = () => {
  cache = null;
};
