import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * 파일을 임시 파일에 다 쓴 뒤 이름을 바꿔 교체한다. 쓰는 도중에 서버가 죽어도 반쯤 쓴 파일이 남지 않는다.
 * mode를 주면 그 권한으로 만든다 (비밀 정보는 0o600).
 */
export async function writeFileAtomic(file: string, content: string, mode?: number) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, content, { encoding: "utf8", ...(mode === undefined ? {} : { mode }) });
  if (mode !== undefined) await fs.chmod(tmp, mode); // umask와 상관없이 권한을 맞춘다
  await fs.rename(tmp, file);
}

/** JSON 파일을 읽는다. 없거나 읽을 수 없으면 fallback */
export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export const writeJsonAtomic = (file: string, data: unknown, mode?: number) =>
  writeFileAtomic(file, JSON.stringify(data, null, 2), mode);

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 작업을 하나씩 차례로 실행한다. 앞 작업이 실패해도 다음 작업은 실행된다. */
export function serialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const next = tail.catch(() => {}).then(task);
    tail = next;
    return next;
  };
}

/** 키(예: 파일 id)마다 따로 줄을 세운다. 다른 키끼리는 동시에 실행된다. */
export function keyedQueue() {
  const tails = new Map<string, Promise<unknown>>();
  return <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const next = (tails.get(key) ?? Promise.resolve()).catch(() => {}).then(task);
    tails.set(key, next);
    return next;
  };
}
