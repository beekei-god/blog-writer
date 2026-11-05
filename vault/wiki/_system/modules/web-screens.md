---
type: module
project: blog-writer
module: web-screens
paths: [src/NewJob.tsx, src/WritingPicker.tsx, src/Recommend.tsx, src/Keywords.tsx, src/RulesEditor.tsx, src/Usage.tsx, src/SettingsPanel.tsx, src/ImageApiSettings.tsx, src/SearchAdSettings.tsx, src/ClaudeAuth.tsx, src/ExtensionStatus.tsx, src/LoginWindow.tsx, src/Sentences.tsx]
source:
  - blog-writer:src/NewJob.tsx
  - blog-writer:src/SettingsPanel.tsx
  - blog-writer:src/Usage.tsx
updated: 2026-11-05
---
# web-screens (탭 화면)

## 역할
글 상세를 제외한 화면들.

## 주요 파일과 export
| 파일 | 하는 일 | 도메인 |
|---|---|---|
| `NewJob.tsx`, `WritingPicker.tsx` | 새 글 폼: 주제, 링크, "본문 이미지" 카드의 이미지 옵션(썸네일 체크 없음), 분량·말투·형식·경험 메모 | [[writing/overview]], [[image/overview]] |
| `Recommend.tsx`, `Keywords.tsx` | 주제 추천(이력 칩별 삭제), 키워드 탐색 | [[topic/overview]] |
| `RulesEditor.tsx` | 글쓰기 규칙 편집·초기화 | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 문서와 작업별 사본]] |
| `Usage.tsx`, `ClaudeAuth.tsx` | 사용량·한도·모델, Claude 로그인 | [[usage/overview]] |
| `SettingsPanel.tsx` + `ImageApiSettings.tsx`, `SearchAdSettings.tsx` | 블로그 ID, 모델, 키 설정 | [[_system/configuration]] |
| `ExtensionStatus.tsx`, `LoginWindow.tsx` | Claude in Chrome 상태, 앱 전용 크롬 로그인 창 | [[publishing/overview]] |
| `Sentences.tsx` | 문장 단위 표시 | |

## 의존하는 모듈 / 쓰이는 곳
`src/api.ts`, `src/labels.ts`, `shared/`.

## 주의할 점
- 새 작업 폼은 썸네일을 켜지 않는다(제목 확정 후 버튼) → [[image/business-rules/BR-IMG-007 제목 확정 후 썸네일 생성]]
