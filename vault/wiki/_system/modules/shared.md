---
type: module
project: blog-writer
module: shared
paths: [shared/**]
source:
  - blog-writer:shared/types.ts:1-413
  - blog-writer:shared/blockDiff.ts:1-62
  - blog-writer:shared/length.ts:1-33
  - blog-writer:shared/postHtml.ts:1-57
  - blog-writer:shared/imageErrors.ts:1-118
  - blog-writer:shared/labels.ts:1-26
updated: 2026-10-09
---
# shared 모듈

## 책임
서버와 화면이 함께 쓰는 타입·상수·순수 함수. 같은 규칙(분량, 태그 수, 스타일 제한, 붙여넣기 HTML, 상태·블로그 이름)을 양쪽에서 같은 값으로 쓰게 하는 장치다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `shared/types.ts` | 413 | 모든 도메인 타입과 상수, 작은 순수 함수. 2026-10-09 추가: `NAVER_MINUTE_STEP`(10, 네이버 예약 분 단위), `MAX_LINKS`(20, 참고 링크 수), `ImageOptions.method`·`thumbnailMethod`와 `methodFor`(썸네일은 `thumbnailMethod ?? method`, 없으면 `api`), `imageSpecAt`(키로 이미지 찾기)·`imageSpecsOf`(썸네일+본문 이미지 목록), `MANUAL_STATUSES`·`ManualStatus`·`canSetStatus`(수기 상태 변경), 2026-10-09(2차) `BlogCategory`(`{id?, name}`: 워드프레스는 사이트 카테고리 ID, 네이버·티스토리는 이름), `EditProposal`(프롬프트로 글 고치기 제안: `prompt`·`range?`·`status` running/ready/failed·`before`/`after`·`title`/`summary`·`note`·`charsBefore`/`charsAfter`·`error`), `Job.editProposal`, 2026-10-09(3차) 키워드 탐색 `KeywordRow`(키워드·합계·PC·모바일·`lowPc`/`lowMobile`("< 10"은 5로 치고 표시)·`competition`·`seed`·`trend?`)와 `KeywordSection`(`id` input/trending/recommendation·`title`·`note?`·`seeds`·`rows`·`error?`, `blog-writer:shared/types.ts:282-310`). `Settings.wordpressCategoryId`는 삭제 | `Platform`, `BlogCategory`, `EditProposal`, `ImageProvider`, `ImageStyle`, `STYLES_BY_PROVIDER`, `MAX_BODY_IMAGES`, `NAVER_MINUTE_STEP`, `MAX_LINKS`, `ImageScope`, `ImageMethod`, `bodyImageKey`, `imageKey`, `bodyIndexOf`, `ImageOptions`, `fitStyle`, `aiFor`, `methodFor`, `STAGES`, `MODEL_CHOICES`, `RECOMMENDED_MODELS`, `PlanLimits`, `TokenTotals`, `UsageSummary`, `Settings`, `blogIdOf`, `PostSettings`, `settingsFor`, `ImageSpec`, `PostBlock`, `TAG_SOURCES`, `TagDetail`, `MAX_TAGS`, `Post`, `imageSpecAt`, `imageSpecsOf`, `Source`, `JobStatus`, `PublishMode`, `WordPressRecord`, `BUSY_STATUSES`, `MANUAL_STATUSES`, `ManualStatus`, `canSetStatus`, `Job`, `Evidence`, `InterestStat`, `TopicCandidate`, `Recommendation` | [[writing/entities/Job]], [[writing/entities/Post]], [[image/entities/ImageSpec]], [[publishing/entities/블로그 설정]] |
| `shared/blockDiff.ts` | 62 | (2026-10-09 새 파일) 글 고치기 비교 화면용 순수 함수. 블록 하나를 보여 줄 글(`blockText`, 이미지는 대체 텍스트), 고치기 전·후 블록을 가장 긴 공통 부분 기준으로 비교(`diffBlocks`: 같은 블록은 same, 빠진 것 del, 새 것 add), 같은 블록이 이어지는 구간을 접기(`collapseSame`, 앞뒤 `keep`개만 남김) | `blockText`, `DiffRow`, `diffBlocks`, `collapseSame` | [[_system/modules/web-job]], [[_system/modules/tests]] |
| `shared/length.ts` | 33 | 본문 분량 상한과 글자수 계산 | `MAX_BODY_CHARS`, `countBodyChars` | [[writing/business-rules/BR-WRT-002 본문 글자수 계산]] |
| `shared/postHtml.ts` | 57 | 붙여넣기·워드프레스 등록용 HTML 조각(표·굵게·링크), 태그 줄, 건너뛴 이미지 이름. 2026-10-09에 화면 "본문 복사"가 없어지며 `postToHtml`·`postToText`(복사용 서식)를 지웠고, `tableHtml(b, cellExtra, tableExtra)`로 워드프레스 표도 같이 만든다. `plain`·`tagLine`·`skippedImageLabel`을 공용으로 export | `esc`, `rich`, `plain`, `tableHtml`, `skippedImageLabel`, `URL_RE`, `splitUrl`, `urlsIn`, `BLANK_LINE`, `TAG_GAP_LINES`, `tagLine`, `TABLE_COLORS` | [[publishing/business-rules/BR-PUB-006 태그 입력 위치]] |
| `shared/labels.ts` | 26 | 상태 이름(2026-10-09에 진행 단계 이름과 맞춤: 자료 조사 중·글 작성 중·이미지 생성 중·초안 검토·블로그 임시저장 중·블로그 임시저장 완료·블로그 발행 예약·블로그 발행완료·실패. `statusLabel`의 워드프레스 분기는 없어짐), 블로그 이름(긴 것/문장용 짧은 것), 올리는 방식 이름 `PUBLISH_MODE_LABEL`(임시저장·예약발행·자동발행), 오류 메시지 꺼내기. 서버 오류 메시지와 화면이 같은 문구를 쓴다 | `STATUS_LABEL`, `statusLabel`, `PLATFORM_LABEL`, `PLATFORM_SHORT_LABEL`, `PUBLISH_MODE_LABEL`, `errorText` | [[glossary]] |
| `shared/imageErrors.ts` | 118 | 이미지 실패 원인 15종(2026-10-09 `site_error` 추가: "문제가 발생"·"오류가 발생"·"Something went wrong"·"An error occurred" 같은 사이트 오류 안내), 원인별 안내 문구, 메시지 → 원인 분류 | `IMAGE_ERROR_KINDS`, `IMAGE_ERROR_INFO`, `classifyImageError` | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] |

## 의존
- 사용하는 모듈: 없음
- 사용되는 곳: 서버 모든 모듈, [[_system/modules/web-app]], [[_system/modules/web-screens]], [[_system/modules/web-job]]

## 주의할 점
- 2026-10-09 변경 뒤에도 남은 낡은 주석: `PUBLISH_MODE_LABEL`의 "워드프레스만 임시저장 외 방식을 고를 수 있다", `JobStatus`의 `scheduled`("워드프레스 API로 예약 발행")·`published`("앱은 발행하지 않는다") 설명. 지금은 네이버·티스토리도 앱이 예약발행·자동발행한다 (`blog-writer:shared/labels.ts:23-24`, `blog-writer:shared/types.ts:254-257`).
