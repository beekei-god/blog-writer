import type { InterestStat } from "../shared/types";
import { getNaverKeys, type NaverKeys } from "./secrets";

/**
 * NAVER API HUB 검색어 트렌드 API (https://api.ncloud-docs.com/docs/naver-api-hub-search-trend)
 * - 네이버 클라우드 플랫폼(NCP) Application의 Client ID/Secret을 쓴다. 개발자센터 키(openapi.naver.com)와는 다른 키다.
 * - 값은 "요청에 넣은 그룹 중 최댓값 = 100"인 상대값이라 요청끼리 바로 비교할 수 없다.
 * - 그래서 모든 요청에 같은 기준 키워드(anchor)를 넣고, 기준 키워드의 평균을 100으로 맞춰 환산한다.
 * - 한 요청에 그룹 최대 5개 → 기준 1개 + 후보 4개씩 나눠 보낸다. 하루 호출 한도 1,000회.
 */
const ENDPOINT = "https://naverapihub.apigw.ntruss.com/search-trend/v1/search";
const PER_REQUEST = 4;

export class DatalabError extends Error {}

interface DatalabResponse {
  results: { title: string; data: { period: string; ratio: number }[] }[];
}

function dateRange(days: number) {
  // 데이터랩은 전날까지 집계된다. 한국 시간 기준 어제를 끝날로 쓴다.
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
  const end = new Date(Date.now() - 24 * 3600_000);
  const start = new Date(end.getTime() - (days - 1) * 24 * 3600_000);
  const dates: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 3600_000) dates.push(fmt(new Date(t)));
  return { start: fmt(start), end: fmt(end), dates };
}

async function call(keys: NaverKeys, body: unknown): Promise<DatalabResponse> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": keys.clientId,
      "X-NCP-APIGW-API-KEY": keys.clientSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) throw new DatalabError(`데이터랩 키가 올바르지 않습니다 (401). NCP API HUB의 Client ID/Secret을 확인하세요. ${text.slice(0, 200)}`);
    if (res.status === 403) throw new DatalabError("데이터랩 API 사용 권한이 없습니다 (403). NCP 콘솔에서 Application에 '검색어 트렌드' API 사용을 설정했는지 확인하세요.");
    if (res.status === 429) throw new DatalabError("데이터랩 하루 호출 한도를 넘었습니다 (429).");
    throw new DatalabError(`데이터랩 오류 ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as DatalabResponse;
}

/** 키가 맞는지 짧게 확인한다. */
export async function testDatalab(keys: NaverKeys): Promise<void> {
  const { start, end } = dateRange(7);
  await call(keys, { startDate: start, endDate: end, timeUnit: "date", keywordGroups: [{ groupName: "t", keywords: ["날씨"] }] });
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * 후보 하나의 관심도: 기준 키워드 평균을 100으로 환산한 일별 값, 그 평균(level),
 * 최근 7일이 그 전보다 몇 % 늘었는지(momentum). anchorMean은 0보다 커야 한다.
 */
export function interestStat(raw: number[], anchorMean: number): InterestStat {
  const scale = 100 / anchorMean;
  const s = raw.map((v) => Math.round(v * scale * 10) / 10);
  const recent = avg(s.slice(-7));
  const before = avg(s.slice(0, -7));
  return {
    level: Math.round(avg(s) * 10) / 10,
    momentum: before > 0 ? Math.round((recent / before - 1) * 100) : recent > 0 ? 100 : 0,
    series: s,
  };
}

export interface InterestInput {
  id: string;
  keywords: string[];
}

/**
 * 후보마다 기준 키워드 대비 검색 관심도를 구한다.
 * 키가 없으면 null (호출하는 쪽에서 "미설정"으로 처리).
 */
export async function compareInterest(
  anchor: string,
  items: InterestInput[],
  days = 28,
): Promise<{ period: { start: string; end: string }; stats: Record<string, InterestStat> } | null> {
  const keys = await getNaverKeys();
  if (!keys) return null;
  const { start, end, dates } = dateRange(days);
  const stats: Record<string, InterestStat> = {};

  for (let i = 0; i < items.length; i += PER_REQUEST) {
    const batch = items.slice(i, i + PER_REQUEST);
    const res = await call(keys, {
      startDate: start,
      endDate: end,
      timeUnit: "date",
      keywordGroups: [
        { groupName: "__anchor__", keywords: [anchor] },
        ...batch.map((b) => ({ groupName: b.id, keywords: b.keywords.slice(0, 20) })),
      ],
    });
    // 값이 0인 날은 응답에서 빠지므로 날짜별로 채운다.
    const series = (title: string) => {
      const m = new Map((res.results.find((r) => r.title === title)?.data ?? []).map((d) => [d.period, d.ratio]));
      return dates.map((d) => m.get(d) ?? 0);
    };
    const anchorMean = avg(series("__anchor__"));
    // 기준 키워드 검색량이 0이면 환산할 수 없고 다른 묶음과 비교할 수도 없다. 이 묶음의 후보는 관심도를 비워 둔다.
    if (anchorMean <= 0) continue;
    for (const b of batch) stats[b.id] = interestStat(series(b.id), anchorMean);
  }
  return { period: { start, end }, stats };
}
