import { createHmac } from "node:crypto";
import type { KeywordRow } from "../shared/types";
import type { SearchAdKeys } from "./secrets";

/**
 * 네이버 검색광고 API의 키워드 도구 (https://naver.github.io/searchad-apidoc/#/tags/RelatedKeyword).
 * 키워드를 넣으면 연관 키워드와 월간 검색량(PC·모바일), 경쟁 정도를 준다. 최근 한 달 기준이고 절대 값이다.
 * - 요청마다 서명이 필요하다: X-Signature = base64(HMAC-SHA256(secretKey, `${timestamp}.${method}.${uri}`)).
 * - hintKeywords는 한 번에 최대 5개이고, 키워드 안의 공백은 허용되지 않는다 (공백을 뺀다).
 * - 검색량이 10 미만이면 숫자 대신 "< 10"이 온다.
 */
/** 시험용으로만 바꾼다 (SEARCHAD_HOST). 평소에는 공식 주소를 쓴다 */
const HOST = process.env.SEARCHAD_HOST || "https://api.searchad.naver.com";
const URI = "/keywordstool";
export const MAX_HINTS = 5;
/** 화면에 돌려주는 연관 키워드 수 (검색량 순). API는 최대 1,000개를 준다 */
export const MAX_ROWS = 200;

export class SearchAdError extends Error {}

interface RawRow {
  relKeyword: string;
  monthlyPcQcCnt: number | string;
  monthlyMobileQcCnt: number | string;
  compIdx?: string;
}

/** 요청 서명 (테스트에서 고정 값으로 확인한다) */
export const sign = (secretKey: string, timestamp: string, method: string, uri: string) =>
  createHmac("sha256", secretKey).update(`${timestamp}.${method}.${uri}`).digest("base64");

/** 검색량 값: 숫자면 그대로, "< 10"이면 5로 치고 low 표시 */
export function parseCount(v: number | string | undefined): { n: number; low: boolean } {
  if (typeof v === "number" && Number.isFinite(v)) return { n: Math.max(0, Math.round(v)), low: false };
  if (typeof v !== "string") return { n: 0, low: false };
  if (/<|미만/.test(v)) return { n: 5, low: true };
  const digits = /\d+/.exec(v.replace(/,/g, ""));
  return { n: digits ? Number(digits[0]) : 0, low: false };
}

const COMPETITION = new Set(["낮음", "중간", "높음"]);

/** 응답을 화면용 줄로: 합계·정렬(검색량 큰 순), 입력한 키워드 표시, 상위 MAX_ROWS개 */
export function toRows(raw: RawRow[], seeds: string[]): KeywordRow[] {
  const seedSet = new Set(seeds.map((s) => s.replace(/\s+/g, "")));
  const rows = raw
    .filter((r) => r && typeof r.relKeyword === "string" && r.relKeyword)
    .map((r): KeywordRow => {
      const pc = parseCount(r.monthlyPcQcCnt);
      const mobile = parseCount(r.monthlyMobileQcCnt);
      return {
        keyword: r.relKeyword,
        total: pc.n + mobile.n,
        pc: pc.n,
        mobile: mobile.n,
        lowPc: pc.low,
        lowMobile: mobile.low,
        competition: COMPETITION.has(r.compIdx ?? "") ? (r.compIdx as KeywordRow["competition"]) : "알 수 없음",
        seed: seedSet.has(r.relKeyword.replace(/\s+/g, "")),
      };
    });
  rows.sort((a, b) => b.total - a.total || a.keyword.localeCompare(b.keyword, "ko"));
  return rows.slice(0, MAX_ROWS);
}

/** 입력을 키워드 목록으로: 쉼표·줄바꿈·가운뎃점·슬래시로 나누고, 공백을 빼고, 중복을 없앤다 (개수는 자르지 않는다) */
export function splitHints(input: string): string[] {
  const out: string[] = [];
  for (const part of input.split(/[,\n·ㆍ/|]+/)) {
    const k = part.replace(/\s+/g, "");
    if (k && !out.includes(k)) out.push(k);
  }
  return out;
}

/** 사용자가 입력한 키워드: 최대 MAX_HINTS개 */
export const parseHints = (input: string) => splitHints(input).slice(0, MAX_HINTS);

async function call(keys: SearchAdKeys, hints: string[]): Promise<RawRow[]> {
  const timestamp = String(Date.now());
  const url = `${HOST}${URI}?${new URLSearchParams({ hintKeywords: hints.join(","), showDetail: "1" })}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": keys.apiKey,
      "X-Customer": keys.customerId,
      "X-Signature": sign(keys.secretKey, timestamp, "GET", URI),
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new SearchAdError(`검색광고 키가 올바르지 않습니다 (${res.status}). 고객 ID·API 키·비밀 키를 확인하세요. ${text.slice(0, 160)}`);
    }
    if (res.status === 429) throw new SearchAdError("검색광고 API 호출 한도를 넘었습니다 (429). 잠시 뒤에 다시 하세요.");
    throw new SearchAdError(`검색광고 API 오류 ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { keywordList?: RawRow[] };
  return body.keywordList ?? [];
}

/** 키가 맞는지 짧게 확인한다 (키워드 하나 조회). */
export async function testSearchAd(keys: SearchAdKeys): Promise<void> {
  await call(keys, ["날씨"]);
}

/**
 * 키워드 여러 개의 연관 키워드와 월간 검색량. 한 번에 MAX_HINTS개씩 나눠 조회하고 합친다
 * (같은 키워드가 여러 번 나오면 검색량이 큰 쪽을 쓴다). trend가 있으면 그 검색어에는 규모를 붙인다.
 */
export async function lookupKeywords(keys: SearchAdKeys, seeds: string[], trend: Map<string, string> = new Map()): Promise<KeywordRow[]> {
  const merged = new Map<string, RawRow>();
  for (let i = 0; i < seeds.length; i += MAX_HINTS) {
    for (const r of await call(keys, seeds.slice(i, i + MAX_HINTS))) {
      const key = r?.relKeyword?.replace(/\s+/g, "");
      if (!key) continue;
      const prev = merged.get(key);
      const total = (x: RawRow) => parseCount(x.monthlyPcQcCnt).n + parseCount(x.monthlyMobileQcCnt).n;
      if (!prev || total(r) > total(prev)) merged.set(key, r);
    }
  }
  return toRows([...merged.values()], seeds).map((r) => {
    const t = trend.get(r.keyword.replace(/\s+/g, ""));
    return t ? { ...r, trend: t } : r;
  });
}

