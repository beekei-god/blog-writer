---
type: business-rule
domain: publishing
id: BR-PUB-016
name: 워드프레스 재등록은 같은 글 갱신
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:237-246
  - blog-writer:server/wordpress.ts:149-171
  - blog-writer:server/wordpress.ts:262-327
  - blog-writer:server/pipeline.ts:334-339
  - blog-writer:src/job/NextStep.tsx:205-263
  - blog-writer:tests/wordpress.test.ts:114-143
entities: [Job]
updated: 2026-10-07
---
# BR-PUB-016 워드프레스 재등록은 같은 글 갱신

## 규칙
워드프레스에 한 번 올린 글을 다시 등록하면 **새 글을 만들지 않고 같은 글을 갱신**한다. 이미 올린 이미지도 사이트에 남아 있으면 다시 올리지 않고 재사용한다. 그래서 고친 초안을 여러 번 올려도 사이트에 글·미디어가 쌓이지 않는다. (크롬 블로그의 "다시 임시저장"은 새 글이 생기는 것과 다르다 → [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]].)

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `job.wordpress.postId` 없음 | `POST /wp/v2/posts`로 새 글 |
| `postId` 있음 | `POST /wp/v2/posts/<id>`로 갱신, 로그 "이미 올린 글을 갱신합니다" |
| 갱신이 404 (사이트에서 지워짐) | 새 글로 올림, 로그 "사이트에서 글을 찾지 못해 새 글로 올립니다" |
| 갱신이 404 외 오류 | 실패 |
| 이미지 파일 이름이 `mediaIds`에 있음 | `GET /wp/v2/media/<id>`로 아직 있는지 확인 후 재사용 |
| 기록된 미디어가 사라졌거나 확인 실패 | 다시 업로드 |
| 성공 후 기록 | `job.wordpress = {postId, link, mode, scheduledAt(예약일 때), mediaIds(이번에 쓴 이미지만)}` |
| 화면 | 등록된 글이면 버튼 "다시 등록 (<방식>)", 안내 "다시 등록하면 같은 글을 갱신합니다." + "글 열기" 링크 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `WordPressRecord`, `Job.wordpress` | `blog-writer:shared/types.ts:237-246`, `:276` |
| 서버 | `ensureMedia` (재사용·업로드·alt) | `blog-writer:server/wordpress.ts:149-171` |
| 서버 | `publishToWordPress` 갱신/새 글 | `blog-writer:server/wordpress.ts:311-326` |
| 서버 | 결과 기록 | `blog-writer:server/pipeline.ts:334-339` |
| 화면 | `WordPressNext`의 `registered` | `blog-writer:src/job/NextStep.tsx:205-263` |
| 테스트 | 갱신·미디어 재사용, 지워진 글이면 새 글 | `blog-writer:tests/wordpress.test.ts:114-143` |

## 예외 / 경계값
- 초안 완료로 되돌리거나 다른 블로그에 올려도 `job.wordpress` 기록은 남는다. 그래서 다시 워드프레스에 올리면 같은 글을 갱신한다.
- 갱신하면 그 글의 상태도 이번에 고른 방식으로 바뀐다 (예: 공개된 글을 "임시저장"으로 다시 등록하면 사이트에서 초안으로 돌아간다).
- 이번에 쓰지 않은 예전 이미지의 미디어는 기록에서만 빠지고 사이트에서 지우지 않는다.

- 예약했던 글을 자동발행으로 다시 올리면 같은 글을 갱신하면서 공개 시각을 지금으로 맞춘다. 이미 자동발행한 글을 갱신할 때는 원래 공개 시각을 그대로 둔다 → [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]].

## 영향받는 플로우
[[publishing/flows/워드프레스 API 등록 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-07 | 최초 기록 | `blog-writer:server/wordpress.ts:311-326` |
| 2026-10-07 | 갱신 때 자동발행이면 공개 시각 처리 추가 | `blog-writer:server/wordpress.ts:306-310` |
