---
type: index
domain: publishing
updated: 2026-10-07
---
# publishing Index

## 엔티티
- [[publishing/entities/블로그 설정]] — 블로그별 연결 값(네이버 ID·티스토리 이름·워드프레스 주소·카테고리), 기본 블로그 없음, 예전 설정 옮기기
- [[publishing/entities/막힌 사이트]] — Claude in Chrome이 막은 플랫폼과 시각

## 비즈니스 규칙
- [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]] — 크롬 블로그는 임시저장만, 워드프레스 API는 예약·자동발행 가능(확인 창)
- [[publishing/business-rules/BR-PUB-002 블로그 ID 형식]] — 네이버·티스토리 `[\w-]+`, 워드프레스 https 주소
- [[publishing/business-rules/BR-PUB-003 입력 경로 선택과 막힌 사이트 기억]] — 워드프레스는 API, 나머지는 Claude in Chrome → 막히면 대체 경로
- [[publishing/business-rules/BR-PUB-004 크롬 작업 직렬화]] — 크롬 블로그 입력·웹 AI 이미지는 전역 한 줄 (워드프레스 제외)
- [[publishing/business-rules/BR-PUB-005 썸네일 위치]] — 네이버·티스토리 첫 이미지, 워드프레스 `featured_media`
- [[publishing/business-rules/BR-PUB-006 태그 입력 위치]] — 네이버 본문 끝 `#태그`, 티스토리 입력란, 워드프레스 태그 ID
- [[publishing/business-rules/BR-PUB-007 소제목 위 빈 줄]] — 소제목 위 한 줄 (워드프레스는 블록 간격)
- [[publishing/business-rules/BR-PUB-008 생성되지 않은 이미지 건너뜀]] — 파일 없는 이미지는 건너뛰고 계속
- [[publishing/business-rules/BR-PUB-009 네이버 이미지 파일 이름과 크기]] — 파일 이름=alt, JPEG 1600px
- [[publishing/business-rules/BR-PUB-010 이어쓰기 글이 있으면 중단]] — 팝업 취소, 남은 글이면 멈춤
- [[publishing/business-rules/BR-PUB-011 입력 결과 검증]] — 초안과 다른 점을 "확인 필요"로
- [[publishing/business-rules/BR-PUB-012 로그인 화면이면 멈춤]] — 모든 경로가 즉시 중단, 워드프레스는 401 원인별 안내
- [[publishing/business-rules/BR-PUB-013 발행 완료 표시|BR-PUB-013 발행 완료 표시와 수기 상태 변경]] — 임시저장·예약 글을 발행 완료로 표시·취소, 초안 완료로 되돌리기
- [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]] — 임시저장/예약발행/자동발행, 예약은 지금+1분 이후, 상태는 사이트 결과대로
- [[publishing/business-rules/BR-PUB-015 올릴 블로그는 글마다 선택]] — 기본 블로그 없음, `platform` 필수
- [[publishing/business-rules/BR-PUB-016 워드프레스 재등록은 같은 글 갱신]] — `postId`로 갱신, 미디어 재사용
- [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]] — 네이버·티스토리용, 다른 블로그 창이 열려 있으면 409

## 플로우
- [[publishing/flows/블로그 임시저장 플로우]] — 네이버·티스토리 (크롬)
- [[publishing/flows/워드프레스 API 등록 플로우]] — 워드프레스 (REST API)
- [[publishing/flows/Claude in Chrome 연결 확인 플로우]]

## 구현 지도
- [[publishing/implementations/blog-writer 구현]]

## 미해결
- [[publishing/open-questions]]
