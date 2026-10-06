import { MAX_TAGS, type Post, type PostBlock } from "./types";

/**
 * 블로그 에디터에 붙여넣을 HTML과 복사용 텍스트.
 * 서버의 세 가지 입력 방식(Claude in Chrome, 평소 크롬, 자동 조작)과 화면의 "본문 복사"가 같이 쓴다.
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
const plain = (s: string) => s.replace(/\*\*/g, "");

type TableBlock = Extract<PostBlock, { type: "table" }>;

export function tableHtml(b: TableBlock): string {
  const border = `border:1px solid ${TABLE_COLORS.border};`;
  const th = `${border}background-color:${TABLE_COLORS.headerBg};font-weight:bold;`;
  const head = `<tr>${b.headers.map((h) => `<th style="${th}">${rich(h)}</th>`).join("")}</tr>`;
  const body = b.rows.map((r) => `<tr>${r.map((c) => `<td style="${border}">${rich(c)}</td>`).join("")}</tr>`).join("");
  return `<table style="border-collapse:collapse;${border}"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

/** 소제목 앞에 넣는 빈 줄 */
export const BLANK_LINE = "<p><br></p>";

/** 본문 끝과 태그 줄 사이의 빈 줄 수 */
export const TAG_GAP_LINES = 3;

/** 이미지 자리 표시 (복사할 때 이미지 대신 넣는다) */
const imageMarker = (n: number, alt: string, thumbnail = false) => {
  if (thumbnail) return "[썸네일]";
  const short = alt.length > 30 ? `${alt.slice(0, 30)}…` : alt;
  return short ? `[이미지 ${n}: ${short}]` : `[이미지 ${n}]`;
};

/** 본문 끝의 태그 줄 ("#태그 #태그") */
const tagLine = (post: Pick<Post, "tags">) => post.tags.slice(0, MAX_TAGS).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");

// ── 복사용 스타일: 앱 미리보기(.preview)와 같은 모양이 되도록 인라인으로 넣는다 (밝은 화면 기준 색) ──
const C = { text: "#1d2433", accent: "#2f6df6", muted: "#6b7385", line: "#e2e5ec", soft: "#eef1f6" };
const FONT = "font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;";
const S = {
  wrap: `${FONT}font-size:15px;line-height:1.8;color:${C.text};`,
  // 소제목 위 한 줄은 빈 문단으로 띄운다. 서식을 잃는 에디터에 붙여도 간격이 남도록 마진 대신 빈 문단을 쓴다.
  // 글쓰기 규칙 6번: 소제목과 내용 사이에 구분선을 두지 않는다.
  heading: `font-size:18px;font-weight:700;line-height:1.5;margin:0 0 10px;`,
  p: "margin:0 0 14px;",
  blank: "margin:0;",
  quote: `margin:0 0 14px;padding:8px 16px;border-left:3px solid ${C.accent};background-color:${C.soft};`,
  list: "margin:0 0 14px;padding-left:22px;",
  marker: `margin:0 0 16px;padding:14px 12px;text-align:center;font-size:13px;color:${C.muted};border:1px dashed ${C.line};border-radius:8px;`,
  tags: `margin:0;font-size:14px;color:${C.accent};`,
};
const styled = (html: string) => html.replace(/<a href=/g, `<a style="color:${C.accent};" href=`);

/** 복사용 표: 앱 미리보기처럼 머리글 배경색, 테두리, 안쪽 여백 */
function copyTableHtml(b: TableBlock): string {
  const border = `border:1px solid ${TABLE_COLORS.border};`;
  const cell = `${border}padding:6px 10px;text-align:left;vertical-align:top;`;
  const th = `${cell}background-color:${TABLE_COLORS.headerBg};font-weight:bold;`;
  const head = `<tr>${b.headers.map((h) => `<th style="${th}">${rich(h)}</th>`).join("")}</tr>`;
  const body = b.rows.map((r) => `<tr>${r.map((c) => `<td style="${cell}">${rich(c)}</td>`).join("")}</tr>`).join("");
  return `<table style="border-collapse:collapse;width:100%;font-size:14px;margin:0 0 14px;${border}"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

/**
 * 본문 전체를 복사용 HTML로: 앱 미리보기와 같은 스타일 (소제목 크기·밑줄, 굵게, 목록, 인용구 띠, 표 색·테두리, 링크 색).
 * 이미지는 자리 표시만 넣고, 태그는 블로그 입력과 같이 본문 끝 빈 줄 3개 뒤에 둔다.
 */
export function postToHtml(post: Pick<Post, "blocks" | "thumbnail" | "tags">): string {
  const out: string[] = [];
  let n = 0;
  const blank = `<p style="${S.blank}"><br></p>`;
  if (post.thumbnail) out.push(`<p style="${S.marker}">${esc(imageMarker(0, post.thumbnail.alt, true))}</p>`);
  for (const b of post.blocks) {
    if (b.type === "heading" && out.length) out.push(blank);
    switch (b.type) {
      case "heading":
        out.push(`<h2 style="${S.heading}">${esc(plain(b.text))}</h2>`);
        break;
      case "paragraph":
        out.push(`<p style="${S.p}">${rich(b.text).replace(/\n/g, "<br>")}</p>`);
        break;
      case "quote":
        out.push(`<blockquote style="${S.quote}"><p style="margin:0;">${rich(b.text)}</p></blockquote>`);
        break;
      case "list":
        out.push(`<ul style="${S.list}">${b.items.map((it) => `<li>${rich(it)}</li>`).join("")}</ul>`);
        break;
      case "table":
        out.push(copyTableHtml(b));
        break;
      case "image":
        out.push(`<p style="${S.marker}">${esc(imageMarker(++n, b.alt))}</p>`);
        break;
    }
  }
  if (post.tags.length) {
    for (let i = 0; i < TAG_GAP_LINES; i++) out.push(blank);
    out.push(`<p style="${S.tags}">${esc(tagLine(post))}</p>`);
  }
  return `<div style="${S.wrap}">${styled(out.join(""))}</div>`;
}

/** 본문 전체를 서식 없는 텍스트로 (표는 칸을 탭으로 구분). 태그는 빈 줄 3개 뒤에 둔다. */
export function postToText(post: Pick<Post, "blocks" | "thumbnail" | "tags">): string {
  const out: string[] = [];
  let n = 0;
  if (post.thumbnail) out.push(imageMarker(0, post.thumbnail.alt, true));
  for (const b of post.blocks) {
    if (b.type === "heading" && out.length) out.push("");
    switch (b.type) {
      case "heading":
      case "paragraph":
        out.push(plain(b.text));
        break;
      case "quote":
        out.push(`“${plain(b.text)}”`);
        break;
      case "list":
        out.push(...b.items.map((it) => `• ${plain(it)}`));
        break;
      case "table":
        out.push(...[b.headers, ...b.rows].map((r) => r.map(plain).join("\t")));
        break;
      case "image":
        out.push(imageMarker(++n, b.alt));
        break;
    }
  }
  if (post.tags.length) {
    for (let i = 0; i < TAG_GAP_LINES; i++) out.push("");
    out.push(tagLine(post));
  }
  return out.join("\n");
}
