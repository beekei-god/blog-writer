---
type: business-rule
domain: publishing
id: BR-PUB-007
name: 카테고리와 네이버 주제
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/categories.ts:1-50
  - blog-writer:server/naverTopic.ts:1-63
  - blog-writer:server/browser/category.ts
  - blog-writer:server/routes/categories.ts
  - blog-writer:src/job/NextStep.tsx
entities: [블로그 설정]
updated: 2026-11-16
---
# BR-PUB-007 카테고리와 네이버 주제

## 규칙
카테고리는 **올릴 때마다 고른다**. 고르지 않으면 블로그 기본(워드프레스는 사이트 기본)으로 올라간다. 마지막에 고른 카테고리는 블로그마다 기억해 다음에 처음 값으로 쓰고, 고르지 않으면 기억을 지운다. 네이버·티스토리의 카테고리 목록은 에디터에서 읽어 와 저장하며(블로그 ID가 바뀌면 없는 것으로 봄), 워드프레스는 사이트에서 바로 읽는다. 목록을 다시 불러왔을 때 마지막에 고른 카테고리가 새 목록에 없으면(블로그에서 지워짐) 기억을 지우고, 화면에서 고른 값도 블로그 기본 카테고리로 되돌린다.

네이버 블로그에는 발행 창에 **주제**가 있다(엔터테인먼트·예술 / 생활·노하우·쇼핑 / 취미·여가·여행 / 지식·동향 아래 세부 주제 33개). 임시저장이 아닌 발행(예약·즉시)일 때, 글의 제목·요약·태그·소제목을 보고 Claude가 목록에서 하나를 고른다. 목록에 없는 답이거나 호출이 실패하면 주제 없이 올리고 "확인 필요"로 남긴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 네이버 + 임시저장 | 주제 고르지 않음 |
| 네이버 + 예약/즉시 | 크롬 큐에 들어가기 전에 주제 선택(low effort, 2분) |
| 선택 결과가 목록과 공백·가운뎃점 모양만 다름 | 같은 것으로 맞춤(`matchNaverTopic`) |
| 카테고리·주제 고르기 실패 | 멈추지 않고 "확인 필요" |
| 중지 | 그대로 전달해 중지 처리 |
| 워드프레스 카테고리 | 사이트 카테고리 ID 필요 |
| 네이버·티스토리 목록 다시 불러오기 + 기억한 카테고리가 새 목록에 없음 | 기억(`last`)을 지움, 화면 선택은 기본 카테고리로 |
| 다시 불러오기 + 고른 카테고리가 새 목록에 있음 | 고른 값 유지 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `getSavedCategories`, `saveCategoryList`, `saveLastCategory` | `data/categories.json`. `saveCategoryList`는 새 목록에 없는 마지막 선택을 지운다 | `blog-writer:server/categories.ts` |
| 화면 | `useCategories`(`refresh`), `CategoryField` | 다시 불러온 목록에 없는 선택은 기본 카테고리로 되돌림. 목록에 없는 선택은 맨 앞에 끼워 보여 줌 | `blog-writer:src/job/NextStep.tsx` |
| 서버 | `pickNaverTopic`, `matchNaverTopic`, `NAVER_TOPICS` | 주제 선택 | `blog-writer:server/naverTopic.ts` |
| 서버 | `readCategories`, `selectCategorySteps`, `selectTopicSteps`, `naverStepsWithOptions` | 에디터에서 읽기·고르기 | `blog-writer:server/browser/category.ts` |
| 테스트 | 카테고리 기억(지워진 카테고리 기억 지우기 포함), 단계, optional 실패 | | `blog-writer:tests/categories.test.ts`, `tests/naverTopic.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 네이버 주제 목록은 네이버가 바꿀 수 있어 코드의 `NAVER_TOPICS`가 낡을 수 있다 → [[publishing/open-questions]] 1번

## 영향받는 플로우
[[publishing/flows/블로그에 올리기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
| 2026-11-16 | 목록을 다시 불러올 때 블로그에서 지워진 카테고리를 마지막 선택 기억과 화면 선택에서 지움(전에는 기억이 남아 지운 이름이 계속 보였음) | aa3f4ad |
