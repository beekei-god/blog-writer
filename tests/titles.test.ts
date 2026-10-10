import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const claude = vi.hoisted(() => ({ result: null as unknown, calls: [] as { system: string; prompt: string }[] }));
vi.mock("../server/claude", () => ({
  runClaude: vi.fn(async (opts: { system: string; prompt: string }) => {
    claude.calls.push(opts);
    return claude.result;
  }),
}));

import { createApp } from "../server/app";
import { createJob, getJob, updateJob } from "../server/store";
import { regenerateTitles } from "../server/titles";
import type { Post } from "../shared/types";

const post = (): Post => ({
  title: "지금 제목",
  summary: "요약",
  tags: [],
  titleCandidates: ["지금 제목", "예전 후보"],
  mainKeyword: "메인키워드",
  blocks: [{ type: "paragraph", text: "본문 문장" }, { type: "image", prompt: "그림 설명", alt: "" }],
});
const base = { topic: "주제", rules: "제목 규칙", today: "2026.10.10", jobId: "j" };

beforeEach(() => {
  claude.result = null;
  claude.calls = [];
});

describe("제목 후보 다시 만들기", () => {
  it("규칙·지금 제목·예전 후보·본문을 보여 주고, 굵게 표시와 중복을 빼고 3개까지 받는다", async () => {
    claude.result = { titleCandidates: ["**새 제목 1**", "새 제목 2", "새 제목 2", " 새 제목 3 ", "새 제목 4"] };
    expect(await regenerateTitles({ ...base, post: post() })).toEqual(["새 제목 1", "새 제목 2", "새 제목 3"]);
    const { system, prompt } = claude.calls[0];
    expect(system).toContain("제목 규칙");
    expect(prompt).toContain("지금 제목: 지금 제목");
    expect(prompt).toContain("예전 후보: 지금 제목 / 예전 후보");
    expect(prompt).toContain("메인 키워드: 메인키워드");
    expect(prompt).toContain("본문 문장");
    expect(prompt).not.toContain("그림 설명"); // 이미지는 보여 주지 않는다
  });
  it("후보가 하나도 없으면 오류", async () => {
    claude.result = { titleCandidates: [" ", ""] };
    await expect(regenerateTitles({ ...base, post: post() })).rejects.toThrow("제목 후보를 만들지 못했습니다");
  });
});

describe("제목 후보 다시 만들기 (요청)", () => {
  let server: Server;
  let url = "";
  beforeAll(async () => {
    server = createApp().listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));
  const call = async (path: string) => {
    const res = await fetch(url + path, { method: "POST" });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  it("초안이 없으면 거절하고, 있으면 새 후보만 돌려준다 (글은 그대로, 작업의 글쓰기 규칙 사본을 쓴다)", async () => {
    const job = await createJob("주제", { thumbnail: false, bodyImages: 0, provider: "claude", style: "flat" });
    expect((await call(`/api/jobs/${job.id}/titles`)).body.error).toBe("초안이 없습니다.");
    await updateJob(job.id, (j) => {
      j.status = "draft_ready";
      j.post = post();
      j.rulesSnapshot = "이 글에 쓴 규칙";
    });
    claude.result = { titleCandidates: ["새 제목 1", "새 제목 2", "새 제목 3"] };
    const r = await call(`/api/jobs/${job.id}/titles`);
    expect(r).toEqual({ status: 200, body: { titleCandidates: ["새 제목 1", "새 제목 2", "새 제목 3"] } });
    expect(claude.calls[0].system).toContain("이 글에 쓴 규칙");
    const saved = (await getJob(job.id))!;
    expect(saved.post).toEqual(post());
    expect(saved.logs.at(-1)?.message).toContain("제목 후보를 다시 만들었습니다");
  });
});
