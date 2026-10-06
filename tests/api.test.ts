import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { createJob, getJob, getSettings, saveSettings, updateJob } from "../server/store";

// 요청이 거절되는 경로만 확인한다. Claude·크롬을 실제로 띄우는 요청(새 글 시작, 블로그 등록 시작 등)은 보내지 않는다.
let server: Server;
let base = "";
beforeAll(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const call = async (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const IMAGES = { thumbnail: false, bodyImages: 0, provider: "claude" as const, style: "flat" as const };
async function draftJob(status: "draft_ready" | "posted" = "draft_ready") {
  const job = await createJob("테스트 주제", IMAGES);
  await updateJob(job.id, (j) => {
    j.status = status;
    j.post = { title: "제목", summary: "요약", tags: [], thumbnail: { prompt: "t", alt: "a" }, blocks: [{ type: "paragraph", text: "본문" }, { type: "image", prompt: "p", alt: "" }] };
  });
  return job.id;
}

describe("로컬 전용", () => {
  it("다른 사이트에서 온 요청은 막는다", async () => {
    expect((await call("GET", "/api/settings", undefined, { Origin: "https://evil.example" })).status).toBe(403);
    expect((await call("GET", "/api/settings", undefined, { Origin: "http://localhost:5173" })).status).toBe(200);
  });
  it("JSON 형식 오류는 400", async () => {
    const res = await fetch(base + "/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{" });
    expect(res.status).toBe(400);
  });
});

describe("설정", () => {
  const valid = async () => ({ images: IMAGES, models: (await getSettings()).models });
  it("블로그 ID·사이트 주소 형식을 검사한다", async () => {
    expect((await call("PUT", "/api/settings", { ...(await valid()), naverBlogId: "a b" })).status).toBe(400);
    expect((await call("PUT", "/api/settings", { ...(await valid()), wordpressUrl: "http://wp.example" })).body.error).toContain("https://");
    const ok = await call("PUT", "/api/settings", { ...(await valid()), naverBlogId: "nid", wordpressUrl: "wp.example" });
    expect(ok.status).toBe(200);
    expect((await getSettings()).naverBlogId).toBe("nid");
  });
});

describe("새 글", () => {
  it("주제·링크를 검사한다", async () => {
    expect((await call("POST", "/api/jobs", { topic: "a", images: IMAGES })).body.error).toBe("주제를 2자 이상 입력하세요.");
    expect((await call("POST", "/api/jobs", { topic: "x".repeat(301), images: IMAGES })).body.error).toBe("주제는 300자 이하로 입력하세요.");
    expect((await call("POST", "/api/jobs", { topic: "정상 주제", images: IMAGES, links: ["ftp://x"] })).body.error).toBe("참고 링크는 http(s)로 시작하는 주소여야 합니다.");
  });
});

describe("블로그 등록 요청 검사", () => {
  it("블로그를 고르지 않으면 거절", async () => {
    const id = await draftJob();
    expect((await call("POST", `/api/jobs/${id}/post-to-blog`, {})).body.error).toBe("올릴 블로그를 선택하세요.");
  });
  it("크롬으로 올리는 블로그는 임시저장만", async () => {
    const id = await draftJob();
    const r = await call("POST", `/api/jobs/${id}/post-to-blog`, { platform: "naver", mode: "publish" });
    expect(r).toEqual({ status: 400, body: { error: "예약발행·자동발행은 워드프레스에서만 쓸 수 있습니다." } });
  });
  it("블로그 ID가 없으면 거절", async () => {
    const id = await draftJob();
    expect((await call("POST", `/api/jobs/${id}/post-to-blog`, { platform: "tistory" })).body.error).toBe("먼저 설정에서 티스토리 블로그 ID를 입력하세요.");
  });
  it("워드프레스: 과거 예약 시각, 연결 정보 없음", async () => {
    await saveSettings({ ...(await getSettings()), wordpressUrl: "wp.example" });
    const id = await draftJob();
    const past = await call("POST", `/api/jobs/${id}/post-to-blog`, { platform: "wordpress", mode: "schedule", scheduledAt: new Date().toISOString() });
    expect(past.body.error).toContain("1분 이상");
    const noAuth = await call("POST", `/api/jobs/${id}/post-to-blog`, { platform: "wordpress", mode: "draft" });
    expect(noAuth.body.error).toContain("워드프레스 연결 정보가 없습니다");
    expect((await getJob(id))?.status).toBe("draft_ready");
  });
  it("초안이 없으면 거절", async () => {
    const job = await createJob("초안 없음", IMAGES);
    expect((await call("POST", `/api/jobs/${job.id}/post-to-blog`, { platform: "naver" })).body.error).toBe("초안이 없습니다.");
  });
});

describe("수기 상태 변경", () => {
  it("허용된 전이만", async () => {
    const id = await draftJob();
    expect((await call("PUT", `/api/jobs/${id}/status`, { status: "published" })).body.error).toBe("초안 완료 상태의 글은 발행 완료(으)로 바꿀 수 없습니다.");
    await updateJob(id, (j) => void (j.status = "posted"));
    const r = await call("PUT", `/api/jobs/${id}/status`, { status: "published" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("published");
    expect((await getJob(id))?.logs.at(-1)?.message).toBe("발행 완료로 표시했습니다.");
    expect((await call("PUT", `/api/jobs/${id}/status`, { status: "draft_ready" })).body.status).toBe("draft_ready");
  });
  it("수기로 바꿀 수 없는 상태 값", async () => {
    const id = await draftJob("posted");
    expect((await call("PUT", `/api/jobs/${id}/status`, { status: "scheduled" })).status).toBe(400);
  });
});

describe("이미지", () => {
  it("한 장 다시 만들기: AI·스타일 조합과 대상 검사", async () => {
    const id = await draftJob();
    expect((await call("POST", `/api/jobs/${id}/images/body-1/regenerate`, { provider: "claude", style: "ghibli" })).body.error).toContain("플랫 일러스트만");
    expect((await call("POST", `/api/jobs/${id}/images/body-0/regenerate`, { provider: "claude", style: "flat" })).status).toBe(404);
    expect((await call("POST", `/api/jobs/${id}/images/body-x/regenerate`, { provider: "claude", style: "flat" })).status).toBe(404);
  });
  it("직접 올리기: 이미지 형식과 자리 검사", async () => {
    const id = await draftJob();
    const up = (target: string, type: string) =>
      fetch(`${base}/api/jobs/${id}/images/${target}`, { method: "POST", headers: { "Content-Type": type }, body: new Uint8Array([1, 2, 3]) }).then((r) => r.status);
    expect(await up("thumbnail", "text/plain")).toBe(400);
    expect(await up("body-0", "image/png")).toBe(404);
  });
  it("미리보기는 이미지 폴더 밖 파일을 열지 않는다", async () => {
    expect((await fetch(`${base}/api/images/x/..%2F..%2Fsettings.json`)).status).toBe(404);
  });
});

describe("로그인 창·추천·삭제", () => {
  it("로그인 창은 네이버·티스토리만, 블로그 ID가 있어야 연다", async () => {
    expect((await call("POST", "/api/browser/login", { platform: "wordpress" })).status).toBe(400);
    await saveSettings({ ...(await getSettings()), tistoryBlogId: undefined });
    expect((await call("POST", "/api/browser/login", { platform: "tistory" })).body.error).toBe("먼저 설정에서 티스토리 블로그 ID를 입력하세요.");
    expect((await call("GET", "/api/browser/login")).body).toEqual({ open: false, platform: null, automationRunning: false });
  });
  it("추천 분야 길이", async () => {
    expect((await call("POST", "/api/recommendations", { field: "a" })).body.error).toBe("분야를 2자 이상 입력하세요.");
    expect((await call("POST", "/api/recommendations", { field: "a".repeat(101) })).body.error).toBe("분야는 100자 이하로 입력하세요.");
  });
  it("중지할 작업이 없으면 409, 삭제는 204", async () => {
    const id = await draftJob();
    expect((await call("POST", `/api/jobs/${id}/cancel`)).status).toBe(409);
    expect((await call("DELETE", `/api/jobs/${id}`)).status).toBe(204);
    expect((await call("GET", `/api/jobs/${id}`)).status).toBe(404);
  });
});
