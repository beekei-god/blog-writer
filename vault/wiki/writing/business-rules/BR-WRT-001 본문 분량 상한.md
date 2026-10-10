---
type: business-rule
domain: writing
id: BR-WRT-001
name: 본문 분량 목표와 상한
aliases: [본문 분량 상한]
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/length.ts:3-19
  - blog-writer:shared/types.ts:58-67
  - blog-writer:server/schema.ts:71-74
  - blog-writer:server/writer.ts:21-37
  - blog-writer:server/writer.ts:173-180
  - blog-writer:server/writer.ts:213-245
  - blog-writer:server/editPost.ts:85
  - blog-writer:server/routes/jobs.ts:47-81
  - blog-writer:server/store.ts:20-23
  - blog-writer:src/WritingPicker.tsx:13-58
  - blog-writer:src/job/JobDetail.tsx:199-200
  - blog-writer:src/job/JobDetail.tsx:302-305
  - blog-writer:src/job/EditByPrompt.tsx:54
  - blog-writer:tests/shared.test.ts:53-65
  - blog-writer:tests/writingOptions.test.ts:35-76
  - blog-writer:tests/api.test.ts:86-97
  - blog-writer:rules/default-writing-rules.md:18
entities: [Job, Post]
updated: 2026-10-10
---
# BR-WRT-001 본문 분량 목표와 상한

## 규칙
본문 분량은 **글마다 고른 목표 글자수**(공백 포함 근사값)를 따른다. 새 글을 만들 때 프리셋(짧게 ≈1,500 / 보통 ≈2,500 / 길게 ≈4,000 / 아주 길게 ≈6,000)을 고르거나 1,000~8,000자 사이 숫자를 직접 넣는다. **상한은 목표의 1.2배**(100자 단위 반올림)이고, 처음 쓸 때는 목표의 ±10% 범위를 지시한다. 제목·이미지·"참고 자료" 목록·태그는 세지 않는다.

분량을 고르지 않은 예전 작업(`writingOptions` 없음)은 기본 목표 2,500자 → 범위 2,300~2,800자, 상한 3,000자로, 2026-10-10 전의 고정 상한과 같다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 새 글 만들기 | 목표 `targetChars`(정수 1,000~8,000)를 받는다. 범위 밖이면 400 "본문 분량은 1,000~8,000자 사이로, 말투는 목록에서 고르세요." (화면도 같은 범위로 검사하고 시작 버튼을 막음) |
| 요청에 분량·말투가 없음 | 마지막으로 쓴 값(`Settings.writing`)을 쓴다. 처음 기본값은 2,500자·정보형 |
| 새 글을 만들 때마다 | 고른 분량·말투를 다음 새 글의 기본값으로 기억한다 (설정 화면에서 저장해도 지워지지 않음) |
| 처음 작성 | 프롬프트: "약 N자, 목표의 0.9~1.1배로 쓰고 1.2배를 넘기지 마세요. 글쓰기 규칙에 적힌 분량보다 이 목표가 우선". 정보가 많으면 덜 중요한 섹션을 빼고 omittedItems에 "분량 때문에 뺌". 확인된 자료가 모자라면 지어내거나 되풀이하지 말고 짧게 끝내게 함 |
| 작성 결과가 상한(1.2배) 초과 | Claude에게 "목표 N자 안팎으로 줄여" 다시 쓰게 함. 사실·숫자·날짜·출처·도입부·핵심 요약·참고 자료·이미지 블록은 유지. **최대 2번** |
| 2번 줄인 뒤에도 초과 | 그대로 두고 로그 "초안 화면에서 직접 줄여 주세요" |
| 결과가 목표 범위 아래(0.9배 미만) | 늘려 쓰지 않는다. 로그 "목표(약 N자)보다 짧습니다. 확인된 자료가 부족하면 짧아질 수 있습니다." |
| 화면 | 글자수 칩 "본문 x / 목표 약 N자", 상한을 넘으면 "분량 초과"로 빨갛게. 임시저장은 막지 않음 |
| 프롬프트로 글 고치기 | 그 작업의 상한을 넘기지 말라고 지시, 넘어도 경고만 → [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]] |

| 목표 | 처음 작성 범위 (±10%) | 상한 (1.2배) |
|---|---|---|
| 1,500 | 1,400~1,700 | 1,800 |
| 2,500 (기본) | 2,300~2,800 | 3,000 |
| 4,000 | 3,600~4,400 | 4,800 |
| 6,000 | 5,400~6,600 | 7,200 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 상수·계산 | `DEFAULT_TARGET_CHARS`, `MIN/MAX_TARGET_CHARS`, `LENGTH_PRESETS`, `maxBodyChars`, `targetRange`, `targetCharsOf` | 기본 2,500, 1,000~8,000, 상한 1.2배, 범위 ±10% | `blog-writer:shared/length.ts:3-19` |
| 공용 타입 | `WritingOptions{targetChars, tone}`, `Job.writingOptions`, `Settings.writing` | | `blog-writer:shared/types.ts:58-67`, `:161`, `:364` |
| 서버(요청 검사) | `WritingOptionsSchema`, `POST /api/jobs` | 정수 1,000~8,000, 없으면 기억한 값, 기억값 저장 | `blog-writer:server/schema.ts:71-74`, `blog-writer:server/routes/jobs.ts:47-81` |
| 서버(설정) | 기본값·병합, 설정 저장 시 유지 | 2,500·정보형 | `blog-writer:server/store.ts:20-23`, `:38`, `blog-writer:server/routes/settings.ts:25`, `:46` |
| 프롬프트(작성) | 분량 지시 | 목표·범위·상한, 규칙보다 우선 | `blog-writer:server/writer.ts:21-37` |
| 서버(줄이기) | `enforceLength` | 상한 초과 시 최대 2회, 목표로 | `blog-writer:server/writer.ts:213-245` |
| 서버(짧을 때) | 로그만 | 범위 아래면 알림 | `blog-writer:server/writer.ts:173-180` |
| 프롬프트(고치기) | 상한 지시 | 그 작업의 상한 | `blog-writer:server/editPost.ts:85` |
| 화면(새 글) | `WritingPicker` | 프리셋 + 직접 입력, 같은 범위 검사 | `blog-writer:src/WritingPicker.tsx:13-58`, `blog-writer:src/NewJob.tsx:100-108` |
| 화면(초안) | 글자수 칩 | "목표 약 N자", 상한 초과 시 "분량 초과" | `blog-writer:src/job/JobDetail.tsx:199-200`, `:302-305` |
| 화면(고치기 비교) | 상한 경고 | 제안이 다시 쓰기면 새 목표의 상한 | `blog-writer:src/job/EditByPrompt.tsx:54`, `:175-177` |
| 테스트 | 기본값·범위·상한, 프롬프트 반영, 줄이기 조건, 요청 검사, 기억값 유지 | | `blog-writer:tests/shared.test.ts:53-65`, `blog-writer:tests/writingOptions.test.ts:35-76`, `blog-writer:tests/api.test.ts:86-97`, `blog-writer:tests/editPost.test.ts:78-86` |
| 규칙 문서 | 문장 | "글마다 고른 목표 분량(기본 2,500자 안팎)에 맞추고 목표의 1.2배를 넘기지 않음" | `blog-writer:rules/default-writing-rules.md:18` |

값은 모든 레이어가 `shared/length.ts`를 쓰므로 같다. 강제 수준만 다르다(서버는 줄여 다시 쓰기, 화면은 경고).

## 예외 / 경계값
- 상한을 넘는 초안도 블로그 임시저장은 막지 않는다. 화면 경고만 하고 사용자가 판단한다 (2026-10-05 결정).
- 정확히 상한은 허용 (`chars <= max`).
- 목표보다 짧은 글은 다시 쓰지 않는다. 자료가 부족할 때 지어내지 않게 하려는 것이다 ([[writing/business-rules/BR-WRT-003 확인된 사실만 사용]]).
- 화면에서 저장한 **수정본 글쓰기 규칙**에 "3,000자 이하" 같은 문장이 남아 있어도, 프롬프트가 "고른 목표가 규칙보다 우선"이라고 지시한다. 실제 Claude가 그대로 따르는지는 확인하지 않았다 → [[writing/open-questions]] #14.
- 기존 글의 분량은 "분량·말투 바꿔 다시 쓰기"로 바꿀 수 있고, 적용하면 그 글의 목표가 바뀐다 → [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]].
- 글자수 계산은 [[writing/business-rules/BR-WRT-002 본문 글자수 계산]].
- 줄이기 호출도 `writing` 단계 모델을 쓴다.

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]], [[writing/flows/프롬프트로 글 고치기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 (고정 상한 3,000자, 목표 2,300~2,800자) | |
| 2026-10-05 | 초과 시 경고만 하는 동작을 의도로 확정 (코드 변경 없음) | |
| 2026-10-10 | 고정 3,000자 → **글마다 고르는 목표**(1,000~8,000, 프리셋 4개), 상한은 목표의 1.2배, 범위는 ±10%, 줄이기 목표도 고른 값. 마지막 값 기억. 예전 작업은 2,500/3,000 그대로. 규칙 이름을 "본문 분량 목표와 상한"으로 바꿈 (사용자 결정: 고정 상한을 글마다 목표로 대체) | 커밋 afc7c10, `blog-writer:shared/length.ts:3-19` |
