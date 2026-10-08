---
type: business-rule
domain: publishing
id: BR-PUB-011
name: 입력 결과 검증
status: active
confidence: high
consistency: single-source
source:
  - blog-writer:server/browser/userChrome.ts:222-339
  - blog-writer:server/browser/userChrome.ts:461-467
  - blog-writer:server/browser/blogPost.ts:161
  - blog-writer:server/pipeline.ts:379-380
  - blog-writer:server/pipeline.ts:393-394
  - blog-writer:server/pipeline.ts:342-344
updated: 2026-10-07
---
# BR-PUB-011 입력 결과 검증

## 규칙
블로그에 넣은 결과가 초안과 같은 모양인지 확인하고, 다른 점은 실패로 처리하지 않고 "확인 필요" 목록으로 사용자에게 알린다. 임시저장은 그대로 한다.

## 조건과 결과 (평소 크롬·네이버)
| 검사 | 문제 문구 |
|---|---|
| 블록 순서·종류(빈 줄 제외, 인용↔문단은 같은 것으로) | "글 구성이 초안과 다릅니다 (n번째: 초안은 X, 에디터는 Y)." (첫 차이만) |
| 8자 이상 문단·인용이 에디터에 그대로 있는지 | "문단 N개가 초안과 다르게 합쳐지거나 잘렸습니다" |
| 소제목 서식·표·이미지 개수 | "소제목 서식이 N곳 적용되지 않았습니다." 등 |
| 표 머리글 배경색 | "표 N개의 머리글 색이 적용되지 않았습니다." |
| 목록 서식 | "목록 서식이 N개 항목에 적용되지 않았습니다." |
| 굵은 글씨 글자수 85% 미만 | "굵은 글씨가 일부 적용되지 않았습니다." |
| 링크 수 (`.se-link[data-href]`) | "링크 N개가 연결되지 않았습니다." |
| 본문과 태그 사이 빈 줄 3개 | "본문과 태그 사이 빈 줄이 N개입니다 (3개여야 함)." |
| 소제목 위 빈 줄 | "소제목 위의 빈 줄이 N곳 없습니다." |
| 이미지 업로드 60초 초과, 소제목 서식 실패 | 각각 문제로 추가 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 평소 크롬 | `expectedAtoms`, `readEditor`, `verifyEditor` | `blog-writer:server/browser/userChrome.ts:227-339` |
| Claude in Chrome | 프롬프트: 끝에 스크린샷으로 제목·본문·이미지 개수 확인, 안 된 부분은 `problems` | `blog-writer:server/browser/blogPost.ts:161`, `:168` |
| 자동 조작 | 검증 없음 (표 붙여넣기 실패 시 목록으로 대체, alt 실패 로그) | `blog-writer:server/browser/adapters.ts:101-112` |
| 워드프레스 API | 에디터 검증 없음. 요청한 모드와 사이트가 돌려준 글 상태가 다르면 "확인 필요: 예약발행/자동발행을 요청했지만 사이트에서는 "<상태>" 상태입니다. 사용자 권한을 확인하세요." | `blog-writer:server/pipeline.ts:342-344` |
| 파이프라인 | 문제마다 로그 "확인 필요: …" | `blog-writer:server/pipeline.ts:380`, `:394` |

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 워드프레스 API 경로의 상태 불일치 경고 추가 | `blog-writer:server/pipeline.ts:342-344` |
