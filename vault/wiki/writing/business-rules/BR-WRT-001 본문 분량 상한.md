---
type: business-rule
domain: writing
id: BR-WRT-001
name: 본문 분량 상한
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/length.ts:3-4
  - blog-writer:server/writer.ts:14-17
  - blog-writer:server/writer.ts:151-155
  - blog-writer:server/writer.ts:185-214
  - blog-writer:src/job/JobDetail.tsx:270-273
  - blog-writer:tests/shared.test.ts:24-49
  - blog-writer:rules/default-writing-rules.md:18
entities: [Post]
updated: 2026-10-07
---
# BR-WRT-001 본문 분량 상한

## 규칙
블로그 본문은 공백 포함 **3,000자**를 넘지 않게 쓴다. 제목·이미지·"참고 자료" 목록·태그는 세지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 처음 작성 | 프롬프트가 3,000자 이하, 목표 2,300~2,800자로 지시. 정보가 많으면 덜 중요한 섹션을 빼고 omittedItems에 "분량 때문에 뺌" |
| 작성 결과가 3,000자 초과 | Claude에게 "2,500자 안팎으로 줄여" 다시 쓰게 함. 사실·숫자·날짜·출처·도입부·핵심 요약·참고 자료·이미지 블록은 유지. **최대 2번** |
| 2번 줄인 뒤에도 초과 | 그대로 두고 로그 "초안 화면에서 직접 줄여 주세요" |
| 화면에서 3,000자 초과 | 글자수 칩이 "분량 초과"로 빨갛게. 임시저장은 막지 않음 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 상수 | `MAX_BODY_CHARS` | 3000 | `blog-writer:shared/length.ts:4` |
| 프롬프트(작성) | 지시 | ≤3,000, 목표 2,300~2,800 | `blog-writer:server/writer.ts:14-17` |
| 서버 | 줄이기 재요청 | 초과 시 최대 2회, 목표 2,500 | `blog-writer:server/writer.ts:185-214` |
| 화면 | 경고만 | 3,000 초과 시 "분량 초과" | `blog-writer:src/job/JobDetail.tsx:270-273` |
| 테스트 | 상한 값 3,000 확인 | | `blog-writer:tests/shared.test.ts:48` |
| 규칙 문서 | 문장 | 공백 포함 3,000자 이하 | `blog-writer:rules/default-writing-rules.md:18` |

값은 모두 3,000으로 같다. 강제 수준만 다르다(서버는 재작성 시도, 화면은 경고).

## 예외 / 경계값
- 3,000자를 넘는 초안도 블로그 임시저장은 막지 않는다. 화면 경고만 하고 사용자가 판단한다 (2026-10-05 결정).
- 정확히 3,000자는 허용 (`chars <= MAX_BODY_CHARS`).
- 글자수 계산은 [[writing/business-rules/BR-WRT-002 본문 글자수 계산]].
- 줄이기 호출도 `writing` 단계 모델을 쓴다.

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 초과 시 경고만 하는 동작을 의도로 확정 (코드 변경 없음) | |
