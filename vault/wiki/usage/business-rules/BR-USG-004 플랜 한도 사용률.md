---
type: business-rule
domain: usage
id: BR-USG-004
name: 플랜 한도 사용률
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/claude.ts:rate_limit_event
  - blog-writer:server/routes/usage.ts:POST /api/usage/check
  - blog-writer:server/usage.ts:savePlanLimits
entities: [플랜 한도]
updated: 2026-11-02
---
# BR-USG-004 플랜 한도 사용률

## 규칙
5시간·주간 한도 사용률은 Claude를 호출할 때 CLI가 보내는 값만 알 수 있으므로, **마지막으로 받은 값만** 저장해 보여 준다. 최신 값이 필요하면 사용자가 "확인"을 눌러 Haiku로 아주 짧은 호출을 한 번 보낸다(동시에 두 번은 안 됨). 계정을 바꾸면 이전 계정의 한도 정보를 지운다(새 계정으로 다시 확인하기 전까지 남아 있으면 틀린 값이 보이기 때문).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `rate_limit_event` 수신 | `fiveHour`·`sevenDay`(utilization 0~1, 초기화 시각), status, checkedAt 저장 |
| 확인 중에 또 확인 | 409 "이미 확인 중입니다" |
| 계정 변경(로그인/로그아웃) | `clearPlanLimits` |
| 한도 100% 초과 안내가 나옴 | 프로젝트 지침(CLAUDE.md 3장)에 따라 작업을 멈추고 초기화 시각에 재개 예약 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `savePlanLimits`, `clearPlanLimits`, `readPlan` | `data/plan-limits.json` | `blog-writer:server/usage.ts` |
| 서버 | 확인 라우트 | haiku, 60초 | `blog-writer:server/routes/usage.ts` |
| 화면 | 사용량 화면의 한도 막대 | | [[_system/modules/web-screens]] |

## 영향받는 플로우
[[usage/flows/Claude 호출]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
