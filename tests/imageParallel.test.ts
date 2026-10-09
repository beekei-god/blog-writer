import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// .env·셸의 키가 테스트에 섞이지 않게 한다.
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

// 이미지 기획(Claude 호출)과 크롬 경로는 쓰지 않는다.
vi.mock("../server/images/plan", () => ({ planImages: async () => [] }));
const web = vi.hoisted(() => ({ generateWithWebAi: vi.fn(async (_ai: string, _p: string, _s: string, outBase: string) => outBase + ".web.png") }));
vi.mock("../server/images/webAi", () => web);

import { createApp } from "../server/app";
import { cancelJob } from "../server/cancel";
import { isImageBusy, isRunning, runImage } from "../server/pipeline";
import { saveImageApiKey } from "../server/secrets";
import { createJob, getJob, updateJob } from "../server/store";

const PNG = Buffer.alloc(100, 1).toString("base64");
const realFetch = globalThis.fetch;

/** OpenAI 이미지 API 응답을 직접 풀어 줄 때까지 붙잡아 둔다 (동시에 몇 개가 도는지 보기 위해) */
const pending: { resolve: () => void; signal?: AbortSignal | null }[] = [];
const fakeFetch = (url: string | URL | Request, init?: RequestInit) => {
  if (!String(url).startsWith("https://api.openai.com")) return realFetch(url, init);
  return new Promise<Response>((resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    pending.push({
      signal: init?.signal,
      resolve: () => resolve(new Response(JSON.stringify({ data: [{ b64_json: PNG }] }), { status: 200 })),
    });
  });
};
const waitFor = async (cond: () => boolean | Promise<boolean>) => {
  for (let i = 0; i < 200 && !(await cond()); i++) await new Promise((r) => setTimeout(r, 10));
  expect(await cond()).toBe(true);
};

async function draftJob() {
  const job = await createJob("주제", { thumbnail: true, bodyImages: 1, provider: "chatgpt", style: "flat" });
  await updateJob(job.id, (j) => {
    j.status = "draft_ready";
    j.post = {
      title: "제목",
      summary: "요약",
      tags: [],
      thumbnail: { prompt: "t", alt: "a" },
      blocks: [{ type: "paragraph", text: "본문" }, { type: "image", prompt: "p", alt: "" }],
    };
  });
  return job.id;
}

const CHATGPT = { provider: "chatgpt" as const, style: "flat" as const };

describe("이미지 한 장씩 다시 만들기를 동시에", () => {
  beforeEach(async () => {
    pending.length = 0;
    vi.stubGlobal("fetch", fakeFetch);
    await saveImageApiKey("chatgpt", "o-key");
  });
  afterAll(() => vi.unstubAllGlobals());

  it("API로 만드는 두 장은 동시에 돌고, 둘 다 끝나야 초안 상태로 돌아온다", async () => {
    const id = await draftJob();
    const a = runImage(id, "thumbnail", CHATGPT);
    const b = runImage(id, "body-1", CHATGPT);
    await waitFor(() => pending.length === 2); // 크롬 큐에 줄 서지 않고 둘 다 API를 부르는 중
    expect(isRunning(id)).toBe(true);
    expect(isImageBusy(id, "thumbnail")).toBe(true);
    expect((await getJob(id))!.generatingImages?.sort()).toEqual(["body-1", "thumbnail"]);

    // 어느 쪽이 먼저 API를 불렀는지는 정해져 있지 않으므로 먼저 들어온 요청부터 끝낸다.
    pending[0].resolve();
    await waitFor(async () => (await getJob(id))!.generatingImages?.length === 1);
    expect((await getJob(id))!.status).toBe("generating_images"); // 한 장이 아직 만드는 중

    pending[1].resolve();
    await Promise.all([a, b]);
    const done = (await getJob(id))!;
    expect(done.status).toBe("draft_ready");
    expect(done.generatingImages).toBeUndefined();
    expect(done.post!.thumbnail!.file).toMatch(/\.png$/);
    expect((done.post!.blocks[1] as { file?: string }).file).toMatch(/\.png$/);
    expect(isRunning(id)).toBe(false);
  });

  it("같은 이미지를 또 요청하면 무시한다", async () => {
    const id = await draftJob();
    const a = runImage(id, "thumbnail", CHATGPT);
    await waitFor(() => pending.length === 1);
    await runImage(id, "thumbnail", CHATGPT); // 바로 끝남
    expect(pending).toHaveLength(1);
    pending[0].resolve();
    await a;
  });

  it("중지하면 동시에 도는 이미지를 모두 멈춘다", async () => {
    const id = await draftJob();
    const runs = [runImage(id, "thumbnail", CHATGPT), runImage(id, "body-1", CHATGPT)];
    await waitFor(() => pending.length === 2);
    expect(cancelJob(id)).toBe(true);
    await Promise.all(runs);
    const job = (await getJob(id))!;
    expect(job.status).toBe("draft_ready");
    expect(job.post!.thumbnail!.error).toBeUndefined(); // 중지는 실패로 기록하지 않는다
    expect(isRunning(id)).toBe(false);
  });
});

describe("이미지를 만드는 동안 받는 요청", () => {
  let server: Server;
  let base = "";
  beforeAll(async () => {
    server = createApp().listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));

  const post = (url: string, body: unknown) =>
    realFetch(base + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.status);

  it("다른 이미지는 받고, 같은 이미지·초안 수정·전체 다시 만들기는 409", async () => {
    pending.length = 0;
    vi.stubGlobal("fetch", fakeFetch);
    await saveImageApiKey("chatgpt", "o-key");
    const id = await draftJob();
    expect(await post(`/api/jobs/${id}/images/thumbnail/regenerate`, CHATGPT)).toBe(202);
    expect((await getJob(id))!.imageRunsOnly).toBe(true);
    await waitFor(() => pending.length === 1);
    expect(await post(`/api/jobs/${id}/images/body-1/regenerate`, CHATGPT)).toBe(202);
    expect(await post(`/api/jobs/${id}/images/thumbnail/regenerate`, CHATGPT)).toBe(409);
    expect(await post(`/api/jobs/${id}/regenerate-images`, { onlyFailed: true })).toBe(409);
    const put = await realFetch(`${base}/api/jobs/${id}/post`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify((await getJob(id))!.post),
    });
    expect(put.status).toBe(409);

    await waitFor(() => pending.length === 2);
    pending.forEach((p) => p.resolve());
    await waitFor(async () => {
      const j = await getJob(id);
      return !isRunning(id) && j?.status === "draft_ready" && !j.imageRunsOnly;
    });
    vi.unstubAllGlobals();
  });
  it("썸네일이 없는 글에 썸네일을 추가할 때도 만드는 방법(크롬/API)을 고른다", async () => {
    pending.length = 0;
    web.generateWithWebAi.mockClear();
    vi.stubGlobal("fetch", fakeFetch);
    await saveImageApiKey("chatgpt", "o-key");
    const start = async (thumbnailMethod: "api" | "chrome") => {
      const id = await draftJob();
      await updateJob(id, (j) => void delete j.post!.thumbnail);
      const body = { thumbnailProvider: "chatgpt", thumbnailStyle: "flat", thumbnailMethod, onlyFailed: true, addThumbnail: true };
      expect(await post(`/api/jobs/${id}/regenerate-images`, body)).toBe(202);
      return id;
    };
    const idle = (id: string) => async () => !isRunning(id) && (await getJob(id))?.status === "draft_ready";

    // 크롬: 키가 있어도 API를 부르지 않고 크롬 경로로 만든다
    const chrome = await start("chrome");
    await waitFor(idle(chrome));
    const j1 = (await getJob(chrome))!;
    expect(j1.imageOptions.thumbnailMethod).toBe("chrome");
    expect(j1.post!.thumbnail!.file).toMatch(/\.web\.png$/);
    expect(web.generateWithWebAi).toHaveBeenCalledTimes(1);
    expect(pending).toHaveLength(0);

    // API: 크롬은 부르지 않는다
    const api = await start("api");
    await waitFor(() => pending.length === 1);
    pending[0].resolve();
    await waitFor(idle(api));
    const j2 = (await getJob(api))!;
    expect(j2.imageOptions.thumbnailMethod).toBe("api");
    expect(j2.post!.thumbnail!.file).toMatch(/^thumbnail-\d+\.png$/);
    expect(web.generateWithWebAi).toHaveBeenCalledTimes(1);

    // 잘못된 값은 거절한다
    const bad = await realFetch(`${base}/api/jobs/${api}/regenerate-images`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thumbnailMethod: "email" }) });
    expect(bad.status).toBe(400);
    vi.unstubAllGlobals();
  });
});
