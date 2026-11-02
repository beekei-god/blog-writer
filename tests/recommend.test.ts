import { beforeEach, describe, expect, it, vi } from "vitest";

const claude = vi.hoisted(() => ({ result: null as unknown, gate: null as Promise<void> | null }));
vi.mock("../server/claude", () => ({
  runClaude: vi.fn(async () => {
    await claude.gate;
    return claude.result;
  }),
}));
vi.mock("../server/naver", () => ({ naverAutocomplete: vi.fn(async () => ["a", "b"]) }));
vi.mock("../server/datalab", async (orig) => ({ ...(await orig<object>()), compareInterest: vi.fn(async () => null) }));

import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "../server/store";
import { isRecommending, listRecommendations, recoverRecommendations, startRecommendation } from "../server/recommend";

const ev = (url: string) => ({ title: "기사", url, kind: "news" as const });
const cand = (topic: string, evidence: ReturnType<typeof ev>[]) => ({ topic, keywords: [topic], reason: "이유", evidence });

async function runField(field: string) {
  const rec = await startRecommendation(field);
  while (isRecommending()) await new Promise((r) => setTimeout(r, 5));
  return (await listRecommendations()).find((r) => r.id === rec.id)!;
}

describe("주제 추천: 근거 있는 후보만", () => {
  beforeEach(() => {
    claude.result = null;
    claude.gate = null;
  });

  it("근거가 없거나 http(s) 링크가 아닌 후보는 버리고 근거 있는 후보만 남긴다", async () => {
    claude.result = {
      anchorKeyword: "기준",
      candidates: [
        cand("근거 있음", [ev("https://news.example/a")]),
        cand("근거 없음", []),
        cand("깨진 링크만", [ev("ftp://x"), ev("not a url")]),
        cand("일부만 유효", [ev("javascript:alert(1)"), ev("http://news.example/b")]),
      ],
    };
    const rec = await runField("테스트 분야");
    expect(rec.status).toBe("done");
    expect(rec.candidates.map((c) => c.topic)).toEqual(["근거 있음", "일부만 유효"]);
    expect(rec.candidates[1].evidence.map((e) => e.url)).toEqual(["http://news.example/b"]);
  });

  it("남는 후보가 없으면 실패로 끝낸다", async () => {
    claude.result = { anchorKeyword: "기준", candidates: [cand("근거 없음", [])] };
    const rec = await runField("빈 분야");
    expect(rec.status).toBe("failed");
    expect(rec.error).toContain("근거가 확인된 후보가 없습니다");
  });
});

describe("주제 추천: 한 번에 하나", () => {
  beforeEach(() => {
    claude.gate = null;
  });

  it("진행 중에는 새 추천을 막고, 끝나면 다시 시작할 수 있다", async () => {
    let open!: () => void;
    claude.gate = new Promise<void>((r) => (open = r));
    claude.result = { anchorKeyword: "기준", candidates: [cand("주제", [ev("https://news.example/a")])] };
    const first = await startRecommendation("분야 하나");
    expect(isRecommending()).toBe(true);
    await expect(startRecommendation("분야 둘")).rejects.toThrow("이미 주제 추천이 진행 중입니다.");
    open();
    while (isRecommending()) await new Promise((r) => setTimeout(r, 5));
    expect((await listRecommendations()).find((r) => r.id === first.id)?.status).toBe("done");
    claude.gate = null;
    await expect(startRecommendation("분야 셋")).resolves.toMatchObject({ status: "running" });
    while (isRecommending()) await new Promise((r) => setTimeout(r, 5));
  });

  it("서버가 재시작되면 진행 중으로 남은 추천은 실패로 정리한다", async () => {
    const dir = path.join(DATA_DIR, "recommendations");
    await fs.mkdir(dir, { recursive: true });
    const now = new Date().toISOString();
    const base = { field: "분야", createdAt: now, updatedAt: now, datalab: "pending", candidates: [], logs: [] };
    await fs.writeFile(path.join(dir, "stuck.json"), JSON.stringify({ ...base, id: "stuck", status: "running" }));
    await fs.writeFile(path.join(dir, "fine.json"), JSON.stringify({ ...base, id: "fine", status: "done" }));
    await recoverRecommendations();
    const byId = Object.fromEntries((await listRecommendations()).map((r) => [r.id, r]));
    expect(byId.stuck).toMatchObject({ status: "failed", error: "서버가 재시작되어 중단되었습니다." });
    expect(byId.fine.status).toBe("done");
  });
});
