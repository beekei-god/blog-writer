---
type: module
project: blog-writer
module: server-pipeline
paths: [server/pipeline.ts, server/research.ts, server/writer.ts, server/schema.ts, server/naver.ts]
source:
  - blog-writer:server/pipeline.ts:1-415
  - blog-writer:server/research.ts:1-88
  - blog-writer:server/writer.ts:1-275
  - blog-writer:server/schema.ts:1-155
  - blog-writer:server/naver.ts:1-88
updated: 2026-10-08
---
# server-pipeline 모듈

## 책임
작업 하나를 끝까지 돌리는 오케스트레이션(초안·이미지·블로그 입력)과, 그중 리서치·글 작성·네이버 검색어 수집. 초안의 형식 스키마도 여기 있다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/pipeline.ts` | 415 | 작업 실행: `runDraft`(리서치→작성→이미지), `runImages`(이미지 여러 장, 작업 잠금), `runImage`(이미지 한 장, 다른 이미지와 동시에), `runPost`(블로그 등록: 워드프레스는 API로 바로 `doWordPressPost`, 네이버·티스토리는 크롬 큐에서 `doPost`). 중복 실행 방지(`running` + 이미지별 `imageRuns`), 크롬 작업 큐(`serialQueue`, 이미지는 실제로 크롬을 쓸 때만), 실패·중지 시 상태 결정 | `isRunning`, `isImageBusy`, `runDraft`, `runImages`, `runImage`, `runPost` | [[writing/flows/초안 작성 플로우]], [[image/flows/이미지 생성 플로우]], [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]], [[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]] |
| `server/research.ts` | 88 | 딥서칭: Claude + WebSearch/WebFetch로 리서치 노트·출처·검색 질문·키워드 | `deepResearch`, `ResearchResult` | [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]] |
| `server/writer.ts` | 274 | 글 작성 프롬프트·이미지 지시문, 분량 줄이기, 태그 검증·중복 제거, 표·날짜줄 정리, 이미지 개수 맞추기 | `writePost`, `enforceLength`, `verifyTagSources`, `stripUpdateLines`, `enforceImageOptions`, `STYLE_GUIDE` | [[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-005 태그 출처 검증]] |
| `server/schema.ts` | 155 | zod `PostSchema`, `ImageOptionsSchema`와 claude CLI용 JSON 스키마 `POST_JSON_SCHEMA` | `PostSchema`, `ImageOptionsSchema`, `POST_JSON_SCHEMA` | [[writing/entities/Post]], [[image/entities/ImageOptions]] |
| `server/naver.ts` | 88 | 네이버 자동완성(공개 엔드포인트)·"함께 많이 찾는"(검색 화면 내부 요청) 수집 | `naverAutocomplete`, `collectAutocomplete`, `naverRelated`, `collectNaverSuggestions` | [[_system/integrations/naver-search]], [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-claude]], [[_system/modules/server-images]], [[_system/modules/server-browser]], [[_system/modules/server-wordpress]], [[_system/modules/server-core]](store·rules·cancel·fsutil), [[_system/modules/shared]]
- 사용되는 곳: [[_system/modules/server-routes]], `images/plan.ts`가 `STYLE_GUIDE`를 가져다 씀

## 주의할 점
- `POST_JSON_SCHEMA`(LLM 출력 형식)와 `PostSchema`(저장 검증)가 따로 있어 필드를 바꿀 때 둘 다 고쳐야 한다. `POST_JSON_SCHEMA`에는 `tags`가 없고 `tagDetails`만 있다 (태그는 서버가 `tagDetails`에서 만든다).
- 예전에 쓰이지 않던 `schema.ts`의 `imageSpec` 상수는 2026-10-07에 지웠다.
