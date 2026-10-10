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

  it("고른 말투와 문장 끝이 어긋나면 말투만 고쳐 한 번 다시 쓴다", async () => {
    const sentences = (end: string) => ["접수는 하루", "대상은 세대주", "서류는 미리 준비", "결과는 다음 주 발표", "문의는 콜센터", "일정을 꼭 확인"].map((x) => x + end);
    const withBody = (end: string) => ({ ...postOf(0), blocks: [{ type: "paragraph", text: sentences(end).join("\n") }] });
    claude.results.push(withBody("해요."), withBody("합니다."));
    const progress: string[] = [];
    const post = await writePost(input({ targetChars: 2500, tone: "info" }), (m) => progress.push(m));
    expect(claude.calls).toHaveLength(2);
    expect(claude.calls[1].prompt).toContain("선택한 말투(정보형)와 맞지 않습니다");
    expect(claude.calls[1].prompt).toContain("합니다체(~니다) 문장이 0%뿐입니다");
    expect(progress.some((m) => m.includes("말투가 정보형과 다릅니다"))).toBe(true);
    expect((post.blocks[0] as { text: string }).text).toContain("합니다.");
  });
  it("말투가 맞으면 다시 쓰지 않고, 말투를 고르지 않은 작업은 검사하지 않는다", async () => {
    const body = (end: string) => ({ ...postOf(0), blocks: [{ type: "paragraph", text: ["가", "나", "다", "라", "마", "바"].map((x) => `${x}는 중요${end}`).join("\n") }] });
    claude.results.push(body("합니다."));
    await writePost(input({ targetChars: 2500, tone: "info" }));
    expect(claude.calls).toHaveLength(1);
    claude.calls = [];
    claude.results.push(body("해요."));
    await writePost(input()); // 말투 없음
    expect(claude.calls).toHaveLength(1);
  });
  it("글 쓰기 요청 끝에 말투 확인이 붙고, 지시에 문장 끝 규칙과 예시가 들어 있다", async () => {
    claude.results.push(postOf(2500));
    await writePost(input({ targetChars: 2500, tone: "friendly" }));
    const { system, prompt } = claude.calls[0];
    expect(prompt).toContain("## 말투 최종 확인 (친근형)");
    expect(system).toContain("'요'로 끝나야 하고");
    expect(system).toContain("가장 중요한 요구입니다");
  });
});
