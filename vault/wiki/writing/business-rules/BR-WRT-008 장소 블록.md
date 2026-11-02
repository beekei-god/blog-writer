---
type: business-rule
domain: writing
id: BR-WRT-008
name: 장소 블록
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/place.ts:1-12
  - blog-writer:server/writer.ts:50-80
  - blog-writer:server/editPost.ts:20-50
entities: [글 블록]
updated: 2026-11-02
---
# BR-WRT-008 장소 블록

## 규칙
글에서 특정 장소(가게·행사장 등)를 소개할 때는 `place` 블록(이름·주소)으로 넣고, 화면·블로그에는 "📍 이름 / 주소 / 네이버 지도 링크" 카드로 보인다. 지도 링크는 이름과 주소로 네이버 지도를 검색하는 주소다. 장소 블록은 글자수에 세지 않고, 프롬프트로 고치는 중에 지우거나 옮기지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 장소 블록 | 카드 글자 = `📍 이름`, `주소: …`(있을 때), `네이버 지도: https://map.naver.com/p/search/<이름 주소>` |
| 네이버에 올릴 때 | 카드를 본문에 넣고 네이버 장소를 붙임 → [[publishing/overview]] |
| 글자수·키워드 | 세지 않음 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `placeMapUrl`, `placeLines` | 카드 글자 | `blog-writer:shared/place.ts` |
| 프롬프트 | 글 작성·고치기 시스템 프롬프트 | place 블록 규칙 | `blog-writer:server/writer.ts`, `server/editPost.ts` |
| 서버 | `PostSchema` | place 블록 허용 | `blog-writer:server/schema.ts` |
| 서버/공용 | 붙여넣기 HTML, 워드프레스 블록 | 이름·주소·링크 | `blog-writer:shared/postHtml.ts`, `server/wordpress.ts` |
| 테스트 | 지도 주소, 저장 검사, HTML | | `blog-writer:tests/place.test.ts` |

## 예외 / 경계값
- 주소가 없으면 주소 줄을 뺀다.

## 영향받는 플로우
[[writing/flows/초안 작성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 (2af99a4에서 도입) | 코드 |
