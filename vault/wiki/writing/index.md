---
type: index
domain: writing
updated: 2026-10-07
---
# writing Index

## 엔티티
- [[writing/entities/Job]] — 작업. researching→writing→generating_images→draft_ready→posting→posted/scheduled/published / failed (상태 9개)
- [[writing/entities/Post]] — 초안: 제목·요약·태그·블록·작성 리포트
- [[writing/entities/글쓰기 규칙]] — 기본/수정본, 리서치·작성 프롬프트에 그대로 들어감

## 비즈니스 규칙
- [[writing/business-rules/BR-WRT-001 본문 분량 상한]] — 공백 포함 3,000자, 넘으면 최대 2번 줄여 쓰기
- [[writing/business-rules/BR-WRT-002 본문 글자수 계산]] — "참고 자료" 소제목 앞까지, `**` 제외
- [[writing/business-rules/BR-WRT-003 확인된 사실만 사용]] — 이번 리서치 출처의 사실만, 못 찾으면 본문에서 뺌
- [[writing/business-rules/BR-WRT-004 태그 최대 30개]] — 화면·서버 모두 30개 (2026-10-05 일치)
- [[writing/business-rules/BR-WRT-005 태그 출처 검증]] — 자동완성·함께 많이 찾는 태그는 수집 목록에 있어야 함
- [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]] — 모든 레이어 금지로 통일 (서버가 제거)
- [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]] — 저장(PUT)에서도 정리
- [[writing/business-rules/BR-WRT-008 날짜 표시줄 제거]] — 40자 이하 "업데이트: 날짜" 문단 삭제
- [[writing/business-rules/BR-WRT-009 글쓰기 규칙 적용 시점]] — 다음 작업부터, 작업마다 사본
- [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]] — 주제 2~300자, 링크 http(s) ≤20개 (화면·서버 일치)
- [[writing/business-rules/BR-WRT-011 작업 중복 실행과 진행 중 변경 금지]] — 실행 중 수정·삭제·재실행 409
- [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] — 초안 있으면 draft_ready, 없으면 failed
- [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] — 검색 질문 1, 메인 1·서브 2~3, 제목 후보 3
- [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]] — 공식→언론→블로그, WebFetch 최대 6개
- [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]] — 자동완성 ≤20 검색어, 함께 많이 찾는 ≤6

## 플로우
- [[writing/flows/초안 작성 플로우]]
- [[writing/flows/초안 편집과 자동 저장 플로우]]
- [[writing/flows/작업 중지와 재시도 플로우]]
- [[writing/flows/내 글 목록 상태 필터 플로우]] — 칩 7개 (예약됨 포함)

## 구현 지도
- [[writing/implementations/blog-writer 구현]]

## 미해결
- [[writing/open-questions]]
