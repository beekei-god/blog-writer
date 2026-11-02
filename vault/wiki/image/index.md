---
type: domain-index
domain: image
updated: 2026-11-02
---
# image 목차

개요: [[image/overview]] · 구현 지도: [[image/implementations/blog-writer 구현]] · 열린 질문: [[image/open-questions]]

## 엔티티
- [[image/entities/이미지 명세]] · [[image/entities/이미지 옵션]] · [[image/entities/이미지 오류 종류]]

## 규칙
| 번호 | 이름 | 한 줄 |
|---|---|---|
| BR-IMG-001 | [[image/business-rules/BR-IMG-001 본문 이미지 개수]] | 0~6장, 모델이 어겨도 앞에서부터 자름 |
| BR-IMG-002 | [[image/business-rules/BR-IMG-002 AI별 허용 스타일]] | Claude는 플랫만 |
| BR-IMG-003 | [[image/business-rules/BR-IMG-003 썸네일 AI와 본문 AI 분리]] | 썸네일만 다른 AI·스타일·방법 |
| BR-IMG-004 | [[image/business-rules/BR-IMG-004 API와 크롬 생성 방법]] | 키 있으면 API, 실패해도 크롬으로 안 넘어감 |
| BR-IMG-005 | [[image/business-rules/BR-IMG-005 이미지 기획과 문구]] | 만들기 직전 본문을 보고 prompt·headline 결정 |
| BR-IMG-006 | [[image/business-rules/BR-IMG-006 썸네일 문구는 질문만]] | 답(결론·수치)은 본문에 |
| BR-IMG-007 | [[image/business-rules/BR-IMG-007 제목 확정 후 썸네일 생성]] | 버튼으로만 생성, 제목이 바뀌면 다시 안내 |
| BR-IMG-008 | [[image/business-rules/BR-IMG-008 실패 기록과 계속 진행]] | 한 장 실패가 글을 실패시키지 않음 |
| BR-IMG-009 | [[image/business-rules/BR-IMG-009 SVG 안전 렌더링]] | 스크립트·외부 주소 금지, JS 끄고 렌더링 |
| BR-IMG-010 | [[image/business-rules/BR-IMG-010 이미지 한 장씩 다시 만들기]] | 동시 실행, 같은 이미지 중복 금지 |
| BR-IMG-011 | [[image/business-rules/BR-IMG-011 이미지 직접 올리기 삭제 자리 추가]] | 20MB, 형식 4종, 최대 6장 |

## 플로우
- [[image/flows/이미지 생성]] · [[image/flows/제목 확정 후 썸네일 만들기]]
