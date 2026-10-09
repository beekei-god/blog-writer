import { NAVER_MINUTE_STEP, type BlogCategory, type PublishMode } from "../../shared/types";
import { throwIfCancelled } from "../cancel";
import { sleep } from "../fsutil";

/**
 * 크롬으로 올리는 블로그(네이버·티스토리)의 예약발행·자동발행.
 * 늘 임시저장을 먼저 끝낸 뒤 발행 창을 연다. 발행 창은 클래스 이름이 자주 바뀌므로 화면 글자(발행·예약·공개)로 찾고,
 * 예약 날짜·시각은 넣은 뒤 다시 읽어 요청과 같을 때만 마지막 발행 버튼을 누른다. 필수 단계가 안 되면 멈추고 PublishStepError를 낸다
 * (글은 임시저장된 채로 남는다). 카테고리·주제 고르기는 optional이라 안 돼도 멈추지 않고 "확인 필요"로 남긴다.
 */

export interface PublishRequest {
  mode: PublishMode;
  /** 예약발행 시각 (ISO, UTC) */
  scheduledAt?: string;
  /** 고른 카테고리 (이름으로 에디터에서 고른다). 없으면 블로그 기본 */
  category?: BlogCategory;
  /** 네이버 블로그의 "주제" (발행 창에서 이름으로 고른다. 글 내용을 보고 Claude가 정한다). 네이버에만 있다 */
  topic?: string;
}

/** 임시저장은 끝났지만 발행 창에서 멈춘 경우. 글은 블로그에 임시저장된 채로 남는다 */
export class PublishStepError extends Error {
  /** 멈춘 순간의 발행 창 구조 (버튼·입력 칸과 짧은 글자). 발행 창 단계를 실제 화면에 맞게 고칠 때 쓴다 */
  dialog?: string;
}

/**
 * 멈춘 순간의 화면 구조를 읽는 스크립트 (동기, 문자열을 돌려준다).
 * 버튼·입력 칸·이름표·목록 항목과 "공개/발행/예약/현재/시간/날짜/카테고리/주제"가 들어간 짧은 글자만 모은다. 글 본문(편집 영역)은 읽지 않는다.
 */
export const PUBLISH_DUMP_JS = `
const docs = [document, ...[...document.querySelectorAll('iframe')].map((f) => { try { return f.contentDocument; } catch (e) { return null; } }).filter(Boolean)];
const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') +
  (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).join('.') : '') +
  (e.type ? ' type=' + e.type : '') + (e.name ? ' name=' + e.name : '') + (e.htmlFor ? ' for=' + e.htmlFor : '') +
  (e.checked ? ' checked' : '') + (e.disabled ? ' disabled' : '') + (e.getAttribute('role') ? ' role=' + e.getAttribute('role') : '') +
  (e.getAttribute('aria-checked') ? ' aria-checked=' + e.getAttribute('aria-checked') : '') +
  (e.getAttribute('aria-label') ? ' aria-label="' + e.getAttribute('aria-label').slice(0, 30) + '"' : '');
const out = [];
for (const d of docs) for (const el of d.querySelectorAll('*')) {
  if (!(el.getClientRects().length > 0) || getComputedStyle(el).visibility === 'hidden' || el.closest('[contenteditable="true"], .se-content, .se-main-container')) continue;
  const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').slice(0, 30);
  const control = /^(BUTTON|INPUT|SELECT|LABEL|LI|OPTION)$/.test(el.tagName) || el.getAttribute('role');
  if (control || /공개|발행|예약|현재|시간|날짜|카테고리|주제/.test(own)) out.push(desc(el) + (own ? ' "' + own + '"' : ''));
  if (out.length >= 250) break;
}
return location.host + location.pathname + '\\n' + out.join('\\n');`;

/** 예약 시각을 한국 시간의 연·월·일·시·분으로 */
export function kstParts(iso: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), hour: Number(p.hour), minute: Number(p.minute) };
}

/** 사람이 읽는 예약 시각 ("2026.10.10 09:30") */
export function kstText(iso: string) {
  const t = kstParts(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.y}.${pad(t.m)}.${pad(t.d)} ${pad(t.hour)}:${pad(t.minute)}`;
}

/**
 * 발행 창 조작 한 단계. js는 페이지 안에서 동기로 실행되며 (HELPERS를 앞에 붙인다)
 * true면 다음 단계로, false·null이면 잠시 뒤 다시 실행, "ERR:<이유>"면 바로 멈춘다.
 */
export interface PublishStep {
  name: string;
  js: string;
  timeoutMs?: number;
  /** 실행 중 오류를 "아직"으로 보고 다시 실행한다 (발행 뒤 페이지가 이동하는 동안에는 실행이 실패한다) */
  retryOnError?: boolean;
  /** 마지막 발행 버튼을 누르는 단계. 이 단계가 끝나면 이미 발행됐을 수 있어 중지 요청을 받지 않는다 */
  publishes?: boolean;
  /** 이 단계가 안 되어도 멈추지 않고 "확인 필요"로 남기고 넘어간다 (예: 카테고리 고르기. 기본 카테고리로 올라간다) */
  optional?: boolean;
  /** 이 단계가 안 됐을 때 뒤처리 스크립트 (예: 열려 있는 팝업 닫기). 실패해도 무시한다 */
  cleanupJs?: string;
}

/** 페이지 안에서 쓰는 도우미: 보이는 요소, 글자로 찾기, 숫자만 뽑기, 발행 창, 값 넣기 */
export const PUBLISH_HELPERS = `
/* 보이는 요소: 화면에 그려지고(display:none 아님) 숨김 처리가 아닌 것. offsetParent는 position:fixed 요소(대개 팝업·모달)에서 null이라 쓰지 않는다 */
const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
const text = (e) => (e.innerText || e.textContent || '').replace(/\\s+/g, ' ').trim();
const byText = (sel, re, root) => [...(root || document).querySelectorAll(sel)].find((e) => vis(e) && re.test(text(e)));
const nums = (s) => ((s || '').match(/\\d+/g) || []).map(Number);
/* 발행 창을 여는 버튼 (화면 위쪽·아래쪽 막대). 누를 때 표시를 남긴다 */
const OPENER = 'button[class*="publish_btn"], #publish-layer-btn, [data-bw-opener]';
/* 발행 창: 여는 버튼은 들어 있지 않고, 마지막 발행 버튼과 공개·예약·발행 시간 글자를 함께 가진 가장 작은 보이는 상자.
   여는 버튼이 든 상자(위쪽 막대 등)를 발행 창으로 잘못 고르지 않게 한다. */
const layer = () => {
  const boxes = [...document.querySelectorAll('div, section, form, aside, [role=dialog]')].filter((e) =>
    vis(e) && !e.matches(OPENER) && !e.querySelector(OPENER) && /공개|예약|발행\\s*시간|발행일/.test(text(e)) &&
    [...e.querySelectorAll('button')].some((b) => vis(b) && /발행$/.test(text(b))));
  boxes.sort((a, b) => text(a).length - text(b).length);
  return boxes[0] || null;
};
/* 라디오·체크 상자를 그 이름표 글자로 고른다. 이미 골라져 있으면 그대로 */
const pick = (root, re) => {
  const lab = byText('label', re, root);
  const input = lab && (lab.control || lab.querySelector('input') || (lab.htmlFor && root.ownerDocument.getElementById(lab.htmlFor)));
  if (input && input.checked) return true;
  // 이름표가 없으면 같은 글자를 가진 요소 중 가장 안쪽 요소를 누른다 (바깥 상자를 누르면 선택되지 않을 수 있다)
  const all = [...root.querySelectorAll('button, [role=radio], [role=tab], [role=option], span, a, li, p, div')].filter((e) => vis(e) && re.test(text(e)));
  const target = lab || all.find((e) => !all.some((o) => o !== e && e.contains(o)));
  if (!target) return null;
  target.click();
  return input ? input.checked : true;
};
/* React가 바뀐 값을 알아채도록 원래 setter로 넣고 이벤트를 보낸다 */
const setValue = (el, v) => {
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
/* 시·분 칸 (select 또는 input). 이름에 hour/minute가 있으면 그것, 없으면 보이는 순서대로 */
const timeFields = (root) => {
  const all = [...root.querySelectorAll('select, input')].filter((e) => vis(e) && e.type !== 'radio' && e.type !== 'checkbox');
  const named = (re) => all.find((e) => re.test((e.className || '') + ' ' + (e.name || '') + ' ' + (e.id || '') + ' ' + (e.getAttribute('aria-label') || '')));
  const hour = named(/hour|시/i);
  const minute = named(/minute|min\\b|분/i);
  if (hour && minute) return { hour, minute };
  const sels = all.filter((e) => e.tagName === 'SELECT');
  return sels.length >= 2 ? { hour: sels[sels.length - 2], minute: sels[sels.length - 1] } : { hour: null, minute: null };
};
const fieldNum = (el) => (el.tagName === 'SELECT' ? nums(el.selectedOptions[0] ? el.selectedOptions[0].text : el.value)[0] : nums(el.value)[0]);
/* 숫자 n을 select·input에 넣는다 */
const setNum = (el, n) => {
  if (el.tagName === 'SELECT') {
    const opt = [...el.options].find((o) => nums(o.text)[0] === n || nums(o.value)[0] === n);
    if (!opt) return false;
    setValue(el, opt.value);
  } else setValue(el, String(n).padStart(2, '0'));
  return fieldNum(el) === n;
};
/* 날짜 칸: 값에 연·월·일 숫자가 들어 있는 보이는 input */
const dateField = (root) => [...root.querySelectorAll('input')].find((e) => vis(e) && (/date|날짜/i.test((e.className || '') + (e.name || '') + (e.id || '') + (e.placeholder || '')) || /^\\d{4}\\D+\\d{1,2}\\D+\\d{1,2}/.test(e.value)));
`;

const err = (msg: string) => `return ${JSON.stringify("ERR:" + msg)};`;

/** 예약 날짜·시·분을 맞추고 다시 읽어 확인하는 단계 (네이버·티스토리 공통). 달력은 다음 달로 넘기며 날짜를 누른다 */
function scheduleSteps(iso: string, minuteStep: number): PublishStep[] {
  const t = kstParts(iso);
  if (t.minute % minuteStep) throw new PublishStepError(`이 블로그의 예약 시각은 ${minuteStep}분 단위로만 고를 수 있습니다.`);
  const want = JSON.stringify(t);
  return [
    {
      name: "예약 날짜 입력",
      timeoutMs: 20_000,
      js: `
const L = layer(); if (!L) ${err("발행 창이 닫혔습니다")}
const w = ${want};
const inp = dateField(L); if (!inp) ${err("예약 날짜 칸을 찾지 못했습니다")}
const cur = nums(inp.value);
if (cur[0] === w.y && cur[1] === w.m && cur[2] === w.d) return true;
if (!inp.readOnly) { setValue(inp, w.y + '-' + String(w.m).padStart(2, '0') + '-' + String(w.d).padStart(2, '0')); const v = nums(inp.value); if (v[0] === w.y && v[1] === w.m && v[2] === w.d) return true; }
/* 읽기 전용 날짜 칸은 달력으로 고른다 */
const cal = [...L.ownerDocument.querySelectorAll('[class*="calendar"], [class*="datepicker"], [class*="DatePicker"], [role=grid]')].find(vis);
if (!cal) { inp.click(); return false; }
const head = nums((text(cal).match(/\\d{4}\\D{1,3}\\d{1,2}/) || [''])[0]);
if (head.length >= 2 && head[0] * 12 + head[1] < w.y * 12 + w.m) {
  const next = [...cal.querySelectorAll('button, a')].find((b) => vis(b) && /다음|next/i.test(text(b) + ' ' + (b.className || '') + ' ' + (b.getAttribute('aria-label') || '')));
  if (!next) ${err("달력에서 다음 달로 넘기지 못했습니다")}
  next.click(); return false;
}
if (head.length >= 2 && head[0] * 12 + head[1] > w.y * 12 + w.m) ${err("달력이 예약할 달보다 뒤에 있습니다")}
const day = [...cal.querySelectorAll('button, a, td')].find((e) => vis(e) && text(e) === String(w.d) && !/disable|other|prev|next|dimmed/i.test((e.className || '') + ' ' + ((e.parentElement && e.parentElement.className) || '')) && !e.disabled);
if (!day) ${err("달력에서 예약 날짜를 고를 수 없습니다 (지난 날짜이거나 고를 수 없는 날짜)")}
day.click(); return false;`,
    },
    {
      name: "예약 시각 입력",
      js: `
const L = layer(); if (!L) ${err("발행 창이 닫혔습니다")}
const w = ${want};
const f = timeFields(L);
if (!f.hour || !f.minute) ${err("예약 시·분 칸을 찾지 못했습니다")}
if (!setNum(f.hour, w.hour)) ${err("예약 시를 고르지 못했습니다")}
if (!setNum(f.minute, w.minute)) ${err("예약 분을 고르지 못했습니다")}
return true;`,
    },
    {
      name: "예약 시각 확인",
      js: `
const L = layer(); if (!L) ${err("발행 창이 닫혔습니다")}
const w = ${want};
const d = nums((dateField(L) || {}).value);
const f = timeFields(L);
const got = [d[0], d[1], d[2], f.hour && fieldNum(f.hour), f.minute && fieldNum(f.minute)];
if (got[0] !== w.y || got[1] !== w.m || got[2] !== w.d || got[3] !== w.hour || got[4] !== w.minute) {
  return 'ERR:발행 창의 예약 시각(' + got.join(',') + ')이 요청한 시각과 달라 발행하지 않았습니다';
}
return true;`,
    },
  ];
}

/** 마지막 발행 버튼을 누르고, 글쓰기 화면을 벗어나는지(발행됨) 확인한다 */
function finishSteps(finalButton: string, writePage: RegExp): PublishStep[] {
  return [
    {
      name: "발행 버튼 누르기",
      publishes: true,
      js: `
const L = layer(); if (!L) ${err("발행 창이 닫혔습니다")}
const b = ${finalButton};
if (!b || b.disabled) ${err("발행 창의 발행 버튼을 찾지 못했습니다")}
b.click(); return true;`,
    },
    {
      name: "발행 확인",
      timeoutMs: 30_000,
      retryOnError: true,
      js: `return !${writePage}.test(location.href);`,
    },
  ];
}

/**
 * 네이버 블로그 (SmartEditor ONE): 상단 "발행" → 발행 창에서 예약이면 발행 시간 "예약"과 날짜·시각 → 창 아래 "발행".
 * 공개 설정은 바꾸지 않고 블로그에 정해 둔 값을 그대로 쓴다 (실제 발행 창에서 "전체공개" 칸을 찾지 못해 멈춘 적이 있다).
 */
export function naverPublishSteps(req: PublishRequest): PublishStep[] {
  return [
    {
      name: "발행 창 열기",
      js: `
if (layer()) return true;
const b = document.querySelector('button[class*="publish_btn"]') || byText('button', /^발행$/);
if (!b) ${err("상단의 발행 버튼을 찾지 못했습니다")}
b.setAttribute('data-bw-opener', '1'); b.click(); return false;`,
    },
    req.mode === "schedule"
      ? { name: "예약 고르기", js: `const L = layer(); if (!L) return false; const r = pick(L, /^예약$/); if (r === null) ${err("발행 시간의 예약을 찾지 못했습니다")} return r && !!dateField(L);` }
      : { name: "현재 시각 발행 고르기", js: `const L = layer(); if (!L) return false; const r = pick(L, /^현재$/); return r === null ? true : r;` },
    ...(req.mode === "schedule" ? scheduleSteps(req.scheduledAt!, NAVER_MINUTE_STEP) : []),
    ...finishSteps(`L.querySelector('button[class*="confirm_btn"]') || [...L.querySelectorAll('button')].reverse().find((x) => vis(x) && /^발행$/.test(text(x)))`, /postwrite|GoBlogWrite|Redirect=Write/),
  ];
}

/** 티스토리: 하단 "완료" → 발행 창에서 공개, 예약이면 "예약"과 날짜·시각 → "공개 발행"(예약이면 "예약 발행"일 수 있다) */
export function tistoryPublishSteps(req: PublishRequest): PublishStep[] {
  return [
    {
      name: "발행 창 열기",
      js: `
if (layer()) return true;
const b = document.querySelector('#publish-layer-btn') || byText('button', /^완료$/);
if (!b) ${err("하단의 완료 버튼을 찾지 못했습니다")}
b.setAttribute('data-bw-opener', '1'); b.click(); return false;`,
    },
    { name: "공개 고르기", js: `const L = layer(); if (!L) return false; const r = pick(L, /^공개$/); if (r === null) ${err("공개 설정의 공개를 찾지 못했습니다")} return r;` },
    ...(req.mode === "schedule"
      ? [
          { name: "예약 고르기", js: `const L = layer(); if (!L) return false; const r = pick(L, /^예약$/); if (r === null) ${err("발행일의 예약을 찾지 못했습니다")} return r && !!dateField(L);` },
          ...scheduleSteps(req.scheduledAt!, 1),
        ]
      : [{ name: "현재 발행 고르기", js: `const L = layer(); if (!L) return false; const r = pick(L, /^현재$/); return r === null ? true : r;` }]),
    ...finishSteps(`L.querySelector('#publish-btn') || [...L.querySelectorAll('button')].reverse().find((x) => vis(x) && /(공개|예약)?\\s*발행$/.test(text(x)))`, /manage\/newpost|manage\/post\//),
  ];
}

/**
 * 단계를 차례로 실행한다. exec는 단계의 js를 페이지에서 실행해 결과를 돌려준다 (HELPERS는 exec가 붙인다).
 * 단계마다 timeoutMs(기본 10초) 안에 true가 되지 않거나 "ERR:"이면 PublishStepError.
 * 마지막 발행 버튼을 누르기 전까지는 단계마다 중지 요청을 확인한다 (누른 뒤에는 이미 발행됐을 수 있어 끝까지 확인한다).
 */
export async function runPublishSteps(
  steps: PublishStep[],
  exec: (js: string) => Promise<unknown>,
  log: (m: string) => void,
  intervalMs = 500,
  /** optional 단계가 안 됐을 때 "확인 필요" 문구를 모은다 */
  problems?: string[],
) {
  let clicked = false;
  // 단계가 안 됐을 때: 필수면 멈추고, optional이면 이유와 화면 구조를 로그에 남기고 다음 단계로 간다.
  const fail = async (step: PublishStep, why: string) => {
    const e = await withDialog(new PublishStepError(stepError(step.name, why)), exec);
    if (step.cleanupJs) await exec(step.cleanupJs).catch(() => {}); // 화면 구조를 읽은 뒤 열려 있는 팝업·목록을 닫는다
    if (!step.optional) throw e;
    problems?.push(`${step.name}: ${why}`);
    log(`${step.name}을(를) 하지 못해 넘어갑니다: ${why}`);
    if (e.dialog) log(`화면 구조 (문제 확인용, 글 본문은 빠짐):\n${e.dialog}`);
  };
  for (const step of steps) {
    if (!clicked) throwIfCancelled();
    log(`발행 창: ${step.name}`);
    const deadline = Date.now() + (step.timeoutMs ?? 10_000);
    for (;;) {
      const r = await exec(step.js).catch((e) => {
        if (step.retryOnError) return null;
        throw e;
      });
      if (r === true) {
        if (step.publishes) clicked = true;
        break;
      }
      if (typeof r === "string" && r.startsWith("ERR:")) {
        await fail(step, r.slice(4));
        break;
      }
      if (Date.now() > deadline) {
        await fail(step, "시간 안에 끝나지 않았습니다");
        break;
      }
      if (!clicked) throwIfCancelled();
      await sleep(intervalMs);
    }
  }
}

/** 멈춘 순간의 화면 구조를 오류에 붙인다 (읽지 못해도 원래 오류는 그대로 낸다) */
async function withDialog(e: PublishStepError, exec: (js: string) => Promise<unknown>) {
  const dump = await exec(PUBLISH_DUMP_JS).catch(() => null);
  if (typeof dump === "string" && dump) e.dialog = dump;
  return e;
}

const stepError = (name: string, why: string) =>
  name === "발행 확인"
    ? `발행 버튼을 눌렀지만 발행됐는지 확인하지 못했습니다. 블로그에서 글이 공개·예약됐는지 직접 확인하세요. (${why})`
    : `임시저장은 했지만 발행 창의 "${name}"에서 멈췄습니다: ${why}. 크롬에 열린 탭에서 직접 발행하세요.`;

/** 결과 문구: "발행했습니다" / "2026.10.10 09:30에 발행되도록 예약했습니다" */
export const publishedText = (req: PublishRequest) =>
  req.mode === "schedule" ? `${kstText(req.scheduledAt!)}(한국 시간)에 발행되도록 예약했습니다` : "발행했습니다";

/** Claude in Chrome 프롬프트에 넣는 발행 안내. 임시저장만이면 빈 문자열 */
export function publishPrompt(platform: "naver" | "tistory", req: PublishRequest): string {
  if (req.mode === "draft") return "";
  const how =
    platform === "naver"
      ? `- 상단 "발행" 버튼을 눌러 발행 창을 엽니다 (태그는 본문 끝에 이미 있으니 발행 창의 태그 칸은 비워 둡니다).
- 공개 설정은 바꾸지 않습니다 (블로그에 정해 둔 값 그대로).`
      : `- 하단 "완료" 버튼을 눌러 발행 창을 엽니다.
- 공개 설정은 "공개"를 고릅니다.`;
  const when =
    req.mode === "schedule"
      ? (() => {
          const t = kstParts(req.scheduledAt!);
          return `- 발행 시간(발행일)에서 "예약"을 고르고 날짜 ${t.y}년 ${t.m}월 ${t.d}일, 시각 ${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")} (한국 시간)으로 맞춥니다.
- 마지막 버튼을 누르기 전에 발행 창에 보이는 예약 날짜·시각을 다시 읽어 위 시각과 정확히 같은지 확인하세요. 다르거나 맞출 수 없으면 발행 버튼을 누르지 말고 status를 "saved"로, problems에 이유를 적으세요.`;
        })()
      : `- 발행 시간(발행일)은 "현재"(즉시 발행)로 둡니다.`;
  const done = req.mode === "schedule" ? "scheduled" : "published";
  return `## 발행 (사용자가 확인 창에서 직접 요청함)
이번 글은 임시저장이 끝난 뒤 ${req.mode === "schedule" ? "예약발행" : "즉시 발행"}까지 합니다. 위 브라우저 규칙의 "글 발행 금지"는 이 절차에 한해 예외입니다. 이 절차 밖에서는 아무것도 발행하지 마세요.
- 먼저 임시저장을 끝내고 저장 완료를 확인한 뒤 진행하세요.
- 본문 입력에서 problems에 적을 문제가 있어도 발행은 진행하세요. 그 문제는 problems에 적으면 사용자가 나중에 확인합니다.
${how}
${when}
- 발행 창 아래의 마지막 발행 버튼을 한 번만 누르고, 글쓰기 화면을 벗어나는지(글 보기·글 목록으로 이동) 확인하세요.
- 끝까지 했으면 status를 "${done}"로 돌려주세요. 발행 창에서 멈췄으면 "saved"로 두고 problems에 이유를 적으세요.`;
}
