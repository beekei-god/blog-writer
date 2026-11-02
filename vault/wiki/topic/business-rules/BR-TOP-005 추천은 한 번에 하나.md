---
type: business-rule
domain: topic
id: BR-TOP-005
name: 추천은 한 번에 하나
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/recommend.ts:startRecommendation
  - blog-writer:server/routes/recommendations.ts:1-42
entities: [주제 추천]
updated: 2026-11-02
---
# BR-TOP-005 추천은 한 번에 하나

## 규칙
주제 추천은 한 번에 하나만 실행한다. 이미 진행 중이면 새 요청을 거절한다. 진행 중인 추천은 삭제할 수 없고 "중지"로 멈추며, 멈춘 추천은 `failed`로 남는다. 서버가 죽어 `running`으로 남은 추천은 시작할 때 실패 처리한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 분야가 2자 미만/100자 초과 | 400 |
| 이미 진행 중 | 409 "이미 주제 추천이 진행 중입니다" |
| 진행 중 삭제 | 409 |
| 중지할 추천 없음 | 409 |
| 중지 | `failed` + "사용자가 추천을 중지했습니다" |

동시에 들어온 두 요청이 모두 통과하지 않도록 `await` 전에 `running`을 잡는다.

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `startRecommendation`, `isRecommending`, `recoverRecommendations`, `deleteRecommendation` | | `blog-writer:server/recommend.ts` |
| 서버 | 라우트 | 검사·중지(`cancelJob` 재사용) | `blog-writer:server/routes/recommendations.ts` |
| 테스트 | 직접 검증하는 테스트는 찾지 못함 | | [[topic/open-questions]] 3번 |

## 영향받는 플로우
[[topic/flows/주제 추천]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
