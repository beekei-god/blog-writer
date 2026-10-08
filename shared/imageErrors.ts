/** 이미지 생성 실패 원인. 서버가 기록하고, 화면은 원인별 안내와 다시 만들기 방법을 보여 준다. */
export const IMAGE_ERROR_KINDS = [
  "extension",
  "login",
  "refused",
  "limit",
  "timeout",
  "ui_changed",
  "download",
  "browser_missing",
  "browser_busy",
  "browser_closed",
  "svg_invalid",
  "claude_error",
  "api_error",
  "site_error",
  "unknown",
] as const;
export type ImageErrorKind = (typeof IMAGE_ERROR_KINDS)[number];

export interface ImageErrorInfo {
  title: string;
  /** 무슨 일이 있었는지와 어떻게 하면 되는지 */
  advice: string;
}

export const IMAGE_ERROR_INFO: Record<ImageErrorKind, ImageErrorInfo> = {
  extension: {
    title: "Claude in Chrome이 연결되지 않았습니다",
    advice:
      "Gemini·ChatGPT 이미지는 크롬의 Claude in Chrome 확장 프로그램으로 만듭니다. 설정 → Claude in Chrome에서 설치·연결 상태를 확인하세요. 바로 만들려면 Claude를 고르세요.",
  },
  login: {
    title: "로그인이 필요합니다",
    advice: "평소 쓰는 크롬(Claude in Chrome이 설치된 크롬)에서 이 AI에 로그인되어 있지 않습니다. 크롬에서 로그인한 뒤 다시 만들거나, 다른 AI를 고르세요.",
  },
  refused: {
    title: "요청이 거절되었습니다",
    advice: "AI가 이 이미지 요청을 정책상 거절했습니다. 지브리풍 같은 특정 화풍이나 실존 인물·브랜드가 들어가면 자주 거절됩니다. 다른 스타일이나 다른 AI로 만들어 보세요.",
  },
  limit: {
    title: "생성 한도를 다 썼습니다",
    advice: "계정의 이미지 생성 한도(또는 Claude 사용 한도, 이미지 API 잔액)에 도달했습니다. 한도가 풀린 뒤 다시 하거나, \"이미지 다시 생성\"에서 크롬이나 다른 AI로 만드세요.",
  },
  timeout: {
    title: "응답이 너무 오래 걸렸습니다",
    advice: "제한 시간 안에 이미지가 나오지 않았습니다. 서비스가 붐비거나 화면에 확인 창이 떠 있었을 수 있습니다. 다시 하거나 다른 AI로 만드세요.",
  },
  ui_changed: {
    title: "화면에서 진행하지 못했습니다",
    advice: "Claude가 사이트 화면에서 이미지를 만들지 못했습니다. 크롬에 확인 창(사이트 권한, 약관 동의 등)이 떠 있는지 보고 다시 하거나 다른 AI로 만드세요.",
  },
  download: {
    title: "이미지를 저장하지 못했습니다",
    advice: "이미지는 만들어졌지만 파일을 받지 못했습니다. 여러 장을 연달아 만들 때 첫 장만 되고 나머지가 실패하면, 크롬이 같은 사이트의 연속 다운로드를 막은 것일 수 있습니다(주소창 오른쪽 다운로드 차단 표시에서 허용하거나 chrome://settings/content/automaticDownloads 에서 해당 사이트 허용). \"다운로드 전에 각 파일의 저장 위치 확인\"이 꺼져 있는지도 확인하고 다시 하세요.",
  },
  browser_missing: {
    title: "크롬을 찾을 수 없습니다",
    advice: "Claude 이미지를 PNG로 만들 때도 이 컴퓨터의 Google Chrome을 씁니다. 크롬을 설치하세요.",
  },
  browser_busy: {
    title: "크롬이 사용 중입니다",
    advice: "다른 크롬 작업과 겹쳤습니다. 잠시 뒤 다시 하세요.",
  },
  browser_closed: {
    title: "크롬 탭이 닫혔습니다",
    advice: "작업 중에 크롬 탭이나 창이 닫혀서 멈췄습니다. 작업이 끝날 때까지 Claude가 연 탭 그룹은 그대로 두고 다시 하세요.",
  },
  svg_invalid: {
    title: "그림 형식이 올바르지 않습니다",
    advice: "Claude가 그린 SVG를 쓸 수 없었습니다. 다시 하면 대부분 해결됩니다.",
  },
  claude_error: {
    title: "Claude 호출에 실패했습니다",
    advice: "Claude가 작업을 끝내지 못했습니다. 사용량 화면에서 플랜 한도를 확인하고, 다시 하거나 다른 AI로 만드세요.",
  },
  api_error: {
    title: "이미지 API 호출에 실패했습니다",
    advice: "Gemini·OpenAI API가 이미지를 만들지 못했습니다. 설정 → 이미지 API에서 키를 확인하고 다시 하거나, \"이미지 다시 생성\"에서 크롬이나 다른 AI로 만드세요.",
  },
  site_error: {
    title: "사이트에서 오류가 났습니다",
    advice:
      "Gemini·ChatGPT 사이트가 \"문제가 발생했습니다\" 같은 오류를 보여 이미지를 만들지 못했습니다. 사이트 쪽 일시적인 문제일 때가 많습니다. 잠시 뒤 다시 하거나, \"이미지 다시 생성\"에서 API로 또는 다른 AI로 만드세요.",
  },
  unknown: {
    title: "알 수 없는 오류",
    advice: "아래 자세한 내용을 확인하고 다시 하거나 다른 AI로 만드세요.",
  },
};

const LIMIT = /usage limit|rate limit|limit reached|quota|too many requests|try again later|한도|나중에 다시/i;
/** 사이트가 보여 준 오류 안내 (예: Gemini "문제가 발생했습니다 (1155)") */
const SITE_ERROR = /문제가 발생|오류가 발생|something went wrong|an error occurred/i;
const REFUSED =
  /polic|guideline|violat|can['’]t (help|create|generate|make)|cannot (help|create|generate|make)|unable to (create|generate|make)|not able to (create|generate)|정책|가이드라인|만들 수 없|생성할 수 없|그릴 수 없|도와드릴 수 없|도와 드릴 수 없|처리할 수 없/i;

/** 원인 표시가 없는 오류(예: 예전 기록, 라이브러리 오류)를 메시지로 분류한다. */
export function classifyImageError(message: string | undefined): ImageErrorKind {
  const m = message ?? "";
  // 예전 시간 초과 문구에는 "(로그인/한도/응답 화면을 확인하세요)"가 붙어 있어 로그인보다 먼저 본다.
  if (/Claude in Chrome|extension is not connected/i.test(m)) return "extension";
  if (/생성 시간이 초과/.test(m)) return "timeout";
  // 로그인 페이지로 넘어간 흔적이 있으면 (창이 닫힌 경우 포함) 로그인 문제다.
  if (/로그인|accounts\.google\.com\/.*signin|ServiceLogin|auth\/login|login_with|auth\.openai\.com/i.test(m)) return "login";
  if (/Target page, context or browser has been closed|Target closed|browser has been closed/i.test(m)) return "browser_closed";
  if (/Executable doesn't exist|distribution ['"]?chrome['"]? is not found|Chromium distribution/i.test(m)) return "browser_missing";
  if (/ProcessSingleton|already in use|SingletonLock/i.test(m)) return "browser_busy";
  if (/claude CLI|claude` CLI|구조화된 결과/i.test(m)) return LIMIT.test(m) ? "limit" : "claude_error";
  if (LIMIT.test(m)) return "limit";
  if (REFUSED.test(m)) return "refused";
  if (/SVG/i.test(m)) return "svg_invalid";
  if (/다운로드 실패|너무 작습니다|이미지 데이터를 읽지/.test(m)) return "download";
  if (SITE_ERROR.test(m)) return "site_error";
  if (/시간이 초과|생성 시간/.test(m)) return "timeout";
  if (/Timeout \d+ms exceeded|waiting for (locator|selector)|위치를 찾지 못|element is not/i.test(m)) return "ui_changed";
  return "unknown";
}
