---
type: business-rule
domain: publishing
id: BR-PUB-011
name: 입력 결과 검증
status: active
confidence: high
consistency: single-source
source:
  - blog-writer:server/browser/userChrome.ts:236-354
  - blog-writer:server/browser/userChrome.ts:511-516
  - blog-writer:server/browser/userChrome.ts:531-531
  - blog-writer:server/browser/blogPost.ts:160
  - blog-writer:server/browser/publish.ts:362
  - blog-writer:server/pipeline.ts:449-451
  - blog-writer:server/pipeline.ts:465-466
  - blog-writer:server/pipeline.ts:415-417
updated: 2026-10-09
---
# BR-PUB-011 입력 결과 검증

## 규칙
블로그에 넣은 결과가 초안과 같은 모양인지 확인하고, 다른 점은 실패로 처리하지 않고 "확인 필요" 목록으로 사용자에게 알린다. 임시저장은 그대로 한다. 예약발행·자동발행을 골랐을 때도 다른 점이 있다고 발행을 멈추지는 않는다. 발행은 진행하고 "확인 필요"로 로그에 남기며, 사용자가 블로그에서 고친다 (2026-10-09 사용자 결정, 9a9c6df) → [[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치]].

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
| 평소 크롬 | `expectedAtoms`, `readEditor`, `verifyEditor` | `blog-writer:server/browser/userChrome.ts:242-354` |
| 평소 크롬(발행) | 문제가 있으면 발행 창을 열지 않고 `PublishStepError` | `blog-writer:server/browser/userChrome.ts:531-531` |
| Claude in Chrome | 프롬프트: 끝에 스크린샷으로 제목·본문·이미지 개수 확인, 안 된 부분은 `problems` | `blog-writer:server/browser/blogPost.ts:160`, `:168` |
| Claude in Chrome(발행) | 프롬프트: problems가 있어도 발행은 진행하고 problems에 적게 함 | `blog-writer:server/browser/publish.ts:362` |
| 자동 조작 | 검증 없음 (표 붙여넣기 실패 시 목록으로 대체, alt 실패 로그) | `blog-writer:server/browser/adapters.ts:122-134` |
| 워드프레스 API | 에디터 검증 없음. 요청한 모드와 사이트가 돌려준 글 상태가 다르면 "확인 필요: 예약발행/자동발행을 요청했지만 사이트에서는 "<상태>" 상태입니다. 사용자 권한을 확인하세요." | `blog-writer:server/pipeline.ts:415-417` |
| 파이프라인 | 문제마다 로그 "확인 필요: …" | `blog-writer:server/pipeline.ts:451`, `:403` |

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 워드프레스 API 경로의 상태 불일치 경고 추가 | `blog-writer:server/pipeline.ts:405-407` |
| 2026-10-09 | 검증 결과가 발행 여부에도 쓰임: 문제가 있으면 예약발행·자동발행을 하지 않음(평소 크롬은 코드, Claude in Chrome은 프롬프트, 자동 조작은 검증 없음). 근거 줄 번호 갱신 | 커밋 65bfa3e, `blog-writer:server/browser/userChrome.ts:531-531` |
