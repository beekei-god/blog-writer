import type { BlogCategory, ImageMethod, KeywordSection, ImageOptions, ImageProvider, ImageStyle, Job, ManualStatus, Platform, Post, PublishMode, Recommendation, Settings, TokenTotals, UsageSummary, WritingOptions } from "../shared/types";

export interface DatalabStatus {
  configured: boolean;
  clientIdHint: string | null;
}

export interface SearchAdStatus {
  configured: boolean;
  customerIdHint: string | null;
  /** .env의 키를 쓰는 중 (화면에서 지워도 남는다) */
  fromEnv: boolean;
}

export interface KeywordResult {
  /** 입력한 키워드의 결과 한 덩어리, 또는 입력이 없을 때 지금 뜨는 검색어·최근 주제 추천 분야의 결과 */
  sections: KeywordSection[];
}

export interface ImageApiKeyStatus {
  configured: boolean;
  hint: string | null;
  /** .env의 키를 쓰는 중 (화면에서 지워도 남는다) */
  fromEnv: boolean;
}
/** 올릴 블로그의 카테고리 목록. last: 이 블로그에 마지막으로 올릴 때 고른 카테고리 (처음 값) */
export interface CategoryList {
  categories: BlogCategory[];
  fetchedAt?: string;
  last?: BlogCategory;
}

export type ImageApiStatus = Record<"gemini" | "chatgpt", ImageApiKeyStatus>;

export interface WordPressStatus {
  configured: boolean;
  username: string | null;
}

export interface LoginWindowStatus {
  open: boolean;
  /** 열린 로그인 창이 어느 블로그용인지 (닫혀 있으면 null) */
  platform: "naver" | "tistory" | null;
  automationRunning: boolean;
}
/** fallback: 막힌 뒤 실제로 쓰는 경로. user-chrome=평소 크롬(AppleScript), app-chrome=앱 전용 크롬 자동 조작 */
export type BlockedSites = Partial<
  Record<"naver" | "tistory" | "wordpress", { at: string; detail: string; fallback?: "user-chrome" | "app-chrome" }>
>;

export interface ExtensionStatusInfo {
  installed: boolean;
  connected: boolean | null;
  detail: string | null;
  checkedAt: string | null;
  installUrl: string;
}

export interface Rules {
  content: string;
  isDefault: boolean;
  updatedAt: string | null;
}

/** 작업 이미지 파일 주소 */
export const imageUrl = (jobId: string, file: string) => `/api/images/${jobId}/${encodeURIComponent(file)}`;

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `요청 실패 (${res.status})`);
  return body as T;
}

export const api = {
  getSettings: () => req<Settings>("/api/settings"),
  saveSettings: (s: Settings) => req<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(s) }),
  listJobs: () => req<Job[]>("/api/jobs"),
  getJob: (id: string) => req<Job>(`/api/jobs/${id}`),
  createJob: (topic: string, images: ImageOptions, links: string[], writing: WritingOptions) =>
    req<Job>("/api/jobs", { method: "POST", body: JSON.stringify({ topic, images, links, writing }) }),
  getSearchAd: () => req<SearchAdStatus>("/api/searchad"),
  saveSearchAd: (customerId: string, apiKey: string, secretKey: string) =>
    req<SearchAdStatus>("/api/searchad", { method: "PUT", body: JSON.stringify({ customerId, apiKey, secretKey }) }),
  deleteSearchAd: () => req<SearchAdStatus>("/api/searchad", { method: "DELETE" }),
  /** 키워드 탐색: 입력한 키워드(쉼표로 최대 5개)와 연관 키워드의 월간 검색량. 비워 두면 지금 뜨는 검색어와 최근 주제 추천의 분야를 기준으로 찾는다 */
  exploreKeywords: (q: string) => req<KeywordResult>(`/api/keywords?q=${encodeURIComponent(q)}`),
  getDatalab: () => req<DatalabStatus>("/api/datalab"),
  saveDatalab: (clientId: string, clientSecret: string) =>
    req<DatalabStatus>("/api/datalab", { method: "PUT", body: JSON.stringify({ clientId, clientSecret }) }),
  deleteDatalab: () => req<DatalabStatus>("/api/datalab", { method: "DELETE" }),
  getImageApi: () => req<ImageApiStatus>("/api/image-api"),
  saveImageApiKey: (ai: keyof ImageApiStatus, key: string) =>
    req<ImageApiStatus>(`/api/image-api/${ai}`, { method: "PUT", body: JSON.stringify({ key }) }),
  deleteImageApiKey: (ai: keyof ImageApiStatus) => req<ImageApiStatus>(`/api/image-api/${ai}`, { method: "DELETE" }),
  listRecommendations: () => req<Recommendation[]>("/api/recommendations"),
  startRecommendation: (field: string) =>
    req<Recommendation>("/api/recommendations", { method: "POST", body: JSON.stringify({ field }) }),
  deleteRecommendation: (id: string) => req<void>(`/api/recommendations/${id}`, { method: "DELETE" }),
  cancelRecommendation: (id: string) => req<void>(`/api/recommendations/${id}/cancel`, { method: "POST" }),
  getRules: () => req<Rules>("/api/rules"),
  saveRules: (content: string) => req<Rules>("/api/rules", { method: "PUT", body: JSON.stringify({ content }) }),
  resetRules: () => req<Rules>("/api/rules/reset", { method: "POST" }),
  regenerateImages: (id: string, opts: {
    provider?: ImageProvider;
    style?: ImageStyle;
    thumbnailProvider?: ImageProvider;
    thumbnailStyle?: ImageStyle;
    thumbnailMethod?: ImageMethod;
    onlyFailed?: boolean;
    addThumbnail?: boolean;
  }) =>
    req<void>(`/api/jobs/${id}/regenerate-images`, { method: "POST", body: JSON.stringify(opts) }),
  /** 이미지 한 장만 고른 AI·스타일로 다시 만든다. target: "thumbnail" 또는 "body-<블록 번호>" */
  regenerateImage: (id: string, target: string, ai: { provider: ImageProvider; style: ImageStyle; method?: ImageMethod }) =>
    req<void>(`/api/jobs/${id}/images/${target}/regenerate`, { method: "POST", body: JSON.stringify(ai) }),
  /** 프롬프트로 글 고치기: range는 고칠 블록 범위(처음·끝 포함), 없으면 글 전체. writing이 있으면 그 분량·말투로 글 전체를 다시 쓴다. 결과는 job.editProposal로 오고, 적용해야 글에 들어간다 */
  editPost: (id: string, prompt: string, range?: { start: number; end: number }, writing?: WritingOptions) =>
    req<void>(`/api/jobs/${id}/edit`, { method: "POST", body: JSON.stringify({ prompt, range, writing }) }),
  applyEdit: (id: string) => req<Job>(`/api/jobs/${id}/edit/apply`, { method: "POST" }),
  discardEdit: (id: string) => req<Job>(`/api/jobs/${id}/edit`, { method: "DELETE" }),
  /** 본문 이미지 자리 추가: afterBlock 번 블록 바로 뒤에 이미지 없는 이미지 블록을 넣는다 (이미지는 "이미지 생성"으로 만든다) */
  addImage: (id: string, afterBlock: number) =>
    req<Job>(`/api/jobs/${id}/images`, { method: "POST", body: JSON.stringify({ afterBlock }) }),
  /** 이미지 삭제 (파일도 지운다). target: "thumbnail" 또는 "body-<블록 번호>" */
  deleteImage: (id: string, target: string) => req<Job>(`/api/jobs/${id}/images/${target}`, { method: "DELETE" }),
  /** target: "thumbnail" 또는 "body-<블록 번호>" */
  uploadImage: (id: string, target: string, file: File) =>
    req<{ file: string }>(`/api/jobs/${id}/images/${target}`, { method: "POST", body: file, headers: { "Content-Type": file.type } }),
  cancel: (id: string) => req<void>(`/api/jobs/${id}/cancel`, { method: "POST" }),
  savePost: (id: string, post: Post) =>
    req<Job>(`/api/jobs/${id}/post`, { method: "PUT", body: JSON.stringify(post) }),
  /** mode: 임시저장/예약발행/자동발행 (네이버 예약은 10분 단위). scheduledAt: 예약 시각 (ISO, UTC) */
  postToBlog: (id: string, opts: { mode?: PublishMode; scheduledAt?: string; platform?: Platform; category?: BlogCategory } = {}) =>
    req<void>(`/api/jobs/${id}/post-to-blog`, { method: "POST", body: JSON.stringify(opts) }),
  getWordPress: () => req<WordPressStatus>("/api/wordpress"),
  saveWordPress: (username: string, appPassword: string) =>
    req<WordPressStatus>("/api/wordpress", { method: "PUT", body: JSON.stringify({ username, appPassword }) }),
  deleteWordPress: () => req<WordPressStatus>("/api/wordpress", { method: "DELETE" }),
  getCategories: (platform: Platform) => req<CategoryList>(`/api/categories/${platform}`),
  /** 네이버·티스토리: 블로그 에디터에서 카테고리 목록을 읽어 온다 (글은 저장하지 않는다) */
  refreshCategories: (platform: Platform) => req<CategoryList>(`/api/categories/${platform}/refresh`, { method: "POST" }),
  /** 블로그 하나의 상태를 직접 바꾼다 (올리지 않음·임시저장 완료·발행완료). 다른 블로그의 상태는 그대로 */
  setBlogStatus: (id: string, platform: Platform, status: ManualStatus) =>
    req<Job>(`/api/jobs/${id}/blogs/${platform}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  /** 제목 후보만 새로 만든다 (글에는 넣지 않고 돌려준다) */
  regenerateTitles: (id: string) => req<{ titleCandidates: string[] }>(`/api/jobs/${id}/titles`, { method: "POST" }),
  retry: (id: string) => req<void>(`/api/jobs/${id}/retry`, { method: "POST" }),
  remove: (id: string) => req<void>(`/api/jobs/${id}`, { method: "DELETE" }),
  getLoginWindow: () => req<LoginWindowStatus>("/api/browser/login"),
  /** 크롬으로 올리는 블로그(네이버·티스토리)의 로그인 창 */
  openLoginWindow: (platform: "naver" | "tistory") =>
    req<LoginWindowStatus>("/api/browser/login", { method: "POST", body: JSON.stringify({ platform }) }),
  closeLoginWindow: () => req<LoginWindowStatus>("/api/browser/login/close", { method: "POST" }),
  getBlockedSites: () => req<BlockedSites>("/api/blocked-sites"),
  clearBlockedSites: () => req<BlockedSites>("/api/blocked-sites", { method: "DELETE" }),
  getExtension: () => req<ExtensionStatusInfo>("/api/chrome-extension"),
  checkExtension: () => req<ExtensionStatusInfo>("/api/chrome-extension/check", { method: "POST" }),
  getUsage: () => req<UsageSummary>("/api/usage"),
  checkPlan: () => req<UsageSummary>("/api/usage/check", { method: "POST" }),
  getJobUsage: (id: string) => req<{ model: string; totals: TokenTotals }[]>(`/api/jobs/${id}/usage`),
};
