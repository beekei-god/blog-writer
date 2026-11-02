---
type: domain-index
domain: writing
updated: 2026-11-02
---
# writing 목차

- 개요: [[writing/overview]] · 구현 지도: [[writing/implementations/blog-writer 구현]] · 열린 질문: [[writing/open-questions]]

## 엔티티
- [[writing/entities/작업]] — 주제 하나의 전체 기록
- [[writing/entities/글]] — 제목·요약·블록·태그·키워드
- [[writing/entities/글 블록]] — 본문 조각 7종
- [[writing/entities/글쓰기 옵션]] — 분량·말투·형식·경험 메모
- [[writing/entities/수정 제안]] — 프롬프트로 고친 결과

## 규칙
| 번호 | 이름 | 한 줄 |
|---|---|---|
| BR-WRT-001 | [[writing/business-rules/BR-WRT-001 분량 목표와 상한]] | 목표 1,000~8,000자, 상한 1.2배, 초과 시 최대 2번 줄이기 |
| BR-WRT-002 | [[writing/business-rules/BR-WRT-002 말투와 문장 끝 검사]] | 문장 끝 80% 이상 맞아야 하고, 어긋나면 한 번 고쳐 쓰기 |
| BR-WRT-003 | [[writing/business-rules/BR-WRT-003 글 형식과 경험 메모]] | 정보 제공/리뷰, 경험담은 지어내지 않기 |
| BR-WRT-004 | [[writing/business-rules/BR-WRT-004 키워드 횟수와 검색 의도]] | 제목 1번, 본문 2번까지 |
| BR-WRT-005 | [[writing/business-rules/BR-WRT-005 제목 후보와 후킹 기법]] | 후보 3개, 기법 6가지 |
| BR-WRT-006 | [[writing/business-rules/BR-WRT-006 확인된 사실만 쓰기]] | 못 찾은 항목은 뺀다 |
| BR-WRT-007 | [[writing/business-rules/BR-WRT-007 태그 수와 출처 확인]] | 30개 이내, 수집 목록에 있는 것만 |
| BR-WRT-008 | [[writing/business-rules/BR-WRT-008 장소 블록]] | 장소 이름·주소·네이버 지도 링크 |
| BR-WRT-009 | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 문서와 작업별 사본]] | 기본/사용자 규칙, 작업 시작 때 사본 |
| BR-WRT-010 | [[writing/business-rules/BR-WRT-010 자료 조사]] | 웹 조사, 열람 6개, 출처 분류 |
| BR-WRT-011 | [[writing/business-rules/BR-WRT-011 프롬프트로 글 고치기]] | 제안 후 적용, 이미지 유지 |
| BR-WRT-012 | [[writing/business-rules/BR-WRT-012 분량 말투 다시 쓰기]] | 새 분량·말투로 전체 재작성 |
| BR-WRT-013 | [[writing/business-rules/BR-WRT-013 글 구조와 문단 형식]] | 소제목 섹션, 구분선 없음, 문단 2~4줄 |

## 플로우
- [[writing/flows/초안 작성]]
- [[writing/flows/프롬프트로 글 고치기]]
- [[writing/flows/제목 후보 다시 만들기]]
