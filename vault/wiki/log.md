---
type: log
updated: 2026-10-05
---
# 작업 기록

## [2026-10-05] ingest | blog-writer 전체
- 범위: 57 files / 8,754 lines (coverage 57/57)
- 생성: _registry, index, glossary, log / _system 25쪽 (overview, architecture, api, configuration, data-storage, operations, known-issues, modules 10, integrations 8) / writing 25쪽, image 20쪽, publishing 20쪽, topic 13쪽, usage 14쪽
- 규칙: BR-WRT 15, BR-IMG 12, BR-PUB 12, BR-TOP 6, BR-USG 6
- 불일치:
  - BR-WRT-004 태그 최대 30개 (서버 30 / 편집 화면 제한 없음) → writing/open-questions #1
  - BR-WRT-006 스마트블록 주제 태그 (글쓰기 규칙 문서 권장 / 작성 프롬프트 금지 / 서버 검사 없음) → writing/open-questions #2
  - BR-WRT-007 표 빈 칸 행 제거 (작성 직후만 / 편집 화면 허용) → writing/open-questions #4
  - BR-WRT-010 주제·링크 검증 (서버 2~300자·URL ≤20 / 화면 2자만) → writing/open-questions #5
  - BR-PUB-007 소제목 위 빈 줄 (규칙 1줄 / 자동 조작 블록마다 빈 줄 + 소제목 앞 2줄) → publishing/open-questions #1
  - BR-PUB-012 로그인 화면 (Claude in Chrome·평소 크롬은 멈춤 / 자동 조작은 5분 대기) → publishing/open-questions #3
  - BR-TOP-005 분야 길이 (서버 2~100 / 화면 2 이상만) → topic/open-questions #1
- 분석 시점: 스냅샷 2026-10-05 18:06 (git 없음)

## [2026-10-05] update | writing, publishing, topic (레이어 불일치 수정 반영)
- 읽은 범위: `rules/default-writing-rules.md`, `server/writer.ts`, `server/index.ts`, `server/browser/adapters.ts`, `src/JobDetail.tsx`, `src/NewJob.tsx`, `src/Recommend.tsx` (changes 7파일)
- 갱신: BR-WRT-004/005/006/007/010, BR-PUB-007/012, BR-TOP-005 (consistency conflict → consistent, BR-WRT-010은 링크 검증만 conflict로 남음), writing/publishing/topic open-questions·index, 글쓰기 규칙·Post 엔티티, _system/known-issues #1·#2·#3·#13 해결, operations, playwright-chrome, web-screens, 블로그 임시저장 플로우, root index
- 보정: 줄 번호가 밀린 인용(`server/index.ts`, `server/writer.ts`, `server/browser/adapters.ts`, `src/JobDetail.tsx`, `src/NewJob.tsx`)을 전체 wiki에서 일괄 이동
- 남은 질문: 자동 조작 빈 줄의 실제 에디터 확인, 링크 형식·개수 화면 검사 여부
- 분석 시점: 스냅샷 갱신 (아래 snapshot 실행)

## [2026-10-05] update | writing (참고 링크 화면 검증)
- 읽은 범위: `src/NewJob.tsx`
- 갱신: BR-WRT-010 (consistency conflict → consistent), writing/open-questions #5, index들, web-screens, 줄 번호 보정(`src/NewJob.tsx` 인용)
- 남은 질문: 화면의 URL 판정(브라우저 `URL`)과 서버 zod `.url()`의 경계 차이

## [2026-10-05] update | open-questions 해결 세션 (writing 3건, image 5건)
- 코드: `shared/length.ts`(줄바꿈 제외), `src/JobDetail.tsx`(태그 근거 표 문구), `server/writer.ts`(이미지 부족 로그), `shared/types.ts`(주석), `server/store.ts`·`server/images/index.ts`·`server/index.ts`(교체 시 예전 이미지 파일 삭제), `server/images/webAi.ts`(이름 맞는 다운로드만), `shared/imageErrors.ts`(`classifyReply` 삭제)
- 해결: writing #3 #6 #7, image #1~#5
- 줄 번호 보정: `server/writer.ts`, `server/index.ts`, `server/store.ts`, `server/images/index.ts`, `server/images/webAi.ts`, `shared/imageErrors.ts`
- 남은 질문: publishing 4건, topic 3건, usage 3건

## [2026-10-05] update | open-questions 해결 세션 (publishing 4건)
- 코드: `server/browser/blogPost.ts`(네이버 alt 이름 사본 업로드), `server/index.ts`·`src/api.ts`·`src/BlockedSites.tsx`(막힌 목록에 실제 경로 표시), `src/JobDetail.tsx`(다시 임시저장 안내)
- 해결: publishing #2 #4(결정만, 코드 변경 없음) #5 #6 → publishing #1은 에디터 확인 대기, #3은 이전에 해결
- 남은 질문: topic 3건, usage 3건, publishing 코드 해결이지만 실제 에디터 확인 대기 항목

## [2026-10-05] update | open-questions 해결 세션 마무리 (topic 3건, usage 3건)
- 코드: `server/datalab.ts`·`server/recommend.ts`(기준 0 처리, 추천 중지), `server/index.ts`·`src/api.ts`·`src/Recommend.tsx`(추천 중지 API·버튼), `src/Usage.tsx`(한계 안내, 요일 라벨), `server/usage.ts`·`server/claude.ts`(`callId`로 호출 수 집계)
- 해결: topic #2 #3 #4(결정만), usage #1(안내 추가) #2 #3
- 남은 질문: 없음 (모든 도메인 open-questions가 resolved). 실제 에디터에서 자동 조작 빈 줄·네이버 alt 업로드 확인은 별도 확인 대기

## [2026-10-05] update | gemini-chatgpt-web 프롬프트 정리
- 코드: `server/images/webAi.ts` — 사이트 다운로드 버튼을 누르라는 안내 3곳 삭제, 스크립트 실패 시 `imageUrl`로 넘기도록 안내
- 갱신: _system/integrations/gemini-chatgpt-web, 줄 번호 보정

## [2026-10-05] update | 발행 완료 상태와 내 글 상태 필터 (writing, publishing)
- 읽은 범위: `shared/types.ts`, `src/labels.ts`, `src/api.ts`, `src/App.tsx`, `src/JobDetail.tsx`, `src/styles.css`, `server/index.ts`
- 생성: [[publishing/business-rules/BR-PUB-013 발행 완료 표시]], [[writing/flows/내 글 목록 상태 필터 플로우]]
- 갱신: [[writing/entities/Job]] (상태 8종, 전이), _system/api, data-storage, web-app, publishing overview/index/flow/implementation/BR-PUB-001, writing index/overview, glossary, 전체 index, 줄 번호 보정
- 새 질문: publishing/open-questions #7 (발행 완료 글의 이미지 다시 만들기 시 상태)

## [2026-10-05] update | 발행 완료 수기 상태 변경 (writing, publishing)
- 읽은 범위: `server/index.ts`, `src/api.ts`, `src/JobDetail.tsx`, `src/styles.css`
- 갱신: [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] (수기 상태 변경, `PUT /status`로 일반화, 보라색 배지), [[writing/entities/Job]] (전이), _system/api, glossary, 임시저장 플로우, publishing index, open-questions #7 resolved, 줄 번호 보정
- 메모: 규칙 파일 이름은 링크 호환을 위해 "BR-PUB-013 발행 완료 표시"를 유지하고 제목만 "발행 완료 표시와 수기 상태 변경"으로 바꿈

## [2026-10-07] update | writing, image, publishing, topic, usage + _system (워드프레스 API, 블로그별 설정, 리팩터링, 테스트)
- 범위: 스냅샷 이후 추가 26 / 수정 35 / 삭제 1 파일. 주요 변경: 워드프레스 REST API 등록(임시저장·예약발행·자동발행, `scheduled` 상태), 블로그별 설정과 글마다 블로그 선택(기본 블로그 없음), WordPress.com 연결 제거, 로그인 창 블로그별, 데이터 폴더 경로 기준 변경(`PROJECT_ROOT`, `BLOG_WRITER_DATA_DIR`), 리팩터링(`server/index.ts` → `server/app.ts`+`server/routes/*`, `src/JobDetail.tsx` → `src/job/*`, `server/fsutil.ts`, `shared/labels.ts`, 미사용 코드 삭제), vitest 자동 테스트
- 생성: [[_system/integrations/wordpress-rest]], [[_system/modules/server-routes]], [[_system/modules/server-wordpress]], [[_system/modules/web-job]], [[_system/modules/tests]], [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]], [[publishing/business-rules/BR-PUB-015 올릴 블로그는 글마다 선택]], [[publishing/business-rules/BR-PUB-016 워드프레스 재등록은 같은 글 갱신]], [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]], [[publishing/flows/워드프레스 API 등록 플로우]]
- 갱신: _system 전체(api 재작성, architecture, configuration, data-storage, operations, known-issues 17~19 추가, overview, 모듈 10쪽, 연동 8쪽), 5개 도메인 전 페이지의 근거 경로·줄 번호, index, glossary(13행 추가·4행 수정), _registry(모듈 4개 추가, 매핑)
- 점검: coverage 82/82, lint 깨진 링크 0·고아 0, 근거 1,182개 모두 실제 파일·줄 범위 안
- 새 질문: writing/open-questions #8 (예약됨 글이 예약 시각 뒤에도 자동으로 발행 완료가 되지 않음), publishing/open-questions #8 (자동발행한 워드프레스 글도 "발행 완료 취소" 가능 → 앱과 사이트 상태 불일치), #9 (blocked-sites.json 비원자적 쓰기), #10 (`BlogLoginRequired` 미구분)
- 불일치(consistency: conflict): 없음
- 분석 시점: 스냅샷 2026-10-07 01:40 (git 없음)

## [2026-10-07] update | writing, publishing (라벨·표·자동발행·문단 규칙)
- 읽은 범위: `server/wordpress.ts`, `server/pipeline.ts`, `server/routes/jobs.ts`, `server/routes/util.ts`, `shared/labels.ts`, `shared/types.ts`, `src/App.tsx`, `src/job/NextStep.tsx`, `rules/default-writing-rules.md`, `tests/shared.test.ts`, `tests/wordpress.test.ts`
- 변경 내용: 올리는 중 라벨이 블로그에 따라 "워드프레스 등록 중"/"크롬 작성 중"(`Job.postingTo`, `statusLabel`), 워드프레스 표를 본문 폭·넉넉한 여백으로(`wpTableHtml`), 예약해 둔 글을 자동발행으로 다시 올리면 공개 시각을 지금으로 보내 예약으로 남지 않게, 글쓰기 규칙 문단을 "1~3줄·길면 나눔·짧으면 한 줄"로
- 갱신: [[writing/entities/Job]], [[writing/entities/글쓰기 규칙]], [[publishing/business-rules/BR-PUB-007 소제목 위 빈 줄]], [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]], [[publishing/business-rules/BR-PUB-016 워드프레스 재등록은 같은 글 갱신]], [[publishing/flows/워드프레스 API 등록 플로우]], [[_system/integrations/wordpress-rest]], 모듈 4쪽, glossary
- 줄 번호 보정: 31쪽 87곳 (`server/wordpress.ts`, `server/pipeline.ts`, `server/routes/util.ts`, `shared/types.ts`, `shared/labels.ts`, 테스트 파일)
- 점검: coverage 82/82, lint 깨진 링크 0·고아 0, 근거 1,190개 모두 실제 줄 범위 안
- 분석 시점: 스냅샷 (git 없음, `_snapshot.json`)

## [2026-10-07] update | writing, publishing (문단 규칙 정정, 워드프레스 간격 원복)
- 읽은 범위: `rules/default-writing-rules.md`, `server/writer.ts`, `server/wordpress.ts`, `tests/wordpress.test.ts` (사이트의 다른 글 구조도 비교: 문단 안 `<br>` 줄바꿈 형식)
- 정정: 같은 날 앞선 갱신("문단 1~3줄로 나누기", 워드프레스 문단·소제목 간격 지정)이 사이트의 다른 글과 달라 되돌렸다. 현재: 문단 2~4줄·문장마다 문단 안 줄바꿈(`\n` → `<br>`), 짧은 내용은 한 줄 문단, 워드프레스 간격은 테마 기본
- 갱신: [[writing/entities/글쓰기 규칙]], [[writing/entities/Post]], [[publishing/business-rules/BR-PUB-007 소제목 위 빈 줄]]
- 줄 번호 보정: `server/writer.ts`(프롬프트 한 줄 추가), `server/images/webAi.ts`(다운로드 스크립트 보강) 참조 30쪽 76곳
- 미반영: `server/images/webAi.ts`(다운로드 스크립트 오류 처리·시간 제한, 스크립트 결과와 무관하게 다운로드 폴더 확인)와 `shared/imageErrors.ts`(download 안내 문구) 변경은 image 도메인 범위라 줄 번호만 보정함 → image 업데이트 필요
- 점검: coverage 82/82, lint 깨진 링크 0·고아 0, 근거 1,194개 모두 실제 줄 범위 안

## [2026-10-07] update | image (웹 AI 이미지 회수: failed 보고여도 폴더 먼저 확인)
- 읽은 범위: `server/images/webAi.ts`, `shared/imageErrors.ts`, `tests/webAi.test.ts`
- 변경 내용: 웹 AI(Gemini/ChatGPT)가 `failed`로 보고해도 곧바로 실패하지 않고 다운로드 폴더·이미지 URL을 먼저 확인해, 받아진 파일이 있으면 성공 처리(없을 때만 `ui_changed`). 다운로드 스크립트 오류 처리·시간 제한 보강과 "스크립트 결과와 무관한 폴더 확인"도 연동 페이지에 반영
- 갱신: [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]], [[image/flows/이미지 생성 플로우]], [[image/implementations/blog-writer 구현]], [[_system/integrations/gemini-chatgpt-web]], [[_system/modules/server-images]], [[_system/modules/tests]]
- 줄 번호 보정: `server/images/webAi.ts` 참조
- 분석 시점: 스냅샷 (`_snapshot.json`)

## [2026-10-08] update | _system (API 포트 3001 → 5172)
- 읽은 범위: `server/index.ts`, `vite.config.ts`, `.env.example`, `README.md`(전면 개편본, 274줄)
- 변경 내용: API 서버 기본 포트 3001 → 5172, 화면의 `/api` 프록시 주소도 `127.0.0.1:5172`로. 3001은 다른 로컬 프로젝트가 쓰고 있어 바꿈(커밋 d84d474)
- 갱신: [[_system/configuration]], [[_system/architecture]], [[_system/operations]], [[_system/overview]], [[_system/modules/server-routes]], [[_system/modules/project-root]]
- README 근거 보정: README가 단계별 안내로 다시 쓰여(033e462) 줄 번호가 달라짐 → _system 4쪽과 [[usage/business-rules/BR-USG-001 단계별 추천 모델]], [[usage/business-rules/BR-USG-003 사용 기록 보관 기간]], [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]]의 README 근거를 새 줄로 맞춤. 새 README는 스마트블록 태그를 직접 언급하지 않음
- `CLAUDE.md` 변경(사용량 한도 대응 절)은 wiki가 다루지 않는 작업 지침이라 반영 없음
- 분석 시점: 스냅샷 (`_snapshot.json`, git d84d474)

## [2026-10-08] update | image · writing · publishing (이미지 API, 한 장씩 다시 생성, 동시 실행)
- 읽은 범위: 커밋 d84d474..38ae96c에서 바뀐 22개 파일 (추가 `server/images/api.ts`, `src/ImageApiSettings.tsx`, `tests/imageApi.test.ts`, `tests/imageParallel.test.ts`; 수정 `server/pipeline.ts`, `server/cancel.ts`, `server/images/index.ts`·`styles.ts`·`webAi.ts`, `server/routes/images.ts`·`settings.ts`, `server/secrets.ts`, `server/store.ts`, `shared/imageErrors.ts`·`types.ts`, `src/job/images.tsx`·`JobDetail.tsx`·`PostEditor.tsx`, `src/SettingsPanel.tsx`, `src/api.ts`, `src/styles.css`, `.env.example`)
- 변경 내용: Gemini·ChatGPT 이미지를 API 키가 있으면 이미지 API로 만들고(키는 설정 화면 또는 `.env`), API가 실패해도 크롬으로 저절로 넘기지 않음. 위쪽 실패 안내를 없애고 이미지 자리에 실제 실패 이유를 보여 주며 이미지마다 "이미지 다시 생성"에서 "API로"(키 없으면 비활성+툴팁)·"크롬에서"를 고름. 이미지 한 장씩 다시 만들기는 서로 동시에 진행(크롬은 큐에서 하나씩), 중지는 모두 멈춤. 실패 원인에 `api_error` 추가(14종)
- 생성: [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]], [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]], [[_system/integrations/image-api]]
- 폐기: [[image/business-rules/BR-IMG-012 실패 후 다른 AI 추천]] (실패 안내 영역과 추천 로직 삭제)
- 갱신(내용): image — BR-IMG-007, BR-IMG-009, 두 플로우, ImageSpec, overview, index, 구현 지도 / writing — BR-WRT-011(예외 추가, confidence high, 사용자 확인 후 변경), BR-WRT-012, Job, 작업 중지와 재시도 플로우, 초안 작성 플로우, 구현 지도, index / publishing — BR-PUB-004(이미지는 실제로 크롬을 쓸 때만 큐), 구현 지도, index / _system — modules(server-images·server-core·server-pipeline·server-routes·web-job·web-screens·shared·web-app·project-root·tests), api, configuration, data-storage, known-issues(#20~23), integrations/gemini-chatgpt-web / index, glossary, _registry
- 줄 번호 보정: 손으로 고치지 않은 페이지의 바뀐 파일 참조 214곳을 d84d474 → 38ae96c 줄 대응(difflib)으로 옮김
- 불일치: 없음. 새 open question 없음 (작업 오류 문구가 동시 실행에서 지워질 수 있는 점·미사용 `onlyFailed` 화면 경로는 known-issues #21, #22)
- 분석 시점: git 38ae96c (스냅샷 `_snapshot.json`)

## [2026-10-09] update | image · publishing · writing · _system (만드는 방법 선택, 상태 이름·글 상태, 네이버·티스토리 예약·자동발행, 리팩터링)
- 읽은 범위: 커밋 38ae96c..65bfa3e(7a8a0ea, 65bfa3e)에서 바뀐 44개 파일 (추가 `server/browser/publish.ts`, `tests/publish.test.ts`; 수정 server 23개, shared 4개, src 11개, tests 4개)
- 변경 내용: 새 글 쓰기에서 썸네일·본문 이미지마다 만드는 방법(API/크롬) 선택, 썸네일·본문 설정 완전 독립, 스타일 → AI → 방법 순서로 화면 통일, 실패 원인 `site_error` 추가(15종). 진행 단계·상태 이름 통일, "내 글" 필터 5개로 재구성, 초안 검토 이후 글 상태 직접 변경(`MANUAL_STATUSES`), 본문 복사 기능 삭제. 네이버·티스토리도 임시저장·예약발행·자동발행(늘 임시저장 먼저, 발행 창 단계 `server/browser/publish.ts`). 중복 코드를 공용 함수로 합친 리팩터링(동작 동일)
- 생성: [[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치]], [[publishing/business-rules/BR-PUB-019 다른 블로그에 올린 글 표시]]
- 갱신(내용): image — BR-IMG-003, BR-IMG-007, BR-IMG-009, BR-IMG-010, BR-IMG-013, ImageOptions, 두 플로우, 구현 지도 / publishing — BR-PUB-001(이름 변경: 임시저장 먼저, 고른 방식대로 발행), BR-PUB-013, BR-PUB-014, 임시저장·발행 플로우, 워드프레스 API 등록 플로우, 구현 지도 / writing — Job, BR-WRT-004, BR-WRT-010, BR-WRT-012, 내 글 목록 상태 필터 플로우, 초안 작성 플로우, 초안 편집과 자동 저장 플로우(본문 복사 단계 폐기 표시), 구현 지도 / _system — modules 12쪽, api, integrations(blog-editors·claude-in-chrome·chrome-applescript·playwright-chrome·gemini-chatgpt-web 외), configuration, data-storage, operations, known-issues(#24~28), architecture, overview / glossary, index, _registry
- 줄 번호 보정: 바뀐 파일을 가리키는 모든 `blog-writer:` 참조를 HEAD 기준으로 다시 맞춤 (topic·usage 포함). 파일 길이를 넘는 참조 0개
- 불일치: BR-PUB-001 (설정 화면 문구 "임시저장까지만"이 남아 있음 → publishing open-questions #12), BR-PUB-019 (크롬 블로그는 `job.postingTo`, 워드프레스는 `job.wordpress`로 "이 블로그에 올렸는지"를 판단 → #15)
- 새 open question: image #6~8, publishing #11~15, writing #9. 네이버·티스토리 발행 창 단계는 모의 발행 창으로만 확인(실제 사이트 미검증, confidence medium)
- 분석 시점: git 65bfa3e (스냅샷 `_snapshot.json`)

## [2026-10-09] update | publishing · _system (네이버 발행 창 실제 확인 반영, 입력 문제가 있어도 발행)
- 읽은 범위: 커밋 65bfa3e..9a9c6df에서 바뀐 13개 파일 (`server/browser/publish.ts`·`adapters.ts`·`userChrome.ts`·`blogPost.ts`·`runner.ts`·`postHtml.ts`, `server/pipeline.ts`, `shared/labels.ts`·`types.ts`, `src/SettingsPanel.tsx`·`api.ts`·`styles.css`, `tests/publish.test.ts`)
- 변경 내용: 발행 창을 "여는 버튼이 든 상자는 제외하고" 찾도록 고침(위쪽 막대를 발행 창으로 잘못 고르던 문제). 네이버는 공개 설정을 바꾸지 않음. 입력에 확인할 점이 있어도 발행하고 로그에 "확인 필요"(사용자 결정, 세 경로 공통). 발행 창 단계가 멈추면 그 순간의 발행 창 구조를 진행 로그에 남김. 로그에 블로그 이름 사용, 설정 화면 문구·낡은 주석 정리
- 갱신(내용): publishing — BR-PUB-001(설정 문구 불일치 해소, consistency 복귀), BR-PUB-011, BR-PUB-018, 블로그 임시저장·발행 플로우, 구현 지도, index, open-questions(#11 네이버 예약발행 실제 확인·나머지 미확인, #12·#14 해결) / _system — known-issues(#24 갱신, #28 해결), modules(server-browser·tests 외 줄 수), integrations(blog-editors·chrome-applescript·claude-in-chrome·playwright-chrome), operations
- 줄 번호 보정: 바뀐 13개 파일을 가리키는 `blog-writer:` 참조를 HEAD 기준으로 맞춤. 전체 1,489개 중 파일 길이를 넘는 것 0개 (BR-PUB-016의 `wordpress.ts` 참조 1개를 이번에 고침)
- 불일치: 없음 (BR-PUB-001의 설정 문구 불일치 해소)
- 새 open question: 없음. 네이버 자동발행("현재")·티스토리·Claude in Chrome 발행 경로는 실제 사이트에서 아직 확인되지 않음 (publishing #11, known-issues #24)
- 비고: 이 갱신은 서브에이전트가 사용량 한도로 중간에 멈춘 뒤 나머지를 직접 마무리했다
- 분석 시점: git 9a9c6df (스냅샷 `_snapshot.json`)
