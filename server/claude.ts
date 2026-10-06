import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import readline from "node:readline";
import type { ModelChoice, PlanWindow, UsageStage } from "../shared/types";
import { ChromeExtensionError, NOT_CONNECTED_TEXT, rememberConnection, SITE_BLOCKED_TEXT, SiteBlockedError } from "./browser/claudeChrome";
import { CancelledError, currentSignal } from "./cancel";
import { getSettings } from "./store";
import { recordUsage, savePlanLimits, setDefaultModel, type UsageRecord } from "./usage";

export interface ClaudeOptions {
  prompt: string;
  system: string;
  /** 허용할 내장 툴 (예: ["WebSearch", "WebFetch"]). 비우면 툴 없이 실행. */
  tools?: string[];
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  timeoutMs?: number;
  onToolUse?: (name: string, input: Record<string, unknown>) => void;
  /** 사용량 기록용: 어느 단계의 호출인지 (모델도 설정에서 이 단계 값을 쓴다) */
  stage: UsageStage;
  jobId?: string;
  /** 설정 대신 이 모델을 쓴다 (한도 확인 같은 내부 호출용) */
  model?: Exclude<ModelChoice, "default">;
  /** Claude in Chrome 도구를 켠다 (사용자의 크롬을 조작) */
  chrome?: boolean;
  /** 이 폴더의 파일을 쓸 수 있게 한다 (예: file_upload로 올릴 이미지 폴더) */
  addDirs?: string[];
}

/** 단계에 설정된 모델. "default"면 .env의 CLAUDE_MODEL, 그것도 없으면 claude CLI 기본값 */
async function modelFor(opts: ClaudeOptions): Promise<string | undefined> {
  if (opts.model) return opts.model;
  if (opts.stage === "check") return undefined;
  const choice = (await getSettings()).models[opts.stage];
  return choice !== "default" ? choice : process.env.CLAUDE_MODEL || undefined;
}

interface ResultEvent {
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  modelUsage?: Record<
    string,
    { inputTokens?: number; outputTokens?: number; cacheReadInputTokens?: number; cacheCreationInputTokens?: number; costUSD?: number }
  >;
}

const toWindow = (w: { utilization?: number; resetsAt?: number } | undefined): PlanWindow | null =>
  w && typeof w.utilization === "number"
    ? { utilization: w.utilization, resetsAt: w.resetsAt ? new Date(w.resetsAt * 1000).toISOString() : null }
    : null;

/**
 * 로컬에 로그인된 `claude` CLI를 호출한다 (API 키 불필요, 구독 한도 사용).
 * cwd를 홈의 임시 폴더로 두어 다른 프로젝트의 CLAUDE.md가 섞이지 않게 한다.
 */
export async function runClaude<T>(opts: ClaudeOptions): Promise<T> {
  const signal = currentSignal();
  if (signal?.aborted) throw new CancelledError();
  const tools = opts.tools ?? [];
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--no-session-persistence",
    "--strict-mcp-config", // MCP 서버를 로드하지 않아 시작이 빠르고 외부 도구가 섞이지 않는다
    "--tools", tools.join(","),
    "--append-system-prompt", opts.system,
    "--json-schema", JSON.stringify(opts.schema),
    "--effort", opts.effort ?? "medium",
  ];
  if (tools.length) args.push("--allowedTools", ...tools);
  if (opts.chrome) args.push("--chrome", "--allowedTools", "mcp__claude-in-chrome");
  for (const d of opts.addDirs ?? []) args.push("--add-dir", d);
  const model = await modelFor(opts);
  if (model) args.push("--model", model);

  const child = spawn(process.env.CLAUDE_BIN ?? "claude", args, {
    cwd: os.tmpdir(),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stderr = "";
  let extensionMissing = false;
  let siteBlocked: string | null = null;
  child.stderr.on("data", (d) => (stderr += d));
  child.stdin.end(opts.prompt); // 긴 프롬프트도 인자 길이 제한 없이 stdin으로 전달

  const timer = setTimeout(() => child.kill("SIGTERM"), opts.timeoutMs ?? 15 * 60_000);
  let cancelled = false;
  const onAbort = () => {
    cancelled = true;
    child.kill("SIGTERM");
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  // 콜백 안에서 채우므로 TS가 null로 좁히지 않게 단언해 둔다.
  let result = null as ResultEvent | null;

  const rl = readline.createInterface({ input: child.stdout });
  rl.on("line", (line) => {
    let ev: any;
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev.type === "assistant") {
      for (const block of ev.message?.content ?? []) {
        if (block.type === "tool_use" && block.name !== "StructuredOutput") {
          opts.onToolUse?.(block.name, block.input ?? {});
        }
      }
    } else if (ev.type === "user" && opts.chrome) {
      // 확장 프로그램에 연결되지 않으면 도구가 같은 오류만 돌려주므로 바로 멈춘다.
      for (const block of ev.message?.content ?? []) {
        if (block.type !== "tool_result") continue;
        const text =
          typeof block.content === "string"
            ? block.content
            : Array.isArray(block.content)
              ? block.content.map((c: { text?: string }) => c?.text ?? "").join(" ")
              : JSON.stringify(block.content ?? "");
        if (NOT_CONNECTED_TEXT.test(text)) {
          extensionMissing = true;
          child.kill("SIGTERM");
        } else if (SITE_BLOCKED_TEXT.test(text)) {
          // 막힌 사이트에서 계속 시도하면 한도만 쓴다. 바로 멈추고 호출한 쪽이 다른 방법을 고르게 한다.
          siteBlocked = text.replace(/\s+/g, " ").slice(0, 200);
          rememberConnection(true, null);
          child.kill("SIGTERM");
        } else if (!extensionMissing) {
          rememberConnection(true, null);
        }
      }
    } else if (ev.type === "system" && ev.subtype === "init" && typeof ev.model === "string") {
      if (!model) setDefaultModel(ev.model);
    } else if (ev.type === "rate_limit_event" && ev.rate_limit_info) {
      const info = ev.rate_limit_info;
      void savePlanLimits({
        fiveHour: toWindow(info.unifiedWindows?.five_hour),
        sevenDay: toWindow(info.unifiedWindows?.seven_day),
        status: info.status ?? null,
        checkedAt: new Date().toISOString(),
      });
    } else if (ev.type === "result") {
      result = ev;
    }
  });

  const code: number | null = await new Promise((resolve, reject) => {
    child.on("error", (e: NodeJS.ErrnoException) =>
      reject(
        e.code === "ENOENT"
          ? new Error("`claude` CLI를 찾을 수 없습니다. Claude Code를 설치하고 로그인했는지 확인하세요.")
          : e,
      ),
    );
    child.on("close", resolve);
  }).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }) as number | null;

  // 실패한 호출도 쓴 토큰은 기록한다.
  const now = new Date().toISOString();
  const callId = randomUUID();
  const usage: UsageRecord[] = Object.entries(result?.modelUsage ?? {}).map(([m, u]) => ({
    at: now,
    callId,
    stage: opts.stage,
    jobId: opts.jobId,
    model: m,
    input: u.inputTokens ?? 0,
    output: u.outputTokens ?? 0,
    cacheRead: u.cacheReadInputTokens ?? 0,
    cacheWrite: u.cacheCreationInputTokens ?? 0,
    costUSD: u.costUSD ?? 0,
  }));
  await recordUsage(usage);

  if (cancelled) throw new CancelledError();
  if (extensionMissing) {
    rememberConnection(false, "확장 프로그램이 연결되어 있지 않습니다.");
    throw new ChromeExtensionError("not_connected");
  }
  if (siteBlocked) throw new SiteBlockedError(siteBlocked);
  if (!result) {
    throw new Error(`claude CLI가 결과 없이 종료되었습니다 (code ${code}). ${stderr.trim().slice(-500)}`);
  }
  const r = result;
  if (r.is_error) throw new Error(`claude CLI 오류: ${r.result ?? stderr.trim().slice(-500)}`);
  if (r.structured_output === undefined) {
    throw new Error("claude CLI가 구조화된 결과를 돌려주지 않았습니다.");
  }
  return r.structured_output as T;
}
