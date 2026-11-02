---
type: business-rule
domain: topic
id: BR-TOP-006
name: 키워드 탐색
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/searchad.ts:1-182
  - blog-writer:server/explore.ts:1-74
  - blog-writer:server/routes/keywords.ts
entities: [키워드 행]
updated: 2026-11-02
---
# BR-TOP-006 키워드 탐색

## 규칙
키워드를 입력하면 그 키워드(**최대 5개**)의 연관 키워드와 월간 검색량(PC·모바일), 경쟁 정도를 네이버 검색광고 키워드 도구로 보여 준다(최근 한 달, 절대값). 입력이 없으면 ① 지금 뜨는 검색어(구글 트렌드 상위 10개)와 ② 최근 주제 추천(완료된 최근 3개)의 분야·기준 키워드(최대 5개)를 각각 기준으로 찾는다. 결과는 검색량 큰 순으로 상위 200개만 돌려준다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 입력 > 200자 | 400 |
| 검색광고 키 없음 | 400 "먼저 설정에서 네이버 검색광고 API 키를 연결하세요" |
| 키워드 안의 공백·특수문자 | 글자·숫자만 남김, 쉼표·줄바꿈·가운뎃점·슬래시로 나눔, 중복 제거 |
| 묶음에 특수문자 키워드가 있어 400(code 11001) | 하나씩 나눠 맞는 것만 사용 |
| 검색량 "< 10" | 5로 계산, `low` 표시 |
| 호출 간격 | 400ms, 429면 간격의 4배씩 늘려 3번까지 재시도 |
| 입력도 기준도 없음 | `SearchAdError`(키워드를 입력하거나 주제 추천을 해 보라는 안내) |
| 구글 트렌드 실패 | 그 덩어리만 오류로 표시, 나머지 진행. 검색광고 키 오류·한도는 전체 오류 |
| 요청 서명 | `X-Signature = base64(HMAC-SHA256(secret, timestamp.method.uri))` |
| 응답 코드 | `SearchAdError` → 400, 그 외 502 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `lookupKeywords`, `toRows`, `parseCount`, `splitHints`, `sign` | | `blog-writer:server/searchad.ts` |
| 서버 | `exploreKeywords`, `exploreWithoutInput` | 상수 `TRENDING_LIMIT=10`, `RECOMMENDATION_LIMIT=3` | `blog-writer:server/explore.ts` |
| 라우트 | `GET /api/keywords?q=` | | `blog-writer:server/routes/keywords.ts` |
| 테스트 | 서명·파싱·탐색 | | `blog-writer:tests/searchad.test.ts`, `tests/explore.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 테스트 환경 변수 `SEARCHAD_HOST`, `SEARCHAD_GAP_MS`, `TRENDS_URL`로 가짜 서버를 쓴다 → [[_system/configuration]]

## 영향받는 플로우
[[topic/flows/키워드 탐색]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
