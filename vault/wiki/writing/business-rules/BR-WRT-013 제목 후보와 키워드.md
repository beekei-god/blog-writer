---
type: business-rule
domain: writing
id: BR-WRT-013
name: 제목 후보와 키워드
status: active
confidence: medium
consistency: single-source
source:
  - blog-writer:rules/default-writing-rules.md:14-17
  - blog-writer:server/research.ts:23
  - blog-writer:server/writer.ts:46
  - blog-writer:server/writer.ts:144-147
  - blog-writer:server/titles.ts:6-57
  - blog-writer:server/routes/jobs.ts:110-123
  - blog-writer:src/job/TitlePicker.tsx:9-67
  - blog-writer:src/job/JobDetail.tsx:186-197
  - blog-writer:src/job/Preview.tsx:67-68
  - blog-writer:src/job/PostEditor.tsx:148-152
  - blog-writer:src/job/Report.tsx:7-8
  - blog-writer:tests/titles.test.ts:33-81
entities: [Post]
updated: 2026-10-10
---
# BR-WRT-013 제목 후보와 키워드

## 규칙
글을 쓰기 전에 이 글이 답할 검색 질문 한 문장, 메인 키워드 1개, 서브 키워드 2~3개(롱테일 우선)를 정한다. 제목 후보는 3개를 내고, 메인 키워드를 앞쪽에, 25~35자 안팎으로, 검색 의도와 날짜·숫자를 넣는다. 제목은 후보 중 가장 좋은 것과 똑같이 쓴다.

제목 후보는 **본문 맨 위 제목 바로 아래**(미리보기의 제목 아래, 편집의 제목 칸 아래)에서 고른다. **"제목 다시 만들기"**로 글은 그대로 두고 제목 후보 3개만 새로 받을 수 있다. 새 후보를 받아도 **지금 제목은 사용자가 고를 때까지 그대로**다 (2026-10-10).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 리서치 | `searchQuestion`, `mainKeyword`, `subKeywords`를 정함 |
| 글 작성 | 리서치 방향을 받아 "더 나은 것이 있으면 바꿔도 됨". `titleCandidates` 3개, `title` = 그중 하나 |
| 화면: 후보를 누름 | 제목이 그 후보로 바뀜(자동 저장). 후보마다 글자수 표시, 지금 제목인 후보에 ✓ |
| 화면: 지금 제목이 후보에 없음 (직접 고쳤거나 새 후보를 받음) | 목록 맨 앞에 "✓ <제목> (지금 제목, N자)"를 함께 보여 줌 (누를 수 없음) |
| "제목 다시 만들기" | `POST /api/jobs/:id/titles`. 저장된 글로 Claude가 후보를 만든다: 그 작업의 글쓰기 규칙 사본(`rulesSnapshot`, 없으면 지금 규칙)의 제목 기준, 서로 다른 각도, 지금 제목·예전 후보를 되풀이하지 않음, 본문에 있는 사실만, 낚시성·키워드 반복 금지, 굵게·따옴표·이모지 없이. 본문은 이미지를 빼고 앞 4,000자만 보여 줌 |
| 다시 만든 결과 | `**`를 빼고 앞뒤 공백을 지우고 중복·빈 값을 빼서 **최대 3개**. 하나도 없으면 오류 "제목 후보를 만들지 못했습니다. 다시 시도해 주세요." 로그 "제목 후보를 다시 만들었습니다: …" |
| 다시 만든 결과의 저장 | 서버는 후보를 돌려주기만 하고 글을 바꾸지 않는다. 화면이 그사이 고친 내용 위에 `titleCandidates`만 넣고 자동 저장으로 저장한다 |
| 초안 없음 / 다른 작업 진행 중 | 400 "초안이 없습니다." / 409 "진행 중인 작업이 끝난 뒤에 다시 만들어 주세요." |

다시 만들기도 글쓰기 단계(`stage: "writing"`) 모델을 쓰고 effort는 low, 제한 시간 3분이다.

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 규칙 문서 | SEO 장 | 메인1·서브2~3, 후보 3개, 25~35자 | `blog-writer:rules/default-writing-rules.md:14-17` |
| 프롬프트(리서치) | 검색 질문·키워드 정하기 | 서브 2~3 | `blog-writer:server/research.ts:23` |
| 프롬프트(작성) | 후보 3개, 제목=후보 중 하나 | | `blog-writer:server/writer.ts:46`, `:144-147` |
| 서버(다시 만들기) | `regenerateTitles` | `TITLE_COUNT` 3, `BODY_LIMIT` 4,000, 정리·최대 3개, 없으면 오류 | `blog-writer:server/titles.ts:6-57` |
| 서버(라우터) | `POST /api/jobs/:id/titles` | 규칙 사본 사용, 글은 안 바꿈, 로그 | `blog-writer:server/routes/jobs.ts:110-123` |
| 서버 검증 | 없음 | 처음 작성 결과의 개수·길이·제목 일치는 검사 안 함 | `blog-writer:server/schema.ts:31` |
| 화면 | `TitlePicker` (미리보기·편집의 제목 아래) | 후보 고르기, 지금 제목 표시, 다시 만들기 버튼·진행 안내·오류 | `blog-writer:src/job/TitlePicker.tsx:9-67`, `blog-writer:src/job/JobDetail.tsx:186-197`, `blog-writer:src/job/Preview.tsx:67-68`, `blog-writer:src/job/PostEditor.tsx:148-152` |
| 화면(작성 리포트) | 후보 목록 없음 | 2026-10-10에 제목 아래로 옮김 | `blog-writer:src/job/Report.tsx:7-8` |
| 테스트 | 다시 만들기 프롬프트·정리·오류, 요청 검사, 글은 그대로, 규칙 사본 사용 | | `blog-writer:tests/titles.test.ts:33-81` |

처음 작성의 후보는 프롬프트에만 있어 `consistency: single-source`, 결과 보장이 없어 `confidence: medium`.

## 예외 / 경계값
- 메인·서브 키워드는 네이버 검색어 제안 수집의 입력이 된다 → [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]].
- 다시 만들기는 작업을 잠그지 않는다 (서버가 글을 쓰지 않으므로 그사이 고친 내용과 서로 덮어쓰지 않는다). 다만 시작할 때 다른 작업이 진행 중이면 거절한다.
- 다시 만들기 결과가 3개보다 적을 수 있다 (중복·빈 값을 뺀 뒤).
- 실제 Claude가 "본문에 있는 사실만", 25~35자를 지키는지는 확인하지 않았다 → [[writing/open-questions]] #14.

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-10 | 후보를 고르는 곳을 작성 리포트에서 본문 맨 위 제목 아래(미리보기·편집)로 옮김. "제목 다시 만들기"(후보만 새로 받기, 지금 제목은 유지) 추가 | 커밋 afc7c10, `blog-writer:server/titles.ts:16-57` |
