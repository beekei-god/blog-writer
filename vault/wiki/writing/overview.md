---
type: domain-overview
domain: writing
aliases: [글 작성, 초안, 작업]
projects: [blog-writer]
updated: 2026-10-09
---
# writing (글 작성) 도메인

## 한 문단 요약
주제 하나를 받아 웹 리서치로 사실과 출처를 모으고, 사용자가 정한 글쓰기 규칙에 맞춰 공백 포함 3,000자 이내의 한국어 블로그 초안(제목·본문 블록·태그·작성 리포트)을 만드는 업무. 작업(Job)의 생성·진행 상태·중지·재시도·삭제, 초안 편집과 자동 저장, 글쓰기 규칙 관리까지 포함한다. 이 앱이 가장 중요하게 보장하려는 것은 **"확인된 사실만 쓴다"**와 **"분량·태그·표 형식 규칙"**이다.

## 경계
- 포함: 작업 생명주기, 리서치, 글 작성 프롬프트와 후처리, 태그 수집·검증, 글쓰기 규칙, 초안 편집 (복사 기능은 2026-10-09 삭제)
- 제외(다른 도메인): 이미지 만들기 → [[image/overview]], 블로그에 넣기 → [[publishing/overview]], 주제 찾기 → [[topic/overview]], 모델 선택·사용량 → [[usage/overview]]

## 핵심 개념
- [[writing/entities/Job]] — 작업 하나, 상태 9개 (블로그 발행 예약·블로그 발행완료 포함)
- [[writing/entities/Post]] — 초안과 작성 리포트
- [[writing/entities/글쓰기 규칙]] — 프롬프트에 들어가는 편집 방침

## 주요 플로우
- [[writing/flows/초안 작성 플로우]]
- [[writing/flows/초안 편집과 자동 저장 플로우]]
- [[writing/flows/작업 중지와 재시도 플로우]]
- [[writing/flows/내 글 목록 상태 필터 플로우]]

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 프롬프트 | 규칙 대부분(문체·SEO·사실 확인·태그 고르기)을 지시 | [[_system/integrations/claude-cli]] |
| 서버 | 분량 재작성, 태그 검증, 표·날짜줄 정리, 상태 관리, 입력 검증 | [[_system/modules/server-pipeline]], [[_system/modules/server-core]], [[_system/modules/server-routes]] |
| 공용 | 분량 상한·계산, 태그 수, 타입 | [[_system/modules/shared]] |
| 화면 | 입력, 진행 표시, 편집·자동 저장, 리포트, 글 상태 직접 변경 | [[_system/modules/web-screens]], [[_system/modules/web-job]] |
| 테스트 | 글자수·태그 출처·표 정리·날짜줄·입력 검증·수기 상태 전이 | `tests/` (vitest, `npm test`) |

## 구현 지도
- [[writing/implementations/blog-writer 구현]]
