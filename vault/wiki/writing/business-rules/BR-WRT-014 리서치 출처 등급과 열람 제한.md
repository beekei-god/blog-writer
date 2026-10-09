---
type: business-rule
domain: writing
id: BR-WRT-014
name: 리서치 출처 등급과 열람 제한
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/research.ts:14-22
  - blog-writer:server/research.ts:66-82
  - blog-writer:server/writer.ts:102-112
  - blog-writer:rules/default-writing-rules.md:42-43
entities: [Job]
updated: 2026-10-07
---
# BR-WRT-014 리서치 출처 등급과 열람 제한

## 규칙
리서치는 공식 자료(정부·공공기관, 공고문, 주최사·예매처 공지) → 언론 → 개인 블로그(보조) 순으로 쓴다. 사용자가 준 참고 링크는 모두 원문을 열어 표·장단점·진행 방식·문의처·관련 링크까지 옮긴다. 그 밖의 원문 열람(WebFetch)은 비용 때문에 최대 6개만 한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 출처 기록 | `kind`: official / press / blog / other. 실제로 연 페이지만 |
| 글 작성에 넘길 때 | 출처 목록에 "[공식]/[언론]/[개인 블로그(참고용)]/[기타]" 표시 |
| 사용자 링크 | 프롬프트에 "모두 열어서 반영" 목록으로 추가 |
| WebFetch | 사용자 링크 외 최대 6개, 검색 결과로 확인되는 사실은 다시 열지 않음 |
| 진행 로그 | WebSearch는 "웹 검색: <검색어>", WebFetch는 "페이지 읽는 중: <URL>" (같은 문구 연속은 한 번만) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트(리서치) | 순서·6개 제한·사용자 링크 | | `blog-writer:server/research.ts:14-22` |
| 서버 | 도구를 WebSearch·WebFetch로만 제한, effort high, 20분 | 열람 개수는 세지 않음 | `blog-writer:server/research.ts:70-82` |
| 서버(작성 입력) | 출처 등급 라벨 | | `blog-writer:server/writer.ts:102-112` |
| 규칙 문서 | 공식→언론→블로그 | | `blog-writer:rules/default-writing-rules.md:42-43` |
| 화면 | 출처 목록에 등급 배지 (공식/언론/블로그·참고용/기타) | | `blog-writer:src/job/JobDetail.tsx:412`, `:314-328` |

6개 제한과 순서는 프롬프트 지시라 `confidence: medium`.

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
