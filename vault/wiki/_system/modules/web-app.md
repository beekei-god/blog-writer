---
type: module
project: blog-writer
module: web-app
paths: [src/App.tsx, src/main.tsx, src/api.ts, src/labels.ts, src/leaveGuard.ts, src/vite-env.d.ts, src/styles.css]
source:
  - blog-writer:src/App.tsx:1-261
  - blog-writer:src/api.ts:1-164
  - blog-writer:src/labels.ts:1-87
  - blog-writer:src/leaveGuard.ts:1-11
updated: 2026-10-09
---
# web-app 모듈

## 책임
화면의 뼈대: 탭 이동, 작업 목록 사이드바, 폴링, API 클라이언트, 화면 문구·라벨, 저장 안 한 내용 이탈 확인.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `src/App.tsx` | 261 | 상단 탭(2026-10-09부터 새 글 → 키워드 탐색 → 주제 추천 → 글쓰기 규칙 → 사용량 → 설정, `TABS`·`View`에 `keywords` 추가). 키워드 탐색에서 키워드를 새 글 주제로 넘기거나(`onUseKeyword`), 그 키워드로 주제 추천을 바로 시작한다(`onRecommend` → `recommendRequest={field, nonce}`를 주제 추천 화면에 넘기고 `onRequestHandled`로 비움. 저장 안 한 내용 이탈 확인 `canLeave` 거침), 내 글 목록(상태 필터 칩, 2026-10-09부터 작성 단계별: 전체 / 자료 조사 중(researching·writing·generating_images) / 초안 검토(draft_ready) / 임시 저장(posting·posted) / 발행 완료(scheduled·published), 실패는 "전체"에서만, 필터별 개수), 진행 중일 때(작업 상태 또는 `editProposal`이 만드는 중일 때, 2026-10-09) 1.5초 폴링, 사용량 60초 폴링, 플랜 한도 칩, 블로그별 연결 여부(`ready`)와 하나도 없을 때 설정 안내 | `App` | [[writing/flows/초안 작성 플로우]] |
| `src/main.tsx` | 10 | React 루트 마운트 (StrictMode) | | 단순 파일 |
| `src/api.ts` | 164 | 모든 `/api` 호출 함수와 응답 타입. 오류 응답의 `error`를 예외 메시지로. 이미지 파일 주소 `imageUrl`(2026-10-09, 미리보기·편집기 공용). `setStatus`는 `ManualStatus`를 받는다. 2026-10-09(2차): `getCategories`·`refreshCategories`(`CategoryList` 타입), 2026-10-09(3차) `getSearchAd`·`saveSearchAd`·`deleteSearchAd`(`SearchAdStatus` 타입)·`exploreKeywords`(`KeywordResult` 타입, `GET /api/keywords?q=`), `getWordPressCategories` 삭제, `editPost`·`applyEdit`·`discardEdit`, `addImage`·`deleteImage`, `postToBlog`에 `category`, `regenerateImages`에 `thumbnailMethod` | `api`, `CategoryList`, `imageUrl`, `DatalabStatus`, `SearchAdStatus`, `KeywordResult`, `ImageApiStatus`, `ImageApiKeyStatus`, `WordPressStatus`, `LoginWindowStatus`, `BlockedSites`, `ExtensionStatusInfo`, `Rules` | [[_system/api]] |
| `src/labels.ts` | 87 | AI·스타일·단계·모델 라벨과 설명, 추천 모델 이유, 토큰·금액·시간 표시 함수. 상태 이름과 `errorText`는 `shared/labels.ts`에서 다시 내보낸다 | `STATUS_LABEL`(재수출), `errorText`(재수출), `PROVIDER_LABEL`, `PROVIDER_HINT`, `STYLE_LABEL`, `STAGE_LABEL`, `STAGE_HINT`, `MODEL_REASON`, `MODEL_CHOICE_LABEL`, `prettyModel`, `fmtTokens`, `fmtUSD`, `timeAgo`, `resetText` | [[glossary]], [[usage/business-rules/BR-USG-001 단계별 추천 모델]] |
| `src/leaveGuard.ts` | 11 | 저장 안 한 화면이 등록하는 이탈 확인 (`confirm`) | `setLeaveGuard`, `canLeave` | [[writing/entities/글쓰기 규칙]] |
| `src/vite-env.d.ts` | 1 | 단순 파일: Vite 타입 참조 | | |
| `src/styles.css` | 407 | 전역 스타일, 밝은/어두운 테마 변수, 상태 배지·진행 단계·미리보기·표·글 상태 줄 스타일, 카테고리 칸·글 고치기 카드·이미지 추가 버튼 스타일, 키워드 표 스타일(`.keyword-filters`·`.keyword-table`·`.vol-bar`·경쟁 색 `comp-0`/`comp-2`, 2026-10-09) (복사 막대 스타일은 2026-10-09 삭제) | | 단순 파일 (로직 없음) |

## 의존
- 사용하는 모듈: [[_system/modules/web-screens]] (`Keywords`, `Recommend` 포함), [[_system/modules/web-job]], [[_system/modules/shared]]
- 사용되는 곳: `index.html`

## 주의할 점
- `MODEL_REASON`은 `shared/types.ts`의 `RECOMMENDED_MODELS`와 함께 고쳐야 한다는 주석이 있다 (`blog-writer:src/labels.ts:43`).
- 작업 상세 화면은 `GET /api/jobs/:id`가 아니라 목록 응답에서 고른 job을 쓴다 (`blog-writer:src/App.tsx:104`).
