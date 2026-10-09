---
type: business-rule
domain: writing
id: BR-WRT-005
name: 태그 출처 검증
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/writer.ts:28-33
  - blog-writer:server/writer.ts:156-165
  - blog-writer:server/writer.ts:219-261
  - blog-writer:shared/types.ts:196-205
  - blog-writer:tests/writer.test.ts:50-68
entities: [Post]
updated: 2026-10-07
---
# BR-WRT-005 태그 출처 검증

## 규칙
출처가 "자동완성" 또는 "함께 많이 찾는"인 태그는 이번에 실제로 수집한 네이버 목록에 있는 표현이어야 한다. 목록에 없으면 태그에서 뺀다. 태그마다 출처와 확인 검색어, 확인 날짜를 남긴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 출처가 자동완성/함께 많이 찾는이고, 그 출처 목록의 어떤 항목이 태그를 포함(공백 무시·소문자, 부분 일치) | 유지. `query`는 실제로 그 표현이 나온 검색어로 바로잡음(모델이 적은 query가 맞으면 그것 우선) |
| 위 출처인데 목록에 없음 | 제외, 로그 "수집 목록에 없는 태그 N개 제외: #태그(출처)…" |
| 그 밖의 출처(메인·서브 키워드, 본문 고유명사) | 검사 없이 유지 |
| 출처가 스마트블록 주제 | 제외 → [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]] |
| 태그 앞 `#`, 앞뒤 공백 | 제거. 같은 태그 중복 제거(첫 번째 유지) |
| `tagsCheckedAt` | 작업 날짜(한국 시간 YYYY.MM.DD) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트(작성) | 목록에 실제로 있는 표현만, query는 그 목록의 검색어, 글 내용과 맞는 것만 | | `blog-writer:server/writer.ts:28-33` |
| 서버 | `dedupeTags` → `verifyTagSources` → 30개 자르기 | 부분 일치(`norm(item).includes(norm(tag))`) | `blog-writer:server/writer.ts:156-165`, `:225-254` |
| 화면 | "태그를 고른 근거" 표 (태그·출처·확인 검색어, 확인 날짜) | | `blog-writer:src/job/Report.tsx:56-80` |
| 테스트 | 목록에 있는 표현만 유지, 검색어 바로잡기, 스마트블록 제외, 그 밖의 출처 유지 | | `blog-writer:tests/writer.test.ts:50-68` |

## 예외 / 경계값
- 부분 일치라서 수집 항목 "근로장려금 기한 후 신청"이 있으면 태그 "근로장려금"도 자동완성 출처로 통과한다.
- 근거 표(`tagDetails`)는 **글 작성 당시 기록**이다. 사용자가 편집 화면에서 태그를 바꿔도 갱신하지 않으며, 화면 표 제목에 그렇게 표시한다 (2026-10-05 결정)
- 스마트블록 출처는 수집하지 않으므로 서버가 무조건 제외한다 → [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]].

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 근거 표를 작성 당시 기록으로 확정, 화면 문구에 표시 | `blog-writer:src/job/Report.tsx:59` |
