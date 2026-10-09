import type { BlogCategory, Platform, PublishMode } from "../../shared/types";
import { sleep } from "../fsutil";
import { naverPublishSteps, PUBLISH_DUMP_JS, type PublishRequest, type PublishStep } from "./publish";

/**
 * 네이버·티스토리의 카테고리: 블로그 에디터에서 목록을 읽고, 올릴 때 이름으로 골라 준다.
 * 에디터 화면은 클래스 이름이 자주 바뀌므로 화면 글자("카테고리")와 모양(선택 상자, 누르면 목록이 뜨는 버튼)으로 찾는다.
 * 못 찾으면 멈추거나(목록 불러오기) 기본 카테고리로 올리고 "확인 필요"로 남긴다(올리기). 그때 화면 구조를 같이 남긴다.
 */

/** 페이지 안에서 쓰는 도우미 (publish.ts의 PUBLISH_HELPERS 뒤에 붙인다): 카테고리 칸 찾기, 화면에 보이는 짧은 글자 모으기 */
const helpers = (labelRe: string) => `
const CAT_RE = ${labelRe};
const LISTY = 'li, [role=option], [role=menuitem], button, a, span, div, p';
const NOT_EDITOR = '[contenteditable="true"], .se-content, .se-main-container, #tinymce';
/* 카테고리 칸이 <select>인 경우 */
const catSelect = (R) => [...R.querySelectorAll('select')].find((s) => vis(s) && CAT_RE.test([s.className, s.id, s.name, s.getAttribute('aria-label'), (s.closest('label') || s.parentElement || {}).innerText].join(' ').slice(0, 200)));
/* 카테고리 칸: <select>, 또는 "카테고리" 글자를 가진 버튼 (글자만 있으면 그 옆의 선택 상자·버튼) */
const catControl = (R) => {
  const sel = catSelect(R);
  if (sel) return { sel };
  const c = [...R.querySelectorAll('button, [role=button], [role=combobox], a, span, div, label, dt, p')].filter((e) => vis(e) && !e.closest(NOT_EDITOR) && CAT_RE.test(text(e)) && text(e).length <= 30);
  const lab = c.find((e) => !c.some((o) => o !== e && e.contains(o)));
  if (!lab) return null;
  let btn = lab.closest('button, [role=button], [role=combobox], a');
  for (let box = lab.parentElement, i = 0; !btn && box && i < 3; box = box.parentElement, i++) {
    const s = [...box.querySelectorAll('select')].find(vis);
    if (s) return { sel: s };
    btn = [...box.querySelectorAll('button, [role=button], [role=combobox]')].find((b) => vis(b) && !b.contains(lab) && !/발행|취소|확인|닫기/.test(text(b)) && !b.matches(OPENER));
  }
  if (!btn) {
    // 버튼 모양이 아닌 클릭 영역(div·span): "카테고리" 글자 바로 옆(다음 형제)의 짧은 글자 상자
    const sib = lab.nextElementSibling || (lab.parentElement && lab.parentElement.nextElementSibling);
    // 눌리는 쪽은 안쪽 요소일 수 있어, 클릭이 위로 전달되도록 가장 안쪽의 첫 요소를 누른다.
    if (sib && vis(sib) && text(sib).length <= 30 && !sib.matches(OPENER)) btn = [...sib.querySelectorAll('*')].find((e) => vis(e) && !e.children.length) || sib;
  }
  return btn ? { btn } : null;
};
/* 화면에 보이는 가장 안쪽 요소들. 칸을 누르기 전에 표시(data-bw-seen)를 남겨 두면, 누른 뒤 표시 없는 요소가 새로 나타난 목록 항목이다.
   글자로 비교하면 안 된다: 칸이 현재 선택값(보통 첫 항목)을 그대로 보여 주므로 첫 항목의 글자가 이미 화면에 있다. */
const leaves = () => [...document.querySelectorAll(LISTY)].filter((e) => vis(e) && !e.children.length && !e.closest(NOT_EDITOR));
const markSeen = () => { for (const e of leaves()) e.setAttribute('data-bw-seen', '1'); };
const newLeafTexts = () => leaves().filter((e) => !e.hasAttribute('data-bw-seen')).map((e) => text(e)).filter((t) => t && t.length <= 40);
`;

const CATEGORY_HELPERS = helpers("/카테고리|category/i");
/** 네이버 "주제" 칸을 찾는 도우미 (카테고리 칸을 찾는 것과 같은 방식, 라벨 글자만 다르다) */
const TOPIC_HELPERS = helpers("/주제|topic/i");

const rootCheck = (rootJs: string) => `const R = ${rootJs}; if (!R) return false;`;

/** 목록 열기: <select>면 그대로 두고, 누르면 목록이 뜨는 버튼이면 누르기 전 화면 글자를 기억해 두고 누른다 */
const openJs = (rootJs: string) => `${CATEGORY_HELPERS}
${rootCheck(rootJs)}
const c = catControl(R);
if (!c) return 'ERR:카테고리 칸을 찾지 못했습니다';
if (c.sel) return true;
markSeen();
c.btn.click();
return true;`;

/** 목록 읽기: <select>면 선택지, 버튼이면 누른 뒤 새로 나타난 글자들. 아직이면 false */
const readJs = (rootJs: string) => `${CATEGORY_HELPERS}
${rootCheck(rootJs)}
const c = catControl(R);
if (c && c.sel) return [...c.sel.options].map((o) => text(o)).filter(Boolean);
const now = newLeafTexts();
return now.length ? now : false;`;

const closeJs = `for (const t of [document, document.body]) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true })); return true;`;

/** 카테고리를 못 찾거나 못 읽은 경우. dialog에 그 순간의 화면 구조가 붙는다 */
export class CategoryError extends Error {
  dialog?: string;
}

async function until<T>(exec: (js: string) => Promise<unknown>, js: string, pick: (r: unknown) => T | null, what: string, ms: number): Promise<T> {
  const deadline = Date.now() + ms;
  for (;;) {
    const r = await exec(js);
    const v = pick(r);
    if (v !== null) return v;
    const err = typeof r === "string" && r.startsWith("ERR:") ? r.slice(4) : Date.now() > deadline ? "시간 안에 끝나지 않았습니다" : "";
    if (err) {
      const e = new CategoryError(`${what}: ${err}`);
      const dump = await exec(PUBLISH_DUMP_JS).catch(() => null);
      if (typeof dump === "string" && dump) e.dialog = dump;
      throw e;
    }
    await sleep(400);
  }
}

/** 읽은 글자에서 카테고리 이름만 남긴다: 앞뒤 공백 제거, 너무 긴 글·"카테고리" 글자 자체 제외, 중복 제거, 최대 100개 */
export function cleanCategoryNames(raw: unknown[]): string[] {
  const out: string[] = [];
  for (const r of raw) {
    const t = typeof r === "string" ? r.replace(/\s+/g, " ").trim() : "";
    if (t && t.length <= 40 && t !== "카테고리" && !out.includes(t)) out.push(t);
    if (out.length >= 100) break;
  }
  return out;
}

/**
 * 블로그 에디터에서 카테고리 목록을 읽는다. exec는 페이지에서 스크립트를 실행해 결과를 돌려준다 (도우미는 exec가 붙인다).
 * rootJs: 카테고리 칸이 있는 화면 부분을 돌려주는 식 (티스토리는 `document`, 네이버는 발행 창 `layer()`).
 */
export async function readCategories(exec: (js: string) => Promise<unknown>, rootJs: string, log: (m: string) => void): Promise<string[]> {
  log("카테고리 칸 열기");
  await until(exec, openJs(rootJs), (r) => (r === true ? true : null), "카테고리 칸 열기", 10_000);
  log("카테고리 목록 읽기");
  const raw = await until(exec, readJs(rootJs), (r) => (Array.isArray(r) && r.length ? r : null), "카테고리 목록 읽기", 8_000);
  await exec(closeJs).catch(() => {});
  const names = cleanCategoryNames(raw);
  if (!names.length) throw new CategoryError("카테고리 목록 읽기: 읽은 항목이 카테고리 이름처럼 보이지 않습니다");
  return names;
}

/**
 * 올릴 때 카테고리 고르기 단계. 못 해도 멈추지 않고(optional) 기본 카테고리로 올리며 "확인 필요"로 남긴다.
 * <select>면 같은 이름의 선택지를 고르고, 버튼이면 눌러 목록을 연 뒤 같은 이름의 가장 안쪽 항목을 누른다.
 */
function selectDropdownSteps(kind: "카테고리" | "주제", helpersJs: string, name: string, rootJs: string): PublishStep[] {
  return [
    {
      name: `${kind} 고르기`,
      optional: true,
      timeoutMs: 12_000,
      js: `${helpersJs}
${rootCheck(rootJs)}
const want = ${JSON.stringify(name)};
const c = catControl(R);
if (c && c.sel) {
  const o = [...c.sel.options].find((x) => text(x) === want);
  if (!o) return 'ERR:${kind} "' + want + '"이(가) 목록에 없습니다';
  setValue(c.sel, o.value);
  return text(c.sel.selectedOptions[0] || {}) === want ? true : 'ERR:${kind}을(를) 고르지 못했습니다';
}
if (!window.__bwCatOpen) {
  if (!c) return 'ERR:${kind} 칸을 찾지 못했습니다';
  markSeen();
  window.__bwCatTries = 0;
  c.btn.click();
  window.__bwCatOpen = Date.now();
  return false;
}
const cand = [...document.querySelectorAll(LISTY)].filter((e) => vis(e) && !e.closest(NOT_EDITOR) && text(e) === want && !(c && c.btn && c.btn.contains(e)));
const item = cand.find((e) => !cand.some((o) => o !== e && e.contains(o)));
if (!item) {
  // 목록이 떴는데(새로 나타난 글자가 있는데) 몇 번을 봐도 그 이름이 없으면 목록에 없는 것이다.
  window.__bwCatTries = (window.__bwCatTries || 0) + 1;
  if (window.__bwCatTries > 4 && newLeafTexts().length) { window.__bwCatOpen = 0; return 'ERR:${kind} "' + want + '"이(가) 목록에 없습니다'; }
  return false;
}
item.click();
window.__bwCatOpen = 0;
return true;`,
    },
  ];
}

/** 카테고리 고르기 단계 (티스토리는 에디터 위쪽, 네이버는 발행 창) */
export const selectCategorySteps = (name: string, rootJs: string) => selectDropdownSteps("카테고리", CATEGORY_HELPERS, name, rootJs);

/**
 * 네이버 발행 창의 주제 고르기 단계. 주제는 칸을 누르면 팝업이 열리고, 팝업에서 이름을 고른 뒤 "확인"을 눌러 닫는다.
 * 한 단계 안에서 차례로 진행한다: 칸 누르기 → 팝업에서 같은 이름 고르기 → 팝업의 "확인" → 팝업이 닫히고 발행 창이 돌아왔는지 확인.
 * 팝업이 열려 있는 동안 발행 창은 팝업으로 바뀌어 사라지므로, 발행 창은 처음(칸 찾기)과 마지막(돌아왔는지)에만 본다.
 * 카테고리와 마찬가지로 못 해도 멈추지 않는다(optional). <select>로 된 칸이면 그 선택지를 바로 고른다.
 */
/** 주제 팝업이 열린 채 남지 않게 닫는다: "취소"·"닫기"가 있으면 누르고, 없으면 Esc */
const TOPIC_CLEANUP_JS = `window.__bwTop = null;
const boxes = [...document.querySelectorAll('div, section, aside, form, [role=dialog]')].filter((e) => vis(e) && !e.matches(OPENER) && !e.querySelector(OPENER) &&
  [...e.querySelectorAll('button')].some((b) => vis(b) && text(b) === '확인') && [...e.querySelectorAll('button')].some((b) => vis(b) && /^(취소|닫기)$/.test(text(b))));
boxes.sort((a, b) => text(a).length - text(b).length);
const cancel = boxes[0] && [...boxes[0].querySelectorAll('button')].find((b) => vis(b) && /^(취소|닫기)$/.test(text(b)));
if (cancel) cancel.click();
else for (const t of [document, document.body]) t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
return true;`;

export const selectTopicSteps = (name: string, rootJs: string): PublishStep[] => [
  {
    name: "주제 고르기",
    optional: true,
    timeoutMs: 25_000,
    cleanupJs: TOPIC_CLEANUP_JS,
    js: `${TOPIC_HELPERS}
const want = ${JSON.stringify(name)};
const ITEM = 'li, [role=option], [role=radio], label, button, a, span, div, p';
const st = window.__bwTop || (window.__bwTop = { phase: 0, tries: 0 });
const fail = (why) => { window.__bwTop = null; return 'ERR:' + why; };
/* 주제 팝업: 이름과 "확인" 버튼을 함께 가진 가장 작은 보이는 상자 (발행 창을 여는 버튼이 든 상자는 제외) */
const popup = () => {
  const boxes = [...document.querySelectorAll('div, section, aside, form, [role=dialog]')].filter((e) => vis(e) && !e.matches(OPENER) && !e.querySelector(OPENER) &&
    [...e.querySelectorAll('button')].some((b) => vis(b) && text(b) === '확인') && [...e.querySelectorAll(ITEM)].some((x) => vis(x) && text(x) === want));
  boxes.sort((a, b) => text(a).length - text(b).length);
  return boxes[0] || null;
};
const wait = (max, why) => { st.tries++; return st.tries > max ? fail(why) : false; };
const go = (phase) => { st.phase = phase; st.tries = 0; return false; };
if (st.phase === 0) {
  if (popup()) return go(1);
  /* 발행 창은 주제 팝업이 열리면 팝업으로 바뀌므로, 발행 창이 필요한 것은 이 첫 단계뿐이다 */
  const R = ${rootJs};
  if (!R) return false;
  const c = catControl(R);
  if (!c) return fail('주제 칸을 찾지 못했습니다');
  if (c.sel) {
    const o = [...c.sel.options].find((x) => text(x) === want);
    if (!o) return fail('주제 "' + want + '"이(가) 목록에 없습니다');
    setValue(c.sel, o.value);
    window.__bwTop = null;
    return true;
  }
  c.btn.click();
  return go(1);
}
if (st.phase === 1) {
  const box = popup();
  if (!box) return wait(12, '주제 팝업에서 "' + want + '"을(를) 찾지 못했습니다');
  const cand = [...box.querySelectorAll(ITEM)].filter((x) => vis(x) && text(x) === want);
  cand.find((x) => !cand.some((o) => o !== x && x.contains(o))).click();
  return go(2);
}
if (st.phase === 2) {
  const box = popup();
  if (!box) return go(3);
  [...box.querySelectorAll('button')].find((b) => vis(b) && text(b) === '확인').click();
  return go(3);
}
if (popup()) return wait(24, '주제 팝업이 닫히지 않았습니다');
/* 확인을 누르면 팝업이 닫히고 발행 창으로 돌아온다. 돌아올 때까지 기다린다 */
if (!(${rootJs})) return wait(24, '주제를 고른 뒤 발행 창으로 돌아오지 않았습니다');
window.__bwTop = null;
return true;`,
  },
];

/**
 * 네이버 발행 창 단계에 카테고리와 주제 고르기를 끼운다. 네이버는 둘 다 발행 창에서 고르므로 임시저장만이면 하지 않는다.
 * 발행 창을 연 바로 뒤(예약·발행 시간 고르기 전)에 넣는다. 둘 다 못 골라도 멈추지 않는다.
 */
export function naverStepsWithOptions(req: PublishRequest): PublishStep[] {
  const steps = naverPublishSteps(req);
  if (req.mode === "draft") return steps;
  const extra = [...(req.category ? selectCategorySteps(req.category.name, "layer()") : []), ...(req.topic ? selectTopicSteps(req.topic, "layer()") : [])];
  steps.splice(1, 0, ...extra);
  return steps;
}

/** Claude in Chrome 프롬프트의 카테고리 안내. 고른 카테고리가 없으면 빈 문자열 */
export function categoryPrompt(platform: Exclude<Platform, "wordpress">, category: BlogCategory | undefined, mode: PublishMode, topic?: string): string {
  const topicLine = platform === "naver" && mode !== "draft" && topic ? `\n- 발행 창의 "주제" 설정을 눌러 팝업이 열리면 "${topic}"을(를) 고르고 팝업의 "확인" 버튼을 눌러 팝업을 닫으세요. 목록에 없으면 주제는 비워 두고 problems에 적으세요.` : "";
  if (!category) return topicLine ? `## 주제${topicLine}` : "";
  const where =
    platform === "tistory"
      ? `글쓰기 화면 위쪽의 카테고리 선택에서 "${category.name}"을(를) 고르세요. 임시저장하기 전에 고릅니다.`
      : mode === "draft"
        ? `네이버는 카테고리를 발행 창에서만 고를 수 있으므로 이번 임시저장에서는 고르지 않습니다.`
        : `발행 창의 카테고리에서 "${category.name}"을(를) 고르세요.`;
  return `## 카테고리
${where}
- 목록에 그 이름이 없거나 고를 수 없으면 기본 카테고리로 두고 계속 진행하되, problems에 "카테고리 선택 못 함"과 이유를 적으세요.${topicLine}`;
}
