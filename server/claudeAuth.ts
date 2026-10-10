import { execFile, spawn, type ChildProcess } from "node:child_process";

/**
 * 이 컴퓨터의 Claude Code 로그인 관리 (`claude auth status|login|logout`).
 * 인증 정보(토큰)는 읽거나 저장하지 않고, 계정 표시용 값(이메일·조직·로그인 방식)만 돌려준다.
 */
const claudeBin = () => process.env.CLAUDE_BIN ?? "claude";

export interface ClaudeAuthStatus {
  loggedIn: boolean;
  email: string | null;
  organization: string | null;
  /** 로그인 방식 이름 (예: Claude Team account) */
  method: string | null;
  /** 로그인 창(브라우저)에서 로그인을 기다리는 중 */
  loginRunning: boolean;
  /** 로그인 창이 자동으로 열리지 않을 때 직접 열 주소 */
  loginUrl: string | null;
  /** 마지막 로그인 시도가 실패했을 때 이유 */
  loginError: string | null;
}

let login: ChildProcess | null = null;
let loginUrl: string | null = null;
let loginError: string | null = null;

const run = (args: string[], timeoutMs = 20_000) =>
  new Promise<{ ok: boolean; out: string }>((resolve) => {
    execFile(claudeBin(), args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: `${stdout ?? ""}${stderr ?? ""}` });
    });
  });

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function getClaudeAuthStatus(): Promise<ClaudeAuthStatus> {
  const base = { loginRunning: login !== null, loginUrl, loginError };
  const json = await run(["auth", "status", "--json"]);
  try {
    const j = JSON.parse(json.out) as Record<string, unknown>;
    if (j.loggedIn !== true) return { ...base, loggedIn: false, email: null, organization: null, method: null };
    // 조직 이름·로그인 방식 이름은 사람이 읽는 출력에서 가져온다 (JSON에는 이름이 없을 수 있다)
    const text = await run(["auth", "status", "--text"]);
    const field = (label: string) => str(new RegExp(`^${label}:\\s*(.+)$`, "m").exec(text.out)?.[1]);
    return {
      ...base,
      loggedIn: true,
      email: str(j.email) ?? field("Email"),
      organization: str(j.orgName) ?? field("Organization"),
      method: field("Login method") ?? str(j.authMethod),
    };
  } catch {
    return { ...base, loggedIn: false, email: null, organization: null, method: null };
  }
}

/** 로그인 창을 연다(구독 계정). 로그인이 끝나면 프로세스가 스스로 끝난다. 이미 진행 중이면 그대로 둔다. */
export function startClaudeLogin() {
  if (login) return;
  loginUrl = null;
  loginError = null;
  const child = spawn(claudeBin(), ["auth", "login", "--claudeai"], { stdio: ["ignore", "pipe", "pipe"] });
  login = child;
  let out = "";
  const onData = (b: Buffer) => {
    out = (out + b.toString()).slice(-4000);
    loginUrl = /https:\/\/\S+/.exec(out)?.[0] ?? loginUrl;
  };
  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);
  const finish = (code: number | null, err?: Error) => {
    if (login !== child) return;
    login = null;
    loginUrl = null;
    if (err) loginError = `로그인을 시작하지 못했습니다: ${err.message}`;
    else if (code !== 0 && code !== null) loginError = "로그인이 끝나지 않았습니다. 다시 시도하세요.";
  };
  child.on("exit", (code) => finish(code));
  child.on("error", (e) => finish(null, e));
}

/** 진행 중인 로그인 창을 취소한다 */
export function cancelClaudeLogin() {
  const child = login;
  if (!child) return;
  login = null;
  loginUrl = null;
  child.kill("SIGTERM");
}

/** 지금 계정에서 로그아웃한다 */
export async function claudeLogout(): Promise<void> {
  const r = await run(["auth", "logout"]);
  if (!r.ok) throw new Error("로그아웃하지 못했습니다.");
}
