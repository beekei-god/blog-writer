---
type: implementation
domain: topic
project: blog-writer
paths: [server/recommend.ts, server/datalab.ts, server/secrets.ts, server/routes/recommendations.ts, server/routes/settings.ts, src/Recommend.tsx, src/SettingsPanel.tsx, tests/writer.test.ts, tests/api.test.ts]
last_ingested_commit: 스냅샷 2026-10-07 (git 없음)
updated: 2026-10-09
---
# blog-writer의 topic 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `Evidence`(309-315), `InterestStat`(317-324), `TopicCandidate`(326-335), `Recommendation`(337-353) | [[topic/entities/Recommendation]], [[topic/entities/TopicCandidate]] |
| `server/recommend.ts` | `update`(19-29, `serialQueue`+`writeJsonAtomic`), `deleteRecommendation`(49-52), `recoverRecommendations`(57-66), `SYSTEM`(69-83), `ResultSchema`(121-138), `startRecommendation`(141-167, `withCancel`), `run`(169-255) | BR-TOP-001, 004, 005 |
| `server/datalab.ts` | `dateRange`(20-28), `call`(30-49), `testDatalab`(52-55), `interestStat`(63-73, 순수 계산), `compareInterest`(84-116) | BR-TOP-002, 003, 006 |
| `server/secrets.ts` | `update`(32, 읽고 합쳐 0600으로 씀), `getNaverKeys`(39-46), `saveNaverKeys`(48-52) | BR-TOP-006 |
| `server/fsutil.ts` | `serialQueue`, `writeJsonAtomic` (저장 공용 도우미) | [[_system/modules/server-core]] |
| `server/naver.ts` | `naverAutocomplete`(4-19) | 자동완성 개수 |
| `server/routes/recommendations.ts` | `GET/POST /api/recommendations`(11-23), `POST /:id/cancel`(24-31), `DELETE /:id`(32-42) | BR-TOP-005 |
| `server/routes/settings.ts` | `GET/PUT/DELETE /api/datalab`(60-88) | BR-TOP-006 |
| `src/Recommend.tsx` | `Recommend`(63-207), `CandidateCard`(20-61), `Sparkline`(8-18) | [[topic/flows/주제 추천 플로우]] |
| `src/SettingsPanel.tsx` | "네이버 데이터랩 설정" 카드(260-286), `saveKeys`(103-116), `deleteKeys`(145-158) | BR-TOP-006 |
| `src/App.tsx` | 추천 → 새 글 폼 채우기(195-204) | [[topic/entities/TopicCandidate]] |
| `tests/writer.test.ts` | "데이터랩 관심도 환산"(70-83) | BR-TOP-002, 003 |
| `tests/api.test.ts` | "추천 분야 길이"(154-157) | BR-TOP-005 |

API 라우터 구성은 [[_system/modules/server-routes]] 참고.

## 다른 도메인과의 접점
- 이미 쓴 글 목록을 작업에서 읽음 → [[writing/entities/Job]].
- "이 주제로 글쓰기" → [[writing/flows/초안 작성 플로우]].
- Claude 호출은 `recommend` 단계 모델 → [[usage/business-rules/BR-USG-001 단계별 추천 모델]]. 추천 호출은 `jobId`가 없어 작업별 사용량에 잡히지 않는다.
