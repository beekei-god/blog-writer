---
type: business-rule
domain: usage
id: BR-USG-003
name: 호출 기록과 보관
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/usage.ts:recordUsage
  - blog-writer:server/usage.ts:pruneUsage
  - blog-writer:server/claude.ts:runClaude
entities: [호출 기록]
updated: 2026-11-02
---
# BR-USG-003 호출 기록과 보관

## 규칙
Claude 호출마다 모델별 토큰·금액을 `data/usage.jsonl`에 한 줄씩 덧붙인다. **실패한 호출도 쓴 토큰은 기록**한다. 같은 호출에서 나온 여러 모델 줄은 `callId`로 한 번만 호출 수에 센다. 기록은 90일만 보관하고 서버를 시작할 때 오래된 줄을 정리한다. 깨진 줄은 건너뛴다. 기록 실패는 호출을 실패시키지 않는다(콘솔에만 남김).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 호출 끝(성공/실패/중지) | `modelUsage` 기준으로 기록 |
| 글(작업) 단위 조회 | `getJobUsage(jobId)`: 모델별 합계 |
| 쓴 모델이 없는 호출 | 기록 없음 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `recordUsage`, `pruneUsage`, `getJobUsage` | `KEEP_DAYS=90`, 직렬 쓰기 | `blog-writer:server/usage.ts` |
| 라우트 | `GET /api/jobs/:id/usage` | | `blog-writer:server/routes/usage.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- `data/usage.jsonl`은 사용자 데이터이므로 읽지 않는다(확인이 필요하면 `BLOG_WRITER_DATA_DIR`로 가짜 데이터 사용).

## 영향받는 플로우
[[usage/flows/Claude 호출]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
