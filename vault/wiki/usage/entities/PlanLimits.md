---
type: entity
domain: usage
name: PlanLimits
aliases: [플랜 한도, 한도 사용률]
status: active
confidence: high
source:
  - blog-writer:shared/types.ts:94-108
  - blog-writer:server/claude.ts:49-52
  - blog-writer:server/claude.ts:139-146
  - blog-writer:server/usage.ts:46-50
updated: 2026-10-09
---
# PlanLimits (플랜 한도)

## 의미
Claude 구독 계정 전체의 5시간·주간(7일) 한도 사용률. 이 앱뿐 아니라 터미널 Claude Code 등 같은 계정 사용량이 모두 포함된다. Claude를 호출해야 갱신된다.

## 속성
| 속성 | 타입 | 의미 | 화면 표시 |
|---|---|---|---|
| `fiveHour` | {utilization 0~1, resetsAt}? | 5시간 창 | "5시간 한도", 상단 칩 "5시간 N%" |
| `sevenDay` | 같음 | 7일 창 | "주간 한도 (7일)", 칩 "주간 N%" |
| `status` | string? | allowed / allowed_warning / rejected 등 | (표시 안 함) |
| `checkedAt` | ISO | 받은 시각 | "마지막 확인 N분 전" |

## 상태와 전이
Claude 호출 중 stream-json `rate_limit_event`가 오면 마지막 값으로 덮어쓴다. "지금 확인"은 Haiku로 짧은 호출을 보내 갱신한다.

## 저장 위치
`data/plan-limits.json` (임시 파일에 쓴 뒤 바꿔 넣음, `writeJsonAtomic`, 기록과 같은 줄에서 하나씩: `blog-writer:server/usage.ts:36-48`)

## 적용되는 규칙
[[usage/business-rules/BR-USG-005 한도 경고 단계]]
