import { describe, expect, it } from "vitest";
import { countKeywords, keywordOveruse } from "../shared/keywords";

describe("키워드 횟수", () => {
  it("띄어쓰기·대소문자를 무시하고, 긴 키워드 안의 짧은 키워드는 따로 세지 않는다", () => {
    const counts = countKeywords("전기차 보조금 신청 방법과 전기차보조금 정리, EV 혜택", ["전기차 보조금", "전기차 보조금 신청 방법", "ev"]);
    expect(counts.get("전기차 보조금 신청 방법")).toBe(1);
    expect(counts.get("전기차 보조금")).toBe(1);
    expect(counts.get("ev")).toBe(1);
  });

  it("제목은 1번, 본문은 2번을 넘긴 키워드만 알린다 (참고 자료와 이미지는 빼고 센다)", () => {
    const post = {
      title: "전기차 보조금 2027 전기차 보조금 정리",
      mainKeyword: "전기차 보조금",
      subKeywords: ["보조금 신청"],
      blocks: [
        { type: "paragraph" as const, text: "**전기차 보조금**은 내년에 바뀝니다." },
        { type: "list" as const, items: ["전기차 보조금 대상", "보조금 신청 기간", "전기차 보조금 금액"] },
        { type: "image" as const, prompt: "p", alt: "전기차 보조금" },
        { type: "heading" as const, text: "참고 자료" },
        { type: "paragraph" as const, text: "전기차 보조금 공고" },
      ],
    };
    expect(keywordOveruse(post)).toEqual([
      { where: "제목", keyword: "전기차 보조금", count: 2 },
      { where: "본문", keyword: "전기차 보조금", count: 3 },
    ]);
    expect(keywordOveruse({ ...post, title: "전기차 보조금 정리", blocks: post.blocks.slice(0, 1).concat({ type: "paragraph" as const, text: "전기차 보조금 대상" }) })).toEqual([]);
  });
});
