---
type: index
domain: topic
updated: 2026-10-07
---
# topic Index

## 엔티티
- [[topic/entities/Recommendation]] — 추천 실행: running→done/failed, datalab 결과
- [[topic/entities/TopicCandidate]] — 주제·검색어·이유·근거·관심도

## 비즈니스 규칙
- [[topic/business-rules/BR-TOP-001 추천 후보 조건]] — 최근 2주 뉴스·통계, 10~12개, 근거 필수, 이미 쓴 글 제외
- [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] — 기준 키워드 28일 평균 = 100 (`interestStat`, 자동 테스트 있음)
- [[topic/business-rules/BR-TOP-003 상승세 계산]] — 최근 7일 / 앞 21일 − 1
- [[topic/business-rules/BR-TOP-004 추천 순위]] — 데이터랩 있을 때만 관심도→상승세
- [[topic/business-rules/BR-TOP-005 추천 동시 실행과 입력 제한]] — 한 번에 하나, 분야 2~100자 (화면·서버 일치), 추천 중지
- [[topic/business-rules/BR-TOP-006 데이터랩 키 확인과 우선순위]] — 확인 후 저장, 환경변수 우선, 비밀 파일의 다른 항목 보존

## 플로우
- [[topic/flows/주제 추천 플로우]]

## 구현 지도
- [[topic/implementations/blog-writer 구현]]

## 미해결
- [[topic/open-questions]]
