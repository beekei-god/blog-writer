import { describe, expect, it, vi } from "vitest";

const claude = vi.hoisted(() => ({ calls: [] as { system: string; prompt: string }[] }));
vi.mock("../server/claude", () => ({
  runClaude: vi.fn(async (opts: { system: string; prompt: string }) => {
    claude.calls.push(opts);
    return { images: [] };
  }),
}));

import { planImages } from "../server/images/plan";
import { BODY_HEADLINE_RULE, THUMBNAIL_HEADLINE_RULE, THUMBNAIL_SCENE_RULE } from "../server/writer";

describe("이미지 기획 프롬프트", () => {
  it("썸네일 문구·장면과 본문 이미지 문구는 글 작성과 같은 지시를 쓴다", async () => {
    const post = { title: "제목", summary: "요약", tags: [], blocks: [{ type: "paragraph" as const, text: "본문" }] };
    await planImages(post, "claude", "flat", [{ key: "thumbnail", kind: "thumbnail", prompt: "p" }], "job");
    const { system, prompt } = claude.calls[0];
    expect(prompt).toContain("사용자가 고른 제목: 제목");
    for (const rule of [THUMBNAIL_HEADLINE_RULE, THUMBNAIL_SCENE_RULE, BODY_HEADLINE_RULE]) expect(system).toContain(rule);
  });
});
