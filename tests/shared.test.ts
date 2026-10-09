import { describe, expect, it } from "vitest";
import { classifyImageError } from "../shared/imageErrors";
import { blockText, collapseSame, diffBlocks } from "../shared/blockDiff";
import { errorText, PLATFORM_LABEL, STATUS_LABEL, statusLabel } from "../shared/labels";
import { countBodyChars, MAX_BODY_CHARS } from "../shared/length";
import {
  aiFor,
  blogIdOf,
  bodyImageKey,
  bodyIndexOf,
  fitStyle,
  imageKey,
  methodFor,
  settingsFor,
  type PostBlock,
  type Settings,
} from "../shared/types";

const settings = (s: Partial<Settings> = {}): Settings => ({
  images: { thumbnail: true, bodyImages: 0, provider: "claude", style: "flat" },
  models: { research: "opus", writing: "opus", images: "sonnet", browser: "sonnet", recommend: "sonnet" },
  ...s,
});

describe("본문 글자수 (BR: 3,000자 상한)", () => {
  it("공백은 세고 줄바꿈·굵게 표시·이미지는 세지 않는다", () => {
    const n = countBodyChars({
      blocks: [
        { type: "heading", text: "**소제목**" }, // 3
        { type: "paragraph", text: "가 나\n다" }, // "가 나다" = 4
        { type: "image", prompt: "p", alt: "a" },
        { type: "list", items: ["ab", "c"] }, // 3
        { type: "table", headers: ["h"], rows: [["1", "22"]] }, // 4
      ],
    });
    expect(n).toBe(3 + 4 + 3 + 4);
  });

  it("'참고 자료' 소제목부터는 세지 않는다", () => {
    expect(
      countBodyChars({ blocks: [{ type: "paragraph", text: "본문" }, { type: "heading", text: "참고 자료" }, { type: "paragraph", text: "아주 긴 출처 목록" }] }),
    ).toBe(2);
  });

  it("이모지는 한 글자로 센다", () => {
    expect(countBodyChars({ blocks: [{ type: "paragraph", text: "👍🏻a" }] })).toBe(3);
  });

  it("상한은 3,000자", () => expect(MAX_BODY_CHARS).toBe(3000));
});

describe("블로그별 설정", () => {
  const s = settings({ naverBlogId: " nav ", tistoryBlogId: "tis", wordpressUrl: "https://wp.example" });
  it("블로그마다 따로 저장한 값을 고른다", () => {
    expect(blogIdOf(s, "naver")).toBe("nav");
    expect(blogIdOf(s, "tistory")).toBe("tis");
    expect(blogIdOf(s, "wordpress")).toBe("https://wp.example");
    expect(blogIdOf(settings(), "naver")).toBe("");
  });
  it("settingsFor는 고른 블로그와 그 ID를 채운다", () => {
    expect(settingsFor(s, "tistory")).toMatchObject({ platform: "tistory", blogId: "tis", naverBlogId: " nav " });
  });
});

describe("이미지 AI·스타일", () => {
  it("Claude는 플랫만, 다른 AI는 고른 스타일 유지", () => {
    expect(fitStyle("claude", "ghibli")).toBe("flat");
    expect(fitStyle("gemini", "anime")).toBe("anime");
  });
  it("썸네일 설정이 없으면 본문 이미지 설정을 따른다", () => {
    const o = { thumbnail: true, bodyImages: 2, provider: "gemini" as const, style: "ghibli" as const };
    expect(aiFor(o, "thumbnail")).toEqual({ provider: "gemini", style: "ghibli" });
    expect(aiFor({ ...o, thumbnailProvider: "claude" }, "thumbnail")).toEqual({ provider: "claude", style: "flat" });
    expect(aiFor({ ...o, thumbnailStyle: "realistic" }, "body")).toEqual({ provider: "gemini", style: "ghibli" });
  });
  it("썸네일 만드는 방법이 없으면 본문 이미지 방법을, 둘 다 없으면 api를 쓴다", () => {
    const o = { thumbnail: true, bodyImages: 2, provider: "gemini" as const, style: "flat" as const };
    expect(methodFor(o, "body")).toBe("api");
    expect(methodFor(o, "thumbnail")).toBe("api");
    expect(methodFor({ ...o, method: "chrome" }, "thumbnail")).toBe("chrome");
    expect(methodFor({ ...o, thumbnailMethod: "chrome" }, "body")).toBe("api");
  });
  it("이미지 키", () => {
    expect(bodyImageKey(3)).toBe("body-3");
    expect(imageKey({ kind: "thumbnail" })).toBe("thumbnail");
    expect(imageKey({ kind: "body", index: 2 })).toBe("body-2");
    expect(bodyIndexOf("body-12")).toBe(12);
    expect(bodyIndexOf("thumbnail")).toBeNull();
    expect(bodyIndexOf("body-x")).toBeNull();
    expect(bodyIndexOf("body-1/../x")).toBeNull();
  });
});

describe("라벨", () => {
  it("상태·블로그 이름", () => {
    expect(STATUS_LABEL.scheduled).toBe("블로그 발행 예약");
    expect(STATUS_LABEL.published).toBe("블로그 발행완료");
    expect(PLATFORM_LABEL.naver).toBe("네이버 블로그");
  });
  it("올리는 중 라벨: 올리는 블로그와 관계없이 단계 이름과 같다", () => {
    expect(statusLabel({ status: "posting", postingTo: "wordpress" })).toBe("블로그 임시저장 중");
    expect(statusLabel({ status: "posting", postingTo: "naver" })).toBe("블로그 임시저장 중");
    expect(statusLabel({ status: "posting" })).toBe("블로그 임시저장 중");
    expect(statusLabel({ status: "posted", postingTo: "wordpress" })).toBe("블로그 임시저장 완료");
  });
  it("errorText", () => {
    expect(errorText(new Error("x"))).toBe("x");
    expect(errorText("y")).toBe("y");
  });
});

describe("이미지 오류 분류", () => {
  it.each([
    ["Claude in Chrome extension is not connected", "extension"],
    ["Gemini 로그인이 필요합니다", "login"],
    ["usage limit reached", "limit"],
    ["I can't create that image due to policy", "refused"],
    ["Target page, context or browser has been closed", "browser_closed"],
    ["Timeout 30000ms exceeded", "ui_changed"],
    ['Gemini에서 이미지를 만들지 못했습니다: Gemini에 요청을 입력하고 보내기를 여러 번 눌렀지만 "문제가 발생했습니다 (1155)" 오류가 나서 이미지가 생성되지 않았고, 탭은 닫았습니다.', "site_error"],
    ["ChatGPT: Something went wrong while generating the response.", "site_error"],
    ["뭔지 모를 오류", "unknown"],
    [undefined, "unknown"],
  ] as const)("%s → %s", (msg, kind) => expect(classifyImageError(msg)).toBe(kind));
});

describe("글 고치기 비교", () => {
  const p = (text: string): PostBlock => ({ type: "paragraph", text });
  it("고친 블록만 del·add로 나오고 나머지는 그대로다", () => {
    const rows = diffBlocks([p("a"), p("b"), p("c")], [p("a"), p("b2"), p("c")]);
    expect(rows.map((r) => r.kind)).toEqual(["same", "del", "add", "same"]);
    expect((rows[1].block as { text: string }).text).toBe("b");
    expect((rows[2].block as { text: string }).text).toBe("b2");
  });
  it("블록을 더하거나 빼면 그것만 add·del이다", () => {
    expect(diffBlocks([p("a"), p("c")], [p("a"), p("b"), p("c")]).map((r) => r.kind)).toEqual(["same", "add", "same"]);
    expect(diffBlocks([p("a"), p("b"), p("c")], [p("a"), p("c")]).map((r) => r.kind)).toEqual(["same", "del", "same"]);
    expect(diffBlocks([], [p("a")]).map((r) => r.kind)).toEqual(["add"]);
  });
  it("바뀌지 않은 블록이 길게 이어지면 접는다", () => {
    const rows = diffBlocks([p("1"), p("2"), p("3"), p("4"), p("5"), p("6"), p("7")], [p("1"), p("2"), p("3"), p("4"), p("5"), p("6"), p("X")]);
    const out = collapseSame(rows);
    expect(out.map((r) => r.kind)).toEqual(["skip", "same", "del", "add"]);
    expect(out[0]).toEqual({ kind: "skip", count: 5 });
    expect(collapseSame(diffBlocks([p("1")], [p("2")])).map((r) => r.kind)).toEqual(["del", "add"]);
  });
  it("블록을 글로 보여 준다 (이미지는 파일 대신 대체 텍스트)", () => {
    expect(blockText({ type: "heading", text: "제목" })).toBe("## 제목");
    expect(blockText({ type: "list", items: ["a", "b"] })).toBe("• a\n• b");
    expect(blockText({ type: "table", headers: ["h1", "h2"], rows: [["1", "2"]] })).toBe("h1 | h2\n1 | 2");
    expect(blockText({ type: "image", prompt: "p", alt: "그림", file: "x.png" })).toBe("[이미지: 그림]");
  });
});
