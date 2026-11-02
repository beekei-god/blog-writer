---
type: business-rule
domain: usage
id: BR-USG-006
name: Claude 로그인 관리
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/claudeAuth.ts:1-95
  - blog-writer:server/routes/claudeAuth.ts:1-46
entities: [플랜 한도]
updated: 2026-11-02
---
# BR-USG-006 Claude 로그인 관리

## 규칙
이 컴퓨터의 Claude Code 로그인을 화면에서 확인·로그인·취소·로그아웃할 수 있다(`claude auth status|login --claudeai|logout`). **인증 정보(토큰)는 읽거나 저장하지 않고** 계정 표시용 값(이메일·조직·로그인 방식)만 돌려준다. 로그인 창은 한 번에 하나만 열고, 로그인이 끝나면 프로세스가 스스로 끝난다. 창이 자동으로 열리지 않을 때를 위해 출력에서 로그인 주소를 꺼내 화면에 보여 준다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 상태 확인 | `auth status --json`, 조직·방식 이름은 `--text` 출력에서 가져옴 |
| 상태를 읽지 못함 | 로그아웃 상태로 표시 |
| 로그인 진행 중에 또 시작 | 그대로 둠 |
| 로그인이 0이 아닌 코드로 끝남 | "로그인이 끝나지 않았습니다. 다시 시도하세요" |
| 계정 변경 | 이전 계정의 한도 정보 삭제 → [[usage/business-rules/BR-USG-004 플랜 한도 사용률]] |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `getClaudeAuthStatus`, `startClaudeLogin`, `cancelClaudeLogin`, `claudeLogout` | | `blog-writer:server/claudeAuth.ts` |
| 라우트 | `/api/claude/auth` | | `blog-writer:server/routes/claudeAuth.ts` |
| 테스트 | 상태·로그인 | | `blog-writer:tests/claudeAuth.test.ts` |

## 영향받는 플로우
[[usage/flows/Claude 호출]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
