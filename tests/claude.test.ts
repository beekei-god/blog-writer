import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runClaude } from "../server/claude";
import { getSettings, saveSettings } from "../server/store";
import { getJobUsage } from "../server/usage";

/**
 * 가짜 claude CLI: 프롬프트(stdin)의 첫 줄 "MODE:xxx"에 따라 stream-json 이벤트를 흉내 낸다.
 * 받은 인자는 FAKE_ARGS_FILE에 적어 둔다. 실제 claude는 부르지 않는다.
 */
const FAKE = `#!/usr/bin/env node
const fs = require("fs");
fs.writeFileSync(process.env.FAKE_ARGS_FILE, JSON.stringify(process.argv.slice(2)));
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const mode = (input.match(/^MODE:(\\w+)/) || [])[1];
  const out = (o) => console.log(JSON.stringify(o));
  if (mode === "hang") return setInterval(() => {}, 1000);
  out({ type: "system", subtype: "init", model: "claude-default-x" });
  if (mode === "tool") out({ type: "assistant", message: { content: [{ type: "tool_use", name: "WebSearch", input: { query: "q" } }, { type: "tool_use", name: "StructuredOutput", input: {} }] } });
  if (mode === "none") return;
  const usage = { "claude-m1": { inputTokens: 10, outputTokens: 5, cacheReadInputTokens: 2, cacheCreationInputTokens: 1, costUSD: 0.5 }, "claude-m2": { inputTokens: 1, outputTokens: 1 } };
  if (mode === "error") return out({ type: "result", is_error: true, result: "boom", modelUsage: usage });
  if (mode === "nostruct") return out({ type: "result", modelUsage: usage });
  out({ type: "result", structured_output: { ok: true }, modelUsage: usage });
});
`;

let dir = "";
let argsFile = "";
const savedEnv = { bin: process.env.CLAUDE_BIN, model: process.env.CLAUDE_MODEL };

const call = (mode: string, extra: Partial<Parameters<typeof runClaude>[0]> = {}) =>
  runClaude<{ ok: boolean }>({ system: "sys", prompt: `MODE:${mode}\n본문`, schema: { type: "object" }, stage: "writing", ...extra });
const argsOf = () => JSON.parse(fs.readFileSync(argsFile, "utf8")) as string[];
const modelArg = () => {
  const a = argsOf();
  const i = a.indexOf("--model");
  return i < 0 ? undefined : a[i + 1];
};

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-claude-"));
  const bin = path.join(dir, "claude");
  fs.writeFileSync(bin, FAKE, { mode: 0o755 });
  argsFile = path.join(dir, "args.json");
  process.env.CLAUDE_BIN = bin;
  process.env.FAKE_ARGS_FILE = argsFile;
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  if (savedEnv.bin === undefined) delete process.env.CLAUDE_BIN;
  else process.env.CLAUDE_BIN = savedEnv.bin;
  if (savedEnv.model === undefined) delete process.env.CLAUDE_MODEL;
  else process.env.CLAUDE_MODEL = savedEnv.model;
});
beforeEach(async () => {
  delete process.env.CLAUDE_MODEL;
  const s = await getSettings();
  await saveSettings({ ...s, models: { ...s.models, writing: "default" } });
});

describe("runClaude: 모델 결정 (BR-USG-001/002)", () => {
  it("단계에 모델이 설정돼 있으면 그 모델로 부른다", async () => {
    const s = await getSettings();
    await saveSettings({ ...s, models: { ...s.models, writing: "opus" } });
    await call("ok");
    expect(modelArg()).toBe("opus");
  });

  it("호출에서 모델을 지정하면 설정보다 우선한다", async () => {
    const s = await getSettings();
    await saveSettings({ ...s, models: { ...s.models, writing: "opus" } });
    await call("ok", { model: "haiku" });
    expect(modelArg()).toBe("haiku");
  });

  it("'default'면 .env의 CLAUDE_MODEL, 그것도 없으면 --model 없이 CLI 기본값을 쓴다", async () => {
    process.env.CLAUDE_MODEL = "sonnet";
    await call("ok");
    expect(modelArg()).toBe("sonnet");
    delete process.env.CLAUDE_MODEL;
    await call("ok");
    expect(modelArg()).toBeUndefined();
  });

  it("check 단계는 설정과 상관없이 모델을 지정하지 않는다", async () => {
    const s = await getSettings();
    await saveSettings({ ...s, models: { ...s.models, writing: "opus" } });
    await call("ok", { stage: "check" });
    expect(modelArg()).toBeUndefined();
  });

  it("툴이 없으면 --tools 값이 비고, 있으면 --allowedTools도 넘긴다", async () => {
    await call("ok");
    expect(argsOf()[argsOf().indexOf("--tools") + 1]).toBe("");
    expect(argsOf()).not.toContain("--allowedTools");
    await call("ok", { tools: ["WebSearch"] });
    expect(argsOf()[argsOf().indexOf("--allowedTools") + 1]).toBe("WebSearch");
  });
});

describe("runClaude: 결과와 사용량 기록 (BR-USG-002/003/005)", () => {
  it("구조화된 결과를 돌려주고, 모델별 토큰을 한 호출로 기록한다", async () => {
    expect(await call("ok", { jobId: "job-ok" })).toEqual({ ok: true });
    const usage = await getJobUsage("job-ok");
    const byModel = Object.fromEntries(usage.map((u) => [u.model, u.totals]));
    expect(byModel["claude-m1"]).toMatchObject({ input: 10, output: 5, cacheRead: 2, cacheWrite: 1, costUSD: 0.5, calls: 1 });
    expect(byModel["claude-m2"]).toMatchObject({ input: 1, output: 1, costUSD: 0 });
  });

  it("오류로 끝난 호출도 쓴 토큰은 기록하고 오류를 던진다", async () => {
    await expect(call("error", { jobId: "job-err" })).rejects.toThrow("claude CLI 오류: boom");
    expect((await getJobUsage("job-err")).length).toBe(2);
  });

  it("결과 이벤트가 없으면 '결과 없이 종료', 구조화 결과가 없으면 따로 알린다", async () => {
    await expect(call("none")).rejects.toThrow("결과 없이 종료");
    await expect(call("nostruct")).rejects.toThrow("구조화된 결과를 돌려주지 않았습니다");
  });

  it("시간 초과면 프로세스를 끝내고 오류를 던진다", async () => {
    await expect(call("hang", { timeoutMs: 300 })).rejects.toThrow("결과 없이 종료");
  });

  it("도구 사용 이벤트를 알려 주되 StructuredOutput은 뺀다", async () => {
    const seen: string[] = [];
    await call("tool", { onToolUse: (name) => seen.push(name) });
    expect(seen).toEqual(["WebSearch"]);
  });

  it("CLI가 없으면 설치 안내 오류를 던진다", async () => {
    const bin = process.env.CLAUDE_BIN;
    process.env.CLAUDE_BIN = path.join(dir, "없는-파일");
    try {
      await expect(call("ok")).rejects.toThrow("`claude` CLI를 찾을 수 없습니다");
    } finally {
      process.env.CLAUDE_BIN = bin;
    }
  });
});
