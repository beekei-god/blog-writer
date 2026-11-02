---
type: integration
project: blog-writer
name: Claude CLI (claude -p)
source:
  - blog-writer:server/claude.ts
  - blog-writer:server/claudeAuth.ts
updated: 2026-11-02
---
# Claude CLI (claude -p)

## 무엇을 위해
모든 글쓰기·검토·제목·이미지 계획 호출. 로컬 `claude -p`를 자식 프로세스로 띄우고 JSON 스키마로 결과를 받는다. 구독 로그인으로 돌아가므로 API 키가 필요 없다.

## 호출 방식
- 옵션: `prompt`, `system`, `schema`, `tools`(WebSearch/WebFetch 등), `effort`, `stage`(모델 선택·사용량 기록 기준), `chrome`, `addDirs`.
- 모델은 단계별 설정 → 없으면 `.env`의 `CLAUDE_MODEL` → 없으면 CLI 기본값 → [[usage/overview]]
- 실행 파일은 `CLAUDE_BIN`으로 바꿀 수 있다.
- 결과 이벤트에서 사용량과 5시간·주간 한도 정보를 읽어 저장한다.

## 인증·한도
로그인 상태는 `/api/claude/auth`로 확인·로그인한다. 한도에 걸리면 안내 문구와 초기화 시각이 오류에 담긴다.

## 실패 형태
- 로그인 안 됨 / 한도 초과 / 시간 초과 / 사용자 취소(`CancelledError`)
- `chrome: true` 호출에서 확장 연결 실패·사이트 차단 → [[_system/integrations/claude-in-chrome]]

## 주의
- 새 단계를 추가하면 `UsageStage`·설정·화면 문구를 같이 고친다 → [[_system/extending]]
- 모듈: [[_system/modules/server-claude]]
