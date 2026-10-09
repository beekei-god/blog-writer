import path from "node:path";
import type { BlogCategory, Platform } from "../shared/types";
import { readJson, serialQueue, writeJsonAtomic } from "./fsutil";
import { DATA_DIR } from "./store";

/**
 * 블로그 카테고리 기억: 네이버·티스토리는 블로그 에디터에서 읽어 온 목록(워드프레스는 사이트에서 바로 읽으므로 저장하지 않는다),
 * 그리고 블로그마다 마지막으로 올릴 때 고른 카테고리(다음에 처음 값으로 쓴다). 비밀 값은 없다.
 */
export interface CategoryFile {
  lists: Partial<Record<"naver" | "tistory", { blogId: string; names: string[]; fetchedAt: string }>>;
  last: Partial<Record<Platform, BlogCategory>>;
}

const FILE = path.join(DATA_DIR, "categories.json");
const serial = serialQueue();

const read = async (): Promise<CategoryFile> => {
  const f = await readJson<Partial<CategoryFile>>(FILE, {});
  return { lists: f.lists ?? {}, last: f.last ?? {} };
};

/** 저장해 둔 목록. 다른 블로그(ID가 바뀐 경우)의 목록이면 없는 것으로 본다 */
export async function getSavedCategories(platform: "naver" | "tistory", blogId: string) {
  const l = (await read()).lists[platform];
  return l && l.blogId === blogId ? { categories: l.names.map((name) => ({ name })), fetchedAt: l.fetchedAt } : null;
}

export const saveCategoryList = (platform: "naver" | "tistory", blogId: string, names: string[]) =>
  serial(async () => {
    const f = await read();
    const fetchedAt = new Date().toISOString();
    f.lists[platform] = { blogId, names, fetchedAt };
    await writeJsonAtomic(FILE, f);
    return fetchedAt;
  });

export const getLastCategory = async (platform: Platform) => (await read()).last[platform];

/** 올릴 때 고른 카테고리를 기억한다 (고르지 않았으면 기억을 지운다) */
export const saveLastCategory = (platform: Platform, category: BlogCategory | undefined) =>
  serial(async () => {
    const f = await read();
    if (category) f.last[platform] = category;
    else delete f.last[platform];
    await writeJsonAtomic(FILE, f);
  });
