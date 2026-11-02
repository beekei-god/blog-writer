---
type: domain-overview
domain: usage
aliases: [Claude 모델, 사용량, 플랜 한도]
projects: [blog-writer]
updated: 2026-11-02
---
# usage (Claude 모델·사용량) 도메인

## 한 문단 요약
이 앱의 모든 글·이미지·브라우저·추천 작업은 이 컴퓨터에 로그인된 `claude` CLI(구독 계정, API 키 없음)를 호출해 처리한다. 이 도메인은 **단계별로 어떤 모델을 쓸지**, **호출마다 토큰을 기록**하는 것, **구독 플랜의 5시간/주간 한도 사용률**을 보여 주는 것, 그리고 **Claude 로그인 관리**를 다룬다. 비용 숫자는 API 정가 환산이고 구독 요금과 무관하다.

## 경계
- 포함: 단계별 모델 선택, `claude` 호출 방식, 사용량 기록·집계, 플랜 한도, 로그인 상태·로그인/로그아웃
- 제외: 호출을 일으키는 각 업무 → [[writing/overview]], [[image/overview]], [[publishing/overview]], [[topic/overview]]

## 핵심 개념
- [[usage/entities/호출 기록]] · [[usage/entities/플랜 한도]] · [[usage/entities/단계별 모델]]

## 주요 플로우
- [[usage/flows/Claude 호출]]

## 규칙
[[usage/index]]의 규칙 표 (BR-USG-001~006)

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 서버 | `runClaude`, 기록·집계, 로그인 | [[_system/modules/server-claude]] |
| 라우트 | `/api/usage`, `/api/claude/auth` | [[_system/modules/server-routes]] |
| 화면 | 사용량·모델 설정 | [[_system/modules/web-screens]] |
| 외부 | claude CLI | [[_system/integrations/claude-cli]] |

## 구현 지도
- [[usage/implementations/blog-writer 구현]]
