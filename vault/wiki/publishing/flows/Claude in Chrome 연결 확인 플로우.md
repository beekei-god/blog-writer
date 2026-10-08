---
type: flow
domain: publishing
name: Claude in Chrome 연결 확인 플로우
trigger: 설정(또는 오류 상자)의 "연결 확인" 클릭
confidence: high
source:
  - blog-writer:src/ExtensionStatus.tsx:1-70
  - blog-writer:server/routes/browser.ts:17-57
  - blog-writer:server/browser/claudeChrome.ts:40-95
  - blog-writer:src/SettingsPanel.tsx:350-380
updated: 2026-10-07
---
# Claude in Chrome 연결 확인 플로우

## 목적
네이버·티스토리 블로그 입력과 웹 AI(Gemini·ChatGPT) 이미지 전에 확장이 설치·연결되어 있는지 확인하고, 안 되어 있으면 방법을 안내한다. 워드프레스(API), Claude(SVG) 이미지, 자료 조사·글 작성에는 필요 없다. 설정 화면의 "Claude in Chrome" 카드가 이 이유를 안내하고(필요한 경우 / 필요 없는 경우 / 설정하지 않으면), 그 아래 "1. 확장 프로그램 연결"과 "2. 확장이 막는 블로그 (대체 방법)"를 함께 보여 준다.

## 단계
| # | 단계 | 위치 | 관련 규칙 |
|---|---|---|---|
| 1 | 화면 열 때 `GET /chrome-extension`: 설치 여부(프로필 파일) + 마지막 확인 결과 | `ExtensionStatus` | |
| 2 | 상태: 설치되지 않음 / 설치됨·연결 확인 전 / 설치됨·연결 안 됨 / 연결됨 | `ExtensionStatus` | |
| 3 | "연결 확인" → `POST /check`. 미설치면 Claude 호출 없이 "설치되어 있지 않습니다" 기억 | `routes/browser.ts` | |
| 4 | 설치됨: Haiku로 `tabs_context_mcp`(createIfEmpty false) 한 번만, 이동·클릭 금지, 90초 | `runClaude` | [[_system/integrations/claude-in-chrome]] |
| 5 | 결과 기억: connected true/false + 상세. 동시에 두 번이면 409 | `rememberConnection` | |
| 6 | 연결 안 됨이면 단계 안내: 설치 → 같은 Claude 계정 로그인 → 크롬 완전 재시작(⌘Q) → 연결 확인 | `ExtensionStatus` | |

## 실패 / 예외 경로
| 상황 | 결과 | 사용자에게 보이는 것 |
|---|---|---|
| CLI 오류 | 연결 실패로 기억(상세=오류) | "마지막 오류: …" |
| 실제 작업 중 도구 결과로 연결 여부가 바뀜 | 그때마다 기억 갱신 | 다음 조회 때 반영 |

## 관련 엔티티
[[publishing/entities/블로그 설정]]
