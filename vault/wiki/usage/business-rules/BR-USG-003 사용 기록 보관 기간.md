---
type: business-rule
domain: usage
id: BR-USG-003
name: 사용 기록 보관 기간
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/usage.ts:11-13
  - blog-writer:server/usage.ts:76-83
  - blog-writer:server/index.ts:10
  - blog-writer:README.md:204
entities: [UsageRecord]
updated: 2026-10-07
---
# BR-USG-003 사용 기록 보관 기간

## 규칙
Claude 호출 기록은 **90일** 보관한다. 서버를 시작할 때 한 번, 90일이 지난 줄을 지운다. 플랜 한도는 마지막 값 하나만 둔다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 서버 시작 | `pruneUsage`: `at`이 지금−90일보다 이전인 줄 삭제 (지울 게 없으면 파일 그대로) |
| 정리 실패 | 콘솔 오류, 서버는 계속 시작 |
| 깨진 줄 | 읽을 때 건너뜀 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `KEEP_DAYS = 90`, `pruneUsage` | `blog-writer:server/usage.ts:13`, `:76-83` |
| README | "90일 보관" | `blog-writer:README.md:204` |

## 예외 / 경계값
- 서버를 오래 켜 두면 그동안은 정리하지 않는다.

## 영향받는 플로우
[[usage/flows/사용량 확인 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 줄 번호·경로 보정 (리팩터링: API는 `server/routes/`로, 저장은 `server/fsutil.ts` 공용 도우미로). 규칙 변화 없음 | |
