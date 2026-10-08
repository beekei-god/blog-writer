---
type: module
project: blog-writer
module: shared
paths: [shared/**]
source:
  - blog-writer:shared/types.ts:1-325
  - blog-writer:shared/length.ts:1-33
  - blog-writer:shared/postHtml.ts:1-157
  - blog-writer:shared/imageErrors.ts:1-109
  - blog-writer:shared/labels.ts:1-24
updated: 2026-10-08
---
# shared 모듈

## 책임
서버와 화면이 함께 쓰는 타입·상수·순수 함수. 같은 규칙(분량, 태그 수, 스타일 제한, 붙여넣기 HTML, 상태·블로그 이름)을 양쪽에서 같은 값으로 쓰게 하는 장치다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `shared/types.ts` | 325 | 모든 도메인 타입과 상수, 작은 순수 함수 | `Platform`, `ImageProvider`, `ImageStyle`, `STYLES_BY_PROVIDER`, `MAX_BODY_IMAGES`, `ImageScope`, `ImageMethod`, `bodyImageKey`, `imageKey`, `bodyIndexOf`, `ImageOptions`, `fitStyle`, `aiFor`, `STAGES`, `MODEL_CHOICES`, `RECOMMENDED_MODELS`, `PlanLimits`, `TokenTotals`, `UsageSummary`, `Settings`, `blogIdOf`, `PostSettings`, `settingsFor`, `ImageSpec`, `PostBlock`, `TAG_SOURCES`, `TagDetail`, `MAX_TAGS`, `Post`, `Source`, `JobStatus`, `PublishMode`, `WordPressRecord`, `BUSY_STATUSES`, `Job`, `Evidence`, `InterestStat`, `TopicCandidate`, `Recommendation` | [[writing/entities/Job]], [[writing/entities/Post]], [[image/entities/ImageSpec]], [[publishing/entities/블로그 설정]] |
| `shared/length.ts` | 33 | 본문 분량 상한과 글자수 계산 | `MAX_BODY_CHARS`, `countBodyChars` | [[writing/business-rules/BR-WRT-002 본문 글자수 계산]] |
| `shared/postHtml.ts` | 157 | 붙여넣기용 HTML 조각(표·굵게·링크), 복사용 서식 HTML/텍스트 | `esc`, `rich`, `tableHtml`, `URL_RE`, `splitUrl`, `urlsIn`, `BLANK_LINE`, `TAG_GAP_LINES`, `TABLE_COLORS`, `postToHtml`, `postToText` | [[publishing/business-rules/BR-PUB-006 태그 입력 위치]] |
| `shared/labels.ts` | 24 | 상태 이름(올리는 중은 `statusLabel`이 블로그에 따라 "워드프레스 등록 중"/"크롬 작성 중"), 블로그 이름(긴 것/문장용 짧은 것), 오류 메시지 꺼내기. 서버 오류 메시지와 화면이 같은 문구를 쓴다 | `STATUS_LABEL`, `statusLabel`, `PLATFORM_LABEL`, `PLATFORM_SHORT_LABEL`, `errorText` | [[glossary]] |
| `shared/imageErrors.ts` | 109 | 이미지 실패 원인 14종(`api_error` 추가), 원인별 안내 문구, 메시지 → 원인 분류 | `IMAGE_ERROR_KINDS`, `IMAGE_ERROR_INFO`, `classifyImageError` | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] |

## 의존
- 사용하는 모듈: 없음
- 사용되는 곳: 서버 모든 모듈, [[_system/modules/web-app]], [[_system/modules/web-screens]], [[_system/modules/web-job]]
