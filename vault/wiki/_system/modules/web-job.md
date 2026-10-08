---
type: module
project: blog-writer
module: web-job
paths: [src/job/**]
source:
  - blog-writer:src/job/JobDetail.tsx:1-358
  - blog-writer:src/job/NextStep.tsx:1-328
  - blog-writer:src/job/images.tsx:1-276
  - blog-writer:src/job/PostEditor.tsx:1-208
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
| `src/job/JobDetail.tsx` | 358 | 화면 전체 조립, 자동 저장(입력 멈춘 뒤 1초, 순서대로 하나씩), 중지·재시도·삭제, 출처 목록. 이미지를 한 장씩 만드는 중(`imageRunsOnly`)이면 다른 이미지 도구는 계속 쓸 수 있음 (위쪽 실패 안내 영역은 2026-10-08 삭제). 2026-10-09: 진행 단계 아래에 "글 상태" 한 줄(`StatusPicker`, `canSetStatus`인 상태에서만)을 두고, 본문 복사 막대(`CopyBar`)는 없앴다 | `JobDetail` | [[writing/flows/초안 편집과 자동 저장 플로우]] |
| `src/job/NextStep.tsx` | 328 | 올릴 블로그 고르기(기본 없음). 2026-10-09부터 네이버·티스토리(`ChromeBlogNext`)도 워드프레스(`WordPressNext`)와 같은 방식 선택(`PublishModeFields`·`usePublishMode`: 임시저장/예약발행/자동발행, 예약 시각은 브라우저 현지 시간 입력, 지금+1분 이후, 네이버는 10분 단위 `NAVER_MINUTE_STEP`), 예약·자동은 확인 창, 이미 올린 블로그에 다시 올리면 새 글이 하나 더 생긴다는 안내와 "다시 올리기 (<방식>)", 마지막으로 올린 블로그(`postingTo`)가 지금 고른 블로그가 아니면 "다른 블로그에 올린 글입니다." 수기 상태 변경은 `StatusPicker`(초안 검토 \| 블로그 임시저장 완료 \| 블로그 발행완료, 초안 검토로 되돌릴 때만 확인 창, 발행 예약이면 그 상태라고 표시). 예전 안내 상자의 "발행 완료로 표시/취소, 초안 완료로 되돌리기" 버튼과 `confirmRevert`는 없어짐 | `NextStep`, `StatusPicker` (내부: `ChromeBlogNext`, `WordPressNext`, `usePublishMode`, `PublishModeFields`) | [[publishing/flows/워드프레스 API 등록 플로우]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] |
| `src/job/images.tsx` | 276 | 실패한 이미지 자리의 실패 이유·안내(`site_error` 포함, 예전에 `ui_changed`로 저장된 사이트 오류도 `site_error`로 보여 줌), 공용 고르기 부품(`StylePicker` 버튼형, `ProviderPicker`, `MethodPicker`: API/크롬, 키 없으면 API 비활성+툴팁, `AiPicker`: 스타일 → AI 순서), 키 상태(`useImageApi`, `hasImageApi`, `noImageApiReason`, `shownMethod`: 키가 없으면 크롬으로 표시), 이미지 한 장 도구(`ImageTools`: 스타일/만드는 곳/만드는 방법을 한 줄씩(`RegenRow`) 고르고 버튼 하나 "이미지 다시 만들기"(아직 없으면 "이미지 만들기") — 예전 "API로/크롬에서 다시 만들기" 두 버튼은 없어짐, 직접 올리기), 미리보기 이미지(만드는 중이면 도구 숨김). 새 글 화면(`NewJob`)도 이 부품을 쓴다 | `FailedPlaceholder`, `useImageApi`, `hasImageApi`, `noImageApiReason`, `StylePicker`, `ProviderPicker`, `AiPicker`, `shownMethod`, `MethodPicker`, `ImageTools`, `ImageToolsProps`, `PreviewImage` | [[image/flows/이미지 다시 만들기 플로우]] |
| `src/job/PostEditor.tsx` | 208 | 블록 편집기, 태그 입력(최대 30개), 표 텍스트 변환, 이미지 설명·문구 편집 (이미지 주소는 `api.ts`의 `imageUrl`) | `PostEditor` | [[writing/flows/초안 편집과 자동 저장 플로우]] |
| `src/job/Preview.tsx` | 129 | 미리보기, 링크·굵게 표시. 복사 버튼(`CopyBar`: 제목·본문 HTML·텍스트·태그 복사)은 2026-10-09에 삭제 | `Preview` | |
| `src/job/Report.tsx` | 83 | 작성 리포트(검색 의도, 키워드, 제목 후보, 태그 근거, 뺀 항목) | `Report` | [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] |
| `src/job/Progress.tsx` | 44 | 진행 단계 표시: 자료 조사 > 글 작성 > 이미지 생성(이미지를 만들 때만) > 초안 검토 > 블로그 임시저장(올리는 중 `posting`과 `posted`가 한 단계, 발행 예약은 이 단계까지 끝난 것) > 블로그 발행완료 | `Progress` | [[writing/entities/Job]] |
| `src/job/JobUsage.tsx` | 29 | 이 글에 쓴 모델별 토큰 | `JobUsage` | [[usage/flows/사용량 확인 플로우]] |

## 의존
- 사용하는 모듈: [[_system/modules/web-app]] (`api`, `labels`), [[_system/modules/web-screens]] (`ExtensionStatus`, `LoginWindow`), [[_system/modules/shared]] (`fitStyle`, `aiFor`, `bodyImageKey`, `PLATFORM_LABEL`, `countBodyChars`, `canSetStatus`·`MANUAL_STATUSES`·`NAVER_MINUTE_STEP`, `PUBLISH_MODE_LABEL`, `methodFor`, `classifyImageError`)
- 사용되는 곳: `src/App.tsx`

## 주의할 점
- `src/job/images.tsx`의 타입 `ImageToolsProps`는 `import { type ... }`로 가져와야 한다 (빌드 도구가 파일 단위로 변환).
