---
type: extending-guide
project: blog-writer
source:
  - blog-writer:shared/types.ts
  - blog-writer:server/schema.ts
  - blog-writer:server/browser/adapters.ts
  - blog-writer:server/images/index.ts
  - blog-writer:server/claude.ts
updated: 2026-11-02
---
# 확장 가이드 (기능 추가·변경 때 어디를 고치나)

코드에서 확인한 파일 목록이다(`grep`으로 해당 식별자를 쓰는 파일을 확인). 빠진 곳이 있을 수 있으니 작업 전에 같은 식별자를 다시 검색한다. 변경 후에는 `npx tsc --noEmit`과 `npm test`.

## 새 블로그(플랫폼) 추가
비슷한 기존 구현: 티스토리(크롬) / 워드프레스(API) — [[publishing/implementations/blog-writer 구현]]
- 공용: `shared/types.ts`(`Platform`, `PLATFORMS`, `settingsFor`, 설정 필드), `shared/labels.ts`(이름)
- 서버 저장·검증: `server/store.ts`(설정 병합·마이그레이션), `server/routes/settings.ts`, `server/routes/jobs.ts`(`post-to-blog` 검사·`MANUAL_STATUSES`), `server/categories.ts`, `server/routes/categories.ts`
- 크롬 방식이면: `server/browser/adapters.ts`(`ADAPTERS`), `blogPost.ts`(Claude in Chrome 프롬프트), `category.ts`, `publish.ts`, `postHtml.ts`, `routes/browser.ts`
- API 방식이면: `server/wordpress.ts`처럼 별도 모듈 + `pipeline.ts`의 분기(`runPost`)
- 화면: `src/api.ts`, `src/App.tsx`, `src/SettingsPanel.tsx`, `src/job/JobDetail.tsx`, `src/LoginWindow.tsx`
- 함께 볼 규칙: [[publishing/business-rules/BR-PUB-001 블로그별 글 상태]], [[publishing/business-rules/BR-PUB-002 올리기 전 조건]], [[publishing/business-rules/BR-PUB-005 크롬 방식 선택과 막힌 사이트]]
- 테스트: `tests/publish.test.ts`, `tests/categories.test.ts`, `tests/wordpress.test.ts`, `tests/store.test.ts`

## 새 이미지 AI(제공자) 또는 스타일 추가
비슷한 기존 구현: Gemini/ChatGPT — [[image/implementations/blog-writer 구현]]
- 공용: `shared/types.ts`(`ImageProvider`, `ImageStyle`, `STYLES_BY_PROVIDER`)
- 서버: `server/schema.ts`(enum), `server/images/index.ts`(분기), `api.ts`(API 호출·오류 분류), `webAi.ts`(사이트 방식), `styles.ts`(스타일 문구), `server/secrets.ts`(API 키), `server/routes/settings.ts`(`/api/image-api/:ai`)
- 프롬프트: `server/writer.ts`(`STYLE_GUIDE`, `imageInstructions`), `server/images/plan.ts`
- 화면: `src/labels.ts`, `src/ImageApiSettings.tsx`, `src/NewJob.tsx`, `src/job/images.tsx`
- 함께 볼 규칙: [[image/business-rules/BR-IMG-002 AI별 허용 스타일]], [[image/business-rules/BR-IMG-004 API와 크롬 생성 방법]]
- 테스트: `tests/imageApi.test.ts`, `tests/webAi.test.ts`, `tests/imagePlan.test.ts`

## 글쓰기 옵션(분량·말투·형식 등) 추가
- 공용: `shared/types.ts`(`WritingOptions`), `shared/labels.ts`
- 서버: `server/schema.ts`(`WritingOptionsSchema`), `server/store.ts`(기본값), `server/routes/jobs.ts`(만들기 검사 메시지), `server/writer.ts`(`BASE_SYSTEM` 지시), `server/editPost.ts`(고칠 때도 지키게)
- 화면: `src/WritingPicker.tsx`, `src/NewJob.tsx`
- 함께 볼 규칙: [[writing/entities/글쓰기 옵션]], [[writing/business-rules/BR-WRT-012 분량 말투 다시 쓰기]]
- 테스트: `tests/writingOptions.test.ts`, `tests/editPost.test.ts`

## 글쓰기 규칙(프롬프트 지시) 바꾸기
- 규칙이 어디에 중복돼 있는지 먼저 찾는다: 기본 규칙 문서(`rules/default-writing-rules.md`), `server/writer.ts`의 `BASE_SYSTEM`·가이드 상수, `server/titleGuide.ts`, `shared/keywords.ts`, 고치기 프롬프트(`server/editPost.ts`), 이미지 기획(`server/images/plan.ts`)
- 사용자가 이미 `data/writing-rules.md`를 고쳐 두었으면 기본 규칙을 바꿔도 반영되지 않는다 → [[writing/business-rules/BR-WRT-009 글쓰기 규칙 문서와 작업별 사본]]
- 검사하는 규칙(분량, 말투, 키워드, 표)은 코드와 테스트가 있으니 값을 바꾸면 같이 고친다: `shared/length.ts`, `shared/tone.ts`, `shared/keywords.ts`, `tests/writer.test.ts`, `tests/tone.test.ts`, `tests/keywords.test.ts`

## Claude 호출 단계(stage) 추가
- `shared/types.ts`(`STAGES`, `RECOMMENDED_MODELS`), 호출부의 `stage`, `src/labels.ts`(단계 이름·이유), 설정/사용량 화면 → [[usage/business-rules/BR-USG-001 단계별 모델 선택]]

## 새 API 라우트 추가
- `server/routes/<이름>.ts`에서 `Router`를 내보내고 `server/app.ts`의 라우터 배열에 등록. 입력은 zod로 검사하고 `wrap`으로 감싼다. 작업을 시작하는 API는 `markBusy`로 상태를 먼저 바꾸고 202를 돌려준다. 화면 쪽은 `src/api.ts`.
- 함정: 본문 한도 2MB(`express.json`), 로컬 Host/Origin만 허용.

## 외부 서비스(키가 필요한) 추가
- `server/secrets.ts`에 키 이름 추가(항상 읽고-합치고-쓰기), `server/routes/settings.ts`에 조회·저장·삭제(값은 화면에 돌려주지 않음), 설정 화면. 비밀 값은 wiki에 적지 않는다.
