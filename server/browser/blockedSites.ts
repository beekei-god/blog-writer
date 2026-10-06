import fs from "node:fs/promises";
import path from "node:path";
import type { Platform } from "../../shared/types";
import { DATA_DIR } from "../store";

/**
 * Claude in Chrome이 안전 정책으로 막은 블로그 플랫폼. 한 번 막히면 다음부터는 바로 자동 조작으로 간다.
 * (확장 프로그램 정책이 바뀌었을 수 있으니 설정 화면에서 지우면 다시 Claude in Chrome부터 시도한다)
 */
const FILE = path.join(DATA_DIR, "blocked-sites.json");

type Blocked = Partial<Record<Platform, { at: string; detail: string }>>;

async function read(): Promise<Blocked> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

export const getBlockedSites = read;

export async function isBlocked(p: Platform) {
  return !!(await read())[p];
}

export async function markBlocked(p: Platform, detail: string) {
  const all = await read();
  all[p] = { at: new Date().toISOString(), detail };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2), "utf8");
}

export async function clearBlocked() {
  await fs.rm(FILE, { force: true });
}
