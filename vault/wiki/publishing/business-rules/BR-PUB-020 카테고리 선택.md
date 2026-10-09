---
type: business-rule
domain: publishing
id: BR-PUB-020
name: 카테고리 선택
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/schema.ts:47-48
  - blog-writer:server/routes/jobs.ts:113-123
  - blog-writer:server/routes/jobs.ts:157-158
  - blog-writer:server/routes/categories.ts:21-42
  - blog-writer:server/categories.ts:10-47
  - blog-writer:server/wordpress.ts:260-301
  - blog-writer:server/browser/category.ts:11-264
  - blog-writer:server/browser/adapters.ts:30-43
  - blog-writer:server/browser/adapters.ts:406-406
  - blog-writer:server/browser/userChrome.ts:532-532
  - blog-writer:server/browser/blogPost.ts:167-167
  - blog-writer:server/pipeline.ts:369-392
  - blog-writer:src/job/NextStep.tsx:247-330
  - blog-writer:tests/categories.test.ts:1-113
entities: [Job]
updated: 2026-10-09
---
# BR-PUB-020 카테고리 선택

## 규칙
어느 블로그든 글을 올릴 때마다 **카테고리를 글 화면에서 고를 수 있다**(임시저장·예약발행·자동발행 공통). 고르지 않으면 블로그의 기본 카테고리로 올라간다. 고른 카테고리는 블로그별로 **마지막 선택을 기억**해 다음에 올릴 때 처음 값으로 쓴다.

> 신뢰도: 서버·화면의 값 처리(요청 검사, 워드프레스 우선순위, 기억)는 코드에 명시돼 있어 high에 해당한다. 하지만 네이버·티스토리 에디터에서 카테고리 칸을 **찾고 읽고 고르는 부분**은 화면 글자·모양을 보는 휴리스틱이고 실제 사이트에서 확인되지 않아 이 페이지 전체는 medium이다 ([[publishing/open-questions]] #16, #18). 네이버가 카테고리를 발행 창에서만 고른다는 점은 사용자 확인 사항이다.

## 조건과 결과
| 블로그 | 고르는 방법 | 올릴 때 적용 |
|---|---|---|
| 워드프레스 | 사이트의 카테고리 목록(실시간)에서 고름. 요청에 `id`(필수)와 `name` | 고른 `id`가 있으면 그것, 없으면 설정의 `wordpressCategoryId`(기본 카테고리), 둘 다 없으면 사이트 기본 (`category?.id ?? settings.wordpressCategoryId`) |
| 네이버 | 블로그 에디터에서 읽어 저장한 목록(이름)에서 고름 ("목록 불러오기" 버튼) | **발행 창에서만** 고른다. 예약발행·자동발행일 때 발행 창을 연 바로 뒤 단계로. **임시저장에는 적용되지 않는다** (화면에 안내) |
| 티스토리 | 블로그 에디터에서 읽어 저장한 목록(이름)에서 고름 | 임시저장 **하기 전에** 에디터 위쪽 카테고리 칸에서 고른다 (임시저장·예약·자동 모두, 앱 전용 크롬 경로). Claude in Chrome 경로는 프롬프트로 같은 지시 |

| 상황 | 결과 |
|---|---|
| 워드프레스인데 카테고리에 `id`가 없음 | 400 "워드프레스 카테고리는 사이트 목록에서 골라 주세요." |
| 카테고리 값 모양이 틀림(이름 빈칸·100자 초과·`id`가 양의 정수 아님) | 400 "카테고리 값이 올바르지 않습니다." |
| 처음 값 (`GET /api/categories/:platform`의 `last`) | 마지막으로 고른 카테고리. 워드프레스는 없으면 설정의 기본 카테고리 |
| 올리기 요청이 통과하면 | 선택을 `data/categories.json`의 `last`에 저장 (카테고리를 고르지 않았으면 기억을 지움). 요청 검사를 모두 통과해 작업을 시작하기 직전에 저장 |
| 네이버·티스토리에서 카테고리 고르기 단계가 안 됨(칸을 못 찾음, 이름이 목록에 없음, 시간 초과) | **멈추지 않는다** (optional 단계). 기본 카테고리로 올라가고 진행 로그에 "확인 필요: 카테고리 고르기: <이유>"와 그 순간의 화면 구조를 남긴다 ([[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치|BR-PUB-018]]) |
| 네이버·티스토리를 앱 전용 크롬/평소 크롬/Claude in Chrome 중 어느 경로로 올리든 | 같은 이름으로 고르며, Claude in Chrome은 안 되면 `problems`에 "카테고리 선택 못 함"과 이유를 적게 한다 |

고르는 방식(에디터 화면 휴리스틱, `catControl`): 카테고리 글자를 가진 `<select>`가 있으면 선택지를 바로 고르고, 없으면 "카테고리" 글자를 가진 버튼·클릭 영역(또는 라벨 옆 선택 상자·버튼)을 눌러 목록을 연 뒤 같은 이름의 **가장 안쪽 항목**을 누른다. 목록이 떴는데 몇 번 봐도 그 이름이 없으면 "목록에 없습니다"로 실패한다.

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버(검사) | `BlogCategorySchema` `{id?: 양의 정수, name: 1~100자}`, `post-to-blog`에 `category` 선택 필드, 워드프레스는 `id` 필수, 통과하면 `saveLastCategory` | 400 문구 2종 | `blog-writer:server/schema.ts:47-48`, `blog-writer:server/routes/jobs.ts:113-123`, `:157-158` |
| 서버(목록 API) | `GET /api/categories/:platform`: 워드프레스는 사이트에서 실시간(+`last` 또는 설정 기본), 네이버·티스토리는 저장된 목록(블로그 ID가 같을 때만)+`last` | 모르는 블로그 404 | `blog-writer:server/routes/categories.ts:21-42` |
| 서버(저장) | `data/categories.json`: `lists`(네이버·티스토리만), `last`(블로그별) | | `blog-writer:server/categories.ts:10-47` |
| 서버(워드프레스) | `publishToWordPress(..., category)`: 고른 `id`가 설정 기본보다 우선 | | `blog-writer:server/wordpress.ts:260-301` |
| 서버(크롬, 공용) | `selectCategorySteps`(optional 단계 `카테고리 고르기`, 12초), `naverStepsWithOptions`(임시저장이면 안 넣음), `categoryPrompt` | | `blog-writer:server/browser/category.ts:122-163`, `:243-264` |
| 평소 크롬(네이버) | 저장 확인 뒤 `naverStepsWithOptions`로 발행 창 단계 실행 | | `blog-writer:server/browser/userChrome.ts:532-532` |
| 앱 전용 크롬 | 네이버: 같은 `naverStepsWithOptions`. 티스토리: 임시저장 전 `chooseCategory` | | `blog-writer:server/browser/adapters.ts:30-43`, `:406-406` |
| 프롬프트 | Claude in Chrome 지시에 `categoryPrompt` 포함 | 티스토리는 저장 전, 네이버는 발행 창, 임시저장이면 안 고름 | `blog-writer:server/browser/blogPost.ts:167-167` |
| 파이프라인 | `runPost`가 `category`를 `doPost`/`doWordPressPost`로 전달, 로그 "…(방식, 카테고리: X)" | | `blog-writer:server/pipeline.ts:369-392`, `:440-440` |
| 화면 | `useCategories`(목록·마지막 선택 불러오기, "목록 불러오기"), `CategoryField`(선택 상자 "블로그 기본 카테고리"+안내 문구), 올리기 요청에 `category` | 네이버 임시저장이면 "…임시저장에는 적용되지 않습니다." | `blog-writer:src/job/NextStep.tsx:247-330` |
| 테스트 | 기억·목록 저장, 이름 정리, optional 단계·문법, 네이버 단계 끼우기, 안 돼도 다음 단계로, 프롬프트, 요청 검사·목록 API, 워드프레스 우선순위 | | `blog-writer:tests/categories.test.ts:1-113`, `blog-writer:tests/api.test.ts:99-135`, `blog-writer:tests/wordpress.test.ts:115-120` |

## 예외 / 경계값
- 워드프레스 `id` 없이 이름만 보내면 거절된다. 네이버·티스토리는 `id` 없이 이름만 쓴다.
- 네이버 임시저장에서 고른 카테고리는 적용되지 않지만 마지막 선택으로는 기억된다(요청 검사를 통과하면 저장).
- 저장된 네이버·티스토리 목록은 설정의 블로그 ID가 바뀌면 없는 것으로 본다.
- 카테고리 이름은 에디터 목록의 글자와 정확히 같아야 한다(공백 정리 후 비교). 목록을 불러온 뒤 블로그에서 이름을 바꾸면 못 찾아 기본 카테고리로 올라간다.
- 읽어 온 이름은 최대 100개, 40자 이하, 중복 제거 (`cleanCategoryNames`).
- 설정의 `wordpressCategoryId`는 이제 "고르지 않았을 때의 기본값"이다 → [[publishing/entities/블로그 설정]].

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]], [[publishing/flows/카테고리 목록 불러오기 플로우]]

## 확인 필요
- [[publishing/open-questions]] #16 (실제 구조 미확인), #18 (팝업 방식 가능성)

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 (카테고리를 올릴 때마다 고름, 마지막 선택 기억, 네이버는 발행 창에서만, 티스토리는 저장 전, optional 단계) | 커밋 b7ced30 |
