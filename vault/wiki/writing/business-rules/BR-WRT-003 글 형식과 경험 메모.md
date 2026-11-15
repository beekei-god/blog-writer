---
type: business-rule
domain: writing
id: BR-WRT-003
name: 글 형식과 경험 메모
status: active
confidence: medium
consistency: single-source
source:
  - blog-writer:server/writer.ts:24-47
  - blog-writer:shared/labels.ts:40-46
  - blog-writer:server/experience.ts:1-41
  - blog-writer:shared/types.ts:63-75
entities: [글쓰기 옵션]
updated: 2026-11-15
---
# BR-WRT-003 글 형식과 경험 메모

## 규칙
글 형식은 정보 제공(info), 방법 안내(howto), 리뷰(review) 중에서 고를 수 있다(안 골라도 된다). 형식마다 글의 구성 순서가 정해져 있다. 경험 메모는 리뷰에서만 쓰고, 다른 형식에서는 메모를 넣어도 프롬프트에 넣지 않는다. 리뷰는 글쓴이가 쓴 **경험 메모**(최대 1,500자)에 있는 내용만 후기로 쓰고, 메모가 없으면 경험담을 지어내지 않는다. 경험 메모 초안은 웹 조사로 장단점·특징을 평가 문장으로 채워 주되, 사용 기간·구매 경위·실제 겪은 일은 지어내지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 형식 미선택 | 형식 지시 없음 |
| 정보 제공 / 방법 안내 / 리뷰 선택 | 각 형식의 구성 지시(`FORMAT_GUIDE`)를 프롬프트에 넣음 |
| 정보 제공 | 대상·자격 → 방법·절차 → 일정·금액 → 주의점 → 핵심 요약. 감상·평가 없음 |
| 방법 안내 | 도입(무엇을 할 수 있나) → 준비물·사전 조건 → 번호 붙인 단계(한 단계에 동작 하나) → 확인 방법 → 막히는 곳과 해결 → 다음 할 일·관련 정보. 메뉴·버튼 이름은 확인된 실제 이름만, 확인 안 된 단계는 만들지 않음. 감상·평가 없음 |
| 리뷰 | 도입 → 기본 정보 → 좋았던 점 → 아쉬운 점 → 추천/비추천 대상 → 총평 |
| 정보 제공·방법 안내 + 경험 메모 | 메모를 쓰지 않음 |
| 리뷰 + 경험 메모 있음 | 그 내용만 후기의 근거로 쓰게 함 |
| 리뷰 + 경험 메모 없음 | 경험담을 지어내지 않게 함 |
| 경험 메모 > 1,500자 | 작업 만들기 거절 |
| 경험 메모 초안 요청 | 줄마다 `- `로 시작하는 8~10줄: 소개 1 → 좋은 점 3 → 아쉬운 점 3 → 추천 대상 1 → 맞지 않는 대상 1 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `WritingFormat`, `WRITING_FORMATS` | info, howto, review | `blog-writer:shared/types.ts:63-64` |
| 공용 | `FORMAT_LABEL`, `FORMAT_HINT` | 버튼 이름·설명(정보 제공 / 방법 안내 / 리뷰) | `blog-writer:shared/labels.ts:40-46` |
| 화면 | `WritingPicker` | `WRITING_FORMATS` 순서대로 버튼, 경험 메모 칸은 리뷰일 때만 | `blog-writer:src/WritingPicker.tsx` |
| 서버 | `WritingOptionsSchema.format` | `WRITING_FORMATS`로 검사 | `blog-writer:server/schema.ts:76` |
| 프롬프트 | `FORMAT_GUIDE`, `formatSection` | 형식별 구성·경험 메모 규칙. 다시 쓰기(`editPost`)에도 같은 지시 | `blog-writer:server/writer.ts:24-47` |
| 서버 | `draftExperienceMemo` | WebSearch/WebFetch, medium, 8분 | `blog-writer:server/experience.ts` |
| 서버 | `POST /api/experience-draft` | 주제 2~300자 | `blog-writer:server/routes/jobs.ts` |
| 공용 | `MAX_EXPERIENCE_CHARS` | 1,500 | `blog-writer:shared/types.ts:66` |
| 테스트 | 형식 지시(3종), 경험 메모 유무, 리뷰 외 형식은 메모 무시 | | `blog-writer:tests/writingOptions.test.ts:74-103` |

## 예외 / 경계값
- 경험 메모는 이 글에만 쓰고 설정의 기본값으로 기억하지 않는다([[writing/entities/글쓰기 옵션]]).
- 형식을 추가할 때 같이 볼 곳: `shared/types.ts`(값), `shared/labels.ts`(이름·설명), `server/writer.ts`(`FORMAT_GUIDE`, `Record`라 빠지면 타입 오류), `tests/writingOptions.test.ts`. 화면·서버 검사·다시 쓰기는 자동으로 따라간다. `FORMAT_GUIDE` 문구에는 '결론 먼저'류 표현을 넣으면 안 된다(같은 파일의 '답 먼저 없음' 테스트).
- 프롬프트로만 지키는 규칙이라 `confidence: medium`(결과를 코드로 검사하지 않음).

## 영향받는 플로우
[[writing/flows/초안 작성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
| 2026-11-15 | 방법 안내(howto) 형식 추가, 테스트 근거 경로를 `tests/writingOptions.test.ts`로 바로잡음 | 7d8ac27 |
