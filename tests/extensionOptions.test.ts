import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const spawned = vi.hoisted(() => [] as { bin: string; args: string[] }[]);
const ext = vi.hoisted(() => ({ installed: true }));
vi.mock("../server/browser/claudeChrome", async (orig) => ({
  ...(await orig<typeof import("../server/browser/claudeChrome")>()),
  extensionStatus: async () => ({ installed: ext.installed, connected: null, detail: null, checkedAt: null }),
}));
vi.mock("node:child_process", async (orig) => ({
  ...(await orig<typeof import("node:child_process")>()),
  spawn: (bin: string, args: string[]) => {
    spawned.push({ bin, args });
    return { on: () => {}, unref: () => {} };
  },
}));

import { createApp } from "../server/app";

let server: Server;
let base = "";
const fakeChrome = path.join(os.tmpdir(), "fake-chrome-for-test");
beforeAll(async () => {
  fs.writeFileSync(fakeChrome, "");
  process.env.CHROME_PATH = fakeChrome;
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  fs.rmSync(fakeChrome, { force: true });
  return new Promise((r) => server.close(r));
});

describe("Claude in Chrome 로그인(설정) 화면 열기", () => {
  const open = async () => {
    const res = await fetch(`${base}/api/chrome-extension/open-options`, { method: "POST" });
    return { status: res.status, body: await res.json() };
  };
  it("설치되어 있으면 확장 프로그램의 options.html을 평소 쓰는 크롬(전용 프로필 없이)에서 연다", async () => {
    ext.installed = true;
    expect(await open()).toEqual({ status: 200, body: { ok: true, opened: "options" } });
    expect(spawned.at(-1)).toEqual({ bin: fakeChrome, args: ["chrome-extension://fcoeoabgfenejglbffodgkkbkcdhcgfn/options.html"] });
  });
  it("설치되어 있지 않으면 설치 페이지를 대신 연다", async () => {
    ext.installed = false;
    expect(await open()).toEqual({ status: 200, body: { ok: true, opened: "install" } });
    expect(spawned.at(-1)).toEqual({ bin: fakeChrome, args: ["https://claude.ai/chrome"] });
  });
});
