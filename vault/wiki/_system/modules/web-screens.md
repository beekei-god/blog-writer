---
type: module
project: blog-writer
module: web-screens
paths: [src/NewJob.tsx, src/Recommend.tsx, src/RulesEditor.tsx, src/SettingsPanel.tsx, src/Usage.tsx, src/BlockedSites.tsx, src/ExtensionStatus.tsx, src/LoginWindow.tsx]
source:
  - blog-writer:src/NewJob.tsx:1-253
  - blog-writer:src/Recommend.tsx:1-207
  - blog-writer:src/RulesEditor.tsx:1-84
  - blog-writer:src/SettingsPanel.tsx:1-380
  - blog-writer:src/Usage.tsx:1-322
  - blog-writer:src/BlockedSites.tsx:1-65
  - blog-writer:src/ExtensionStatus.tsx:1-70
  - blog-writer:src/LoginWindow.tsx:1-76
updated: 2026-10-07
---
# web-screens 모듈

## 책임
각 화면(탭)과 그 안의 부품. 글 상세 화면은 2026-10-07에 `src/job/`으로 나눴다 → [[_system/modules/web-job]].

## 파일
| 파일 | 줄 | 역할 | 주요 export / 내부 컴포넌트 | 관련 페이지 |
|---|---|---|---|---|
| `src/NewJob.tsx` | 253 | 새 글 폼: 주제·참고 링크, 썸네일 켜기, 본문 이미지 수(0~6), 썸네일/본문 AI·스타일 (썸네일이 본문을 따라가는 `thumbFollow`) | `NewJob`, `AiRows` | [[writing/flows/초안 작성 플로우]], [[image/entities/ImageOptions]] |
| `src/Recommend.tsx` | 207 | 주제 추천: 분야 입력, 기록 목록, 2초 폴링, 후보 카드(관심도·상승세·스파크라인·근거), "이 주제로 글쓰기" | `Recommend`, `CandidateCard`, `Sparkline` | [[topic/flows/주제 추천 플로우]] |
| `src/RulesEditor.tsx` | 84 | 글쓰기 규칙 편집·저장·되돌리기, 이탈 확인 | `RulesEditor` | [[writing/entities/글쓰기 규칙]] |
| `src/SettingsPanel.tsx` | 380 | 카드 순서: 네이버 블로그 설정 · 티스토리 설정(블로그 ID, 로그인 창) · 워드프레스 설정(사이트 주소, 사용자명·Application Password 연결 확인, 카테고리) · 네이버 데이터랩 설정 · Claude 모델 설정 · Claude in Chrome(왜 필요한지 안내, 1. 확장 연결, 2. 막는 블로그와 대체 방법). 카드마다 "저장"은 그 카드의 칸만 저장한다 (`SETTINGS_FIELDS`, `saveGroup`) | `SettingsPanel` | [[publishing/entities/블로그 설정]], [[usage/business-rules/BR-USG-001 단계별 추천 모델]], [[topic/business-rules/BR-TOP-006 데이터랩 키 확인과 우선순위]] |
| `src/Usage.tsx` | 319 | 플랜 한도 미터(80/95% 경고), 오늘·이번 주 토큰, 7일 막대, 단계별 모델 표, 모델별 표 | `Usage`, `Meter`, `Tile`, `DailyBars` | [[usage/flows/사용량 확인 플로우]] |
| `src/BlockedSites.tsx` | 65 | 막힌 블로그 목록·초기화, 대체 경로 설명, 로그인 창 | `BlockedSites` | [[publishing/entities/막힌 사이트]] |
| `src/ExtensionStatus.tsx` | 70 | 확장 설치·연결 상태와 "연결 확인" | `ExtensionStatus` | [[publishing/flows/Claude in Chrome 연결 확인 플로우]] |
| `src/LoginWindow.tsx` | 76 | 블로그 하나(네이버/티스토리)용 앱 전용 크롬 로그인 창 열기/닫기, 3초 폴링. 다른 블로그 창이 열려 있으면 버튼을 막고 안내 | `LoginWindow` | [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]] |

## 의존
- 사용하는 모듈: [[_system/modules/web-app]] (`api`, `labels`, `leaveGuard`), [[_system/modules/shared]] (`types`, `length`, `postHtml`, `imageErrors`)
- 사용되는 곳: `src/App.tsx`, [[_system/modules/web-job]] (`ExtensionStatus`, `LoginWindow`)

## 주의할 점
- 화면 검증은 서버보다 느슨하다: 태그 30개·주제 300자·분야 100자·참고 링크 형식/20개 검사는 화면에도 있고, 표 빈 칸은 저장 때 서버가 정리.
- 이미지 대상 키 `body-<블록 번호>`는 블록 위치에 의존한다. 편집에서 블록을 지우면 번호가 바뀐다.
