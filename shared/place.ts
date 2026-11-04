import type { PostBlock } from "./types";

export type PlaceBlock = Extract<PostBlock, { type: "place" }>;

/** 네이버 지도에서 이 장소를 찾는 주소 (이름과 주소로 검색한다) */
export const placeMapUrl = (b: Pick<PlaceBlock, "name" | "address">) =>
  `https://map.naver.com/p/search/${encodeURIComponent([b.name, b.address].filter(Boolean).join(" ").trim())}`;

/** 장소 카드의 글자 (미리보기·네이버·티스토리·워드프레스 공통): 장소 이름, 주소, 지도 링크 */
export function placeLines(b: Pick<PlaceBlock, "name" | "address">): string[] {
  return [`📍 ${b.name.trim()}`, ...(b.address?.trim() ? [`주소: ${b.address.trim()}`] : []), `네이버 지도: ${placeMapUrl(b)}`];
}

/** 네이버 에디터의 장소 검색창에 넣을 검색어: 주소가 있으면 정확한 주소, 없으면 장소 이름 */
export const placeSearchQuery = (b: Pick<PlaceBlock, "name" | "address">) => b.address?.trim() || b.name.trim();
