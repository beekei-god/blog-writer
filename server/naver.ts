import { sleep } from "./fsutil";

/** 네이버 검색 자동완성 (공개 엔드포인트). 실패하면 빈 배열을 돌려준다. */
export async function naverAutocomplete(query: string): Promise<string[]> {
  const url =
    "https://ac.search.naver.com/nx/ac?con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100&q=" +
    encodeURIComponent(query);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: [string, string][][] };
    return (data.items?.[0] ?? []).map((it) => it[0]).filter((s) => s && s !== query);
  } catch {
    return [];
  }
}

/**
 * 긴 롱테일 키워드는 자동완성이 거의 없으므로, 뒤 단어를 하나씩 떼어 낸 짧은 형태(2단어까지)도 함께 조회한다.
 * 예: "근로장려금 기한 후 신청 12월 1일" → "... 12월", "근로장려금 기한 후 신청", ... "근로장려금 기한"
 */
function expandQueries(keyword: string): string[] {
  const words = keyword.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let n = words.length; n >= Math.min(2, words.length); n--) out.push(words.slice(0, n).join(" "));
  return out;
}

/** 여러 키워드의 자동완성을 한 번에 모은다. 결과가 없는 검색어는 빼고 돌려준다. */
async function collectAutocomplete(keywords: string[]): Promise<Record<string, string[]>> {
  const queries = [...new Set(keywords.flatMap(expandQueries))].slice(0, 20);
  const results = await Promise.all(queries.map(async (q) => [q, await naverAutocomplete(q)] as const));
  return Object.fromEntries(results.filter(([, items]) => items.length > 0));
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36";

/**
 * 검색 결과의 "함께 많이 찾는" 검색어 (예전 연관검색어 자리).
 * 공개 API가 아니라 검색 화면 내부 요청이다: 검색 결과 HTML에 들어 있는 요청 주소를 꺼내 다시 호출한다.
 * 네이버가 검색어별로 이 영역을 끄기도 해서(disabled by manager) 빈 배열이 정상일 수 있다.
 */
async function naverRelated(query: string): Promise<string[]> {
  try {
    const page = await fetch(`https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "ko-KR,ko;q=0.9" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!page.ok) return [];
    const html = await page.text();
    const m = /(?:https?:)?\\?\/\\?\/s\.search\.naver\.com\\?\/p\\?\/qra\\?\/[^"'\s]+/.exec(html);
    if (!m) return [];
    let url = m[0].replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
    if (url.startsWith("//")) url = `https:${url}`;

    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Referer: "https://search.naver.com/" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { result?: { contents?: { query?: string }[] } };
    return (data.result?.contents ?? []).map((c) => c.query ?? "").filter((q) => q && q !== query);
  } catch {
    return [];
  }
}

export interface NaverSuggestions {
  autocomplete: Record<string, string[]>;
  /** "함께 많이 찾는" */
  related: Record<string, string[]>;
}


/** 자동완성 + 함께 많이 찾는. 함께 많이 찾는은 검색 페이지를 받아야 해서 키워드 원형만, 천천히 차례로 조회한다. */
export async function collectNaverSuggestions(keywords: string[]): Promise<NaverSuggestions> {
  const autocomplete = await collectAutocomplete(keywords);
  const related: Record<string, string[]> = {};
  for (const q of [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].slice(0, 6)) {
    const items = await naverRelated(q);
    if (items.length) related[q] = items;
    await sleep(500);
  }
  return { autocomplete, related };
}
