---
type: business-rule
domain: publishing
id: BR-PUB-001
name: 블로그별 글 상태
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:setBlogStatus
  - blog-writer:shared/blogStatus.ts:1-43
  - blog-writer:server/store.ts:migrateJob
entities: [블로그별 상태]
updated: 2026-11-02
---
# BR-PUB-001 블로그별 글 상태

## 규칙
글을 올린 상태(임시저장·발행예약·발행완료)는 **블로그마다 따로** 기록한다. 한 블로그에 올려도 다른 블로그의 상태는 바뀌지 않는다. 올리기가 끝나면 작업 상태는 항상 초안검토(`draft_ready`)로 돌아오고, 같은 글을 다른 블로그에 또 올릴 수 있다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 임시저장 완료 | 그 블로그 `posted` |
| 예약발행 완료 | `scheduled` + 예약 시각 |
| 즉시 발행 완료 | `published` |
| 크롬 발행 창에서 멈춤(`PublishStepError`) | `posted`로 두고 이유를 `error`에 남김 |
| 올리기 실패/중지 | 글은 `draft_ready`(없으면 `failed`), 블로그 상태 변경 없음 |
| 워드프레스 | 사이트가 돌려준 상태로 정함: publish→발행완료, future→발행예약, 그 밖→임시저장. 요청과 다르면 "확인 필요" 로그 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `setBlogStatus` | 그 블로그 상태만 바꿈 | `blog-writer:server/pipeline.ts:25-30` |
| 서버 | `doPost`, `doWordPressPost` | 상태 결정 | `blog-writer:server/pipeline.ts` |
| 서버 | `migrateJob` | 예전 단일 상태 변환 | `blog-writer:server/store.ts` |
| 공용 | `blogPositionOf`, `furthestBlogStatus` | 위치·최전선 | `blog-writer:shared/blogStatus.ts` |
| 테스트 | 워드프레스 상태만 바뀜, 예약 시각 기록 | | `blog-writer:tests/wordpress.test.ts:127-153`, `tests/store.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 상태를 늘리면 `BlogStatus`, `RANK`, `POSITIONS`(필터), 화면 배지, `MANUAL_STATUSES`, 마이그레이션을 함께 고친다.

## 영향받는 플로우
[[publishing/flows/블로그에 올리기]], [[publishing/flows/워드프레스 등록]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
