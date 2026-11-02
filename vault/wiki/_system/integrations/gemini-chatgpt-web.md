---
type: integration
project: blog-writer
name: Gemini·ChatGPT 웹 (크롬 방식)
source:
  - blog-writer:server/images/webAi.ts
updated: 2026-11-02
---
# Gemini·ChatGPT 웹 (크롬 방식)

## 무엇을 위해
이미지 생성 방법 "chrome": 키 없이 구독 계정의 웹 화면에서 이미지를 만든다.

## 대상
- Gemini: https://gemini.google.com/app
- ChatGPT: https://chatgpt.com/

## 동작
Claude in Chrome으로 프롬프트를 넣고 생성된 이미지를 내려받아 `DOWNLOADS_DIR`(기본 다운로드 폴더)에서 가져온다 → [[_system/integrations/claude-in-chrome]]

## 실패 형태
로그인 풀림, 사이트 차단, 이미지 생성 한도, 다운로드 파일을 찾지 못함.

## 주의
화면 구조·문구가 바뀌면 깨질 수 있다. 모듈: [[_system/modules/server-images]]
