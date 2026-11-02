---
type: business-rule
domain: image
id: BR-IMG-005
name: 이미지 기획과 문구
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/images/plan.ts:1-117
  - blog-writer:server/pipeline.ts:makeImagesInner
  - blog-writer:server/images/styles.ts:imageRequest
entities: [이미지 명세]
updated: 2026-11-02
---
# BR-IMG-005 이미지 기획과 문구

## 규칙
이미지를 만들기 직전에 본문을 다시 읽고, 이미지마다 **무엇을 그릴지(prompt)**, **이미지 안에 넣을 문구(headline)**, **근거 문장(basis)**을 정한다. 이미지는 놓인 섹션의 구체적인 대상·수치·사례가 그림에 드러나야 하고, 어느 글에나 붙일 수 있는 범용 이미지(악수, 노트북 앞의 사람, 전구, 상승 화살표)는 금지다. 만드는 AI에 맞춰 prompt를 다시 쓴다(Claude는 한국어, Gemini/ChatGPT는 영어, 화풍 이름은 쓰지 않음). **이미지 안의 글자는 prompt에 쓰지 않고 headline으로 따로 받아** 생성 쪽이 정확한 문구로 넣는다. 사용자가 prompt를 직접 고친 이미지(`userEdited`)는 기획이 건드리지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 기획 호출 | effort low, 4분, 본문 앞 9,000자와 블록 번호를 보여 줌 |
| 같은 AI·스타일 | 묶어서 한 번에 기획 |
| 기획 실패 | 기본 장면(글 작성 때 정한 prompt)으로 계속 |
| headline | 최대 120자, 본문에 없는 내용·과장·낚시성 금지 |
| 본문 이미지 headline | 4~20자 라벨, 그림 이해에 도움이 될 때만, 아니면 빈 문자열 |
| 요청문(Gemini/ChatGPT) | 썸네일은 16:9, 문구를 크고 굵게·대비 있게·한 글자도 바꾸지 않게, 본문은 짧은 제목/라벨 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트 | `planImages`의 system | 위 규칙 | `blog-writer:server/images/plan.ts` |
| 프롬프트 | `BODY_HEADLINE_RULE`, `THUMBNAIL_*` | 글 작성과 기획이 같은 문구 공유 | `blog-writer:server/writer.ts:96-110` |
| 서버 | `makeImagesInner`가 AI|스타일로 묶어 기획 | | `blog-writer:server/pipeline.ts:320-370` |
| 서버 | `imageRequest` | 생성 요청문 | `blog-writer:server/images/styles.ts` |
| 테스트 | 문구·장면이 글 작성과 같은 지시 | | `blog-writer:tests/imagePlan.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 문구 규칙을 바꾸면 `writer.ts`(글 작성)와 `plan.ts`(기획) 양쪽이 같은 상수를 쓰는지 확인한다. `tests/imagePlan.test.ts`가 이를 검사한다.
- Claude SVG는 headline을 SVG 안 글자로, Gemini/ChatGPT는 요청문으로 넣는다 → [[image/business-rules/BR-IMG-009 SVG 안전 렌더링]]

## 영향받는 플로우
[[image/flows/이미지 생성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
