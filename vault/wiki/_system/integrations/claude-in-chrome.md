---
type: integration
project: blog-writer
system: Claude in Chrome 확장 프로그램
confidence: high
source:
  - blog-writer:server/browser/claudeChrome.ts:1-105
  - blog-writer:server/claude.ts:115-136
  - blog-writer:server/browser/blogPost.ts:114-215
  - blog-writer:server/images/webAi.ts:178-267
updated: 2026-10-09
---
# Claude in Chrome 연동

## 무엇에 쓰나
사용자가 평소 쓰는 크롬(로그인 그대로)을 Claude가 조작하게 하는 확장(https://claude.ai/chrome). 블로그 글 입력과 Gemini·ChatGPT 이미지 생성에 쓴다.

## 호출 방식
- `runClaude({ chrome: true })` → `claude -p --chrome --allowedTools mcp__claude-in-chrome`. Claude가 `tabs_context_mcp`, `tabs_create_mcp`, `navigate`, `javascript_tool`, `find`/`read_page`, `computer`, `file_upload` 등을 쓴다.
- 설치 확인: 크롬 사용자 데이터 폴더의 `Local State`에서 프로필 목록을 읽고, 각 프로필의 `Secure Preferences`/`Preferences`에 확장 ID `fcoeoabgfenejglbffodgkkbkcdhcgfn`가 켜져 있는지 본다 (`blog-writer:server/browser/claudeChrome.ts:40-72`). 연결 여부는 실제 호출 결과로만 안다.
- 연결 상태는 메모리에 마지막 결과만 기억한다 (`rememberConnection`, `blog-writer:server/browser/claudeChrome.ts:82-90`).
- 공통 프롬프트 `BROWSER_RULES`: 새 탭 하나에서만 작업, 스크린샷 최소화(scale 0.5), 상태 확인은 find/read_page/javascript_tool, 대기는 JS Promise로 최대 60초, 파일 입력은 클릭하지 말고 `file_upload`, **로그인 화면이면 직접 로그인하지 말고 멈춤**, 결제·구독·설정 변경·발행 같은 되돌리기 어려운 동작 금지 (`blog-writer:server/browser/claudeChrome.ts:98-105`).
- 블로그 발행 (2026-10-09): 사용자가 예약발행·자동발행을 고르면 블로그 입력 프롬프트의 목표가 "임시저장한 뒤 아래 발행 절차대로 발행"으로 바뀌고 `publishPrompt`가 붙는다. `BROWSER_RULES`의 "발행 금지"는 이 절차에 한해 예외라고 적는다. 절차: 임시저장 확인 → (본문 입력에 problems가 있어도 발행은 진행하고 problems에 적음) → 네이버 상단 "발행"(발행 창 태그 칸은 비움, 공개 설정은 바꾸지 않음) / 티스토리 하단 "완료"·"공개" → 예약이면 한국 시간 날짜·시각을 맞추고 다시 읽어 확인(다르면 누르지 않고 `saved`) → 마지막 버튼을 한 번만 누르고 글쓰기 화면을 벗어나는지 확인 → status `published`/`scheduled` (`blog-writer:server/browser/publish.ts:310-336`, `blog-writer:server/browser/blogPost.ts:144-164`).
- 앱은 돌려받은 status만 본다: 기대한 `published`/`scheduled`가 아니면 `PublishStepError`(임시저장은 됨)로 처리한다 (`blog-writer:server/browser/blogPost.ts:211-213`). 실제로 발행됐는지는 앱이 따로 확인하지 않는다.

## 실패 처리
| 상황 | 감지 | 결과 |
|---|---|---|
| 미설치 | 프로필 파일 검사 | `ChromeExtensionError("not_installed")`, 블로그 입력 API는 400 |
| 미연결 | 도구 결과가 `/Browser extension is not connected|extension is not connected|No (connected )?browser/i` | CLI 즉시 종료, `not_connected` |
| 사이트 차단 | 도구 결과가 `/not allowed due to safety restrictions|site is not allowed/i`, 또는 Claude가 결과 message/problems에 그 문구를 적음 | `SiteBlockedError` → 대체 경로 → [[publishing/business-rules/BR-PUB-003 입력 경로 선택과 막힌 사이트 기억]] |

## 바깥 변화에 취약한 지점
- 확장 ID, 크롬 프로필 파일 구조, 오류 문구가 바뀌면 감지가 깨진다.
- 확장의 안전 정책이 사이트(예: 네이버)를 막을 수 있다. 앱은 이 제한을 우회하지 않고 다른 경로를 쓴다고 명시한다 (`blog-writer:server/browser/claudeChrome.ts:30`).

## 관련 규칙과 흐름
[[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]], [[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/Claude in Chrome 연결 확인 플로우]], [[image/flows/이미지 생성 플로우]]
