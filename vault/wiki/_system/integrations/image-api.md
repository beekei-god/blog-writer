---
type: integration
project: blog-writer
name: 이미지 API (Gemini·OpenAI)
source:
  - blog-writer:server/images/api.ts
  - blog-writer:server/secrets.ts
updated: 2026-11-02
---
# 이미지 API (Gemini·OpenAI)

## 무엇을 위해
이미지 생성 방법 "api": 브라우저 없이 이미지를 만든다.

## 엔드포인트
- OpenAI: `https://api.openai.com/v1` (모델 `OPENAI_IMAGE_MODEL`)
- Gemini: `https://generativelanguage.googleapis.com/v1beta` (모델 `GEMINI_IMAGE_MODEL`)

## 키
`GEMINI_API_KEY`, `OPENAI_API_KEY`(.env 우선) 또는 설정 화면 저장(`secrets.json`). 화면으로는 키 값을 돌려주지 않는다.

## 실패 형태
키 없음, 한도·결제, 안전 필터 거절 등을 `images/errors.ts`가 종류로 나눠 사용자 안내를 만든다 → [[image/overview]]

## 주의
이 호출은 유료일 수 있다. 모듈: [[_system/modules/server-images]]
