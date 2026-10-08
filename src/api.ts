import type { ImageMethod, ImageOptions, ImageProvider, ImageStyle, Job, Platform, Post, PublishMode, Recommendation, Settings, TokenTotals, UsageSummary } from "../shared/types";

export interface DatalabStatus {
  configured: boolean;
  clientIdHint: string | null;
}

export interface ImageApiKeyStatus {
  configured: boolean;
  hint: string | null;
  /** .env의 키를 쓰는 중 (화면에서 지워도 남는다) */
  fromEnv: boolean;
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
  createJob: (topic: string, images: ImageOptions, links: string[]) =>
    req<Job>("/api/jobs", { method: "POST", body: JSON.stringify({ topic, images, links }) }),
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
    onlyFailed?: boolean;
    addThumbnail?: boolean;
  }) =>
    req<void>(`/api/jobs/${id}/regenerate-images`, { method: "POST", body: JSON.stringify(opts) }),
  /** 이미지 한 장만 고른 AI·스타일로 다시 만든다. target: "thumbnail" 또는 "body-<블록 번호>" */
  regenerateImage: (id: string, target: string, ai: { provider: ImageProvider; style: ImageStyle; method?: ImageMethod }) =>
    req<void>(`/api/jobs/${id}/images/${target}/regenerate`, { method: "POST", body: JSON.stringify(ai) }),
  /** target: "thumbnail" 또는 "body-<블록 번호>" */
  uploadImage: (id: string, target: string, file: File) =>
    req<{ file: string }>(`/api/jobs/${id}/images/${target}`, { method: "POST", body: file, headers: { "Content-Type": file.type } }),
  cancel: (id: string) => req<void>(`/api/jobs/${id}/cancel`, { method: "POST" }),
  savePost: (id: string, post: Post) =>
    req<Job>(`/api/jobs/${id}/post`, { method: "PUT", body: JSON.stringify(post) }),
  /** mode: 임시저장/예약발행/자동발행 (워드프레스만 draft 외 가능). scheduledAt: 예약 시각 (ISO, UTC) */
  postToBlog: (id: string, opts: { mode?: PublishMode; scheduledAt?: string; platform?: Platform } = {}) =>
    req<void>(`/api/jobs/${id}/post-to-blog`, { method: "POST", body: JSON.stringify(opts) }),
  getWordPress: () => req<WordPressStatus>("/api/wordpress"),
  saveWordPress: (username: string, appPassword: string) =>
    req<WordPressStatus>("/api/wordpress", { method: "PUT", body: JSON.stringify({ username, appPassword }) }),
  deleteWordPress: () => req<WordPressStatus>("/api/wordpress", { method: "DELETE" }),
  getWordPressCategories: () => req<{ id: number; name: string }[]>("/api/wordpress/categories"),
  /** 임시저장 이후 상태를 직접 바꾼다: 발행 완료 표시/취소, 초안 완료로 되돌리기 */
  setStatus: (id: string, status: "draft_ready" | "posted" | "published") =>
    req<Job>(`/api/jobs/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
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
