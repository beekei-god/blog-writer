---
type: domain-overview
domain: image
aliases: [이미지, 썸네일, 본문 이미지]
projects: [blog-writer]
updated: 2026-11-02
---
# image (이미지) 도메인

## 한 문단 요약
글의 본문 이미지(0~6장)와 대표 썸네일을 만든다. 만드는 AI는 Claude(SVG를 그려 PNG로 렌더링), Gemini, ChatGPT 중에서 고르고, Gemini·ChatGPT는 API 키가 있으면 API로, 아니면(또는 사용자가 고르면) Claude in Chrome으로 사이트에서 만든다. 이미지를 만들기 직전에 본문을 다시 읽고 장면(prompt)과 이미지 안 문구(headline)를 정하고, 한 장이 실패해도 글 전체는 실패시키지 않고 원인을 기록한다. **썸네일은 처음 글을 쓸 때 만들지 않고**, 제목이 정해진 뒤 사용자가 "이 제목으로 썸네일 만들기"를 눌러 만든다.

## 경계
- 포함: 이미지 옵션, 이미지 기획, 생성(SVG/API/크롬), 실패 원인, 한 장씩 다시 만들기, 직접 올리기·삭제·자리 추가
- 제외(다른 도메인): 글·제목 → [[writing/overview]], 블로그에 이미지 올리기 → [[publishing/overview]], Claude 호출 한도 → [[usage/overview]]

## 핵심 개념
- [[image/entities/이미지 명세]] — 이미지 한 장의 정보와 결과
- [[image/entities/이미지 옵션]] — AI·스타일·방법·개수
- [[image/entities/이미지 오류 종류]] — 실패 원인 15가지

## 주요 플로우
- [[image/flows/이미지 생성]]
- [[image/flows/제목 확정 후 썸네일 만들기]]

## 규칙
[[image/index]]의 규칙 표 참고 (BR-IMG-001~011).

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 프롬프트 | 글 작성 때 이미지 블록 지시, 이미지 기획, SVG 지시 | [[_system/modules/server-images]], [[_system/modules/server-core]] |
| 서버 | 생성·기록·오류 분류·동시 실행 | [[_system/modules/server-images]], [[_system/modules/server-pipeline]], [[_system/modules/server-routes]] |
| 공용 | 옵션 해석(`aiFor`/`methodFor`/`fitStyle`), 오류 분류 | [[_system/modules/shared]] |
| 화면 | 이미지 옵션, 이미지 카드, 썸네일 안내 | [[_system/modules/web-job]], [[_system/modules/web-screens]] |
| 외부 | 이미지 API, 사이트 자동 조작 | [[_system/integrations/image-api]], [[_system/integrations/gemini-chatgpt-web]], [[_system/integrations/claude-in-chrome]] |

## 구현 지도
- [[image/implementations/blog-writer 구현]]
