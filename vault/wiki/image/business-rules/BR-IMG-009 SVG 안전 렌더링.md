---
type: business-rule
domain: image
id: BR-IMG-009
name: SVG 안전 렌더링
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/images/svg.ts:1-80
entities: [이미지 명세]
updated: 2026-11-02
---
# BR-IMG-009 SVG 안전 렌더링

## 규칙
Claude는 단일 SVG를 그리고, 서버가 Chrome(Playwright)으로 PNG로 렌더링한다. 모델이 만든 마크업은 신뢰하지 않는다: `<svg>`로 시작해 `</svg>`로 끝나야 하고, `<script>`, `javascript:`, 이벤트 속성(`onload` 등), `<foreignObject>`, `<image>`, 외부 `<use>`/`url(http…)`가 있으면 거절한다(`svg_invalid`). 렌더링은 JavaScript를 끄고 http(s) 요청을 모두 막은 컨텍스트에서 한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 크기 | 썸네일 1200×630, 본문 1200×675 |
| 글자 | headline이 있으면 그 문구를 한 글자도 바꾸지 않고 넣음. 썸네일은 크고 굵게(글자 크기 70~110), 본문은 라벨(44~72) |
| 글꼴 | Apple SD Gothic Neo, Noto Sans KR, sans-serif |
| 크롬 없음 | `browser_missing` |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트 | `SYSTEM` | 평평한 도형, 모바일에서 읽히는 큰 글자 | `blog-writer:server/images/svg.ts:1-15` |
| 서버 | `validateSvg`, `generateSvgImage` | 검증, JS 끔, 네트워크 차단 | `blog-writer:server/images/svg.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 허용 요소를 늘릴 때는 보안 영향이 있으니 정규식(`validateSvg`)과 렌더링 컨텍스트 설정을 같이 검토한다.
- 테스트: `tests/svg.test.ts`가 `validateSvg`의 거절 대상 7종과 통과 사례를 확인한다(이를 위해 `validateSvg`를 export). → [[image/open-questions]] 1번.

## 영향받는 플로우
[[image/flows/이미지 생성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
| 2026-11-02 | `validateSvg` export, 전용 테스트 추가 | 9a38c08 |
