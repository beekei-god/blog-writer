---
type: business-rule
domain: writing
id: BR-WRT-013
name: 제목 후보와 키워드
status: active
confidence: medium
consistency: single-source
source:
  - blog-writer:rules/default-writing-rules.md:14-18
  - blog-writer:server/research.ts:23
  - blog-writer:server/writer.ts:76-78
  - blog-writer:server/titleGuide.ts:1-15
  - blog-writer:shared/keywords.ts:1-51
  - blog-writer:server/titles.ts:6-60
  - blog-writer:src/job/Report.tsx:26-50
  - blog-writer:server/routes/jobs.ts:110-123
  - blog-writer:src/job/TitlePicker.tsx:9-67
  - blog-writer:src/job/JobDetail.tsx:186-197
  - blog-writer:src/job/Preview.tsx:67-68
  - blog-writer:src/job/PostEditor.tsx:148-152
  - blog-writer:src/job/Report.tsx:7-8
  - blog-writer:tests/titles.test.ts:33-85
  - blog-writer:tests/keywords.test.ts:1-31
entities: [Post]
updated: 2026-10-12
---
# BR-WRT-013 제목 후보와 키워드

## 규칙
글을 쓰기 전에 이 글이 답할 검색 질문 한 문장, 메인 키워드 1개, 서브 키워드 2~3개(롱테일 우선)를 정한다. 제목 후보는 3개를 내고, 메인 키워드를 앞쪽에, 25~35자 안팎으로, 검색 의도와 날짜·숫자를 넣는다. 제목은 후보 중 가장 좋은 것과 똑같이 쓴다.

**제목 기법** (2026-10-12): 후보 3개는 서로 다른 클릭 유도 기법으로 쓴다 — ① 구체적인 숫자 ② 결론과 이득 먼저 ③ 손실 회피 ④ 질문·호기심. 숫자·기간·대상은 본문(리서치 노트)에 있는 사실만, 손실 회피는 본문이 밝힌 결과만 근거로 하고 과장·공포 조장은 금지, '이것' 기법을 써도 메인 키워드는 앞쪽에 드러나야 한다.

**키워드 횟수** (2026-10-12): 메인·서브 키워드마다 그 표현 그대로는 **제목에 1번, 본문에 최대 2번**까지 쓴다. 본문은 도입부·소제목·문단·목록·표이고 글 끝 "참고 자료"는 뺀다(글자수와 같은 범위 → [[writing/business-rules/BR-WRT-002 본문 글자수 계산]]). 그 밖에는 대명사·동의어·연관어로 바꿔 쓴다. 띄어쓰기·대소문자는 무시하고 세며, 더 긴 키워드 안에 들어 있는 짧은 키워드는 따로 세지 않는다(서브 "전기차 보조금 신청 방법" 안의 메인 "전기차 보조금").

**검색 의도** (2026-10-12): 제목과 본문은 검색 질문에 답해야 한다. 제목만 보고도 그 질문에 답하는 글임을 알 수 있어야 하고, 본문은 도입부에서 답을 먼저 밝히고 소제목은 그 질문을 검색한 사람이 이어서 알고 싶어 할 내용(대상·조건·방법·일정·주의점)으로 짠다. 검색 의도와 관계없는 배경 설명·홍보성 내용은 넣지 않는다.

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
| 작성 리포트: 지금 글이 키워드 횟수를 넘음 | 키워드 줄 아래에 "키워드 반복: 본문 '전기차 보조금' 3번, … (제목 1번, 본문 2번까지)" 경고. 지금 글로 세므로 직접 고치면 바로 다시 센다. 자동으로 고치지 않고 저장·발행도 막지 않는다 |
| 메인·서브 키워드가 없는 글 | 셀 키워드가 없어 경고 없음 |
| 초안 없음 / 다른 작업 진행 중 | 400 "초안이 없습니다." / 409 "진행 중인 작업이 끝난 뒤에 다시 만들어 주세요." |

다시 만들기도 글쓰기 단계(`stage: "writing"`) 모델을 쓰고 effort는 low, 제한 시간 3분이다.

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 규칙 문서 | SEO 장 | 메인1·서브2~3, 후보 3개, 25~35자, 제목 기법, 제목 키워드 1번, 본문 키워드 2번까지, 검색 의도 | `blog-writer:rules/default-writing-rules.md:14-18` |
| 프롬프트(리서치) | 검색 질문·키워드 정하기 | 서브 2~3 | `blog-writer:server/research.ts:23` |
| 프롬프트(작성) | 후보 3개, 제목=후보 중 하나, `TITLE_TECHNIQUES`, `KEYWORD_RULES` | 제목 1·본문 2 | `blog-writer:server/writer.ts:76-78` |
| 프롬프트(공용) | 제목 기법 4가지 / 키워드 횟수·검색 의도 지시 | | `blog-writer:server/titleGuide.ts:1-15`, `blog-writer:shared/keywords.ts:11-15` |
| 서버(다시 만들기) | `regenerateTitles` (`TITLE_TECHNIQUES`·`KEYWORD_RULES` 포함) | `TITLE_COUNT` 3, `BODY_LIMIT` 4,000, 정리·최대 3개, 없으면 오류 | `blog-writer:server/titles.ts:6-60` |
| 공용(횟수 세기) | `KEYWORD_LIMIT`, `countKeywords`, `keywordOveruse` (본문 범위는 `bodyTexts`) | 제목 1, 본문 2 | `blog-writer:shared/keywords.ts:5`, `:23-51`, `blog-writer:shared/length.ts:29-48` |
| 서버(라우터) | `POST /api/jobs/:id/titles` | 규칙 사본 사용, 글은 안 바꿈, 로그 | `blog-writer:server/routes/jobs.ts:110-123` |
| 서버 검증 | 없음 | 처음 작성 결과의 개수·길이·제목 일치는 검사 안 함 | `blog-writer:server/schema.ts:31` |
| 화면 | `TitlePicker` (미리보기·편집의 제목 아래) | 후보 고르기, 지금 제목 표시, 다시 만들기 버튼·진행 안내·오류 | `blog-writer:src/job/TitlePicker.tsx:9-67`, `blog-writer:src/job/JobDetail.tsx:186-197`, `blog-writer:src/job/Preview.tsx:67-68`, `blog-writer:src/job/PostEditor.tsx:148-152` |
| 화면(작성 리포트) | 키워드 반복 경고 (후보 목록은 2026-10-10에 제목 아래로 옮김) | 제목 1·본문 2 | `blog-writer:src/job/Report.tsx:26-50` |
| 테스트 | 다시 만들기 프롬프트(기법·키워드 지시 포함)·정리·오류, 요청 검사, 글은 그대로, 규칙 사본 사용 / 작성 프롬프트의 기법·키워드 지시 / 횟수 세기 | | `blog-writer:tests/titles.test.ts:33-85`, `blog-writer:tests/writingOptions.test.ts:56-63`, `blog-writer:tests/keywords.test.ts:1-31` |

키워드 횟수는 프롬프트로 지시하고 화면은 경고만 해서 결과 보장이 없다. 처음 작성의 후보는 프롬프트에만 있어 `consistency: single-source`, 결과 보장이 없어 `confidence: medium`.

## 예외 / 경계값
- 메인·서브 키워드는 네이버 검색어 제안 수집의 입력이 된다 → [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]].
- 다시 만들기는 작업을 잠그지 않는다 (서버가 글을 쓰지 않으므로 그사이 고친 내용과 서로 덮어쓰지 않는다). 다만 시작할 때 다른 작업이 진행 중이면 거절한다.
- 다시 만들기 결과가 3개보다 적을 수 있다 (중복·빈 값을 뺀 뒤).
- 실제 Claude가 "본문에 있는 사실만", 25~35자, 키워드 횟수를 지키는지는 확인하지 않았다 → [[writing/open-questions]] #14.
- 프롬프트로 글 고치기·분량/말투 다시 쓰기에는 키워드 횟수 지시가 없다(규칙 사본의 문구만 따름). 다시 쓴 글이 횟수를 넘기면 경고만 뜬다 → [[writing/open-questions]] #19.
- 정보형 말투(배경 → 핵심 사실)와 "도입부에서 답 먼저"가 부딪힌다 → [[writing/open-questions]] #18. 정리형 말투의 질문형 소제목은 본문 키워드 2번 제한과 부딪히기 쉽다 → #20.

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-10 | 후보를 고르는 곳을 작성 리포트에서 본문 맨 위 제목 아래(미리보기·편집)로 옮김. "제목 다시 만들기"(후보만 새로 받기, 지금 제목은 유지) 추가 | 커밋 afc7c10, `blog-writer:server/titles.ts:16-57` |
| 2026-10-12 | 제목 기법 4가지, 키워드 횟수(제목 1번·본문 2번까지, 전에는 "같은 키워드 반복은 피함" 권고만), 검색 의도 지시, 작성 리포트의 키워드 반복 경고 추가 | 커밋 74e5eb0 |
