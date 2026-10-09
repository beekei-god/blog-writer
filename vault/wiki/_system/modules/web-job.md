---
type: module
project: blog-writer
module: web-job
paths: [src/job/**]
source:
  - blog-writer:src/job/JobDetail.tsx:1-412
  - blog-writer:src/job/NextStep.tsx:1-425
  - blog-writer:src/job/images.tsx:1-288
  - blog-writer:src/job/EditByPrompt.tsx:1-166
  - blog-writer:src/job/PostEditor.tsx:1-248
  - blog-writer:src/job/Preview.tsx:1-129
  - blog-writer:src/job/Report.tsx:1-83
  - blog-writer:src/job/Progress.tsx:1-44
  - blog-writer:src/job/JobUsage.tsx:1-29
updated: 2026-10-09
---
# web-job 모듈 (글 상세 화면)

## 책임
내 글 하나를 여는 화면: 진행 단계, 다음에 할 일(블로그 선택·등록 방식·상태 변경), 미리보기, 초안 편집과 자동 저장, 이미지별 실패 이유·다시 생성·직접 올리기, 작성 리포트, 사용한 모델과 토큰. 2026-10-07 리팩터링 전에는 `src/JobDetail.tsx` 한 파일(약 1,430줄)이었다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `src/job/JobDetail.tsx` | 412 | 화면 전체 조립, 자동 저장(입력 멈춘 뒤 1초, 순서대로 하나씩), 중지·재시도·삭제, 출처 목록. 이미지를 한 장씩 만드는 중(`imageRunsOnly`)이면 다른 이미지 도구는 계속 쓸 수 있음 (위쪽 실패 안내 영역은 2026-10-08 삭제). 2026-10-09: 진행 단계 아래에 "글 상태" 한 줄(`StatusPicker`, `canSetStatus`인 상태에서만)을 두고, 본문 복사 막대(`CopyBar`)는 없앴다. 2026-10-09(2차): 프롬프트로 글 고치기 카드(`EditByPrompt`, 시작 전에 `flush()`로 편집 내용 저장)와 편집 화면의 블록 선택 상태(`selected`, 블록 수가 바뀌면 비움)를 조립하고, `busy`에 `editProposal.status==='running'`을 포함해 글 수정·올리기·이미지 작업을 막음. 이미지 추가(`onAdd`)·삭제(`onDelete`, 확인 창, 둘 다 `flush()` 뒤 서버 API)를 `imageTools`에 넘기고, "썸네일이 없습니다" 영역에 `MethodPicker`(Gemini·ChatGPT만)를 두어 `thumbnailMethod`를 `regenerateImages`로 보냄 | `JobDetail` | [[writing/flows/초안 편집과 자동 저장 플로우]] |
| `src/job/NextStep.tsx` | 425 | 올릴 블로그 고르기(기본 없음). 2026-10-09부터 네이버·티스토리(`ChromeBlogNext`)도 워드프레스(`WordPressNext`)와 같은 방식 선택(`PublishModeFields`·`usePublishMode`: 임시저장/예약발행/자동발행, 예약 시각은 브라우저 현지 시간 입력, 지금+1분 이후, 네이버는 10분 단위 `NAVER_MINUTE_STEP`), 예약·자동은 확인 창, 이미 올린 블로그에 다시 올리면 새 글이 하나 더 생긴다는 안내와 "다시 올리기 (<방식>)", 마지막으로 올린 블로그(`postingTo`)가 지금 고른 블로그가 아니면 "다른 블로그에 올린 글입니다." 수기 상태 변경은 `StatusPicker`(초안 검토 \| 블로그 임시저장 완료 \| 블로그 발행완료, 초안 검토로 되돌릴 때만 확인 창, 발행 예약이면 그 상태라고 표시). 예전 안내 상자의 "발행 완료로 표시/취소, 초안 완료로 되돌리기" 버튼과 `confirmRevert`는 없어짐. 2026-10-09(2차): 카테고리 고르기 — `useCategories`(블로그가 바뀌면 `GET /api/categories`로 목록·마지막 선택을 다시 읽고 `refresh`로 목록 불러오기), `CategoryField`(선택 상자 "블로그 기본 카테고리" 포함, 네이버·티스토리는 "목록 불러오기" 버튼과 안내 문구, 네이버 임시저장이면 "적용되지 않습니다", 네이버 예약·자동이면 "네이버 주제는 글 내용을 보고 자동으로 고릅니다.", 오류는 화면 구조까지 `<pre>`로), 올리기 요청 타입 `PostOpts`(mode·scheduledAt·category). 워드프레스(`WordPressNext`)·크롬 블로그(`ChromeBlogNext`) 모두 사용. 글 고치는 중이면 안내 문구가 바뀜 | `NextStep`, `PostOpts`, `StatusPicker` (내부: `ChromeBlogNext`, `WordPressNext`, `usePublishMode`, `PublishModeFields`) | [[publishing/flows/워드프레스 API 등록 플로우]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] |
| `src/job/images.tsx` | 288 | 실패한 이미지 자리의 실패 이유·안내(`site_error` 포함, 예전에 `ui_changed`로 저장된 사이트 오류도 `site_error`로 보여 줌), 공용 고르기 부품(`StylePicker` 버튼형, `ProviderPicker`, `MethodPicker`: API/크롬, 키 없으면 API 비활성+툴팁, `AiPicker`: 스타일 → AI 순서), 키 상태(`useImageApi`, `hasImageApi`, `noImageApiReason`, `shownMethod`: 키가 없으면 크롬으로 표시), 이미지 한 장 도구(`ImageTools`: 스타일/만드는 곳/만드는 방법을 한 줄씩(`RegenRow`) 고르고 버튼 하나 "이미지 다시 만들기"(아직 없으면 "이미지 만들기") — 예전 "API로/크롬에서 다시 만들기" 두 버튼은 없어짐, 직접 올리기), 미리보기 이미지(만드는 중이면 도구 숨김). 새 글 화면(`NewJob`)도 이 부품을 쓴다. 2026-10-09(2차): `ImageToolsProps`에 `onDelete`·`onAdd`·`locked` 추가, `ImageTools`에 `hasFile` 인자 — "이미지 삭제" 버튼은 파일이 있는 이미지에만 표시. `hasImageApi`·`noImageApiReason`은 이 파일 안에서만 쓰는 내부 상수로 바뀜(export 아님) | `FailedPlaceholder`, `useImageApi`, `StylePicker`, `ProviderPicker`, `AiPicker`, `shownMethod`, `MethodPicker`, `ImageTools`, `ImageToolsProps`, `PreviewImage` | [[image/flows/이미지 다시 만들기 플로우]] |
| `src/job/PostEditor.tsx` | 248 | 블록 편집기, 태그 입력(최대 30개), 표 텍스트 변환, 이미지 설명·문구 편집 (이미지 주소는 `api.ts`의 `imageUrl`). 2026-10-09(2차): 블록마다 고치기용 체크박스(`selection` prop), 블록 사이 "＋ 여기에 이미지 추가"(이미지 옆이거나 본문 이미지가 `MAX_BODY_IMAGES`(6)장이면 숨김/비활성, 진행 중이면 `locked`), 이미지 블록의 ×는 이미지 삭제와 같음(확인 포함) | `PostEditor` | [[writing/flows/초안 편집과 자동 저장 플로우]] |
| `src/job/EditByPrompt.tsx` | 166 | (2026-10-09 새 파일) "프롬프트로 글 고치기 · 내용 추가" 카드. 수정 요청 입력(2~2,000자), 편집 화면에서 고른 블록 → 처음~끝 포함 범위(사이의 블록도 포함, 떨어진 블록을 고르면 사이까지 전부 고쳐짐), 만드는 중 표시+중지, 실패 표시, 결과는 바뀐 블록만 비교(`diffBlocks`/`collapseSame`: 추가 초록·삭제 취소선, 제목·요약 변경, 본문 글자 수 변화와 `MAX_BODY_CHARS`(3,000자) 초과 경고 — 경고만 하고 자동으로 줄이지 않음), 적용 / 요청을 고쳐서 다시 만들기 / 버리기 | `EditByPrompt` | [[_system/modules/shared]] (`blockDiff`), [[_system/api]] |
| `src/job/Preview.tsx` | 129 | 미리보기, 링크·굵게 표시. 복사 버튼(`CopyBar`: 제목·본문 HTML·텍스트·태그 복사)은 2026-10-09에 삭제 | `Preview` | |
| `src/job/Report.tsx` | 83 | 작성 리포트(검색 의도, 키워드, 제목 후보, 태그 근거, 뺀 항목) | `Report` | [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] |
| `src/job/Progress.tsx` | 44 | 진행 단계 표시: 자료 조사 > 글 작성 > 이미지 생성(이미지를 만들 때만) > 초안 검토 > 블로그 임시저장(올리는 중 `posting`과 `posted`가 한 단계, 발행 예약은 이 단계까지 끝난 것) > 블로그 발행완료 | `Progress` | [[writing/entities/Job]] |
| `src/job/JobUsage.tsx` | 29 | 이 글에 쓴 모델별 토큰 | `JobUsage` | [[usage/flows/사용량 확인 플로우]] |

## 의존
- 사용하는 모듈: [[_system/modules/web-app]] (`api`, `labels`), [[_system/modules/web-screens]] (`ExtensionStatus`, `LoginWindow`), [[_system/modules/shared]] (`blockDiff`(`diffBlocks`·`collapseSame`·`blockText`), `BlogCategory`, `fitStyle`, `aiFor`, `bodyImageKey`, `PLATFORM_LABEL`, `countBodyChars`, `canSetStatus`·`MANUAL_STATUSES`·`NAVER_MINUTE_STEP`, `PUBLISH_MODE_LABEL`, `methodFor`, `classifyImageError`)
- 사용되는 곳: `src/App.tsx`

## 주의할 점
- `src/job/images.tsx`의 타입 `ImageToolsProps`는 `import { type ... }`로 가져와야 한다 (빌드 도구가 파일 단위로 변환).
