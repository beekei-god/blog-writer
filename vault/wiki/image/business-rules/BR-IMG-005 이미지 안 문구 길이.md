---
type: business-rule
domain: image
id: BR-IMG-005
name: 이미지 안 문구 길이
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/writer.ts:96-108
  - blog-writer:server/writer.ts:131-134
  - blog-writer:server/writer.ts:144
  - blog-writer:server/images/plan.ts:97-101
  - blog-writer:server/images/plan.ts:115
  - blog-writer:server/schema.ts:13
  - blog-writer:src/job/PostEditor.tsx:84-96
  - blog-writer:server/images/svg.ts:51-57
  - blog-writer:server/images/styles.ts:21-39
  - blog-writer:rules/default-writing-rules.md:19
entities: [ImageSpec]
updated: 2026-10-12
---
# BR-IMG-005 이미지 안 문구 길이

## 규칙
이미지 안 글자(headline)에 본문에 없는 내용과 과장·낚시성 표현은 금지다. 썸네일과 본문 이미지는 넣는 내용이 다르다.
- **썸네일** (2026-10-12): 독자가 글을 누르기 전에 **궁금해할 질문**을 넣고, **답은 넣지 않는다.** 줄바꿈으로 나눈 1~4줄: 앞 1~2줄은 무엇에 대한 글인지 보여 주는 큰 주제(각 6~14자, 대상·주제어, 제목을 그대로 옮기지 않음), 다음 줄은 본문이 실제로 답하는 질문. 결론·결과·추천, 금액·날짜·수치·자격 조건 같은 본문 내용은 쓰지 않는다. 본문이 답하지 않는 질문도 금지. 예: "2027 전기차 보조금 / 내년에 사면 더 유리할까?" (X: "보조금 최대 650만원", "10월 6일 단 하루")
- **썸네일 근거(basis)**: 그 질문에 답하는 본문 문장.
- **썸네일 장면(prompt)**: 유튜브·블로그 썸네일처럼 시선이 가게, 글의 핵심 대상을 크게. 고민·확인하는 사람, 말풍선, 작은 아이콘은 어울릴 때만. 제목 글자 자리는 단순하게.
- **본문 이미지**: 이해에 도움이 될 때만 4~20자 라벨(핵심 수치·날짜·단계 이름·비교 항목). 본문에 있는 사실로만. 필요 없으면 빈 문자열(글자 없음).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 저장·기획 결과에서 120자 초과 | 120자로 잘라 받음 |
| 썸네일 headline 있음 | 생성 요청에 "줄바꿈 그대로, 한 글자도 바꾸지 말 것". 제목은 크고 굵게(SVG 70~110, 굵기 900, 어두운 테두리·띠), 중요한 단어·숫자는 강조색, 나머지 줄은 말풍선·배지 등 자유 배치 |
| 본문 headline 있음 | 짧은 제목·라벨(SVG 44~72, 700), 그림을 가리지 않는 위치에 띠·상자 |
| headline 없음 | 웹 AI·API에는 "글자 넣지 말 것"(썸네일은 "블로그 썸네일 이미지"로 요청), SVG에는 꼭 필요한 짧은 라벨만 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트(공용 문구) | `THUMBNAIL_HEADLINE_RULE`, `THUMBNAIL_SCENE_RULE`, `BODY_HEADLINE_RULE` — 글 작성과 기획이 같은 문구를 씀 (2026-10-12) | 썸네일 1~4줄·주제 6~14자·질문, 본문 4~20자 | `blog-writer:server/writer.ts:96-108` |
| 프롬프트(작성) | thumbnail 필드·본문 이미지 지시 | | `blog-writer:server/writer.ts:131-134`, `:144` |
| 프롬프트(기획) | 같은 문구 + 썸네일 basis는 질문에 답하는 문장 | | `blog-writer:server/images/plan.ts:97-101` |
| 서버 | 120자 자르기 | 120 | `blog-writer:server/schema.ts:13`, `blog-writer:server/images/plan.ts:115` |
| 화면 | 안내 문구 "주제와 독자가 궁금해할 질문 · 결론·금액·날짜 같은 답은 넣지 않기", 본문 "4~20자", `maxLength=120`, 썸네일 4줄 입력칸 | 120 | `blog-writer:src/job/PostEditor.tsx:84-96` |
| 생성 요청 | 크기·강조·배치 지시 | | `blog-writer:server/images/svg.ts:51-57`, `blog-writer:server/images/styles.ts:21-39` |
| 규칙 문서 | "썸네일 글자에는 주제와 질문만, 답은 본문에서 확인" | | `blog-writer:rules/default-writing-rules.md:19` |
| 테스트 | 작성·기획 프롬프트가 같은 문구를 씀, 썸네일 요청문 | | `blog-writer:tests/writingOptions.test.ts:65-72`, `blog-writer:tests/imagePlan.test.ts:1-21`, `blog-writer:tests/shared.test.ts:200-208` |

강제 상한 120자만 코드로 지킨다(모든 레이어가 같음). 줄 수·글자 수·"답을 넣지 않음"은 프롬프트 지시라 `confidence: medium`.

## 예외 / 경계값
- 이미지 속 한글은 AI가 틀리게 그릴 수 있어 발행 전 확인하라고 README가 안내한다.
- 정보는 반드시 본문 텍스트에도 있어야 한다 (규칙 문서 3장 "정보는 본문 텍스트로").
- 주제 줄의 연도("2027")처럼 주제를 가리키는 숫자는 쓸 수 있다. 답이 되는 수치는 금지.
- 직접 고친 문구(`userEdited`)는 다시 만들 때 바꾸지 않는다 → [[image/business-rules/BR-IMG-006 직접 고친 이미지 보호]].

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-11 | 썸네일을 여러 줄(제목·부제·핵심 포인트)로, 상한 60 → 120자 | 커밋 22a03cf (이 페이지는 갱신하지 못했음) |
| 2026-10-12 | 썸네일: 사실 요약 → 주제 + 궁금해할 질문, 답(결론·금액·날짜·수치)은 넣지 않음. 1~4줄·주제 6~14자(전 8~16자·2줄). 장면은 유튜브 썸네일 느낌. 작성·기획 프롬프트 문구를 상수로 통일. confidence high → medium(핵심이 프롬프트 지시) | 커밋 74e5eb0 |
