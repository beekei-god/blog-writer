---
type: entity
domain: usage
name: UsageRecord
aliases: [사용 기록, 호출 기록, 토큰]
status: active
confidence: high
source:
  - blog-writer:server/usage.ts:16-28
  - blog-writer:server/claude.ts:166-181
  - blog-writer:shared/types.ts:69-77
  - blog-writer:shared/types.ts:104-130
updated: 2026-10-09
---
# UsageRecord (Claude 호출 기록)

## 의미
Claude CLI 호출 한 번에서 모델별로 쓴 토큰과 API 정가 환산 금액. 이 앱이 쓴 양만 담는다(계정 전체 아님).

## 속성
| 속성 | 타입 | 의미 | 화면 표시 |
|---|---|---|---|
| `at` | ISO | 호출 끝난 시각 | 일별 집계 (한국 시간) |
| `stage` | research/writing/images/browser/recommend/check | 단계 | 단계별 표 (자료 조사, 글 작성, 이미지 (Claude SVG), 브라우저 조작 (Claude in Chrome), 주제 추천, 한도 확인) |
| `callId` | string? | 같은 Claude 호출에서 나온 모델별 줄을 묶는 id (2026-10-05 추가, 예전 기록에는 없음) | |
| `jobId` | string? | 작업 (추천·확인 호출은 없음) | 작업 상세 "Claude 사용" |
| `model` | string | 실제 모델 ID (예: claude-sonnet-…) | "Sonnet 4.5" 형태로 |
| `input`, `output`, `cacheRead`, `cacheWrite` | number | 토큰 | 입력·출력·캐시 |
| `costUSD` | number | API 정가 환산 (구독 요금과 무관) | "정가 환산" |

집계 단위 `TokenTotals`는 위 토큰 4개 + `costUSD` + `calls`. `calls`는 집계 묶음마다 `callId`가 다른 호출만 센다(한 호출의 여러 모델 줄은 1회). `callId`가 없는 예전 기록은 줄 수대로 센다.

## 상태와 전이
추가만 한다. 서버 시작 시 90일 지난 줄 삭제 → [[usage/business-rules/BR-USG-003 사용 기록 보관 기간]].

## 저장 위치
`data/usage.jsonl` (줄 덧붙이기. 90일 정리 때만 파일 전체를 임시 파일에 써서 바꿔 넣는다: `blog-writer:server/usage.ts:38-44`, `:72-79`)

## 적용되는 규칙
[[usage/business-rules/BR-USG-004 사용량 집계 기준]], [[usage/business-rules/BR-USG-006 실패한 호출도 기록]]
