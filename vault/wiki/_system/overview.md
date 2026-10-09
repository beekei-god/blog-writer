---
type: system-overview
project: blog-writer
updated: 2026-10-09
---
# blog-writer 개요

## 무엇을 하는가
한 사람이 자기 컴퓨터에서 쓰는 **블로그 초안 자동 작성 도구**다. 주제를 넣으면 Claude가 웹 검색으로 자료를 모으고(딥서칭), 사용자가 정한 "글쓰기 규칙"에 맞춰 공백 포함 3,000자 이내의 한국어 블로그 글을 쓰고, 썸네일·본문 이미지를 만든다. 사용자가 초안을 검토·수정한 뒤 올릴 블로그와 방식(임시저장/예약발행/자동발행)을 고르면, 네이버 블로그·티스토리는 크롬에서 글쓰기 화면에 입력해 **늘 임시저장을 먼저** 하고 예약·자동을 고른 경우에만 블로그 발행 창에서 발행까지 한다(2026-10-09, 실제 발행 창에서는 아직 미검증). 워드프레스는 REST API로 올린다.

Claude는 API 키가 아니라 이 컴퓨터에 로그인된 Claude Code CLI(`claude -p`)를 자식 프로세스로 불러 쓴다. 그래서 API 요금 대신 Claude 구독 플랜 한도를 쓴다 (`blog-writer:README.md:1-13`).

## 주요 기능
- 주제 → 리서치 → 초안 → 이미지 → 검토 → 올릴 블로그 선택 → 네이버·티스토리는 크롬으로 임시저장(+고르면 발행 창에서 예약발행·자동발행), 워드프레스는 API로 임시저장·예약발행·자동발행 → [[writing/overview]], [[image/overview]], [[publishing/overview]]
- 분야를 넣으면 최근 뉴스·통계로 주제 후보 10~12개를 찾고 네이버 데이터랩 관심도로 순위를 매김 → [[topic/overview]]
- 올릴 때 카테고리 선택(네이버·티스토리는 블로그 에디터에서 목록을 읽어 옴, 네이버 예약·자동발행은 글 내용으로 주제도 자동 선택), 본문 이미지 추가·삭제, 프롬프트로 글 고치기·내용 추가(결과를 비교해 보고 적용) → [[publishing/overview]], [[image/overview]], [[writing/overview]]
- 글쓰기 규칙 편집 (다음 작업부터 적용) → [[writing/entities/글쓰기 규칙]]
- 단계별 Claude 모델 선택, 플랜 한도·토큰 사용량 보기 → [[usage/overview]]

## 구성
```mermaid
flowchart LR
  web[화면 React/Vite :5173] -->|/api 프록시| server[API 서버 Express :5172 127.0.0.1]
  server --> data[(data/ 로컬 파일)]
  server -->|자식 프로세스| cli[claude -p CLI]
  cli -->|WebSearch/WebFetch| internet((웹))
  cli -->|--chrome| ext[Claude in Chrome 확장 → 평소 크롬]
  ext --> blogs[블로그 에디터 / Gemini / ChatGPT]
  server -->|AppleScript| userchrome[평소 크롬 새 탭: 네이버]
  server -->|Playwright| appchrome[앱 전용 크롬 data/chrome-profile]
  server -->|Playwright headless| svg[SVG → PNG 렌더링]
  server -->|fetch| naver[네이버 자동완성·함께 많이 찾는·데이터랩]
  server -->|REST API| wp[워드프레스 사이트 wp-json]
```

## 기술 스택
TypeScript(ESM), Express 5, zod 4, React 19, Vite 8, Playwright-core(설치된 Chrome 채널 사용), tsx(서버 실행), concurrently, vitest(자동 테스트) (`blog-writer:package.json:1-33`). DB 없이 `data/` 아래 JSON/JSONL 파일에 저장한다.

## 누가 쓰나
블로그 운영자 한 명. 로컬 전용이며 API는 127.0.0.1에만 열리고 localhost가 아닌 Host/Origin은 거부한다 ([[_system/api]] 공통 처리).

## 더 읽을 곳
- [[_system/architecture]], [[_system/api]], [[_system/data-storage]], [[_system/configuration]], [[_system/operations]], [[_system/known-issues]]
- 전체 목록은 [[index]], 용어는 [[glossary]]
