---
type: integration
project: blog-writer
system: Gemini · OpenAI 이미지 API
confidence: high
source:
  - blog-writer:server/images/api.ts:1-131
  - blog-writer:server/images/index.ts:111-123
  - blog-writer:server/images/styles.ts:21-40
  - blog-writer:server/secrets.ts:70-86
  - blog-writer:server/routes/settings.ts:91-125
  - blog-writer:tests/imageApi.test.ts
updated: 2026-10-09
---
# Gemini · OpenAI 이미지 API

두 서비스는 같은 함수(`generateWithApi`)로 다루고 요청 모양만 다르다. 화면의 AI 이름 "ChatGPT"는 이 연동에서 OpenAI API다.

## 무엇에 쓰나
Gemini·ChatGPT로 고른 이미지를 그 서비스의 API 키가 있을 때 바로 만든다. 크롬 조작([[_system/integrations/gemini-chatgpt-web]])보다 빠르고 화면 변화에 영향받지 않지만, 각 서비스에 사용량만큼 요금이 나온다. 언제 이 경로를 쓰는지는 [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]].

## 호출 방식
| | Gemini | OpenAI |
|---|---|---|
| 엔드포인트 | `POST https://generativelanguage.googleapis.com/v1beta/models/<모델>:generateContent` | `POST https://api.openai.com/v1/images/generations` |
| 인증 | 헤더 `x-goog-api-key` | 헤더 `Authorization: Bearer` |
| 모델 (기본 / 환경변수) | `gemini-2.5-flash-image` / `GEMINI_IMAGE_MODEL` | `gpt-image-2.5-flare` / `OPENAI_IMAGE_MODEL` |
| 크기 | `generationConfig.imageConfig.aspectRatio: "16:9"`, `responseModalities: ["IMAGE"]` | `size: "1536x864"`, `n: 1` |
| 결과 | `candidates[0].content.parts[].inlineData`(mimeType·base64) → 확장자는 mimeType대로 | `data[0].b64_json` → `.png` |
| 키 확인 (저장 전) | `GET /v1beta/models?pageSize=1` | `GET /v1/models` |

- 요청문은 크롬 경로와 같은 `imageRequest`(`server/images/styles.ts`)로 만든다: 16:9, 영어 화풍 지시문, headline이 있으면 "한국어 문구를 한 글자도 바꾸지 말고" 넣으라는 지시 → [[image/business-rules/BR-IMG-005 이미지 안 문구 길이]].
- 키: 환경변수 `GEMINI_API_KEY`·`OPENAI_API_KEY`가 있으면 그것, 없으면 `data/secrets.json`. 값은 화면에 앞 6자만 돌려준다 → [[_system/configuration]].
- 크롬 큐([[publishing/business-rules/BR-PUB-004 크롬 작업 직렬화]])에 서지 않는다.

## 실패 처리
타임아웃 3분(생성), 20초(키 확인). 재시도 없음. "작업 중지" 신호로 요청을 끊는다(중지는 실패로 기록하지 않음). 오류는 크롬으로 넘기지 않고 그 이미지의 실패로 기록한다.

| 응답 | 원인(kind) | 메시지 |
|---|---|---|
| 429, 또는 본문에 `insufficient_quota`·`billing`·`RESOURCE_EXHAUSTED`·`quota` | `limit` | "○○ API 한도·잔액 부족: …" |
| 401·403, 또는 잘못된 키 문구(`invalid_api_key`, `API key not valid` 등) | `api_error` | "○○ API 키가 올바르지 않습니다. 설정 → 이미지 API에서 키를 확인하세요." |
| `moderation_blocked`·`content_policy`·`safety`, Gemini 차단 사유(SAFETY·PROHIBITED·BLOCKLIST) 또는 이미지 없이 글만 답함 | `refused` | "… 거절했습니다 / 이미지 대신 답했습니다: …" |
| 시간 초과 | `timeout` | "○○ API 응답 시간이 초과되었습니다." |
| 그 밖 (연결 실패, 이미지 없는 응답 등) | `api_error` | "○○ API 오류 <상태>: …" |

키 확인에서 한도 부족(`limit`)이 나오면 키는 맞는 것으로 보고 저장한다.

## 바깥 변화에 취약한 지점
- 오류 원인을 응답 본문의 문구로 나눈다. 서비스가 오류 문구·코드를 바꾸면 `api_error`로 뭉뚱그려질 수 있다 ([[_system/known-issues]] #23).
- 기본 모델 이름이 코드에 고정되어 있다. 모델이 바뀌거나 없어지면 `.env`로 바꿔야 한다.
- 결제를 연결하지 않은 Google AI Studio 키는 이미지 모델 할당량이 없을 수 있다(429 `RESOURCE_EXHAUSTED`). 코드로는 확인하지 않은 외부 사실이다 (`confidence: medium`).
- 사용 비용은 앱의 사용량 화면에 잡히지 않는다 ([[_system/known-issues]] #20).

## 테스트
`blog-writer:tests/imageApi.test.ts` — fetch를 가짜로 바꿔 OpenAI·Gemini 성공 응답 저장, 키 없음·크롬 선택이면 크롬 경로, 429·거절·401은 크롬으로 넘기지 않고 각 원인으로 실패, 설정 API가 키 값을 돌려주지 않음.
