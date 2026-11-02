---
type: business-rule
domain: image
id: BR-IMG-004
name: API와 크롬 생성 방법
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/images/index.ts:generateImages
  - blog-writer:server/images/api.ts:1-131
  - blog-writer:server/images/webAi.ts
entities: [이미지 옵션, 이미지 오류 종류]
updated: 2026-11-02
---
# BR-IMG-004 API와 크롬 생성 방법

## 규칙
Gemini·ChatGPT 이미지는 **API 키가 있고 방법이 api면 API로**, 키가 없거나 사용자가 chrome을 고르면 Claude in Chrome으로 사이트에서 한 장씩 만든다. **API가 실패해도 크롬으로 저절로 넘기지 않는다.** 실패로 기록하고 사용자가 화면에서 API로 다시 하거나 크롬을 고른다. Claude(SVG) 이미지는 방법과 관계없고 로그인이 필요 없어 가장 먼저 만든다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| ChatGPT + API | `POST /v1/images/generations`, size 1536x864, 모델 `OPENAI_IMAGE_MODEL`(기본 gpt-image-2.5-flare) |
| Gemini + API | `generateContent`, 16:9, 모델 `GEMINI_IMAGE_MODEL`(기본 gemini-2.5-flash-image) |
| 429/quota/billing | `limit` |
| 401/403/잘못된 키 | `api_error`("설정 → 이미지 API에서 키 확인") |
| 정책 거절/안전 차단 | `refused` |
| 시간 초과(3분)/연결 실패 | `timeout` / `api_error` |
| 응답에 이미지 없음 | `api_error`(Gemini가 글로 답하면 `refused`) |
| 받은 형식 | png/jpeg/webp 확장자로 저장, 모르면 png |
| 크롬 방식 | 사이트 입력창에 요청 전체를 붙여넣고 다운로드 버튼으로 받아 다운로드 폴더에서 가져옴 |
| 키 저장 | 저장 전에 모델 목록 조회로 키 확인(비용 없음, 한도 부족이어도 키는 맞음) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `generateWithApi`, `apiError`, `testImageApiKey` | 위 표 | `blog-writer:server/images/api.ts` |
| 서버 | `generateWithWebAi` | Claude in Chrome | `blog-writer:server/images/webAi.ts` |
| 서버 | `generateImages` 분기 | 키 있고 method=api면 API | `blog-writer:server/images/index.ts` |
| 서버 | 크롬 작업 직렬화 | Gemini/ChatGPT 크롬 방식만 브라우저 큐 | `blog-writer:server/pipeline.ts:makeImagesInner` |
| 서버 | 키 저장 | `data/secrets.json`(읽지 않음) | `blog-writer:server/secrets.ts` |
| 테스트 | API 우선, 키 없으면 크롬, 실패는 넘기지 않음 | | `blog-writer:tests/imageApi.test.ts`, `tests/webAi.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 새 AI를 추가하면 `ImageProvider`, `STYLES_BY_PROVIDER`, `generateImages` 분기, `secrets.ts` 키 종류, 설정 화면, 오류 분류를 함께 고친다 → [[_system/extending]]
- 크롬 방식은 사이트 화면에 의존해 깨지기 쉽다 → [[_system/known-issues]]

## 영향받는 플로우
[[image/flows/이미지 생성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
