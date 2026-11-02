---
type: module
project: blog-writer
module: web-job
paths: [src/job/**]
source:
  - blog-writer:src/job/JobDetail.tsx
  - blog-writer:src/job/images.tsx
  - blog-writer:src/job/EditByPrompt.tsx
updated: 2026-11-02
---
# web-job (글 상세 화면)

## 역할
한 글의 진행·초안 편집·이미지·고치기·올리기를 한 화면에서 다룬다.

## 주요 파일과 export
| 파일 | 하는 일 |
|---|---|
| `JobDetail.tsx` | 상세 뼈대, 자동 저장, 썸네일 안내 배너 → [[image/business-rules/BR-IMG-007 제목 확정 후 썸네일 생성]] |
| `PostEditor.tsx` | 블록 편집, 키워드 횟수·글자수 표시 → [[writing/business-rules/BR-WRT-004 키워드 횟수와 검색 의도]] |
| `TitlePicker.tsx` | 제목 후보 선택·다시 만들기 → [[writing/flows/제목 후보 다시 만들기]] |
| `EditByPrompt.tsx` | 프롬프트로 고치기·분량 말투 다시 쓰기·비교 → [[writing/flows/프롬프트로 글 고치기]] |
| `images.tsx` | 이미지 카드: 다시 만들기·올리기·삭제·자리 추가·오류 안내 → [[image/flows/이미지 생성]] |
| `NextStep.tsx` | 블로그에 올리기(블로그·방식·카테고리·예약) → [[publishing/flows/블로그에 올리기]] |
| `Preview.tsx` | 블로그별 미리보기·복사 |
| `Progress.tsx`, `Report.tsx`, `JobUsage.tsx` | 진행 표시, 결과 보고, 글 사용량 |

## 의존하는 모듈 / 쓰이는 곳
`src/api.ts`, `shared/`(글자수·키워드·HTML·상태).

## 주의할 점
- 규칙 값은 화면에 복사하지 않고 `shared/`의 상수를 쓴다(분량 상한, 키워드 허용 횟수, 예약 단위 등).
