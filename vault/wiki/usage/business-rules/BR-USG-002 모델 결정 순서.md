---
type: business-rule
domain: usage
id: BR-USG-002
name: 모델 결정 순서
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/claude.ts:31-37
  - blog-writer:server/claude.ts:76-77
  - blog-writer:server/claude.ts:137-138
  - blog-writer:server/usage.ts:29-33
updated: 2026-10-07
---
# BR-USG-002 모델 결정 순서

## 규칙
Claude 호출의 모델은 다음 순서로 정한다: ① 호출이 직접 지정한 모델(한도·연결 확인의 haiku) → ② `check` 단계면 지정 없음 → ③ 설정의 그 단계 모델(default가 아니면) → ④ default면 `.env`의 `CLAUDE_MODEL` → ⑤ 그것도 없으면 `--model`을 넘기지 않아 Claude Code 기본 모델.

## 조건과 결과
| 조건 | `--model` |
|---|---|
| `opts.model` 있음 | 그 값 |
| stage = check, model 없음 | 없음 |
| 단계 설정 ≠ default | 그 별칭 (fable/opus/sonnet/haiku) |
| 단계 설정 = default, `CLAUDE_MODEL` 있음 | 그 값 |
| 그 밖 | 없음 → CLI 기본 |
| `--model`을 안 넘겼을 때 | CLI의 init 이벤트 모델을 "기본 모델"로 기억 → 화면 "Claude Code 설정 (지금은 …)" |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `modelFor` | `blog-writer:server/claude.ts:32-37` |
| 서버 | 기본 모델 기억 (메모리) | `blog-writer:server/claude.ts:137-138`, `blog-writer:server/usage.ts:30-33` |
| 화면 | 기본 모델 표시 | `blog-writer:src/SettingsPanel.tsx:304`, `blog-writer:src/Usage.tsx:120-122` |

## 예외 / 경계값
- 기본 모델은 서버를 재시작하면 잊고, default로 한 번 호출해야 다시 알게 된다.

## 영향받는 플로우
[[usage/flows/사용량 확인 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 줄 번호·경로 보정 (리팩터링: API는 `server/routes/`로, 저장은 `server/fsutil.ts` 공용 도우미로). 규칙 변화 없음 | |
