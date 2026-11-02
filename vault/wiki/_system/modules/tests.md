---
type: module
project: blog-writer
module: tests
paths: [tests/**]
source:
  - blog-writer:tests/setup.ts
  - blog-writer:tests/api.test.ts
updated: 2026-11-02
---
# tests (vitest)

## 역할
규칙의 근거. 테스트는 임시 데이터 폴더(`tests/setup.ts`)를 쓰므로 실제 `data/`를 건드리지 않고, Claude·크롬·외부 API는 가짜로 대체한다.

## 주요 파일과 export
| 테스트 | 다루는 규칙 |
|---|---|
| `writer`, `writingOptions`, `tone`, `keywords`, `titles`, `editPost`, `place` | writing |
| `imagePlan`, `imageApi`, `imageParallel`, `webAi`, `svg` | image |
| `wordpress`, `publish`, `categories`, `naverTopic`, `extensionOptions` | publishing |
| `searchad`, `explore`, `datalab`, `recommend` | topic |
| `claude`(가짜 `CLAUDE_BIN`으로 CLI 흉내), `usageSummary`, `claudeAuth`, `store`, `shared`, `api` | usage·저장·공용·API 검사 |

각 규칙 페이지의 "구현 현황" 표와 도메인 `implementations`의 "테스트" 표에 규칙별 테스트가 있다.

## 의존하는 모듈 / 쓰이는 곳
전체 서버·공용 코드를 가져다 호출한다(`tests/api.test.ts`는 앱을 띄워 요청).

## 주의할 점
- 업무 규칙의 값을 바꾸면 그 규칙의 근거 테스트도 함께 고친다(프로젝트 지침).
- 일부 규칙은 전용 테스트가 없다 → 각 도메인의 `open-questions.md`
