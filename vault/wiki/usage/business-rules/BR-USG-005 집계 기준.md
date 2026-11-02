---
type: business-rule
domain: usage
id: BR-USG-005
name: 집계 기준
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/usage.ts:getUsageSummary
  - blog-writer:server/rules.ts:kstDate
entities: [호출 기록]
updated: 2026-11-02
---
# BR-USG-005 집계 기준

## 규칙
날짜는 **한국 시간** 기준으로 센다. 오늘 합계, 이번 주(월요일 시작) 합계, 최근 7일 일별 합계, 이번 주 모델별·단계별 합계를 낸다. 단계·모델별로 가장 최근에 쓰인 모델(`lastModelByStage`)과 "default"일 때 실제 쓰인 모델(`defaultModel`)도 함께 준다. 모델별·단계별 목록은 토큰 합(입력+출력+캐시 읽기+캐시 쓰기)이 큰 순이다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 이번 주 시작 | 한국 시간 월요일(`kstWeekStart`) |
| 같은 `callId`의 여러 모델 줄 | 호출 수는 한 번 |
| 금액 | API 정가 환산(구독 요금과 무관) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `getUsageSummary`, `kstWeekStart`, `add` | | `blog-writer:server/usage.ts` |
| 서버 | `kstDate`, `todayKST` | `Intl.DateTimeFormat("en-CA", Asia/Seoul)` | `blog-writer:server/rules.ts` |
| 라우트 | `GET /api/usage` | | `blog-writer:server/routes/usage.ts` |

## 영향받는 플로우
[[usage/flows/Claude 호출]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
