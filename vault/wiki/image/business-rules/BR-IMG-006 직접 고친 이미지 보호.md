---
type: business-rule
domain: image
id: BR-IMG-006
name: 직접 고친 이미지 보호
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:156-157
  - blog-writer:src/job/PostEditor.tsx:93-109
  - blog-writer:server/pipeline.ts:204-205
  - blog-writer:server/pipeline.ts:230
entities: [ImageSpec]
updated: 2026-10-07
---
# BR-IMG-006 직접 고친 이미지 보호

## 규칙
사용자가 이미지 설명(prompt)이나 이미지 안 문구(headline)를 직접 고치면, 다시 만들 때 본문을 보고 자동으로 바꾸지 않고 사용자가 쓴 그대로 쓴다. 사용자가 "본문을 보고 자동으로 다시 정하게 하기"를 누르면 다시 자동 기획 대상이 된다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 편집에서 headline 또는 prompt 변경 | `userEdited: true` |
| 대체 텍스트(alt)만 변경 | `userEdited` 그대로 |
| 기획 대상 수집 | `userEdited` 이미지는 제외 |
| 기획 결과 반영 시 | 그 사이 `userEdited`가 된 이미지는 건너뜀 |
| "자동으로 다시 정하게 하기" | `userEdited` 해제 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 화면 | 표시·설정·해제 | `blog-writer:src/job/PostEditor.tsx:93`, `:98`, `:100-109` |
| 서버 | 제외 | `blog-writer:server/pipeline.ts:205`, `:230` |

## 영향받는 플로우
[[image/flows/이미지 다시 만들기 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
