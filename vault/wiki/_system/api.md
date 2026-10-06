---
type: api
project: blog-writer
confidence: high
source:
  - blog-writer:server/app.ts:10-40
  - blog-writer:server/routes/settings.ts:1-125
  - blog-writer:server/routes/browser.ts:1-121
  - blog-writer:server/routes/usage.ts:1-35
  - blog-writer:server/routes/recommendations.ts:1-42
  - blog-writer:server/routes/jobs.ts:1-207
  - blog-writer:server/routes/images.ts:1-146
  - blog-writer:server/routes/util.ts:1-28
  - blog-writer:src/api.ts:38-111
updated: 2026-10-07
---
# API

엔드포인트는 주제별 라우터 파일 6개(`server/routes/*.ts`)에 나뉘어 있고, `server/app.ts`의 `createApp()`이 공통 처리와 함께 묶는다 → [[_system/modules/server-routes]]. 화면은 `src/api.ts`의 `api` 객체로만 부른다.

## 설정·규칙·키 (`server/routes/settings.ts`)
| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| GET | `/api/settings` | 설정 읽기 (기본값 병합, 예전 `platform`/`blogId` 값은 블로그별 칸으로 옮김) | | `Settings` | `NewJob`, `SettingsPanel`, `App` | `blog-writer:server/routes/settings.ts:36` |
| PUT | `/api/settings` | 설정 저장 | `SettingsSchema`: `naverBlogId`·`tistoryBlogId`(≤200자, 영문/숫자/_/-), `wordpressUrl`(≤200자, https 주소 형식), `wordpressCategoryId`(양의 정수), images=`ImageOptionsSchema`, models=단계별 enum | 200 `Settings` / 400 | `SettingsPanel`(카드마다 자기 칸만 바꿔 저장) | `blog-writer:server/routes/settings.ts:16-46` |
| GET | `/api/rules` | 글쓰기 규칙 (수정본 없으면 기본) | | `{content,isDefault,updatedAt}` | `RulesEditor` | `blog-writer:server/routes/settings.ts:49` |
| PUT | `/api/rules` | 규칙 저장 | content 1~50,000자(trim), 끝에 줄바꿈 추가 | `Rules` / 400 | `RulesEditor` | `blog-writer:server/routes/settings.ts:50-57` |
| POST | `/api/rules/reset` | 수정본 삭제 → 기본 규칙 | | `Rules` | `RulesEditor` | `blog-writer:server/routes/settings.ts:58` |
| GET | `/api/datalab` | 데이터랩 키 설정 여부 (값은 안 줌, Client ID 앞 4자만) | | `{configured, clientIdHint}` | `SettingsPanel`, `Recommend` | `blog-writer:server/routes/settings.ts:61-67` |
| PUT | `/api/datalab` | 키 확인 호출 후 저장 | clientId·clientSecret 필수 | 200 / 400(검증·확인 실패 메시지) | `SettingsPanel` | `blog-writer:server/routes/settings.ts:68-81` |
| DELETE | `/api/datalab` | 파일의 키 삭제 (환경변수 키는 남음) | | `{configured}` | `SettingsPanel` | `blog-writer:server/routes/settings.ts:82-88` |
| GET | `/api/wordpress` | 워드프레스 연결 여부 (Application Password는 돌려주지 않음) | | `{configured, username}` | `SettingsPanel`, `NextStep` | `blog-writer:server/routes/settings.ts:91-94`, `blog-writer:server/routes/util.ts:25-28` |
| PUT | `/api/wordpress` | 사이트에 연결 확인(`users/me`) 후 사용자명·Application Password 저장 | 둘 다 1~200자 필수, 확인 실패면 400(원인별 메시지) | `{configured, username}` | `SettingsPanel` | `blog-writer:server/routes/settings.ts:95-108` |
| DELETE | `/api/wordpress` | 연결 정보 삭제 (예전 WordPress.com 값도 함께 지움) | | `{configured:false}` | `SettingsPanel` | `blog-writer:server/routes/settings.ts:109-115` |
| GET | `/api/wordpress/categories` | 사이트 카테고리 목록 (최대 100개) | 연결·주소 문제는 400 | `{id,name}[]` | `SettingsPanel` | `blog-writer:server/routes/settings.ts:116-125` |

## 크롬·확장·로그인 창 (`server/routes/browser.ts`)
| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| GET | `/api/chrome-extension` | 확장 설치 여부 + 마지막 연결 확인 결과 | | `ExtensionStatus + installUrl` | `ExtensionStatus` | `blog-writer:server/routes/browser.ts:18` |
| POST | `/api/chrome-extension/check` | Haiku로 `tabs_context_mcp` 한 번 호출해 연결 확인 | 동시에 한 번만 (409) | 상태 | `ExtensionStatus` | `blog-writer:server/routes/browser.ts:22-57` |
| GET | `/api/blocked-sites` | Claude in Chrome이 막은 플랫폼 목록 + 실제 대체 경로 | | `{naver?:{at,detail,fallback: "user-chrome"/"app-chrome"},...}` | `BlockedSites` | `blog-writer:server/routes/browser.ts:61-70` |
| DELETE | `/api/blocked-sites` | 목록 비우기 (다음에 Claude in Chrome부터 다시) | | `{}` | `BlockedSites` | `blog-writer:server/routes/browser.ts:71-77` |
| GET | `/api/browser/login` | 로그인 창 열림·어느 블로그용인지·자동 조작 실행 여부 | | `{open, platform, automationRunning}` | `LoginWindow` (3초 폴링) | `blog-writer:server/routes/browser.ts:86-89` |
| POST | `/api/browser/login` | 앱 전용 크롬 프로필로 블로그 로그인 창 열기 | 자동 조작 중 409 → `{platform: naver/tistory}` 아니면 400 → 같은 블로그 창이 열려 있으면 그대로, 다른 블로그 창이면 409 → 그 블로그 ID 없으면 400 | 상태 | `LoginWindow` | `blog-writer:server/routes/browser.ts:90-114` |
| POST | `/api/browser/login/close` | 로그인 창 종료 | | 상태 | `LoginWindow` | `blog-writer:server/routes/browser.ts:115-121` |

## 사용량 (`server/routes/usage.ts`)
| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| GET | `/api/usage` | 사용량 요약 | | `UsageSummary` | `App`(60초), `Usage`(15초) | `blog-writer:server/routes/usage.ts:9` |
| POST | `/api/usage/check` | Haiku로 짧은 호출 → 플랜 한도 갱신 | 동시에 한 번만 (409) | `UsageSummary` | `Usage` | `blog-writer:server/routes/usage.ts:13-33` |
| GET | `/api/jobs/:id/usage` | 작업 하나의 모델별 토큰 | | `{model,totals}[]` | `src/job/JobUsage.tsx` | `blog-writer:server/routes/usage.ts:35` |

## 주제 추천 (`server/routes/recommendations.ts`)
| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| GET | `/api/recommendations` | 추천 기록 목록 (최신순) | | `Recommendation[]` | `Recommend` | `blog-writer:server/routes/recommendations.ts:11` |
| POST | `/api/recommendations` | 주제 추천 시작 | field 2~100자, 진행 중이면 409 | 201 `Recommendation` | `Recommend` | `blog-writer:server/routes/recommendations.ts:12-23` |
| POST | `/api/recommendations/:id/cancel` | 진행 중인 추천 중지 (작업 중지와 같은 방식) | 중지할 추천 없으면 409 | 202 | `Recommend` | `blog-writer:server/routes/recommendations.ts:25-31` |
| DELETE | `/api/recommendations/:id` | 추천 삭제 | 진행 중이면 409 | 204 | `Recommend` | `blog-writer:server/routes/recommendations.ts:32-42` |

## 글(작업) (`server/routes/jobs.ts`)
| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| GET | `/api/jobs` | 작업 목록 (생성일 내림차순) | | `Job[]` | `App` | `blog-writer:server/routes/jobs.ts:41` |
| POST | `/api/jobs` | 작업 생성 + 초안 파이프라인 시작 | topic 2~300자, links http(s) URL ≤20개, images=`ImageOptionsSchema` | 201 `Job` | `NewJob` | `blog-writer:server/routes/jobs.ts:43-72` |
| GET | `/api/jobs/:id` | 작업 하나 | | `Job` / 404 | (화면은 목록을 씀) | `blog-writer:server/routes/jobs.ts:74-81` |
| PUT | `/api/jobs/:id/post` | 초안 저장 (자동 저장) | `PostSchema`, 진행 중이면 409. 이미지 파일·오류는 서버 값 유지, 빈 칸 있는 표 행 제거 | `Job` | `src/job/JobDetail.tsx` | `blog-writer:server/routes/jobs.ts:84-98` |
| POST | `/api/jobs/:id/post-to-blog` | 블로그 등록 시작 | `{platform: naver/tistory/wordpress}` 필수(기본 블로그 없음), `mode: draft/schedule/publish`(기본 draft), `scheduledAt`(ISO). 그 블로그의 ID·주소 없으면 400. 워드프레스: 사이트 주소 https·예약 시각 ≥ 지금+1분·연결 정보 필요. 네이버·티스토리: `mode`가 draft가 아니면 400, 확장 설치 필요. 초안 없음 400, 진행 중 409 | 202 | `src/job/NextStep.tsx` | `blog-writer:server/routes/jobs.ts:100-143` |
| PUT | `/api/jobs/:id/status` | 등록 이후 상태를 수기로 변경 | `{status: draft_ready/posted/published}`, 허용 전이만: posted→published·draft_ready, published→posted·draft_ready, scheduled→published·draft_ready (그 밖 400), 진행 중 409, 없으면 404 | `Job` | `src/job/NextStep.tsx` | `blog-writer:server/routes/jobs.ts:145-177` |
| POST | `/api/jobs/:id/cancel` | 진행 중 작업 중지 | 중지할 작업 없으면 409 | 202 | `src/job/JobDetail.tsx` | `blog-writer:server/routes/jobs.ts:179-186` |
| POST | `/api/jobs/:id/retry` | 리서치부터 다시 | 진행 중 409 | 202 | `src/job/JobDetail.tsx` | `blog-writer:server/routes/jobs.ts:188-198` |
| DELETE | `/api/jobs/:id` | 작업과 이미지 폴더 삭제 | 진행 중 409 | 204 | `src/job/JobDetail.tsx` | `blog-writer:server/routes/jobs.ts:200-207` |

## 이미지 (`server/routes/images.ts`)
| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| POST | `/api/jobs/:id/regenerate-images` | 이미지 여러 장 다시 만들기 (전부/실패만/썸네일 추가) | style·provider·thumbnail*·onlyFailed·addThumbnail, 바꾼 옵션은 job에 저장 | 202 | `src/job/JobDetail.tsx`, `src/job/images.tsx` | `blog-writer:server/routes/images.ts:14-67` |
| POST | `/api/jobs/:id/images/:target/regenerate` | 이미지 한 장 다시 만들기 | provider+style 필수, AI가 지원하는 스타일만, target=`thumbnail`/`body-<n>`(`bodyIndexOf`) | 202 / 404 | `src/job/images.tsx` `ImageTools` | `blog-writer:server/routes/images.ts:69-99` |
| POST | `/api/jobs/:id/images/:target` | 이미지 직접 올리기 | 본문은 바이너리, png/jpeg/webp/gif, ≤20MB | `{file}` | `src/job/images.tsx` `ImageTools` | `blog-writer:server/routes/images.ts:101-138` |
| GET | `/api/images/:id/:file` | 생성된 이미지 파일 | 파일명은 `basename`으로 제한 | 파일 / 404 | 미리보기 `<img>` | `blog-writer:server/routes/images.ts:140-146` |

## 공통 처리
- **로컬 전용**: `Host`가 localhost/127.0.0.1/[::1]이고, `Origin`이 있으면 그것도 로컬이어야 한다. 아니면 403 `forbidden`. 다른 사이트의 CSRF와 DNS 리바인딩을 막는다 (`blog-writer:server/app.ts:13-28`). 서버는 `127.0.0.1`에만 바인딩한다 (`blog-writer:server/index.ts:11`).
- **인증 없음**: 로컬 단일 사용자 전제.
- **본문 크기**: JSON 2MB, 이미지 업로드 20MB (`blog-writer:server/app.ts:29`, `blog-writer:server/routes/images.ts:105`).
- **에러 형식**: `{ error: string }`. 4xx(본문 파싱 오류 등)는 "요청 형식이 올바르지 않습니다.", 500은 메시지를 그대로 (`blog-writer:server/app.ts:33-38`). 화면 `req()`는 이 메시지를 그대로 예외로 던진다 (`blog-writer:src/api.ts:38-47`).
- **장시간 작업 패턴**: 상태를 먼저 `markBusy`로 진행 중으로 바꾸고 202를 준 뒤 `void run…()` (`blog-writer:server/routes/util.ts:12-23`). 화면이 응답 직후 목록을 읽어도 진행 중으로 보이게 하려는 것.
- **테스트**: 입력 검증·거절 경로는 `tests/api.test.ts`가 임시 데이터 폴더에서 `createApp()`으로 확인한다 → [[_system/modules/tests]].
