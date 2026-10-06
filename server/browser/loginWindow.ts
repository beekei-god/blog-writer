import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CHROME_PROFILE_DIR } from "../store";

/**
 * 자동화 없이 띄우는 "로그인 창". 자동 조작이 쓰는 크롬 프로필(data/chrome-profile)을 그대로 쓰므로
 * 여기서 블로그에 로그인하면 이후 자동 조작에서도 로그인 상태가 유지된다.
 */
let proc: ChildProcess | null = null;
/** 지금 열린 로그인 창이 어느 블로그용인지 */
let procFor: string | null = null;

function chromePath(): string | null {
  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          path.join(os.homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        ]
      : process.platform === "win32"
        ? [
            path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
            path.join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
            path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome"];
  if (process.env.CHROME_PATH) candidates.unshift(process.env.CHROME_PATH);
  return candidates.find((p) => p && fs.existsSync(p)) ?? null;
}

export const isLoginWindowOpen = () => proc !== null;
export const loginWindowFor = () => (proc ? procFor : null);

export function openLoginWindow(urls: string[], forBlog: string) {
  if (proc) throw new Error("로그인 창이 이미 열려 있습니다.");
  const exe = chromePath();
  if (!exe) throw new Error("Google Chrome을 찾을 수 없습니다. 크롬을 설치하거나 .env에 CHROME_PATH를 지정하세요.");
  fs.mkdirSync(CHROME_PROFILE_DIR, { recursive: true });
  const child = spawn(exe, [`--user-data-dir=${CHROME_PROFILE_DIR}`, "--no-first-run", "--no-default-browser-check", "--new-window", ...urls], {
    stdio: "ignore",
  });
  proc = child;
  procFor = forBlog;
  child.on("exit", () => {
    if (proc === child) proc = null;
  });
  child.on("error", () => {
    if (proc === child) proc = null;
  });
}

/** 로그인 창을 닫는다 (macOS에서는 창을 닫아도 크롬이 남아 있으므로 프로세스를 종료한다). */
export async function closeLoginWindow(): Promise<void> {
  const child = proc;
  if (!child) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM"); // 크롬은 SIGTERM을 받으면 쿠키를 저장하고 정상 종료한다
  const timer = setTimeout(() => child.kill("SIGKILL"), 10_000);
  await exited;
  clearTimeout(timer);
  // 프로필 잠금이 풀릴 시간을 조금 준다
  await new Promise((r) => setTimeout(r, 800));
}
