---
type: flow
domain: usage
name: Claude 호출
trigger: 서버의 어떤 단계든 Claude가 필요할 때(`runClaude`)
confidence: high
source:
  - blog-writer:server/claude.ts:runClaude
  - blog-writer:server/usage.ts
updated: 2026-11-02
---
# Claude 호출

## 목적
모든 업무 단계가 같은 방식으로 Claude를 부르고, 모델 선택·중지·사용량 기록이 한 곳에서 일어나게 한다.

## 단계
| # | 단계 | 위치 | 관련 규칙 |
|---|---|---|---|
| 1 | 중지 신호 확인 | `currentSignal` | [[usage/business-rules/BR-USG-002 Claude 호출 방식]] |
| 2 | 단계에 맞는 모델 결정 | `modelFor` | [[usage/business-rules/BR-USG-001 단계별 모델 선택]] |
| 3 | `claude -p` 실행, 프롬프트는 stdin | `runClaude` | BR-USG-002 |
| 4 | 이벤트 처리: 도구 사용 알림, Claude in Chrome 결과 감시, 기본 모델 기억, 한도 이벤트 저장 | `rl.on("line")` | [[usage/business-rules/BR-USG-004 플랜 한도 사용률]] |
| 5 | 토큰 기록(성공/실패 모두) | `recordUsage` | [[usage/business-rules/BR-USG-003 호출 기록과 보관]] |
| 6 | 중지·확장 미연결·사이트 차단·오류·구조화 결과 없음 처리, 성공이면 `structured_output` 반환 | `runClaude` | BR-USG-002 |

## 실패 / 예외 경로
| 상황 | 결과 | 사용자에게 보이는 것 |
|---|---|---|
| 시간 초과 | SIGTERM, "결과 없이 종료" 오류 | 단계 실패 메시지 |
| 한도 도달 | CLI 오류 → 이미지에서는 `limit`으로 분류 | 사용량 화면의 한도 + 오류 문구 |
| `claude` 없음 | 설치 안내 오류 | 오류 문구 |

## 관련 엔티티
[[usage/entities/호출 기록]], [[usage/entities/단계별 모델]], [[usage/entities/플랜 한도]]
