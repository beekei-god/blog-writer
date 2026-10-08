// 붙여넣기용 HTML은 화면의 "본문 복사"와 같이 쓰도록 shared/postHtml.ts에 있다.
import { esc, rich, tableHtml } from "../../shared/postHtml";
import type { PostBlock } from "../../shared/types";
export { BLANK_LINE, esc, skippedImageLabel, tableHtml, TAG_GAP_LINES, tagLine, urlsIn } from "../../shared/postHtml";

/** 에디터에 붙여넣을 블록 하나의 HTML. 소제목 태그는 에디터 경로마다 다르다. */
export function pasteBlockHtml(b: Exclude<PostBlock, { type: "image" }>, headingTag: "h3" | "p"): string {
  switch (b.type) {
    case "heading":
      return `<${headingTag}>${esc(b.text.replace(/\*\*/g, ""))}</${headingTag}>`;
    case "paragraph":
      return `<p>${rich(b.text).replace(/\n/g, "<br>")}</p>`;
    case "quote":
      return `<blockquote><p>${rich(b.text)}</p></blockquote>`;
    case "list":
      return `<ul>${b.items.map((it) => `<li>${rich(it)}</li>`).join("")}</ul>`;
    case "table":
      return tableHtml(b);
  }
}

/** 크롬으로 올리는 블로그의 글쓰기 화면 주소 */
export const writeUrl = (platform: "naver" | "tistory", blogId: string) =>
  platform === "naver" ? `https://blog.naver.com/${blogId}/postwrite` : `https://${blogId}.tistory.com/manage/newpost`;

/**
 * 네이버 SmartEditor ONE에는 대체 텍스트 입력 칸이 없고, 올린 파일 이름이 이미지의 alt가 된다
 * (공백은 _로 바뀌고 확장자도 붙는다. 확장자가 없으면 업로드가 거절된다). 그래서 대체 텍스트로 파일 이름을 만든다.
 */
export function altFileName(alt: string, ext: string): string {
  const base = alt
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim();
  return `${base || "image"}${ext}`;
}
