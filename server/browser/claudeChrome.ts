import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Claude in Chrome 확장 프로그램 (https://claude.ai/chrome).
 * 블로그 작성과 Gemini·ChatGPT 이미지 생성은 모두 이 확장 프로그램으로, 사용자가 평소 쓰는 크롬에서 진행한다.
 */
export const EXTENSION_ID = "fcoeoabgfenejglbffodgkkbkcdhcgfn";
export const INSTALL_URL = "https://claude.ai/chrome";

export type ExtensionProblem = "not_installed" | "not_connected";

export const EXTENSION_HELP: Record<ExtensionProblem, string> = {
  not_installed:
    "Claude in Chrome 확장 프로그램이 설치되어 있지 않습니다. 크롬에서 https://claude.ai/chrome 을 열어 설치하고, Claude Code와 같은 Claude 계정으로 로그인하세요.",
  not_connected:
    "Claude in Chrome 확장 프로그램에 연결하지 못했습니다. 크롬이 켜져 있는지, 확장 프로그램에 Claude Code와 같은 Claude 계정으로 로그인되어 있는지 확인하세요. 처음 설치했다면 크롬을 완전히 껐다 켜야 할 수 있습니다.",
};

export class ChromeExtensionError extends Error {
  constructor(public problem: ExtensionProblem) {
    super(EXTENSION_HELP[problem]);
  }
}

/** 확장 프로그램이 안전 정책으로 사이트 접속을 막을 때 도구 결과에 들어오는 문구 */
export const SITE_BLOCKED_TEXT = /not allowed due to safety restrictions|site is not allowed/i;

/** Claude in Chrome이 막는 사이트. 이 앱은 이 제한을 우회하지 않고, 예전 자동 조작으로 대신 진행한다. */
export class SiteBlockedError extends Error {
  constructor(public detail: string) {
    super(`Claude in Chrome이 이 사이트 접속을 막았습니다: ${detail}`);
  }
}

/** claude CLI가 확장 프로그램에 연결하지 못했을 때 도구 결과에 들어오는 문구 */
export const NOT_CONNECTED_TEXT = /Browser extension is not connected|extension is not connected|No (connected )?browser/i;

function chromeUserDataDir(): string {
  if (process.platform === "darwin") return path.join(os.homedir(), "Library/Application Support/Google/Chrome");
  if (process.platform === "win32") return path.join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/User Data");
  return path.join(os.homedir(), ".config/google-chrome");
}

/** 확장 프로그램이 설치되어 켜져 있는 크롬 프로필 이름들 (설치 여부만 파일로 확인, 연결 여부는 알 수 없음) */
export async function installedProfiles(): Promise<string[]> {
  const base = chromeUserDataDir();
  let names: string[] = [];
  try {
    const state = JSON.parse(await fs.readFile(path.join(base, "Local State"), "utf8"));
    names = Object.keys(state?.profile?.info_cache ?? {});
  } catch {
    names = ["Default"];
  }
  const found: string[] = [];
  for (const dir of names) {
    for (const file of ["Secure Preferences", "Preferences"]) {
      try {
        const prefs = JSON.parse(await fs.readFile(path.join(base, dir, file), "utf8"));
        const ext = prefs?.extensions?.settings?.[EXTENSION_ID];
        if (ext && !(ext.disable_reasons?.length > 0) && ext.state !== 0) {
          found.push(dir);
          break;
        }
      } catch {
        /* 다음 파일 */
      }
    }
  }
  return found;
}

export interface ExtensionStatus {
  installed: boolean;
  /** 마지막 확인 결과 (확인 전이면 null) */
  connected: boolean | null;
  detail: string | null;
  checkedAt: string | null;
}

let lastCheck: Omit<ExtensionStatus, "installed"> = { connected: null, detail: null, checkedAt: null };

export function rememberConnection(connected: boolean, detail: string | null) {
  lastCheck = { connected, detail, checkedAt: new Date().toISOString() };
}

export async function extensionStatus(): Promise<ExtensionStatus> {
  return { installed: (await installedProfiles()).length > 0, ...lastCheck };
}

/** 작업 전에 설치 여부를 확인한다 (연결 여부는 실제 실행에서 바로 드러난다). */
export async function assertExtensionInstalled() {
  if ((await installedProfiles()).length === 0) throw new ChromeExtensionError("not_installed");
}

/** Claude in Chrome 도구가 실제로 쓰는 프롬프트 공통 규칙 */
export const BROWSER_RULES = `## 브라우저 사용 규칙 (Claude in Chrome)
- 먼저 tabs_context_mcp(createIfEmpty: true)로 탭 그룹을 확인하고, tabs_create_mcp로 이 작업용 새 탭을 만들어 그 탭에서만 작업하세요. 다른 탭은 건드리지 마세요.
- 클릭할 때는 스크린샷이나 find/read_page로 위치를 확인한 뒤 누르세요. 화면 확인은 필요할 때만 하고, 스크린샷은 scale 0.5 정도로 충분합니다.
- 도구를 한 번 부를 때마다 비용이 듭니다. 상태 확인(요소가 생겼는지, 글자가 들어갔는지)은 스크린샷 대신 find/read_page나 javascript_tool로 하고, 스크린샷은 파일 업로드 확인과 마지막 확인 때만 찍으세요.
- 오래 걸리는 작업을 기다릴 때는 wait와 스크린샷을 번갈아 반복하지 마세요. javascript_tool에서 완료 조건을 확인하며 최대 60초까지 기다리는 Promise를 돌려주게 하면 한 번의 호출로 기다릴 수 있습니다.
- 파일 입력(input[type=file])이나 "사진/이미지 올리기" 버튼을 직접 클릭하지 마세요. 운영체제 파일 선택 창이 열리면 조작할 수 없습니다. find/read_page로 input[type=file] 요소를 찾아 file_upload 도구로 파일을 넣으세요.
- 로그인 화면이 나오면 직접 로그인하지 말고 바로 멈춰서 status를 "login_required"로 돌려주세요. 비밀번호를 입력하거나 계정을 바꾸지 마세요.
- 결제, 구독, 설정 변경, 글 발행처럼 되돌리기 어려운 동작은 하지 마세요.`;
