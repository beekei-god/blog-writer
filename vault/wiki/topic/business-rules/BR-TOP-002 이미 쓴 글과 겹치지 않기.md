---
type: business-rule
domain: topic
id: BR-TOP-002
name: 이미 쓴 글과 겹치지 않기
status: active
confidence: medium
consistency: single-source
source:
  - blog-writer:server/recommend.ts:run
entities: [주제 추천]
updated: 2026-11-02
---
# BR-TOP-002 이미 쓴 글과 겹치지 않기

## 규칙
추천할 때 이미 쓴 글(최근 50개 작업의 제목, 초안이 없으면 주제)의 목록을 Claude에게 주고, **같은 검색 의도의 주제는 빼게** 한다. 후보끼리도 검색 의도가 겹치지 않아야 한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 작업 목록 | `listJobs()`의 앞 50개(최신순) |
| 제목 | `post.title`, 없으면 `topic` |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `run`의 `written` | 50개 | `blog-writer:server/recommend.ts` |
| 프롬프트 | `SYSTEM`, 사용자 프롬프트 | 같은 의도 제외 | `blog-writer:server/recommend.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 코드가 겹침을 검사하지 않고 모델 판단에 맡긴다.

## 영향받는 플로우
[[topic/flows/주제 추천]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
