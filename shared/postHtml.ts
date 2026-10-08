import { MAX_TAGS, type ImageSpec, type Post, type PostBlock } from "./types";

/**
 * 블로그 에디터에 붙여넣을 HTML.
 * 서버의 세 가지 입력 방식(Claude in Chrome, 평소 크롬, 자동 조작)과 워드프레스 등록이 같이 쓴다.
 * 표는 앱 미리보기처럼 머리글 배경색과 테두리를 인라인 스타일로 넣는다 (네이버 에디터는 셀의 인라인 배경·테두리를 그대로 받는다).
 */
export const TABLE_COLORS = { headerBg: "#eef1f6", border: "#d5dae3" };

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** 글 속 주소. 문장 끝의 마침표·쉼표·닫는 괄호는 주소에 넣지 않는다. */
export const URL_RE = /https?:\/\/[^\s<>"'“”‘’]+/g;
const TRAILING = /[.,;:!?)\]}>。、]+$/;
/** 주소와 뒤에 붙은 문장부호로 나눈다 */
export function splitUrl(raw: string): { url: string; tail: string } {
  const m = TRAILING.exec(raw);
  return m ? { url: raw.slice(0, m.index), tail: m[0] } : { url: raw, tail: "" };
}
/** 글 속 주소를 모은다 */
export const urlsIn = (s: string) =>
  [...s.replace(/\*\*/g, "").matchAll(URL_RE)].map((m) => splitUrl(m[0]).url).filter((u) => /^https?:\/\/[^/]+\./.test(u));

/** 이스케이프된 HTML 안의 주소를 링크로 바꾼다 (이미 태그 안에 있는 부분은 건드리지 않는다) */
const linkify = (escaped: string) =>
  escaped.replace(/https?:\/\/[^\s<>"']+/g, (raw) => {
    const { url, tail } = splitUrl(raw);
    return /^https?:\/\/[^/]+\./.test(url) ? `<a href="${url}">${url}</a>${tail}` : raw;
  });

export const rich = (s: string) => linkify(esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"));
/** 굵게 표시(**)를 뺀 글자 */
export const plain = (s: string) => s.replace(/\*\*/g, "");

type TableBlock = Extract<PostBlock, { type: "table" }>;

/** 머리글 배경색과 테두리가 있는 표. cellExtra·tableExtra로 칸과 표에 스타일을 더한다 (붙여넣기·워드프레스가 같이 쓴다) */
export function tableHtml(b: TableBlock, cellExtra = "", tableExtra = ""): string {
  const border = `border:1px solid ${TABLE_COLORS.border};`;
  const cell = `${border}${cellExtra}`;
  const th = `${cell}background-color:${TABLE_COLORS.headerBg};font-weight:bold;`;
  const head = `<tr>${b.headers.map((h) => `<th style="${th}">${rich(h)}</th>`).join("")}</tr>`;
  const body = b.rows.map((r) => `<tr>${r.map((c) => `<td style="${cell}">${rich(c)}</td>`).join("")}</tr>`).join("");
  return `<table style="border-collapse:collapse;${tableExtra}${border}"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

/** 만들지 못해 건너뛴 이미지를 로그에 남길 때의 이름 */
export const skippedImageLabel = (b: Pick<ImageSpec, "alt" | "prompt">) => b.alt || b.prompt.slice(0, 30);

/** 소제목 앞에 넣는 빈 줄 */
export const BLANK_LINE = "<p><br></p>";

/** 본문 끝과 태그 줄 사이의 빈 줄 수 */
export const TAG_GAP_LINES = 3;

/** 본문 끝의 태그 줄 ("#태그 #태그") */
export const tagLine = (post: Pick<Post, "tags">) => post.tags.slice(0, MAX_TAGS).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
