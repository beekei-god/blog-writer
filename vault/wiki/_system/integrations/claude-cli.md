---
type: integration
project: blog-writer
system: Claude Code CLI (claude -p)
confidence: high
source:
  - blog-writer:server/claude.ts:1-198
  - blog-writer:server/research.ts:5-88
  - blog-writer:server/writer.ts:6-215
  - blog-writer:server/images/plan.ts:67-113
  - blog-writer:server/images/svg.ts:8-63
  - blog-writer:server/images/webAi.ts:194-238
  - blog-writer:server/browser/blogPost.ts:180-212
  - blog-writer:server/recommend.ts:69-196
  - blog-writer:server/routes/browser.ts:33-47
  - blog-writer:server/routes/usage.ts:19-27
updated: 2026-10-07
---
# Claude Code CLI 연동

## 무엇에 쓰나
앱의 모든 LLM 작업. API 키 없이 로컬에 로그인된 Claude Code의 구독 한도를 쓴다. **프롬프트가 이 앱 업무 로직의 큰 부분**이라 아래에 목록을 둔다.

## 호출 방식
`runClaude<T>(opts)` 하나로 부른다 (`blog-writer:server/claude.ts:58-198`).
- 실행: `spawn(CLAUDE_BIN ?? "claude", args, { cwd: os.tmpdir() })`. 프롬프트는 stdin, 시스템 프롬프트는 `--append-system-prompt`.
- 공통 인자: `-p --output-format stream-json --verbose --no-session-persistence --strict-mcp-config --tools <허용 도구> --json-schema <스키마> --effort <low|medium|high>` (`:61-71`). `--strict-mcp-config`로 사용자 MCP 서버를 로드하지 않는다.
- 도구: 지정한 도구만 `--allowedTools`. `chrome: true`면 `--chrome --allowedTools mcp__claude-in-chrome` (`:72-73`). `addDirs`는 `--add-dir`(이미지 폴더를 file_upload로 쓰기 위해).
- 모델: `--model` = 호출이 지정한 모델 > 단계 설정 > `CLAUDE_MODEL` > CLI 기본 → [[usage/business-rules/BR-USG-002 모델 결정 순서]].
- 결과: stream-json 줄을 읽어 `result` 이벤트의 `structured_output`을 돌려준다. `assistant`의 `tool_use`는 `onToolUse` 콜백으로(진행 로그용), `system/init`의 모델은 기본 모델 기억, `rate_limit_event`는 플랜 한도 저장 (`:100-149`).
- 인증: Claude Code의 로그인 상태 (앱은 값을 다루지 않음).

## 실패 처리
| 상황 | 결과 | 근거 |
|---|---|---|
| CLI 없음 (ENOENT) | "`claude` CLI를 찾을 수 없습니다…" | `:152-157` |
| 타임아웃 | SIGTERM 후 결과 없음 → "결과 없이 종료" 오류. 기본 15분, 호출마다 다름 | `:89`, `:186-188` |
| 사용자 중지 | SIGTERM → `CancelledError` | `:90-95`, `:180` |
| 확장 미연결 (도구 결과 문구) | 즉시 종료 → `ChromeExtensionError("not_connected")` | `:124-127`, `:181-184` |
| 사이트 차단 (도구 결과 문구) | 즉시 종료 → `SiteBlockedError` (한도 낭비 방지) | `:127-131`, `:185` |
| `is_error` | "claude CLI 오류: …" | `:190` |
| 구조화 결과 없음 | "구조화된 결과를 돌려주지 않았습니다." | `:191-193` |
재시도는 없다. 실패해도 쓴 토큰은 먼저 기록한다 (`:165-178`) → [[usage/business-rules/BR-USG-006 실패한 호출도 기록]].

## 호출 목록 (프롬프트 요약)
| 단계(stage) | 위치 | 도구 | effort / 타임아웃 | 지시 요약 | 출력 | 관련 규칙 |
|---|---|---|---|---|---|---|
| research | `server/research.ts:5-83` | WebSearch, WebFetch | high / 20분 | 글쓰기 규칙을 함께 주고 사실을 출처와 함께 수집. 공식→언론→블로그 순, WebFetch는 사용자 링크 외 최대 6개, 사용자 링크는 모두 열기, 사실마다 [출처 URL], 블로그 수치 "(참고용)", 자료끼리 다르면 각각 적고 "공고문 확인 필요", 못 찾은 항목은 "찾지 못한 항목"에 | `searchQuestion`, `mainKeyword`, `subKeywords`(2~3), `notes`, `sources[{title,url,kind}]` | [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]], [[writing/business-rules/BR-WRT-003 확인된 사실만 사용]] |
| writing | `server/writer.ts:6-32`, `:44-84`, `:119-146` | 없음 | high / 15분 | 규칙 우선, 본문 3,000자 이하(목표 2,300~2,800), 노트에 출처 있는 사실만, 블록 종류·굵게 표기, 링크는 출처 URL만 일반 텍스트로, 표는 칸 수 같고 모두 채움, 제목 후보 3개, 태그 출처·검색어 기록과 목록에 있는 표현만, 스마트블록 태그 금지, 이미지 지시(화풍·basis·범용 이미지 금지·썸네일 headline 8~16자·본문 이미지 정확히 N개) | `POST_JSON_SCHEMA` | [[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-005 태그 출처 검증]], [[image/business-rules/BR-IMG-005 이미지 안 문구 길이]] |
| writing (줄이기) | `server/writer.ts:188-204` | 없음 | medium / 10분 | 사실·숫자·출처는 그대로 두고 2,500자 안팎으로 줄여 같은 JSON으로. 뺀 내용은 omittedItems에 | `POST_JSON_SCHEMA` | [[writing/business-rules/BR-WRT-001 본문 분량 상한]] |
| images (기획) | `server/images/plan.ts:86-106` | 없음 | low / 4분 | 이미지가 놓인 섹션의 구체 내용이 보이게 prompt를 쓰고, 글자는 headline에만, 본문에 있는 사실로만, 썸네일 8~16자·본문 4~20자, key마다 하나 | `{images[{key,headline,basis,prompt}]}` | [[image/business-rules/BR-IMG-004 본문 기반 이미지 기획]] |
| images (SVG) | `server/images/svg.ts:8-63` | 없음 | low / 5분 | 단일 SVG, viewBox 지정, flat, 스크립트·외부 참조 금지, 문구는 한 글자도 바꾸지 말고 크게 | `{svg}` | [[image/business-rules/BR-IMG-011 SVG 안전 검증과 크기]] |
| browser (이미지) | `server/images/webAi.ts:209-251` | Claude in Chrome | low / 10분 | 새 탭에서 Gemini/ChatGPT 열기, 입력 스크립트 그대로 실행, 완료까지 JS로 대기, 다운로드 스크립트 실행, 탭 닫기 | `{status, imageUrl, downloadClicked, replyText, message}` | [[_system/integrations/gemini-chatgpt-web]] |
| browser (블로그) | `server/browser/blogPost.ts:149-201` | Claude in Chrome + `--add-dir` 이미지 폴더 | medium / 45분 | 임시저장까지만·발행 금지, 조각 순서대로 paste/file_upload, 대체 텍스트, 플랫폼 안내, 탭은 남겨 둠 | `{status, message, imagesInserted, problems}` | [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]] |
| recommend | `server/recommend.ts:70-187` | WebSearch, WebFetch | high / 20분 | 최근 2주 뉴스·최근 통계·공고, 일정 임박·제도 변화 우선, 근거 필수, WebFetch 최대 3번, 10~12개, 이미 쓴 글과 같은 의도 제외 | `{anchorKeyword, candidates[]}` | [[topic/business-rules/BR-TOP-001 추천 후보 조건]] |
| check (연결 확인) | `server/routes/browser.ts:33-47` | Claude in Chrome | low / 90초, haiku | `tabs_context_mcp`를 createIfEmpty false로 한 번만 호출, 이동·클릭 금지 | `{connected, detail}` | [[publishing/flows/Claude in Chrome 연결 확인 플로우]] |
| check (한도 확인) | `server/routes/usage.ts:19-27` | 없음 | low / 60초, haiku | "ok=true" 응답 | `{ok}` | [[usage/flows/사용량 확인 플로우]] |

## 바깥 변화에 취약한 지점
- CLI 플래그(`--json-schema`, `--chrome`, `--strict-mcp-config`, `--effort`)와 stream-json 이벤트 이름(`rate_limit_event`, `rate_limit_info.unifiedWindows.five_hour` 등)에 의존.
- 모델 별칭(`fable`, `opus`, `sonnet`, `haiku`)을 CLI가 최신 모델로 바꿔 준다는 전제 (`blog-writer:src/labels.ts:63`).
