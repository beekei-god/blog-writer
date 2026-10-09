---
type: business-rule
domain: publishing
id: BR-PUB-019
name: 다른 블로그에 올린 글 표시
status: active
confidence: high
consistency: conflict
source:
  - blog-writer:shared/types.ts:344-345
  - blog-writer:server/routes/util.ts:16-22
  - blog-writer:server/pipeline.ts:400-404
  - blog-writer:server/pipeline.ts:435-439
  - blog-writer:src/job/NextStep.tsx:154-204
  - blog-writer:src/job/NextStep.tsx:384-401
entities: [Job]
updated: 2026-10-09
---
# BR-PUB-019 다른 블로그에 올린 글 표시

## 규칙
한 글을 여러 블로그에 올릴 수 있고 글 상태는 마지막으로 올린 결과를 따른다([[publishing/business-rules/BR-PUB-015 올릴 블로그는 글마다 선택]]). 그래서 "이미 올린 글"(임시저장 완료·발행 예약)이라도 **지금 고른 블로그에 올린 것인지**를 구분해 보여 준다. 네이버·티스토리 화면은 **마지막으로 올린 블로그(`job.postingTo`)가 지금 고른 블로그일 때만** "이 블로그에 올렸다"고 본다.

## 조건과 결과 (네이버·티스토리, `ChromeBlogNext`)
| 조건 | 결과 |
|---|---|
| 상태가 `posted`/`scheduled`이고 `postingTo`가 지금 고른 블로그 (또는 `postingTo` 기록이 없는 예전 글) | "올린 글"로 봄: "<블로그>에 임시저장했습니다…" / "<블로그>에 발행 예약했습니다…", 버튼 "다시 올리기 (<방식>)", 예약·자동 확인 창에 "이전에 올린 글은 그대로 두고 블로그에 새 글이 하나 더 생깁니다." |
| 상태가 `posted`/`scheduled`이고 `postingTo`가 다른 블로그 | "**다른 블로그에 올린 글입니다.** <블로그>에도 올릴 수 있습니다. 올리면 글의 상태가 <블로그> 기준으로 바뀝니다.", 버튼은 처음 올릴 때와 같은 "<블로그>에 <방식>", 새 글 안내 없음 |
| 그 밖 (초안 검토) | "초안이 준비됐습니다…" |

`postingTo`는 올리기 요청을 받을 때(`markBusy(..., platform)`)와 작업 시작 때(`doPost`·`doWordPressPost`) 기록되며, 실패해도 지우지 않는다.

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `Job.postingTo` | `blog-writer:shared/types.ts:344-345` |
| 서버 | 요청 때 기록, 작업 시작 때 다시 기록 | `blog-writer:server/routes/util.ts:16-22`, `blog-writer:server/pipeline.ts:400-404`, `:372-376` |
| 화면(네이버·티스토리) | `again = registered && (!job.postingTo \|\| job.postingTo === platform)` | `blog-writer:src/job/NextStep.tsx:157-159`, `:160-178`, `:190-191` |
| 화면(워드프레스) | **기준이 다름**: `postingTo`가 아니라 워드프레스 기록(`job.wordpress`)이 있으면 "등록됨". 기록이 없을 때만 "다른 블로그에 올린 글입니다. 워드프레스에도 올릴 수 있습니다…" | `blog-writer:src/job/NextStep.tsx:384-401` |

## 예외 / 경계값
- 워드프레스에 올린 뒤 네이버에 다시 올려 상태가 네이버 기준 `posted`가 된 글을 워드프레스로 고르면, 워드프레스 화면은 "워드프레스에 임시저장했습니다."라고 보인다 (워드프레스 기록이 남아 있으므로). 네이버·티스토리 쪽 기준과 다르다 ([[publishing/open-questions]] #15).
- 워드프레스는 다시 등록해도 같은 글을 갱신하므로 "기록이 있으면 등록됨"이 사실과 맞는 면이 있다 → [[publishing/business-rules/BR-PUB-016 워드프레스 재등록은 같은 글 갱신]].

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]]

## 확인 필요
- [[publishing/open-questions]] #15

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록. 예전에는 네이버·티스토리 화면이 상태만 보고 "임시저장했습니다"를 보여 다른 블로그에 올린 글도 이 블로그에 올린 것처럼 보였다 | 커밋 65bfa3e, `blog-writer:src/job/NextStep.tsx:157-159` |
