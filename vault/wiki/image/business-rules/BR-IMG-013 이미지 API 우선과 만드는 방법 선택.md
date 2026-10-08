---
type: business-rule
domain: image
id: BR-IMG-013
name: 이미지 API 우선과 만드는 방법 선택
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/images/index.ts:120-132
  - blog-writer:server/images/api.ts:25-40
  - blog-writer:server/images/api.ts:63-126
  - blog-writer:server/secrets.ts:77-93
  - blog-writer:server/routes/settings.ts:91-125
  - blog-writer:server/pipeline.ts:286-298
  - blog-writer:src/job/images.tsx:82-127
  - blog-writer:tests/imageApi.test.ts
entities: [ImageSpec]
updated: 2026-10-08
---
# BR-IMG-013 이미지 API 우선과 만드는 방법 선택

## 규칙
Gemini·ChatGPT 이미지는 그 서비스의 **API 키가 연결되어 있으면 API로** 만들고, 키가 없으면 지금처럼 크롬(Claude in Chrome)에서 만든다. **API가 실패해도 크롬으로 저절로 넘기지 않는다.** 실패를 그 이미지에 기록하고, 사용자가 이미지마다 "API로 다시 만들기" 또는 "크롬에서 다시 만들기"를 고른다. Claude(SVG)는 이 규칙과 관계없다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 방법 `api`(기본) + 키 있음 | API로 생성. 로그 "Gemini API로 이미지를 만듭니다." |
| 방법 `api` + 키 없음 | 크롬에서 생성 (예전과 같음) |
| 방법 `chrome` (화면에서 "크롬에서 …"를 누름) | 키가 있어도 크롬에서 생성 |
| API 429 / `insufficient_quota` / `billing` / `RESOURCE_EXHAUSTED` / `quota` | `limit` 실패 "○○ API 한도·잔액 부족: …" |
| API 401·403 / 잘못된 키 문구 | `api_error` 실패 "○○ API 키가 올바르지 않습니다 …" |
| `moderation_blocked`·`content_policy`·`safety`, Gemini가 이미지 대신 글이나 차단 사유(SAFETY·PROHIBITED·BLOCKLIST) | `refused` 실패 |
| 그 밖 API 오류·이미지 없는 응답·연결 실패 | `api_error` 실패 (시간 초과는 `timeout`, 3분) |
| 화면: 키가 연결된 AI | "○○ API로 다시 만들기"(강조) + "크롬에서 ○○로 다시 만들기" |
| 화면: 키가 없는 AI | API 버튼은 보이지만 누를 수 없고 툴팁 "○○ API 키가 연결되어 있지 않습니다. 설정 → 이미지 API 설정에서 키를 연결하면 쓸 수 있습니다." 크롬 버튼이 강조 |

## 키 저장
- 설정 화면 "이미지 API 설정"에서 키를 넣으면 저장 전에 모델 목록 조회로 키를 확인한다(이미지 생성 비용 없음). 한도 부족 응답이어도 키 자체는 맞는 것으로 보고 저장한다.
- `data/secrets.json`(권한 0600)에 저장하고 화면에는 앞 6자 힌트만 돌려준다. `.env`의 `GEMINI_API_KEY`·`OPENAI_API_KEY`가 있으면 그 값이 우선이며 화면에서 지워도 남는다.
- 모델: 기본 `gemini-2.5-flash-image`, `gpt-image-2.5-flare`. `.env`의 `GEMINI_IMAGE_MODEL`·`OPENAI_IMAGE_MODEL`로 바꾼다.

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | API·크롬 선택 | `blog-writer:server/images/index.ts:120-132` |
| 서버 | API 호출·오류 분류 | `blog-writer:server/images/api.ts:25-115` |
| 서버 | 크롬 큐는 실제로 크롬을 쓸 때만 | `blog-writer:server/pipeline.ts:286-298` |
| 서버 | 키 저장·확인 | `blog-writer:server/secrets.ts:77-93`, `blog-writer:server/routes/settings.ts:91-125`, `blog-writer:server/images/api.ts:117-126` |
| 화면 | 방법 버튼, 키 없음 비활성·툴팁 | `blog-writer:src/job/images.tsx:82-127` |
| 화면 | 설정 카드 | `blog-writer:src/ImageApiSettings.tsx` |
| 테스트 | API·크롬 선택, 실패 분류, 키 값 비노출 | `blog-writer:tests/imageApi.test.ts` |

## 예외 / 경계값
- "다시 만들기"가 아닌 첫 생성(초안 작성 중)과 "썸네일 만들기"는 방법을 고르지 않으므로 `api`(키 있으면 API)다.
- OpenAI는 `1536x864`, Gemini는 `aspectRatio: "16:9"`로 요청한다. 요청문은 크롬과 같은 `imageRequest`를 쓴다.
- API 사용 비용은 사용량 화면에 집계되지 않는다 ([[usage/overview]]).

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]], [[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-08 | 최초 기록. 같은 날 처음엔 "키 없음·한도 부족이면 크롬으로 자동 전환"이었다가, 자동 전환 없이 사용자가 고르는 방식으로 바뀜 | 커밋 38ae96c |
