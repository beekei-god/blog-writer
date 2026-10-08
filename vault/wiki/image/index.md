---
type: index
domain: image
updated: 2026-10-08
---
# image Index

## 엔티티
- [[image/entities/ImageSpec]] — 이미지 한 장: basis·prompt·headline·alt·file·error
- [[image/entities/ImageOptions]] — 썸네일 여부, 본문 0~6장, 본문/썸네일 AI·화풍

## 비즈니스 규칙
- [[image/business-rules/BR-IMG-001 본문 이미지 개수]] — 0~6장, 초과분은 서버가 삭제
- [[image/business-rules/BR-IMG-002 AI별 허용 스타일]] — Claude는 플랫만 (공용 `fitStyle`)
- [[image/business-rules/BR-IMG-003 썸네일 AI와 스타일 결정]] — 없으면 본문 값, 불가하면 첫 스타일
- [[image/business-rules/BR-IMG-004 본문 기반 이미지 기획]] — 만들기 직전 섹션 기반으로 설명·문구 결정
- [[image/business-rules/BR-IMG-005 이미지 안 문구 길이]] — 썸네일 8~16자, 본문 4~20자, 최대 60자
- [[image/business-rules/BR-IMG-006 직접 고친 이미지 보호]] — userEdited면 자동 기획 제외
- [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] — 한 장 실패가 글을 막지 않음, 14종 원인, 이미지 자리에 실제 실패 이유
- [[image/business-rules/BR-IMG-008 이미지 결과는 서버 기록 우선]] — 초안 저장 시 file/error 유지
- [[image/business-rules/BR-IMG-009 다시 만들기 범위]] — all/failed/thumbnail/body-n, 화면은 이미지마다 "이미지 다시 생성"
- [[image/business-rules/BR-IMG-010 직접 올리기 형식과 크기]] — png/jpg/webp/gif ≤20MB
- [[image/business-rules/BR-IMG-011 SVG 안전 검증과 크기]] — 스크립트·외부 참조 금지, 1200×630/675
- [[image/business-rules/BR-IMG-012 실패 후 다른 AI 추천]] — **폐기(2026-10-08)**: 위쪽 실패 안내와 함께 삭제
- [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]] — 키 있으면 API, 실패해도 자동 전환 없이 API/크롬 버튼으로 선택
- [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]] — 이미지 여러 장 동시에, 크롬은 큐에서 하나씩

## 플로우
- [[image/flows/이미지 생성 플로우]]
- [[image/flows/이미지 다시 만들기 플로우]]

## 구현 지도
- [[image/implementations/blog-writer 구현]]

## 미해결
- [[image/open-questions]]
