---
type: module
project: blog-writer
module: server-pipeline
paths: [server/pipeline.ts, server/research.ts, server/writer.ts, server/schema.ts, server/naver.ts, server/editPost.ts, server/naverTopic.ts]
source:
  - blog-writer:server/pipeline.ts:1-495
  - blog-writer:server/research.ts:1-88
  - blog-writer:server/writer.ts:1-278
  - blog-writer:server/schema.ts:1-164
  - blog-writer:server/editPost.ts:1-207
  - blog-writer:server/naverTopic.ts:1-63
  - blog-writer:server/naver.ts:1-89
updated: 2026-10-09
---
# server-pipeline 모듈

## 책임
작업 하나를 끝까지 돌리는 오케스트레이션(초안·이미지·블로그 입력)과, 그중 리서치·글 작성·네이버 검색어 수집. 초안의 형식 스키마도 여기 있다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/pipeline.ts` | 495 | 작업 실행: `runDraft`(리서치→작성→이미지), `runImages`(이미지 여러 장, 작업 잠금), `runImage`(이미지 한 장, 다른 이미지와 동시에), `runPost`(블로그 등록: 워드프레스는 API로 바로 `doWordPressPost`, 네이버·티스토리는 크롬 큐에서 `doPost` — 2026-10-09부터 네이버·티스토리도 `PublishRequest`(임시저장/예약발행/자동발행)를 받아 세 입력 경로에 넘기고, 성공하면 `posted`/`scheduled`/`published`, 발행 창에서 멈추면(`PublishStepError`) `posted` + `job.error`). 이미지 만드는 방법은 `methodFor`(글에 저장된 `method`/`thumbnailMethod`)로 정하고, 한 장 다시 만들기만 누른 방법을 이번 실행에 쓴다(`imagesStep`). 2026-10-09(2차): `enqueueBrowser`(크롬 작업 큐)를 export해 카테고리 목록 읽기(`routes/categories.ts`)도 같은 큐를 쓰고, `startEdit`/`doEdit`(프롬프트로 글 고치기: `isRunning` 확인 → `running`에 등록 → `editProposal={status:"running"}` 기록 → 백그라운드 `proposeEdit` → `ready`/`failed`, 중지면 제안 삭제, 새 초안 `doDraft`는 제안을 지움), `runPost`에 `category` 전달과 네이버 예약·자동발행일 때 크롬 큐에 들어가기 전 `pickNaverTopic`(실패하면 주제 없이, 중지는 전파) 추가 (`blog-writer:server/pipeline.ts:157-203`, `blog-writer:server/pipeline.ts:369-395`). 공통 도우미 `requireDraft`(초안 없으면 오류), `failStep`(실패·중지 시 기록과 상태 되돌림). `countImages` 대신 `collectTargets` 길이, 이미지 찾기는 `imageSpecAt`/`imageSpecsOf`. 중복 실행 방지(`running` + 이미지별 `imageRuns`), 크롬 작업 큐(`serialQueue`, 이미지는 실제로 크롬을 쓸 때만), 실패·중지 시 상태 결정 | `isRunning`, `isImageBusy`, `runDraft`, `runImages`, `runImage`, `runPost`, `startEdit`, `enqueueBrowser` | [[writing/flows/초안 작성 플로우]], [[image/flows/이미지 생성 플로우]], [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]], [[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]], [[_system/modules/server-routes]] |
| `server/research.ts` | 88 | 딥서칭: Claude + WebSearch/WebFetch로 리서치 노트·출처·검색 질문·키워드 | `deepResearch`, `ResearchResult` | [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]] |
| `server/writer.ts` | 278 | 글 작성 프롬프트·이미지 지시문, 분량 줄이기, 태그 검증·중복 제거, 표·날짜줄 정리, 이미지 개수 맞추기. 시스템 프롬프트는 `systemFor`, 모델 출력 검증은 `ParsedPostSchema`(태그 뺀 `PostSchema`)로 한 곳에서 | `writePost`, `enforceLength`, `verifyTagSources`, `stripUpdateLines`, `enforceImageOptions`, `STYLE_GUIDE` | [[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-005 태그 출처 검증]] |
| `server/schema.ts` | 164 | zod `PostSchema`, `ImageOptionsSchema`(2026-10-09에 `method`·`thumbnailMethod` 추가)와 claude CLI용 JSON 스키마 `POST_JSON_SCHEMA`. 열거형 `ProviderEnum`·`StyleEnum`·`MethodEnum`을 공용으로 export (라우트 검증도 사용) | `PostSchema`, `BlogCategorySchema`(2026-10-09: `{id?: 양의 정수, name: 1~100자}`, post-to-blog 검증), `ImageOptionsSchema`, `POST_JSON_SCHEMA`, `ProviderEnum`, `StyleEnum`, `MethodEnum` | [[writing/entities/Post]], [[image/entities/ImageOptions]] |
| `server/editPost.ts` | 207 | (2026-10-09 새 파일) 프롬프트로 글 고치기. `proposeEdit`: 글쓰기 규칙(`getRules`)+고치는 방법 시스템 프롬프트, 도구 WebSearch·WebFetch, stage `writing`, effort `medium`, 20분 제한. 글 전체면 제목·요약도 받고 blocks는 모든 블록, 범위면 그 범위를 대체할 블록만(앞뒤 2~3블록은 읽기 전용 문맥). 이미지 블록은 `img-N` ref로만 보여 주고 결과에서 원래 이미지(파일 포함)를 되돌려 붙이며, 이미지를 빼거나 늘리거나 모르는 ref면 오류, 칸이 빈 표는 뺌, 바뀐 게 없으면 "바꿀 부분이 없다고 판단했습니다: <이유>" 오류. `applyProposal`: 범위의 현재 블록이 제안의 `before`와 같을 때만(글 전체면 블록 수도 같아야) 적용, 아니면 null. 분량 3,000자 상한은 경고만 하고 자동으로 줄이지 않음 | `EDIT_PROMPT_MAX`(2000), `EditInput`, `EditResult`, `proposeEdit`, `applyProposal` | [[_system/integrations/claude-cli]], [[_system/api]], [[_system/data-storage]], [[writing/business-rules/BR-WRT-001 본문 분량 상한]] |
| `server/naverTopic.ts` | 63 | (2026-10-09 새 파일) 네이버 블로그 주제 고르기. 주제는 코드에 고정한 목록(대분류 4개·32개 이름, `NAVER_TOPICS`). `pickNaverTopic`: 글의 제목·요약·태그(15개)·소제목(12개)을 Claude에 주고 목록 중 하나를 고르게 함(도구 없음, effort `low`, 2분, stage `writing`, JSON 스키마 enum). 목록 밖 답이거나 호출이 실패하면 null(주제 없이 올림), `CancelledError`는 그대로 던짐. `matchNaverTopic`은 공백·가운뎃점 모양 차이를 무시하고 목록 이름에 맞춤 | `NAVER_TOPIC_NAMES`, `matchNaverTopic`, `pickNaverTopic` | [[_system/integrations/claude-cli]], [[_system/integrations/blog-editors]] |
| `server/naver.ts` | 89 | 네이버 자동완성(공개 엔드포인트)·"함께 많이 찾는"(검색 화면 내부 요청) 수집 | `naverAutocomplete`, `collectNaverSuggestions` (`collectAutocomplete`·`naverRelated`는 2026-10-09에 내부 전용으로) | [[_system/integrations/naver-search]], [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-claude]] (`editPost.ts`·`naverTopic.ts`도 `runClaude` 사용), [[_system/modules/server-images]], [[_system/modules/server-browser]], [[_system/modules/server-wordpress]], [[_system/modules/server-core]](store·rules·cancel·fsutil), [[_system/modules/shared]]
- 사용되는 곳: [[_system/modules/server-routes]], `images/plan.ts`가 `STYLE_GUIDE`를 가져다 씀

## 주의할 점
- `POST_JSON_SCHEMA`(LLM 출력 형식)와 `PostSchema`(저장 검증)가 따로 있어 필드를 바꿀 때 둘 다 고쳐야 한다. `POST_JSON_SCHEMA`에는 `tags`가 없고 `tagDetails`만 있다 (태그는 서버가 `tagDetails`에서 만든다).
- 크롬 큐의 `doPost`는 Claude in Chrome 결과 status가 기대(`scheduled`/`published`)와 다르면 `PublishStepError`로 받아 상태를 `posted`로 둔다. "발행 확인" 단계에서 멈춘 경우에도 `posted`로 남지만 실제로는 발행됐을 수 있다 (`blog-writer:server/pipeline.ts:473-489`, [[_system/known-issues]]).
- 예전에 쓰이지 않던 `schema.ts`의 `imageSpec` 상수는 2026-10-07에 지웠다.
