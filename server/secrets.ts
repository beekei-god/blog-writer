import path from "node:path";
import { readJson, serialQueue, writeJsonAtomic } from "./fsutil";
import type { WebAi } from "./images/webAi";
import { DATA_DIR } from "./store";

/**
 * 비밀 정보. 로컬 파일(data/secrets.json, git 제외, 권한 0600)에만 저장하고 화면으로는 돌려주지 않는다.
 * - 네이버 클라우드 플랫폼 API HUB 키 (데이터랩)
 * - 워드프레스 사용자명과 Application Password
 * - 이미지 API 키 (Gemini, OpenAI)
 * - 네이버 검색광고 API 키 (키워드 도구: 월간 검색량)
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
  geminiApiKey?: string;
  openaiApiKey?: string;
  searchAdCustomerId?: string;
  searchAdApiKey?: string;
  searchAdSecretKey?: string;
};

const readAll = () => readJson<SecretsFile>(FILE, {});

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

/** 네이버 검색광고 API 키 (검색광고 계정의 "API 사용 관리"에서 받는다. 개발자센터·NCP 키와 다르다) */
export interface SearchAdKeys {
  customerId: string;
  apiKey: string;
  secretKey: string;
}

/** 환경변수 SEARCHAD_CUSTOMER_ID·SEARCHAD_API_KEY·SEARCHAD_SECRET_KEY가 셋 다 있으면 파일보다 우선 */
export async function getSearchAdKeys(): Promise<(SearchAdKeys & { fromEnv: boolean }) | null> {
  const { SEARCHAD_CUSTOMER_ID: c, SEARCHAD_API_KEY: a, SEARCHAD_SECRET_KEY: k } = process.env;
  if (c && a && k) return { customerId: c, apiKey: a, secretKey: k, fromEnv: true };
  const s = await readAll();
  return s.searchAdCustomerId && s.searchAdApiKey && s.searchAdSecretKey
    ? { customerId: s.searchAdCustomerId, apiKey: s.searchAdApiKey, secretKey: s.searchAdSecretKey, fromEnv: false }
    : null;
}

export function saveSearchAdKeys(keys: SearchAdKeys | null) {
  return update(({ searchAdCustomerId: _a, searchAdApiKey: _b, searchAdSecretKey: _c, ...rest }) =>
    keys ? { ...rest, searchAdCustomerId: keys.customerId, searchAdApiKey: keys.apiKey, searchAdSecretKey: keys.secretKey } : rest,
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

const IMAGE_API_KEY = {
  gemini: { env: "GEMINI_API_KEY", field: "geminiApiKey" },
  chatgpt: { env: "OPENAI_API_KEY", field: "openaiApiKey" },
} as const;

/** 이미지 API 키. 환경변수가 있으면 우선 */
export async function getImageApiKey(ai: WebAi): Promise<{ key: string; fromEnv: boolean } | null> {
  const { env, field } = IMAGE_API_KEY[ai];
  if (process.env[env]) return { key: process.env[env]!, fromEnv: true };
  const key = (await readAll())[field];
  return key ? { key, fromEnv: false } : null;
}

export function saveImageApiKey(ai: WebAi, key: string | null) {
  const { field } = IMAGE_API_KEY[ai];
  return update(({ [field]: _, ...rest }) => (key ? { ...rest, [field]: key } : rest));
}
