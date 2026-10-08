---
type: business-rule
domain: image
id: BR-IMG-003
name: 썸네일 AI와 스타일 결정
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:35-65
  - blog-writer:server/pipeline.ts:202-206
  - blog-writer:server/pipeline.ts:272-279
  - blog-writer:src/NewJob.tsx:62-86
  - blog-writer:src/NewJob.tsx:154-215
  - blog-writer:src/NewJob.tsx:229-274
entities: [ImageOptions]
updated: 2026-10-09
---
# BR-IMG-003 썸네일 AI와 스타일 결정

## 규칙
썸네일과 본문 이미지는 서로 다른 AI·화풍·만드는 방법으로 만들 수 있고, **새 글 쓰기 화면에서 두 설정은 서로 영향을 주지 않는다**(한쪽을 바꿔도 다른 쪽은 그대로). 실행할 때 썸네일 AI는 `thumbnailProvider`, 없으면 본문 AI. 썸네일 화풍은 `thumbnailStyle`, 없으면 본문 화풍이며, 그 화풍을 썸네일 AI가 못 그리면 그 AI의 첫 화풍을 쓴다. 만드는 방법은 `thumbnailMethod`, 없으면 본문의 `method`, 둘 다 없으면 `api` → [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]].

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `aiFor(o, "thumbnail")` | provider = thumbnailProvider ?? provider, style = (thumbnailStyle ?? style)이 가능하면 그것, 아니면 첫 스타일 |
| `aiFor(o, "body")` | provider, style (불가하면 첫 스타일) |
| `methodFor(o, "thumbnail")` / `methodFor(o, "body")` | thumbnailMethod ?? method ?? "api" / method ?? "api" |
| 썸네일과 본문의 AI·화풍이 다름 | 이미지 기획을 그룹별로 따로 호출 (설명 언어·화풍이 다르므로) |
| 한 장만 다시 만들기 | 고른 AI·화풍·방법을 이번 실행에만 덮어씀 (썸네일이면 thumbnail*, 본문이면 provider/style/method) |
| 새 글 쓰기: 저장된 설정을 읽음 | 썸네일 AI·화풍·방법을 빈칸 없이 채워 둔다(없으면 본문 값). 썸네일은 항상 켬 |
| 새 글 쓰기: 저장값이 오기 전에 사용자가 이미지 옵션을 바꿈 | 늦게 온 저장값으로 덮어쓰지 않음 (`touched`) |
| 새 글 쓰기: 본문 이미지 AI·화풍·방법을 바꿈 | 썸네일 설정은 그대로 (예전의 "따라가기" 없음) |
| 새 글 쓰기: 썸네일 켬 + 본문 1장 이상 + 둘이 다름 | 안내 "썸네일과 본문 이미지를 서로 다른 AI·스타일·방법으로 만듭니다." + "본문 이미지와 같게 하기"(AI·화풍·방법을 함께 맞춤). Claude끼리는 방법을 비교하지 않음 |

## 화면 순서
새 글 쓰기 "이미지" 카드는 썸네일 묶음(켜기/끄기 → 설정)과 본문 이미지 묶음(장수 → 설정)으로 나뉜다. 각 묶음의 설정은 **스타일 → 만드는 곳(AI) → 만드는 방법(API|크롬, Gemini·ChatGPT만)** 순서다. 썸네일을 끄면 썸네일 설정이, 본문 이미지가 0장이면 본문 설정이 숨겨진다.

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `aiFor`·`methodFor` (서버·화면 같이 씀). 화풍 맞추기는 `fitStyle` | `blog-writer:shared/types.ts:52-65` |
| 서버 | 실행 옵션, 기획 그룹 | `blog-writer:server/pipeline.ts:202-206`, `:272-279` |
| 화면 | 저장값 읽기·`touched`, 썸네일/본문 따로 바꾸기, 같은지 비교 | `blog-writer:src/NewJob.tsx:55-86` |
| 화면 | 썸네일·본문 묶음, "본문 이미지와 같게 하기", `AiRows`(스타일→AI→방법) | `blog-writer:src/NewJob.tsx:154-215`, `:229-274` |
| 화면 | 초안 화면의 이미지 도구 기본값 | `blog-writer:src/job/JobDetail.tsx:126-132` |
| 테스트 | 썸네일 설정이 없을 때 본문 설정을 따름, 방법 기본값 | `blog-writer:tests/shared.test.ts:68-80` |

## 예외 / 경계값
- 저장된 예전 작업에 썸네일 값이 없으면 실행 시 `aiFor`·`methodFor`가 본문 값을 쓴다. 새 글 쓰기 화면만 값을 채워서 보낸다.
- 서버 검증(`ImageOptionsSchema`)은 썸네일 화풍이 썸네일 AI에서 가능한지만 본다 → [[image/business-rules/BR-IMG-002 AI별 허용 스타일]].

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 리팩터링: 스타일 맞추기를 공용 `fitStyle` 하나로 합침 (예전에는 `aiFor`·새 글 폼·초안 화면에 같은 식이 따로 있었음). 동작 변화 없음 | `blog-writer:shared/types.ts:52-61` |
| 2026-10-09 | 새 글 쓰기: 썸네일이 본문 설정을 "따라가는" 모드 삭제 → 썸네일·본문 설정 완전히 독립. 설정 순서 AI→스타일 → 스타일→AI→방법. 썸네일 만드는 방법(`thumbnailMethod`, 없으면 본문 `method`) 추가. "본문 이미지와 같게 하기"가 방법까지 맞춤. 저장값이 늦게 와도 사용자가 바꾼 값 유지 | 커밋 7a8a0ea, 65bfa3e, `blog-writer:src/NewJob.tsx:55-86` |
