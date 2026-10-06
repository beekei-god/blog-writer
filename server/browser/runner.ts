import { chromium, type BrowserContext, type Page } from "playwright-core";
import type { Post, PostSettings } from "../../shared/types";
import { CHROME_PROFILE_DIR, DATA_DIR } from "../store";
import { ADAPTERS } from "./adapters";
import { closeLoginWindow, isLoginWindowOpen } from "./loginWindow";
import { CURSOR_OVERLAY_SCRIPT, HumanMouse } from "./mouse";

/**
 * 예전 자동 조작 방식. Claude in Chrome이 안전 정책으로 막는 블로그(예: 네이버)에만 쓴다.
 * 앱 전용 크롬 프로필(data/chrome-profile)을 띄워 마우스·키보드로 입력한다.
 */
let active: BrowserContext | null = null;
let running = 0;

export interface ChromeSession {
  page: Page;
  mouse: HumanMouse;
}

/** 자동 조작이 크롬을 쓰고 있는지 (로그인 창을 열면 그 작업이 깨진다) */
export const isAutomationRunning = () => running > 0;

/** 작업이 끝난 뒤 남겨 둔 자동 조작 크롬 창을 닫는다 (같은 프로필로 로그인 창을 열기 전에). */
export async function closeAutomationWindow() {
  if (active) await active.close().catch(() => {});
}

/**
 * 설치된 크롬을 전용 프로필(로그인 유지)로 띄워 작업을 실행한다.
 * 같은 프로필을 두 번 열 수 없으므로 호출자는 직렬로 실행해야 한다.
 * keepOpen=true면 작업 후에도 창을 남겨 사용자가 결과를 확인/발행할 수 있게 한다.
 */
export async function withChrome<T>(
  fn: (s: ChromeSession) => Promise<T>,
  opts: { keepOpen?: boolean; log?: (m: string) => void } = {},
): Promise<T> {
  running++;
  try {
    return await runWithChrome(fn, opts);
  } finally {
    running--;
  }
}

async function runWithChrome<T>(fn: (s: ChromeSession) => Promise<T>, opts: { keepOpen?: boolean; log?: (m: string) => void }): Promise<T> {
  if (active) await active.close().catch(() => {});
  // 같은 프로필을 두 프로세스가 동시에 열 수 없으므로, 로그인 창이 열려 있으면 닫고 진행한다.
  if (isLoginWindowOpen()) {
    opts.log?.("로그인 창을 닫고 진행합니다.");
    await closeLoginWindow();
  }

  const context = await chromium.launchPersistentContext(CHROME_PROFILE_DIR, {
    channel: "chrome",
    headless: process.env.BW_HEADLESS === "1", // 테스트용: 창 없이 실행

    viewport: null,
    args: ["--start-maximized", "--disable-blink-features=AutomationControlled"],
    // Playwright 기본값 중
    // - --enable-automation: "자동화 도구가 조종 중" 표시. 사이트 로그인이 이 표시 때문에 막힐 수 있다.
    // - --use-mock-keychain / --password-store=basic: 쿠키를 가짜 키로 암호화해서 로그인 창(일반 크롬)에서
    //   한 로그인을 읽지 못한다. 시스템 키체인을 쓰게 해서 두 창이 같은 로그인을 공유하게 한다.
    ignoreDefaultArgs: ["--enable-automation", "--use-mock-keychain", "--password-store=basic"],
    acceptDownloads: true,
  });
  active = context;
  context.on("close", () => {
    if (active === context) active = null;
  });
  await context.addInitScript(CURSOR_OVERLAY_SCRIPT);

  const page = context.pages()[0] ?? (await context.newPage());
  const mouse = new HumanMouse(page);

  try {
    const result = await fn({ page, mouse });
    if (!opts.keepOpen) await context.close().catch(() => {});
    return result;
  } catch (err) {
    await page.screenshot({ path: `${DATA_DIR}/last-error.png` }).catch(() => {});
    if (!opts.keepOpen) await context.close().catch(() => {});
    throw err;
  }
}

export function postWithChrome(post: Post, jobId: string, settings: PostSettings, log: (m: string) => void) {
  if (settings.platform === "wordpress") throw new Error("워드프레스는 크롬이 아니라 REST API로 올립니다.");
  const adapter = ADAPTERS[settings.platform];
  return withChrome(({ page, mouse }) => adapter({ page, mouse, post, jobId, settings, log }), {
    keepOpen: true,
    log,
  });
}
