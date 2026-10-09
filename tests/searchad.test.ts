import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// .env·셸의 키가 테스트에 섞이지 않게 한다.
for (const k of ["SEARCHAD_CUSTOMER_ID", "SEARCHAD_API_KEY", "SEARCHAD_SECRET_KEY"]) delete process.env[k];

import { createApp } from "../server/app";
import { getSearchAdKeys, saveSearchAdKeys } from "../server/secrets";
import { exploreKeywords } from "../server/explore";
import { MAX_ROWS, parseCount, parseHints, sign, splitHints, toRows } from "../server/searchad";

const realFetch = globalThis.fetch;
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("네이버 검색광고 키워드 도구", () => {
  it("요청 서명: base64(HMAC-SHA256(비밀 키, '타임스탬프.메서드.경로'))", () => {
    // 같은 입력을 Python hmac으로 따로 계산한 값
    expect(sign("secret-key", "1700000000000", "GET", "/keywordstool")).toBe("W36UoKa4A2YA0CeiPcIkr6EEjdpEfLZmO+/k+2kP8CY=");
  });
  it("검색량 값: 숫자, 쉼표 문자열, '< 10'", () => {
    expect(parseCount(1234)).toEqual({ n: 1234, low: false });
    expect(parseCount("1,234")).toEqual({ n: 1234, low: false });
    expect(parseCount("< 10")).toEqual({ n: 5, low: true });
    expect(parseCount(undefined)).toEqual({ n: 0, low: false });
  });
  it("입력을 키워드로: 쉼표·줄바꿈, 공백 제거, 중복 제거, 최대 5개", () => {
    expect(parseHints("청약 일정, 청약일정\n 분양 후기 ,, a,b,c,d,e")).toEqual(["청약일정", "분양후기", "a", "b", "c"]);
    expect(parseHints("  ,, ")).toEqual([]);
    // 가운뎃점·슬래시는 구분자로 본다 (분야 이름이 "청약·부동산" 꼴이다). 개수는 splitHints가 자르지 않는다
    expect(splitHints("청약·부동산 / 재테크|a")).toEqual(["청약", "부동산", "재테크", "a"]);
    expect(splitHints("a,b,c,d,e,f,g")).toHaveLength(7);
  });
  it("응답을 검색량 큰 순으로 정리하고, 입력한 키워드 표시와 경쟁 정도를 붙인다", () => {
    const rows = toRows(
      [
        { relKeyword: "청약 일정", monthlyPcQcCnt: 100, monthlyMobileQcCnt: 900, compIdx: "높음" },
        { relKeyword: "청약통장", monthlyPcQcCnt: "< 10", monthlyMobileQcCnt: 30, compIdx: "낮음" },
        { relKeyword: "청약당첨", monthlyPcQcCnt: 5000, monthlyMobileQcCnt: 15000, compIdx: "이상한값" },
      ],
      ["청약일정"],
    );
    expect(rows.map((r) => r.keyword)).toEqual(["청약당첨", "청약 일정", "청약통장"]);
    expect(rows[0]).toMatchObject({ total: 20000, competition: "알 수 없음", seed: false });
    expect(rows[1]).toMatchObject({ total: 1000, pc: 100, mobile: 900, competition: "높음", seed: true });
    expect(rows[2]).toMatchObject({ total: 35, lowPc: true, lowMobile: false });
  });
  it("돌려주는 줄은 MAX_ROWS개까지", () => {
    const raw = Array.from({ length: MAX_ROWS + 50 }, (_, i) => ({ relKeyword: `k${i}`, monthlyPcQcCnt: i, monthlyMobileQcCnt: 0 }));
    const rows = toRows(raw, []);
    expect(rows).toHaveLength(MAX_ROWS);
    expect(rows[0].keyword).toBe(`k${MAX_ROWS + 49}`);
  });
});

describe("키 저장과 요청", () => {
  let server: Server;
  let base = "";
  const fetchMock = vi.fn<typeof fetch>();
  beforeAll(async () => {
    server = createApp().listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));
  beforeEach(async () => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", (url: string | URL | Request, init?: RequestInit) => (String(url).startsWith("https://api.searchad.naver.com") ? fetchMock(url as string, init) : realFetch(url, init)));
    await saveSearchAdKeys(null);
  });
  const call = (method: string, path: string, body?: unknown) =>
    realFetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
  const KEYS = { customerId: "1234567", apiKey: "api-key-value", secretKey: "secret-key-value" };

  it("키가 없으면 탐색은 안내와 함께 거절, 입력이 비면 400", async () => {
    expect((await call("GET", "/api/keywords?q=청약")).body.error).toBe("먼저 설정에서 네이버 검색광고 API 키를 연결하세요.");
    expect((await call("GET", "/api/keywords")).body.error).toBe("먼저 설정에서 네이버 검색광고 API 키를 연결하세요.");
    expect((await call("GET", "/api/keywords?q=%20")).body.error).toBe("먼저 설정에서 네이버 검색광고 API 키를 연결하세요."); // 비워 둔 탐색도 키가 먼저다
    expect((await call("GET", `/api/keywords?q=${"가".repeat(201)}`)).status).toBe(400);
    expect(await exploreKeywords("청약")).toBeNull();
  });
  it("키를 저장하기 전에 실제로 한 번 호출해 확인하고, 값은 돌려주지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(reply(401, { title: "Unauthorized" }));
    const bad = await call("PUT", "/api/searchad", KEYS);
    expect(bad.status).toBe(400);
    expect(bad.body.error).toContain("검색광고 키가 올바르지 않습니다 (401)");
    expect(await getSearchAdKeys()).toBeNull(); // 저장 안 함

    fetchMock.mockResolvedValueOnce(reply(200, { keywordList: [] }));
    const ok = await call("PUT", "/api/searchad", KEYS);
    expect(ok.body).toEqual({ configured: true, customerIdHint: "123…", fromEnv: false });
    expect(JSON.stringify(ok.body)).not.toContain("secret-key-value");
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(String(url)).toContain("hintKeywords=%EB%82%A0%EC%94%A8");
    const h = init!.headers as Record<string, string>;
    expect(h["X-API-KEY"]).toBe("api-key-value");
    expect(h["X-Customer"]).toBe("1234567");
    expect(h["X-Signature"]).toBe(sign("secret-key-value", h["X-Timestamp"], "GET", "/keywordstool"));

    expect((await call("GET", "/api/searchad")).body.configured).toBe(true);
    expect((await call("DELETE", "/api/searchad")).body.configured).toBe(false);
    expect((await call("PUT", "/api/searchad", { customerId: "1" })).status).toBe(400);
  });
  it("탐색: 키워드를 정리해 보내고 결과를 정렬해 돌려준다, 한도·서버 오류는 알려 준다", async () => {
    await saveSearchAdKeys(KEYS);
    fetchMock.mockResolvedValueOnce(
      reply(200, { keywordList: [{ relKeyword: "청약일정", monthlyPcQcCnt: 10, monthlyMobileQcCnt: 20, compIdx: "중간" }, { relKeyword: "청약", monthlyPcQcCnt: 1000, monthlyMobileQcCnt: 4000, compIdx: "높음" }] }),
    );
    const r = await call("GET", `/api/keywords?q=${encodeURIComponent("청약 일정, 분양")}`);
    expect(r.status).toBe(200);
    expect(r.body.sections).toHaveLength(1);
    expect(r.body.sections[0]).toMatchObject({ id: "input", title: "입력한 키워드", seeds: ["청약일정", "분양"] });
    expect(r.body.sections[0].rows.map((x: { keyword: string }) => x.keyword)).toEqual(["청약", "청약일정"]);
    expect(r.body.sections[0].rows[1].seed).toBe(true);
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("hintKeywords")).toBe("청약일정,분양");

    fetchMock.mockResolvedValueOnce(reply(429, {}));
    expect((await call("GET", "/api/keywords?q=a")).body.error).toContain("호출 한도");
    fetchMock.mockResolvedValueOnce(reply(500, { message: "boom" }));
    const e = await call("GET", "/api/keywords?q=a");
    expect(e.status).toBe(400);
    expect(e.body.error).toContain("검색광고 API 오류 500");
  });
});
