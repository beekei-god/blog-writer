---
type: entity
domain: image
name: ImageOptions
aliases: [이미지 옵션, 이미지 설정]
status: active
confidence: high
source:
  - blog-writer:shared/types.ts:30-31
  - blog-writer:shared/types.ts:41-71
  - blog-writer:server/schema.ts:50-68
  - blog-writer:server/store.ts:20
  - blog-writer:server/routes/jobs.ts:44-71
  - blog-writer:src/NewJob.tsx:44-86
  - blog-writer:server/pipeline.ts:29-30
  - blog-writer:server/pipeline.ts:249-256
updated: 2026-10-09
---
# ImageOptions (이미지 옵션)

## 의미
작업 하나에서 이미지를 몇 장, 어떤 AI·화풍·방법으로 만들지. 새 작업을 만들 때 정하고 `Job.imageOptions`에 저장되며, 마지막으로 쓴 값은 설정(`Settings.images`)에 기억되어 다음 새 글 폼의 처음 값이 된다 (`blog-writer:server/routes/jobs.ts:66-68`).

## 속성
| 속성 | 타입 | 의미 | 화면 표시 (새 글 쓰기) |
|---|---|---|---|
| `thumbnail` | boolean | 썸네일을 만들지 | "썸네일(대표 이미지) 만들기/안 만들기" |
| `bodyImages` | 0~6 | 본문 이미지 개수 | "본문 이미지 N장" |
| `provider` | claude/gemini/chatgpt | 본문 이미지 AI | "본문 이미지 만드는 곳" |
| `style` | flat/ghibli/realistic/anime | 본문 이미지 화풍 (서버 기본 flat) | "본문 이미지 스타일" |
| `method` | api/chrome, 선택 | 본문 이미지(Gemini·ChatGPT) 만드는 방법. 없으면 `api` | "본문 이미지 만드는 방법" [○○ API \| 크롬] |
| `thumbnailProvider` | 선택 | 썸네일 AI (없으면 본문과 같음) | "썸네일 만드는 곳" |
| `thumbnailStyle` | 선택 | 썸네일 화풍 (없거나 그 AI가 못 하면 본문 스타일 또는 그 AI의 첫 스타일) | "썸네일 스타일" |
| `thumbnailMethod` | api/chrome, 선택 | 썸네일(Gemini·ChatGPT) 만드는 방법. 없으면 `method`, 그것도 없으면 `api` | "썸네일 만드는 방법" |

화풍 라벨: flat=플랫 일러스트, ghibli=지브리풍, realistic=실사, anime=애니메이션 (`blog-writer:src/labels.ts:17-22`).

실제로 쓰는 값은 공용 함수로 정한다: `aiFor(o, kind)`(AI·화풍), `methodFor(o, kind)`(방법) → [[image/business-rules/BR-IMG-003 썸네일 AI와 스타일 결정]], [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]].

## 상태와 전이
- 새 글 폼: 설정의 마지막 값을 읽되 **썸네일은 항상 켬** (썸네일 끔은 기억하지 않는 것이 의도, 2026-10-05 확정). 읽을 때 썸네일 AI·화풍·방법과 본문 방법을 빈칸 없이 채운다. 저장값이 도착하기 전에 사용자가 옵션을 바꿨으면 덮어쓰지 않는다 (`blog-writer:src/NewJob.tsx:55-74`).
- 새 글 폼에서 썸네일과 본문 설정은 **서로 영향을 주지 않는다**. 둘이 다르면 "본문 이미지와 같게 하기"로 썸네일 AI·화풍·방법을 본문에 맞출 수 있다 (`blog-writer:src/NewJob.tsx:76-86`, `:208-215`).
- 작업 후 전체 다시 만들기(`regenerate-images`)에서 AI·스타일·썸네일 방법(`thumbnailMethod`)을 주면 `Job.imageOptions`가 바뀐다(본문 `method`는 받지 않음). **한 장만 다시 만들기**에서 고른 AI·화풍·방법은 저장하지 않는다 → [[image/business-rules/BR-IMG-009 다시 만들기 범위]].
- "썸네일 만들기"(썸네일이 없는 글)·한 장 썸네일 다시 만들기는 `thumbnail: true`로 켠다. 썸네일 만들기는 고른 방법을 `thumbnailMethod`에 저장한다.
- 본문 이미지 자리를 직접 추가·삭제해도 `bodyImages`는 **바뀌지 않는다**(글 안의 이미지 블록 수와 어긋날 수 있음) → [[image/open-questions]] #9, [[image/business-rules/BR-IMG-015 본문 이미지 자리 추가와 이미지 삭제]]
- 서버는 옵션이 없는 예전 작업을 `{thumbnail: false, bodyImages: 0, provider: "claude", style: "flat"}`에 덮어 읽는다 (`blog-writer:server/pipeline.ts:29-30`).

## 저장 위치
`Job.imageOptions`, `Settings.images` → [[_system/data-storage]]

## 적용되는 규칙
[[image/business-rules/BR-IMG-001 본문 이미지 개수]], [[image/business-rules/BR-IMG-002 AI별 허용 스타일]], [[image/business-rules/BR-IMG-003 썸네일 AI와 스타일 결정]], [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]], [[image/business-rules/BR-IMG-015 본문 이미지 자리 추가와 이미지 삭제]]
