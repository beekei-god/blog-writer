---
type: business-rule
domain: publishing
id: BR-PUB-014
name: 등록 방식과 예약 시각 (워드프레스·네이버·티스토리)
aliases: [워드프레스 등록 방식과 예약 시각]
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:16-17
  - blog-writer:shared/types.ts:256-257
  - blog-writer:shared/labels.ts:23-24
  - blog-writer:server/routes/jobs.ts:100-152
  - blog-writer:server/wordpress.ts:245-264
  - blog-writer:server/wordpress.ts:299-302
  - blog-writer:server/pipeline.ts:319-360
  - blog-writer:server/pipeline.ts:411-415
  - blog-writer:server/browser/publish.ts:144-147
  - blog-writer:src/job/NextStep.tsx:130-328
entities: [블로그 설정, Job]
updated: 2026-10-09
---
# BR-PUB-014 등록 방식과 예약 시각 (워드프레스·네이버·티스토리)

> 파일 이름은 예전 이름(워드프레스만)을 그대로 둔다. 2026-10-09(65bfa3e)부터 네이버·티스토리에도 같은 방식 선택과 예약 시각 검사가 적용된다.

## 규칙
블로그에 올릴 때는 **임시저장 / 예약발행 / 자동발행** 중 하나를 고른다(기본 임시저장). 예약 시각은 **지금보다 1분 이상 뒤**여야 한다(과거 시각을 보내면 바로 공개될 수 있기 때문). **네이버는 예약 분을 10분 단위로만** 고를 수 있다(`NAVER_MINUTE_STEP`). 예약발행·자동발행은 실제로 공개되므로 화면이 확인을 받는다.

작업 상태는 워드프레스면 **사이트가 돌려준 글 상태**, 네이버·티스토리면 **발행 창 단계를 끝까지 마쳤는지**로 정한다.

## 조건과 결과
| 등록 방식 (`mode`) | 워드프레스 (API) | 네이버·티스토리 (크롬) | 확인 창 | 성공 시 상태 |
|---|---|---|---|---|
| 임시저장 `draft` (기본) | 사이트에 `draft` | 임시저장 | 없음 | 블로그 임시저장 완료 `posted` |
| 예약발행 `schedule` | `future` + `date_gmt`(UTC, `Z` 없는 ISO) | 임시저장 → 발행 창에서 예약(한국 시간) | 워드프레스 "<시각>에 공개되도록 예약합니다. 계속할까요?" / 크롬 "<블로그>에 임시저장한 뒤 <시각>에 공개되도록 예약합니다. 계속할까요?" | 블로그 발행 예약 `scheduled` |
| 자동발행 `publish` | `publish` | 임시저장 → 발행 창에서 즉시 발행 | 워드프레스 "지금 바로 공개됩니다. 계속할까요?" / 크롬 "<블로그>에 임시저장한 뒤 바로 공개합니다. 계속할까요?" | 블로그 발행완료 `published` |

크롬 블로그에 이미 올린 글을 다시 올릴 때는 확인 창에 "이전에 올린 글은 그대로 두고 블로그에 새 글이 하나 더 생깁니다."를 덧붙인다 → [[publishing/business-rules/BR-PUB-019 다른 블로그에 올린 글 표시]].

| 조건 | 결과 |
|---|---|
| 예약 시각 없음·형식 오류 | 400 "예약 시각을 올바르게 입력하세요." (모든 블로그) |
| 예약 시각 < 지금+1분 | 400 "예약 시각은 지금보다 1분 이상 뒤여야 합니다." (모든 블로그. 워드프레스는 업로드 전에 한 번 더) |
| 네이버 예약 분이 10의 배수가 아님 | 400 "네이버 예약 시각은 10분 단위로 고를 수 있습니다." (서버는 UTC 분으로 검사). 발행 창 단계도 만들기 전에 다시 막음 |
| 화면: 예약 시각이 지금+1분 이내 | 등록 버튼 비활성, "지금보다 1분 이상 뒤여야 합니다." |
| 화면: 네이버이고 분이 10분 단위 아님 | 등록 버튼 비활성, "10분 단위로 고를 수 있습니다." 시각 입력 칸 `step`도 10분 |
| 화면 예약 시각 기본값 | 워드프레스는 예전 예약 시각이 있으면 그 값, 없으면 내일 오전 9시. 네이버·티스토리는 늘 내일 오전 9시 (브라우저 현지 시간) |
| 워드프레스: 예약했던(또는 임시저장했던) 글을 자동발행으로 다시 등록 | `status: publish`와 함께 `date_gmt`=지금을 보내 예약으로 되돌아가지 않게 함. 이미 자동발행한 글을 갱신할 때는 `date_gmt`를 보내지 않음 |
| 워드프레스: 사이트가 돌려준 상태 `publish` / `future` / 그 밖 | `published` / `scheduled` / `posted` |
| 워드프레스: 요청한 방식과 사이트 상태가 다름 | 로그 "확인 필요: <방식>을 요청했지만 사이트에서는 "<상태>" 상태입니다. 사용자 권한을 확인하세요." |
| 네이버·티스토리: 발행 창에서 멈춤 | `posted` + 오류 → [[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치]] |
| 실패·중지 | 상태 `draft_ready` (초안 없으면 `failed`). 워드프레스 "워드프레스 등록 실패: …"/"워드프레스 등록을 중지했습니다.", 크롬 "블로그 작성 실패: …"/"블로그 작성을 중지했습니다…" |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `PublishMode`, `NAVER_MINUTE_STEP = 10`, `PUBLISH_MODE_LABEL` | `blog-writer:shared/types.ts:16-17`, `:256-257`, `blog-writer:shared/labels.ts:23-24` |
| 서버(요청 검사) | `mode` 기본 `draft`, `scheduledAt` ISO, 예약이면 `checkSchedule`(모든 블로그), 네이버 10분 단위 | `blog-writer:server/routes/jobs.ts:106-147` |
| 서버(워드프레스) | `WP_STATUS`, `checkSchedule`, 업로드 전 재확인, 자동발행 때 공개 시각 지금으로 | `blog-writer:server/wordpress.ts:245-264`, `:299-302` |
| 서버(상태) | `doWordPressPost` 사이트 상태로, `doPost` 요청 방식으로 | `blog-writer:server/pipeline.ts:332-360`, `:411-415` |
| 서버(발행 창) | 분 단위가 맞지 않으면 단계를 만들지 않음 (네이버 10, 티스토리 1) | `blog-writer:server/browser/publish.ts:145-147`, `:238`, `:259` |
| 화면 | 공용 `usePublishMode`(분 단위·1분 검사·요청 값)와 `PublishModeFields`(방식 버튼·안내·시각 칸)를 `ChromeBlogNext`와 `WordPressNext`가 같이 씀. 안내 문구는 `CHROME_MODE_HINT`/`WP_MODE_HINT` | `blog-writer:src/job/NextStep.tsx:149-158`, `:200-259`, `:273-281` |
| 테스트 | 예약 시각 경계, 과거 시각이면 업로드 전 거절, 자동발행 공개 시각, 네이버·티스토리 과거 시각·10분 단위 | `blog-writer:tests/wordpress.test.ts:18-26`, `:124-137`, `:145-149`, `blog-writer:tests/api.test.ts:72-95`, `blog-writer:tests/publish.test.ts:14-16` |

## 예외 / 경계값
- 예약된 글이 예약 시각에 공개됐는지 앱은 다시 확인하지 않는다. 사용자가 "글 상태"에서 "블로그 발행완료"로 바꾼다 → [[publishing/business-rules/BR-PUB-013 발행 완료 표시]].
- 워드프레스 자동발행은 크롬·확장 없이 바로 공개되고 Claude 사용량이 들지 않는다. 네이버·티스토리는 크롬 입력 경로를 그대로 쓰므로 Claude in Chrome 경로면 Claude 사용량이 든다.
- 화면은 브라우저 현지 시간으로 받고 ISO(UTC)로 보낸다. 네이버·티스토리 발행 창에는 한국 시간으로 바꿔 넣는다. 화면의 10분 단위 검사는 현지 분, 서버는 UTC 분으로 해서 30분·45분 단위 시차 지역에서는 둘이 다를 수 있다(한국 사용 기준으로는 같음).
- 예약 시각 검사 함수 `checkSchedule`은 `server/wordpress.ts`에 있지만 네이버·티스토리 요청에도 쓴다(오류 종류는 `WordPressError`, 문구는 같음).

## 영향받는 플로우
[[publishing/flows/워드프레스 API 등록 플로우]], [[publishing/flows/블로그 임시저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-07 | 최초 기록 (워드프레스 REST API 등록 추가) | `blog-writer:server/wordpress.ts:252-260` |
| 2026-10-07 | 예약해 둔 글을 자동발행으로 다시 올리면 예약("예약됨")으로 남던 문제를 고침: 자동발행 때 공개 시각을 지금으로 보냄 | `blog-writer:server/wordpress.ts:306-310`, `blog-writer:tests/wordpress.test.ts:123-136` |
| 2026-10-09 | **적용 범위 변경**: 워드프레스만 → 워드프레스·네이버·티스토리. 네이버·티스토리에 `schedule`/`publish`를 보내면 400이던 것 → 허용하고 같은 1분 검사, 네이버는 10분 단위 검사 추가. 화면의 방식 선택·예약 칸을 `PublishModeFields`/`usePublishMode`로 공용화. 상태 이름: 임시저장 완료/예약됨/발행 완료 → 블로그 임시저장 완료/블로그 발행 예약/블로그 발행완료 | 커밋 65bfa3e, `blog-writer:server/routes/jobs.ts:132-147`, `blog-writer:src/job/NextStep.tsx:221-259` |
