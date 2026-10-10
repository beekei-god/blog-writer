---
type: module
project: blog-writer
module: web-screens
paths: [src/NewJob.tsx, src/Keywords.tsx, src/SearchAdSettings.tsx, src/Recommend.tsx, src/RulesEditor.tsx, src/SettingsPanel.tsx, src/ImageApiSettings.tsx, src/Usage.tsx, src/BlockedSites.tsx, src/ExtensionStatus.tsx, src/LoginWindow.tsx]
source:
  - blog-writer:src/NewJob.tsx:1-274
  - blog-writer:src/Keywords.tsx:1-224
  - blog-writer:src/SearchAdSettings.tsx:1-80
  - blog-writer:src/Recommend.tsx:1-234
  - blog-writer:src/RulesEditor.tsx:1-84
  - blog-writer:src/SettingsPanel.tsx:1-345
  - blog-writer:src/Usage.tsx:1-322
  - blog-writer:src/BlockedSites.tsx:1-65
  - blog-writer:src/ExtensionStatus.tsx:1-70
  - blog-writer:src/ImageApiSettings.tsx:1-95
  - blog-writer:src/LoginWindow.tsx:1-76
updated: 2026-10-09
---
# web-screens 모듈

## 책임
각 화면(탭)과 그 안의 부품(탭 순서는 2026-10-09부터 새 글 → 키워드 탐색 → 주제 추천 → 글쓰기 규칙 → 사용량 → 설정). 글 상세 화면은 2026-10-07에 `src/job/`으로 나눴다 → [[_system/modules/web-job]].

## 파일
| 파일 | 줄 | 역할 | 주요 export / 내부 컴포넌트 | 관련 페이지 |
|---|---|---|---|---|
| `src/NewJob.tsx` | 274 | 새 글 폼: 주제·참고 링크(최대 `MAX_LINKS`), 썸네일 블록과 본문 이미지 블록을 따로 묶고, 각 블록은 스타일 → 만드는 곳(AI) → 만드는 방법(API\|크롬, Gemini·ChatGPT만, `MethodPicker`) 순서(`AiRows`). 2026-10-09부터 썸네일은 본문 설정을 따라가지 않고 완전히 독립(`thumbFollow` 삭제). 키가 없으면 API 비활성+툴팁·크롬으로 표시. 저장값이 늦게 와도 사용자가 이미 바꾼 값은 덮어쓰지 않음(`touched`). "본문 이미지와 같게 하기"는 AI·스타일·방법을 함께 맞춤(Claude끼리는 방법 비교 안 함) | `NewJob` (내부: `AiRows`, `linkProblem`) | [[writing/flows/초안 작성 플로우]], [[image/entities/ImageOptions]] |
| `src/WritingPicker.tsx` | 81 | (2026-10-10 새 파일) 본문 분량(프리셋 4개 + 1,000~8,000 직접 입력)과 말투(정보형·친근형·스토리형·정리형) 고르기. 입력 중인 글자를 그대로 두는 `WritingDraft`와 서버와 같은 범위 검사(`parseWriting`). 새 글 폼과 글 고치기 카드의 다시 쓰기가 함께 씀 | `WritingPicker`, `parseWriting`, `draftOf` | [[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-019 본문 말투 선택]] |
| `src/Keywords.tsx` | 224 | (2026-10-09 새 파일) "키워드 탐색" 탭: 키워드(쉼표로 최대 5개) 입력 → `GET /api/keywords`. 비워 두면 "지금 뜨는 검색어"와 "최근 주제 추천의 분야" 덩어리를 각각 보여 줌(덩어리별 `error`·`note`). 표: 키워드·월간 검색량(막대, 10 미만은 `<10`)·PC·모바일·경쟁 정도·구글 트렌드 규모, 열 머리글 정렬, 조건 거르기(키워드 포함·최소 검색량·경쟁), 입력 키워드 줄 강조. 줄마다 "글쓰기"(새 글 주제로 넘김)·"주제 추천받기"(그 키워드를 분야로 추천 시작) 버튼. 검색광고 키가 없으면 설정으로 안내(`onOpenSettings`) | `Keywords`, 내부 `countText`·정렬·필터 | [[topic/index]], [[_system/integrations/naver-searchad]], [[_system/integrations/google-trends]] |
| `src/SearchAdSettings.tsx` | 80 | (2026-10-09 새 파일) 설정 화면의 "네이버 검색광고 API 설정" 카드: 고객 ID·API 키·비밀 키 입력, 연결 확인 후 저장(성공하면 입력칸 비움), 상태 표시(설정 여부·고객 ID 앞 3자·`.env` 여부), 삭제(`.env` 키는 남음) | `SearchAdSettings` | [[_system/integrations/naver-searchad]], [[_system/api]] |
| `src/Recommend.tsx` | 234 | 주제 추천: 분야 입력, 기록 목록, 2초 폴링, 후보 카드(관심도·상승세·스파크라인·근거), "이 주제로 글쓰기". 2026-10-09부터 `request={field, nonce}`를 받으면 그 키워드를 분야에 넣고 바로 시작(`nonce`로 같은 요청을 두 번 시작하지 않음, 시작 뒤 `onRequestHandled`, 이미 진행 중이면 서버가 거절한 문구를 그대로 보여 줌) | `Recommend`, `CandidateCard`, `Sparkline` | [[topic/flows/주제 추천 플로우]] |
| `src/RulesEditor.tsx` | 84 | 글쓰기 규칙 편집·저장·되돌리기, 이탈 확인 | `RulesEditor` | [[writing/entities/글쓰기 규칙]] |
| `src/SettingsPanel.tsx` | 345 | 카드 순서: 네이버 블로그 설정 · 티스토리 설정(블로그 ID, 로그인 창) · 워드프레스 설정(사이트 주소, 사용자명·Application Password 연결 확인. 2026-10-09에 기본 카테고리 선택을 없애고 "카테고리는 글을 올릴 때마다 글 화면에서 고릅니다" 안내만 둠) · 네이버 데이터랩 설정 · 네이버 검색광고 API 설정(`SearchAdSettings`, 2026-10-09) · 이미지 API 설정(`ImageApiSettings`) · Claude 모델 설정 · Claude in Chrome(왜 필요한지 안내, 1. 확장 연결, 2. 막는 블로그와 대체 방법). 카드마다 "저장"은 그 카드의 칸만 저장한다 (`SETTINGS_FIELDS`, `saveGroup`, 워드프레스 칸은 `wordpressUrl`만). 블로그 ID 칸 정의 `BLOG_ID`는 네이버·티스토리만(쓰이지 않던 워드프레스 항목은 2026-10-09 삭제) | `SettingsPanel` | [[publishing/entities/블로그 설정]], [[usage/business-rules/BR-USG-001 단계별 추천 모델]], [[topic/business-rules/BR-TOP-006 데이터랩 키 확인과 우선순위]], [[_system/integrations/naver-searchad]] |
| `src/ImageApiSettings.tsx` | 95 | 설정 화면의 "이미지 API 설정" 카드: Gemini·OpenAI 키 상태(앞 6자, `.env` 여부), 연결 확인 후 저장, 키 삭제(`.env` 키는 남는다고 안내) | `ImageApiSettings` | [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]], [[_system/integrations/image-api]] |
| `src/Usage.tsx` | 322 | 플랜 한도 미터(80/95% 경고), 오늘·이번 주 토큰, 7일 막대, 단계별 모델 표, 모델별 표 | `Usage`, `Meter`, `Tile`, `DailyBars` | [[usage/flows/사용량 확인 플로우]] |
| `src/BlockedSites.tsx` | 65 | 막힌 블로그 목록·초기화, 대체 경로 설명, 로그인 창 | `BlockedSites` | [[publishing/entities/막힌 사이트]] |
| `src/ExtensionStatus.tsx` | 70 | 확장 설치·연결 상태와 "연결 확인" | `ExtensionStatus` | [[publishing/flows/Claude in Chrome 연결 확인 플로우]] |
| `src/LoginWindow.tsx` | 76 | 블로그 하나(네이버/티스토리)용 앱 전용 크롬 로그인 창 열기/닫기, 3초 폴링. 다른 블로그 창이 열려 있으면 버튼을 막고 안내 | `LoginWindow` | [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]] |

## 의존
- 사용하는 모듈: [[_system/modules/web-app]] (`api`, `labels`, `leaveGuard`), [[_system/modules/shared]] (`types`, `length`, `postHtml`, `imageErrors`)
- 사용되는 곳: `src/App.tsx`, [[_system/modules/web-job]] (`ExtensionStatus`, `LoginWindow`)

## 주의할 점
- 키워드 탐색의 검색량 정렬·거르기는 화면에서 하고(서버가 이미 검색량 순 상위 200개로 줄임), 다른 탭으로 갔다 오면 결과와 입력은 사라진다(상태가 `Keywords` 안에만 있음).
- 화면 검증은 서버보다 느슨하다: 태그 30개·주제 300자·분야 100자·참고 링크 형식/20개 검사는 화면에도 있고, 표 빈 칸은 저장 때 서버가 정리.
- 이미지 대상 키 `body-<블록 번호>`는 블록 위치에 의존한다. 편집에서 블록을 지우면 번호가 바뀐다.
