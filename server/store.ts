import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { keyedQueue, readJson, writeJsonAtomic } from "./fsutil";
import { BUSY_STATUSES, RECOMMENDED_MODELS } from "../shared/types";
import type { ImageOptions, Job, Settings } from "../shared/types";

/** 프로젝트 루트 (이 파일 기준). 서버를 어느 폴더에서 실행해도 같은 경로를 쓴다. */
export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** 데이터 폴더. 테스트 등에서 따로 쓰려면 BLOG_WRITER_DATA_DIR로 지정한다. */
export const DATA_DIR = process.env.BLOG_WRITER_DATA_DIR ? path.resolve(process.env.BLOG_WRITER_DATA_DIR) : path.join(PROJECT_ROOT, "data");
const JOBS_DIR = path.join(DATA_DIR, "jobs");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const IMAGES_DIR = path.join(DATA_DIR, "images");
/** Claude in Chrome이 막는 블로그용 자동 조작 크롬의 전용 프로필 (로그인 유지) */
export const CHROME_PROFILE_DIR = path.join(DATA_DIR, "chrome-profile");

const DEFAULT_SETTINGS: Settings = {
  images: { thumbnail: true, bodyImages: 0, provider: "claude", style: "flat" },
  models: { ...RECOMMENDED_MODELS },
};

// 같은 파일에 동시에 쓰지 않도록 id별로 쓰기를 직렬화한다.
const enqueue = keyedQueue();

export async function getSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    // 예전 설정(마우스 속도)은 버린다. 예전의 기본 블로그(platform)와 blogId는 아래에서 블로그별 값으로 옮기고 버린다.
    const { mouseSpeed: _old, platform: legacyPlatform, blogId: legacyBlogId, ...stored } = JSON.parse(raw);
    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      images: { ...DEFAULT_SETTINGS.images, ...stored.images },
      models: { ...DEFAULT_SETTINGS.models, ...stored.models },
    };
    // 예전에는 기본 블로그의 ID·주소를 blogId 하나에 넣었다. 그 블로그의 칸이 비어 있으면 값을 옮긴다.
    // 기본 블로그가 워드프레스인데 blogId가 주소가 아니라 단순한 ID이면, 워드프레스를 고르기 전에 쓰던 네이버 ID로 본다.
    if (typeof legacyBlogId === "string" && legacyBlogId.trim()) {
      const id = legacyBlogId.trim();
      if (legacyPlatform === "tistory") merged.tistoryBlogId ||= id;
      else if (legacyPlatform === "wordpress" && !/^[\w-]+$/.test(id)) merged.wordpressUrl ||= id;
      else merged.naverBlogId ||= id;
    }
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  return enqueue("settings", () => writeJsonAtomic(SETTINGS_FILE, s));
}

const jobFile = (id: string) => path.join(JOBS_DIR, `${path.basename(id)}.json`);

export const getJob = (id: string) => readJson<Job | null>(jobFile(id), null);

export async function listJobs(): Promise<Job[]> {
  await fs.mkdir(JOBS_DIR, { recursive: true });
  const files = (await fs.readdir(JOBS_DIR)).filter((f) => f.endsWith(".json"));
  const jobs = await Promise.all(
    files.map(async (f) => {
      try {
        return JSON.parse(await fs.readFile(path.join(JOBS_DIR, f), "utf8")) as Job;
      } catch {
        return null;
      }
    }),
  );
  return jobs
    .filter((j): j is Job => j !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const jobImageDir = (id: string) => path.join(IMAGES_DIR, path.basename(id));
/** 작업 이미지 폴더 안의 파일 경로 (파일명은 basename으로 제한해 폴더 밖을 가리키지 않는다) */
export const jobImagePath = (id: string, file: string) => path.join(jobImageDir(id), path.basename(file));

/** 이미지를 새 파일로 바꾼 뒤 예전 파일을 지운다 (이미지 폴더 밖은 건드리지 않는다). */
export const removeImageFile = (jobId: string, file: string) =>
  fs.rm(jobImagePath(jobId, file), { force: true }).catch(() => {});

export async function createJob(
  topic: string,
  imageOptions: ImageOptions,
  links: string[] = [],
): Promise<Job> {
  const now = new Date().toISOString();
  const job: Job = {
    id: randomUUID(),
    topic,
    links,
    status: "researching",
    imageOptions,
    createdAt: now,
    updatedAt: now,
    sources: [],
    logs: [],
  };
  await enqueue(job.id, () => writeJsonAtomic(jobFile(job.id), job));
  return job;
}

/** 읽기-수정-쓰기를 한 번에 직렬화해서 로그/상태 갱신이 서로 덮어쓰지 않게 한다. */
export function updateJob(id: string, fn: (job: Job) => void): Promise<Job | null> {
  return enqueue(id, async () => {
    const job = await getJob(id);
    if (!job) return null;
    fn(job);
    job.updatedAt = new Date().toISOString();
    await writeJsonAtomic(jobFile(id), job);
    return job;
  });
}

export function log(id: string, message: string) {
  console.log(`[${id.slice(0, 8)}] ${message}`);
  return updateJob(id, (j) => {
    j.logs.push({ at: new Date().toISOString(), message });
  });
}

export async function deleteJob(id: string) {
  await enqueue(id, () => fs.rm(jobFile(id), { force: true }));
  await fs.rm(jobImageDir(id), { recursive: true, force: true });
}

/** 서버가 죽으면서 진행 중으로 남은 작업을 실패 처리한다. */
export async function recoverStuckJobs() {
  for (const job of await listJobs()) {
    if (BUSY_STATUSES.includes(job.status)) {
      await updateJob(job.id, (j) => {
        j.status = j.post ? "draft_ready" : "failed";
        j.error = "서버가 재시작되어 작업이 중단되었습니다.";
        delete j.generatingImages;
        delete j.regeneratingImages;
        delete j.imageRunsOnly;
      });
    }
  }
}
