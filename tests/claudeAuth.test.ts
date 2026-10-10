import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { EventEmitter } from "node:events";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const cp = vi.hoisted(() => ({
  loggedIn: true,
  calls: [] as string[][],
  children: [] as { kill: ReturnType<typeof vi.fn>; emit: (e: string, ...a: unknown[]) => boolean; stdout: { emit: (e: string, b: Buffer) => boolean } }[],
}));

vi.mock("node:child_process", () => ({
  execFile: (_bin: string, args: string[], _o: unknown, cb: (e: Error | null, out: string, err: string) => void) => {
    cp.calls.push(args);
    const key = args.join(" ");
    if (key === "auth status --json") cb(null, JSON.stringify(cp.loggedIn ? { loggedIn: true, authMethod: "claude.ai", email: "a@example.com", token: "SECRET" } : { loggedIn: false }), "");
    else if (key === "auth status --text") cb(null, "Login method: Claude Team account\nOrganization: Acme\nEmail: a@example.com\n", "");
    else if (key === "auth logout") {
      cp.loggedIn = false;
      cb(null, "", "");
    } else cb(new Error("unexpected"), "", "");
  },
  spawn: (_bin: string, args: string[]) => {
    cp.calls.push(args);
    const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter(), kill: vi.fn() });
    cp.children.push(child as never);
    return child;
  },
}));

import { createApp } from "../server/app";
import fs from "node:fs/promises";
import path from "node:path";
import { createJob, DATA_DIR, updateJob } from "../server/store";
import { cancelClaudeLogin } from "../server/claudeAuth";

let server: Server;
let base = "";
beforeAll(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  cancelClaudeLogin();
  cp.loggedIn = true;
  cp.calls = [];
  cp.children = [];
});
const call = async (method: string, url: string, body?: unknown) => {
  const res = await fetch(base + url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};

describe("Claude Code 로그인", () => {
  it("계정 표시용 값만 돌려주고 토큰 같은 다른 값은 내보내지 않는다", async () => {
    const r = await call("GET", "/api/claude/auth");
    expect(r.body).toEqual({ loggedIn: true, email: "a@example.com", organization: "Acme", method: "Claude Team account", loginRunning: false, loginUrl: null, loginError: null });
    expect(JSON.stringify(r.body)).not.toContain("SECRET");
  });
  it("이미 로그인되어 있으면 그냥 로그인은 거절하고, 다른 계정으로 로그인은 로그아웃 뒤 로그인 창을 연다", async () => {
    expect((await call("POST", "/api/claude/auth/login", {})).status).toBe(409);
    const r = await call("POST", "/api/claude/auth/login", { switch: true });
    expect(r.status).toBe(202);
    expect(r.body).toMatchObject({ loggedIn: false, loginRunning: true });
    expect(cp.calls.map((a) => a.join(" "))).toEqual(expect.arrayContaining(["auth logout", "auth login --claudeai"]));
    expect(cp.calls.findIndex((a) => a[1] === "logout")).toBeLessThan(cp.calls.findIndex((a) => a[1] === "login"));
  });
  it("다른 계정으로 바꾸면 이전 계정의 한도 정보를 지우고, 그냥 로그인 거절에서는 지우지 않는다", async () => {
    const file = path.join(DATA_DIR, "plan-limits.json");
    await fs.writeFile(file, JSON.stringify({ fiveHour: { utilization: 14 } }));
    expect((await call("POST", "/api/claude/auth/login", {})).status).toBe(409);
    await expect(fs.access(file)).resolves.toBeUndefined();
    expect((await call("POST", "/api/claude/auth/login", { switch: true })).status).toBe(202);
    await expect(fs.access(file)).rejects.toThrow();
  });
  it("로그인 창 주소를 알려 주고, 끝나면 진행 표시가 사라지며, 실패하면 이유를 남긴다", async () => {
    cp.loggedIn = false;
    await call("POST", "/api/claude/auth/login", {});
    cp.children[0].stdout.emit("data", Buffer.from("Open https://claude.ai/oauth/x to sign in"));
    expect((await call("GET", "/api/claude/auth")).body).toMatchObject({ loginRunning: true, loginUrl: "https://claude.ai/oauth/x" });
    cp.children[0].emit("exit", 1);
    expect((await call("GET", "/api/claude/auth")).body).toMatchObject({ loginRunning: false, loginError: "로그인이 끝나지 않았습니다. 다시 시도하세요." });
  });
  it("로그인 취소는 로그인 창 프로세스를 끝낸다", async () => {
    cp.loggedIn = false;
    await call("POST", "/api/claude/auth/login", {});
    const r = await call("POST", "/api/claude/auth/cancel");
    expect(cp.children[0].kill).toHaveBeenCalled();
    expect(r.body.loginRunning).toBe(false);
  });
  it("글 작업이 진행 중이면 계정을 바꾸지 못하고 로그아웃도 하지 않는다", async () => {
    const job = await createJob("주제", { thumbnail: false, bodyImages: 0, provider: "claude", style: "flat" });
    await updateJob(job.id, (j) => void (j.status = "writing"));
    const r = await call("POST", "/api/claude/auth/login", { switch: true });
    expect(r.status).toBe(409);
    expect(r.body.error).toContain("글 작업이 진행 중입니다.");
    expect(cp.calls.some((a) => a[1] === "logout")).toBe(false);
    await updateJob(job.id, (j) => void (j.status = "draft_ready"));
  });
});
