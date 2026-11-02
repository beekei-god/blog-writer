---
type: system-known-issues
project: blog-writer
source:
  - blog-writer:server/browser/publish.ts
  - blog-writer:server/images/webAi.ts
  - blog-writer:server/trends.ts
updated: 2026-11-02
---
# 알려진 문제와 취약한 곳

코드·주석에서 확인한 것만 적는다. 업무 의도가 불분명한 항목은 각 도메인의 열린 질문에 있다.

| 영역 | 내용 | 대응 | 관련 |
|---|---|---|---|
| 블로그 화면 의존 | 네이버·티스토리 에디터와 발행 창은 클래스 이름이 자주 바뀐다. 화면 글자로 찾지만 깨질 수 있다 | 필수 단계가 안 되면 임시저장으로 두고 화면 구조를 로그에 남김 | [[publishing/business-rules/BR-PUB-004 임시저장 우선과 발행 단계 실패]] |
| Claude in Chrome 제한 | 확장이 안전 정책으로 일부 사이트(네이버 등)를 막는다. 우회하지 않고 다른 방법으로 간다 | 막힌 사이트 기록 | [[publishing/business-rules/BR-PUB-005 크롬 방식 선택과 막힌 사이트]] |
| macOS 전용 경로 | 평소 크롬 방식은 AppleScript라 macOS만, Apple Events 허용과 자동화 권한 필요 | 문제별 안내 | [[_system/integrations/chrome-applescript]] |
| 웹 AI 이미지 | Gemini·ChatGPT 사이트 화면이 바뀌거나 "문제가 발생했습니다"를 보이면 실패. 연속 다운로드를 크롬이 막을 수 있음 | `ui_changed`/`site_error`/`download`로 분류, API 사용 권장 | [[image/business-rules/BR-IMG-004 API와 크롬 생성 방법]] |
| 네이버 "함께 많이 찾는" | 공개 API가 아니라 검색 결과 HTML의 내부 요청 주소를 꺼내 호출한다. 네이버가 영역을 꺼 두면 빈 값 | 빈 배열 허용 | [[_system/integrations/naver-search]] |
| 구글 트렌드 | RSS 형식이 바뀌면 읽지 못함. 한국 블로그와 무관한 검색어도 섞임 | `TrendsError` | [[topic/business-rules/BR-TOP-007 지금 뜨는 검색어]] |
| 데이터랩 | 하루 1,000회 호출 한도 | 429 안내 | [[topic/business-rules/BR-TOP-004 데이터랩 관심도와 순위]] |
| 검색광고 | 짧은 시간에 여러 번 부르면 429 | 400ms 간격, 재시도 | [[topic/business-rules/BR-TOP-006 키워드 탐색]] |
| 같은 크롬 프로필 | 앱 전용 크롬 프로필을 두 프로세스가 동시에 열 수 없다 | 로그인 창 닫고 진행, 크롬 작업 직렬화 | [[_system/integrations/playwright-chrome]] |
| 프롬프트로만 지키는 규칙 | 사실 확인, 제목 길이, 썸네일 문구, 글 구조는 코드가 검사하지 않는다 | 해당 규칙의 `confidence: medium` | [[writing/open-questions]] |
