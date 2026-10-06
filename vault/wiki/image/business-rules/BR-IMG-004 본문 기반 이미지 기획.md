---
type: business-rule
domain: image
id: BR-IMG-004
name: 본문 기반 이미지 기획
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:202-243
  - blog-writer:server/images/plan.ts:1-113
  - blog-writer:server/writer.ts:52-62
updated: 2026-10-07
entities: [ImageSpec]
---
# BR-IMG-004 본문 기반 이미지 기획

## 규칙
이미지는 그것이 놓인 섹션(바로 앞 소제목부터 다음 소제목 전까지)의 구체적인 대상·상황·수치·사례가 보여야 한다. 어느 글에나 붙일 수 있는 범용 이미지(악수, 노트북 앞 사람, 전구, 상승 화살표 등)는 금지다. 한 글의 이미지는 서로 다른 내용을 그리되 같은 화풍·색감·등장인물을 유지한다. 그래서 **이미지를 만들기 직전에 본문을 다시 읽고** 설명(prompt)·근거(basis)·문구(headline)를 정한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 만들 대상 중 `userEdited`가 아닌 이미지 | 기획 대상 |
| 기획 호출 | 본문을 블록 번호와 함께(이미지는 자리 표시, 최대 9,000자) 보여 주고, key마다 prompt·headline·basis 하나씩 |
| prompt 언어 | Claude는 한국어(도형·아이콘·도식), Gemini/ChatGPT는 영어(장면·구도·소품·색감, 화풍 이름 금지) |
| 글자 | prompt에 쓰지 말고 headline에만. prompt에는 글자 자리(여백·띠·상자)만 |
| 결과 반영 | prompt 교체, basis는 값이 있으면 교체, headline은 빈 값이면 삭제 |
| 기획 호출 실패 | 기존 설명으로 그대로 생성 (로그) — 중지는 예외로 전파 |
| 응답에 없는 key | 그 이미지는 기존 설명 유지 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 프롬프트(작성) | 처음 쓸 때 basis 먼저, 범용 이미지 금지, 일관성 | `blog-writer:server/writer.ts:52-62` |
| 프롬프트(기획) | 위 규칙 | `blog-writer:server/images/plan.ts:86-100` |
| 서버 | 그룹별 기획 호출과 반영 | `blog-writer:server/pipeline.ts:202-243` |
| 스키마 | basis를 prompt보다 먼저 쓰게 순서 배치 | `blog-writer:server/schema.ts:137-141` |

범용 이미지 금지·섹션 연관성은 프롬프트 지시라 `confidence: medium`.

## 예외 / 경계값
- 기획은 `images` 단계 모델을 쓰고 effort low, 4분 제한.
- 썸네일 추가 시 기본 장면("블로그 글 '제목'의 대표 썸네일. 핵심 내용: 요약…")은 기획이 실패할 때만 쓰인다 (`blog-writer:server/routes/images.ts:38-45`).

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
