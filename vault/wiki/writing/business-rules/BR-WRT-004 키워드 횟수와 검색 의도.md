---
type: business-rule
domain: writing
id: BR-WRT-004
name: 키워드 횟수와 검색 의도
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/keywords.ts:1-57
  - blog-writer:server/writer.ts:77-78
  - blog-writer:server/editPost.ts:keywordSection
entities: [글]
updated: 2026-11-02
---
# BR-WRT-004 키워드 횟수와 검색 의도

## 규칙
메인·서브 키워드는 그 표현 그대로 **제목에 1번, 본문 전체에 2번**까지만 쓴다(소제목 포함, "참고 자료" 제외). 이 횟수를 넘기지 않으려면 대명사·동의어·연관어로 바꿔 쓴다. 제목과 본문은 검색 질문에 답하는 내용이어야 하고, 소제목은 그 질문을 검색한 사람이 이어서 알고 싶어 할 내용으로 구성한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 키워드 표현 세기 | 띄어쓰기·대소문자 무시("전기차 보조금"="전기차보조금") |
| 긴 키워드 안의 짧은 키워드 | 긴 것부터 세고 지워서 따로 세지 않음 |
| 제목 > 1번 또는 본문 > 2번 | 초과로 표시(`keywordOveruse`, 화면 키워드 횟수 표) |
| 키워드 없는 예전 글 | 세지 않고 고치기 때도 지시하지 않음 |
| 프롬프트로 일부만 고칠 때 | 글 전체 기준 사용 횟수를 알려 줌 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `KEYWORD_LIMIT`, `countKeywords`, `keywordCounts`, `keywordOveruse` | 제목 1, 본문 2 | `blog-writer:shared/keywords.ts` |
| 프롬프트 | `KEYWORD_RULES` (글 작성·제목 다시 만들기·고치기가 공유) | 횟수와 검색 의도 | `blog-writer:shared/keywords.ts:12-17` |
| 서버 | 글 작성 프롬프트, `keywordSection`(고치기), `regenerateTitles` | 같은 지시문 재사용 | `blog-writer:server/writer.ts`, `server/editPost.ts`, `server/titles.ts` |
| 규칙 문서 | "3. 블로그 SEO" 키워드 항목 | 메인 1 + 서브 2~3 | `blog-writer:rules/default-writing-rules.md:13-30` |
| 화면 | 키워드 횟수 표 | `keywordCounts` 사용 | [[_system/modules/web-job]] |
| 테스트 | 횟수 세기, 초과 알림 | | `blog-writer:tests/keywords.test.ts`, `tests/editPost.test.ts:51` |

## 예외 / 경계값
- 코드는 **초과를 알리기만 하고 자동으로 다시 쓰지 않는다**(프롬프트 지시 + 화면 표시). 그래서 결과가 어겨질 수 있다.
- 글자수와 같은 범위(`bodyTexts`)를 쓴다. → [[writing/business-rules/BR-WRT-001 분량 목표와 상한]]
- 변경 시: `shared/keywords.ts`의 상수와 `KEYWORD_RULES` 문구(문구 안에 숫자 1·2가 따로 적혀 있음)를 함께 고친다.

## 영향받는 플로우
[[writing/flows/초안 작성]], [[writing/flows/프롬프트로 글 고치기]], [[writing/flows/제목 후보 다시 만들기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성. 직전 커밋(74e5eb0, caa676f)에서 도입·확장 | 코드 |
