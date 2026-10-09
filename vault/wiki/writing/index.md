---
type: index
domain: writing
updated: 2026-10-09
---
# writing Index

## 엔티티
- [[writing/entities/Job]] — 작업. `editProposal`(글 고치기 제안) 포함. researching→writing→generating_images→draft_ready→posting→posted/scheduled/published / failed (상태 9개, 화면 이름: 자료 조사 중 / 초안 검토 / 블로그 임시저장 중·완료 / 블로그 발행 예약 / 블로그 발행완료 등). 수기 상태 변경은 초안 검토·블로그 임시저장 완료·블로그 발행완료 중에서
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
- [[writing/business-rules/BR-WRT-011 작업 중복 실행과 진행 중 변경 금지]] — 실행 중 수정·삭제·재실행 409 (예외: 이미지 한 장씩 다시 만들기는 동시 진행)
- [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] — 초안 있으면 draft_ready, 없으면 failed (발행 창에서 멈추면 posted + 이유)
- [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] — 검색 질문 1, 메인 1·서브 2~3, 제목 후보 3
- [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]] — 공식→언론→블로그, WebFetch 최대 6개
- [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]] — 자동완성 ≤20 검색어, 함께 많이 찾는 ≤6
- [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]] — 글 전체/선택한 블록을 Claude가 고쳐 제안, 적용은 사용자가 (웹 검색 허용, 분량은 경고만)
- [[writing/business-rules/BR-WRT-017 고친 결과 적용 조건과 잠금]] — 만드는 동안 잠금(409), 범위가 그대로일 때만 적용, 재시작 시 failed
- [[writing/business-rules/BR-WRT-018 고칠 때 이미지는 그대로]] — 이미지는 ref로만 보이고 원래대로, 늘리거나 빼면 오류

## 플로우
- [[writing/flows/초안 작성 플로우]] — 진행 단계 6개 (자료 조사 → … → 블로그 임시저장 → 블로그 발행완료)
- [[writing/flows/초안 편집과 자동 저장 플로우]] — 글 복사 단계는 deprecated (2026-10-09 삭제), 블록 선택·이미지 추가·삭제 추가
- [[writing/flows/작업 중지와 재시도 플로우]] — 글 고치기도 같은 중지로 멈춤
- [[writing/flows/프롬프트로 글 고치기 플로우]] — 요청 → 제안(running/ready/failed) → 비교 → 적용/버리기
- [[writing/flows/내 글 목록 상태 필터 플로우]] — 칩 5개 (전체/자료 조사 중/초안 검토/임시 저장/발행 완료, 실패는 전체에서만)

## 구현 지도
- [[writing/implementations/blog-writer 구현]]

## 미해결
- [[writing/open-questions]]
