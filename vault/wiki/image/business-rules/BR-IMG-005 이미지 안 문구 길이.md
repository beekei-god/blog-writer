---
type: business-rule
domain: image
id: BR-IMG-005
name: 이미지 안 문구 길이
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/writer.ts:65-80
  - blog-writer:server/images/plan.ts:94-97
  - blog-writer:server/images/plan.ts:109-112
  - blog-writer:server/schema.ts:7-8
  - blog-writer:src/job/PostEditor.tsx:83-98
  - blog-writer:server/images/svg.ts:51-57
  - blog-writer:server/images/webAi.ts:194-194
entities: [ImageSpec]
updated: 2026-10-07
---
# BR-IMG-005 이미지 안 문구 길이

## 규칙
이미지 안 글자(headline)는 본문에 실제로 있는 사실(날짜·금액·대상·혜택·수치·단계 이름)로만 만든다. 과장·낚시성 표현과 본문에 없는 내용은 금지다.
- **썸네일**: 검색 결과에서 눌러 보고 싶게 하는 8~16자, 2줄 이내. 제목을 그대로 옮기지 않는다. 가운데에 크게, 정사각형으로 잘려도 보이게.
- **본문 이미지**: 이해에 도움이 될 때만 4~20자 라벨·수치·단계 이름. 필요 없으면 빈 문자열(글자 없음).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 저장 시 60자 초과 | 60자로 잘라 받음 |
| headline 있음 | 생성 요청에 "한 글자도 바꾸지 말 것", 썸네일은 크게(SVG 80~120, 굵기 800)·가운데, 본문은 라벨(44~72, 700) |
| headline 없음 | 웹 AI에는 "글자 넣지 말 것", SVG에는 꼭 필요한 짧은 라벨만 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트(작성) | 썸네일 headline 8~16자·2줄, 본문 4~20자 | | `blog-writer:server/writer.ts:68`, `:79` |
| 프롬프트(기획) | 같은 값 | | `blog-writer:server/images/plan.ts:95-97` |
| 서버 | 60자 자르기 | 60 | `blog-writer:server/schema.ts:8`, `blog-writer:server/images/plan.ts:111` |
| 화면 | 안내 문구, `maxLength=60` | "8~16자 권장", "4~20자" | `blog-writer:src/job/PostEditor.tsx:84-91` |
| 생성 요청 | 크기·위치 지시 | | `blog-writer:server/images/svg.ts:51-57`, `blog-writer:server/images/webAi.ts:194-194` |

8~16 / 4~20은 프롬프트와 화면 안내가 같은 값이고 코드로 강제하지 않는다. 강제 상한은 60자로 모든 레이어가 같다.

## 예외 / 경계값
- 이미지 속 한글은 AI가 틀리게 그릴 수 있어 발행 전 확인하라고 README가 안내한다.
- 정보는 반드시 본문 텍스트에도 있어야 한다 (규칙 문서 3장 "정보는 본문 텍스트로", `blog-writer:rules/default-writing-rules.md:19`).

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
