import { Router } from "express";
import { z } from "zod";
import { errorText, PLATFORM_SHORT_LABEL } from "../../shared/labels";
import { settingsFor, type Platform, type PostSettings } from "../../shared/types";
import { clearBlocked, getBlockedSites } from "../browser/blockedSites";
import { EXTENSION_OPTIONS_URL, extensionStatus, INSTALL_URL, rememberConnection } from "../browser/claudeChrome";
import { closeLoginWindow, isLoginWindowOpen, loginWindowFor, openInUserChrome, openLoginWindow } from "../browser/loginWindow";
import { closeAutomationWindow, isAutomationRunning } from "../browser/runner";
import { userChromeSupported } from "../browser/userChrome";
import { runClaude } from "../claude";
import { getSettings } from "../store";
import { wrap } from "./util";

/** Claude in Chrome 확장, 확장이 막는 블로그, 자동 조작 크롬의 로그인 창 */
export const router = Router();

// ───── Claude in Chrome 확장 프로그램 ─────
// Claude in Chrome 확장 프로그램의 로그인(설정) 화면을 평소 쓰는 크롬에서 연다.
// 확장 프로그램이 설치되어 있지 않으면 설치 페이지를 대신 연다 (opened: "install").
router.post(
  "/api/chrome-extension/open-options",
  wrap(async (_req, res) => {
    const installed = (await extensionStatus()).installed;
    try {
      openInUserChrome(installed ? EXTENSION_OPTIONS_URL : INSTALL_URL);
    } catch (e) {
      return void res.status(400).json({ error: errorText(e) });
    }
    res.json({ ok: true, opened: installed ? "options" : "install" });
  }),
);
router.get("/api/chrome-extension", wrap(async (_req, res) => res.json({ ...(await extensionStatus()), installUrl: INSTALL_URL })));

// 실제로 연결되는지 확인: Haiku로 연결된 브라우저 목록만 조회한다 (화면은 조작하지 않음).
let checkingExtension = false;
router.post(
  "/api/chrome-extension/check",
  wrap(async (_req, res) => {
    const status = await extensionStatus();
    if (!status.installed) {
      rememberConnection(false, "확장 프로그램이 설치되어 있지 않습니다.");
      return void res.json({ ...(await extensionStatus()), installUrl: INSTALL_URL });
    }
    if (checkingExtension) return void res.status(409).json({ error: "이미 확인 중입니다." });
    checkingExtension = true;
    try {
      const r = await runClaude<{ connected: boolean; detail: string }>({
        system: "Call mcp__claude-in-chrome__tabs_context_mcp exactly once with createIfEmpty false, then report. Do not navigate or click.",
        prompt: "Is the Claude in Chrome browser extension connected? connected=true if the tool returned tab or tab-group information (even an empty group), false if it returned a connection error. detail: the error text if any (short).",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["connected", "detail"],
          properties: { connected: { type: "boolean" }, detail: { type: "string" } },
        },
        effort: "low",
        timeoutMs: 90_000,
        stage: "check",
        model: "haiku",
        chrome: true,
      });
      rememberConnection(r.connected, r.connected ? null : r.detail || "연결되지 않았습니다.");
    } catch (e) {
      // 연결 오류는 runClaude가 기록해 둔다. 그 밖의 오류는 상세로 남긴다.
      if (!(e instanceof Error && /확장 프로그램/.test(e.message))) rememberConnection(false, errorText(e));
    } finally {
      checkingExtension = false;
    }
    res.json({ ...(await extensionStatus()), installUrl: INSTALL_URL });
  }),
);

// ───── Claude in Chrome이 막는 블로그: 자동 조작용 크롬 ─────
// 막힌 플랫폼마다 실제로 쓰는 대체 경로도 알려 준다 (pipeline.doPost와 같은 기준).
router.get(
  "/api/blocked-sites",
  wrap(async (_req, res) => {
    const blocked = await getBlockedSites();
    const withRoute = Object.fromEntries(
      Object.entries(blocked).map(([p, v]) => [p, { ...v, fallback: p === "naver" && userChromeSupported() ? "user-chrome" : "app-chrome" }]),
    );
    res.json(withRoute);
  }),
);
router.delete(
  "/api/blocked-sites",
  wrap(async (_req, res) => {
    await clearBlocked();
    res.json({});
  }),
);

function blogLoginUrl(s: PostSettings): string {
  if (s.platform === "naver") return `https://nid.naver.com/nidlogin.login?url=${encodeURIComponent(`https://blog.naver.com/${s.blogId}`)}`;
  return "https://www.tistory.com/auth/login";
}

// 로그인 창: 자동 조작이 쓰는 앱 전용 크롬 프로필을 자동화 없이 열어 블로그에 로그인하게 한다.
// platform: 열린 로그인 창이 어느 블로그용인지 (닫혀 있으면 null)
const loginStatus = () => ({ open: isLoginWindowOpen(), platform: loginWindowFor(), automationRunning: isAutomationRunning() });
router.get("/api/browser/login", (_req, res) => {
  res.json(loginStatus());
});
router.post(
  "/api/browser/login",
  wrap(async (req, res) => {
    if (isAutomationRunning()) {
      return void res.status(409).json({ error: "지금 자동 조작으로 작업 중입니다. 작업이 끝난 뒤 로그인 창을 열어 주세요." });
    }
    // 로그인 창은 크롬으로 올리는 블로그(네이버·티스토리)용이고, 어느 블로그인지 요청에서 받는다.
    const p = z.object({ platform: z.enum(["naver", "tistory"]) }).safeParse(req.body ?? {});
    if (!p.success) return void res.status(400).json({ error: "로그인할 블로그(네이버 또는 티스토리)를 고르세요. 워드프레스는 API로 올려서 로그인 창이 필요 없습니다." });
    // 이미 열려 있으면: 같은 블로그면 그대로 두고, 다른 블로그면 먼저 닫게 한다 (창은 하나만 열 수 있다).
    if (isLoginWindowOpen()) {
      if (loginWindowFor() === p.data.platform) return void res.json(loginStatus());
      return void res.status(409).json({ error: `${PLATFORM_SHORT_LABEL[loginWindowFor() as Platform] ?? "다른 블로그"} 로그인 창이 열려 있습니다. 그 창에서 "로그인 완료 (창 닫기)"를 누른 뒤 다시 여세요.` });
    }
    const settings = settingsFor(await getSettings(), p.data.platform);
    if (!settings.blogId) return void res.status(400).json({ error: `먼저 설정에서 ${PLATFORM_SHORT_LABEL[p.data.platform]} 블로그 ID를 입력하세요.` });
    await closeAutomationWindow(); // 작업 후 남겨 둔 자동 조작 창이 같은 프로필을 잡고 있으면 닫는다
    try {
      openLoginWindow([blogLoginUrl(settings)], p.data.platform);
    } catch (e) {
      return void res.status(400).json({ error: errorText(e) });
    }
    res.json(loginStatus());
  }),
);
router.post(
  "/api/browser/login/close",
  wrap(async (_req, res) => {
    await closeLoginWindow();
    res.json(loginStatus());
  }),
);
