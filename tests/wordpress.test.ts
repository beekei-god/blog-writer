import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Post } from "../shared/types";
import { saveWordPressAuth } from "../server/secrets";
import { getSettings, jobImageDir, saveSettings } from "../server/store";
import { checkSchedule, normalizeSite, postToBlocks, publishToWordPress, testWordPress, WordPressError } from "../server/wordpress";

describe("사이트 주소", () => {
  it("https로 정리하고 http는 거부한다", () => {
    expect(normalizeSite("myblog.com/")).toBe("https://myblog.com");
    expect(normalizeSite(" https://myblog.com// ")).toBe("https://myblog.com");
    expect(() => normalizeSite("http://myblog.com")).toThrow(WordPressError);
    expect(() => normalizeSite("  ")).toThrow("사이트 주소를 입력");
  });
});

describe("예약 시각", () => {
  const now = Date.parse("2026-10-07T00:00:00Z");
  it("지금+1분 이후만 허용하고 date_gmt 형식으로 바꾼다", () => {
    expect(checkSchedule("2026-10-07T00:01:00Z", now)).toBe("2026-10-07T00:01:00");
    expect(() => checkSchedule("2026-10-07T00:00:59Z", now)).toThrow("1분 이상");
    expect(() => checkSchedule(undefined, now)).toThrow("올바르게");
    expect(() => checkSchedule("nope", now)).toThrow("올바르게");
  });
});

describe("Gutenberg 블록", () => {
  it("블록 마크업으로 바꾸고 올리지 못한 이미지는 건너뛴다", () => {
    const logs: string[] = [];
    const html = postToBlocks(
      {
        blocks: [
          { type: "heading", text: "**제목** <b>" },
          { type: "paragraph", text: "a\nb" },
          { type: "table", headers: ["항목"], rows: [["값"]] },
          { type: "image", prompt: "p", alt: "그림", file: "x.png" },
          { type: "image", prompt: "없는 그림", alt: "", file: undefined },
        ],
      },
      (f) => (f === "x.png" ? { id: 7, url: "https://s/x.png" } : undefined),
      (m) => logs.push(m),
    );
    expect(html).toContain('<h2 class="wp-block-heading">제목 &lt;b&gt;</h2>');
    expect(html).toContain("<p>a<br>b</p>");
    expect(html).toContain('<!-- wp:image {"id":7,');
    expect(html).toContain('alt="그림" class="wp-image-7"');
    expect(html).toContain("<!-- wp:html -->");
    expect(html).toMatch(/<table style="[^"]*width:100%[^"]*">/);
    expect(html).toContain("padding:12px 16px");
    expect(logs).toEqual(["이미지 건너뜀 (생성되지 않음): 없는 그림"]);
  });
});

// ───── 가짜 워드프레스 (fetch 대체) ─────
type Call = { method: string; url: string; body?: unknown; auth?: string };
let calls: Call[] = [];
function fakeWordPress(handler: (c: Call) => { status?: number; json?: unknown; html?: string } | undefined) {
  calls = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body ? "<binary>" : undefined;
    const c: Call = { method: init.method ?? "GET", url, body, auth: headers.Authorization };
    calls.push(c);
    const r = handler(c) ?? { status: 404, json: { code: "rest_no_route" } };
    return r.html !== undefined
      ? new Response(r.html, { status: r.status ?? 200, headers: { "content-type": "text/html" } })
      : new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  });
}
afterEach(() => vi.unstubAllGlobals());

const JOB = "job-wp-test";
const post: Post = {
  title: "제목",
  summary: "요약",
  tags: ["새태그", "있는태그"],
  thumbnail: { prompt: "t", alt: "썸네일", file: "thumbnail-1.png" },
  blocks: [{ type: "paragraph", text: "본문" }, { type: "image", prompt: "p", alt: "본문 그림", file: "body-1-1.png" }],
};

beforeAll(async () => {
  await saveSettings({ ...(await getSettings()), wordpressUrl: "wp.example", wordpressCategoryId: 5 });
  await saveWordPressAuth({ username: "editor", appPassword: "abcd efgh" });
  await fs.mkdir(jobImageDir(JOB), { recursive: true });
  for (const f of ["thumbnail-1.png", "body-1-1.png"]) await fs.writeFile(path.join(jobImageDir(JOB), f), "png");
});

const standard = (c: Call) => {
  const u = new URL(c.url);
  const p = u.pathname.replace(/^\/wp-json/, "");
  if (c.method === "POST" && p === "/wp/v2/media") return { status: 201, json: { id: calls.filter((x) => x.url.endsWith("/wp/v2/media")).length * 10, source_url: "https://wp.example/up.png" } };
  if (c.method === "POST" && p.startsWith("/wp/v2/media/")) return { json: {} };
  if (c.method === "GET" && p === "/wp/v2/tags") return { json: u.searchParams.get("search") === "있는태그" ? [{ id: 3, name: "있는태그" }] : [] };
  if (c.method === "POST" && p === "/wp/v2/tags") return { status: 400, json: { code: "term_exists", data: { term_id: 9 } } };
  if (c.method === "POST" && p === "/wp/v2/posts") return { status: 201, json: { id: 100, link: "https://wp.example/?p=100", status: (c.body as { status: string }).status } };
  if (c.method === "POST" && p === "/wp/v2/posts/100") return { json: { id: 100, link: "https://wp.example/?p=100", status: "draft" } };
  return undefined;
};

describe("워드프레스 등록 (가짜 사이트)", () => {
  it("이미지·태그를 올리고 예약 글을 만든다", async () => {
    fakeWordPress(standard);
    const at = new Date(Date.now() + 3600_000).toISOString();
    const r = await publishToWordPress(post, JOB, await getSettings(), "schedule", at, undefined, () => {});
    expect(r).toMatchObject({ postId: 100, mode: "schedule", scheduledAt: at, wpStatus: "future" });
    const created = calls.find((c) => c.method === "POST" && c.url.endsWith("/wp-json/wp/v2/posts"))!;
    expect(created.body).toMatchObject({ title: "제목", excerpt: "요약", status: "future", tags: [9, 3], categories: [5], featured_media: 10, date_gmt: at.slice(0, 19) });
    expect(created.auth).toBe(`Basic ${Buffer.from("editor:abcd efgh").toString("base64")}`);
    expect(calls.every((c) => c.url.startsWith("https://wp.example/"))).toBe(true);
    expect(Object.keys(r.mediaIds!)).toEqual(["thumbnail-1.png", "body-1-1.png"]);
  });

  it("이미 올린 글은 갱신하고, 올린 이미지는 다시 올리지 않는다", async () => {
    fakeWordPress((c) => (c.method === "GET" && /\/wp\/v2\/media\/\d+/.test(c.url) ? { json: { id: 10, source_url: "https://wp.example/up.png" } } : standard(c)));
    const existing = { postId: 100, link: "", mode: "draft" as const, mediaIds: { "thumbnail-1.png": { id: 10, url: "" }, "body-1-1.png": { id: 20, url: "" } } };
    const r = await publishToWordPress(post, JOB, await getSettings(), "draft", undefined, existing, () => {});
    expect(r.postId).toBe(100);
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/wp/v2/media"))).toBe(false);
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/wp/v2/posts/100"))).toBe(true);
  });

  it("예약했던 글을 자동발행하면 공개 시각을 지금으로 보낸다 (예약으로 되돌아가지 않게)", async () => {
    fakeWordPress(standard);
    const before = Date.now();
    await publishToWordPress(post, JOB, await getSettings(), "publish", undefined, { postId: 100, link: "", mode: "schedule", scheduledAt: "2099-01-01T00:00:00Z" }, () => {});
    const sent = calls.find((c) => c.url.endsWith("/wp/v2/posts/100"))!.body as { status: string; date_gmt: string };
    expect(sent.status).toBe("publish");
    expect(Math.abs(Date.parse(sent.date_gmt + "Z") - before)).toBeLessThan(10_000);
  });

  it("이미 자동발행한 글을 갱신할 때는 공개 시각을 바꾸지 않는다", async () => {
    fakeWordPress(standard);
    await publishToWordPress(post, JOB, await getSettings(), "publish", undefined, { postId: 100, link: "", mode: "publish" }, () => {});
    expect((calls.find((c) => c.url.endsWith("/wp/v2/posts/100"))!.body as Record<string, unknown>).date_gmt).toBeUndefined();
  });

  it("사이트에서 지워진 글이면 새 글로 올린다", async () => {
    fakeWordPress((c) => (c.url.endsWith("/wp/v2/posts/55") ? { status: 404, json: { code: "rest_post_invalid_id", message: "Invalid post ID." } } : standard(c)));
    const r = await publishToWordPress(post, JOB, await getSettings(), "publish", undefined, { postId: 55, link: "", mode: "draft" }, () => {});
    expect(r).toMatchObject({ postId: 100, wpStatus: "publish" });
  });

  it("과거 예약 시각은 아무것도 올리기 전에 거절한다", async () => {
    fakeWordPress(standard);
    await expect(publishToWordPress(post, JOB, await getSettings(), "schedule", new Date().toISOString(), undefined, () => {})).rejects.toThrow("1분 이상");
    expect(calls).toHaveLength(0);
  });

  it("/wp-json이 없으면 ?rest_route=로 다시 시도한다", async () => {
    fakeWordPress((c) => (c.url.includes("/wp-json/") ? { status: 404, html: "<html>not found</html>" } : { json: { name: "편집자", capabilities: { edit_posts: true } } }));
    expect(await testWordPress()).toEqual({ name: "편집자" });
    expect(calls.map((c) => c.url)).toEqual(["https://wp.example/wp-json/wp/v2/users/me?context=edit", "https://wp.example/?rest_route=/wp/v2/users/me&context=edit"]);
  });

  it.each([
    ["rest_not_logged_in", "Authorization 헤더"],
    ["incorrect_password", "Application Password가 올바르지 않습니다"],
    ["invalid_username", "없는 사용자명"],
  ])("401 %s → 원인별 안내", async (code, text) => {
    fakeWordPress(() => ({ status: 401, json: { code } }));
    await expect(testWordPress()).rejects.toThrow(text);
  });

  it("글 쓸 권한이 없으면 거절한다", async () => {
    fakeWordPress(() => ({ json: { name: "구독자", capabilities: { edit_posts: false } } }));
    await expect(testWordPress()).rejects.toThrow("edit_posts");
  });

  it("비밀번호는 오류 메시지에 나오지 않는다", async () => {
    fakeWordPress(() => ({ status: 500, json: { message: "boom" } }));
    await expect(testWordPress()).rejects.toThrow("워드프레스 오류 500: boom");
    await testWordPress().catch((e: Error) => expect(e.message).not.toContain("abcd"));
  });
});
