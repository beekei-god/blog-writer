---
type: business-rule
domain: publishing
id: BR-PUB-001
name: 발행하지 않고 임시저장까지만 (워드프레스 API 예외)
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/browser/blogPost.ts:148-152
  - blog-writer:server/browser/claudeChrome.ts:104-105
  - blog-writer:server/browser/blogPost.ts:69-88
  - blog-writer:server/browser/userChrome.ts:469-482
  - blog-writer:server/browser/adapters.ts:167-178
  - blog-writer:server/browser/runner.ts:86-93
  - blog-writer:server/routes/jobs.ts:121-138
  - blog-writer:src/job/NextStep.tsx:116-152
  - blog-writer:src/job/NextStep.tsx:194-198
entities: [블로그 설정]
updated: 2026-10-07
---
# BR-PUB-001 발행하지 않고 임시저장까지만 (워드프레스 API 예외)

## 규칙
**크롬으로 올리는 블로그(네이버·티스토리)**에는 글쓰기 화면에 제목·본문·이미지·태그를 넣고 **임시저장까지만** 한다. 발행(공개)은 하지 않으며, 사용자가 크롬에서 확인하고 직접 발행한다. 작업이 끝나도 블로그 탭·창은 닫지 않고 남겨 둔다.

**워드프레스는 예외**다. REST API로 올리므로 사용자가 **임시저장 / 예약발행 / 자동발행** 중에서 고를 수 있다. 예약발행·자동발행은 실제로 공개되므로 화면이 확인 창을 띄운 뒤에만 보낸다 → [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]].

## 조건과 결과
| 경로 | 저장 동작 | 탭/창 |
|---|---|---|
| Claude in Chrome (네이버·티스토리) | 프롬프트: "임시저장까지 한 뒤 멈춤. 절대 발행하지 마세요", 플랫폼별 임시저장 버튼 안내(발행 버튼 아님) | 닫지 말고 둠 |
| 평소 크롬(네이버) | `save_btn` 클릭 후 저장 횟수 변화나 "임시저장이 완료" 토스트를 15초 확인 | 열어 둠 |
| 앱 전용 크롬 (네이버·티스토리) | 플랫폼별 임시저장 버튼을 마우스로 클릭, 못 찾으면 오류 "직접 저장해 주세요" | `keepOpen: true` |
| 네이버·티스토리에 `mode`가 `draft`가 아닌 요청 | 400 "예약발행·자동발행은 워드프레스에서만 쓸 수 있습니다." | |
| 워드프레스 API | `draft`→사이트 초안, `schedule`→예약(`future`), `publish`→즉시 공개 | 크롬 안 씀 |
| 성공(크롬) | 상태 `posted`, 화면 "<블로그>에 임시저장했습니다. 크롬 창에서 내용을 확인하고 직접 발행하세요." | |
| 성공(워드프레스) | 사이트가 돌려준 상태대로 `posted`/`scheduled`/`published` → [[publishing/flows/워드프레스 API 등록 플로우]] | |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 프롬프트(블로그) | 발행 금지, 탭 유지 | `blog-writer:server/browser/blogPost.ts:148-152` |
| 프롬프트(공통) | 되돌리기 어려운 동작(글 발행 포함) 금지 | `blog-writer:server/browser/claudeChrome.ts:105` |
| 프롬프트(플랫폼 안내) | 임시저장 버튼만 안내. 워드프레스 안내는 없음 | `blog-writer:server/browser/blogPost.ts:69-88` |
| 서버(AppleScript) | 저장 버튼만 | `blog-writer:server/browser/userChrome.ts:469-482` |
| 서버(Playwright) | 임시저장 버튼만 | `blog-writer:server/browser/adapters.ts:167-178`, `:268-272`, `:378` |
| 서버(API 검사) | 크롬 블로그는 `draft`만 허용 | `blog-writer:server/routes/jobs.ts:132-134` |
| 서버(워드프레스) | 모드별 상태 → [[_system/integrations/wordpress-rest]] | `blog-writer:server/wordpress.ts:252`, `blog-writer:server/pipeline.ts:276-310` |
| 화면 | 크롬 블로그는 "임시저장" 버튼만, 워드프레스는 등록 방식 선택 + 예약·자동발행 확인 창 | `blog-writer:src/job/NextStep.tsx:116-152`, `:194-198` |

## 예외 / 경계값
- Claude in Chrome 경로는 프롬프트로만 막는다(코드가 발행 버튼을 막지는 않음).
- 크롬 블로그의 "다시 임시저장"은 새 글로 한 번 더 넣는다. 이전 임시저장 글을 고치지 않는다 (경로마다 새 글쓰기 화면을 열고 이어쓰기 팝업은 취소). 화면이 이 사실을 안내하고 이전 글은 블로그에서 직접 지우라고 알린다 (`blog-writer:src/job/NextStep.tsx:123`).
- 워드프레스의 "다시 등록"은 같은 글을 갱신한다 → [[publishing/business-rules/BR-PUB-016 워드프레스 재등록은 같은 글 갱신]].
- 크롬 경로 코드는 워드프레스가 들어오면 바로 오류를 낸다 ("워드프레스는 크롬이 아니라 REST API로 올립니다.", `blog-writer:server/browser/blogPost.ts:125`, `blog-writer:server/browser/runner.ts:87`).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 다시 임시저장은 새 글이 생기는 동작을 유지하고 화면에 안내 추가 | |
| 2026-10-07 | 워드프레스는 REST API로 올리고 임시저장·예약발행·자동발행을 고를 수 있게 됨 (예약·자동은 확인 창). 크롬 블로그는 계속 임시저장만, 서버가 `draft` 외 요청을 400으로 거절. 워드프레스 크롬 경로 삭제 | `blog-writer:server/routes/jobs.ts:121-138`, `blog-writer:server/pipeline.ts:261-310` |
