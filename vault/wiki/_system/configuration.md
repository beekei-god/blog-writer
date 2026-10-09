---
type: configuration
project: blog-writer
source:
  - blog-writer:.env.example:1-4
  - blog-writer:server/store.ts:9-50
  - blog-writer:server/routes/settings.ts:17-35
  - blog-writer:server/claude.ts:32-37
  - blog-writer:server/secrets.ts:1-68
  - blog-writer:shared/types.ts:136-161
updated: 2026-10-09
---
# 설정

## 환경 변수
`.env`는 `dotenv/config`로 읽는다 (`blog-writer:server/index.ts:1`). `.env` 파일은 있지만 값은 기록하지 않는다.

| 이름 | 의미 | 기본값 | 필수 | 읽는 곳 |
|---|---|---|---|---|
| `PORT` | API 서버 포트 | 5172 | 아니오 | `blog-writer:server/index.ts:7` |
| `BLOG_WRITER_DATA_DIR` | 데이터 폴더 위치 (테스트·따로 띄운 앱용) | `<프로젝트>/data` | 아니오 (`.env.example`에 없음) | `blog-writer:server/store.ts:11-12` |
| `CLAUDE_MODEL` | 단계 모델이 "Claude Code 설정"(`default`)일 때 쓸 모델 별칭 | 비면 CLI 기본 모델 | 아니오 | `blog-writer:server/claude.ts:36` |
| `CLAUDE_BIN` | 실행할 claude CLI 경로 | `claude` | 아니오 (`.env.example`에 없음) | `blog-writer:server/claude.ts:79` |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 데이터랩(NAVER API HUB) 키. 둘 다 있으면 파일 키보다 우선 | | 아니오 (`.env.example`에 없음) | `blog-writer:server/secrets.ts:41-42` |
| `DOWNLOADS_DIR` | Gemini/ChatGPT 이미지 다운로드를 찾을 폴더 | `~/Downloads` | 아니오 (README에만 언급, `blog-writer:README.md:63`) | `blog-writer:server/images/webAi.ts:122` |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | 이미지 API 키. 있으면 설정 화면에 저장한 키보다 우선(화면에서 지워도 남음). 키가 있으면 Gemini/ChatGPT 이미지를 API로 만든다 | 없음 (크롬에서 만듦) | 아니오 | `blog-writer:server/secrets.ts:70-81` |
| `GEMINI_IMAGE_MODEL`, `OPENAI_IMAGE_MODEL` | 이미지 API 모델 | `gemini-2.5-flash-image`, `gpt-image-2.5-flare` | 아니오 | `blog-writer:server/images/api.ts:15-16` |
| `CHROME_PATH` | 로그인 창에 쓸 크롬 실행 파일 | OS별 기본 경로 후보 | 아니오 | `blog-writer:server/browser/loginWindow.ts:29` |
| `BW_HEADLESS` | `1`이면 앱 전용 크롬 자동 조작을 창 없이 (테스트용) | 꺼짐 | 아니오 | `blog-writer:server/browser/runner.ts:56` |

경로 기준: `data/`와 기본 규칙 파일은 실행 폴더가 아니라 `server/store.ts` 위치에서 구한 프로젝트 루트(`PROJECT_ROOT`) 기준이다 (`blog-writer:server/store.ts:9-12`, 2026-10-07부터).

## 설정 파일 / 화면 설정
| 항목 | 저장 위치 | 기본값 | 바꾸는 화면 | 영향 |
|---|---|---|---|---|
| 네이버 블로그 ID `naverBlogId` | `data/settings.json` | 없음 | 설정 → 네이버 블로그 설정 | 비어 있으면 네이버에 올릴 수 없음 → [[publishing/entities/블로그 설정]], [[publishing/business-rules/BR-PUB-002 블로그 ID 형식]] |
| 티스토리 블로그 이름 `tistoryBlogId` | `data/settings.json` | 없음 | 설정 → 티스토리 설정 | 비어 있으면 티스토리에 올릴 수 없음 |
| 워드프레스 사이트 주소 `wordpressUrl` | `data/settings.json` | 없음 | 설정 → 워드프레스 설정 | https 주소만 → [[_system/integrations/wordpress-rest]] |
| 워드프레스 카테고리 `wordpressCategoryId` | `data/settings.json` | 없음(사이트 기본 카테고리) | 설정 → 워드프레스 설정 (사이트에서 목록을 불러와 선택) | 워드프레스 글의 카테고리 |
| 이미지 기본값 `images` | `data/settings.json` | 썸네일 켬, 본문 0장, Claude, 플랫 | 새 작업을 만들 때 자동 기억 (2026-10-09부터 썸네일·본문 만드는 방법 `method`·`thumbnailMethod`도 함께, 없으면 `api`) | 다음 새 글 폼의 처음 값 → [[image/entities/ImageOptions]] |
| 단계별 모델 `models` | `data/settings.json` | `RECOMMENDED_MODELS` | 설정 → Claude 모델 설정 | 다음 Claude 호출부터 → [[usage/business-rules/BR-USG-001 단계별 추천 모델]] |
| 글쓰기 규칙 | `data/writing-rules.md` (없으면 `rules/default-writing-rules.md`) | 기본 규칙 파일 | 글쓰기 규칙 화면 | 다음 작업부터 → [[writing/entities/글쓰기 규칙]] |
| 막힌 사이트 | `data/blocked-sites.json` | 없음 | 설정 → Claude in Chrome (초기화만) | 입력 경로 → [[publishing/entities/막힌 사이트]] |

**기본 블로그는 없다.** 예전의 `platform`(기본 블로그)·`blogId` 하나 방식은 블로그별 칸으로 바뀌었고(이번 갱신에 반영), 글을 올릴 때마다 올릴 블로그를 고른다 → [[publishing/business-rules/BR-PUB-015 올릴 블로그는 글마다 선택]].

`getSettings`는 저장값을 기본값 위에 얹고 `images`, `models`는 키 단위로 병합한다. 예전 설정의 `mouseSpeed`는 버리고, `platform`+`blogId`는 그 블로그 칸이 비어 있을 때만 옮긴 뒤 버린다 (`blog-writer:server/store.ts:27-50`). 파일이 없거나 깨지면 기본값을 쓴다.

설정 화면은 카드마다 자기 칸만 저장한다. 다른 카드에서 고치다 만 값은 함께 저장되지 않는다 (`blog-writer:src/SettingsPanel.tsx:25-32`, `:83-101`).

## 비밀 정보
| 무엇 | 저장 위치 | 읽는 곳 |
|---|---|---|
| 데이터랩 Client ID/Secret | `data/secrets.json` (권한 0600, 원자적 교체) 또는 환경변수 | `blog-writer:server/secrets.ts:39-52` |
| 워드프레스 사용자명·Application Password | `data/secrets.json` (같은 파일, 저장할 때 다른 항목을 지우지 않게 읽어서 합침) | `blog-writer:server/secrets.ts:54-68` |
| 이미지 API 키 Gemini·OpenAI | `data/secrets.json` (같은 파일) 또는 환경변수 `GEMINI_API_KEY`·`OPENAI_API_KEY` (우선). 설정 → 이미지 API 설정에서 연결 확인 후 저장 | `blog-writer:server/secrets.ts:70-86` |
| 블로그·Gemini·ChatGPT 로그인 | 사용자의 평소 크롬 프로필 (앱이 읽지 않음) | Claude in Chrome / AppleScript가 그 크롬을 그대로 씀 |
| 앱 전용 크롬 로그인 쿠키 | `data/chrome-profile/` (시스템 키체인으로 암호화되게 Playwright 기본 인자 일부 제거) | `blog-writer:server/browser/runner.ts:54-66` |
| Claude 계정 | Claude Code CLI 로그인 상태 (앱이 읽지 않음) | `claude -p` |

값은 적지 않는다. 화면에는 데이터랩 Client ID 앞 4자, 이미지 API 키 앞 6자(`blog-writer:server/routes/settings.ts:93-96`)(`blog-writer:server/routes/settings.ts:66`)와 워드프레스 사용자명만 돌려준다 (`blog-writer:server/routes/util.ts:25-28`). 예전 WordPress.com 연결 값(`wpcomToken`·`wpcomUsername`)은 더 쓰지 않고 워드프레스 연결을 저장·삭제할 때 지운다.

## 코드 상수 (사실상 설정)
| 상수 | 값 | 위치 | 관련 규칙 |
|---|---|---|---|
| `MAX_BODY_CHARS` | 3000 | `blog-writer:shared/length.ts:4` | [[writing/business-rules/BR-WRT-001 본문 분량 상한]] |
| `MAX_TAGS` | 30 | `blog-writer:shared/types.ts:203` | [[writing/business-rules/BR-WRT-004 태그 최대 30개]] |
| `MAX_BODY_IMAGES` | 6 | `blog-writer:shared/types.ts:15` | [[image/business-rules/BR-IMG-001 본문 이미지 개수]] |
| `TAG_GAP_LINES` | 3 | `blog-writer:shared/postHtml.ts:54` | [[publishing/business-rules/BR-PUB-006 태그 입력 위치]] |
| `KEEP_DAYS` | 90 | `blog-writer:server/usage.ts:14` | [[usage/business-rules/BR-USG-003 사용 기록 보관 기간]] |
| `RECOMMENDED_MODELS` | research·writing=opus, images·browser·recommend=sonnet | `blog-writer:shared/types.ts:80-86` | [[usage/business-rules/BR-USG-001 단계별 추천 모델]] |
| 기본 Claude 타임아웃 | 15분 (호출별로 다름) | `blog-writer:server/claude.ts:90` | [[_system/integrations/claude-cli]] |
| 워드프레스 요청 타임아웃 | 30초 (이미지 업로드 120초) | `blog-writer:server/wordpress.ts:62` | [[_system/integrations/wordpress-rest]] |
| 예약 시각 최소 여유 | 지금 + 1분 (2026-10-09부터 네이버·티스토리 예약에도 같은 `checkSchedule`) | `blog-writer:server/wordpress.ts:248-253` | [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]] |
| `NAVER_MINUTE_STEP` | 10 (네이버 예약 분 단위) | `blog-writer:shared/types.ts:17` | [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]] |
| `MAX_LINKS` | 20 (새 글 참고 링크 수) | `blog-writer:shared/types.ts:19` | [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]] |
| 발행 창 단계 제한 시간 | 단계마다 10초(예약 날짜 20초, 발행 확인 30초), 0.5초마다 다시 확인 | `blog-writer:server/browser/publish.ts:266-292` | [[_system/integrations/blog-editors]] |
