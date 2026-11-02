---
type: glossary
updated: 2026-11-02
---
# 용어집

| 업무 용어 | 화면 문구 | 코드 식별자 | 정의 | 페이지 |
|---|---|---|---|---|
| 작업 | 내 글 | `Job` | 한 편의 글을 만드는 단위(주제~올리기 기록) | [[writing/entities/작업]] |
| 글 | 초안 | `Post` | 제목·블록·태그·설정을 가진 본문 | [[writing/entities/글]] |
| 글 블록 | 문단·소제목·이미지 자리 | `PostBlock` | 본문을 이루는 조각 | [[writing/entities/글 블록]] |
| 글쓰기 옵션 | 분량·말투·형식 | `WritingOptions` | 새 글 폼의 선택값 | [[writing/entities/글쓰기 옵션]] |
| 분량 | 짧게/보통/길게 | `length` | 목표 글자수와 상한 | [[writing/business-rules/BR-WRT-001 분량 목표와 상한]] |
| 말투 | 해요체/합니다체 등 | `tone` | 문장 끝 말투와 검사 | [[writing/business-rules/BR-WRT-002 말투와 문장 끝 검사]] |
| 경험 메모 | 내 경험 | `experience` | 사용자가 준 실제 경험 | [[writing/business-rules/BR-WRT-003 글 형식과 경험 메모]] |
| 키워드 횟수 | 키워드 N회 | `KEYWORD_RULES` | 본문에 넣을 키워드 횟수 제한 | [[writing/business-rules/BR-WRT-004 키워드 횟수와 검색 의도]] |
| 제목 후보 | 제목 고르기 | `titles` | 후킹 기법으로 만든 제목들 | [[writing/business-rules/BR-WRT-005 제목 후보와 후킹 기법]] |
| 장소 블록 | 장소 카드 | `place` | 지도 링크를 가진 장소 소개 | [[writing/business-rules/BR-WRT-008 장소 블록]] |
| 글쓰기 규칙 | 글쓰기 규칙 탭 | `writing-rules.md` | 사용자가 고치는 규칙 문서와 작업별 사본 | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 문서와 작업별 사본]] |
| 고치기 | 프롬프트로 고치기 | `editPost` | 지시문으로 글을 수정하는 기능 | [[writing/business-rules/BR-WRT-011 프롬프트로 글 고치기]] |
| 이미지 명세 | 이미지 자리 | `ImageSpec` | 이미지 한 장의 문구·스타일·결과 | [[image/entities/이미지 명세]] |
| 이미지 옵션 | 이미지 설정 | `ImageOptions` | 개수·AI·스타일·방법 | [[image/entities/이미지 옵션]] |
| 썸네일 | 이 제목으로 썸네일 만들기 | `thumbnail` | 제목 확정 후 만드는 대표 이미지 | [[image/business-rules/BR-IMG-007 제목 확정 후 썸네일 생성]] |
| 생성 방법 | API / 크롬 | `method` | 이미지를 만드는 경로 | [[image/business-rules/BR-IMG-004 API와 크롬 생성 방법]] |
| 블로그별 상태 | 올림/예약/임시저장 | `blogStatus` | 블로그마다의 등록 상태 | [[publishing/entities/블로그별 상태]] |
| 예약 | 예약 발행 | `scheduledAt` | 발행 시각 지정 | [[publishing/business-rules/BR-PUB-003 예약 시각 규칙]] |
| 막힌 사이트 | 차단 목록 | `blocked-sites` | Claude in Chrome이 못 여는 사이트 | [[publishing/business-rules/BR-PUB-005 크롬 방식 선택과 막힌 사이트]] |
| 네이버 주제 | 주제 선택 | `naverTopic` | 네이버 글의 주제 분류 | [[publishing/business-rules/BR-PUB-007 카테고리와 네이버 주제]] |
| 주제 추천 | 주제 추천 탭 | `Recommendation` | 근거 있는 글감 후보 | [[topic/entities/주제 추천]] |
| 키워드 행 | 키워드 탐색 표 | `KeywordResult` | 검색량·경쟁도 한 줄 | [[topic/entities/키워드 행]] |
| 단계 | 모델 설정 | `UsageStage` | Claude 호출 종류(모델이 단계마다 다름) | [[usage/entities/단계별 모델]] |
| 플랜 한도 | 5시간·주간 사용률 | `plan-limits` | 구독 한도 사용률 | [[usage/entities/플랜 한도]] |
| 호출 기록 | 사용량 | `usage.jsonl` | Claude 호출 한 건 | [[usage/entities/호출 기록]] |
