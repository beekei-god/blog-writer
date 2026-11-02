---
type: business-rule
domain: topic
id: BR-TOP-003
name: 자동완성 수요 신호
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/recommend.ts:run
  - blog-writer:server/naver.ts:naverAutocomplete
entities: [주제 후보]
updated: 2026-11-02
---
# BR-TOP-003 자동완성 수요 신호

## 규칙
후보마다 **첫 번째 키워드**를 네이버 자동완성에 넣어 나온 항목 수(`autocompleteCount`)를 기록한다. 검색 수요의 간접 신호로 화면에 보여 주지만 **순위 근거로 쓰지 않는다**(검색어 표현에 따라 0이 되기도 해서 부정확하다).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 자동완성 호출 실패 | 빈 배열 → 0 |
| 입력과 같은 항목 | 결과에서 제외 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `naverAutocomplete`, `run` | 첫 키워드, 타임아웃 8초 | `blog-writer:server/naver.ts`, `server/recommend.ts` |

## 영향받는 플로우
[[topic/flows/주제 추천]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
