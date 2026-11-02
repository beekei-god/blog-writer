---
type: business-rule
domain: writing
id: BR-WRT-003
name: 글 형식과 경험 메모
status: active
confidence: medium
consistency: single-source
source:
  - blog-writer:server/writer.ts:24-46
  - blog-writer:server/experience.ts:1-41
  - blog-writer:shared/types.ts:63-75
entities: [글쓰기 옵션]
updated: 2026-11-02
---
# BR-WRT-003 글 형식과 경험 메모

## 규칙
글 형식은 정보 제공(info)과 리뷰(review) 중에서 고를 수 있다(안 골라도 된다). 리뷰는 글쓴이가 쓴 **경험 메모**(최대 1,500자)에 있는 내용만 후기로 쓰고, 메모가 없으면 경험담을 지어내지 않는다. 경험 메모 초안은 웹 조사로 장단점·특징을 평가 문장으로 채워 주되, 사용 기간·구매 경위·실제 겪은 일은 지어내지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 형식 미선택 | 형식 지시 없음 |
| 정보 제공 / 리뷰 선택 | 각 형식의 구성 지시(`FORMAT_GUIDE`)를 프롬프트에 넣음 |
| 리뷰 + 경험 메모 있음 | 그 내용만 후기의 근거로 쓰게 함 |
| 리뷰 + 경험 메모 없음 | 경험담을 지어내지 않게 함 |
| 경험 메모 > 1,500자 | 작업 만들기 거절 |
| 경험 메모 초안 요청 | 줄마다 `- `로 시작하는 8~10줄: 소개 1 → 좋은 점 3 → 아쉬운 점 3 → 추천 대상 1 → 맞지 않는 대상 1 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트 | `FORMAT_GUIDE`, `formatSection` | 형식별 구성·경험 메모 규칙 | `blog-writer:server/writer.ts:24-46` |
| 서버 | `draftExperienceMemo` | WebSearch/WebFetch, medium, 8분 | `blog-writer:server/experience.ts` |
| 서버 | `POST /api/experience-draft` | 주제 2~300자 | `blog-writer:server/routes/jobs.ts` |
| 공용 | `MAX_EXPERIENCE_CHARS` | 1,500 | `blog-writer:shared/types.ts:66` |
| 테스트 | 형식 지시, 경험 메모 유무 | | `blog-writer:tests/writer.test.ts:74-100` |

## 예외 / 경계값
- 경험 메모는 이 글에만 쓰고 설정의 기본값으로 기억하지 않는다([[writing/entities/글쓰기 옵션]]).
- 프롬프트로만 지키는 규칙이라 `confidence: medium`(결과를 코드로 검사하지 않음).

## 영향받는 플로우
[[writing/flows/초안 작성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
