---
type: business-rule
domain: topic
id: BR-TOP-005
name: 추천 동시 실행과 입력 제한
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/routes/recommendations.ts:11-42
  - blog-writer:server/recommend.ts:17
  - blog-writer:server/recommend.ts:49-66
  - blog-writer:server/recommend.ts:141-167
  - blog-writer:src/Recommend.tsx:62-129
  - blog-writer:src/Recommend.tsx:145-150
  - blog-writer:src/Keywords.tsx:112-119
  - blog-writer:src/App.tsx:56
  - blog-writer:src/App.tsx:199-226
  - blog-writer:tests/api.test.ts:253-256
entities: [Recommendation]
updated: 2026-10-09
---
# BR-TOP-005 추천 동시 실행과 입력 제한

## 규칙
주제 추천은 **앱 전체에서 한 번에 하나**만 돈다. 분야는 2~100자. 진행 중인 추천은 지울 수 없다. 서버가 재시작되어 끊긴 추천은 실패로 표시한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 분야 2자 미만 | 400 "분야를 2자 이상 입력하세요." |
| 분야 100자 초과 | 화면: input `maxLength=100`으로 입력 불가. 서버: 400 "분야는 100자 이하로 입력하세요." |
| 진행 중에 새 요청 | 409 "이미 주제 추천이 진행 중입니다." |
| 동시에 두 요청 | 파일을 쓰기 전에 `running`을 먼저 잡아 하나만 통과 |
| 진행 중 삭제 | 409 "진행 중인 추천은 삭제할 수 없습니다." |
| 진행 중 "추천 중지" | `POST /recommendations/:id/cancel` → AbortController로 Claude 호출을 SIGTERM, 단계 사이 `throwIfCancelled`에서 멈춤. 상태 failed, 오류 "사용자가 추천을 중지했습니다.". 중지할 추천이 없으면 409 (2026-10-05 추가) |
| 서버 재시작 | running → failed "서버가 재시작되어 중단되었습니다." |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | zod, 길이 초과 전용 문구, `isRecommending`, `running` | 2~100 | `blog-writer:server/routes/recommendations.ts:12-31`, `blog-writer:server/recommend.ts:141-167` |
| 화면 | 버튼 비활성 + `maxLength=100` (2026-10-05 추가) | 2자 이상, 100자 이하, 진행 중이면 비활성 | `blog-writer:src/Recommend.tsx:146-147` |
| 화면(시작 경로) | 키워드 탐색 표의 "주제 추천받기"가 분야로 즉시 시작 (`RecommendRequest`, `nonce`로 중복 방지). 같은 `POST /api/recommendations`를 쓰므로 동시 실행·길이 제한이 그대로 적용 | 키워드 2자 미만이면 탐색 쪽 버튼 비활성 | `blog-writer:src/Recommend.tsx:62-129`, `blog-writer:src/Keywords.tsx:112-119`, `blog-writer:src/App.tsx:56`, `:199-226` |
| 테스트 | 1자 → "2자 이상", 101자 → "100자 이하" | 2~100 | `blog-writer:tests/api.test.ts:253-256` |

## 예외 / 경계값
- 추천은 작업과 같은 중지 방식(`withCancel`)으로 돈다 (`blog-writer:server/recommend.ts:163-165`). 중지 요청은 작업 중지와 같은 `cancelJob`을 추천 id로 부른다 (`blog-writer:server/routes/recommendations.ts:24-31`).

## 영향받는 플로우
[[topic/flows/주제 추천 플로우]], [[topic/flows/키워드 탐색 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 분야 100자 상한을 화면에도 적용, 서버 초과 오류 문구 분리 (consistency conflict → consistent) | `blog-writer:src/Recommend.tsx:146`, `blog-writer:server/routes/recommendations.ts:15-19` |
| 2026-10-05 | 추천 중지 기능 추가 | `blog-writer:server/recommend.ts:163`, `blog-writer:server/routes/recommendations.ts:24-31`, `blog-writer:src/Recommend.tsx:206-217` |
| 2026-10-07 | API가 `server/routes/recommendations.ts`로 옮겨짐(동작 같음), 입력 길이 자동 테스트 추가. 예외 항목의 낡은 서술("withCancel 밖") 정정 | `blog-writer:tests/api.test.ts:253-256` |
| 2026-10-09 | 시작 경로가 늘었다: 키워드 탐색 탭에서 분야를 넘겨 즉시 시작. **규칙 자체(한 번에 하나, 2~100자, 중지)는 변경 없음** | `blog-writer:src/Recommend.tsx:62-129`, `blog-writer:src/App.tsx:211-226` |
