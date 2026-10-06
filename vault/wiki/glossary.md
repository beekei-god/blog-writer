---
type: glossary
updated: 2026-10-07
---
# 용어집

| 업무 용어 | 화면 문구 | 코드 식별자 | 저장 값 | 정의 | 페이지 |
|---|---|---|---|---|---|
| 작업 / 글 | "내 글", 사이드바 항목 | `Job`, `createJob` | `data/jobs/<id>.json` | 주제 하나로 글 한 편을 만드는 단위 | [[writing/entities/Job]] |
| 딥서칭 / 자료 조사 | "딥서칭 시작", "자료 조사", "딥서칭 중" | `deepResearch`, stage `research` | `status: "researching"` | Claude + 웹 검색으로 사실과 출처 수집 | [[writing/flows/초안 작성 플로우]] |
| 글 작성 | "글 작성 중" | `writePost`, stage `writing` | `status: "writing"` | 규칙에 맞춰 초안 쓰기 | [[writing/flows/초안 작성 플로우]] |
| 초안 | "초안 완료", "초안 검토" | `Post`, `job.post` | `status: "draft_ready"` | 블로그에 넣을 글 + 작성 리포트 | [[writing/entities/Post]] |
| 리서치 노트 | "리서치 노트" | `researchNotes` | | 사실마다 출처가 붙은 노트 | [[writing/entities/Job]] |
| 출처 | "수집한 출처", 공식/언론/블로그·참고용/기타 | `Source`, `kind: official/press/blog/other` | | 리서치에서 실제로 연 페이지 | [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]] |
| 글쓰기 규칙 | "글쓰기 규칙", "기본 규칙으로 되돌리기" | `getRules`, `rulesSnapshot` | `data/writing-rules.md` | 리서치·작성 프롬프트에 들어가는 편집 방침 | [[writing/entities/글쓰기 규칙]] |
| 본문 글자수 / 분량 | "본문 N / 3,000자", "분량 초과" | `countBodyChars`, `MAX_BODY_CHARS` | | 공백 포함, 참고 자료 앞까지 | [[writing/business-rules/BR-WRT-002 본문 글자수 계산]] |
| 작성 리포트 | "작성 리포트" | `searchQuestion`, `titleCandidates`, `omittedItems`, `tagDetails` | | 본문에 안 들어가는 정보 | [[writing/entities/Post]] |
| 본문에서 뺀 항목 | "본문에서 뺀 항목" | `omittedItems` | | 못 찾았거나 분량 때문에 뺀 내용 | [[writing/business-rules/BR-WRT-003 확인된 사실만 사용]] |
| 검색 질문 | "검색 질문" | `searchQuestion` | | 글이 답할 검색 질문 한 문장 | [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] |
| 메인·서브 키워드 | "키워드 메인 / 서브" | `mainKeyword`, `subKeywords` | | 메인 1, 서브 2~3 (롱테일) | [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] |
| 태그 | "태그", `#태그` | `tags`, `MAX_TAGS` | | 최대 30개, '#' 없이 저장 | [[writing/business-rules/BR-WRT-004 태그 최대 30개]] |
| 태그 출처 | "태그를 고른 근거" | `TagDetail.source`, `TAG_SOURCES` | `"자동완성"`, `"함께 많이 찾는"`, … | 태그를 어디서 확인했는지 | [[writing/business-rules/BR-WRT-005 태그 출처 검증]] |
| 자동완성 | "자동완성 N개" | `naverAutocomplete`, `collectAutocomplete` | | 네이버 검색창 자동완성 | [[_system/integrations/naver-search]] |
| 함께 많이 찾는 (연관검색어) | "함께 많이 찾는" | `naverRelated`, `related` | | 예전 연관검색어 자리의 네이버 검색 영역 | [[_system/integrations/naver-search]] |
| 스마트블록 주제 | | `"스마트블록 주제"` | | 수집하지 않는 태그 출처 | [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]] |
| 작업 중지 | "작업 중지" | `cancelJob`, `CancelledError` | | 진행 중 단계 멈춤, 만든 것 유지 | [[writing/flows/작업 중지와 재시도 플로우]] |
| 썸네일 / 대표 이미지 | "썸네일(대표 이미지)", "썸네일 만들기" | `post.thumbnail`, `kind: "thumbnail"` | `thumbnail-<ts>.png` | 맨 위 이미지(네이버·티스토리) / Featured image(워드프레스) | [[publishing/business-rules/BR-PUB-005 썸네일 위치]] |
| 본문 이미지 | "본문 이미지 N장" | `type: "image"` 블록, `body-<블록 번호>` | `body-<n>-<ts>.png` | 섹션 안 이미지 0~6장 | [[image/business-rules/BR-IMG-001 본문 이미지 개수]] |
| 만드는 곳 (AI) | Claude / Gemini / ChatGPT | `ImageProvider`: `claude`/`gemini`/`chatgpt` | | 이미지 생성 방식 | [[image/entities/ImageOptions]] |
| 스타일 / 화풍 | 플랫 일러스트 / 지브리풍 / 실사 / 애니메이션 | `ImageStyle`: `flat`/`ghibli`/`realistic`/`anime` | | Claude는 flat만 | [[image/business-rules/BR-IMG-002 AI별 허용 스타일]] |
| 이미지 안 문구 | "이미지 안 문구", 썸네일 "문구 “…”" | `headline` | | 이미지에 넣는 한국어 글자 | [[image/business-rules/BR-IMG-005 이미지 안 문구 길이]] |
| 이미지 설명 | "이미지 설명 (다시 만들 때 사용)" | `prompt` | | 그릴 장면 | [[image/entities/ImageSpec]] |
| 근거 본문 | "이 이미지가 그리는 본문" | `basis` | | 이미지가 그리는 본문 문장 | [[image/business-rules/BR-IMG-004 본문 기반 이미지 기획]] |
| 직접 고친 이미지 | "직접 고친 설명과 문구라서…", "본문을 보고 자동으로 다시 정하게 하기" | `userEdited` | | 자동 기획 제외 표시 | [[image/business-rules/BR-IMG-006 직접 고친 이미지 보호]] |
| 이미지 기획 | "본문을 참고해 이미지 N개의 설명과 문구를 정하는 중" | `planImages` | | 만들기 직전 본문 기반 설명·문구 결정 | [[image/business-rules/BR-IMG-004 본문 기반 이미지 기획]] |
| 이미지 실패 원인 | "⚠ 이미지 N개를 만들지 못했습니다", 원인 제목 | `errorKind`, `IMAGE_ERROR_KINDS`, `classifyImageError` | | 13종 | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] |
| 다시 만들기 | "다시 만들기…", "실패한 N개를 ○○로 다시 만들기" | `runImages`, `ImageScope` | `all`/`failed`/`thumbnail`/`body-n` | | [[image/business-rules/BR-IMG-009 다시 만들기 범위]] |
| 직접 올리기 | "직접 올리기" | `POST /images/:target` | `<target>-upload-<ts>.<ext>` | 내 이미지로 교체 | [[image/business-rules/BR-IMG-010 직접 올리기 형식과 크기]] |
| 올리는 중 | "크롬 작성 중"(네이버·티스토리), "워드프레스 등록 중" | `statusLabel`, `Job.postingTo` | `status: "posting"` + `postingTo` | 같은 올리는 중 상태의 라벨이 올리는 블로그에 따라 갈림 | [[writing/entities/Job]] |
| 임시저장 | "<블로그>에 임시저장", "다시 임시저장", "임시저장 완료" | `runPost`, `doPost`, 워드프레스는 `doWordPressPost` mode `draft` | `status: "posting"/"posted"` | 블로그에 글을 넣고 저장만 함 (발행 안 함). 네이버·티스토리는 이것만 가능 | [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]] |
| 발행 완료 | "발행 완료", "발행 완료로 표시", "발행 완료 취소", "초안 완료로 되돌리기" | `setStatus`, `PUT /api/jobs/:id/status`, `STATUS_LABEL` (`shared/labels.ts`) | `status: "published"` | 사용자가 블로그에서 직접 발행한 뒤 앱에서 표시했거나, 워드프레스 자동발행 결과로 공개된 상태 | [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] |
| 상태 필터 | "전체/진행 중/초안 완료/임시저장 완료/예약됨/발행 완료/실패" | `StatusFilter`, `FILTERS` | | "내 글" 목록을 상태별로 보는 칩 | [[writing/flows/내 글 목록 상태 필터 플로우]] |
| 블로그별 설정 | "네이버 블로그 설정", "티스토리 설정", "워드프레스 설정" | `naverBlogId`, `tistoryBlogId`, `wordpressUrl`, `wordpressCategoryId`, `blogIdOf`, `settingsFor` (예전 `platform`·`blogId`는 옮긴 뒤 버림) | `data/settings.json` | 블로그마다 따로 저장한 연결 값. 기본 블로그는 없음 | [[publishing/entities/블로그 설정]] |
| Claude in Chrome | "Claude in Chrome: 연결됨" | `--chrome`, `mcp__claude-in-chrome`, `EXTENSION_ID` | | 평소 크롬을 Claude가 조작하는 확장 | [[_system/integrations/claude-in-chrome]] |
| 막힌 블로그 | "Claude in Chrome이 막는 블로그" | `SiteBlockedError`, `markBlocked` | `data/blocked-sites.json` | 확장이 안전 정책으로 막은 플랫폼 | [[publishing/entities/막힌 사이트]] |
| 평소 크롬 | "평소 쓰는 크롬" | `postNaverInUserChrome`, `osascript` | | 사용자의 기존 크롬 (로그인 유지) | [[_system/integrations/chrome-applescript]] |
| 자동 조작 / 앱 전용 크롬 | "자동 조작(앱 전용 크롬)", "블로그 로그인 창 열기" | `postWithChrome`, `ADAPTERS`, `CHROME_PROFILE_DIR` | `data/chrome-profile` | Playwright로 따로 띄우는 크롬 | [[_system/integrations/playwright-chrome]] |
| 확인 필요 | 로그 "확인 필요: …" | `problems` | | 입력은 됐지만 초안과 다른 점 | [[publishing/business-rules/BR-PUB-011 입력 결과 검증]] |
| 주제 추천 | "주제 추천", "이 주제로 글쓰기" | `Recommendation`, `startRecommendation` | `data/recommendations/` | 분야 → 주제 후보 | [[topic/entities/Recommendation]] |
| 데이터랩 / 검색 관심도 | "관심도 N", "▲ N%", "네이버 데이터랩" | `compareInterest`, `InterestStat.level`/`momentum` | | 기준 키워드=100 상대값, 상승세 | [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] |
| 기준 키워드 | "기준 키워드" | `anchorKeyword` | | 분야 대표 검색어 | [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] |
| 단계 / 모델 | "Claude 모델", 자료 조사·글 작성·이미지·브라우저 조작·주제 추천, "추천" | `Stage`, `StageModels`, `RECOMMENDED_MODELS`, `ModelChoice` | `default`/`fable`/`opus`/`sonnet`/`haiku` | 단계별 모델 선택 | [[usage/business-rules/BR-USG-001 단계별 추천 모델]] |
| Claude Code 설정 (모델) | "Claude Code 설정" | `"default"`, `CLAUDE_MODEL` | | CLI 기본 모델을 따름 | [[usage/business-rules/BR-USG-002 모델 결정 순서]] |
| 플랜 한도 | "5시간 한도", "주간 한도", "지금 확인" | `PlanLimits`, `rate_limit_event` | `data/plan-limits.json` | 계정 전체 사용률 | [[usage/entities/PlanLimits]] |
| 정가 환산 | "정가 환산" | `costUSD` | | API 정가로 계산한 금액 (청구 아님) | [[usage/entities/UsageRecord]] |
| 올릴 블로그 | "올릴 블로그를 선택하세요" | `platform` (요청마다), `PLATFORM_LABEL`, `PLATFORM_SHORT_LABEL` | `naver`/`tistory`/`wordpress` | 글을 올릴 때마다 고르는 블로그 | [[publishing/business-rules/BR-PUB-015 올릴 블로그는 글마다 선택]] |
| 등록 방식 | "임시저장 / 예약발행 / 자동발행" | `PublishMode` | `draft` / `schedule` / `publish` | 워드프레스 API 등록 방식. 예약·자동은 확인 창 뒤 실행 | [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]] |
| 예약됨 | "예약됨" 배지·필터 칩 | `JobStatus` `"scheduled"` | `status: "scheduled"` | 워드프레스에 예약발행을 걸어 둔 상태. 예약 시각이 지나도 자동으로 바뀌지 않음 | [[writing/entities/Job]] |
| 워드프레스 연결 | "워드프레스 설정", "연결 확인 후 저장" | `testWordPress`, `getWordPressAuth`, `saveWordPressAuth` | `data/secrets.json`의 `wpUsername`·`wpAppPassword` | Application Password로 사이트 REST API에 인증 | [[_system/integrations/wordpress-rest]] |
| 워드프레스 등록 기록 | "글 열기" 링크 | `WordPressRecord`, `Job.wordpress` | `wordpress.{postId, link, mode, scheduledAt, mediaIds}` | 다시 등록하면 같은 글을 갱신하고 올린 이미지를 재사용하기 위한 기록 | [[publishing/business-rules/BR-PUB-016 워드프레스 재등록은 같은 글 갱신]] |
| 로그인 창 | "로그인 창 열기", "로그인 완료 (창 닫기)" | `openLoginWindow`, `loginWindowFor` | (메모리) | 앱 전용 크롬 프로필에 블로그 하나씩 로그인하는 창 | [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]] |
| 데이터 폴더 | — | `DATA_DIR`, `PROJECT_ROOT`, `BLOG_WRITER_DATA_DIR` | 기본 `<프로젝트>/data` | 모든 로컬 파일 저장 위치 | [[_system/data-storage]] |
| 이미지 키 | — | `bodyImageKey`, `imageKey`, `bodyIndexOf` | `"thumbnail"` / `"body-<블록 번호>"` | 이미지 한 장을 가리키는 값 (`generatingImages`, API `:target`) | [[image/business-rules/BR-IMG-009 다시 만들기 범위]] |
| 스타일 맞추기 | — | `fitStyle` | | 고른 AI가 못 그리는 스타일이면 그 AI의 첫 스타일로 | [[image/business-rules/BR-IMG-002 AI별 허용 스타일]] |
| 관심도 환산 | 관심도·상승세 | `interestStat` | `interest.{level, momentum, series}` | 기준 키워드 평균을 100으로 한 검색 관심도와 최근 7일 증감 | [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] |
| 추천 중지 | "중지" | `POST /api/recommendations/:id/cancel`, `cancelJob` | `status: "failed"` | 진행 중인 주제 추천을 멈춤 | [[topic/business-rules/BR-TOP-005 추천 동시 실행과 입력 제한]] |
| 자동 테스트 | — | `npm test`, `vitest` | `tests/**` | 규칙과 API 검사를 확인하는 테스트 | [[_system/modules/tests]] |
