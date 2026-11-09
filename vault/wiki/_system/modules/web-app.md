---
type: module
project: blog-writer
module: web-app
paths: [src/*.tsx, src/*.ts, src/styles.css]
source:
  - blog-writer:src/App.tsx
  - blog-writer:src/api.ts
  - blog-writer:src/labels.ts
updated: 2026-11-09
---
# web-app (화면 뼈대)

## 역할
React 앱의 진입, 탭 이동, "내 글" 목록, API 호출 래퍼.

## 주요 파일과 export
- `App.tsx`: 탭(새 글 / 키워드 탐색 / 주제 추천 / 글쓰기 규칙 / 사용량 / 설정), "내 글" 목록과 블로그·상태 필터, 목록 항목별 × 삭제 버튼(상세 화면 삭제와 같은 확인 문구·`DELETE /api/jobs/:id`, 작업·글 고치기 진행 중이면 비활성화, 열어 둔 글이면 이탈 확인 후 "새 글"로 이동) → [[publishing/business-rules/BR-PUB-009 수동 상태 표시와 목록 필터]]
- `api.ts`: 서버 API 호출 함수와 응답 타입
- `labels.ts`: 화면 문구(상태 이름, 모델 이유 `MODEL_REASON` …)
- `leaveGuard.ts`: 진행 중 이탈 확인
- `main.tsx`, `styles.css`, `vite-env.d.ts`

## 의존하는 모듈 / 쓰이는 곳
`shared/`의 타입·판정 함수를 서버와 공유한다. 각 화면은 [[_system/modules/web-screens]], 글 상세는 [[_system/modules/web-job]].

## 주의할 점
- 화면은 작업 상태를 주기적으로 읽어 진행을 따라간다(서버가 먼저 상태를 바꿔 두는 이유) → [[_system/architecture]]
