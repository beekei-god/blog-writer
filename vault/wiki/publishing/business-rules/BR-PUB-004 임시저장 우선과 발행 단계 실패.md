---
type: business-rule
domain: publishing
id: BR-PUB-004
name: 임시저장 우선과 발행 단계 실패
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/browser/publish.ts:1-120
  - blog-writer:server/pipeline.ts:doPost
entities: [블로그별 상태]
updated: 2026-11-02
---
# BR-PUB-004 임시저장 우선과 발행 단계 실패

## 규칙
크롬으로 올리는 블로그(네이버·티스토리)는 임시저장·예약발행·즉시발행 모두 **먼저 임시저장을 끝낸 뒤** 발행 창을 연다. 발행 창은 클래스 이름이 자주 바뀌므로 화면 글자(발행·예약·공개)로 찾는다. 필수 단계가 안 되면 멈추고 `PublishStepError`를 내며, 글은 블로그에 임시저장된 채로 남고 앱은 상태를 임시저장(`posted`)으로 두고 이유를 남긴다. 카테고리·주제 고르기는 optional이라 안 돼도 멈추지 않고 "확인 필요"로 남긴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 필수 단계 실패(ERR) | 즉시 멈춤, 임시저장은 됐다고 알림, 발행 창 구조(버튼·입력 칸·짧은 글자, 글 본문 제외)를 로그에 남겨 다음 수정에 씀 |
| optional 단계 실패 | 다음 단계로 진행, "확인 필요" + 화면 구조 로그 |
| 발행 버튼을 누르기 전 중지 | 멈춤 |
| 발행 버튼을 누른 뒤 중지 | 끝까지 확인 |
| 발행 확인이 안 됨 | "블로그에서 직접 확인하세요" |
| 그 외 실패 | 작업 `draft_ready` + 오류, "크롬에 일부만 들어갔을 수 있으니 확인하세요" |
| 결제·구독·설정 변경·로그인 | Claude in Chrome 규칙상 하지 않고 로그인 화면이면 멈춤(`login_required`) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `PublishStepError`, `runPublishSteps`, `PUBLISH_DUMP_JS` | 단계 실행·구조 덤프 | `blog-writer:server/browser/publish.ts` |
| 프롬프트 | `BROWSER_RULES`, `publishPrompt` | Claude in Chrome 지시 | `blog-writer:server/browser/claudeChrome.ts`, `publish.ts` |
| 서버 | `doPost` catch | 상태 처리 | `blog-writer:server/pipeline.ts:495-512` |
| 테스트 | 단계 실행, 중지 시점, 화면 구조 덤프, 날짜 선택 | | `blog-writer:tests/publish.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 발행 창 단계는 블로그 화면에 의존한다. 화면이 바뀌면 `publish.ts`, `category.ts`의 단계 스크립트와 `tests/publish.test.ts`의 문법 검사를 함께 고친다 → [[_system/known-issues]]

## 영향받는 플로우
[[publishing/flows/블로그에 올리기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
