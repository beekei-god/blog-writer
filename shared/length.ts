import type { Post } from "./types";

/** 본문 분량 상한 (공백 포함, "참고 자료" 목록과 태그는 제외) */
export const MAX_BODY_CHARS = 3000;

const REFERENCE_HEADING = /참고\s*(한\s*)?자료|출처/;
const strip = (s: string) => s.replace(/\*\*/g, "");
const len = (s: string) => Array.from(strip(s).replace(/[\r\n]/g, "")).length; // 이모지·한글을 한 글자로 센다. 줄바꿈은 세지 않는다

/**
 * 본문 글자수 (공백 포함). 제목, 이미지, 줄바꿈은 세지 않고,
 * "참고 자료" 소제목부터 끝까지는 제외한다.
 */
export function countBodyChars(post: Pick<Post, "blocks">): number {
  let n = 0;
  for (const b of post.blocks) {
    if (b.type === "heading" && REFERENCE_HEADING.test(b.text)) break;
    switch (b.type) {
      case "heading":
      case "paragraph":
      case "quote":
        n += len(b.text);
        break;
      case "list":
        n += b.items.reduce((a, it) => a + len(it), 0);
        break;
      case "table":
        n += [b.headers, ...b.rows].flat().reduce((a, c) => a + len(c), 0);
        break;
    }
  }
  return n;
}
