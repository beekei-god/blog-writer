---
type: business-rule
domain: usage
id: BR-USG-002
name: Claude 호출 방식
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/claude.ts:runClaude
entities: [호출 기록]
updated: 2026-11-02
---
# BR-USG-002 Claude 호출 방식

## 규칙
모든 Claude 호출은 이 컴퓨터에 로그인된 `claude` CLI를 `-p`(비대화) 모드로 부른다(구독 한도 사용, **API 키 불필요**). 결과는 JSON 스키마를 지정한 구조화 출력(`structured_output`)으로만 받는다. 프롬프트는 길어도 인자 길이 제한이 없도록 stdin으로 넘기고, 작업 폴더는 임시 폴더로 두어 다른 프로젝트의 CLAUDE.md가 섞이지 않게 한다. MCP 서버를 로드하지 않고(`--strict-mcp-config`), 허용한 내장 도구만 연다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 기본 제한 시간 | 15분(호출마다 `timeoutMs`로 바꿈), 초과 시 SIGTERM |
| effort | 기본 medium(low/medium/high) |
| 도구 | 기본 없음. 조사·고치기 등은 `WebSearch`, `WebFetch`만 |
| `chrome: true` | Claude in Chrome 도구를 켬. 확장 미연결 문구가 오면 바로 중단(`ChromeExtensionError`), 사이트 차단 문구가 오면 중단(`SiteBlockedError`) |
| 사용자가 중지 | AbortSignal로 SIGTERM → `CancelledError` |
| `claude`를 못 찾음 | "Claude Code를 설치하고 로그인했는지 확인하세요" |
| 결과 이벤트 없음 / `is_error` / 구조화 결과 없음 | 각각 오류 메시지 |
| 실패한 호출 | 쓴 토큰은 기록함 |
| 환경 변수 | `CLAUDE_BIN`(실행 파일), `CLAUDE_MODEL` |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `runClaude`, `ClaudeOptions` | 인자·이벤트 처리 | `blog-writer:server/claude.ts` |
| 서버 | `withCancel`, `currentSignal` | 중지 전파 | `blog-writer:server/cancel.ts` |
| 설정 | `.env` | `CLAUDE_BIN`, `CLAUDE_MODEL` | `blog-writer:.env.example` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 호출 옵션을 늘릴 때는 `ClaudeOptions`와 모든 호출부의 `stage`를 확인한다(사용량 기록·모델 선택이 stage로 정해짐).

## 영향받는 플로우
[[usage/flows/Claude 호출]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
