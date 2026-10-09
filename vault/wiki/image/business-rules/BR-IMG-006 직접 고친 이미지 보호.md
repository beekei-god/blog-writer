---
type: business-rule
domain: image
id: BR-IMG-006
name: 직접 고친 이미지 보호
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:174-175
  - blog-writer:src/job/PostEditor.tsx:94-110
  - blog-writer:server/pipeline.ts:313-314
  - blog-writer:server/pipeline.ts:336
entities: [ImageSpec]
updated: 2026-10-09
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

## 이미지 추가와의 관계
- 새로 추가한 이미지 자리(`prompt`·`alt`만 있음)는 `userEdited`가 아니다. 그래서 "이미지 생성" 때 주변 본문을 보고 설명·문구를 다시 정한다. 사용자가 설명·문구를 고쳐야 보호된다 → [[image/business-rules/BR-IMG-015 본문 이미지 자리 추가와 이미지 삭제]].

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 화면 | 표시·설정·해제 | `blog-writer:src/job/PostEditor.tsx:94`, `:99`, `:101-110` |
| 서버 | 제외 | `blog-writer:server/pipeline.ts:314`, `:286` |

## 영향받는 플로우
[[image/flows/이미지 다시 만들기 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-09 | 이미지 자리 추가와의 관계 기록 (동작 변화 없음) | 커밋 b7ced30 |
