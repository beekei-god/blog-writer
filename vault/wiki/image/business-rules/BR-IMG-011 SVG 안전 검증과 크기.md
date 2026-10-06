---
type: business-rule
domain: image
id: BR-IMG-011
name: SVG 안전 검증과 크기
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/images/svg.ts:8-80
entities: [ImageSpec]
updated: 2026-10-05
---
# BR-IMG-011 SVG 안전 검증과 크기

## 규칙
Claude가 그린 SVG는 신뢰하지 않는다. 형식과 위험 요소를 검사하고, JS를 끄고 네트워크를 막은 헤드리스 크롬에서 렌더링만 해서 PNG로 저장한다. 크기는 썸네일 1200×630, 본문 1200×675.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `<svg`로 시작해 `</svg>`로 끝나지 않음 | `svg_invalid` "SVG 형식이 아닙니다." |
| `<script`, `javascript:`, `on…=` 이벤트 속성, `<foreignObject`, `<image`, 외부 http(s) `<use href>`, 외부 `url(http…)` 포함 | `svg_invalid` "허용되지 않는 SVG 요소가 포함되어 있습니다." |
| 통과 | 흰 배경에 SVG를 지정 크기로 띄워 스크린샷 → `<key>-<timestamp>.png` |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 프롬프트(SVG) | xmlns·viewBox, width/height 금지, 배경 rect, 스크립트·외부 참조 금지, 큰 글자(가로 1200 기준 40 이상) | `blog-writer:server/images/svg.ts:8-14` |
| 서버 | `validateSvg`, 렌더 격리 | `blog-writer:server/images/svg.ts:29-36`, `:66-79` |
| 크기 | `SIZE` | `blog-writer:server/images/svg.ts:24-27` |

## 예외 / 경계값
- 웹 AI 이미지는 크기를 정하지 않고 "16:9"만 요청한다.
- 크롬이 없으면 `browser_missing`.

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
