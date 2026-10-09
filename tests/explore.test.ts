import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

for (const k of ["SEARCHAD_CUSTOMER_ID", "SEARCHAD_API_KEY", "SEARCHAD_SECRET_KEY"]) delete process.env[k];

import { createApp } from "../server/app";
import { exploreKeywords, RECOMMENDATION_LIMIT, TRENDING_LIMIT } from "../server/explore";
import { saveSearchAdKeys } from "../server/secrets";
import { DATA_DIR } from "../server/store";
import { clearTrendingCache, fetchTrending, parseTrending, TrendsError } from "../server/trends";

const realFetch = globalThis.fetch;
const reply = (status: number, body: unknown, type = "application/json") =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "Content-Type": type } });

/** 구글 트렌드 RSS 한 항목 (뉴스 항목의 제목은 ht:news_item_title이라 검색어와 섞이면 안 된다) */
const item = (term: string, traffic?: string) => `<item><title>${term}</title>${traffic ? `<ht:approx_traffic>${traffic}</ht:approx_traffic>` : ""}<ht:news_item><ht:news_item_title>뉴스 &quot;제목&quot;</ht:news_item_title></ht:news_item></item>`;
const rss = (...items: string[]) => `<?xml version="1.0"?><rss><channel><title>Daily Search Trends</title>${items.join("")}</channel></rss>`;

describe("지금 뜨는 검색어 (구글 트렌드 RSS)", () => {
  it("항목마다 검색어와 대략의 규모를 읽는다 (채널·뉴스 제목은 빼고, 엔티티는 풀고, 중복은 없앤다)", () => {
    const xml = rss(item("정우성", "200+"), item("lg 대 롯데", "10000+"), item("정우성", "500+"), item("AT&amp;T 요금", ""), item("이름 &#39;작은따옴표&#39;"));
    expect(parseTrending(xml)).toEqual([
      { term: "정우성", traffic: "200+" },
      { term: "lg 대 롯데", traffic: "10000+" },
      { term: "AT&T 요금" },
      { term: "이름 '작은따옴표'" },
    ]);
    expect(parseTrending("<rss></rss>")).toEqual([]);
  });
  it("10분 동안은 다시 가져오지 않고, 실패나 빈 결과는 TrendsError", async () => {
    clearTrendingCache();
    const f = vi.fn<typeof fetch>().mockResolvedValue(reply(200, rss(item("a", "1+")), "text/xml"));
    vi.stubGlobal("fetch", f);
    const t0 = 1_000_000;
    expect(await fetchTrending(t0)).toHaveLength(1);
    expect(await fetchTrending(t0 + 9 * 60_000)).toHaveLength(1);
    expect(f).toHaveBeenCalledTimes(1);
    f.mockResolvedValue(reply(200, rss(item("b")), "text/xml"));
    expect((await fetchTrending(t0 + 11 * 60_000))[0].term).toBe("b");
    expect(f).toHaveBeenCalledTimes(2);

    clearTrendingCache();
    f.mockResolvedValueOnce(reply(503, "x"));
    await expect(fetchTrending()).rejects.toThrow("구글 트렌드가 503");
    f.mockResolvedValueOnce(reply(200, "<rss></rss>", "text/xml"));
    await expect(fetchTrending()).rejects.toBeInstanceOf(TrendsError);
    f.mockRejectedValueOnce(new Error("offline"));
    await expect(fetchTrending()).rejects.toThrow("연결하지 못했습니다: offline");
    vi.unstubAllGlobals();
  });
});

describe("키워드를 입력하지 않았을 때", () => {
  const searchad = vi.fn<(url: string) => Response>();
  const trends = vi.fn<() => Response>();
  const recsDir = path.join(DATA_DIR, "recommendations");
  const rec = (id: string, field: string, anchorKeyword: string | undefined, status: string, createdAt: string) =>
    fs.writeFile(path.join(recsDir, `${id}.json`), JSON.stringify({ id, field, status, createdAt, updatedAt: createdAt, anchorKeyword, datalab: "ok", candidates: [], logs: [] }));
  const hints = (call: number) => new URL(searchad.mock.calls[call][0]).searchParams.get("hintKeywords");
  const volume = (words: string[]) => reply(200, { keywordList: words.map((w, i) => ({ relKeyword: w, monthlyPcQcCnt: 100 + i, monthlyMobileQcCnt: 900, compIdx: "중간" })) });

  beforeEach(async () => {
    searchad.mockReset();
    trends.mockReset();
    clearTrendingCache();
    vi.stubGlobal("fetch", (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.startsWith("https://api.searchad.naver.com")) return Promise.resolve(searchad(u));
      if (u.startsWith("https://trends.google.com")) return Promise.resolve(trends());
      return realFetch(url, init);
    });
    await saveSearchAdKeys({ customerId: "1", apiKey: "k", secretKey: "s" });
    await fs.rm(recsDir, { recursive: true, force: true });
    await fs.mkdir(recsDir, { recursive: true });
  });

  it("지금 뜨는 검색어(상위 10개, 5개씩 두 번)와 최근 주제 추천(완료된 최근 3개의 기준 키워드)을 각각 찾는다", async () => {
    trends.mockReturnValue(reply(200, rss(...Array.from({ length: 12 }, (_, i) => item(`뜨는${i}`, i === 0 ? "500+" : undefined))), "text/xml"));
    await rec("r1", "청약·부동산", "청약일정", "done", "2026-10-01T00:00:00.000Z");
    await rec("r2", "전기차", undefined, "done", "2026-10-02T00:00:00.000Z");
    await rec("r3", "실패한 분야", "x", "failed", "2026-10-03T00:00:00.000Z"); // 완료가 아니면 쓰지 않는다
    await rec("r4", "오래된 분야", "a", "done", "2026-09-01T00:00:00.000Z");
    await rec("r5", "더 오래된", "b", "done", "2026-08-01T00:00:00.000Z"); // 최근 3개를 넘으면 쓰지 않는다
    searchad.mockImplementation((url) => volume(new URL(url).searchParams.get("hintKeywords")!.split(",")));
    const r = (await exploreKeywords(""))!;

    expect(r.sections.map((s) => s.id)).toEqual(["trending", "recommendation"]);
    const [trending, recommendation] = r.sections;
    expect(trending.seeds).toEqual(Array.from({ length: TRENDING_LIMIT }, (_, i) => `뜨는${i}`));
    expect(hints(0)).toBe("뜨는0,뜨는1,뜨는2,뜨는3,뜨는4");
    expect(hints(1)).toBe("뜨는5,뜨는6,뜨는7,뜨는8,뜨는9");
    expect(trending.rows.find((x) => x.keyword === "뜨는0")).toMatchObject({ seed: true, trend: "500+" });
    expect(trending.rows.find((x) => x.keyword === "뜨는1")?.trend).toBeUndefined();
    // 최신 기록부터: r2(전기차, 분야 이름), r1(청약일정, 기준 키워드), r4(a). 완료가 아닌 것과 3개를 넘는 것은 뺀다
    expect(RECOMMENDATION_LIMIT).toBe(3);
    expect(recommendation.seeds).toEqual(["전기차", "청약일정", "a"]);
    expect(recommendation.note).toContain("청약·부동산");
    expect(hints(2)).toBe("전기차,청약일정,a");
    expect(searchad).toHaveBeenCalledTimes(3);
  });
  it("구글 트렌드를 못 가져오면 그 덩어리만 오류로 두고, 주제 추천 쪽은 그대로 보여 준다", async () => {
    trends.mockReturnValue(reply(503, "down"));
    await rec("r1", "청약", "청약일정", "done", "2026-10-01T00:00:00.000Z");
    searchad.mockReturnValue(volume(["청약일정"]));
    const r = (await exploreKeywords(""))!;
    expect(r.sections[0]).toMatchObject({ id: "trending", rows: [], seeds: [] });
    expect(r.sections[0].error).toContain("구글 트렌드가 503");
    expect(r.sections[1]).toMatchObject({ id: "recommendation", seeds: ["청약일정"] });
    expect(r.sections[1].rows).toHaveLength(1);
  });
  it("주제 추천 기록이 없으면 그 덩어리는 만들지 않는다", async () => {
    trends.mockReturnValue(reply(200, rss(item("뜨는검색어")), "text/xml"));
    searchad.mockReturnValue(volume(["뜨는검색어"]));
    expect((await exploreKeywords(""))!.sections.map((s) => s.id)).toEqual(["trending"]);
  });
  it("기준이 하나도 없으면 안내와 함께 거절한다", async () => {
    trends.mockReturnValue(reply(503, "down"));
    await expect(exploreKeywords("")).rejects.toThrow("탐색할 기준도 없습니다");
    expect(searchad).not.toHaveBeenCalled();
  });
  it("검색광고 키 오류나 호출 한도는 덩어리별이 아니라 전체 오류로 알린다", async () => {
    trends.mockReturnValue(reply(200, rss(item("뜨는검색어")), "text/xml"));
    searchad.mockReturnValue(reply(429, {}));
    await expect(exploreKeywords("")).rejects.toThrow("호출 한도");
  });
  it("입력이 있으면 구글 트렌드는 부르지 않는다", async () => {
    searchad.mockReturnValue(volume(["청약"]));
    const r = (await exploreKeywords("청약"))!;
    expect(r.sections.map((s) => s.id)).toEqual(["input"]);
    expect(trends).not.toHaveBeenCalled();
  });

  describe("요청", () => {
    let server: Server;
    let base = "";
    beforeAll(async () => {
      server = createApp().listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    afterAll(() => new Promise((r) => server.close(r)));
    it("GET /api/keywords에 q가 없어도 탐색한다 (sections를 돌려준다)", async () => {
      trends.mockReturnValue(reply(200, rss(item("뜨는검색어", "100+")), "text/xml"));
      searchad.mockReturnValue(volume(["뜨는검색어", "연관"]));
      const res = await realFetch(`${base}/api/keywords`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sections[0]).toMatchObject({ id: "trending", seeds: ["뜨는검색어"] });
      expect(body.sections[0].rows.find((x: { keyword: string }) => x.keyword === "뜨는검색어")).toMatchObject({ seed: true, trend: "100+" });
      trends.mockReturnValue(reply(503, "down"));
      clearTrendingCache();
      const none = await realFetch(`${base}/api/keywords`);
      expect(none.status).toBe(400);
      expect((await none.json()).error).toContain("탐색할 기준도 없습니다");
    });
  });
});
