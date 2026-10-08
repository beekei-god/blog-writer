import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const claude = vi.hoisted(() => ({ result: {} as unknown }));
vi.mock("../server/claude", () => ({ runClaude: vi.fn(async () => claude.result) }));
vi.mock("../server/browser/claudeChrome", () => ({
  assertExtensionInstalled: async () => {},
  BROWSER_RULES: "",
  ChromeExtensionError: class extends Error {},
}));

import { generateWithWebAi } from "../server/images/webAi";

const failed = { status: "failed", imageUrl: "", downloadClicked: false, replyText: "", message: "다운로드 스크립트가 빈 값을 돌려줌" };

describe("generateWithWebAi: Claude가 failed로 보고해도", () => {
  let downloads: string;
  let outBase: string;
  beforeEach(() => {
    downloads = fs.mkdtempSync(path.join(os.tmpdir(), "bw-downloads-"));
    process.env.DOWNLOADS_DIR = downloads;
    outBase = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bw-out-")), "body-8");
    claude.result = failed;
  });

  it("다운로드 폴더에 이번 이미지 파일이 있으면 성공으로 처리한다", async () => {
    fs.writeFileSync(path.join(downloads, "blogwriter-body-8.png"), Buffer.alloc(6_000));
    const file = await generateWithWebAi("gemini", "p", "flat", outBase, { log: () => {} });
    expect(file).toBe(outBase + ".png");
    expect(fs.existsSync(file)).toBe(true);
  }, 30_000);

  it("사이트가 오류 안내를 보였으면 site_error로 실패한다", async () => {
    claude.result = { ...failed, message: 'Gemini에 요청을 보냈지만 "문제가 발생했습니다 (1155)" 오류가 나서 이미지가 생성되지 않았습니다.' };
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const p = generateWithWebAi("gemini", "p", "flat", outBase, { log: () => {} });
    const assertion = expect(p).rejects.toMatchObject({ kind: "site_error" });
    await vi.advanceTimersByTimeAsync(25_000);
    await assertion;
    vi.useRealTimers();
  }, 30_000);

  it("파일이 없으면 ui_changed로 실패한다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const p = generateWithWebAi("gemini", "p", "flat", outBase, { log: () => {} });
    const assertion = expect(p).rejects.toMatchObject({ kind: "ui_changed" });
    await vi.advanceTimersByTimeAsync(25_000);
    await assertion;
    vi.useRealTimers();
  }, 30_000);
});
