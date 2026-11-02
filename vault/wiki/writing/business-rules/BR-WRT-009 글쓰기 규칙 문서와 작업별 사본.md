---
type: business-rule
domain: writing
id: BR-WRT-009
name: 글쓰기 규칙 문서와 작업별 사본
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/rules.ts:1-43
  - blog-writer:server/pipeline.ts:90
  - blog-writer:rules/default-writing-rules.md
entities: [작업]
updated: 2026-11-02
---
# BR-WRT-009 글쓰기 규칙 문서와 작업별 사본

## 규칙
글쓰기 규칙은 마크다운 문서 하나다. 사용자가 화면에서 고친 내용(`data/writing-rules.md`)이 있으면 그것을, 없으면 저장소의 기본 규칙(`rules/default-writing-rules.md`)을 쓴다. 작업을 시작할 때마다 새로 읽고, 그 시점의 규칙을 작업에 **사본(`rulesSnapshot`)**으로 저장해 제목 다시 만들기 등 이후 단계도 같은 규칙을 쓴다. 규칙을 고치면 **다음 작업부터** 반영된다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 사용자 규칙 파일 있음 | 그 내용, `isDefault=false`, 수정 시각 |
| 없음 | 기본 규칙, `isDefault=true` |
| 초기화 | 사용자 파일 삭제 → 기본 규칙 |
| 사본이 없는 예전 작업 | 제목 다시 만들기가 현재 규칙을 읽음 |

기본 규칙 문서의 큰 항목: 1 쉬운 문장, 2 존댓말, 3 블로그 SEO, 4 태그, 5 확인된 내용만, 6 소제목·섹션 구성.

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `getRules`, `saveRules`, `resetRules`, `todayKST` | 파일 선택·한국 날짜 | `blog-writer:server/rules.ts` |
| 서버 | `doDraft`가 `rulesSnapshot` 저장 | 작업 시작 때 | `blog-writer:server/pipeline.ts:90` |
| 서버 | 제목 다시 만들기·고치기가 사본 사용 | | `blog-writer:server/routes/jobs.ts`, `server/pipeline.ts` |
| 화면 | 설정의 글쓰기 규칙 편집 | 저장/초기화 | [[_system/modules/web-screens]] |

## 예외 / 경계값
- 규칙 문서의 내용은 프롬프트에 그대로 들어가므로, 코드의 말투·키워드·분량 지시와 충돌하는 문구를 쓰면 모델이 헷갈린다. 코드가 규칙 문서보다 우선하도록 프롬프트에서 "우선" 문구를 둔다(말투 등).
- `data/writing-rules.md`는 사용자 데이터이므로 읽지 않는다.

## 영향받는 플로우
[[writing/flows/초안 작성]], [[writing/flows/제목 후보 다시 만들기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
