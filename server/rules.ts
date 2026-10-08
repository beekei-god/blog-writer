import fs from "node:fs/promises";
import path from "node:path";
import { writeFileAtomic } from "./fsutil";
import { DATA_DIR, PROJECT_ROOT } from "./store";

/**
 * 글쓰기 규칙. 사용자가 화면에서 고친 내용은 data/writing-rules.md 에 저장되고,
 * 없으면 저장소의 기본 규칙(rules/default-writing-rules.md)을 쓴다.
 * 작업을 시작할 때마다 새로 읽으므로 규칙을 고치면 다음 작업부터 바로 반영된다.
 */
const RULES_FILE = path.join(DATA_DIR, "writing-rules.md");
const DEFAULT_FILE = path.join(PROJECT_ROOT, "rules/default-writing-rules.md");

export interface Rules {
  content: string;
  isDefault: boolean;
  updatedAt: string | null;
}

export async function getRules(): Promise<Rules> {
  try {
    const [content, stat] = await Promise.all([fs.readFile(RULES_FILE, "utf8"), fs.stat(RULES_FILE)]);
    return { content, isDefault: false, updatedAt: stat.mtime.toISOString() };
  } catch {
    return { content: await fs.readFile(DEFAULT_FILE, "utf8"), isDefault: true, updatedAt: null };
  }
}

export async function saveRules(content: string): Promise<Rules> {
  await writeFileAtomic(RULES_FILE, content);
  return getRules();
}

export async function resetRules(): Promise<Rules> {
  await fs.rm(RULES_FILE, { force: true });
  return getRules();
}

/** 한국 시간 기준 날짜 (YYYY-MM-DD) */
export const kstDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);

/** 한국 시간 기준 오늘 날짜 (YYYY.MM.DD) */
export const todayKST = () => kstDate(new Date()).replaceAll("-", ".");
