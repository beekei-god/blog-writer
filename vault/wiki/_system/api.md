---
type: api
project: blog-writer
confidence: high
source:
  - blog-writer:server/app.ts:13-43
  - blog-writer:server/routes/settings.ts:1-182
  - blog-writer:server/routes/browser.ts:1-121
  - blog-writer:server/routes/usage.ts:1-35
  - blog-writer:server/routes/recommendations.ts:1-42
  - blog-writer:server/routes/jobs.ts:1-220
  - blog-writer:server/routes/images.ts:1-207
  - blog-writer:server/routes/categories.ts:1-67
  - blog-writer:server/routes/keywords.ts:1-25
  - blog-writer:server/routes/edit.ts:1-68
  - blog-writer:server/routes/util.ts:1-28
  - blog-writer:src/api.ts:68-164
  - blog-writer:server/explore.ts:1-74
updated: 2026-10-09
---
# API

엔드포인트는 주제별 라우터 파일 9개(`server/routes/*.ts`)에 나뉘어 있고, `server/app.ts`의 `createApp()`이 공통 처리와 함께 묶는다 → [[_system/modules/server-routes]]. 화면은 `src/api.ts`의 `api` 객체로만 부른다.

## 설정·규칙·키 (`server/routes/settings.ts`)
| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| GET | `/api/settings` | 설정 읽기 (기본값 병합, 예전 `platform`/`blogId` 값은 블로그별 칸으로 옮김) | | `Settings` | `NewJob`, `SettingsPanel`, `App` | `blog-writer:server/routes/settings.ts:37` |
| PUT | `/api/settings` | 설정 저장 | `SettingsSchema`: `naverBlogId`·`tistoryBlogId`(≤200자, 영문/숫자/_/-), `wordpressUrl`(≤200자, https 주소 형식), images=`ImageOptionsSchema`, models=단계별 enum | 200 `Settings` / 400 | `SettingsPanel`(카드마다 자기 칸만 바꿔 저장) | `blog-writer:server/routes/settings.ts:18-47` |
| GET | `/api/rules` | 글쓰기 규칙 (수정본 없으면 기본) | | `{content,isDefault,updatedAt}` | `RulesEditor` | `blog-writer:server/routes/settings.ts:50` |
| PUT | `/api/rules` | 규칙 저장 | content 1~50,000자(trim), 끝에 줄바꿈 추가 | `Rules` / 400 | `RulesEditor` | `blog-writer:server/routes/settings.ts:51-58` |
| POST | `/api/rules/reset` | 수정본 삭제 → 기본 규칙 | | `Rules` | `RulesEditor` | `blog-writer:server/routes/settings.ts:59` |
| GET | `/api/datalab` | 데이터랩 키 설정 여부 (값은 안 줌, Client ID 앞 4자만) | | `{configured, clientIdHint}` | `SettingsPanel`, `Recommend` | `blog-writer:server/routes/settings.ts:62-68` |
| PUT | `/api/datalab` | 키 확인 호출 후 저장 | clientId·clientSecret 필수 | 200 / 400(검증·확인 실패 메시지) | `SettingsPanel` | `blog-writer:server/routes/settings.ts:69-82` |
| DELETE | `/api/datalab` | 파일의 키 삭제 (환경변수 키는 남음) | | `{configured}` | `SettingsPanel` | `blog-writer:server/routes/settings.ts:83-89` |
| GET | `/api/image-api` | 이미지 API 키 연결 상태 (값은 안 줌) | | `{gemini, chatgpt}` 각각 `{configured, hint(앞 6자), fromEnv}` | `ImageApiSettings`, `src/job/images.tsx` | `blog-writer:server/routes/settings.ts:130` |
| PUT | `/api/image-api/:ai` | 키 확인(모델 목록 조회) 후 저장. 한도 부족 응답이어도 키는 맞는 것으로 봄 | ai=`gemini`/`chatgpt`(아니면 404), key 1~500자 | 상태 / 400(확인 실패 메시지) | `ImageApiSettings` | `blog-writer:server/routes/settings.ts:131-146` |
| DELETE | `/api/image-api/:ai` | 파일의 키 삭제 (환경변수 키는 남음) | ai=`gemini`/`chatgpt` | 상태 | `ImageApiSettings` | `blog-writer:server/routes/settings.ts:147-155` |
| GET | `/api/wordpress` | 워드프레스 연결 여부 (Application Password는 돌려주지 않음) | | `{configured, username}` | `SettingsPanel`, `NextStep` | `blog-writer:server/routes/settings.ts:158-161`, `blog-writer:server/routes/util.ts:25-28` |
| PUT | `/api/wordpress` | 사이트에 연결 확인(`users/me`) 후 사용자명·Application Password 저장 | 둘 다 1~200자 필수, 확인 실패면 400(원인별 메시지) | `{configured, username}` | `SettingsPanel` | `blog-writer:server/routes/settings.ts:162-175` |
| DELETE | `/api/wordpress` | 연결 정보 삭제 (예전 WordPress.com 값도 함께 지움) | | `{configured:false}` | `SettingsPanel` | `blog-writer:server/routes/settings.ts:176-182` |
| GET | `/api/searchad` | 네이버 검색광고 키 설정 여부 (값은 안 줌, 고객 ID 앞 3자만) → [[_system/integrations/naver-searchad]] | | `{configured, customerIdHint, fromEnv}` | `SearchAdSettings`, `Keywords` | `blog-writer:server/routes/settings.ts:91-96` |
| PUT | `/api/searchad` | 키워드 도구를 "날씨"로 한 번 호출해 확인한 뒤 저장 | customerId(≤40자)·apiKey·secretKey(≤200자) 모두 필수 → 아니면 400 "고객 ID, API 키, 비밀 키를 모두 입력하세요.", 확인 실패도 400(원인 메시지) | 상태 | `SearchAdSettings` | `blog-writer:server/routes/settings.ts:97-112` |
| DELETE | `/api/searchad` | 파일의 키 삭제 (환경변수 키는 남음) | | 상태 | `SearchAdSettings` | `blog-writer:server/routes/settings.ts:113-119` |
| ~~GET~~ | ~~`/api/wordpress/categories`~~ | **deprecated (2026-10-09, 4ffb5eb에서 삭제)**: 설정 화면의 기본 카테고리 선택용이었다. 지금은 없다(404). 글 화면용 목록은 `GET /api/categories/wordpress` | | | (없음) | `blog-writer:tests/api.test.ts:62-78` |

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
| GET | `/api/jobs` | 작업 목록 (생성일 내림차순) | | `Job[]` | `App` | `blog-writer:server/routes/jobs.ts:42` |
| POST | `/api/jobs` | 작업 생성 + 초안 파이프라인 시작 | topic 2~300자, links http(s) URL ≤`MAX_LINKS`(20)개, images=`ImageOptionsSchema`(provider·style·thumbnailProvider·thumbnailStyle에 2026-10-09부터 `method`·`thumbnailMethod`(`api`/`chrome`, 선택) 추가. 고른 값은 설정의 이미지 기본값으로도 저장) | 201 `Job` | `NewJob` | `blog-writer:server/routes/jobs.ts:44-73` |
| GET | `/api/jobs/:id` | 작업 하나 | | `Job` / 404 | (화면은 목록을 씀) | `blog-writer:server/routes/jobs.ts:75-82` |
| PUT | `/api/jobs/:id/post` | 초안 저장 (자동 저장) | `PostSchema`, 진행 중이면 409. 이미지 파일·오류는 서버 값 유지, 빈 칸 있는 표 행 제거 | `Job` | `src/job/JobDetail.tsx` | `blog-writer:server/routes/jobs.ts:85-99` |
| POST | `/api/jobs/:id/post-to-blog` | 블로그 등록 시작 | `{platform: naver/tistory/wordpress}` 필수(기본 블로그 없음), `mode: draft/schedule/publish`(기본 draft), `scheduledAt`(ISO). 그 블로그의 ID·주소 없으면 400. 워드프레스: 사이트 주소 https·예약 시각 ≥ 지금+1분(`checkSchedule`)·연결 정보 필요. 네이버·티스토리(2026-10-09부터 예약발행·자동발행 허용): `schedule`이면 `checkSchedule`(지금+1분 이상) 실패 시 400, 네이버는 분이 10의 배수가 아니면 400 "네이버 예약 시각은 10분 단위로 고를 수 있습니다.", 확장 설치 필요. 서버는 늘 임시저장 뒤 블로그 발행 창에서 발행한다(발행 창에서 멈추면 상태는 `posted` + `error`). 초안 없음 400, 진행 중 409. **`category`**(선택, `BlogCategorySchema`: `{id?: 양의 정수, name: 1~100자}`): 모든 블로그 공통. 형식이 틀리면 400 "카테고리 값이 올바르지 않습니다.", 워드프레스는 `id` 없으면 400 "워드프레스 카테고리는 사이트 목록에서 골라 주세요.". 검증을 모두 통과하면 `saveLastCategory`로 블로그별 마지막 카테고리를 기억한 뒤(등록 결과와 무관) `runPost`에 넘김 | 202 | `src/job/NextStep.tsx` | `blog-writer:server/routes/jobs.ts:101-163` |
| PUT | `/api/jobs/:id/status` | 등록 이후 상태를 수기로 변경 | `{status}` = `MANUAL_STATUSES`(draft_ready/posted/published) 아니면 400. 2026-10-09부터 지금 상태가 `canSetStatus`(draft_ready/posted/scheduled/published)이고 바꿀 상태가 지금과 다르면 허용(그 밖 400 "<지금> 상태의 글은 <바꿀>(으)로 바꿀 수 없습니다."). 로그: "블로그 발행완료로 표시했습니다." / "블로그 임시저장 완료로 표시했습니다." / "초안 검토로 되돌렸습니다." 진행 중 409, 없으면 404 | `Job` | `src/job/NextStep.tsx` (`StatusPicker`) | `blog-writer:server/routes/jobs.ts:163-190` |
| POST | `/api/jobs/:id/cancel` | 진행 중 작업 중지 | 중지할 작업 없으면 409 | 202 | `src/job/JobDetail.tsx` | `blog-writer:server/routes/jobs.ts:192-199` |
| POST | `/api/jobs/:id/retry` | 리서치부터 다시 | 진행 중 409 | 202 | `src/job/JobDetail.tsx` | `blog-writer:server/routes/jobs.ts:201-211` |
| DELETE | `/api/jobs/:id` | 작업과 이미지 폴더 삭제 | 진행 중 409 | 204 | `src/job/JobDetail.tsx` | `blog-writer:server/routes/jobs.ts:213-220` |

## 이미지 (`server/routes/images.ts`)
| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| POST | `/api/jobs/:id/regenerate-images` | 이미지 여러 장 다시 만들기 (전부/실패만/썸네일 추가). 작업 전체를 잠금 (진행 중이면 409) | style·provider·thumbnailProvider·thumbnailStyle·**thumbnailMethod**(`MethodEnum` `api`/`chrome`, 선택, 새로 추가)·onlyFailed·addThumbnail, 바꾼 옵션은 `job.imageOptions`에 저장(썸네일 방법은 `thumbnailMethod`) — 썸네일이 없을 때 "썸네일 만들기"에서 방법을 고르려고 추가 | 202 | `src/job/JobDetail.tsx`(썸네일 만들기) | `blog-writer:server/routes/images.ts:15-74` |
| POST | `/api/jobs/:id/images/:target/regenerate` | 이미지 한 장 다시 만들기. 다른 이미지를 한 장씩 만드는 중이면 함께 진행, 그 이미지·다른 단계가 진행 중이면 409 | provider+style 필수, AI가 지원하는 스타일만, `method`(`api`/`chrome`, 선택, 기본 `api`, 이번 한 장에만 쓰고 글에 저장하지 않음), target=`thumbnail`/`body-<n>`(자리 확인은 `imageSpecAt`) | 202 / 404 / 409 | `src/job/images.tsx` `ImageTools` | `blog-writer:server/routes/images.ts:73-110` |
| POST | `/api/jobs/:id/images/:target` | 이미지 직접 올리기. 다른 이미지를 한 장씩 만드는 중이어도 가능, 그 이미지·다른 단계가 진행 중이면 409 | 본문은 바이너리, png/jpeg/webp/gif, ≤20MB. 기록은 생성과 같은 `recordImageFile`(오류 지움, 예전 파일은 기록 뒤 삭제) | `{file}` | `src/job/images.tsx` `ImageTools` | `blog-writer:server/routes/images.ts:112-137` |
| POST | `/api/jobs/:id/images` | **본문 이미지 자리 추가**: 고른 블록 바로 뒤에 파일 없는 이미지 블록을 넣는다. 가까운 앞쪽 소제목(없으면 글 제목)을 alt로, 설명은 "…"<소제목>" 부분에 들어갈 삽화…"(소제목 없으면 "이 위치"). 이미지는 "이미지 생성"이나 직접 올리기로 채운다. 로그 "본문 이미지 자리를 추가했습니다 (#N)…" | `{afterBlock: 0 이상 정수}` 아니면 400 "이미지를 넣을 자리를 골라 주세요.", 초안 없음 400, **어떤 작업이든 진행 중이면 409**(블록 번호가 밀림), `afterBlock`이 블록 수 이상이면 404, 본문 이미지가 이미 `MAX_BODY_IMAGES`(6)장이면 400 | 201 `Job` | `src/job/PostEditor.tsx`·`JobDetail`의 "＋ 여기에 이미지 추가" | `blog-writer:server/routes/images.ts:139-177` |
| DELETE | `/api/jobs/:id/images/:target` | **이미지 삭제**: `thumbnail`이면 `post.thumbnail` 삭제("썸네일 만들기"로 다시 만들 수 있음), `body-<n>`이면 그 블록 삭제. 글에서 뺀 뒤에 이미지 파일을 지움(`removeImageFile`). 로그 "<썸네일|본문 이미지 #N>을 삭제했습니다." | 초안 없음 400, 진행 중 409, 이미지 자리가 없으면 404 | 200 `Job` | `ImageTools`의 "이미지 삭제"(파일이 있는 이미지만), 에디터 블록의 × | `blog-writer:server/routes/images.ts:179-200` |
| GET | `/api/images/:id/:file` | 생성된 이미지 파일 | 파일명은 `basename`으로 제한(`jobImagePath`) | 파일 / 404 | 미리보기 `<img>` | `blog-writer:server/routes/images.ts:202-207` |

## 카테고리 (`server/routes/categories.ts`)
| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| GET | `/api/categories/:platform` | 올릴 블로그의 카테고리 목록과 마지막으로 고른 카테고리(`last`). 워드프레스는 사이트에서 바로 읽고(`listCategories`), `last`는 이 블로그에서 마지막으로 고른 값(없으면 생략. 2026-10-09 전에는 설정의 기본 카테고리가 처음 값이었음). 네이버·티스토리는 `data/categories.json`에 저장된 목록(그 블로그 ID의 것만, 없으면 빈 배열) | `platform`이 naver/tistory/wordpress가 아니면 404 "알 수 없는 블로그입니다.". 워드프레스 연결·주소 문제는 400(`WordPressError`), 그 밖의 읽기 실패는 502 | 200 `{categories: {id?,name}[], fetchedAt?, last?}` | `src/job/NextStep.tsx` `useCategories` | `blog-writer:server/routes/categories.ts:21-39` |
| POST | `/api/categories/:platform/refresh` | **네이버·티스토리만.** 블로그 에디터를 열어 카테고리 이름 목록을 읽고 `data/categories.json`에 저장(글은 저장하지 않음). 브라우저 큐(`enqueueBrowser`)에 들어가 다른 크롬 작업과 순서대로 실행 | `platform`이 naver/tistory 아니면 404 "네이버·티스토리에서만 목록을 불러옵니다.", 블로그 ID가 없으면 400("먼저 설정에서 … 블로그 ID를 입력하세요."), **네이버는 macOS가 아니면 400**(평소 크롬 AppleScript 필요). 읽기 실패는 502 "카테고리 목록을 불러오지 못했습니다: <원인>" 뒤에 `CategoryError.dialog`가 있으면 "화면 구조 (문제 확인용, 글 본문은 빠짐)"을 최대 3,000자 붙임 | 200 `{categories: {name}[], fetchedAt, last?}` | `NextStep`의 "목록 불러오기" 버튼 | `blog-writer:server/routes/categories.ts:43-67` |

## 키워드 탐색 (`server/routes/keywords.ts`)
네이버 검색광고 키워드 도구([[_system/integrations/naver-searchad]])와 구글 트렌드([[_system/integrations/google-trends]])로 월간 검색량을 찾는다. 키 설정 API(`/api/searchad`)는 위 "설정·규칙·키" 표.

| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| GET | `/api/keywords?q=` | `exploreKeywords(q)`: 입력이 있으면 그 키워드(쉼표·줄바꿈·가운뎃점·슬래시로 나눔, 공백 제거, 중복 제거, **최대 5개**)의 연관 키워드와 월간 검색량. 입력이 없으면 "지금 뜨는 검색어"(구글 트렌드 상위 10개)와 "최근 주제 추천의 분야"(완료된 최근 3개 추천의 기준 키워드·분야, 최대 5개) 두 덩어리를 각각 찾음. 결과는 검색량 큰 순 상위 200개 | `q`는 trim 후 200자 이하, 비워도 됨(아니면 400). 검색광고 키가 없으면 400 "먼저 설정에서 네이버 검색광고 API 키를 연결하세요.". 키 오류·호출 한도(`SearchAdError`)는 400, 그 밖의 실패는 502 | 200 `{sections: KeywordSection[]}` (`id` input·trending·recommendation, `rows: KeywordRow[]`, 덩어리별 `error?`) | `Keywords` | `blog-writer:server/routes/keywords.ts:11-25`, `blog-writer:server/explore.ts:21-74` |

## 프롬프트로 글 고치기 (`server/routes/edit.ts`)
제안은 `job.editProposal`에 저장된다 → [[_system/data-storage]]. 규칙과 흐름: [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]], [[writing/business-rules/BR-WRT-017 고친 결과 적용 조건과 잠금]], [[writing/flows/프롬프트로 글 고치기 플로우]].

| 메서드 | 경로 | 하는 일 | 입력/검증 | 응답 | 호출하는 화면 | 근거 |
|---|---|---|---|---|---|---|
| POST | `/api/jobs/:id/edit` | 고치기 시작: `startEdit`가 `editProposal={status:"running"}`를 먼저 기록(작업 진행 중으로 등록 → 글 수정·블로그 올리기·이미지 작업이 409)하고 백그라운드에서 `proposeEdit` | `{prompt: trim 2~2000자(EDIT_PROMPT_MAX), range?: {start,end 0 이상 정수}}` 아니면 400 "고칠 내용을 2자 이상 2,000자 이하로 써 주세요.", 초안 없음 400, `end < start` 또는 `end >= 블록 수`면 400 "고칠 부분을 찾지 못했습니다…", 진행 중이면 409 "진행 중인 작업이 끝난 뒤에 시작해 주세요." | 202 `{ok:true}` | `src/job/EditByPrompt.tsx` | `blog-writer:server/routes/edit.ts:11-32` |
| POST | `/api/jobs/:id/edit/apply` | 결과(`status:"ready"`)를 글에 넣고 제안 삭제. `applyProposal`이 범위의 현재 블록이 제안의 `before`와 같을 때만(글 전체면 블록 수도 같아야) 적용. 로그 "프롬프트로 글을 고쳤습니다: <note>" | 글이 없거나 `ready` 제안이 없으면 400 "적용할 결과가 없습니다.", 진행 중 409, 작업 없음 404, 그 사이 글이 바뀌었으면 409 "그 사이 글이 바뀌어서 적용할 수 없습니다. 같은 요청으로 다시 만들어 주세요." | 200 `Job` | `EditByPrompt` | `blog-writer:server/routes/edit.ts:34-56` |
| DELETE | `/api/jobs/:id/edit` | 제안 버리기(`editProposal` 삭제). 만드는 중이면 먼저 "중지"로 멈춰야 함 | 작업 없음 404, 진행 중 409 "만드는 중입니다. 중지한 뒤에 버려 주세요." | 200 `Job` | `EditByPrompt` | `blog-writer:server/routes/edit.ts:58-68` |

## 공통 처리
- **로컬 전용**: `Host`가 localhost/127.0.0.1/[::1]이고, `Origin`이 있으면 그것도 로컬이어야 한다. 아니면 403 `forbidden`. 다른 사이트의 CSRF와 DNS 리바인딩을 막는다 (`blog-writer:server/app.ts:16-31`). 서버는 `127.0.0.1`에만 바인딩한다 (`blog-writer:server/index.ts:11`).
- **인증 없음**: 로컬 단일 사용자 전제.
- **본문 크기**: JSON 2MB, 이미지 업로드 20MB (`blog-writer:server/app.ts:32`, `blog-writer:server/routes/images.ts:116`).
- **에러 형식**: `{ error: string }`. 4xx(본문 파싱 오류 등)는 "요청 형식이 올바르지 않습니다.", 500은 메시지를 그대로 (`blog-writer:server/app.ts:36-41`). 화면 `req()`는 이 메시지를 그대로 예외로 던진다 (`blog-writer:src/api.ts:68-77`).
- **장시간 작업 패턴**: 상태를 먼저 `markBusy`로 진행 중으로 바꾸고 202를 준 뒤 `void run…()` (`blog-writer:server/routes/util.ts:12-23`). 화면이 응답 직후 목록을 읽어도 진행 중으로 보이게 하려는 것.
- **테스트**: 입력 검증·거절 경로는 `tests/api.test.ts`가 임시 데이터 폴더에서 `createApp()`으로 확인한다 → [[_system/modules/tests]].
