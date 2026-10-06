---
type: domain-overview
domain: image
aliases: [이미지, 썸네일, 본문 이미지]
projects: [blog-writer]
updated: 2026-10-07
---
# image (이미지 생성) 도메인

## 한 문단 요약
초안의 썸네일(대표 이미지)과 본문 이미지(0~6장)를 만드는 업무. 만들 AI는 Claude(SVG 플랫 일러스트), Gemini, ChatGPT(웹 화면을 Claude in Chrome으로 조작) 중에서 썸네일·본문 따로 고른다. 만들기 직전에 본문을 다시 읽어 이미지마다 그릴 장면과 이미지 안 문구를 정하고, 한 장이 실패해도 글은 계속 진행하며 원인을 13종으로 분류해 다른 AI로 다시 만들게 돕는다.

## 경계
- 포함: 이미지 옵션, 기획(prompt·headline), SVG/웹 AI 생성, 실패 기록·분류, 다시 만들기·직접 올리기
- 제외(다른 도메인): 처음 이미지 블록을 배치하는 글 작성 → [[writing/overview]], 블로그에 이미지 올리기 → [[publishing/overview]], 크롬 작업 큐 → [[publishing/business-rules/BR-PUB-004 크롬 작업 직렬화]]

## 핵심 개념
- [[image/entities/ImageSpec]] — 이미지 한 장의 설계와 결과
- [[image/entities/ImageOptions]] — 개수·AI·화풍

## 주요 플로우
- [[image/flows/이미지 생성 플로우]]
- [[image/flows/이미지 다시 만들기 플로우]]

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 프롬프트 | 기획(섹션 연관성·문구), SVG 그리기, 웹 AI 조작 | [[_system/integrations/claude-cli]], [[_system/integrations/gemini-chatgpt-web]] |
| 서버 | 대상 수집, 생성 순서, 결과 기록, SVG 검증, 옵션 검증, 이미지 API | [[_system/modules/server-images]], [[_system/modules/server-pipeline]], [[_system/modules/server-routes]] |
| 공용 | 스타일 제한, `fitStyle`·`aiFor`, 이미지 키(`body-<n>`), 오류 종류·분류 | [[_system/modules/shared]] |
| 화면 | 옵션 선택(새 글), 진행 표시, 실패 안내·AI 추천, 이미지별 도구, 편집 | [[_system/modules/web-screens]], [[_system/modules/web-job]] |

## 구현 지도
- [[image/implementations/blog-writer 구현]]
