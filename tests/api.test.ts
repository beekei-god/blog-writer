import fs from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { saveCategoryList, saveLastCategory } from "../server/categories";
import { createJob, getJob, getSettings, jobImageDir, saveSettings, updateJob } from "../server/store";

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
  it("네이버·티스토리 예약발행: 과거 시각, 네이버는 10분 단위", async () => {
    await saveSettings({ ...(await getSettings()), naverBlogId: "nid" });
    const id = await draftJob();
    const past = await call("POST", `/api/jobs/${id}/post-to-blog`, { platform: "naver", mode: "schedule", scheduledAt: new Date().toISOString() });
    expect(past.body.error).toContain("1분 이상");
    const at = new Date(Date.now() + 86_400_000);
    at.setUTCMinutes(5, 0, 0);
    const odd = await call("POST", `/api/jobs/${id}/post-to-blog`, { platform: "naver", mode: "schedule", scheduledAt: at.toISOString() });
    expect(odd.body.error).toBe("네이버 예약 시각은 10분 단위로 고를 수 있습니다.");
    expect((await getJob(id))?.status).toBe("draft_ready");
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
  it("카테고리 값 검사: 모양이 틀리거나 워드프레스인데 ID가 없으면 거절", async () => {
    await saveSettings({ ...(await getSettings()), naverBlogId: "nid", wordpressUrl: "wp.example" });
    const id = await draftJob();
    const bad = await call("POST", `/api/jobs/${id}/post-to-blog`, { platform: "naver", category: { name: "" } });
    expect(bad).toEqual({ status: 400, body: { error: "카테고리 값이 올바르지 않습니다." } });
    const noId = await call("POST", `/api/jobs/${id}/post-to-blog`, { platform: "wordpress", category: { name: "여행" } });
    expect(noId).toEqual({ status: 400, body: { error: "워드프레스 카테고리는 사이트 목록에서 골라 주세요." } });
    expect((await getJob(id))?.status).toBe("draft_ready");
  });
  it("초안이 없으면 거절", async () => {
    const job = await createJob("초안 없음", IMAGES);
    expect((await call("POST", `/api/jobs/${job.id}/post-to-blog`, { platform: "naver" })).body.error).toBe("초안이 없습니다.");
  });
});

describe("카테고리 목록", () => {
  it("저장해 둔 목록과 마지막으로 고른 카테고리를 돌려준다 (블로그가 바뀌면 목록은 비움)", async () => {
    await saveSettings({ ...(await getSettings()), naverBlogId: "nid" });
    await saveCategoryList("naver", "nid", ["일상", "여행"]);
    await saveLastCategory("naver", { name: "여행" });
    const r = await call("GET", "/api/categories/naver");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ categories: [{ name: "일상" }, { name: "여행" }], last: { name: "여행" } });
    await saveSettings({ ...(await getSettings()), naverBlogId: "other" });
    expect((await call("GET", "/api/categories/naver")).body.categories).toEqual([]);
  });
  it("알 수 없는 블로그는 404, 워드프레스는 불러오기(refresh) 대상이 아니다, 블로그 ID가 없으면 거절", async () => {
    expect((await call("GET", "/api/categories/blogger")).status).toBe(404);
    expect((await call("POST", "/api/categories/wordpress/refresh")).status).toBe(404);
    await saveSettings({ ...(await getSettings()), tistoryBlogId: undefined });
    const r = await call("POST", "/api/categories/tistory/refresh");
    expect(r).toEqual({ status: 400, body: { error: "먼저 설정에서 티스토리 블로그 ID를 입력하세요." } });
  });
});

describe("수기 상태 변경", () => {
  it("초안 검토 이후의 글은 초안 검토·임시저장 완료·발행완료 사이를 오갈 수 있다", async () => {
    const id = await draftJob();
    const r = await call("PUT", `/api/jobs/${id}/status`, { status: "published" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("published");
    expect((await getJob(id))?.logs.at(-1)?.message).toBe("블로그 발행완료로 표시했습니다.");
    expect((await call("PUT", `/api/jobs/${id}/status`, { status: "posted" })).body.status).toBe("posted");
    expect((await getJob(id))?.logs.at(-1)?.message).toBe("블로그 임시저장 완료로 표시했습니다.");
    expect((await call("PUT", `/api/jobs/${id}/status`, { status: "draft_ready" })).body.status).toBe("draft_ready");
    expect((await call("PUT", `/api/jobs/${id}/status`, { status: "posted" })).body.status).toBe("posted");
    await updateJob(id, (j) => void (j.status = "scheduled"));
    expect((await call("PUT", `/api/jobs/${id}/status`, { status: "posted" })).body.status).toBe("posted");
  });
  it("같은 상태나 초안 검토 전의 글은 거절", async () => {
    const id = await draftJob();
    expect((await call("PUT", `/api/jobs/${id}/status`, { status: "draft_ready" })).body.error).toBe("초안 검토 상태의 글은 초안 검토(으)로 바꿀 수 없습니다.");
    await updateJob(id, (j) => void (j.status = "failed"));
    expect((await call("PUT", `/api/jobs/${id}/status`, { status: "published" })).body.error).toBe("실패 상태의 글은 블로그 발행완료(으)로 바꿀 수 없습니다.");
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
  it("본문 이미지 자리 추가: 고른 블록 뒤에 이미지 없는 이미지 블록이 들어가고, 가까운 소제목을 이름으로 쓴다", async () => {
    const id = await draftJob();
    await updateJob(id, (j) => void (j.post!.blocks = [{ type: "paragraph", text: "도입" }, { type: "heading", text: "**둘째** 소제목" }, { type: "paragraph", text: "내용" }, { type: "image", prompt: "p", alt: "" }]));
    const r = await call("POST", `/api/jobs/${id}/images`, { afterBlock: 2 });
    expect(r.status).toBe(201);
    const blocks = r.body.post.blocks;
    expect(blocks.map((b: { type: string }) => b.type)).toEqual(["paragraph", "heading", "paragraph", "image", "image"]);
    expect(blocks[3]).toMatchObject({ type: "image", alt: "둘째 소제목" });
    expect(blocks[3].prompt).toContain("둘째 소제목");
    expect(blocks[3].file).toBeUndefined();
    expect((await getJob(id))?.logs.at(-1)?.message).toContain("본문 이미지 자리를 추가했습니다 (#3)");
    // 앞에 소제목이 없으면 글 제목으로 이름을 짓고, 설명에 같은 말이 두 번 나오지 않는다
    const top = await call("POST", `/api/jobs/${id}/images`, { afterBlock: 0 });
    expect(top.body.post.blocks[1]).toMatchObject({ type: "image", alt: "제목" });
    expect(top.body.post.blocks[1].prompt).toBe('블로그 글 "제목"의 이 위치에 들어갈 삽화. 그 부분 내용이 한눈에 보이는 한 장면.');
  });
  it("본문 이미지 자리 추가: 자리·개수·진행 중 검사", async () => {
    const id = await draftJob();
    expect((await call("POST", `/api/jobs/${id}/images`, { afterBlock: 9 })).status).toBe(404);
    expect((await call("POST", `/api/jobs/${id}/images`, { afterBlock: -1 })).status).toBe(400);
    await updateJob(id, (j) => void (j.post!.blocks = Array.from({ length: 6 }, () => ({ type: "image" as const, prompt: "p", alt: "a" }))));
    expect((await call("POST", `/api/jobs/${id}/images`, { afterBlock: 0 })).body.error).toBe("본문 이미지는 최대 6장입니다.");
    expect((await call("POST", "/api/jobs/없는글/images", { afterBlock: 0 })).status).toBe(400);
  });
  it("이미지 삭제: 썸네일은 없애고 본문 이미지는 블록을 없애며, 파일도 지운다", async () => {
    const id = await draftJob();
    const dir = jobImageDir(id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "thumbnail-1.png"), "x");
    await fs.writeFile(path.join(dir, "body-1-1.png"), "x");
    await updateJob(id, (j) => {
      j.post!.thumbnail!.file = "thumbnail-1.png";
      (j.post!.blocks[1] as { file?: string }).file = "body-1-1.png";
    });
    const body = await call("DELETE", `/api/jobs/${id}/images/body-1`);
    expect(body.status).toBe(200);
    expect(body.body.post.blocks).toEqual([{ type: "paragraph", text: "본문" }]);
    await expect(fs.stat(path.join(dir, "body-1-1.png"))).rejects.toThrow();
    const thumb = await call("DELETE", `/api/jobs/${id}/images/thumbnail`);
    expect(thumb.body.post.thumbnail).toBeUndefined();
    await expect(fs.stat(path.join(dir, "thumbnail-1.png"))).rejects.toThrow();
    expect((await getJob(id))?.logs.map((l) => l.message)).toEqual(expect.arrayContaining(["본문 이미지 #1을 삭제했습니다.", "썸네일을 삭제했습니다."]));
  });
  it("이미지 삭제: 없는 이미지는 404", async () => {
    const id = await draftJob();
    expect((await call("DELETE", `/api/jobs/${id}/images/body-0`)).status).toBe(404); // 문단이다
    expect((await call("DELETE", `/api/jobs/${id}/images/body-9`)).status).toBe(404);
    expect((await call("DELETE", `/api/jobs/${id}/images/아무거나`)).status).toBe(404);
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
