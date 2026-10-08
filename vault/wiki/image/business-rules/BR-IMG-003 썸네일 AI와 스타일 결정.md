---
type: business-rule
domain: image
id: BR-IMG-003
name: 썸네일 AI와 스타일 결정
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:32-54
  - blog-writer:server/pipeline.ts:184-188
  - blog-writer:server/pipeline.ts:254-261
entities: [ImageOptions]
updated: 2026-10-07
---
# BR-IMG-003 썸네일 AI와 스타일 결정

## 규칙
썸네일과 본문 이미지는 서로 다른 AI·화풍으로 만들 수 있다. 썸네일 AI는 `thumbnailProvider`, 없으면 본문 AI. 썸네일 화풍은 `thumbnailStyle`, 없으면 본문 화풍이며, 그 화풍을 썸네일 AI가 못 그리면 그 AI의 첫 화풍을 쓴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `aiFor(o, "thumbnail")` | provider = thumbnailProvider ?? provider, style = (thumbnailStyle ?? style)이 가능하면 그것, 아니면 첫 스타일 |
| `aiFor(o, "body")` | provider, style (불가하면 첫 스타일) |
| 썸네일과 본문의 AI·화풍이 다름 | 이미지 기획을 그룹별로 따로 호출 (설명 언어·화풍이 다르므로) |
| 한 장만 다시 만들기 | 고른 AI·화풍을 이번 실행에만 덮어씀 (썸네일이면 thumbnail*, 본문이면 provider/style) |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `aiFor` (서버·화면 같이 씀). 화풍 맞추기는 `fitStyle` | `blog-writer:shared/types.ts:45-54` |
| 서버 | 실행 옵션, 기획 그룹 | `blog-writer:server/pipeline.ts:184-188`, `:254-261` |
| 화면 | 기본 선택값, 따라가기 | `blog-writer:src/job/JobDetail.tsx:126-132`, `blog-writer:src/NewJob.tsx:51-76` |
| 테스트 | 썸네일 설정이 없을 때 본문 설정을 따름 | `blog-writer:tests/shared.test.ts:69-74` |

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 리팩터링: 스타일 맞추기를 공용 `fitStyle` 하나로 합침 (예전에는 `aiFor`·새 글 폼·초안 화면에 같은 식이 따로 있었음). 동작 변화 없음 | `blog-writer:shared/types.ts:45-54` |
