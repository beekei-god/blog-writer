---
type: index
domain: topic
updated: 2026-10-09
---
# topic Index

## 엔티티
- [[topic/entities/Recommendation]] — 추천 실행: running→done/failed, datalab 결과
- [[topic/entities/TopicCandidate]] — 주제·검색어·이유·근거·관심도
- [[topic/entities/KeywordRow]] — 키워드 탐색 줄(검색량·경쟁)과 덩어리(입력/지금 뜨는 검색어/최근 추천 분야)

## 비즈니스 규칙
- [[topic/business-rules/BR-TOP-001 추천 후보 조건]] — 최근 2주 뉴스·통계, 10~12개, 근거 필수, 이미 쓴 글 제외
- [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] — 기준 키워드 28일 평균 = 100 (`interestStat`, 자동 테스트 있음)
- [[topic/business-rules/BR-TOP-003 상승세 계산]] — 최근 7일 / 앞 21일 − 1
- [[topic/business-rules/BR-TOP-004 추천 순위]] — 데이터랩 있을 때만 관심도→상승세
- [[topic/business-rules/BR-TOP-005 추천 동시 실행과 입력 제한]] — 한 번에 하나, 분야 2~100자 (화면·서버 일치), 추천 중지
- [[topic/business-rules/BR-TOP-006 데이터랩 키 확인과 우선순위]] — 확인 후 저장, 환경변수 우선, 비밀 파일의 다른 항목 보존
- [[topic/business-rules/BR-TOP-007 키워드 검색량 표기와 집계]] — "< 10"은 5(low), 5개씩 나눠 호출, 검색량 큰 순 최대 200행 (자동 테스트 있음)
- [[topic/business-rules/BR-TOP-008 입력 없는 키워드 탐색의 기준과 오류 처리]] — 구글 트렌드 10개 + 최근 추천 3개, 트렌드 실패는 부분 오류, 키 오류·429는 전체 오류
- [[topic/business-rules/BR-TOP-009 검색광고 키 확인과 우선순위]] — 3값 확인 후 저장, SEARCHAD_* 환경변수 우선, 데이터랩 키와 별개

## 플로우
- [[topic/flows/주제 추천 플로우]] — 직접 또는 키워드 탐색에서 시작
- [[topic/flows/키워드 탐색 플로우]] — 입력/기준 → 검색광고·구글 트렌드 → 표 → 글쓰기·주제 추천

## 구현 지도
- [[topic/implementations/blog-writer 구현]]

## 미해결
- [[topic/open-questions]]
