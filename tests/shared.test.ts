import { describe, expect, it } from "vitest";
import { classifyImageError } from "../shared/imageErrors";
import { errorText, PLATFORM_LABEL, STATUS_LABEL, statusLabel } from "../shared/labels";
import { countBodyChars, MAX_BODY_CHARS } from "../shared/length";
import { postToText } from "../shared/postHtml";
import {
  aiFor,
  blogIdOf,
  bodyImageKey,
  bodyIndexOf,
  fitStyle,
  imageKey,
  settingsFor,
  type Post,
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
    expect(STATUS_LABEL.scheduled).toBe("예약됨");
    expect(STATUS_LABEL.published).toBe("발행 완료");
    expect(PLATFORM_LABEL.naver).toBe("네이버 블로그");
  });
  it("올리는 중 라벨: 워드프레스는 크롬 작성이 아니다", () => {
    expect(statusLabel({ status: "posting", postingTo: "wordpress" })).toBe("워드프레스 등록 중");
    expect(statusLabel({ status: "posting", postingTo: "naver" })).toBe("크롬 작성 중");
    expect(statusLabel({ status: "posting" })).toBe("크롬 작성 중");
    expect(statusLabel({ status: "posted", postingTo: "wordpress" })).toBe("임시저장 완료");
  });
  it("errorText", () => {
    expect(errorText(new Error("x"))).toBe("x");
    expect(errorText("y")).toBe("y");
  });
});

describe("복사용 텍스트", () => {
  it("소제목 앞 빈 줄, 이미지 자리, 태그는 빈 줄 3개 뒤", () => {
    const post: Pick<Post, "blocks" | "thumbnail" | "tags"> = {
      thumbnail: { prompt: "p", alt: "썸" },
      blocks: [
        { type: "paragraph", text: "**굵게** 문단" },
        { type: "heading", text: "소제목" },
        { type: "image", prompt: "p", alt: "그림" },
        { type: "quote", text: "인용" },
        { type: "list", items: ["a"] },
        { type: "table", headers: ["h1", "h2"], rows: [["1", "2"]] },
      ],
      tags: ["태그 하나", "둘"],
    };
    expect(postToText(post).split("\n")).toEqual([
      "[썸네일]",
      "굵게 문단",
      "",
      "소제목",
      "[이미지 1: 그림]",
      "“인용”",
      "• a",
      "h1\th2",
      "1\t2",
      "",
      "",
      "",
      "#태그하나 #둘",
    ]);
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
    ["뭔지 모를 오류", "unknown"],
    [undefined, "unknown"],
  ] as const)("%s → %s", (msg, kind) => expect(classifyImageError(msg)).toBe(kind));
});
