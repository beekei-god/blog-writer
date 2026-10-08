---
type: index
updated: 2026-10-08
---
# blog-writer Wiki

시작점: [[_system/overview]] · 용어: [[glossary]] · 기록: [[log]] · 설정: [[_registry]]

## 시스템
- [[_system/overview]] — 무엇을 하는 프로그램인가, 구성도
- [[_system/architecture]] — 서버·화면·claude CLI·크롬 3종, 요청 경로, 백그라운드·큐·중지
- [[_system/api]] — HTTP 엔드포인트 33개, 로컬 전용 검사
- [[_system/configuration]] — 환경 변수 7개, 설정 파일, 비밀 정보, 코드 상수
- [[_system/data-storage]] — `data/` 아래 JSON/JSONL 파일과 스키마
- [[_system/operations]] — 사전 준비, 실행 명령, 자주 생기는 실패
- [[_system/known-issues]] — 불일치·미사용 코드·외부 의존 16건 (4건 해결)

### 모듈
- [[_system/modules/server-core]] — 라우터, 저장, 중지 신호, 규칙·키 파일
- [[_system/modules/server-pipeline]] — 작업 실행, 리서치, 글 작성, 스키마, 네이버 수집
- [[_system/modules/server-claude]] — claude CLI 호출, 사용량 기록·집계
- [[_system/modules/server-recommend]] — 주제 추천, 데이터랩
- [[_system/modules/server-images]] — 이미지 대상·기획·SVG·웹 AI
- [[_system/modules/server-browser]] — 블로그 입력 3경로, 확장·로그인 창
- [[_system/modules/shared]] — 공용 타입·분량·붙여넣기 HTML·이미지 오류
- [[_system/modules/web-app]] — 화면 뼈대, API 클라이언트, 라벨
- [[_system/modules/web-screens]] — 각 화면 컴포넌트
- [[_system/modules/project-root]] — README, 빌드 설정, 기본 글쓰기 규칙

### 외부 연동
- [[_system/integrations/claude-cli]] — `claude -p` 호출 방식과 프롬프트 목록 (업무 로직)
- [[_system/integrations/claude-in-chrome]] — 평소 크롬 조작 확장
- [[_system/integrations/naver-search]] — 자동완성·함께 많이 찾는
- [[_system/integrations/naver-datalab]] — NAVER API HUB 검색어 트렌드
- [[_system/integrations/gemini-chatgpt-web]] — 웹 화면으로 이미지 생성 (API 키가 없거나 "크롬에서"를 고를 때)
- [[_system/integrations/image-api]] — Gemini·OpenAI 이미지 API (키가 있을 때 기본)
- [[_system/integrations/chrome-applescript]] — macOS 평소 크롬 (네이버)
- [[_system/integrations/playwright-chrome]] — SVG 렌더링, 앱 전용 크롬, 로그인 창
- [[_system/integrations/blog-editors]] — 네이버·티스토리·워드프레스 에디터

## 도메인
- [[writing/overview|writing (글 작성)]] — 작업·리서치·초안·규칙·태그. 엔티티 3, 규칙 15, 플로우 4 → [[writing/index]]
- [[image/overview|image (이미지 생성)]] — 썸네일·본문 이미지. 엔티티 2, 규칙 14(폐기 1), 플로우 2 → [[image/index]]
- [[publishing/overview|publishing (블로그 임시저장)]] — 입력 경로·에디터 서식. 엔티티 2, 규칙 13, 플로우 2 → [[publishing/index]]
- [[topic/overview|topic (주제 추천)]] — 뉴스·통계·데이터랩. 엔티티 2, 규칙 6, 플로우 1 → [[topic/index]]
- [[usage/overview|usage (Claude 모델·사용량)]] — 모델 선택, 토큰·한도. 엔티티 2, 규칙 6, 플로우 1 → [[usage/index]]

## 레이어 불일치 (consistency: conflict)
- (현재 conflict인 규칙 없음)
- 2026-10-05에 해결: BR-WRT-004, BR-WRT-006, BR-WRT-007, BR-WRT-010, BR-PUB-007, BR-PUB-012, BR-TOP-005 (consistent로 변경)

## 미해결 질문
- [[writing/open-questions]] · [[image/open-questions]] · [[publishing/open-questions]] · [[topic/open-questions]] · [[usage/open-questions]]
