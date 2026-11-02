---
type: business-rule
domain: image
id: BR-IMG-006
name: 썸네일 문구는 질문만
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/writer.ts:THUMBNAIL_HEADLINE_RULE
  - blog-writer:server/writer.ts:THUMBNAIL_SCENE_RULE
  - blog-writer:rules/default-writing-rules.md:13-30
entities: [이미지 명세]
updated: 2026-11-02
---
# BR-IMG-006 썸네일 문구는 질문만

## 규칙
썸네일 문구(headline)는 줄바꿈으로 나눈 1~4줄이다. 앞 1~2줄은 무엇에 대한 글인지 보여 주는 큰 주제(각 6~14자, 제목을 그대로 옮기지 않고 줄임), 다음 줄은 **본문이 실제로 답하는 질문**이다. 답(결론·결과·추천, 금액·날짜·수치·자격 조건)은 썸네일에 쓰지 않고 본문에서 확인하게 한다. 본문이 답하지 않는 질문과 과장·낚시성 표현은 금지다. 이유: 검색과 AI 브리핑은 이미지 속 글자를 읽는다고 보장할 수 없으므로 정보는 본문 텍스트에 있어야 한다.

장면(prompt)은 글의 핵심 대상(장소·건물·차량·상품·상황)을 크게 보여 주고, 제목 글자가 들어갈 자리는 비교적 단순하게 둔다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 글 작성 때 썸네일 정보를 낼 때 | 이 규칙으로 headline·prompt 작성 |
| 썸네일을 나중에 만들 때 | 기획 단계가 같은 규칙으로 다시 정함 + 사용자가 고른 제목과 어긋나지 않게 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트 | `THUMBNAIL_HEADLINE_RULE`, `THUMBNAIL_SCENE_RULE` | 글 작성·기획이 공유 | `blog-writer:server/writer.ts:96-105` |
| 프롬프트 | `planImages` | 제목 전달 | `blog-writer:server/images/plan.ts` |
| 규칙 문서 | "정보는 본문 텍스트로" | 썸네일엔 주제와 질문만 | `blog-writer:rules/default-writing-rules.md` |
| 테스트 | 썸네일 문구는 질문만, 결론·수치 없음 | | `blog-writer:tests/writingOptions.test.ts:65` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 프롬프트로만 지키므로 코드가 답이 들어간 문구를 막지 않는다(`confidence: medium`).

## 영향받는 플로우
[[image/flows/제목 확정 후 썸네일 만들기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 (질문형 문구는 74e5eb0) | 코드 |
