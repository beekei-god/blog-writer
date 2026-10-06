import type { ImageErrorKind } from "./imageErrors";

export type Platform = "naver" | "tistory" | "wordpress";
export type ImageProvider = "claude" | "gemini" | "chatgpt";

export type ImageStyle = "flat" | "ghibli" | "realistic" | "anime";

/** Claude(SVG)는 벡터 일러스트만 가능하다. 지브리/실사/애니메이션은 이미지 모델(Gemini, ChatGPT)이 필요하다. */
export const STYLES_BY_PROVIDER: Record<ImageProvider, ImageStyle[]> = {
  claude: ["flat"],
  gemini: ["ghibli", "realistic", "anime", "flat"],
  chatgpt: ["ghibli", "realistic", "anime", "flat"],
};

export const MAX_BODY_IMAGES = 6;

/** 이미지를 다시 만들 범위: 전부 / 아직 파일이 없는 것(실패) / 썸네일만 */
/** body-<블록 번호>: 본문 이미지 한 장만 */
export type ImageScope = "all" | "failed" | "thumbnail" | `body-${number}`;

/** 본문 이미지 한 장을 가리키는 키 */
export const bodyImageKey = (index: number): `body-${number}` => `body-${index}`;
/** 이미지 하나를 가리키는 키: "thumbnail" 또는 "body-<블록 번호>" */
export const imageKey = (t: { kind: "thumbnail" } | { kind: "body"; index: number }) =>
  t.kind === "thumbnail" ? "thumbnail" : bodyImageKey(t.index);
/** "body-<블록 번호>"이면 블록 번호, 아니면 null */
export const bodyIndexOf = (key: string): number | null => (/^body-\d+$/.test(key) ? Number(key.slice(5)) : null);

export interface ImageOptions {
  thumbnail: boolean;
  /** 본문 이미지 개수 (0이면 생성 안 함) */
  bodyImages: number;
  /** 본문 이미지를 만드는 AI */
  provider: ImageProvider;
  style: ImageStyle;
  /** 썸네일을 만드는 AI. 없으면 본문 이미지와 같다 */
  thumbnailProvider?: ImageProvider;
  /** 썸네일 스타일. 없거나 그 AI가 지원하지 않으면 본문 이미지 스타일(또는 그 AI의 첫 스타일) */
  thumbnailStyle?: ImageStyle;
}

/** 고른 AI에서 쓸 수 있는 스타일로 맞춘다 (Claude는 플랫만 가능). */
export const fitStyle = (provider: ImageProvider, style: ImageStyle): ImageStyle =>
  STYLES_BY_PROVIDER[provider].includes(style) ? style : STYLES_BY_PROVIDER[provider][0];

/** 썸네일/본문 이미지를 실제로 만들 AI와 스타일 */
export function aiFor(o: ImageOptions, kind: "thumbnail" | "body"): { provider: ImageProvider; style: ImageStyle } {
  const provider = kind === "thumbnail" ? (o.thumbnailProvider ?? o.provider) : o.provider;
  const wanted = kind === "thumbnail" ? (o.thumbnailStyle ?? o.style) : o.style;
  return { provider, style: fitStyle(provider, wanted) };
}

// ───────────── Claude 모델 · 사용량 ─────────────

/** Claude를 호출하는 단계. 단계마다 모델을 따로 고를 수 있다. ("check"는 한도 확인용 짧은 호출) */
export const STAGES = ["research", "writing", "images", "browser", "recommend"] as const;
export type Stage = (typeof STAGES)[number];
export type UsageStage = Stage | "check";

/** "default"는 Claude Code의 기본 모델(또는 .env의 CLAUDE_MODEL)을 따른다. 나머지는 claude CLI 별칭 */
export const MODEL_CHOICES = ["default", "fable", "opus", "sonnet", "haiku"] as const;
export type ModelChoice = (typeof MODEL_CHOICES)[number];
export type StageModels = Record<Stage, ModelChoice>;

/** 단계별 추천 모델 (= 기본값). 이유는 src/labels.ts의 MODEL_REASON */
export const RECOMMENDED_MODELS: StageModels = {
  research: "opus",
  writing: "opus",
  images: "sonnet",
  browser: "sonnet",
  recommend: "sonnet",
};

export interface PlanWindow {
  /** 0~1 */
  utilization: number;
  /** 초기화 시각 (ISO) */
  resetsAt: string | null;
}

/** 마지막 Claude 호출에서 받은 플랜 한도 사용률 (계정 전체 기준) */
export interface PlanLimits {
  fiveHour: PlanWindow | null;
  sevenDay: PlanWindow | null;
  /** allowed / allowed_warning / rejected 등 */
  status: string | null;
  checkedAt: string;
}

export interface TokenTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  /** API 정가로 환산한 금액 (구독 요금과는 무관) */
  costUSD: number;
  calls: number;
}

export interface UsageSummary {
  plan: PlanLimits | null;
  today: TokenTotals;
  week: TokenTotals;
  /** 이번 주 시작일 (YYYY-MM-DD, 한국 시간 월요일) */
  weekStart: string;
  /** 최근 7일 (오래된 날 → 오늘) */
  days: { date: string; totals: TokenTotals }[];
  /** 이번 주 모델별 */
  byModel: { model: string; totals: TokenTotals }[];
  /** 이번 주 단계별 */
  byStage: { stage: UsageStage; totals: TokenTotals }[];
  /** 단계별로 마지막에 실제로 쓰인 모델 ID */
  lastModelByStage: Partial<Record<UsageStage, string>>;
  /** "default" 선택 시 실제로 쓰이는 모델 (알 수 있을 때만) */
  defaultModel: string | null;
}

/**
 * 앱 설정. 블로그는 "기본 블로그" 없이 블로그별로 따로 설정해 두고,
 * 글을 올릴 때마다 어느 블로그에 올릴지 고른다.
 */
export interface Settings {
  /** 네이버 블로그 ID (blog.naver.com/<여기>) */
  naverBlogId?: string;
  /** 티스토리 블로그 이름 (<여기>.tistory.com) */
  tistoryBlogId?: string;
  /** 새 작업의 이미지 생성 기본값 (마지막으로 쓴 값을 기억. 새 글 폼은 썸네일만 항상 켠 채로 연다) */
  images: ImageOptions;
  /** 단계별 Claude 모델 */
  models: StageModels;
  /** 워드프레스 사이트 주소 (https://...). 네이버·티스토리 설정과 따로 두어, 기본 블로그가 달라도 글마다 워드프레스에 올릴 수 있다 */
  wordpressUrl?: string;
  /** 워드프레스 API로 올릴 때 글을 넣을 카테고리 ID (없으면 사이트 기본 카테고리) */
  wordpressCategoryId?: number;
}

/** 블로그별로 따로 저장한 연결 값: 네이버·티스토리는 블로그 ID, 워드프레스는 사이트 주소. 없으면 "" */
export function blogIdOf(s: Pick<Settings, "naverBlogId" | "tistoryBlogId" | "wordpressUrl">, p: Platform): string {
  return ((p === "naver" ? s.naverBlogId : p === "tistory" ? s.tistoryBlogId : s.wordpressUrl) ?? "").trim();
}

/** 글을 올릴 때 쓰는 설정: 고른 블로그(`platform`)와 그 블로그의 ID·주소(`blogId`)를 채운 것. 크롬 입력 코드가 이것을 쓴다. */
export type PostSettings = Settings & { platform: Platform; blogId: string };

export function settingsFor(s: Settings, p: Platform): PostSettings {
  return { ...s, platform: p, blogId: blogIdOf(s, p) };
}

export interface ImageSpec {
  /** 이 이미지가 그리는 본문 내용 (해당 문장/소제목을 그대로 인용) */
  basis?: string;
  /** 이미지 생성 프롬프트 (장면 묘사. 썸네일 문구는 headline에 따로) */
  prompt: string;
  /** 이미지 안에 넣을 한국어 문구. 썸네일은 가운데에 크게, 본문 이미지는 짧은 제목·라벨로. 본문에 있는 사실만, 비우면 글자 없음 */
  headline?: string;
  /** 사용자가 설명(prompt)이나 문구를 직접 고쳤으면 true: 다시 만들 때 본문을 보고 자동으로 바꾸지 않는다 */
  userEdited?: boolean;
  alt: string;
  /** 생성된 파일명 (data/images/<jobId>/ 아래) */
  file?: string;
  /** 실패했을 때 원래 오류 메시지 */
  error?: string;
  /** 실패 원인 분류 (없으면 error 메시지로 분류) */
  errorKind?: ImageErrorKind;
  /** 실패한 생성 방식 */
  errorProvider?: ImageProvider;
}

export type PostBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  /** 모든 칸이 채워진 표 (빈 칸이 생기는 행은 작성 단계에서 뺀다) */
  | { type: "table"; headers: string[]; rows: string[][] }
  | ({ type: "image" } & ImageSpec);

/** "함께 많이 찾는"은 예전 연관검색어 자리를 대신하는 네이버 검색 영역 */
export const TAG_SOURCES = ["메인·서브 키워드", "자동완성", "함께 많이 찾는", "스마트블록 주제", "본문 고유명사"] as const;
export type TagSource = (typeof TAG_SOURCES)[number];

export interface TagDetail {
  tag: string;
  source: TagSource;
  /** 확인에 쓴 검색어 */
  query: string;
}

export const MAX_TAGS = 30;

export interface Post {
  title: string;
  summary: string;
  /** 블로그에 입력할 태그 ('#' 없이) */
  tags: string[];
  // ── 아래는 사용자에게 보여 주는 작성 리포트 (본문에는 들어가지 않음) ──
  searchQuestion?: string;
  mainKeyword?: string;
  subKeywords?: string[];
  titleCandidates?: string[];
  tagDetails?: TagDetail[];
  /** 태그 확인 날짜 (YYYY.MM.DD) */
  tagsCheckedAt?: string;
  /** 자료를 찾지 못해 본문에서 뺀 항목 */
  omittedItems?: string[];
  thumbnail?: ImageSpec;
  blocks: PostBlock[];
}

export type SourceKind = "official" | "press" | "blog" | "other";

export interface Source {
  title: string;
  url: string;
  kind?: SourceKind;
}

export type JobStatus =
  | "researching"
  | "writing"
  | "generating_images"
  | "draft_ready"
  | "posting"
  | "posted"
  /** 워드프레스 API로 예약 발행을 걸어 둔 상태 (예약 시각에 사이트가 공개한다) */
  | "scheduled"
  /** 사용자가 블로그에서 직접 발행한 뒤 "발행 완료"로 표시한 상태 (앱은 발행하지 않는다) */
  | "published"
  | "failed";

/** 워드프레스 API 등록 방식: 임시저장 / 예약발행 / 자동발행(바로 공개) */
export type PublishMode = "draft" | "schedule" | "publish";

/** 워드프레스 API로 만든 글의 기록 (다시 등록하면 새 글을 만들지 않고 이 글을 갱신한다) */
export interface WordPressRecord {
  postId: number;
  link: string;
  mode: PublishMode;
  /** 예약 시각 (ISO, mode가 schedule일 때) */
  scheduledAt?: string;
  /** 올린 이미지 파일명 → 사이트의 미디어 (다시 등록할 때 재사용) */
  mediaIds?: Record<string, { id: number; url: string }>;
}

export const BUSY_STATUSES: JobStatus[] = ["researching", "writing", "generating_images", "posting"];

export interface Job {
  id: string;
  topic: string;
  /** 사용자가 준 참고 링크 (리서치에서 반드시 열어 본다) */
  links?: string[];
  status: JobStatus;
  /** 이 작업을 만들 때 선택한 이미지 옵션 */
  imageOptions: ImageOptions;
  /** 블로그에 올리는 중(status "posting")일 때 올리는 블로그. 화면 라벨이 크롬 작성인지 워드프레스 등록인지 구분한다 */
  postingTo?: Platform;
  /** 지금 만들고 있는 이미지 ("thumbnail" 또는 "body-<블록 번호>"). 화면에서 그 이미지만 진행 중으로 보인다 */
  generatingImages?: string[];
  /** generatingImages 중 시작할 때 이미 파일이 있던 이미지 (다시 만드는 중). 처음 만드는 이미지와 구분한다 */
  regeneratingImages?: string[];
  createdAt: string;
  updatedAt: string;
  researchNotes?: string;
  /** 이 작업에 적용된 글쓰기 규칙 (작업 시작 시점의 사본) */
  rulesSnapshot?: string;
  sources: Source[];
  post?: Post;
  logs: { at: string; message: string }[];
  error?: string;
  /** 워드프레스 API로 등록한 글 */
  wordpress?: WordPressRecord;
}

// ───────────── 주제 추천 ─────────────

export interface Evidence {
  title: string;
  url: string;
  /** 기사·자료 날짜 (YYYY.MM.DD, 확인된 경우만) */
  date?: string;
  kind: "news" | "stat" | "official";
}

export interface InterestStat {
  /** 기준 키워드 대비 최근 4주 평균 검색 관심도 (%) — 데이터랩 상대값 */
  level: number;
  /** 최근 7일 평균 / 그 전 21일 평균 - 1 (%) */
  momentum: number;
  /** 최근 4주 일별 값 (기준 키워드 평균 = 100) */
  series: number[];
}

export interface TopicCandidate {
  topic: string;
  /** 네이버에 실제로 입력할 만한 검색어 (데이터랩 비교에 사용) */
  keywords: string[];
  /** 지금 이 주제를 써야 하는 이유 (뉴스·통계 근거) */
  reason: string;
  evidence: Evidence[];
  autocompleteCount?: number;
  interest?: InterestStat;
}

export type RecommendationStatus = "running" | "done" | "failed";

export interface Recommendation {
  id: string;
  field: string;
  status: RecommendationStatus;
  createdAt: string;
  updatedAt: string;
  /** 데이터랩 비교의 기준 키워드 (분야 대표 검색어) */
  anchorKeyword?: string;
  datalab: "ok" | "not_configured" | "failed" | "pending";
  /** 데이터랩 조회 기간 */
  period?: { start: string; end: string };
  candidates: TopicCandidate[];
  logs: { at: string; message: string }[];
  error?: string;
}
