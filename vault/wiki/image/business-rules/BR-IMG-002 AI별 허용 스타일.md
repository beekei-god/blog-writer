---
type: business-rule
domain: image
id: BR-IMG-002
name: AI별 허용 스타일
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:8-13
  - blog-writer:server/schema.ts:58-65
  - blog-writer:server/routes/images.ts:89-91
  - blog-writer:src/NewJob.tsx:229-272
  - blog-writer:shared/types.ts:52-54
  - blog-writer:tests/shared.test.ts:64-67
  - blog-writer:src/job/images.tsx:59-111
entities: [ImageOptions]
updated: 2026-10-09
---
# BR-IMG-002 AI별 허용 스타일

## 규칙
Claude(SVG)는 플랫 일러스트만 그릴 수 있다. 지브리풍·실사·애니메이션은 이미지 모델(Gemini, ChatGPT)로만 만든다. Gemini·ChatGPT는 네 스타일 모두 가능하다.

| AI | 가능한 스타일 (첫 값이 기본) |
|---|---|
| claude | flat |
| gemini | ghibli, realistic, anime, flat |
| chatgpt | ghibli, realistic, anime, flat |

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 작업 생성·설정 저장에서 provider=claude, style≠flat | 400 "Claude(SVG)는 플랫 일러스트 스타일만 지원합니다…" |
| 썸네일 스타일이 썸네일 AI에서 불가 | 400 "썸네일을 만드는 AI가 지원하지 않는 스타일입니다…" |
| 한 장 다시 만들기에서 불가 조합 | 400 "Claude(SVG)는 플랫 일러스트만 그릴 수 있습니다…" |
| 화면에서 AI를 바꿈 | 현재 스타일이 불가면 그 AI의 첫 스타일로 자동 변경, 불가 스타일 버튼 비활성 |
| 실행 시 썸네일 스타일이 불가 | `aiFor`가 그 AI의 첫 스타일로 바꿔 씀 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `STYLES_BY_PROVIDER` | `blog-writer:shared/types.ts:9-13` |
| 서버 검증 | `ImageOptionsSchema.refine` 2개, 한 장 다시 만들기 검사 | `blog-writer:server/schema.ts:58-65`, `blog-writer:server/routes/images.ts:89-91` |
| 공용 | `fitStyle`: AI를 바꿀 때 못 그리는 화풍이면 그 AI의 첫 화풍으로 (새 글 폼·초안 화면·`aiFor`가 같이 씀) | `blog-writer:shared/types.ts:52-54` |
| 화면 | AI를 바꾸면 `fitStyle` 적용(새 글 쓰기 `AiRows`, 이미지 다시 생성 창, "썸네일이 없습니다"의 `AiPicker`), 공용 `StylePicker`가 불가 스타일 버튼을 비활성(툴팁 "Gemini 또는 ChatGPT에서 고를 수 있습니다") | `blog-writer:src/NewJob.tsx:175`, `:204`, `blog-writer:src/job/images.tsx:59-80`, `:108`, `:185` |
| 테스트 | `fitStyle`, 한 장 다시 만들기 불가 조합 400 | `blog-writer:tests/shared.test.ts:64-67`, `blog-writer:tests/api.test.ts:129-133` |
| 프롬프트 | 화풍 지시문(작성 `STYLE_GUIDE`, 웹 AI `STYLE_PROMPT`) | `blog-writer:server/writer.ts:35-43`, `blog-writer:server/images/styles.ts:7-15` |

## 예외 / 경계값
- 지브리풍은 서비스 정책으로 거절될 수 있다고 화면이 경고한다 (`blog-writer:src/NewJob.tsx:270`).
- `regenerate-images`의 style·provider zod enum은 값만 확인하고 조합은 `ImageOptionsSchema`로 다시 검사한다 (`blog-writer:server/routes/images.ts:21-32`).

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]], [[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 리팩터링: 스타일 맞추기를 공용 `fitStyle` 하나로 합침 (예전에는 `aiFor`·새 글 폼·초안 화면에 같은 식이 따로 있었음). 동작 변화 없음 | `blog-writer:shared/types.ts:52-61` |
