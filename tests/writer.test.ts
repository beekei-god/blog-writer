import { describe, expect, it } from "vitest";
import type { Post, PostBlock, TagDetail } from "../shared/types";
import { interestStat } from "../server/datalab";
import { enforceImageOptions, isCompleteTable, stripUpdateLines, verifyTagSources } from "../server/writer";

describe("날짜 표시줄 제거", () => {
  it("짧은 '업데이트: 날짜' 문단만 뺀다", () => {
    const blocks: PostBlock[] = [
      { type: "paragraph", text: "최종 업데이트: 2026.10.04" },
      { type: "paragraph", text: "**작성일** 2026-10-01" },
      { type: "paragraph", text: "2026년 정책이 업데이트되었습니다." },
      { type: "heading", text: "업데이트: 2026.10.04" },
    ];
    expect(stripUpdateLines(blocks).map((b) => ("text" in b ? b.text : ""))).toEqual(["2026년 정책이 업데이트되었습니다.", "업데이트: 2026.10.04"]);
  });
});

describe("표 정리", () => {
  it("빈 칸·'-'·'미정' 행과 칸 수가 다른 행을 뺀다", () => {
    const t = { type: "table" as const, headers: ["a", "b"], rows: [["1", "2"], ["", "x"], ["-", "y"], ["미정", "z"], ["only"]] };
    expect(isCompleteTable(t)).toBe(true);
    expect(t.rows).toEqual([["1", "2"]]);
  });
  it("남은 행이 없으면 표를 뺀다", () => {
    expect(isCompleteTable({ type: "table", headers: ["a"], rows: [["확인 중"]] })).toBe(false);
  });
});

describe("이미지 개수 옵션", () => {
  const post: Post = {
    title: "t",
    summary: "s",
    tags: [],
    thumbnail: { prompt: "thumb", alt: "" },
    blocks: [
      { type: "image", prompt: "1", alt: "" },
      { type: "paragraph", text: "p" },
      { type: "image", prompt: "2", alt: "" },
      { type: "image", prompt: "3", alt: "" },
    ],
  };
  it("앞에서부터 정한 개수만 남기고 썸네일은 옵션대로", () => {
    const out = enforceImageOptions(post, { thumbnail: false, bodyImages: 2, provider: "claude", style: "flat" });
    expect(out.thumbnail).toBeUndefined();
    expect(out.blocks.filter((b) => b.type === "image").map((b) => (b.type === "image" ? b.prompt : ""))).toEqual(["1", "2"]);
    expect(out.blocks).toHaveLength(3);
  });
});

describe("태그 출처 확인", () => {
  const input = { autocomplete: { "제주 여행": ["제주 여행 코스", "제주 여행 경비"] }, related: { 제주: ["제주 맛집"] } };
  it("수집 목록에 있는 표현만 남기고 검색어를 바로잡는다", () => {
    const details: TagDetail[] = [
      { tag: "제주여행코스", source: "자동완성", query: "엉뚱한 검색어" },
      { tag: "제주 맛집", source: "함께 많이 찾는", query: "제주" },
      { tag: "없는태그", source: "자동완성", query: "제주 여행" },
      { tag: "스마트", source: "스마트블록 주제", query: "" },
      { tag: "고유명사", source: "본문 고유명사", query: "" },
    ];
    const { kept, dropped } = verifyTagSources(details, input);
    expect(kept).toEqual([
      { tag: "제주여행코스", source: "자동완성", query: "제주 여행" },
      { tag: "제주 맛집", source: "함께 많이 찾는", query: "제주" },
      { tag: "고유명사", source: "본문 고유명사", query: "" },
    ]);
    expect(dropped).toEqual(["#없는태그(자동완성)", "#스마트(스마트블록 주제)"]);
  });
});

describe("데이터랩 관심도 환산", () => {
  it("기준 키워드 평균을 100으로 환산하고 최근 7일 증감을 구한다", () => {
    const raw = [...Array(21).fill(10), ...Array(7).fill(20)];
    const s = interestStat(raw, 20);
    expect(s.series[0]).toBe(50);
    expect(s.series[27]).toBe(100);
    expect(s.level).toBe(62.5);
    expect(s.momentum).toBe(100);
  });
  it("이전 값이 0이면 최근 값이 있을 때 100%", () => {
    expect(interestStat([...Array(21).fill(0), ...Array(7).fill(5)], 10).momentum).toBe(100);
    expect(interestStat(Array(28).fill(0), 10).momentum).toBe(0);
  });
});
