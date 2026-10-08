---
type: business-rule
domain: publishing
id: BR-PUB-004
name: 크롬 작업 직렬화
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:22-24
  - blog-writer:server/pipeline.ts:286-298
  - blog-writer:server/pipeline.ts:306-317
  - blog-writer:server/browser/runner.ts:20-51
  - blog-writer:server/routes/browser.ts:90-114
  - blog-writer:server/fsutil.ts:20-28
entities: [블로그 설정]
updated: 2026-10-08
---
# BR-PUB-004 크롬 작업 직렬화

## 규칙
사용자의 크롬을 쓰는 작업(네이버·티스토리 블로그 입력, 크롬에서 만드는 Gemini·ChatGPT 이미지)은 작업이 달라도 **한 번에 하나씩** 실행한다. 앱 전용 크롬 프로필도 한 프로세스만 열 수 있어 로그인 창과 자동 조작이 겹치지 않게 한다. 워드프레스 API 등록과 이미지 API로 만드는 이미지는 크롬을 쓰지 않으므로 이 줄에 서지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 네이버·티스토리 블로그 입력 | 항상 전역 크롬 큐(`enqueueBrowser`)에 넣음. 대기 중에도 그 작업은 실행 중 |
| 워드프레스 등록 | 큐 없이 바로 (`doWordPressPost`) |
| 이미지 생성 대상 중 **실제로 크롬에서 만들** Gemini·ChatGPT 이미지(방법이 `chrome`이거나 API 키가 없음)가 하나라도 있음 | 그 실행의 이미지 생성 전체를 큐에 넣음 |
| Claude(SVG)만, 또는 이미지 API로만 만듦 | 큐 없이 바로 (Claude는 별도 헤드리스 크롬). 이미지 한 장씩 다시 만들기는 서로 동시에 진행 → [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]] |
| 앞 작업 실패 | 다음 작업은 그대로 진행 |
| 자동 조작 중 로그인 창 열기 | 409 "지금 자동 조작으로 작업 중입니다…" |
| 로그인 창이 열린 채 자동 조작 시작 | 로그인 창을 닫고 진행 (로그 "로그인 창을 닫고 진행합니다.") |
| 로그인 창 열기 전 | 남아 있는 자동 조작 창을 닫음 |
| 다른 블로그의 로그인 창이 열려 있음 | 409 → [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]] |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `serialQueue` (앞 작업이 실패해도 다음 작업 실행) | `blog-writer:server/fsutil.ts:20-28` |
| 서버 | `enqueueBrowser = serialQueue()` | `blog-writer:server/pipeline.ts:22-24` |
| 서버 | 블로그 입력 분기 (워드프레스 제외) | `blog-writer:server/pipeline.ts:310-315` |
| 서버 | 이미지 분기 (크롬을 실제로 쓸 때만) | `blog-writer:server/pipeline.ts:286-298` |
| 서버 | 프로필 충돌 방지 | `blog-writer:server/browser/runner.ts:46-51`, `blog-writer:server/routes/browser.ts:93-95`, `:106` |

## 예외 / 경계값
- 큐는 메모리에만 있다. 서버 재시작 시 대기 중 작업은 복구 규칙으로 정리된다 → [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]].
- 연결 확인(`/chrome-extension/check`)은 큐를 거치지 않는다 (탭을 만들지 않는 조회만 함).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[image/flows/이미지 생성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 워드프레스 등록은 크롬 큐를 거치지 않음. 큐 구현이 공용 `serialQueue`로 바뀜(동작 같음) | `blog-writer:server/pipeline.ts:265-269`, `blog-writer:server/fsutil.ts:20-28` |
| 2026-10-08 | 이미지는 실제로 크롬에서 만들 때만 큐에 넣음. 이미지 API로 만드는 Gemini·ChatGPT 이미지는 큐 없이 진행 | `blog-writer:server/pipeline.ts:286-298`, 커밋 38ae96c |
