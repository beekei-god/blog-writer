---
type: module
project: blog-writer
module: tests
paths: [tests/**, vitest.config.ts]
source:
  - blog-writer:vitest.config.ts:1-10
  - blog-writer:tests/setup.ts:1-10
  - blog-writer:tests/shared.test.ts:1-147
  - blog-writer:tests/writer.test.ts:1-83
  - blog-writer:tests/store.test.ts:1-54
  - blog-writer:tests/wordpress.test.ts:1-175
  - blog-writer:tests/api.test.ts:1-149
  - blog-writer:tests/webAi.test.ts:1-43
  - blog-writer:tests/imageApi.test.ts:1-129
  - blog-writer:tests/imageParallel.test.ts:1-152
updated: 2026-10-08
---
# tests 모듈 (자동 테스트)

## 책임
vitest로 업무 규칙과 API 입력 검사를 확인한다. `npm test`(= `vitest run`). 테스트 파일마다 빈 임시 데이터 폴더(`BLOG_WRITER_DATA_DIR`)를 쓰고 끝나면 지우므로 실제 `data/`를 건드리지 않는다 (`blog-writer:tests/setup.ts:1-10`). Claude·크롬·실제 네트워크는 부르지 않는다.

## 파일
| 파일 | 줄 | 확인하는 것 | 관련 페이지 |
|---|---|---|---|
| `vitest.config.ts` | 10 | `tests/**/*.test.ts`, node 환경, `tests/setup.ts` 먼저 실행 | |
| `tests/setup.ts` | 10 | 임시 데이터 폴더 지정·정리 | [[_system/configuration]] |
| `tests/shared.test.ts` | 141 | 본문 글자수(공백 포함, 줄바꿈·굵게·이미지 제외, 참고 자료 이후 제외, 이모지 1자), 블로그별 설정(`blogIdOf`/`settingsFor`), 스타일 맞추기·썸네일 AI 결정·이미지 키, 라벨, 복사용 텍스트, 이미지 오류 분류 | [[writing/business-rules/BR-WRT-002 본문 글자수 계산]], [[image/business-rules/BR-IMG-003 썸네일 AI와 스타일 결정]] |
| `tests/writer.test.ts` | 83 | 날짜 표시줄 제거, 표 빈 칸 행 제거, 이미지 개수 옵션, 태그 출처 검증, 데이터랩 관심도 환산·상승세 | [[writing/business-rules/BR-WRT-005 태그 출처 검증]], [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] |
| `tests/store.test.ts` | 54 | 데이터 폴더 환경 변수, 예전 설정(`platform`/`blogId`) 옮기기, 동시 로그 기록 | [[publishing/entities/블로그 설정]] |
| `tests/wordpress.test.ts` | 156 | 사이트 주소·예약 시각 검사, Gutenberg 블록, 가짜 사이트로 등록·갱신·재사용·대체 경로·401 원인별 메시지 | [[_system/integrations/wordpress-rest]] |
| `tests/webAi.test.ts` | 43 | 웹 AI 이미지 생성: Claude가 `failed`로 보고해도 다운로드 폴더의 이번 이미지는 성공 처리, 없으면 `ui_changed` (Claude·크롬 호출은 mock, 임시 다운로드 폴더) | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] |
| `tests/imageApi.test.ts` | 129 | 이미지 API: fetch를 가짜로 바꿔 OpenAI·Gemini 성공 응답 저장, 키 없음·크롬 선택이면 크롬 경로(mock), 429·거절·401은 크롬으로 넘기지 않고 `limit`·`refused`·`api_error`, 키 설정 API가 키 값을 돌려주지 않음 | [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]], [[_system/integrations/image-api]] |
| `tests/imageParallel.test.ts` | 152 | 이미지 한 장씩 다시 만들기 동시 실행: API 요청 둘이 함께 진행, 둘 다 끝나야 초안 상태, 같은 이미지 재요청 무시, 중지하면 모두 멈춤, 진행 중 다른 이미지 202·같은 이미지·초안 수정·전체 다시 만들기 409 (이미지 기획·크롬은 mock) | [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]] |
| `tests/api.test.ts` | 149 | `createApp()`으로 띄운 앱에 거절 경로만 요청: 로컬 전용, 설정 형식, 새 글 입력, 블로그 등록 검사, 수기 상태 전이, 이미지 대상·형식, 로그인 창, 추천 분야 길이 | [[_system/api]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-routes]], [[_system/modules/server-core]], [[_system/modules/server-wordpress]], [[_system/modules/server-pipeline]], [[_system/modules/server-recommend]], [[_system/modules/shared]]

## 주의할 점
- 서버 모듈은 불러올 때 데이터 폴더를 정하므로, 환경 변수는 반드시 `setupFiles`에서 먼저 지정한다.
- 화면(React) 테스트는 없다.
