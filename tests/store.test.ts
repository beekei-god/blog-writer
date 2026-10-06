import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createJob, DATA_DIR, getJob, getSettings, log, updateJob } from "../server/store";

const writeRaw = (data: unknown) => fs.mkdir(DATA_DIR, { recursive: true }).then(() => fs.writeFile(path.join(DATA_DIR, "settings.json"), JSON.stringify(data)));

describe("데이터 폴더", () => {
  it("BLOG_WRITER_DATA_DIR를 쓴다", () => expect(DATA_DIR).toBe(path.resolve(process.env.BLOG_WRITER_DATA_DIR!)));
});

describe("예전 설정 옮기기", () => {
  it("설정 파일이 없으면 기본값", async () => {
    await fs.rm(path.join(DATA_DIR, "settings.json"), { force: true });
    const s = await getSettings();
    expect(s.images).toEqual({ thumbnail: true, bodyImages: 0, provider: "claude", style: "flat" });
    expect(s.naverBlogId).toBeUndefined();
  });

  it.each([
    [{ platform: "naver", blogId: "nid" }, { naverBlogId: "nid" }],
    [{ platform: "tistory", blogId: "tid" }, { tistoryBlogId: "tid" }],
    [{ platform: "wordpress", blogId: "https://wp.example" }, { wordpressUrl: "https://wp.example" }],
    // 워드프레스였지만 주소가 아니라 ID면 네이버 ID로 본다
    [{ platform: "wordpress", blogId: "plainid" }, { naverBlogId: "plainid" }],
  ])("%o → %o", async (legacy, expected) => {
    await writeRaw({ ...legacy, mouseSpeed: 2 });
    const s = (await getSettings()) as unknown as Record<string, unknown>;
    expect(s).toMatchObject(expected);
    expect(s).not.toHaveProperty("platform");
    expect(s).not.toHaveProperty("blogId");
    expect(s).not.toHaveProperty("mouseSpeed");
  });

  it("이미 있는 블로그별 값은 덮어쓰지 않는다", async () => {
    await writeRaw({ platform: "naver", blogId: "old", naverBlogId: "new", images: { bodyImages: 3 } });
    const s = await getSettings();
    expect(s.naverBlogId).toBe("new");
    expect(s.images).toMatchObject({ thumbnail: true, bodyImages: 3 });
  });
});

describe("작업 저장", () => {
  it("동시에 갱신해도 로그가 빠지지 않는다", async () => {
    const job = await createJob("주제", { thumbnail: false, bodyImages: 0, provider: "claude", style: "flat" });
    await Promise.all(Array.from({ length: 20 }, (_, i) => log(job.id, `로그 ${i}`)));
    await updateJob(job.id, (j) => void (j.status = "draft_ready"));
    const saved = await getJob(job.id);
    expect(saved?.logs).toHaveLength(20);
    expect(saved?.status).toBe("draft_ready");
    const leftovers = (await fs.readdir(path.join(DATA_DIR, "jobs"))).filter((f) => f.endsWith(".tmp"));
    expect(leftovers).toEqual([]);
  });
});
