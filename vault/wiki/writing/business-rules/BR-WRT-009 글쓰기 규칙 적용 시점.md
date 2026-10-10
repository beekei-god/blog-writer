---
type: business-rule
domain: writing
id: BR-WRT-009
name: 글쓰기 규칙 적용 시점
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/rules.ts:6-37
  - blog-writer:server/pipeline.ts:86-92
  - blog-writer:server/routes/settings.ts:52-62
  - blog-writer:src/RulesEditor.tsx:22-32
  - blog-writer:src/RulesEditor.tsx:64
entities: [글쓰기 규칙, Job]
updated: 2026-10-07
---
# BR-WRT-009 글쓰기 규칙 적용 시점

## 규칙
글쓰기 규칙은 작업이 리서치를 시작할 때마다 새로 읽는다. 저장한 규칙은 **다음에 시작하는 작업부터** 적용되고, 진행 중인 작업에는 적용되지 않는다. 작업마다 그때 쓴 규칙의 사본을 남긴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `<데이터 폴더>/writing-rules.md` 있음 | 수정본 사용, 로그 "글쓰기 규칙 적용 (수정본, 시각)" |
| 없음/읽기 실패 | 기본 규칙 `<프로젝트 루트>/rules/default-writing-rules.md`(실행 폴더와 무관), 로그 "(기본 규칙)" |
| 작업 시작(새 작업·자료 조사부터 다시) | `Job.rulesSnapshot`에 규칙 전문 저장 |
| 규칙 저장 | 1~50,000자, 끝에 줄바꿈 추가, 원자적 교체(`writeFileAtomic`) |
| 기본으로 되돌리기 | 수정본 파일 삭제 |
| 저장 안 한 수정이 있는 채 다른 탭/창 닫기 | 확인 창 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | 작업마다 `getRules()` | | `blog-writer:server/pipeline.ts:86-92` |
| 서버 | 저장 검증 | 1~50,000자 | `blog-writer:server/routes/settings.ts:54-61` |
| 화면 | 안내 문구·이탈 확인 | "다음 작업부터 적용 (진행 중인 작업에는 적용되지 않음)" | `blog-writer:src/RulesEditor.tsx:64`, `:22-32` |

## 예외 / 경계값
- 이미지 다시 만들기·블로그 입력은 규칙을 다시 읽지 않는다 (규칙은 리서치·작성 프롬프트에만 들어감).
- 블로그 입력 서식(소제목 위 빈 줄 등)은 규칙 문서가 아니라 코드에 고정되어 있다 → [[publishing/business-rules/BR-PUB-007 소제목 위 빈 줄]].

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
