---
type: business-rule
domain: writing
id: BR-WRT-007
name: 빈 칸 있는 표 행 제거
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/writer.ts:24
  - blog-writer:server/writer.ts:165
  - blog-writer:server/writer.ts:260-264
  - blog-writer:rules/default-writing-rules.md:45
  - blog-writer:shared/types.ts:174-175
  - blog-writer:src/job/PostEditor.tsx:49-55
  - blog-writer:server/routes/jobs.ts:84-98
  - blog-writer:tests/writer.test.ts:18-27
entities: [Post]
updated: 2026-10-07
---
# BR-WRT-007 빈 칸 있는 표 행 제거

## 규칙
표의 모든 칸은 채워져 있어야 한다. 빈 칸이나 "-", "미정", "확인 중", "없음" 같은 표시가 있는 행은 빼고, 남는 행이 없으면 표 자체를 뺀다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 행의 칸 수 ≠ 머리글 칸 수 | 그 행 제거 |
| 칸이 비었거나 `-`, `–`, `—`, `미정`, `확인 중`, `없음`만 있음 | 그 행 제거 |
| 머리글이 없거나 남은 행이 0개 | 표 블록 제거 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 규칙 문서 | 빈 칸·"-"·"미정" 금지, 행 삭제 | | `blog-writer:rules/default-writing-rules.md:45` |
| 프롬프트(작성) | 칸 수 같게, 모두 채움, 못 채우면 행 빼기 | | `blog-writer:server/writer.ts:24` |
| 서버(작성 직후) | `isCompleteTable` 필터 | 위 표 | `blog-writer:server/writer.ts:165`, `:260-264` |
| 서버(저장 PUT) | 같은 필터 적용 (2026-10-05 추가) | 편집 결과에서도 불완전한 행·표 제거 | `blog-writer:server/routes/jobs.ts:90-93` |
| 화면(편집) | 검사 없음 (저장 때 서버가 정리) | `|`로 나눈 텍스트를 그대로 표로 저장 요청 | `blog-writer:src/job/PostEditor.tsx:49-55` |
| 테스트 | 빈 칸·"-"·"미정"·칸 수 다른 행 제거, 남은 행 없으면 표 제거 | | `blog-writer:tests/writer.test.ts:18-27` |

## 예외 / 경계값
- 분량 줄이기(enforceLength) 결과에도 작성 직후 필터가 적용된다.
- 편집 중 빈 칸을 임시로 둔 행은 1초 뒤 자동 저장에서 서버가 지우고, 저장 응답이 오면 화면에도 반영된다(대기 중인 수정이 없을 때). 칸을 채우는 도중 행이 사라질 수 있다.
- 머리글이 비었거나 남은 행이 0개면 표 블록 자체가 삭제된다.

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 확인 필요
- 해결됨: [[writing/open-questions]] #4

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 저장(PUT) 때도 `isCompleteTable` 적용 (consistency conflict → consistent) | `blog-writer:server/routes/jobs.ts:90-93` |
