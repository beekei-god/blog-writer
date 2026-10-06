import type { ImageProvider, ImageStyle, ModelChoice, Stage, TokenTotals, UsageStage } from "../shared/types";

export { errorText, STATUS_LABEL, statusLabel } from "../shared/labels";

export const PROVIDER_LABEL: Record<ImageProvider, string> = {
  claude: "Claude",
  gemini: "Gemini",
  chatgpt: "ChatGPT",
};

export const PROVIDER_HINT: Record<ImageProvider, string> = {
  claude: "도형·아이콘·인포그래픽 스타일의 그림을 그립니다. 로그인이 필요 없지만 사진 같은 이미지는 어렵습니다.",
  gemini: "평소 쓰는 크롬에서 Claude in Chrome이 gemini.google.com을 조작해 만듭니다. 그 크롬에서 Gemini에 로그인되어 있어야 하고, Gemini 이미지 한도와 Claude 사용량을 함께 씁니다.",
  chatgpt: "평소 쓰는 크롬에서 Claude in Chrome이 chatgpt.com을 조작해 만듭니다. 그 크롬에서 ChatGPT에 로그인되어 있어야 하고, ChatGPT 이미지 한도와 Claude 사용량을 함께 씁니다.",
};

export const STYLE_LABEL: Record<ImageStyle, string> = {
  ghibli: "지브리풍",
  realistic: "실사",
  anime: "애니메이션",
  flat: "플랫 일러스트",
};

// ───── Claude 모델 · 사용량 ─────

export const STAGE_LABEL: Record<UsageStage, string> = {
  research: "자료 조사",
  writing: "글 작성",
  images: "이미지 (Claude SVG)",
  browser: "브라우저 조작 (Claude in Chrome)",
  recommend: "주제 추천",
  check: "한도 확인",
};

export const STAGE_HINT: Record<Exclude<UsageStage, "check">, string> = {
  research: "웹 검색으로 자료를 모읍니다. 토큰을 가장 많이 쓰는 단계입니다.",
  writing: "규칙에 맞춰 초안을 쓰고, 분량이 넘치면 줄여 씁니다.",
  images: "Claude로 이미지를 만들 때만 씁니다 (Gemini·ChatGPT 선택 시 쓰지 않음).",
  browser: "크롬에서 블로그 글 입력과 Gemini·ChatGPT 이미지 생성을 진행합니다.",
  recommend: "최근 뉴스·통계로 주제 후보를 찾습니다.",
};

/** 단계별 추천 모델의 이유 (RECOMMENDED_MODELS와 함께 고친다) */
export const MODEL_REASON: Record<Stage, string> = {
  research: "웹 검색을 여러 번 하며 출처를 비교·판단하는 긴 작업이라 추론과 정확도가 중요합니다. 글의 사실 품질이 여기서 정해집니다.",
  writing: "글쓰기 규칙·분량·표와 태그 형식을 함께 지키는 한국어 장문이라 지시 이행과 문장 품질이 가장 중요합니다.",
  images: "SVG 코드로 도형을 그리는 짧은 작업이라 Sonnet으로 충분하고, 빠르고 한도를 아낍니다.",
  browser: "스크린샷을 보며 클릭·입력을 여러 번 반복해 호출이 많습니다. 빠르고 한도를 아끼는 Sonnet이 적합합니다.",
  recommend: "최신 뉴스를 넓게 훑어 후보를 뽑는 작업이라 속도가 중요하고, 사실 확인은 자료 조사 단계에서 다시 합니다.",
};

/** 선택지 (별칭은 claude CLI가 해당 계열의 최신 모델로 바꿔 준다) */
export const MODEL_CHOICE_LABEL: Record<Exclude<ModelChoice, "default">, { name: string; hint: string }> = {
  fable: { name: "Fable", hint: "가장 뛰어나지만 한도를 가장 많이 씀" },
  opus: { name: "Opus", hint: "품질 우선" },
  sonnet: { name: "Sonnet", hint: "빠르고 한도를 아낌" },
  haiku: { name: "Haiku", hint: "가장 가볍고 빠름" },
};

/** "claude-haiku-4-5-20251001" → "Haiku 4.5" */
export function prettyModel(id: string | null | undefined): string {
  if (!id) return "알 수 없음";
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/.exec(id);
  if (!m) return id;
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? `.${m[3]}` : ""}`;
}

const compact = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });
export const fmtTokens = (n: number) => compact.format(n);
export const totalTokens = (t: TokenTotals) => t.input + t.output + t.cacheRead + t.cacheWrite;
export const fmtUSD = (n: number) => `$${n < 10 ? n.toFixed(2) : n.toFixed(0)}`;

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

export function resetText(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  return sameDay ? `오늘 ${time} 초기화` : `${d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" })} ${time} 초기화`;
}
