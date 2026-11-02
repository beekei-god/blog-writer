---
type: business-rule
domain: topic
id: BR-TOP-001
name: 근거 있는 후보만
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/recommend.ts:SYSTEM
  - blog-writer:server/recommend.ts:run
entities: [주제 후보]
updated: 2026-11-02
---
# BR-TOP-001 근거 있는 후보만

## 규칙
Claude는 WebSearch/WebFetch로 **최근 2주 안의 뉴스와 최근 발표된 공식 통계·공고**를 찾아 후보 **10~12개**를 낸다. 후보마다 실제로 검색·열람한 기사/자료(제목·URL·날짜·종류)를 근거로 적고, **근거 없는 후보는 만들지 않는다.** 날짜를 확인하지 못했으면 비워 둔다. 일정이 다가오는 것(마감·접수·시행·발표), 새로 바뀐 제도, 숫자 변화가 큰 통계를 우선한다. WebFetch는 검색 결과로 날짜·숫자를 확인할 수 없을 때만, 전체에서 3번 이하로 쓴다. 후보의 `keywords`는 네이버에 실제로 칠 만한 2~4단어 검색어 1~3개이고, `anchorKeyword`는 분야 대표 검색어 1개다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 근거 URL이 http(s)가 아님 | 근거에서 제외 |
| 근거가 하나도 남지 않은 후보 | 후보에서 제외 |
| 남은 후보가 0개 | 추천 실패("근거가 확인된 후보가 없습니다…") |
| 키워드 | 공백 제거·중복 제거 후 최대 3개 |
| 호출 | effort high, 20분, 단계 `recommend` |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트 | `SYSTEM(today)` | 위 지시 | `blog-writer:server/recommend.ts:62-90` |
| 서버 | `ResultSchema`, URL 거름, 근거 0개 후보 제거 | 모양·URL 검사 | `blog-writer:server/recommend.ts:run` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 근거 필수는 코드로도 강제한다(근거 0개 후보 제거). 후보 개수(10~12)는 프롬프트 지시일 뿐 코드가 검사하지 않는다. 테스트: `tests/recommend.test.ts` → [[topic/open-questions]] 1번

## 영향받는 플로우
[[topic/flows/주제 추천]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
| 2026-11-02 | 근거가 없는 후보를 코드에서 제거하고, 남는 후보가 없으면 실패 처리 | 9a38c08 |
