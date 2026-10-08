import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// .env·셸의 키가 테스트에 섞이지 않게 한다.
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

// 크롬(웹 AI) 경로는 호출 여부만 본다.
const web = vi.hoisted(() => ({ generateWithWebAi: vi.fn(async (_ai: string, _p: string, _s: string, outBase: string) => outBase + ".web.png") }));
vi.mock("../server/images/webAi", () => web);

import { generateImages } from "../server/images";
import { createJob, getJob, updateJob } from "../server/store";
import { saveImageApiKey } from "../server/secrets";
import type { ImageMethod, ImageOptions } from "../shared/types";

const PNG = Buffer.alloc(100, 1).toString("base64");
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchMock = vi.fn<typeof fetch>();

async function run(provider: "gemini" | "chatgpt", method: ImageMethod = "api") {
  const options: ImageOptions = { thumbnail: false, bodyImages: 1, provider, style: "flat", method };
  const job = await createJob("주제", options);
  await updateJob(job.id, (j) => {
    j.post = { title: "제목", summary: "요약", tags: [], blocks: [{ type: "image", prompt: "p", alt: "a", headline: "문구" }] };
  });
  const logs: string[] = [];
  await generateImages(job.id, "주제", (await getJob(job.id))!.post!, options, (m) => logs.push(m), "all");
  const spec = (await getJob(job.id))!.post!.blocks[0] as { file?: string; error?: string; errorKind?: string };
  return { spec, logs };
}

describe("Gemini·ChatGPT 이미지: 키가 있으면 API, 없거나 크롬을 고르면 크롬. API 실패는 크롬으로 넘기지 않는다", () => {
  beforeEach(async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    web.generateWithWebAi.mockClear();
    await saveImageApiKey("gemini", "g-key");
    await saveImageApiKey("chatgpt", "o-key");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("OpenAI 키가 있으면 API로 만들고 크롬은 쓰지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { data: [{ b64_json: PNG }] }));
    const { spec } = await run("chatgpt");
    expect(spec.file).toMatch(/^body-0-\d+\.png$/);
    expect(web.generateWithWebAi).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/images/generations");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer o-key");
    expect(JSON.parse(init!.body as string).prompt).toContain('문구: "문구"');
  });

  it("Gemini는 받은 이미지 형식대로 저장한다", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/jpeg", data: PNG } }] } }] }));
    const { spec } = await run("gemini");
    expect(spec.file).toMatch(/\.jpg$/);
    expect(web.generateWithWebAi).not.toHaveBeenCalled();
  });

  it("키가 없으면 크롬으로 만든다", async () => {
    await saveImageApiKey("chatgpt", null);
    const { spec } = await run("chatgpt");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(web.generateWithWebAi).toHaveBeenCalledOnce();
    expect(spec.file).toMatch(/\.web\.png$/);
  });

  it("썸네일과 본문 이미지는 만드는 방법을 따로 정할 수 있다 (썸네일 크롬, 본문 API)", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { data: [{ b64_json: PNG }] }));
    const options: ImageOptions = { thumbnail: true, bodyImages: 1, provider: "chatgpt", style: "flat", method: "api", thumbnailMethod: "chrome" };
    const job = await createJob("주제", options);
    await updateJob(job.id, (j) => {
      j.post = {
        title: "제목", summary: "요약", tags: [],
        thumbnail: { prompt: "t", alt: "t" },
        blocks: [{ type: "image", prompt: "p", alt: "a" }],
      };
    });
    await generateImages(job.id, "주제", (await getJob(job.id))!.post!, options, () => {}, "all");
    const post = (await getJob(job.id))!.post!;
    expect(post.thumbnail!.file).toMatch(/\.web\.png$/);
    expect((post.blocks[0] as { file?: string }).file).toMatch(/^body-0-\d+\.png$/);
    expect(web.generateWithWebAi).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("한도·잔액 부족(429)이면 크롬으로 넘기지 않고 limit으로 실패한다", async () => {
    fetchMock.mockResolvedValueOnce(reply(429, { error: { message: "You exceeded your current quota", code: "insufficient_quota" } }));
    const { spec } = await run("chatgpt");
    expect(web.generateWithWebAi).not.toHaveBeenCalled();
    expect(spec.errorKind).toBe("limit");
    expect(spec.error).toContain("OpenAI API 한도·잔액 부족: You exceeded your current quota");
  });

  it("Gemini RESOURCE_EXHAUSTED도 limit으로 실패한다", async () => {
    fetchMock.mockResolvedValueOnce(reply(429, { error: { code: 429, message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" } }));
    const { spec } = await run("gemini");
    expect(web.generateWithWebAi).not.toHaveBeenCalled();
    expect(spec.errorKind).toBe("limit");
  });

  it("크롬을 고르면 키가 있어도 크롬에서 만든다", async () => {
    const { spec } = await run("gemini", "chrome");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(web.generateWithWebAi).toHaveBeenCalledOnce();
    expect(spec.file).toMatch(/\.web\.png$/);
  });

  it("정책 거절은 refused로 실패하고 크롬은 쓰지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(reply(400, { error: { message: "Your request was rejected by the safety system.", code: "moderation_blocked" } }));
    const { spec } = await run("chatgpt");
    expect(spec.errorKind).toBe("refused");
    expect(spec.file).toBeUndefined();
    expect(web.generateWithWebAi).not.toHaveBeenCalled();
  });

  it("잘못된 키는 api_error로 실패하고 크롬은 쓰지 않는다", async () => {
    fetchMock.mockResolvedValueOnce(reply(401, { error: { message: "Incorrect API key provided", code: "invalid_api_key" } }));
    const { spec } = await run("chatgpt");
    expect(spec.errorKind).toBe("api_error");
    expect(web.generateWithWebAi).not.toHaveBeenCalled();
  });
});

describe("이미지 API 키 설정 저장", () => {
  it("화면에는 키 값을 돌려주지 않는다", async () => {
    const { createApp } = await import("../server/app");
    const server = createApp().listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const realFetch = globalThis.fetch;
    // 키 확인 요청(모델 목록)만 가짜로 성공시킨다.
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
      url.startsWith("https://api.openai.com") ? Promise.resolve(reply(200, { data: [] })) : realFetch(url, init),
    );
    try {
      const res = await fetch(`${base}/api/image-api/chatgpt`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "sk-secret-value" }) });
      const text = await res.text();
      expect(res.status).toBe(200);
      expect(text).not.toContain("sk-secret-value");
      expect(JSON.parse(text).chatgpt).toMatchObject({ configured: true, hint: "sk-sec…", fromEnv: false });
      expect((await fetch(`${base}/api/image-api/other`, { method: "DELETE" })).status).toBe(404);
    } finally {
      vi.unstubAllGlobals();
      await new Promise((r) => server.close(r));
    }
  });
});
