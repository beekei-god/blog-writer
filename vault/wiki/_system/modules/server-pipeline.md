---
type: module
project: blog-writer
module: server-pipeline
paths: [server/pipeline.ts, server/research.ts, server/writer.ts, server/schema.ts, server/naver.ts]
source:
  - blog-writer:server/pipeline.ts:1-429
  - blog-writer:server/research.ts:1-88
  - blog-writer:server/writer.ts:1-278
  - blog-writer:server/schema.ts:1-161
  - blog-writer:server/naver.ts:1-89
updated: 2026-10-09
---
# server-pipeline 모듈

## 책임
작업 하나를 끝까지 돌리는 오케스트레이션(초안·이미지·블로그 입력)과, 그중 리서치·글 작성·네이버 검색어 수집. 초안의 형식 스키마도 여기 있다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/pipeline.ts` | 429 | 작업 실행: `runDraft`(리서치→작성→이미지), `runImages`(이미지 여러 장, 작업 잠금), `runImage`(이미지 한 장, 다른 이미지와 동시에), `runPost`(블로그 등록: 워드프레스는 API로 바로 `doWordPressPost`, 네이버·티스토리는 크롬 큐에서 `doPost` — 2026-10-09부터 네이버·티스토리도 `PublishRequest`(임시저장/예약발행/자동발행)를 받아 세 입력 경로에 넘기고, 성공하면 `posted`/`scheduled`/`published`, 발행 창에서 멈추면(`PublishStepError`) `posted` + `job.error`). 이미지 만드는 방법은 `methodFor`(글에 저장된 `method`/`thumbnailMethod`)로 정하고, 한 장 다시 만들기만 누른 방법을 이번 실행에 쓴다(`imagesStep`). 공통 도우미 `requireDraft`(초안 없으면 오류), `failStep`(실패·중지 시 기록과 상태 되돌림). `countImages` 대신 `collectTargets` 길이, 이미지 찾기는 `imageSpecAt`/`imageSpecsOf`. 중복 실행 방지(`running` + 이미지별 `imageRuns`), 크롬 작업 큐(`serialQueue`, 이미지는 실제로 크롬을 쓸 때만), 실패·중지 시 상태 결정 | `isRunning`, `isImageBusy`, `runDraft`, `runImages`, `runImage`, `runPost` | [[writing/flows/초안 작성 플로우]], [[image/flows/이미지 생성 플로우]], [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]], [[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]] |
| `server/research.ts` | 88 | 딥서칭: Claude + WebSearch/WebFetch로 리서치 노트·출처·검색 질문·키워드 | `deepResearch`, `ResearchResult` | [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]] |
| `server/writer.ts` | 278 | 글 작성 프롬프트·이미지 지시문, 분량 줄이기, 태그 검증·중복 제거, 표·날짜줄 정리, 이미지 개수 맞추기. 시스템 프롬프트는 `systemFor`, 모델 출력 검증은 `ParsedPostSchema`(태그 뺀 `PostSchema`)로 한 곳에서 | `writePost`, `enforceLength`, `verifyTagSources`, `stripUpdateLines`, `enforceImageOptions`, `STYLE_GUIDE` | [[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-005 태그 출처 검증]] |
| `server/schema.ts` | 161 | zod `PostSchema`, `ImageOptionsSchema`(2026-10-09에 `method`·`thumbnailMethod` 추가)와 claude CLI용 JSON 스키마 `POST_JSON_SCHEMA`. 열거형 `ProviderEnum`·`StyleEnum`·`MethodEnum`을 공용으로 export (라우트 검증도 사용) | `PostSchema`, `ImageOptionsSchema`, `POST_JSON_SCHEMA`, `ProviderEnum`, `StyleEnum`, `MethodEnum` | [[writing/entities/Post]], [[image/entities/ImageOptions]] |
| `server/naver.ts` | 89 | 네이버 자동완성(공개 엔드포인트)·"함께 많이 찾는"(검색 화면 내부 요청) 수집 | `naverAutocomplete`, `collectNaverSuggestions` (`collectAutocomplete`·`naverRelated`는 2026-10-09에 내부 전용으로) | [[_system/integrations/naver-search]], [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-claude]], [[_system/modules/server-images]], [[_system/modules/server-browser]], [[_system/modules/server-wordpress]], [[_system/modules/server-core]](store·rules·cancel·fsutil), [[_system/modules/shared]]
- 사용되는 곳: [[_system/modules/server-routes]], `images/plan.ts`가 `STYLE_GUIDE`를 가져다 씀

## 주의할 점
- `POST_JSON_SCHEMA`(LLM 출력 형식)와 `PostSchema`(저장 검증)가 따로 있어 필드를 바꿀 때 둘 다 고쳐야 한다. `POST_JSON_SCHEMA`에는 `tags`가 없고 `tagDetails`만 있다 (태그는 서버가 `tagDetails`에서 만든다).
- 크롬 큐의 `doPost`는 Claude in Chrome 결과 status가 기대(`scheduled`/`published`)와 다르면 `PublishStepError`로 받아 상태를 `posted`로 둔다. "발행 확인" 단계에서 멈춘 경우에도 `posted`로 남지만 실제로는 발행됐을 수 있다 (`blog-writer:server/pipeline.ts:409-423`, [[_system/known-issues]]).
- 예전에 쓰이지 않던 `schema.ts`의 `imageSpec` 상수는 2026-10-07에 지웠다.
