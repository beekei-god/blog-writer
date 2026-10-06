---
type: domain-overview
domain: usage
aliases: [사용량, Claude 모델, 플랜 한도]
projects: [blog-writer]
updated: 2026-10-07
---
# usage (Claude 모델·사용량) 도메인

## 한 문단 요약
이 앱은 API 요금 대신 사용자의 Claude 구독 한도를 쓴다. 그래서 단계마다 어떤 모델을 쓸지(품질 vs 한도) 고르게 하고, 호출마다 토큰을 기록해 오늘·이번 주·모델별·단계별·작업별로 보여 주며, 계정 전체 5시간·주간 한도 사용률을 경고와 함께 보여 주는 업무.

## 경계
- 포함: 단계별 모델 선택·결정, 호출 기록·보관·집계, 플랜 한도 표시·확인
- 제외: 각 단계가 무엇을 하는지 → [[writing/overview]], [[image/overview]], [[publishing/overview]], [[topic/overview]]

## 핵심 개념
- [[usage/entities/UsageRecord]] — 호출 한 번의 모델별 토큰
- [[usage/entities/PlanLimits]] — 계정 한도 사용률

## 주요 플로우
- [[usage/flows/사용량 확인 플로우]]

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 서버 | 모델 결정, 이벤트에서 토큰·한도 수집, 저장·집계 | [[_system/modules/server-claude]] |
| API | 사용량·한도 확인·작업별 사용량 엔드포인트 (`server/routes/usage.ts`) | [[_system/modules/server-routes]] |
| 공용 | 단계·모델 선택지·추천값·집계 타입 | [[_system/modules/shared]] |
| 화면 | 모델 설정, 사용량 화면, 상단 칩, 작업별 사용(`src/job/JobUsage.tsx`) | [[_system/modules/web-screens]], [[_system/modules/web-app]], [[_system/modules/web-job]] |

## 구현 지도
- [[usage/implementations/blog-writer 구현]]
