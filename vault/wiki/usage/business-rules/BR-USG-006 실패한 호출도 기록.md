---
type: business-rule
domain: usage
id: BR-USG-006
name: 실패한 호출도 기록
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/claude.ts:166-181
  - blog-writer:server/usage.ts:37-43
entities: [UsageRecord]
updated: 2026-10-07
---
# BR-USG-006 실패한 호출도 기록

## 규칙
Claude 호출이 실패하거나 중지되어도, CLI가 돌려준 결과 이벤트에 토큰 사용량이 있으면 **먼저 기록한 뒤** 오류를 던진다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `result` 이벤트의 `modelUsage` 있음 | 모델마다 한 줄 기록 (오류·중지·차단·미연결이어도) |
| 결과 이벤트 없음 (강제 종료 등) | 기록할 것 없음 |
| 기록 쓰기 실패 | 콘솔 오류만, 호출 결과에는 영향 없음 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | 오류 판정 전에 `recordUsage` | `blog-writer:server/claude.ts:166-183` |

## 예외 / 경계값
- 중지·타임아웃으로 SIGTERM된 호출은 대개 결과 이벤트가 없어 기록되지 않는다 — 실제 사용량보다 적게 잡힐 수 있다 (`confidence: high`는 코드 동작 기준). 이를 감수하기로 했고(2026-10-05), 사용량 화면이 "중지하거나 시간 초과로 끊긴 호출의 토큰은 기록되지 않아 실제보다 적게 보일 수 있습니다"라고 안내한다 (`blog-writer:src/Usage.tsx:91`).

## 영향받는 플로우
[[usage/flows/사용량 확인 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 중단된 호출은 기록하지 않기로 확정, 화면에 한계 안내 추가 | `blog-writer:src/Usage.tsx:91` |
| 2026-10-07 | 줄 번호·경로 보정 (리팩터링: API는 `server/routes/`로, 저장은 `server/fsutil.ts` 공용 도우미로). 규칙 변화 없음 | |
