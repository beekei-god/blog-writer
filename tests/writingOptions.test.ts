import { beforeEach, describe, expect, it, vi } from "vitest";

const claude = vi.hoisted(() => ({ results: [] as unknown[], calls: [] as { system: string; prompt: string }[] }));
vi.mock("../server/claude", () => ({
  runClaude: vi.fn(async (opts: { system: string; prompt: string }) => {
    claude.calls.push(opts);
    return claude.results.shift();
  }),
}));

import { writePost, type WriteInput } from "../server/writer";

const NO_IMAGES = { thumbnail: false, bodyImages: 0, provider: "claude" as const, style: "flat" as const };
const input = (writing?: WriteInput["writing"]): WriteInput => ({
  topic: "주제",
  rules: "규칙",
  today: "2026-10-10",
  notes: "노트",
  sources: [],
  searchQuestion: "질문",
  mainKeyword: "메인",
  subKeywords: [],
  autocomplete: {},
  related: {},
  options: NO_IMAGES,
  writing,
});
const postOf = (chars: number) => ({ title: "제목", summary: "요약", blocks: [{ type: "paragraph", text: "가".repeat(chars) }] });

beforeEach(() => {
  claude.results = [];
  claude.calls = [];
});

describe("분량·말투 옵션 (글 작성)", () => {
  it("고른 목표 분량과 말투를 프롬프트에 넣는다", async () => {
    claude.results.push(postOf(4000));
    await writePost(input({ targetChars: 4000, tone: "story" }));
    const { system } = claude.calls[0];
    expect(system).toContain("약 4,000자");
    expect(system).toContain("3,600~4,400자");
    expect(system).toContain("4,800자를 넘기지 마세요");
    expect(system).toContain("스토리형");
    expect(system).toContain("지어내지 말고");
  });

  it("옵션이 없는 예전 작업은 2,500자 목표·3,000자 상한, 말투 지시 없음", async () => {
    claude.results.push(postOf(2500));
    await writePost(input());
    const { system } = claude.calls[0];
    expect(system).toContain("2,300~2,800자");
    expect(system).toContain("3,000자를 넘기지 마세요");
    expect(system).not.toContain("## 말투");
  });

  it("고른 목표의 1.2배를 넘을 때만 줄여 쓰게 한다", async () => {
    claude.results.push(postOf(4500)); // 4,000자 목표의 상한 4,800 이하 → 줄이지 않음
    await writePost(input({ targetChars: 4000, tone: "info" }));
    expect(claude.calls).toHaveLength(1);

    claude.calls = [];
    claude.results.push(postOf(2000), postOf(1500)); // 1,500자 목표의 상한 1,800 초과 → 줄이기
    const progress: string[] = [];
    await writePost(input({ targetChars: 1500, tone: "summary" }), (m) => progress.push(m));
    expect(claude.calls).toHaveLength(2);
    expect(claude.calls[1].prompt).toContain("상한 1,800자");
    expect(claude.calls[1].prompt).toContain("1,500자 안팎");
  });

  it("목표보다 많이 짧으면 로그로 알린다", async () => {
    claude.results.push(postOf(1000));
    const progress: string[] = [];
    await writePost(input({ targetChars: 4000, tone: "friendly" }), (m) => progress.push(m));
    expect(progress.some((m) => m.includes("목표(약 4,000자)보다 짧습니다"))).toBe(true);
  });
});
