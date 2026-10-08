---
type: business-rule
domain: publishing
id: BR-PUB-014
name: 워드프레스 등록 방식과 예약 시각
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:234-235
  - blog-writer:server/wordpress.ts:252-260
  - blog-writer:server/wordpress.ts:271
  - blog-writer:server/routes/jobs.ts:106-138
  - blog-writer:server/pipeline.ts:321-355
  - blog-writer:src/job/NextStep.tsx:155-267
entities: [블로그 설정, Job]
updated: 2026-10-07
---
# BR-PUB-014 워드프레스 등록 방식과 예약 시각

## 규칙
워드프레스에 올릴 때는 **임시저장 / 예약발행 / 자동발행** 중 하나를 고른다. 예약 시각은 **지금보다 1분 이상 뒤**여야 한다(과거 시각을 보내면 사이트가 바로 공개해 버리기 때문). 예약발행·자동발행은 실제로 공개되므로 화면이 확인을 받는다. 작업 상태는 요청한 방식이 아니라 **사이트가 돌려준 글 상태**로 정한다.

## 조건과 결과
| 등록 방식 (`mode`) | 사이트에 보내는 상태 | 확인 창 | 성공 시 작업 상태 |
|---|---|---|---|
| 임시저장 `draft` (기본) | `draft` | 없음 | 임시저장 완료 `posted` |
| 예약발행 `schedule` | `future` + `date_gmt`(UTC, `Z` 없는 ISO) | "<시각>에 공개되도록 예약합니다. 계속할까요?" | 예약됨 `scheduled` |
| 자동발행 `publish` | `publish` | "지금 바로 공개됩니다. 계속할까요?" | 발행 완료 `published` |

| 조건 | 결과 |
|---|---|
| 예약했던(또는 임시저장했던) 글을 자동발행으로 다시 등록 | `status: publish`와 함께 `date_gmt`=지금을 보내 예약으로 되돌아가지 않게 함. 이미 자동발행한 글을 갱신할 때는 `date_gmt`를 보내지 않음 |
| 사이트가 돌려준 상태 `publish` / `future` / 그 밖 | `published` / `scheduled` / `posted` |
| 요청한 방식과 사이트 상태가 다름 (예: 권한 부족으로 초안 저장) | 로그 "확인 필요: <방식>을 요청했지만 사이트에서는 "<상태>" 상태입니다. 사용자 권한을 확인하세요." |
| 예약 시각 없음·형식 오류 | 400 "예약 시각을 올바르게 입력하세요." |
| 예약 시각 < 지금+1분 | 400 "예약 시각은 지금보다 1분 이상 뒤여야 합니다." (요청 검사, 그리고 업로드 전에 한 번 더) |
| 화면: 예약 시각이 지금+1분 이내 | 등록 버튼 비활성, "지금보다 1분 이상 뒤여야 합니다." |
| 화면 예약 시각 기본값 | 예전 예약 시각이 있으면 그 값, 없으면 내일 오전 9시 (브라우저 현지 시간) |
| 네이버·티스토리에 `schedule`/`publish` | 400 → [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]] |
| 실패·중지 | 상태 `draft_ready` (초안 없으면 `failed`), 로그 "워드프레스 등록 실패: …" / "워드프레스 등록을 중지했습니다." |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `PublishMode` | `blog-writer:shared/types.ts:234-235` |
| 서버(요청 검사) | `mode` 기본 `draft`, `scheduledAt` ISO, 예약이면 `checkSchedule` | `blog-writer:server/routes/jobs.ts:106-128` |
| 서버(등록) | `WP_STATUS`, `checkSchedule`, 업로드 전 재확인, 자동발행 때 공개 시각 지금으로 | `blog-writer:server/wordpress.ts:252-260`, `:271`, `:306-310` |
| 서버(상태) | `doWordPressPost` 상태 결정·경고·실패 처리 | `blog-writer:server/pipeline.ts:321-355` |
| 화면 | `WordPressNext` 등록 방식 버튼·예약 시각·확인 창 | `blog-writer:src/job/NextStep.tsx:155-267` |
| 테스트 | 예약 시각 경계, 과거 시각이면 업로드 전 거절, 크롬 블로그는 임시저장만 | `blog-writer:tests/wordpress.test.ts:18-26`, `:144-149`, `:123-136`, `blog-writer:tests/api.test.ts:72-89` |

## 예외 / 경계값
- 예약된 글이 예약 시각에 공개됐는지 앱은 다시 확인하지 않는다. 사용자가 수기로 "발행 완료로 표시"한다 → [[publishing/business-rules/BR-PUB-013 발행 완료 표시]].
- 자동발행은 크롬·확장 없이 바로 공개된다. Claude 사용량은 들지 않는다.

## 영향받는 플로우
[[publishing/flows/워드프레스 API 등록 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-07 | 최초 기록 (워드프레스 REST API 등록 추가) | `blog-writer:server/wordpress.ts:252-260` |
| 2026-10-07 | 예약해 둔 글을 자동발행으로 다시 올리면 예약("예약됨")으로 남던 문제를 고침: 자동발행 때 공개 시각을 지금으로 보냄 | `blog-writer:server/wordpress.ts:306-310`, `blog-writer:tests/wordpress.test.ts:123-136` |
