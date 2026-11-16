---
type: business-rule
domain: writing
id: BR-WRT-005
name: 제목 후보와 후킹 기법
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/titleGuide.ts:1-25
  - blog-writer:server/titles.ts:1-63
  - blog-writer:server/writer.ts:70-78
entities: [글]
updated: 2026-11-16
---
# BR-WRT-005 제목 후보와 후킹 기법

## 규칙
글을 쓸 때 제목 후보를 **3개** 내고, 서로 다른 기법(구체적 숫자 / 결론·이득 먼저 / 손실 회피 / 질문·호기심 / 대상·상황 호명 / 통념 뒤집기)을 쓴다. 메인 키워드는 제목 앞쪽에, 길이는 35자(25~35자) 안팎이고, 첫 15자 안에 키워드와 훅이 보여야 한다. 숫자·기간·대상은 조사한 사실만 쓰고 과장·공포 조장·낚시성 표현은 쓰지 않는다. 후보 3개는 첫 단어와 구조가 겹치지 않아야 한다.

기법별 세부: 숫자는 리서치 수치뿐 아니라 본문이 다루는 항목 개수('3가지', 'TOP 3', 본문 소제목·목록 수와 일치)도 쓸 수 있고, 숫자 기법이 아닌 후보에도 사실인 숫자를 넣을 수 있으면 넣는다. 손실 회피는 같은 사실을 '안 하면(모르면) 잃는 것'으로 바꿔 말하고 본문에 있는 손해 금액·불이익을 쓴다. 질문은 '왜 ~할까요?', '어떻게 하면 ~할 수 있을까?', '모르고 지나치기 쉬운 ~은?' 구조를 쓴다. '이 글을 안 읽으면 손해' 같은 말과 지어낸 인물 사례('○○ 부장님 이야기')는 쓰지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 글 작성 | `titleCandidates` 3개 + 그중 `title` 1개 |
| 제목 다시 만들기 | 글은 바꾸지 않고 후보만 새로 받음. 굵게(`**`)·중복 제거, 최대 3개 |
| 후보가 하나도 없음 | 오류 "제목 후보를 만들지 못했습니다" |
| 직접 입력 | 후보와 같은 경로(`onPick`)로 제목이 바뀌고 자동 저장. 길이·후킹 검사 없음, 빈 값은 적용 안 됨, 작업 진행 중에는 비활성 |
| 본문이 길 때 | 다시 만들기는 본문 앞 4,000자만 보여 줌 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트 | `TITLE_TECHNIQUES` | 6기법(숫자에 항목 개수, 손실 회피에 '안 하면 잃는 것' 바꿔 말하기, 질문 구조 3개) + 후킹 점검(다른 후보에도 숫자) + 지킬 것(읽지 않으면 손해·지어낸 인물 금지) | `blog-writer:server/titleGuide.ts` |
| 프롬프트 | 글 작성 `BASE_SYSTEM` | 후보 3개 | `blog-writer:server/writer.ts:70-78` |
| 서버 | `regenerateTitles` (low effort, 3분) | 지금 제목·예전 후보와 다르게 | `blog-writer:server/titles.ts` |
| 서버 | `POST /api/jobs/:id/titles` | 작업의 규칙 사본 사용 | `blog-writer:server/routes/jobs.ts` |
| 규칙 문서 | "3. 블로그 SEO" 제목 항목 | 35자, 기법 6가지 | `blog-writer:rules/default-writing-rules.md:13-30` |
| 화면 | 제목 후보 선택, 다시 만들기, 직접 입력(`TitlePicker`, 미리보기에서도 가능), "이 제목으로 썸네일 만들기" | [[image/overview]] | [[_system/modules/web-job]] |
| 테스트 | 기법 6가지·후킹 점검·기법별 세부 지시, 다시 만들기 | | `blog-writer:tests/writingOptions.test.ts:56`, `tests/titles.test.ts` |

## 예외 / 경계값
- 길이·후킹은 프롬프트 지시일 뿐 서버가 검사하지 않는다(`confidence: medium`).
- 기법 문구를 바꿀 때 같이 볼 곳: `server/titleGuide.ts` 한 곳을 글 작성(`server/writer.ts`)과 제목 다시 만들기(`server/titles.ts`)가 같이 쓴다. 기법 이름·개수를 바꾸면 `rules/default-writing-rules.md` "3. 블로그 SEO" 제목 항목과 `tests/writingOptions.test.ts`("제목 후보는 제목 기법 6가지…")도 고친다.
- 썸네일은 제목이 정해진 뒤 사용자가 버튼을 눌러 만든다(커밋 73f47a6). → [[image/overview]]

## 영향받는 플로우
[[writing/flows/초안 작성]], [[writing/flows/제목 후보 다시 만들기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 (기법 6가지는 73f47a6에서 도입) | 코드 |
| 2026-11-05 | 미리보기 화면의 제목 후보 영역에 "직접 입력" 추가(규칙 값은 그대로) | 2763f99 |
| 2026-11-16 | 손실 회피·질문·숫자 기법 세부 지시 보강, 읽지 않으면 손해·지어낸 인물 사례 금지 추가(기법 수 6가지 그대로) | b3934e4 |
