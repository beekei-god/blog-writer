import { describe, expect, it } from "vitest";
import { blockText } from "../shared/blockDiff";
import { countBodyChars } from "../shared/length";
import { placeLines, placeMapUrl } from "../shared/place";
import { PostSchema } from "../server/schema";
import { pasteBlockHtml } from "../server/browser/postHtml";
import { postToBlocks } from "../server/wordpress";

const place = { type: "place" as const, name: "래미안 원베일리", address: "서울 서초구 반포동" };

describe("장소 블록", () => {
  it("네이버 지도 주소는 이름과 주소로 검색하고, 카드 글자는 이름·주소·링크", () => {
    expect(placeMapUrl(place)).toBe(`https://map.naver.com/p/search/${encodeURIComponent("래미안 원베일리 서울 서초구 반포동")}`);
    expect(placeMapUrl({ name: "단지" })).toBe(`https://map.naver.com/p/search/${encodeURIComponent("단지")}`);
    expect(placeLines(place)).toEqual(["📍 래미안 원베일리", "주소: 서울 서초구 반포동", `네이버 지도: ${placeMapUrl(place)}`]);
    expect(placeLines({ name: "단지" })).toHaveLength(2);
  });
  it("글 저장 검사를 통과하고, 글자수에는 세지 않는다", () => {
    const parsed = PostSchema.parse({ title: "t", summary: "s", tags: [], blocks: [place, { type: "paragraph", text: "가나다" }] });
    expect(parsed.blocks[0]).toMatchObject({ type: "place", name: "래미안 원베일리" });
    expect(countBodyChars(parsed)).toBe(3);
    expect(blockText(place)).toContain("[장소: 래미안 원베일리");
  });
  it("붙여넣기 HTML과 워드프레스 블록에 이름·주소·지도 링크가 들어간다", () => {
    const html = pasteBlockHtml(place, "p");
    expect(html).toContain("<strong>📍 래미안 원베일리</strong>");
    expect(html).toContain("주소: 서울 서초구 반포동");
    expect(html).toContain(`href="${placeMapUrl(place)}"`);
    const wp = postToBlocks({ blocks: [place] }, () => undefined, () => {});
    expect(wp).toContain("<!-- wp:html -->");
    expect(wp).toContain("래미안 원베일리");
  });
});
