---
type: module
project: blog-writer
module: web-job
paths: [src/job/**]
source:
  - blog-writer:src/job/JobDetail.tsx:1-367
  - blog-writer:src/job/NextStep.tsx:1-267
  - blog-writer:src/job/images.tsx:1-259
  - blog-writer:src/job/PostEditor.tsx:1-207
  - blog-writer:src/job/Preview.tsx:1-185
  - blog-writer:src/job/Report.tsx:1-83
  - blog-writer:src/job/Progress.tsx:1-46
  - blog-writer:src/job/JobUsage.tsx:1-29
updated: 2026-10-07
---
# web-job 모듈 (글 상세 화면)

## 책임
내 글 하나를 여는 화면: 진행 단계, 다음에 할 일(블로그 선택·등록 방식·상태 변경), 미리보기와 복사, 초안 편집과 자동 저장, 이미지 실패·다시 만들기·직접 올리기, 작성 리포트, 사용한 모델과 토큰. 2026-10-07 리팩터링 전에는 `src/JobDetail.tsx` 한 파일(약 1,430줄)이었다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `src/job/JobDetail.tsx` | 367 | 화면 전체 조립, 자동 저장(입력 멈춘 뒤 1초, 순서대로 하나씩), 중지·재시도·삭제, 출처 목록 | `JobDetail` | [[writing/flows/초안 편집과 자동 저장 플로우]] |
| `src/job/NextStep.tsx` | 267 | 올릴 블로그 고르기(기본 없음), 네이버·티스토리 임시저장 안내, 워드프레스 등록 방식(임시저장/예약발행/자동발행, 예약은 한국 시간 입력, 자동·예약은 확인 창), 발행 완료 표시·초안 완료로 되돌리기 | `NextStep` (`WordPressNext`, `confirmRevert`) | [[publishing/flows/워드프레스 API 등록 플로우]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] |
| `src/job/images.tsx` | 259 | 이미지 실패 목록과 원인별 안내, AI·스타일 고르기, 이미지 한 장 도구(다시 만들기·직접 올리기), 미리보기 이미지 | `imageSpecs`, `FailedPlaceholder`, `AiPicker`, `ImageFailures`, `ImageTools`, `ImageToolsProps`, `PreviewImage` | [[image/flows/이미지 다시 만들기 플로우]] |
| `src/job/PostEditor.tsx` | 207 | 블록 편집기, 태그 입력(최대 30개), 표 텍스트 변환, 이미지 설명·문구 편집 | `PostEditor` | [[writing/flows/초안 편집과 자동 저장 플로우]] |
| `src/job/Preview.tsx` | 185 | 미리보기, 링크·굵게 표시, 복사 버튼(제목·본문 HTML·텍스트) | `Preview`, `CopyBar` | |
| `src/job/Report.tsx` | 83 | 작성 리포트(검색 의도, 키워드, 제목 후보, 태그 근거, 뺀 항목) | `Report` | [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] |
| `src/job/Progress.tsx` | 46 | 진행 단계 표시 (예약됨 포함) | `Progress` | [[writing/entities/Job]] |
| `src/job/JobUsage.tsx` | 29 | 이 글에 쓴 모델별 토큰 | `JobUsage` | [[usage/flows/사용량 확인 플로우]] |

## 의존
- 사용하는 모듈: [[_system/modules/web-app]] (`api`, `labels`), [[_system/modules/web-screens]] (`ExtensionStatus`, `LoginWindow`), [[_system/modules/shared]] (`fitStyle`, `aiFor`, `bodyImageKey`, `PLATFORM_LABEL`, `countBodyChars`, `postToHtml`/`postToText`, `classifyImageError`)
- 사용되는 곳: `src/App.tsx`

## 주의할 점
- `src/job/images.tsx`의 타입 `ImageToolsProps`는 `import { type ... }`로 가져와야 한다 (빌드 도구가 파일 단위로 변환).
