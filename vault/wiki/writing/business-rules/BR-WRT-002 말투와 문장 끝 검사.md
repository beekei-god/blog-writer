---
type: business-rule
domain: writing
id: BR-WRT-002
name: 말투와 문장 끝 검사
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/tone.ts:1-70
  - blog-writer:server/writer.ts:10-22
  - blog-writer:server/writer.ts:enforceTone
entities: [글쓰기 옵션]
updated: 2026-11-02
---
# BR-WRT-002 말투와 문장 끝 검사

## 규칙
글은 사용자가 고른 말투(정보형·친근형·스토리형·정리형)의 문장 끝으로 쓴다. 다 쓴 뒤 서버가 본문 문장 끝을 세어 보고, 어긋나면 사실·구성은 그대로 두고 말투만 고쳐 한 번 다시 쓰게 한다. 말투를 고르지 않은 예전 작업은 검사하지 않는다.

## 조건과 결과
| 말투 | 통과 기준 (문장 끝 비율) |
|---|---|
| 정보형(info) | 합니다체(~니다·~니까) 80% 이상 |
| 친근형(friendly)·스토리형(story) | 해요체(~요·~죠) 80% 이상 |
| 정리형(summary) | 존댓말(합니다체+해요체) 90% 이상이고 그중 한쪽이 80% 이상(섞이지 않게) |
| 세어 볼 문장이 5개 미만 | 판단하지 않음 |
| 명사형으로 끝나는 목록·소제목·표 | 세지 않음 |
| 고쳐 쓴 뒤에도 어긋남 | "아직 다릅니다" 안내만 하고 그대로 둠(재작성은 1번) |

문장 끝 분류: `니다|니까` → 합니다체, `요|죠` → 해요체, `다|네|군|함|임|음` → 반말·평서.

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `endingKind`, `toneStats`, `toneProblem` | 80%/90%/5문장 | `blog-writer:shared/tone.ts` |
| 프롬프트 | `TONE_GUIDE`, `toneSection`, `toneReminder` | 말투별 지시 + 쓴 뒤 다시 확인 | `blog-writer:server/writer.ts:10-48` |
| 서버 | `enforceTone` | 어긋나면 medium effort로 말투만 재작성 1번 | `blog-writer:server/writer.ts:enforceTone` |
| 규칙 문서 | "2. 반드시 존댓말" | 한 글 안에서 해요체/합니다체 통일 | `blog-writer:rules/default-writing-rules.md:9-11` |
| 화면 | 말투 선택, 다시 쓰기 | [[writing/business-rules/BR-WRT-012 분량 말투 다시 쓰기]] | |
| 테스트 | 문장 끝 가르기, 말투별 기준, 5문장 미만 | | `blog-writer:tests/tone.test.ts`, `tests/writer.test.ts` |

## 예외 / 경계값
- 말투 지시는 글쓰기 규칙 문서의 문체보다 우선하되, 존댓말·확인된 사실만 쓰기는 그대로 지킨다.
- 규칙 문서는 "~해요/~입니다 통일"이라고만 하고, 정리형은 두 말투를 섞지 않게 한다 → 같은 말이다.

## 영향받는 플로우
[[writing/flows/초안 작성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
