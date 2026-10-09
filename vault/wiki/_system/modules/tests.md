---
type: module
project: blog-writer
module: tests
paths: [tests/**, vitest.config.ts]
source:
  - blog-writer:vitest.config.ts:1-10
  - blog-writer:tests/setup.ts:1-10
  - blog-writer:tests/shared.test.ts:1-125
  - blog-writer:tests/writer.test.ts:1-83
  - blog-writer:tests/store.test.ts:1-54
  - blog-writer:tests/wordpress.test.ts:1-187
  - blog-writer:tests/api.test.ts:2-263
  - blog-writer:tests/webAi.test.ts:1-53
  - blog-writer:tests/imageApi.test.ts:1-148
  - blog-writer:tests/imageParallel.test.ts:1-189
  - blog-writer:tests/publish.test.ts:1-119
  - blog-writer:tests/categories.test.ts:1-120
  - blog-writer:tests/editPost.test.ts:1-223
  - blog-writer:tests/naverTopic.test.ts:1-63
  - blog-writer:tests/searchad.test.ts:1-124
  - blog-writer:tests/explore.test.ts:1-161
updated: 2026-10-09
---
# tests 모듈 (자동 테스트)

## 책임
vitest로 업무 규칙과 API 입력 검사를 확인한다. `npm test`(= `vitest run`). 테스트 파일마다 빈 임시 데이터 폴더(`BLOG_WRITER_DATA_DIR`)를 쓰고 끝나면 지우므로 실제 `data/`를 건드리지 않는다 (`blog-writer:tests/setup.ts:1-10`). Claude·크롬·실제 네트워크는 부르지 않는다.

## 파일
| 파일 | 줄 | 확인하는 것 | 관련 페이지 |
|---|---|---|---|
| `vitest.config.ts` | 10 | `tests/**/*.test.ts`, node 환경, `tests/setup.ts` 먼저 실행 | |
| `tests/setup.ts` | 10 | 임시 데이터 폴더 지정·정리 | [[_system/configuration]] |
| `tests/shared.test.ts` | 153 | 본문 글자수(공백 포함, 줄바꿈·굵게·이미지 제외, 참고 자료 이후 제외, 이모지 1자), 블로그별 설정(`blogIdOf`/`settingsFor`), 스타일 맞추기·썸네일 AI 결정·이미지 키, 만드는 방법 결정(`methodFor`: 썸네일 방법 없으면 본문 방법, 둘 다 없으면 api), 라벨(올리는 중 이름은 블로그와 관계없이 같음), 글 고치기 비교(`diffBlocks`·`collapseSame`·`blockText`: 고친 블록만 del·add, 길게 이어진 같은 블록 접기, 이미지는 대체 텍스트), 이미지 오류 분류 (복사용 텍스트 테스트는 2026-10-09 기능 삭제와 함께 없어짐) | [[writing/business-rules/BR-WRT-002 본문 글자수 계산]], [[image/business-rules/BR-IMG-003 썸네일 AI와 스타일 결정]] |
| `tests/writer.test.ts` | 83 | 날짜 표시줄 제거, 표 빈 칸 행 제거, 이미지 개수 옵션, 태그 출처 검증, 데이터랩 관심도 환산·상승세 | [[writing/business-rules/BR-WRT-005 태그 출처 검증]], [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] |
| `tests/store.test.ts` | 54 | 데이터 폴더 환경 변수, 예전 설정(`platform`/`blogId`) 옮기기, 동시 로그 기록 | [[publishing/entities/블로그 설정]] |
| `tests/wordpress.test.ts` | 187 | 사이트 주소·예약 시각 검사, Gutenberg 블록, 가짜 사이트로 등록·갱신·재사용·대체 경로·401 원인별 메시지, 올릴 때 고른 카테고리만 보내고 고르지 않으면 `categories`를 보내지 않음(2026-10-09, 설정의 기본 카테고리 삭제) | [[_system/integrations/wordpress-rest]] |
| `tests/webAi.test.ts` | 53 | 웹 AI 이미지 생성: Claude가 `failed`로 보고해도 다운로드 폴더의 이번 이미지는 성공 처리, 없으면 `ui_changed`, 사이트 오류 안내면 `site_error` (Claude·크롬 호출은 mock, 임시 다운로드 폴더) | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] |
| `tests/imageApi.test.ts` | 148 | 이미지 API: fetch를 가짜로 바꿔 OpenAI·Gemini 성공 응답 저장, 키 없음·크롬 선택이면 크롬 경로(mock), 썸네일·본문 방법을 따로(썸네일 크롬, 본문 API), 429·거절·401은 크롬으로 넘기지 않고 `limit`·`refused`·`api_error`, 키 설정 API가 키 값을 돌려주지 않음 | [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]], [[_system/integrations/image-api]] |
| `tests/imageParallel.test.ts` | 189 | 이미지 한 장씩 다시 만들기 동시 실행: API 요청 둘이 함께 진행, 둘 다 끝나야 초안 상태, 같은 이미지 재요청 무시, 중지하면 모두 멈춤, 진행 중 다른 이미지 202·같은 이미지·초안 수정·전체 다시 만들기 409, 썸네일이 없는 글의 썸네일 추가에서도 `thumbnailMethod` 고르기 (이미지 기획·크롬은 mock) | [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]] |
| `tests/publish.test.ts` | 102 | (2026-10-09 새 파일) 네이버·티스토리 발행 창 단계: 한국 시간 변환(`kstParts`·`kstText`), 네이버 예약 10분 단위 아니면 `PublishStepError`, 예약은 날짜·시각 입력→다시 읽어 확인→발행 버튼 순서, 즉시 발행엔 예약 단계 없음, 단계 js 문법 검사, 실행기(false면 다시, ERR면 멈춤, 발행 버튼 전에만 중지 반영, 발행 확인 실패 문구, 멈출 때 발행 창 구조를 오류에 붙이고 못 읽어도 원래 오류 유지), 발행 창 구조 스크립트 문법과 "보이는 요소를 `offsetParent`로 판별하지 않는다"(position:fixed 팝업), Claude in Chrome 발행 안내(`publishPrompt`, 입력 문제가 있어도 발행). 실제 발행 창이 아니라 가짜 `exec`로만 확인 | [[_system/integrations/blog-editors]], [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]] |
| `tests/categories.test.ts` | 113 | (2026-10-09 새 파일) 카테고리 기억(`categories.ts`: 목록은 저장한 블로그 ID의 것만, 마지막 선택은 블로그별·고르지 않으면 지움)과 읽기·고르기 코드(`category.ts`): 이름 정리, 고르기 단계가 optional이고 스크립트 문법이 맞음, 네이버는 발행 창을 연 바로 뒤에 카테고리·주제 단계를 넣고 임시저장이면 안 넣음, optional 단계 실패 시 "확인 필요" 문구+화면 구조를 남기고 계속, 주제 단계는 팝업 순서(열기→이름→확인→닫힘)를 한 단계로 하고 실패하면 정리 스크립트 실행, 팝업이 떠 있는 동안 발행 창은 첫·마지막 단계에서만 봄, 필수 단계는 여전히 멈춤, Claude in Chrome 안내(티스토리는 저장 전, 네이버는 발행 창에서만). 가짜 `exec`로만 확인 | [[_system/integrations/blog-editors]], [[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치]] |
| `tests/editPost.test.ts` | 223 | (2026-10-09 새 파일) 글 고치기: `proposeEdit`(Claude 호출은 mock) — 범위만 고치고 이미지는 원래 그대로, 글 전체면 제목·요약도 받음, 이미지를 빼거나 늘리거나 모르는 ref면 거절, 바뀐 게 없으면 이유와 거절, 칸이 빈 표는 뺌. `applyProposal` — 범위만 바꿈, 그 사이 범위가 바뀌었으면 거절, 전체는 블록 수가 다르면 거절. API — 요청 검사(짧은 프롬프트, 범위 오류, 초안 없음), 시작→제안→적용(만드는 동안 글 수정 막힘), 범위를 직접 고쳤으면 적용 거절·버리기, Claude 실패는 failed(글 그대로)·중지하면 제안이 사라짐 | [[_system/api]], [[_system/modules/server-pipeline]] |
| `tests/naverTopic.test.ts` | 63 | (2026-10-09 새 파일) 네이버 주제: 목록 이름 맞추기(공백·가운뎃점 차이 허용), 제목·요약·태그·소제목을 보고 하나 고름, 목록에 없는 답이거나 호출 실패면 null(주제 없이), 중지는 그대로 전달 (Claude 호출은 mock) | [[_system/modules/server-pipeline]], [[_system/integrations/claude-cli]] |
| `tests/searchad.test.ts` | 124 | (2026-10-09 새 파일) 검색광고 키워드 도구: 요청 서명(고정 값), 검색량 값(숫자·쉼표 문자열·"< 10"), 입력 나누기(쉼표·줄바꿈, 공백·중복 제거, 최대 5개), 응답 정렬·입력 키워드 표시·경쟁 정도, 돌려주는 줄 `MAX_ROWS`개. 키 저장 API(가짜 검색광고 주소로 `fetch`를 바꿔): 키 없으면 탐색 안내, 저장 전에 실제 호출로 확인하고 값은 돌려주지 않음, 입력 정리 후 검색량 순 결과, 한도(429)·서버 오류 안내 | [[_system/integrations/naver-searchad]], [[_system/api]] |
| `tests/explore.test.ts` | 161 | (2026-10-09 새 파일) 구글 트렌드 RSS 읽기(검색어·규모, 뉴스 제목 제외, 엔티티, 중복 제거), 10분 캐시·실패와 빈 결과는 `TrendsError`. 입력이 없을 때: 트렌드 상위 10개를 5개씩 두 번과 최근 완료 추천 3개의 기준 키워드를 각각 찾음, 트렌드 실패는 그 덩어리만 오류, 추천 기록이 없으면 그 덩어리 생략, 기준이 하나도 없으면 안내와 함께 거절, 검색광고 키 오류·한도는 전체 오류, 입력이 있으면 트렌드를 부르지 않음, `GET /api/keywords`에 `q`가 없어도 동작 (`fetch`를 가짜로 바꿈) | [[_system/integrations/google-trends]], [[_system/modules/server-recommend]] |
| `tests/api.test.ts` | 263 | `createApp()`으로 띄운 앱에 거절 경로만 요청: 로컬 전용, 설정 형식, 새 글 입력, 블로그 등록 검사(네이버·티스토리 예약: 과거 시각, 네이버 10분 단위), 수기 상태 전이(초안 검토 이후 세 상태 사이 허용, 같은 상태·초안 검토 전은 거절), 이미지 대상·형식, 카테고리 값 검사(워드프레스는 ID 필수)·카테고리 목록 API(저장 목록과 마지막 선택, 블로그가 바뀌면 목록 비움, 알 수 없는 블로그 404, 워드프레스 refresh 거절, 블로그 ID 없음), 본문 이미지 자리 추가(소제목 이름, 자리·개수·진행 중 검사)·이미지 삭제(파일도 삭제, 없는 이미지 404), 썸네일 추가 때 방법 고르기, 로그인 창, 추천 분야 길이, 워드프레스 기본 카테고리 삭제 확인(예전에 저장된 `wordpressCategoryId`는 읽을 때 버리고 저장 요청에서 걸러냄, `GET /api/wordpress/categories`는 404, `GET /api/categories/wordpress`는 있음; 2026-10-09) | [[_system/api]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-routes]], [[_system/modules/server-core]], [[_system/modules/server-wordpress]], [[_system/modules/server-pipeline]], [[_system/modules/server-recommend]], [[_system/modules/shared]]

## 주의할 점
- 서버 모듈은 불러올 때 데이터 폴더를 정하므로, 환경 변수는 반드시 `setupFiles`에서 먼저 지정한다.
- 화면(React) 테스트는 없다.
