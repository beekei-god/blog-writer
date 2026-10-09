---
type: implementation
domain: topic
project: blog-writer
paths: [server/recommend.ts, server/datalab.ts, server/searchad.ts, server/explore.ts, server/trends.ts, server/secrets.ts, server/routes/recommendations.ts, server/routes/keywords.ts, server/routes/settings.ts, src/Recommend.tsx, src/Keywords.tsx, src/SearchAdSettings.tsx, src/SettingsPanel.tsx, tests/writer.test.ts, tests/api.test.ts, tests/searchad.test.ts, tests/explore.test.ts]
last_ingested_commit: git 4ffb5eb
updated: 2026-10-09
---
# blog-writer의 topic 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `Evidence`(309-315), `InterestStat`(317-324), `TopicCandidate`(326-335), `Recommendation`(337-353) | [[topic/entities/Recommendation]], [[topic/entities/TopicCandidate]] |
| `server/recommend.ts` | `update`(19-29, `serialQueue`+`writeJsonAtomic`), `deleteRecommendation`(49-52), `recoverRecommendations`(57-66), `SYSTEM`(69-83), `ResultSchema`(121-138), `startRecommendation`(141-167, `withCancel`), `run`(169-255) | BR-TOP-001, 004, 005 |
| `server/datalab.ts` | `dateRange`(20-28), `call`(30-49), `testDatalab`(52-55), `interestStat`(63-73, 순수 계산), `compareInterest`(84-116) | BR-TOP-002, 003, 006 |
| `server/secrets.ts` | `update`(36, 읽고 합쳐 0600으로 씀), `getNaverKeys`(43-50), `saveNaverKeys`(52-56), `getSearchAdKeys`(66-73), `saveSearchAdKeys`(75-79) | BR-TOP-006, 009 |
| `server/searchad.ts` | `sign`(29), `parseCount`(33-39), `toRows`(44-64), `splitHints`/`parseHints`(67-77), `call`(79-102), `testSearchAd`(105-107), `lookupKeywords`(113-128) | [[topic/business-rules/BR-TOP-007 키워드 검색량 표기와 집계]], [[topic/business-rules/BR-TOP-009 검색광고 키 확인과 우선순위]] |
| `server/explore.ts` | `exploreKeywords`(21-29), `exploreWithoutInput`(31-74) | [[topic/business-rules/BR-TOP-008 입력 없는 키워드 탐색의 기준과 오류 처리]] |
| `server/trends.ts` | `parseTrending`(26-36), `fetchTrending`(41-56, 10분 캐시) | BR-TOP-008 |
| `server/routes/keywords.ts` | `GET /api/keywords?q=`(11-25) | BR-TOP-007, 008 |
| `server/fsutil.ts` | `serialQueue`, `writeJsonAtomic` (저장 공용 도우미) | [[_system/modules/server-core]] |
| `server/naver.ts` | `naverAutocomplete`(4-19) | 자동완성 개수 |
| `server/routes/recommendations.ts` | `GET/POST /api/recommendations`(11-23), `POST /:id/cancel`(24-31), `DELETE /:id`(32-42) | BR-TOP-005 |
| `server/routes/settings.ts` | `GET/PUT/DELETE /api/datalab`(60-88), `GET/PUT/DELETE /api/searchad`(91-119) | BR-TOP-006, 009 |
| `src/Recommend.tsx` | `Recommend`(69-), `RecommendRequest`(62-66, 키워드 탐색에서 온 요청), `begin`(106), 요청 처리 effect(121-129), `CandidateCard`(20-61), `Sparkline`(8-18) | [[topic/flows/주제 추천 플로우]] |
| `src/Keywords.tsx` | `Keywords`(17-224): 입력·표·정렬·필터, "이 키워드로 글쓰기"·"주제 추천받기" | BR-TOP-007, 008, [[topic/flows/키워드 탐색 플로우]] |
| `src/SearchAdSettings.tsx` | `SearchAdSettings`(6-79): 검색광고 키 카드 | BR-TOP-009 |
| `src/SettingsPanel.tsx` | "네이버 데이터랩 설정" 카드(260-286), `saveKeys`(103-116), `deleteKeys`(145-158) | BR-TOP-006 |
| `src/App.tsx` | 추천 → 새 글 폼 채우기(199-210), 키워드 탐색 탭·`recommendRequest`로 주제 추천 시작 전달(56, 211-226), 탭 순서(새 글→키워드 탐색→주제 추천→…) | [[topic/entities/TopicCandidate]], BR-TOP-005, [[topic/entities/KeywordRow]] |
| `tests/writer.test.ts` | "데이터랩 관심도 환산"(70-83) | BR-TOP-002, 003 |
| `tests/api.test.ts` | "추천 분야 길이"(253-256) | BR-TOP-005 |
| `tests/searchad.test.ts` | 서명·검색량 파싱·입력 분리·정렬(16-54), 키 저장·확인·탐색 API(56-125) | BR-TOP-007, 009 |
| `tests/explore.test.ts` | 구글 트렌드 RSS(23-55), 입력 없는 탐색(57-150) | BR-TOP-008 |

API 라우터 구성은 [[_system/modules/server-routes]] 참고.

## 다른 도메인과의 접점
- 이미 쓴 글 목록을 작업에서 읽음 → [[writing/entities/Job]].
- "이 주제로 글쓰기" → [[writing/flows/초안 작성 플로우]].
- 키워드 탐색은 네이버 검색광고 키워드 도구와 구글 트렌드 RSS를 호출한다(자동완성·데이터랩과 별개의 외부 연동). "이 키워드로 글쓰기"는 새 글 주제로 넘긴다 → [[writing/flows/초안 작성 플로우]].
- Claude 호출은 `recommend` 단계 모델 → [[usage/business-rules/BR-USG-001 단계별 추천 모델]]. 추천 호출은 `jobId`가 없어 작업별 사용량에 잡히지 않는다.
