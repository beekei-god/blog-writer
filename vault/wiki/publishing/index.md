---
type: domain-index
domain: publishing
updated: 2026-11-02
---
# publishing 목차

개요: [[publishing/overview]] · 구현 지도: [[publishing/implementations/blog-writer 구현]] · 열린 질문: [[publishing/open-questions]]

## 엔티티
[[publishing/entities/블로그별 상태]] · [[publishing/entities/블로그 설정]] · [[publishing/entities/워드프레스 기록]]

## 규칙
| 번호 | 이름 | 한 줄 |
|---|---|---|
| BR-PUB-001 | [[publishing/business-rules/BR-PUB-001 블로그별 글 상태]] | 상태는 블로그마다, 올려도 글은 초안검토로 돌아옴 |
| BR-PUB-002 | [[publishing/business-rules/BR-PUB-002 올리기 전 조건]] | 초안·진행 중 아님·블로그 ID·연결 정보 |
| BR-PUB-003 | [[publishing/business-rules/BR-PUB-003 예약 시각 규칙]] | 지금+1분 이후, 네이버는 10분 단위 |
| BR-PUB-004 | [[publishing/business-rules/BR-PUB-004 임시저장 우선과 발행 단계 실패]] | 크롬은 늘 임시저장 먼저, 발행 실패해도 글 보존 |
| BR-PUB-005 | [[publishing/business-rules/BR-PUB-005 크롬 방식 선택과 막힌 사이트]] | Claude in Chrome → 막히면 평소 크롬/앱 전용 크롬 |
| BR-PUB-006 | [[publishing/business-rules/BR-PUB-006 워드프레스 등록 규칙]] | HTTPS만, 이미지 재사용, 갱신, 예약 되돌림 방지 |
| BR-PUB-007 | [[publishing/business-rules/BR-PUB-007 카테고리와 네이버 주제]] | 올릴 때 고름, 실패해도 안 멈춤 |
| BR-PUB-008 | [[publishing/business-rules/BR-PUB-008 본문 변환과 붙여넣기 형식]] | 소제목 위 빈 줄, 태그 줄, 첫 이미지=대표 |
| BR-PUB-009 | [[publishing/business-rules/BR-PUB-009 수동 상태 표시와 목록 필터]] | 앱이 올리지 않고 표시만 바꿈 |

## 플로우
[[publishing/flows/블로그에 올리기]] · [[publishing/flows/워드프레스 등록]]
