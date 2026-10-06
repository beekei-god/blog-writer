import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MAX_TAGS, type Post, type PostBlock, type PostSettings } from "../../shared/types";
import { jobImageDir } from "../store";
import { altFileName, BLANK_LINE, esc, pasteBlockHtml, TAG_GAP_LINES, urlsIn } from "./postHtml";
import { errorText } from "../../shared/labels";

/**
 * 사용자가 평소 쓰는 크롬(macOS)에서 네이버 블로그 글을 쓴다.
 * Chrome은 평소 프로필을 외부 자동화 도구(Playwright 등)로 조종하지 못하게 막고, Claude in Chrome은 네이버를 막는다.
 * 그래서 macOS AppleScript로 크롬에 새 탭을 열고, 그 탭에 스크립트를 넣어 SmartEditor ONE에 붙여넣기 이벤트로 입력한다.
 * - 크롬 메뉴 "보기 > 개발자 > Apple Events의 자바스크립트 허용"이 켜져 있어야 한다.
 * - 이미 로그인된 크롬을 쓰므로 새 창·새 로그인이 필요 없다.
 */

export type UserChromeProblem = "js_disabled" | "not_authorized" | "login" | "editor" | "tab_closed" | "other";

const HELP: Record<UserChromeProblem, string> = {
  js_disabled: '크롬 메뉴 "보기 > 개발자 > Apple Events의 자바스크립트 허용"을 켜 주세요. 평소 크롬에서 블로그 글을 쓰려면 필요합니다.',
  not_authorized: "macOS가 이 앱의 크롬 제어를 막았습니다. 시스템 설정 > 개인정보 보호 및 보안 > 자동화에서 터미널(또는 앱을 실행한 프로그램)의 Google Chrome 제어를 허용하세요.",
  login: "평소 크롬에서 네이버에 로그인되어 있지 않습니다. 크롬에서 네이버에 로그인한 뒤 다시 시도하세요.",
  editor: "네이버 글쓰기 화면을 열지 못했습니다. 크롬에 열린 탭에서 화면을 확인하고 다시 시도하세요.",
  tab_closed: "글을 쓰던 크롬 탭이 닫혔습니다. 끝날 때까지 그 탭은 그대로 두고 다시 시도하세요.",
  other: "평소 크롬을 조작하지 못했습니다.",
};

export class UserChromeError extends Error {
  constructor(
    public problem: UserChromeProblem,
    detail?: string,
  ) {
    super(detail ? `${HELP[problem]} (${detail})` : HELP[problem]);
  }
}

export const userChromeSupported = () => process.platform === "darwin";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function osascript(script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("osascript", ["-", ...args], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve(out.trim());
      if (/Apple Events의 자바스크립트|JavaScript through AppleScript|Apple Events.*JavaScript/i.test(err)) return reject(new UserChromeError("js_disabled"));
      if (/-1743|Not authori[sz]ed|허가되지/i.test(err)) return reject(new UserChromeError("not_authorized"));
      if (/-1719|-1728|유효하지 않은 인덱스|Invalid index|Can.t get/i.test(err)) return reject(new UserChromeError("tab_closed"));
      reject(new UserChromeError("other", err.trim().slice(0, 300)));
    });
    child.stdin.end(script);
  });
}

const OPEN_TAB = `on run argv
  tell application "Google Chrome"
    if (count of windows) = 0 then make new window
    set w to front window
    set t to make new tab at end of tabs of w with properties {URL:(item 1 of argv)}
    set active tab index of w to (count of tabs of w)
    return (id of w as string) & " " & (id of t as string)
  end tell
end run`;

const RUN_JS = `on run argv
  set wid to (item 1 of argv) as integer
  set tid to (item 2 of argv) as integer
  set js to read POSIX file (item 3 of argv) as «class utf8»
  tell application "Google Chrome"
    set t to (first tab of (first window whose id is wid) whose id is tid)
    return execute t javascript js
  end tell
end run`;

interface Tab {
  windowId: string;
  tabId: string;
}

async function openTab(url: string): Promise<Tab> {
  const [windowId, tabId] = (await osascript(OPEN_TAB, [url])).split(" ");
  return { windowId, tabId };
}

/** 탭에서 스크립트를 실행하고 결과(JSON 문자열)를 돌려받는다. 스크립트는 파일로 넘겨 따옴표 처리를 피한다. */
async function runJs<T>(tab: Tab, code: string): Promise<T> {
  const file = path.join(os.tmpdir(), `bw-js-${randomUUID()}.js`);
  await fs.writeFile(file, `(() => { ${HELPERS}\n return JSON.stringify((() => { ${code} })()); })()`, "utf8");
  try {
    const out = await osascript(RUN_JS, [tab.windowId, tab.tabId, file]);
    return (out && out !== "missing value" ? JSON.parse(out) : null) as T;
  } finally {
    await fs.rm(file, { force: true });
  }
}

/** 페이지 안에서 쓰는 공통 함수: 마우스 클릭 흉내, 입력 버퍼에 붙여넣기 */
const HELPERS = `
const fire = (el, x) => { const r = el.getBoundingClientRect();
  for (const type of ['mousedown', 'mouseup', 'click'])
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x === 'end' ? r.right - 2 : r.left + 10, clientY: r.top + r.height / 2, button: 0 })); };
const buffer = () => { const f = document.querySelector('iframe[id^="input_buffer"]'); return f && f.contentDocument && f.contentDocument.body; };
const paste = (dt) => buffer().dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
// 커서를 문서 맨 끝(마지막 문단의 마지막 줄 끝)으로. 문단이 여러 줄이면 가운데 줄을 누르지 않도록 글자가 있는 마지막 줄의 위치를 계산한다.
const caretToEnd = () => {
  const ps = document.querySelectorAll('.se-component.se-text .se-text-paragraph');
  const last = ps[ps.length - 1];
  if (!last) return false;
  last.scrollIntoView({ block: 'center' });
  const range = document.createRange(); range.selectNodeContents(last);
  const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
  const lastRect = rects[rects.length - 1];
  const box = last.getBoundingClientRect();
  const x = lastRect ? Math.min(box.right - 1, lastRect.right + 6) : box.right - 2;
  const y = lastRect ? lastRect.top + lastRect.height / 2 : box.top + box.height / 2;
  for (const type of ['mousedown', 'mouseup', 'click'])
    last.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 }));
  return true;
};
const imageCount = () => document.querySelectorAll('.se-component.se-image').length;
`;

// ───────────────────────── 본문 조각 ─────────────────────────

// 소제목은 일반 문단으로 붙인 뒤 문단 서식을 "소제목"으로 바꾼다.
const blockHtml = (b: Exclude<PostBlock, { type: "image" }>) => pasteBlockHtml(b, "p");

type Segment = { kind: "html"; html: string; text: string } | { kind: "image"; file: string; alt: string };

function segmentsOf(post: Post, jobId: string, log: (m: string) => void): { segments: Segment[]; headings: string[] } {
  const dir = jobImageDir(jobId);
  const segments: Segment[] = [];
  const headings: string[] = [];
  let html: string[] = [];
  let text: string[] = [];
  const flush = () => {
    if (html.length) segments.push({ kind: "html", html: html.join(""), text: text.join("\n") });
    html = [];
    text = [];
  };
  // 네이버는 본문 첫 이미지가 대표 이미지가 된다.
  if (post.thumbnail?.file) segments.push({ kind: "image", file: path.join(dir, path.basename(post.thumbnail.file)), alt: post.thumbnail.alt });
  for (const b of post.blocks) {
    if (b.type === "image") {
      if (!b.file) {
        log(`이미지 건너뜀 (생성되지 않음): ${b.alt || b.prompt.slice(0, 30)}`);
        continue;
      }
      flush();
      segments.push({ kind: "image", file: path.join(dir, path.basename(b.file)), alt: b.alt });
      continue;
    }
    if (b.type === "heading") {
      headings.push(b.text.replace(/\*\*/g, "").trim());
      // 소제목마다 위에 한 줄을 띄운다 (글 맨 처음은 제외).
      // 이미지 바로 뒤에서는 네이버가 빈 문단(<p><br></p>)을 지워 버리므로, 공백 문자가 든 문단으로 넣는다.
      if (html.length || segments.length) {
        html.push(!html.length && segments[segments.length - 1]?.kind === "image" ? "<p>&nbsp;</p>" : BLANK_LINE);
        text.push("");
      }
    }
    html.push(blockHtml(b));
    text.push(b.type === "list" ? b.items.join("\n") : b.type === "table" ? b.headers.join("\t") : b.text);
  }
  // 태그 입력란은 발행 창에만 있어서 본문 끝에 #태그 줄로 넣는다.
  // 본문과 태그 사이에는 빈 줄을 TAG_GAP_LINES개 둔다. 이미지 뒤에서도 지워지지 않도록 공백 문자가 든 문단으로 넣는다.
  if (post.tags.length) {
    const line = post.tags.slice(0, MAX_TAGS).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
    for (let i = 0; i < TAG_GAP_LINES; i++) {
      html.push("<p>&nbsp;</p>");
      text.push("");
    }
    html.push(`<p>${esc(line)}</p>`);
    text.push(line);
  }
  flush();
  return { segments, headings };
}

/**
 * 이미지를 JPEG(가로 최대 1600px)로 줄여 페이지로 넘길 크기를 줄인다. 실패하면 원본을 쓴다.
 * 파일 이름은 대체 텍스트로 정한다 (네이버는 파일 이름을 이미지 alt로 쓴다).
 */
async function shrinkImage(file: string, alt: string): Promise<{ data: Buffer; mime: string; name: string }> {
  const out = path.join(os.tmpdir(), `bw-img-${randomUUID()}.jpg`);
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "88", "-Z", "1600", file, "--out", out], { stdio: "ignore" });
      p.on("error", reject);
      p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`sips ${code}`))));
    });
    return { data: await fs.readFile(out), mime: "image/jpeg", name: altFileName(alt, ".jpg") };
  } catch {
    const ext = path.extname(file).toLowerCase();
    const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
    return { data: await fs.readFile(file), mime, name: altFileName(alt, ext || ".png") };
  } finally {
    await fs.rm(out, { force: true });
  }
}

async function waitFor<T>(fn: () => Promise<T | null | false>, timeoutMs: number, everyMs = 1000): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = await fn();
    if (v) return v;
    await sleep(everyMs);
  }
  return null;
}

// ───────────────────────── 입력 결과 검사 ─────────────────────────

/** 비교용으로 서식 기호·공백·이모지를 뺀 글자 */
const normText = (s: string) => s.replace(/\*\*/g, "").replace(/[\s\u200b\u200d\ufe0f]/g, "").replace(/\p{Extended_Pictographic}/gu, "");

type Atom = { k: "p" | "q" | "h" | "table" | "img"; t: string; list?: boolean; bg?: string };

/** 초안에서 기대하는 순서 (빈 줄은 제외) */
function expectedAtoms(post: Post): { atoms: Atom[]; boldChars: number; links: number } {
  const atoms: Atom[] = [];
  let boldChars = 0;
  let links = 0;
  const bold = (s: string) => {
    for (const m of s.matchAll(/\*\*([^*]+)\*\*/g)) boldChars += normText(m[1]).length;
  };
  if (post.thumbnail?.file) atoms.push({ k: "img", t: "" });
  for (const b of post.blocks) {
    if (b.type === "image") {
      if (b.file) atoms.push({ k: "img", t: "" });
    } else if (b.type === "heading") atoms.push({ k: "h", t: normText(b.text) });
    else if (b.type === "paragraph") {
      bold(b.text);
      links += urlsIn(b.text).length;
      // 문단 안의 줄바꿈은 네이버에서 줄마다 문단이 된다 (눈에 보이는 모양은 같다).
      for (const line of b.text.split("\n")) if (normText(line)) atoms.push({ k: "p", t: normText(line) });
    } else if (b.type === "quote") {
      bold(b.text);
      links += urlsIn(b.text).length;
      atoms.push({ k: "q", t: normText(b.text) });
    } else if (b.type === "list") {
      for (const it of b.items) {
        bold(it);
        links += urlsIn(it).length;
        atoms.push({ k: "p", t: normText(it), list: true });
      }
    } else {
      for (const c of [...b.headers, ...b.rows.flat()]) links += urlsIn(c).length;
      atoms.push({ k: "table", t: "" });
    }
  }
  if (post.tags.length) atoms.push({ k: "p", t: normText(post.tags.slice(0, MAX_TAGS).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")) });
  return { atoms, boldChars, links };
}

/** 에디터에서 읽은 실제 순서 (빈 문단도 포함) */
async function readEditor(tab: Tab): Promise<{ atoms: Atom[]; boldChars: number; links: number }> {
  return runJs(tab, `
    const norm = (s) => s.replace(/[\\s\\u200b\\u200d\\ufe0f]/g, '').replace(/\\p{Extended_Pictographic}/gu, '');
    const atoms = [];
    for (const c of [...document.querySelectorAll('.se-component')].slice(1)) {
      const kind = [...c.classList].find(x => /^se-(text|table|image|sectionTitle|quotation)$/.test(x)) || '';
      if (kind === 'se-image') atoms.push({ k: 'img', t: '' });
      else if (kind === 'se-sectionTitle') atoms.push({ k: 'h', t: norm(c.innerText) });
      else if (kind === 'se-quotation') atoms.push({ k: 'q', t: norm(c.innerText) });
      else if (kind === 'se-table') { const td = c.querySelector('td'); atoms.push({ k: 'table', t: '', bg: td ? getComputedStyle(td).backgroundColor : '' }); }
      else if (kind === 'se-text') for (const p of c.querySelectorAll('.se-text-paragraph'))
        atoms.push({ k: 'p', t: norm(p.innerText), list: !!p.closest('ul,ol') || /list/.test(p.className.toString()) || !!p.querySelector('[class*="se-list"]') });
    }
    const boldChars = [...document.querySelectorAll('.se-component.se-text b, .se-component.se-text strong, .se-component.se-quotation b, .se-component.se-quotation strong')].reduce((a, e) => a + norm(e.innerText).length, 0);
    // 네이버는 붙여넣은 <a>를 <span class="se-link" data-href="…">로 바꿔 저장한다.
    const links = document.querySelectorAll('.se-component .se-link[data-href]').length;
    return { atoms, boldChars, links };`);
}

const KIND_NAME: Record<Atom["k"], string> = { p: "문단", q: "인용", h: "소제목", table: "표", img: "이미지" };

/** 에디터에 들어간 글이 초안과 같은 모양인지 확인하고, 다른 점을 사람이 읽을 문장으로 돌려준다. */
async function verifyEditor(tab: Tab, post: Post): Promise<string[]> {
  const problems: string[] = [];
  const want = expectedAtoms(post);
  const got = await readEditor(tab);
  const gotNoBlank = got.atoms.filter((a) => !(a.k === "p" && a.t === ""));

  // 1) 순서와 종류 (빈 줄 제외). 인용은 문단으로 들어가도 같은 것으로 본다.
  const same = (a: Atom, b: Atom) => a.k === b.k || (a.k === "q" && b.k === "p") || (a.k === "p" && b.k === "q");
  const n = Math.max(want.atoms.length, gotNoBlank.length);
  for (let i = 0; i < n; i++) {
    const w = want.atoms[i];
    const g = gotNoBlank[i];
    if (!w || !g || !same(w, g)) {
      problems.push(`글 구성이 초안과 다릅니다 (${i + 1}번째: 초안은 ${w ? KIND_NAME[w.k] : "끝"}, 에디터는 ${g ? KIND_NAME[g.k] : "끝"}).`);
      break;
    }
  }
  // 2) 문단이 합쳐지거나 잘리지 않았는지
  const editorTexts = new Set(got.atoms.filter((a) => a.k === "p" || a.k === "q").map((a) => a.t));
  const broken = want.atoms.filter((a) => (a.k === "p" || a.k === "q") && a.t.length >= 8 && !editorTexts.has(a.t));
  if (broken.length) problems.push(`문단 ${broken.length}개가 초안과 다르게 합쳐지거나 잘렸습니다 (예: “${broken[0].t.slice(0, 14)}…”).`);
  // 3) 소제목 서식, 표, 이미지 개수
  const count = (atoms: Atom[], k: Atom["k"]) => atoms.filter((a) => a.k === k).length;
  if (count(got.atoms, "h") < count(want.atoms, "h")) problems.push(`소제목 서식이 ${count(want.atoms, "h") - count(got.atoms, "h")}곳 적용되지 않았습니다.`);
  if (count(got.atoms, "table") < count(want.atoms, "table")) problems.push("표가 일부 들어가지 않았습니다.");
  if (count(got.atoms, "img") < count(want.atoms, "img")) problems.push(`이미지가 ${count(want.atoms, "img") - count(got.atoms, "img")}개 들어가지 않았습니다.`);
  const plainTables = got.atoms.filter((a) => a.k === "table" && (!a.bg || a.bg === "rgb(255, 255, 255)" || a.bg === "rgba(0, 0, 0, 0)")).length;
  if (plainTables) problems.push(`표 ${plainTables}개의 머리글 색이 적용되지 않았습니다.`);
  // 4) 목록, 굵게
  const wantList = want.atoms.filter((a) => a.list).length;
  const gotList = got.atoms.filter((a) => a.list).length;
  if (gotList < wantList) problems.push(`목록 서식이 ${wantList - gotList}개 항목에 적용되지 않았습니다.`);
  if (want.boldChars > 0 && got.boldChars < want.boldChars * 0.85) problems.push("굵은 글씨가 일부 적용되지 않았습니다.");
  // 링크, 태그 앞 빈 줄
  if (got.links < want.links) problems.push(`링크 ${want.links - got.links}개가 연결되지 않았습니다.`);
  if (post.tags.length) {
    let i = got.atoms.length - 1;
    while (i >= 0 && got.atoms[i].k === "p" && got.atoms[i].t === "") i--; // 끝의 빈 줄은 건너뛰고 태그 줄을 찾는다
    let gap = 0;
    for (let j = i - 1; j >= 0 && got.atoms[j].k === "p" && got.atoms[j].t === ""; j--) gap++;
    if (gap < TAG_GAP_LINES) problems.push(`본문과 태그 사이 빈 줄이 ${gap}개입니다 (${TAG_GAP_LINES}개여야 함).`);
  }
  // 5) 소제목 위 빈 줄 (글 맨 처음 소제목은 제외)
  let missingBlank = 0;
  got.atoms.forEach((a, i) => {
    if (a.k !== "h") return;
    const before = got.atoms.slice(0, i).filter((x) => !(x.k === "p" && x.t === ""));
    if (before.length <= 1 && before.every((x) => x.k === "img")) return; // 앞에 이미지뿐이면 첫 소제목
    const prev = got.atoms[i - 1];
    if (!(prev && prev.k === "p" && prev.t === "")) missingBlank++;
  });
  if (missingBlank) problems.push(`소제목 위의 빈 줄이 ${missingBlank}곳 없습니다.`);
  return problems;
}

// ───────────────────────── 실행 ─────────────────────────

export interface UserChromeResult {
  imagesInserted: number;
  problems: string[];
}

/** 평소 크롬의 새 탭에서 네이버 블로그 글을 입력하고 임시저장한다. 탭은 사용자가 확인하도록 열어 둔다. */
export async function postNaverInUserChrome(
  post: Post,
  jobId: string,
  settings: PostSettings,
  log: (m: string) => void,
  /** save=false면 입력만 하고 임시저장은 누르지 않는다 (점검용) */
  opts: { save?: boolean } = {},
): Promise<UserChromeResult> {
  if (!userChromeSupported()) throw new UserChromeError("other", "macOS에서만 쓸 수 있습니다.");
  if (!settings.blogId) throw new Error("설정에서 네이버 블로그 ID를 입력하세요.");
  const problems: string[] = [];
  const { segments, headings } = segmentsOf(post, jobId, log);

  log("평소 크롬에 네이버 블로그 글쓰기 탭을 엽니다. 끝날 때까지 그 탭은 그대로 두세요.");
  const tab = await openTab(`https://blog.naver.com/${settings.blogId}/postwrite`);

  // 글쓰기 화면이 뜰 때까지 (로그인 화면이면 바로 알린다)
  const ready = await waitFor(async () => {
    const s = await runJs<{ login: boolean; ready: boolean }>(
      tab,
      `return { login: /nid\\.naver\\.com/.test(location.href), ready: !!(document.querySelector('.se-documentTitle .se-text-paragraph') && buffer()) };`,
    );
    if (s?.login) throw new UserChromeError("login");
    return s?.ready ? s : null;
  }, 60_000);
  if (!ready) throw new UserChromeError("editor", "60초 안에 에디터가 나타나지 않음");
  await sleep(1500);

  // "작성 중인 글이 있습니다. 이어서 작성하시겠습니까?" 팝업은 에디터가 뜬 뒤 몇 초 안에 나타났다가 사라진다.
  // 최대 6초 동안 지켜보다가 나타나면 "취소"(새 글로 시작)를 누른다.
  await waitFor(
    () =>
      runJs<boolean>(tab, `
        const cancel = document.querySelector('.se-popup-button-cancel');
        if (cancel && cancel.offsetParent && /작성 중인 글/.test(cancel.closest('.se-popup')?.innerText || '')) { cancel.click(); return true; }
        return false;`),
    6000,
    300,
  );
  await runJs(tab, `const help = document.querySelector('.se-help-panel-close-button'); if (help && help.offsetParent) help.click(); return true;`);
  await sleep(800);

  // 예전에 작성 중이던 글이 불러와졌으면 새 글과 섞이지 않게 멈춘다.
  const leftover = await runJs<{ title: string; text: string; comps: number }>(tab, `
    const node = document.querySelector('.se-documentTitle .__se-node');
    // 빈 칸에 보이는 안내 문구(.se-placeholder)는 빼고, 실제 입력 노드(.__se-node)의 글자만 본다.
    const text = [...document.querySelectorAll('.se-component:not(.se-documentTitle) .__se-node')].map(n => n.innerText.replace(/\\u200b/g, '').trim()).join('').trim();
    return { title: node ? node.innerText.replace(/\\u200b/g, '').trim() : '', text, comps: document.querySelectorAll('.se-component').length };`);
  if (leftover && (leftover.title || leftover.text || leftover.comps > 2)) {
    throw new UserChromeError(
      "editor",
      "글쓰기 화면에 예전에 작성 중이던 글이 불러와져 있어서 멈췄습니다. 크롬에 열린 탭을 닫거나 내용을 지운 뒤 다시 시도하세요",
    );
  }

  log("제목 입력");
  await runJs(tab, `
    fire(document.querySelector('.se-documentTitle .se-text-paragraph'));
    const dt = new DataTransfer(); dt.setData('text/plain', ${JSON.stringify(post.title)}); paste(dt); return true;`);
  await sleep(500);

  log("본문 입력");
  await runJs(tab, `fire(document.querySelector('.se-component.se-text .se-text-paragraph')); return true;`);
  let imagesInserted = 0;
  for (const seg of segments) {
    if (seg.kind === "html") {
      await runJs(tab, `
        caretToEnd();
        const dt = new DataTransfer(); dt.setData('text/html', ${JSON.stringify(seg.html)}); dt.setData('text/plain', ${JSON.stringify(seg.text)});
        paste(dt); return true;`);
      await sleep(800);
      continue;
    }
    // 이미지: base64 조각으로 페이지에 넘긴 뒤 파일 붙여넣기 → 네이버가 업로드한다.
    log(`이미지 올리는 중 (${imagesInserted + 1})`);
    const img = await shrinkImage(seg.file, seg.alt);
    const b64 = img.data.toString("base64");
    await runJs(tab, `window.__bwData = ''; return true;`);
    for (let i = 0; i < b64.length; i += 400_000) {
      await runJs(tab, `window.__bwData += '${b64.slice(i, i + 400_000)}'; return window.__bwData.length;`);
    }
    const before = await runJs<number>(tab, `return imageCount();`);
    await runJs(tab, `
      caretToEnd();
      const bin = atob(window.__bwData); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      window.__bwData = '';
      const dt = new DataTransfer(); dt.items.add(new File([u8], ${JSON.stringify(img.name)}, { type: ${JSON.stringify(img.mime)} }));
      paste(dt); return true;`);
    const done = await waitFor(async () => ((await runJs<number>(tab, `return imageCount();`)) > before ? true : null), 60_000);
    if (done) imagesInserted++;
    else problems.push(`이미지 ${imagesInserted + 1}번이 60초 안에 올라가지 않았습니다.`);
    await sleep(1500); // 업로드가 끝나고 본문이 자리 잡을 시간
  }

  // 소제목: 붙여 넣은 문단을 에디터의 "소제목" 서식으로 바꾼다.
  // 이모지·공백은 에디터가 다르게 표시할 수 있어 빼고 비교한다.
  for (const h of headings) {
    const ok = await runJs<boolean>(tab, `
      const norm = (s) => s.replace(/[\\s\\u200b\\u200d\\ufe0f]/g, '').replace(/\\p{Extended_Pictographic}/gu, '');
      const want = norm(${JSON.stringify(h)});
      const p = [...document.querySelectorAll('.se-component.se-text .se-text-paragraph')].find(x => norm(x.innerText) === want);
      if (!p) return false;
      fire(p);
      const opener = document.querySelector('button.se-text-format-toolbar-button, button[data-name="text-format"]');
      if (!opener) return false;
      opener.click();
      const opt = [...document.querySelectorAll('button')].find(b => b.offsetParent && /se-toolbar-option/.test(b.className) && b.innerText.trim().split('\\n')[0] === '소제목');
      if (!opt) { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return false; }
      opt.click(); return true;`);
    if (!ok) problems.push(`소제목 서식을 적용하지 못함: ${h}`);
    await sleep(400);
  }

  // 에디터에 들어간 모양이 초안과 같은지 확인한다 (다르면 "확인 필요"로 알린다).
  try {
    problems.push(...(await verifyEditor(tab, post)));
  } catch (e) {
    problems.push(`입력 결과를 검사하지 못했습니다: ${errorText(e)}`);
  }
  if (opts.save === false) return { imagesInserted, problems };

  log("임시저장 클릭");
  const countBefore = await runJs<string>(tab, `const c = document.querySelector('[class*="save_count_btn"]'); return c ? c.innerText.trim() : '';`);
  await runJs(tab, `const b = document.querySelector('button[class*="save_btn"]'); if (!b) return false; b.click(); return true;`);
  const saved = await waitFor(
    () =>
      runJs<boolean>(tab, `
        const c = document.querySelector('[class*="save_count_btn"]');
        const toast = [...document.querySelectorAll('div, p, span')].some(e => e.offsetParent && /임시저장이 완료/.test(e.innerText || '') && e.children.length < 3);
        return toast || (c && c.innerText.trim() !== ${JSON.stringify(countBefore)});`),
    15_000,
  );
  if (!saved) throw new Error("임시저장 완료를 확인하지 못했습니다. 크롬에 열린 탭에서 직접 저장 버튼을 눌러 주세요.");
  return { imagesInserted, problems };
}
