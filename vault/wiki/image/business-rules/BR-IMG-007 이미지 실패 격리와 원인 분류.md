---
type: business-rule
domain: image
id: BR-IMG-007
name: 이미지 실패 격리와 원인 분류
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/images/index.ts:67-133
  - blog-writer:server/images/errors.ts:1-15
  - blog-writer:shared/imageErrors.ts:1-109
  - blog-writer:server/pipeline.ts:299-303
  - blog-writer:src/job/images.tsx:9-35
  - blog-writer:server/images/webAi.ts:244-265
  - blog-writer:server/images/api.ts:25-40
entities: [ImageSpec]
updated: 2026-10-08
---
# BR-IMG-007 이미지 실패 격리와 원인 분류

## 규칙
이미지 하나가 실패해도 글 전체를 실패시키지 않는다. 실패한 이미지에 원문 메시지·원인·AI를 기록하고 다음 이미지로 넘어간다. 원인은 14종으로 나눈다. 화면은 **실패한 이미지 자리에 실제 오류 메시지의 첫 줄(실패 이유)과 원인별 해결 안내**를 보여 주고, 사용자는 그 이미지의 "이미지 다시 생성"으로 한 장씩 다시 만든다.

## 원인 종류
| kind | 제목 | 주된 판단 근거 |
|---|---|---|
| extension | Claude in Chrome이 연결되지 않았습니다 | 확장 미설치/미연결 오류, 메시지에 "Claude in Chrome" |
| login | 로그인이 필요합니다 | 웹 AI가 login_required, 메시지에 로그인 URL |
| refused | 요청이 거절되었습니다 | 웹 AI가 refused, 정책·가이드라인·"만들 수 없" 등 |
| limit | 생성 한도를 다 썼습니다 | usage limit, quota, 한도, "나중에 다시" 등 |
| timeout | 응답이 너무 오래 걸렸습니다 | "생성 시간이 초과" |
| ui_changed | 화면에서 진행하지 못했습니다 | 웹 AI가 failed로 보고했고 다운로드 폴더·이미지 URL에서도 파일을 못 찾음, Playwright 셀렉터 대기 초과 |
| download | 이미지를 저장하지 못했습니다 | 다운로드·URL 회수 실패 |
| browser_missing | 크롬을 찾을 수 없습니다 | Playwright 실행 파일 없음 |
| browser_busy | 크롬이 사용 중입니다 | ProcessSingleton, SingletonLock |
| browser_closed | 크롬 탭이 닫혔습니다 | Target closed |
| svg_invalid | 그림 형식이 올바르지 않습니다 | SVG 검증 실패 |
| claude_error | Claude 호출에 실패했습니다 | "claude CLI", "구조화된 결과" (한도 문구가 있으면 limit) |
| api_error | 이미지 API 호출에 실패했습니다 | Gemini·OpenAI 이미지 API의 잘못된 키(401·403 등)·그 밖 오류·이미지 없는 응답 (API 한도는 limit, 거절은 refused) → [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]] |
| unknown | 알 수 없는 오류 | 그 밖 |

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `ImageGenError`(원인을 알고 던짐) | 그 kind |
| 웹 AI가 `failed`로 보고했지만 다운로드 폴더에 이번 이미지(`blogwriter-<이름>`)가 있거나 이미지 URL로 받을 수 있음 | 실패가 아니라 성공 (파일 사용) |
| 그 밖 오류 | `classifyImageError(message)`로 분류 (위 순서대로 정규식) |
| 실패 | `file` 삭제, `error`·`errorKind`·`errorProvider` 기록, 로그 "썸네일 생성 실패 — 제목: 메시지 첫 줄" |
| 사용자 중지 | 실패로 기록하지 않음, 만든 이미지는 유지 |
| 모든 대상 처리 후 실패 있음 | 로그 "이미지 N개 생성 실패 — 초안 화면의 각 이미지에서 이유를 확인하고 '이미지 다시 생성'으로 한 장씩 다시 만들 수 있습니다." |
| 화면에서 저장된 kind가 `unknown` | 메시지로 다시 분류 (분류 규칙이 늘었을 수 있음) |
| 화면 표시 | 이미지 자리에 "⚠ 실패 이유 (AI)"와 그 원인의 안내. 실패 이유는 오류 메시지 첫 줄, 없으면 원인 제목 |
| API 실패 | 크롬으로 저절로 넘기지 않고 실패로 기록 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | 종류·안내·분류 | `blog-writer:shared/imageErrors.ts:2-104` |
| 서버 | `ImageGenError`, `errorKindOf`, `fail`, `record`, API 오류 분류 `apiError` | `blog-writer:server/images/errors.ts:4-15`, `blog-writer:server/images/index.ts:34-61`, `:102-107`, `blog-writer:server/images/api.ts:25-40` |
| 화면 | 이미지 자리에 실패 이유·안내, 재분류 | `blog-writer:src/job/images.tsx:9-35` |
| 테스트 | 메시지별 분류, 웹 AI `failed`여도 받아진 파일 회수·없으면 `ui_changed`, API 오류별 원인(limit·refused·api_error) | `blog-writer:tests/shared.test.ts:136-147`, `blog-writer:tests/webAi.test.ts:20-42`, `blog-writer:tests/imageApi.test.ts` |

## 예외 / 경계값
- 이미지 대신 글로 답한 경우는 Claude가 판단한 status(`refused`/`limit`)로 구분한다. 쓰이지 않던 `classifyReply`는 2026-10-05 삭제했다.

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]], [[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 미사용 `classifyReply` 삭제 | `blog-writer:shared/imageErrors.ts` |
| 2026-10-07 | 웹 AI가 `failed`로 보고해도 다운로드 폴더·이미지 URL을 먼저 확인해, 받아진 파일이 있으면 성공 처리 (이전엔 곧바로 `ui_changed`). 원인 분류표의 `ui_changed` 조건이 좁아짐 | `blog-writer:server/images/webAi.ts:265-274`, `blog-writer:tests/webAi.test.ts` |
| 2026-10-07 | 리팩터링: 오류 메시지 꺼내기를 공용 `errorText`로, 화면 코드를 `src/job/images.tsx`로 이동. 동작 변화 없음 | `blog-writer:shared/labels.ts:24` |
| 2026-10-08 | 원인 `api_error` 추가 (13종 → 14종). 화면 표시를 원인 제목 → 실제 실패 이유(오류 메시지 첫 줄)로. 위쪽 "이미지 N개를 만들지 못했습니다" 묶음 안내와 그 안의 Claude in Chrome 연결 상태 표시 삭제, 안내는 이미지 자리에 표시. 로그 안내 문구가 "이미지 다시 생성"으로 한 장씩 다시 만들라는 내용으로 바뀜 | 커밋 38ae96c |
