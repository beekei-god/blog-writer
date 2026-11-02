---
type: business-rule
domain: writing
id: BR-WRT-013
name: 글 구조와 문단 형식
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:rules/default-writing-rules.md:1-8
  - blog-writer:rules/default-writing-rules.md:53-79
  - blog-writer:server/writer.ts:50-96
entities: [글 블록]
updated: 2026-11-02
---
# BR-WRT-013 글 구조와 문단 형식

## 규칙
글은 "소제목 1개 + 그 쟁점의 내용(문단·목록·표·이미지)"을 한 섹션으로 묶는다. 소제목 앞에는 내용에 맞는 이모지 하나를 붙이고, 소제목과 내용 사이에는 구분선·장식·빈 줄을 두지 않는다(`---`, `***`, `───` 등 모든 구분선 금지). 섹션 사이에는 빈 줄 한 줄만 두며 이것은 프로그램이 소제목 위에 자동으로 넣는다. 문단은 한 가지 내용만 담아 2~4줄로 쓰고, 문장이 끝날 때마다 줄바꿈 문자(`\n`)로 줄을 나눈다. 굵은 글씨는 `**…**`만 쓰고 다른 마크다운은 쓰지 않는다. 쉬운 말을 쓰고 어려운 용어는 처음 나올 때 한 줄로 푼다. 숫자는 표와 목록으로 보여 준다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 빈 문단·빈 항목 | 만들지 않음(프롬프트 지시) |
| 표 | headers와 모든 rows의 칸 수가 같고 모두 채워짐 → [[writing/business-rules/BR-WRT-006 확인된 사실만 쓰기]] |
| 마지막 섹션 | "핵심 요약"과 "참고 자료"(링크 포함) |
| 도입부 | 2~3문장 안에 메인 키워드를 넣고 얻을 정보를 밝힘. **"답·결론 먼저" 지시는 쓰지 않음**(caa676f에서 뺌) |
| 정보는 본문 텍스트로 | 날짜·금액·자격은 이미지가 아니라 본문에 씀 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 규칙 문서 | "1 쉬운 문장", "3 본문", "6 소제목과 섹션 구성" | 위 전부 | `blog-writer:rules/default-writing-rules.md` |
| 프롬프트 | `BASE_SYSTEM` 블록 형식 지시 | 블록 종류·줄바꿈·굵게 | `blog-writer:server/writer.ts:50-96` |
| 공용/서버 | 소제목 위 빈 줄 | 붙여넣기 HTML·미리보기가 자동 | `blog-writer:shared/postHtml.ts` |
| 테스트 | 도입부에 "답 먼저" 지시가 없는지 | | `blog-writer:tests/writingOptions.test.ts:155` |

## 예외 / 경계값
- 대부분 프롬프트와 규칙 문서로만 지키므로 코드가 어김을 막지 않는다(`confidence: medium`).
- 블로그마다 소제목·구분선을 그리는 방식이 달라 화면에 보이는 모양은 [[publishing/overview]]에서 다룬다.

## 영향받는 플로우
[[writing/flows/초안 작성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성. 도입부 "답 먼저" 제거는 caa676f | 코드 |
