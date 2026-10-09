import { beforeEach, describe, expect, it, vi } from "vitest";

const claude = vi.hoisted(() => ({ result: { topic: "맛집" } as unknown, calls: [] as { system: string; prompt: string }[], fail: null as Error | null }));
vi.mock("../server/claude", () => ({
  runClaude: vi.fn(async (opts: { system: string; prompt: string }) => {
    claude.calls.push({ system: opts.system, prompt: opts.prompt });
    if (claude.fail) throw claude.fail;
    return claude.result;
  }),
}));

import { CancelledError } from "../server/cancel";
import { matchNaverTopic, NAVER_TOPIC_NAMES, pickNaverTopic } from "../server/naverTopic";
import type { Post } from "../shared/types";

const post: Post = {
  title: "서울 성수동 브런치 맛집 5곳",
  summary: "성수동에서 가 볼 만한 브런치 가게를 모았습니다.",
  tags: ["성수동맛집", "브런치"],
  blocks: [
    { type: "heading", text: "**첫 번째** 가게" },
    { type: "paragraph", text: "본문" },
    { type: "heading", text: "두 번째 가게" },
  ],
};

beforeEach(() => {
  claude.result = { topic: "맛집" };
  claude.calls = [];
  claude.fail = null;
});

describe("네이버 블로그 주제", () => {
  it("목록의 이름과 맞춰 본다 (공백·가운뎃점 모양 차이는 허용)", () => {
    expect(matchNaverTopic("맛집")).toBe("맛집");
    expect(matchNaverTopic(" IT ·컴퓨터 ")).toBe("IT·컴퓨터");
    expect(matchNaverTopic("IT・컴퓨터")).toBe("IT·컴퓨터");
    expect(matchNaverTopic("없는 주제")).toBeNull();
    expect(new Set(NAVER_TOPIC_NAMES).size).toBe(NAVER_TOPIC_NAMES.length);
  });
  it("글의 제목·요약·태그·소제목을 보고 하나를 고른다", async () => {
    const logs: string[] = [];
    expect(await pickNaverTopic(post, "job", (m) => logs.push(m))).toBe("맛집");
    expect(claude.calls[0].prompt).toContain("서울 성수동 브런치 맛집 5곳");
    expect(claude.calls[0].prompt).toContain("성수동맛집, 브런치");
    expect(claude.calls[0].prompt).toContain("첫 번째 가게 / 두 번째 가게");
    expect(claude.calls[0].system).toContain("IT·컴퓨터");
    expect(logs).toEqual(["네이버 주제: 맛집 (글 내용을 보고 정함)"]);
  });
  it("목록에 없는 답이거나 호출이 실패하면 주제 없이 올린다 (null)", async () => {
    claude.result = { topic: "엉뚱한 주제" };
    const logs: string[] = [];
    expect(await pickNaverTopic(post, "job", (m) => logs.push(m))).toBeNull();
    expect(logs[0]).toContain("주제 없이 올립니다");
    claude.fail = new Error("claude 실패");
    expect(await pickNaverTopic(post, "job", (m) => logs.push(m))).toBeNull();
    expect(logs[1]).toContain("claude 실패");
  });
  it("중지는 그대로 전달한다", async () => {
    claude.fail = new CancelledError();
    await expect(pickNaverTopic(post, "job", () => {})).rejects.toBeInstanceOf(CancelledError);
  });
});
