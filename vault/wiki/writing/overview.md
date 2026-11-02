---
type: domain-overview
domain: writing
aliases: [글 작성, 초안 작성, 글쓰기]
projects: [blog-writer]
updated: 2026-11-02
---
# writing (글 작성) 도메인

## 한 문단 요약
주제 하나를 받아 웹에서 자료를 조사하고, 사용자가 고른 분량·말투·글 형식에 맞는 블로그 글(제목·요약·본문 블록·태그)을 Claude로 쓰는 업무다. 이 앱이 가장 중요하게 보장하는 것은 **확인된 사실만 쓴다**는 점이고, 그다음이 사용자가 고른 분량·말투·키워드 횟수를 어기지 않는 것이다. 완성된 글은 초안으로 저장되어 사용자가 화면에서 고치거나 프롬프트로 다시 고칠 수 있다.

## 경계
- 포함: 자료 조사, 글 본문·제목·태그 작성, 분량·말투·키워드 검사와 재작성, 제목 후보 다시 만들기, 프롬프트로 글 고치기, 분량·말투 다시 쓰기, 글쓰기 규칙 문서, 리뷰용 경험 메모 초안
- 제외(다른 도메인): 이미지 만들기·썸네일 → [[image/overview]], 블로그에 올리기·상태 표시 → [[publishing/overview]], 주제 추천 → [[topic/overview]], 모델 선택·사용량 → [[usage/overview]]

## 핵심 개념
- [[writing/entities/작업]] — 주제 하나에 대한 전체 기록(상태, 글, 로그)
- [[writing/entities/글]] — 제목·요약·블록·태그·키워드
- [[writing/entities/글 블록]] — heading/paragraph/list/quote/table/place/image
- [[writing/entities/글쓰기 옵션]] — 분량·말투·글 형식·경험 메모
- [[writing/entities/수정 제안]] — 프롬프트로 고친 결과(적용 전)

## 주요 플로우
- [[writing/flows/초안 작성]] — 주제 → 조사 → 쓰기 → 검사 → 이미지 → 초안
- [[writing/flows/프롬프트로 글 고치기]] — 요청 → 제안 → 비교 → 적용
- [[writing/flows/제목 후보 다시 만들기]]

## 규칙
- 분량·말투·형식: [[writing/business-rules/BR-WRT-001 분량 목표와 상한]], [[writing/business-rules/BR-WRT-002 말투와 문장 끝 검사]], [[writing/business-rules/BR-WRT-003 글 형식과 경험 메모]]
- 검색 노출: [[writing/business-rules/BR-WRT-004 키워드 횟수와 검색 의도]], [[writing/business-rules/BR-WRT-005 제목 후보와 후킹 기법]], [[writing/business-rules/BR-WRT-007 태그 수와 출처 확인]]
- 사실성: [[writing/business-rules/BR-WRT-006 확인된 사실만 쓰기]], [[writing/business-rules/BR-WRT-010 자료 조사]]
- 구성: [[writing/business-rules/BR-WRT-008 장소 블록]], [[writing/business-rules/BR-WRT-013 글 구조와 문단 형식]]
- 규칙 문서: [[writing/business-rules/BR-WRT-009 글쓰기 규칙 문서와 작업별 사본]]
- 고치기: [[writing/business-rules/BR-WRT-011 프롬프트로 글 고치기]], [[writing/business-rules/BR-WRT-012 분량 말투 다시 쓰기]]

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 프롬프트 | 글 구성·말투·제목 기법·키워드·태그·장소 지시 | [[_system/modules/server-core]] |
| 서버 | 조사·작성·검사·재작성·고치기 제안, 작업 저장 | [[_system/modules/server-pipeline]], [[_system/modules/server-claude]], [[_system/modules/server-routes]] |
| 공용 | 글자수·키워드 세기·말투 판정·장소 카드 | [[_system/modules/shared]] |
| 화면 | 글쓰기 폼, 초안 편집, 고치기 비교 | [[_system/modules/web-screens]], [[_system/modules/web-job]] |
| 테스트 | 위 규칙의 근거 | [[_system/modules/tests]] |

## 구현 지도
- [[writing/implementations/blog-writer 구현]]
