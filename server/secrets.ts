import fs from "node:fs/promises";
import path from "node:path";
import { serialQueue, writeJsonAtomic } from "./fsutil";
import { DATA_DIR } from "./store";

/**
 * 비밀 정보. 로컬 파일(data/secrets.json, git 제외, 권한 0600)에만 저장하고 화면으로는 돌려주지 않는다.
 * - 네이버 클라우드 플랫폼 API HUB 키 (데이터랩)
 * - 워드프레스 사용자명과 Application Password
 * 한 파일에 같이 두므로, 저장할 때는 항상 기존 내용을 읽어 합친 뒤 자기 항목만 바꾼다.
 */
const FILE = path.join(DATA_DIR, "secrets.json");

type SecretsFile = {
  naverClientId?: string;
  naverClientSecret?: string;
  wpUsername?: string;
  wpAppPassword?: string;
  /** 예전에 WordPress.com 계정 연결을 지원했을 때 남은 값. 더 쓰지 않으며, 워드프레스 연결을 저장하거나 지울 때 같이 지운다. */
  wpcomToken?: string;
  wpcomUsername?: string;
};

async function readAll(): Promise<SecretsFile> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as SecretsFile;
  } catch {
    return {};
  }
}

// 읽기-합치기-쓰기가 겹쳐 서로의 항목을 지우지 않도록 하나씩 처리한다.
const serial = serialQueue();

const update = (fn: (s: SecretsFile) => SecretsFile) => serial(async () => writeJsonAtomic(FILE, fn(await readAll()), 0o600));

export interface NaverKeys {
  clientId: string;
  clientSecret: string;
}

export async function getNaverKeys(): Promise<NaverKeys | null> {
  // 환경변수가 있으면 우선
  if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
    return { clientId: process.env.NAVER_CLIENT_ID, clientSecret: process.env.NAVER_CLIENT_SECRET };
  }
  const s = await readAll();
  return s.naverClientId && s.naverClientSecret ? { clientId: s.naverClientId, clientSecret: s.naverClientSecret } : null;
}

export function saveNaverKeys(keys: NaverKeys | null) {
  return update(({ naverClientId: _a, naverClientSecret: _b, ...rest }) =>
    keys ? { ...rest, naverClientId: keys.clientId, naverClientSecret: keys.clientSecret } : rest,
  );
}

export interface WordPressAuth {
  username: string;
  appPassword: string;
}

export async function getWordPressAuth(): Promise<WordPressAuth | null> {
  const s = await readAll();
  return s.wpUsername && s.wpAppPassword ? { username: s.wpUsername, appPassword: s.wpAppPassword } : null;
}

export function saveWordPressAuth(auth: WordPressAuth | null) {
  return update(({ wpUsername: _a, wpAppPassword: _b, wpcomToken: _c, wpcomUsername: _d, ...rest }) =>
    auth ? { ...rest, wpUsername: auth.username, wpAppPassword: auth.appPassword } : rest,
  );
}
