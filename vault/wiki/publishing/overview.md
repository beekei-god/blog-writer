---
type: domain-overview
domain: publishing
aliases: [블로그 임시저장, 블로그 작성, 블로그 등록, 업로드, 워드프레스 등록]
projects: [blog-writer]
updated: 2026-10-07
---
# publishing (블로그 등록) 도메인

## 한 문단 요약
검토한 초안을 블로그에 올리는 업무. 기본 블로그는 없고, 설정에서 블로그마다 따로 연결해 두고 **글을 올릴 때마다 올릴 블로그를 고른다**([[publishing/business-rules/BR-PUB-015 올릴 블로그는 글마다 선택]]). **네이버 블로그·티스토리**는 공개 API가 없어 크롬 글쓰기 화면에 넣고 **임시저장까지만** 한다. 기본은 Claude in Chrome이 사용자의 평소 크롬을 조작하는 방식이고, 확장이 안전 정책으로 사이트를 막으면 우회하지 않고 대체 경로(네이버+macOS는 AppleScript로 평소 크롬, 그 밖은 앱 전용 크롬 자동 조작)로 이어 간다. **워드프레스**는 REST API와 Application Password로 올리며 임시저장·예약발행·자동발행을 고를 수 있고, 다시 올리면 같은 글을 갱신한다. 임시저장·예약 뒤에는 앱에서 "발행 완료"로 표시하거나 초안 완료로 되돌릴 수 있다([[publishing/business-rules/BR-PUB-013 발행 완료 표시]]).

## 경계
- 포함: 블로그 설정(블로그별), 올릴 블로그 선택, 입력 경로 선택·막힌 사이트, 에디터 서식, 임시저장, 워드프레스 API 등록(예약·자동발행), 크롬 작업 직렬화, 확장 연결 확인, 로그인 창, 등록 후 수기 상태 변경
- 제외(다른 도메인): 초안 내용·작업 상태 정의 → [[writing/overview]], 이미지 생성 → [[image/overview]]

## 핵심 개념
- [[publishing/entities/블로그 설정]] — 블로그별 연결 값과 워드프레스 인증
- [[publishing/entities/막힌 사이트]] — Claude in Chrome이 막은 플랫폼 기록
- 등록 방식 `PublishMode` (임시저장/예약발행/자동발행), 워드프레스 기록 `job.wordpress` → [[writing/entities/Job]]

## 주요 플로우
- [[publishing/flows/블로그 임시저장 플로우]] (네이버·티스토리)
- [[publishing/flows/워드프레스 API 등록 플로우]]
- [[publishing/flows/Claude in Chrome 연결 확인 플로우]]

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 프롬프트 | 브라우저 규칙(발행·로그인 금지), 네이버·티스토리 에디터 안내 | [[_system/integrations/claude-in-chrome]] |
| 서버(API) | 요청 검사(블로그 선택·모드·예약 시각·연결 여부), 수기 상태 전이, 로그인 창 | [[_system/modules/server-routes]] |
| 서버(작업) | 경로 선택, 조각 만들기, AppleScript/Playwright 입력, 검증 | [[_system/modules/server-browser]], [[_system/modules/server-pipeline]] |
| 서버(워드프레스) | REST API 등록, 미디어·태그·블록 마크업 | [[_system/modules/server-wordpress]] |
| 공용 | 붙여넣기 HTML·표 색·빈 줄·태그 줄, 블로그·상태 이름 | [[_system/modules/shared]] |
| 화면 | 블로그별 설정 카드, 확장 상태, 막힌 블로그, 로그인 창, 올릴 곳 선택, 등록 방식 | [[_system/modules/web-screens]], [[_system/modules/web-job]] |
| 외부 | 블로그 에디터, 워드프레스 REST API | [[_system/integrations/blog-editors]], [[_system/integrations/chrome-applescript]], [[_system/integrations/playwright-chrome]], [[_system/integrations/wordpress-rest]] |
| 테스트 | 워드프레스 등록(가짜 사이트), API 거절 경로 | [[_system/modules/tests]] |

## 구현 지도
- [[publishing/implementations/blog-writer 구현]]
