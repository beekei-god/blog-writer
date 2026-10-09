import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const claude = vi.hoisted(() => ({
  result: null as unknown,
  fail: null as Error | null,
  calls: [] as { system: string; prompt: string; tools?: string[]; schema: { required: string[] } }[],
  hold: null as Promise<void> | null,
}));
vi.mock("../server/claude", () => ({
  runClaude: vi.fn(async (opts: { system: string; prompt: string; tools?: string[]; schema: { required: string[] } }) => {
    claude.calls.push(opts);
    if (claude.hold) await claude.hold;
    if (claude.fail) throw claude.fail;
    return claude.result;
  }),
}));

import { createApp } from "../server/app";
import { cancelJob } from "../server/cancel";
import { applyProposal, proposeEdit } from "../server/editPost";
import { isRunning } from "../server/pipeline";
import { createJob, getJob, updateJob } from "../server/store";
import type { EditProposal, Post } from "../shared/types";

const IMG = { type: "image" as const, prompt: "p", alt: "그림", file: "body-3-1.png" };
const post = (): Post => ({
  title: "제목",
  summary: "요약",
  tags: ["태그"],
  blocks: [
    { type: "paragraph", text: "도입" },
    { type: "heading", text: "소제목" },
    { type: "paragraph", text: "내용" },
    { ...IMG },
    { type: "heading", text: "참고 자료" },
    { type: "list", items: ["공식: https://a.example"] },
  ],
});
const base = { rules: "규칙", today: "2026.10.09", jobId: "j", onProgress: () => {} };

beforeEach(() => {
  claude.result = null;
  claude.fail = null;
  claude.calls = [];
  claude.hold = null;
});

describe("프롬프트로 글 고치기 (Claude 호출)", () => {
  it("범위만 고친다: 범위의 블록만 새 블록으로 바뀌고, 이미지는 원래 이미지 그대로 돌아온다", async () => {
    claude.result = {
      note: "문단을 늘렸습니다.",
      blocks: [{ type: "heading", text: "소제목" }, { type: "paragraph", text: "내용\n새 문장" }, { type: "image", ref: "img-1" }],
    };
    const r = await proposeEdit({ ...base, post: post(), prompt: "내용을 늘려 줘", range: { start: 1, end: 3 } });
    expect(r.before).toHaveLength(3);
    expect(r.after[2]).toEqual(IMG); // 파일까지 그대로
    expect(r.after[1]).toEqual({ type: "paragraph", text: "내용\n새 문장" });
    expect(r.title).toBeUndefined();
    expect(r.note).toBe("문단을 늘렸습니다.");
    // 범위 앞뒤는 문맥으로만 보여 준다
    const call = claude.calls[0];
    expect(call.prompt).toContain("범위 앞의 블록 (문맥, 고치지 않음)");
    expect(call.prompt).toContain('"ref":"img-1"');
    expect(call.prompt).not.toContain("body-3-1.png");
    expect(call.tools).toEqual(["WebSearch", "WebFetch"]);
    expect(call.schema.required).toEqual(["note", "blocks"]);
    expect(call.system).toContain("글쓰기 규칙");
  });
  it("글 전체를 고치면 제목·요약도 받는다", async () => {
    claude.result = { title: "새 제목", summary: "새 요약", note: "고침", blocks: [...post().blocks.slice(0, 2), { type: "paragraph", text: "바뀐 내용" }, { type: "image", ref: "img-1" }, ...post().blocks.slice(4)] };
    const r = await proposeEdit({ ...base, post: post(), prompt: "제목도 바꿔 줘" });
    expect(r).toMatchObject({ title: "새 제목", summary: "새 요약" });
    expect(claude.calls[0].schema.required).toEqual(["title", "summary", "note", "blocks"]);
    expect(r.charsAfter).toBeGreaterThan(0);
  });
  it("이미지 블록을 빼거나 늘리거나 모르는 ref를 쓰면 쓸 수 없다", async () => {
    for (const blocks of [
      [{ type: "paragraph", text: "x" }], // 이미지 빠짐
      [{ type: "image", ref: "img-1" }, { type: "image", ref: "img-1" }], // 중복
      [{ type: "image", ref: "img-9" }], // 없는 ref
    ]) {
      claude.result = { note: "n", blocks };
      await expect(proposeEdit({ ...base, post: post(), prompt: "고쳐 줘", range: { start: 2, end: 3 } })).rejects.toThrow("이미지 블록");
    }
  });
  it("바뀐 것이 없으면 이유와 함께 거절한다", async () => {
    claude.result = { note: "이미 충분합니다.", blocks: [{ type: "paragraph", text: "내용" }, { ...{ type: "image", ref: "img-1" } }] };
    await expect(proposeEdit({ ...base, post: post(), prompt: "고쳐 줘", range: { start: 2, end: 3 } })).rejects.toThrow("바꿀 부분이 없다고 판단했습니다: 이미 충분합니다.");
  });
  it("칸이 빈 표는 뺀다", async () => {
    claude.result = {
      note: "표를 더했습니다.",
      blocks: [{ type: "paragraph", text: "내용" }, { type: "table", headers: ["a", "b"], rows: [["1", "2"], ["3", ""]] }, { type: "image", ref: "img-1" }],
    };
    const r = await proposeEdit({ ...base, post: post(), prompt: "표 추가", range: { start: 2, end: 3 } });
    expect(r.after.map((b) => b.type)).toEqual(["paragraph", "table", "image"]);
    expect((r.after[1] as { rows: string[][] }).rows).toEqual([["1", "2"]]);
  });
});

describe("고친 결과 적용", () => {
  const proposal = (over: Partial<EditProposal> = {}): EditProposal => ({
    prompt: "p",
    range: { start: 2, end: 3 },
    status: "ready",
    createdAt: "x",
    before: post().blocks.slice(2, 4),
    after: [{ type: "paragraph", text: "새 내용" }, { ...IMG }],
    ...over,
  });
  it("범위만 바꾸고 앞뒤 글은 그대로 둔다", () => {
    const next = applyProposal(post(), proposal())!;
    expect(next.blocks.map((b) => b.type)).toEqual(["paragraph", "heading", "paragraph", "image", "heading", "list"]);
    expect(next.blocks[2]).toEqual({ type: "paragraph", text: "새 내용" });
    expect(next.title).toBe("제목");
  });
  it("그 사이 범위의 글이 바뀌었으면 적용하지 않는다", () => {
    const changed = post();
    changed.blocks[2] = { type: "paragraph", text: "직접 고친 내용" };
    expect(applyProposal(changed, proposal())).toBeNull();
    expect(applyProposal(post(), proposal({ status: "running" }))).toBeNull();
  });
  it("글 전체는 제목·요약도 바꾸고, 블록 수가 달라졌으면 적용하지 않는다", () => {
    const whole = proposal({ range: undefined, before: post().blocks, after: post().blocks.slice(0, 3), title: "새 제목", summary: "새 요약" });
    expect(applyProposal(post(), whole)).toMatchObject({ title: "새 제목", summary: "새 요약" });
    const more = post();
    more.blocks.push({ type: "paragraph", text: "더" });
    expect(applyProposal(more, whole)).toBeNull();
  });
});

describe("프롬프트로 글 고치기 (요청)", () => {
  let server: Server;
  let url = "";
  beforeAll(async () => {
    server = createApp().listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(url + path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
  const draft = async () => {
    const job = await createJob("주제", { thumbnail: false, bodyImages: 1, provider: "claude", style: "flat" });
    await updateJob(job.id, (j) => {
      j.status = "draft_ready";
      j.post = post();
    });
    return job.id;
  };
  const until = async (cond: () => boolean | Promise<boolean>) => {
    for (let i = 0; i < 300 && !(await cond()); i++) await new Promise((r) => setTimeout(r, 10));
    expect(await cond()).toBe(true);
  };
  const okResult = { note: "고쳤습니다", blocks: [{ type: "paragraph", text: "새 내용" }, { type: "image", ref: "img-1" }] };

  it("요청 검사: 짧은 프롬프트, 범위 오류, 초안 없음", async () => {
    const id = await draft();
    expect((await call("POST", `/api/jobs/${id}/edit`, { prompt: "a" })).status).toBe(400);
    expect((await call("POST", `/api/jobs/${id}/edit`, { prompt: "고쳐 줘", range: { start: 4, end: 2 } })).status).toBe(400);
    expect((await call("POST", `/api/jobs/${id}/edit`, { prompt: "고쳐 줘", range: { start: 0, end: 99 } })).body.error).toContain("고칠 부분을 찾지 못했습니다");
    const empty = (await createJob("주제", { thumbnail: false, bodyImages: 0, provider: "claude", style: "flat" })).id;
    expect((await call("POST", `/api/jobs/${empty}/edit`, { prompt: "고쳐 줘" })).body.error).toBe("초안이 없습니다.");
    expect((await call("POST", `/api/jobs/${id}/edit/apply`)).status).toBe(400);
  });
  it("시작 → 제안 → 적용: 만드는 동안 글 수정은 막히고, 적용하면 글이 바뀐다", async () => {
    const id = await draft();
    let release!: () => void;
    claude.hold = new Promise<void>((r) => (release = r));
    claude.result = okResult;
    expect((await call("POST", `/api/jobs/${id}/edit`, { prompt: "내용을 새로 써 줘", range: { start: 2, end: 3 } })).status).toBe(202);
    expect((await getJob(id))!.editProposal).toMatchObject({ status: "running", range: { start: 2, end: 3 } });
    expect(isRunning(id)).toBe(true);
    expect((await call("PUT", `/api/jobs/${id}/post`, post())).status).toBe(409); // 만드는 동안 수정 불가
    expect((await call("POST", `/api/jobs/${id}/edit`, { prompt: "또 고쳐 줘" })).status).toBe(409);
    release();
    await until(async () => (await getJob(id))!.editProposal?.status === "ready");
    expect((await getJob(id))!.post!.blocks[2]).toEqual({ type: "paragraph", text: "내용" }); // 적용 전에는 글이 그대로
    const applied = await call("POST", `/api/jobs/${id}/edit/apply`);
    expect(applied.status).toBe(200);
    expect(applied.body.post.blocks[2]).toEqual({ type: "paragraph", text: "새 내용" });
    expect(applied.body.post.blocks[3]).toMatchObject({ type: "image", file: "body-3-1.png" });
    expect(applied.body.editProposal).toBeUndefined();
    expect((await getJob(id))!.logs.at(-1)!.message).toContain("프롬프트로 글을 고쳤습니다: 고쳤습니다");
  });
  it("제안을 만든 뒤 그 범위를 직접 고쳤으면 적용을 거절하고, 버릴 수 있다", async () => {
    const id = await draft();
    claude.result = okResult;
    await call("POST", `/api/jobs/${id}/edit`, { prompt: "새로 써 줘", range: { start: 2, end: 3 } });
    await until(async () => (await getJob(id))!.editProposal?.status === "ready");
    await updateJob(id, (j) => void (j.post!.blocks[2] = { type: "paragraph", text: "직접 고침" }));
    const stale = await call("POST", `/api/jobs/${id}/edit/apply`);
    expect(stale.status).toBe(409);
    expect(stale.body.error).toContain("다시 만들어 주세요");
    const dropped = await call("DELETE", `/api/jobs/${id}/edit`);
    expect(dropped.status).toBe(200);
    expect(dropped.body.editProposal).toBeUndefined();
    expect(dropped.body.post.blocks[2]).toEqual({ type: "paragraph", text: "직접 고침" });
  });
  it("Claude가 실패하면 실패로 남기고(글은 그대로), 중지하면 제안이 사라진다", async () => {
    const id = await draft();
    claude.fail = new Error("claude 실패");
    await call("POST", `/api/jobs/${id}/edit`, { prompt: "고쳐 줘" });
    await until(async () => (await getJob(id))!.editProposal?.status === "failed");
    expect((await getJob(id))!.editProposal!.error).toBe("claude 실패");
    expect((await getJob(id))!.post).toEqual(post());
    expect(isRunning(id)).toBe(false);

    let release!: () => void;
    claude.fail = null;
    claude.result = okResult;
    claude.hold = new Promise<void>((r) => (release = r));
    await call("POST", `/api/jobs/${id}/edit`, { prompt: "다시 고쳐 줘" });
    await until(() => claude.calls.length === 2);
    expect(cancelJob(id)).toBe(true);
    release();
    await until(async () => !isRunning(id) && (await getJob(id))!.editProposal === undefined);
  });
});
