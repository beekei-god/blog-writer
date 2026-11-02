---
type: business-rule
domain: writing
id: BR-WRT-007
name: 태그 수와 출처 확인
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/writer.ts:verifyTagSources
  - blog-writer:server/naver.ts:1-89
  - blog-writer:shared/types.ts:224-234
entities: [글]
updated: 2026-11-02
---
# BR-WRT-007 태그 수와 출처 확인

## 규칙
태그는 **30개 이내**이고, 개수를 채우는 것이 목표가 아니라 글과 실제로 관련 있는 것만 낸다. 태그마다 출처와 확인에 쓴 검색어를 적는다. 출처가 "자동완성"·"함께 많이 찾는"인 태그는 서버가 실제로 수집한 목록에 그 표현이 있는지 확인하고, 없으면 뺀다. "스마트블록 주제"는 수집하지 않으므로 항상 뺀다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 출처 = 메인·서브 키워드, 본문 고유명사 | 그대로 둠 |
| 출처 = 자동완성 / 함께 많이 찾는 | 수집 목록(공백 무시, 일부분 허용)에 있으면 유지하고 검색어를 실제 나온 검색어로 바로잡음, 없으면 뺌 |
| 출처 = 스마트블록 주제 | 항상 뺌 |
| 중복·`#` 접두 | `#` 제거 후 중복 제거 |
| 31개 이상 | 앞에서 30개만 |
| 뺀 태그 | "수집 목록에 없는 태그 N개 제외" 로그 |

수집: 네이버 자동완성(최대 20개 검색어, 긴 키워드는 뒤 단어를 떼어 2단어까지 확장)과 "함께 많이 찾는"(검색 결과 HTML에서 내부 요청 주소를 꺼내 호출, 키워드 6개까지, 500ms 간격). 실패하면 빈 값이고, 네이버가 영역을 꺼 둔 검색어는 비어 있는 것이 정상이다.

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `MAX_TAGS`, `TAG_SOURCES` | 30, 출처 5종 | `blog-writer:shared/types.ts:224-234` |
| 서버 | `verifyTagSources`, `dedupeTags` | 목록 확인 | `blog-writer:server/writer.ts` |
| 서버 | `collectNaverSuggestions` | 자동완성+함께 많이 찾는 | `blog-writer:server/naver.ts` |
| 규칙 문서 | "4. 태그" | 30개 이내, 중요도 순, 출처 표 | `blog-writer:rules/default-writing-rules.md:31-39` |
| 테스트 | 태그 출처 확인 | | `blog-writer:tests/writer.test.ts:50` |

## 예외 / 경계값
- 규칙 문서는 출처 이름을 "연관검색어"라고 부르고 코드는 "함께 많이 찾는"이라고 부른다(같은 것, 네이버가 이름을 바꿈). → [[writing/open-questions]] 1번
- 연동 상세: [[_system/integrations/naver-search]]

## 영향받는 플로우
[[writing/flows/초안 작성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
