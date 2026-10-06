---
type: index
domain: usage
updated: 2026-10-07
---
# usage Index

## 엔티티
- [[usage/entities/UsageRecord]] — at·stage·jobId·model·토큰·정가 환산
- [[usage/entities/PlanLimits]] — 5시간·7일 사용률과 초기화 시각

## 비즈니스 규칙
- [[usage/business-rules/BR-USG-001 단계별 추천 모델]] — 조사·작성 Opus, 이미지·브라우저·추천 Sonnet
- [[usage/business-rules/BR-USG-002 모델 결정 순서]] — 지정 → 단계 설정 → CLAUDE_MODEL → CLI 기본
- [[usage/business-rules/BR-USG-003 사용 기록 보관 기간]] — 90일, 서버 시작 시 정리
- [[usage/business-rules/BR-USG-004 사용량 집계 기준]] — 한국 시간, 주는 월요일부터
- [[usage/business-rules/BR-USG-005 한도 경고 단계]] — 80% 경고, 95% 위험
- [[usage/business-rules/BR-USG-006 실패한 호출도 기록]] — 오류 전에 토큰 기록

## 플로우
- [[usage/flows/사용량 확인 플로우]]

## 구현 지도
- [[usage/implementations/blog-writer 구현]]

## 미해결
- [[usage/open-questions]]
