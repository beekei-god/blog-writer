---
type: business-rule
domain: publishing
id: BR-PUB-012
name: 로그인 화면이면 멈춤
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/browser/claudeChrome.ts:104
  - blog-writer:server/browser/blogPost.ts:205
  - blog-writer:server/browser/userChrome.ts:370-378
  - blog-writer:server/browser/adapters.ts:162-165
  - blog-writer:server/images/webAi.ts:243
  - blog-writer:server/wordpress.ts:92-108
updated: 2026-10-09
---
# BR-PUB-012 로그인 화면이면 멈춤

## 규칙
앱은 사용자 대신 로그인하거나 비밀번호를 입력하거나 계정을 바꾸지 않는다. 로그인 화면이 나오면 멈추고 사용자에게 로그인하라고 알린다. (워드프레스는 화면 로그인 대신 Application Password로 인증하며, 인증 실패는 원인별 메시지로 멈춘다 → [[_system/integrations/wordpress-rest]].)

## 조건과 결과
| 경로 | 결과 |
|---|---|
| Claude in Chrome (블로그·이미지) | Claude가 멈추고 `login_required` → "블로그에 로그인되어 있지 않습니다…" / 이미지 `login` 실패 |
| 평소 크롬(네이버) | URL이 `nid.naver.com`이면 즉시 `login` 오류 |
| 워드프레스 API | 401이면 오류 코드별 안내 (헤더 전달 막힘 / 없는 사용자명 / 틀린 Application Password / 그 밖) 후 실패 |
| 앱 전용 크롬 자동 조작 | 로그인 URL이면 기다리지 않고 즉시 오류 "블로그에 로그인되어 있지 않습니다. 설정의 '블로그 로그인 창 열기'로 로그인한 뒤 다시 시도하세요." (2026-10-05 수정, 예전엔 5분 대기) |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 프롬프트(공통) | 직접 로그인 금지, 멈춤 | `blog-writer:server/browser/claudeChrome.ts:104` |
| Claude in Chrome 결과 처리 | `BlogLoginRequired` | `blog-writer:server/browser/blogPost.ts:205` |
| 평소 크롬 | `UserChromeError("login")` | `blog-writer:server/browser/userChrome.ts:375` |
| 자동 조작 | `waitForLogin`이 바로 throw | `blog-writer:server/browser/adapters.ts:162-165` |
| 워드프레스 API | 401 오류 코드 해석 | `blog-writer:server/wordpress.ts:92-108` |

모든 경로가 "앱이 직접 로그인하지 않고, 로그인 화면이면 멈춘다"로 같다.

## 예외 / 경계값
- `BlogLoginRequired`를 따로 잡는 곳이 없어 화면은 일반 실패로 보여 준다 ([[_system/known-issues]], [[publishing/open-questions]] #10).
- 작업 화면은 네이버·티스토리를 골랐고 실패 로그에 "자동 조작"이 있을 때만 그 블로그의 로그인 창 버튼을 띄운다 (`blog-writer:src/job/JobDetail.tsx:206-215`). 상자 문구는 등록 방식과 관계없이 "…로그인한 뒤 다시 임시저장하세요."이다.

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 확인 필요
- 해결됨: [[publishing/open-questions]] #3

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 자동 조작의 5분 로그인 대기를 즉시 중단으로 변경 (consistency conflict → consistent) | `blog-writer:server/browser/adapters.ts:151-155` |
| 2026-10-07 | 워드프레스 API 인증 실패(401) 원인별 안내 추가. 로그인 창은 네이버·티스토리용으로 한정 | `blog-writer:server/wordpress.ts:93-109` |
| 2026-10-09 | 근거 줄 번호 갱신 (동작 변화 없음) | 커밋 65bfa3e |
