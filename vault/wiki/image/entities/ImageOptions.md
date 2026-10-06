---
type: entity
domain: image
name: ImageOptions
aliases: [이미지 옵션, 이미지 설정]
status: active
confidence: high
source:
  - blog-writer:shared/types.ts:3-51
  - blog-writer:server/schema.ts:43-59
  - blog-writer:server/store.ts:20
  - blog-writer:src/NewJob.tsx:42-76
updated: 2026-10-07
---
# ImageOptions (이미지 옵션)

## 의미
작업 하나에서 이미지를 몇 장, 어떤 AI·화풍으로 만들지. 새 작업을 만들 때 정하고 `Job.imageOptions`에 저장되며, 마지막으로 쓴 값은 설정(`Settings.images`)에 기억되어 다음 새 글 폼의 처음 값이 된다.

## 속성
| 속성 | 타입 | 의미 | 화면 표시 |
|---|---|---|---|
| `thumbnail` | boolean | 썸네일을 만들지 | "썸네일(대표 이미지) 만들기/안 만들기" |
| `bodyImages` | 0~6 | 본문 이미지 개수 | "본문 이미지 N장" |
| `provider` | claude/gemini/chatgpt | 본문 이미지 AI | "본문 이미지 만드는 곳" |
| `style` | flat/ghibli/realistic/anime | 본문 이미지 화풍 | "본문 이미지 스타일" |
| `thumbnailProvider` | 선택 | 썸네일 AI (없으면 본문과 같음) | "썸네일 만드는 곳" |
| `thumbnailStyle` | 선택 | 썸네일 화풍 (없거나 그 AI가 못 하면 본문 스타일 또는 그 AI의 첫 스타일) | "썸네일 스타일" |

화풍 라벨: flat=플랫 일러스트, ghibli=지브리풍, realistic=실사, anime=애니메이션 (`blog-writer:src/labels.ts:17-22`).

## 상태와 전이
- 새 글 폼: 설정의 마지막 값을 읽되 **썸네일은 항상 켬** (썸네일 끔은 기억하지 않는 것이 의도, 2026-10-05 확정). 썸네일 AI·스타일이 본문과 같으면 "따라가기" 모드로, 본문을 바꾸면 썸네일도 같이 바뀐다. 썸네일을 따로 바꾸면 따라가기가 풀린다 (`blog-writer:src/NewJob.tsx:51-76`).
- 작업 후 "이미지 모두 다시 만들기"에서 AI·스타일을 바꾸면 `Job.imageOptions`가 바뀐다. **한 장만 다시 만들기**에서 고른 AI는 저장하지 않는다 → [[image/business-rules/BR-IMG-009 다시 만들기 범위]].
- "썸네일 만들기"(썸네일이 없는 글)·한 장 썸네일 다시 만들기는 `thumbnail: true`로 켠다.

## 저장 위치
`Job.imageOptions`, `Settings.images` → [[_system/data-storage]]

## 적용되는 규칙
[[image/business-rules/BR-IMG-001 본문 이미지 개수]], [[image/business-rules/BR-IMG-002 AI별 허용 스타일]], [[image/business-rules/BR-IMG-003 썸네일 AI와 스타일 결정]]
