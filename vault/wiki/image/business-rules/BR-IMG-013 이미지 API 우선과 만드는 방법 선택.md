---
type: business-rule
domain: image
id: BR-IMG-013
name: 이미지 API 우선과 만드는 방법 선택
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:30-31
  - blog-writer:shared/types.ts:52-55
  - blog-writer:shared/types.ts:69-71
  - blog-writer:server/schema.ts:58-59
  - blog-writer:server/images/index.ts:110-123
  - blog-writer:server/images/api.ts:25-40
  - blog-writer:server/images/api.ts:71-131
  - blog-writer:server/secrets.ts:97-113
  - blog-writer:server/routes/settings.ts:121-155
  - blog-writer:server/routes/images.ts:83-107
  - blog-writer:server/pipeline.ts:222-256
  - blog-writer:server/pipeline.ts:351-363
  - blog-writer:src/NewJob.tsx:62-86
  - blog-writer:src/NewJob.tsx:229-274
  - blog-writer:src/job/images.tsx:49-57
  - blog-writer:src/job/images.tsx:113-147
  - blog-writer:src/job/images.tsx:174-217
  - blog-writer:tests/imageApi.test.ts
entities: [ImageOptions, ImageSpec]
updated: 2026-10-09
---
# BR-IMG-013 이미지 API 우선과 만드는 방법 선택

## 규칙
Gemini·ChatGPT 이미지는 **만드는 방법**(`api` | `chrome`)을 썸네일·본문 따로 고른다. `api`이고 그 서비스의 **API 키가 연결되어 있으면 API로**, 키가 없거나 `chrome`이면 크롬(Claude in Chrome)에서 만든다. **API가 실패해도 크롬으로 저절로 넘기지 않는다.** 실패를 그 이미지에 기록하고, 사용자가 이미지마다 "이미지 다시 생성" 창에서 방법을 골라 다시 만든다. Claude(SVG)는 이 규칙과 관계없다.

- 새 글 쓰기에서 고른 방법은 글(`Job.imageOptions.method`·`thumbnailMethod`)과 설정(`Settings.images`, 다음 새 글의 처음 값)에 저장된다.
- 첫 생성(초안 작성 직후)·전체 다시 만들기는 **글에 저장된 방법**을 쓴다. "썸네일 만들기"(썸네일이 없는 글)는 그 자리에서 고른 방법을 `regenerate-images`의 `thumbnailMethod`로 보내 `imageOptions.thumbnailMethod`에 **저장**하고 그 방법으로 만든다. 한 장 다시 만들기는 **그 창에서 고른 방법을 이번 실행에만** 쓴다(저장하지 않음).
- 방법 결정: 썸네일은 `thumbnailMethod ?? method`, 본문은 `method`, 둘 다 없으면 `api` (`methodFor`).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 방법 `api`(기본) + 키 있음 | API로 생성. 로그 "Gemini API로 이미지를 만듭니다." (ChatGPT는 "OpenAI API로 …") |
| 방법 `api` + 키 없음 | 크롬에서 생성 |
| 방법 `chrome` | 키가 있어도 크롬에서 생성 |
| 썸네일 `chrome`, 본문 `api` (또는 반대) | 종류마다 따로 적용. 크롬에서 만들 대상이 하나라도 있으면 그 실행 전체가 크롬 큐에서 돈다 |
| API 429 / `insufficient_quota` / `billing` / `RESOURCE_EXHAUSTED` / `quota` | `limit` 실패 "○○ API 한도·잔액 부족: …" |
| API 401·403 / 잘못된 키 문구 | `api_error` 실패 "○○ API 키가 올바르지 않습니다 …" |
| `moderation_blocked`·`content_policy`·`safety`, Gemini가 이미지 대신 글이나 차단 사유(SAFETY·PROHIBITED·BLOCKLIST) | `refused` 실패 |
| 그 밖 API 오류·이미지 없는 응답·연결 실패 | `api_error` 실패 (시간 초과는 `timeout`, 3분) |

## 화면
| 화면 | 방법 고르기 |
|---|---|
| 새 글 쓰기 (썸네일·본문 묶음마다) | 스타일 → 만드는 곳 → **만드는 방법 [○○ API \| 크롬]** (Gemini·ChatGPT일 때만). 아래 안내: API면 "○○ API로 만듭니다. 크롬을 쓰지 않아 다른 작업과 동시에 만들 수 있고, API 사용 요금이 듭니다.", 크롬이면 AI별 기본 안내 |
| 이미지 다시 생성 창 (이미지마다) | "스타일 / 만드는 곳 / 만드는 방법" 한 줄씩, 버튼 **하나** "이미지 다시 만들기"(아직 없는 이미지는 "이미지 만들기") + "취소", 안내 "이 이미지에만 적용됩니다." 방법은 창을 열 때마다 `api`로 시작 |
| "썸네일이 없습니다" | 스타일 → AI 아래에 **방법 [○○ API \| 크롬]** (Gemini·ChatGPT일 때만, 키 없으면 API 비활성·크롬으로 표시 `shownMethod`). 처음 값은 글의 썸네일 방법(`methodFor`). 고른 값은 글에 저장됨 |
| 키가 연결되지 않은 AI | "○○ API" 버튼은 보이지만 누를 수 없고, 감싼 요소의 툴팁 "○○ API 키가 연결되어 있지 않습니다. 설정 → 이미지 API 설정에서 키를 연결하면 쓸 수 있습니다." (상태 확인 전에는 "API 연결 상태를 확인하는 중입니다.") 선택 표시는 **크롬**으로 보이고, 다시 만들기 요청도 `chrome`으로 보낸다 (`shownMethod`) |

## 키 저장
- 설정 화면 "이미지 API 설정"에서 키를 넣으면 저장 전에 모델 목록 조회로 키를 확인한다(이미지 생성 비용 없음). 한도 부족 응답이어도 키 자체는 맞는 것으로 보고 저장한다.
- `data/secrets.json`(권한 0600)에 저장하고 화면에는 앞 6자 힌트만 돌려준다. `.env`의 `GEMINI_API_KEY`·`OPENAI_API_KEY`가 있으면 그 값이 우선이며 화면에서 지워도 남는다.
- 모델: 기본 `gemini-2.5-flash-image`, `gpt-image-2.5-flare`. `.env`의 `GEMINI_IMAGE_MODEL`·`OPENAI_IMAGE_MODEL`로 바꾼다.

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `ImageMethod`, `ImageOptions.method`·`thumbnailMethod`, `methodFor` | `blog-writer:shared/types.ts:30-31`, `:46-49`, `:63-65` |
| 서버 검증 | `ImageOptionsSchema`에 `method`·`thumbnailMethod` (`MethodEnum`), 한 장 다시 만들기 `method`, `regenerate-images`의 `thumbnailMethod`(옵션에 병합 저장) | `blog-writer:server/schema.ts:58-59`, `blog-writer:server/routes/images.ts:28`, `:52-67`, `:83-107` |
| 서버 | 한 장이면 고른 방법으로 이번 실행만 덮어씀, 아니면 저장된 방법 | `blog-writer:server/pipeline.ts:222-256` |
| 서버 | 대상마다 `methodFor`로 API·크롬 선택 | `blog-writer:server/images/index.ts:110-123` |
| 서버 | API 호출·오류 분류, 받은 이미지 저장 `saveImageFile`(크롬 URL 회수도 같이 씀) | `blog-writer:server/images/api.ts:25-120` |
| 서버 | 크롬 큐는 실제로 크롬을 쓸 대상이 있을 때만 | `blog-writer:server/pipeline.ts:351-363` |
| 서버 | 키 저장·확인 | `blog-writer:server/secrets.ts:97-113`, `blog-writer:server/routes/settings.ts:121-155`, `blog-writer:server/images/api.ts:122-131` |
| 화면 | 새 글 쓰기 방법 고르기(썸네일·본문 따로) | `blog-writer:src/NewJob.tsx:62-86`, `:229-274` |
| 화면 | 공용 `MethodPicker`·`shownMethod`·`hasImageApi`·`noImageApiReason` | `blog-writer:src/job/images.tsx:49-57`, `:113-147` |
| 화면 | 이미지 다시 생성 창(버튼 하나) | `blog-writer:src/job/images.tsx:174-217` |
| 화면 | "썸네일이 없습니다"의 `MethodPicker`, `thumbnailMethod` 전송 | `blog-writer:src/job/JobDetail.tsx:308-343` |
| 테스트 | 썸네일을 추가할 때도 방법 선택·저장 | `blog-writer:tests/api.test.ts` ("썸네일이 없는 글에 썸네일을 추가할 때도 만드는 방법…") |
| 화면 | 설정 카드 | `blog-writer:src/ImageApiSettings.tsx` |
| 테스트 | API·크롬 선택, 썸네일 크롬 + 본문 API, 실패 분류, 키 값 비노출, `methodFor` 기본값 | `blog-writer:tests/imageApi.test.ts`, `blog-writer:tests/shared.test.ts:76-82` |

## 예외 / 경계값
- 한 장 다시 만들기 API에서 `method`를 빼면 서버는 `api`로 본다(`runImage` 기본값). 글에 저장된 방법을 쓰지 않는다. 화면은 항상 `method`를 보낸다.
- 전체 다시 만들기(`regenerate-images`)는 `method`(본문)를 받지 않고 `thumbnailMethod`만 받는다. 화면에서 `thumbnailMethod`를 보내는 곳은 "썸네일 만들기"뿐이다. 본문 방법을 바꾸려면 이미지마다 다시 만든다.
- OpenAI는 `1536x864`, Gemini는 `aspectRatio: "16:9"`로 요청한다. 요청문은 크롬과 같은 `imageRequest`를 쓴다.
- API 사용 비용은 사용량 화면에 집계되지 않는다 ([[usage/overview]]).

## 확인 필요
- [[image/open-questions]] #6 (다시 생성 창의 방법 처음 값), #7 (`method` 생략 시 서버 기본값)

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]], [[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-08 | 최초 기록. 같은 날 처음엔 "키 없음·한도 부족이면 크롬으로 자동 전환"이었다가, 자동 전환 없이 사용자가 고르는 방식으로 바뀜 | 커밋 38ae96c |
| 2026-10-09 | 첫 생성·썸네일 만들기·전체 다시 만들기의 방법: 항상 `api` → 새 글 쓰기에서 썸네일·본문 따로 고른 값(`method`·`thumbnailMethod`, 설정에 기억) | 커밋 7a8a0ea |
| 2026-10-09 | 이미지 다시 생성 창: "○○ API로 다시 만들기" / "크롬에서 ○○로 다시 만들기" 두 버튼 → "만드는 방법 [API\|크롬]" 고르기 + 버튼 하나 "이미지 다시 만들기". 키가 없으면 크롬으로 표시·요청 | 커밋 65bfa3e |

| 2026-10-09 | "썸네일 만들기"(썸네일이 없는 글)에서도 만드는 방법(API/크롬) 고르기. `regenerate-images`가 `thumbnailMethod`를 받아 `imageOptions.thumbnailMethod`에 저장 | 커밋 b7ced30 |