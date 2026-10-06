---
type: business-rule
domain: image
id: BR-IMG-007
name: 이미지 실패 격리와 원인 분류
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/images/index.ts:64-120
  - blog-writer:server/images/errors.ts:1-15
  - blog-writer:shared/imageErrors.ts:1-104
  - blog-writer:server/pipeline.ts:254-258
  - blog-writer:src/job/images.tsx:14-16
entities: [ImageSpec]
updated: 2026-10-07
---
# BR-IMG-007 이미지 실패 격리와 원인 분류

## 규칙
이미지 하나가 실패해도 글 전체를 실패시키지 않는다. 실패한 이미지에 원문 메시지·원인·AI를 기록하고 다음 이미지로 넘어간다. 원인은 13종으로 나눠 사용자에게 무엇이 문제이고 어떻게 하면 되는지 보여 준다.

## 원인 종류
| kind | 제목 | 주된 판단 근거 |
|---|---|---|
| extension | Claude in Chrome이 연결되지 않았습니다 | 확장 미설치/미연결 오류, 메시지에 "Claude in Chrome" |
| login | 로그인이 필요합니다 | 웹 AI가 login_required, 메시지에 로그인 URL |
| refused | 요청이 거절되었습니다 | 웹 AI가 refused, 정책·가이드라인·"만들 수 없" 등 |
| limit | 생성 한도를 다 썼습니다 | usage limit, quota, 한도, "나중에 다시" 등 |
| timeout | 응답이 너무 오래 걸렸습니다 | "생성 시간이 초과" |
| ui_changed | 화면에서 진행하지 못했습니다 | 웹 AI가 failed, Playwright 셀렉터 대기 초과 |
| download | 이미지를 저장하지 못했습니다 | 다운로드·URL 회수 실패 |
| browser_missing | 크롬을 찾을 수 없습니다 | Playwright 실행 파일 없음 |
| browser_busy | 크롬이 사용 중입니다 | ProcessSingleton, SingletonLock |
| browser_closed | 크롬 탭이 닫혔습니다 | Target closed |
| svg_invalid | 그림 형식이 올바르지 않습니다 | SVG 검증 실패 |
| claude_error | Claude 호출에 실패했습니다 | "claude CLI", "구조화된 결과" (한도 문구가 있으면 limit) |
| unknown | 알 수 없는 오류 | 그 밖 |

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `ImageGenError`(원인을 알고 던짐) | 그 kind |
| 그 밖 오류 | `classifyImageError(message)`로 분류 (위 순서대로 정규식) |
| 실패 | `file` 삭제, `error`·`errorKind`·`errorProvider` 기록, 로그 "썸네일 생성 실패 — 제목: 메시지 첫 줄" |
| 사용자 중지 | 실패로 기록하지 않음, 만든 이미지는 유지 |
| 모든 대상 처리 후 실패 있음 | 로그 "이미지 N개 생성 실패 — 초안 화면에서 이유를 확인하고 다른 AI로 다시 만들 수 있습니다." |
| 화면에서 저장된 kind가 `unknown` | 메시지로 다시 분류 (분류 규칙이 늘었을 수 있음) |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | 종류·안내·분류 | `blog-writer:shared/imageErrors.ts:2-104` |
| 서버 | `ImageGenError`, `errorKindOf`, `fail`, `record` | `blog-writer:server/images/errors.ts:4-15`, `blog-writer:server/images/index.ts:31-58`, `:98-103` |
| 화면 | 원인별 묶음 안내, 자세한 오류, 재분류 | `blog-writer:src/job/images.tsx:14-16`, `:80-154` |
| 테스트 | 메시지별 분류 | `blog-writer:tests/shared.test.ts:136-147` |

## 예외 / 경계값
- 이미지 대신 글로 답한 경우는 Claude가 판단한 status(`refused`/`limit`)로 구분한다. 쓰이지 않던 `classifyReply`는 2026-10-05 삭제했다.

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]], [[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 미사용 `classifyReply` 삭제 | `blog-writer:shared/imageErrors.ts` |
| 2026-10-07 | 리팩터링: 오류 메시지 꺼내기를 공용 `errorText`로, 화면 코드를 `src/job/images.tsx`로 이동. 동작 변화 없음 | `blog-writer:shared/labels.ts:24` |
