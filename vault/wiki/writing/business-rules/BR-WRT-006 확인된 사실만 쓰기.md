---
type: business-rule
domain: writing
id: BR-WRT-006
name: 확인된 사실만 쓰기
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:rules/default-writing-rules.md:40-52
  - blog-writer:server/writer.ts:stripUpdateLines
  - blog-writer:server/writer.ts:isCompleteTable
entities: [글, 글 블록]
updated: 2026-11-02
---
# BR-WRT-006 확인된 사실만 쓰기

## 규칙
글에 쓰는 모든 사실(날짜·금액·자격·위치 등)은 이번 작업에서 웹 검색·페이지 열람으로 확인한 자료에서만 가져온다. **찾지 못한 항목은 본문에서 아예 뺀다.** 지어내지 않고 "확인하지 못했어요" 같은 문구도 쓰지 않으며 빈 표 칸·"-"·"미정"도 남기지 않는다. 뺀 항목은 `omittedItems`로 사용자에게만 알린다. 자료끼리 다르면 하나를 고르지 않고 차이를 적고 "공고문 확인 필요"로 표시한다. 글 끝에 "참고 자료"(링크 포함)를 넣고, "최종 업데이트" 같은 날짜 표시줄은 넣지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 표에 빈 칸·`-`·`–`·`—`·미정·확인 중·없음이 있는 행 | 그 행 제거(칸 수가 다른 행도 제거) |
| 남은 행이 없는 표 | 표 자체 제거 |
| 40자 이하 문단이 "(최종/마지막) 업데이트·수정·갱신·작성·확인 (일/날짜) : 2026.…" 모양 | 문단 제거(`stripUpdateLines`) |
| 직접 계산한 값 | 계산 근거와 "계산값" 표시(프롬프트 지시) |
| 사용자가 준 링크 | 내용을 빠짐없이 확인해 반영(프롬프트·조사 단계) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 규칙 문서 | "5. 확인된 내용만 사용" | 위 규칙 전체 | `blog-writer:rules/default-writing-rules.md:40-52` |
| 프롬프트 | `BASE_SYSTEM`의 omittedItems 지시 | 빼고 알리기 | `blog-writer:server/writer.ts:50-80` |
| 서버 | `isCompleteTable`, `stripUpdateLines` | 코드로 강제 | `blog-writer:server/writer.ts` |
| 서버 | 글 저장 라우트, 고치기 결과 | 저장·적용 때도 불완전 표 제거 | `blog-writer:server/routes/jobs.ts`, `server/editPost.ts` |
| 테스트 | 날짜 표시줄 제거, 표 정리 | | `blog-writer:tests/writer.test.ts:6-28` |

## 예외 / 경계값
- 사실 확인 자체는 프롬프트로만 지시한다. 코드가 검사하는 것은 표·날짜 표시줄뿐이다(`confidence: medium`).

## 영향받는 플로우
[[writing/flows/초안 작성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
