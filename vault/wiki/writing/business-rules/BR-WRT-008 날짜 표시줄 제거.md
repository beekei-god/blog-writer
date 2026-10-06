---
type: business-rule
domain: writing
id: BR-WRT-008
name: 날짜 표시줄 제거
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:rules/default-writing-rules.md:51
  - blog-writer:server/writer.ts:178-182
  - blog-writer:server/writer.ts:165
  - blog-writer:tests/writer.test.ts:6-16
entities: [Post]
updated: 2026-10-07
---
# BR-WRT-008 날짜 표시줄 제거

## 규칙
본문에 "최종 업데이트", 작성일, 수정일, 갱신일 같은 날짜 표시줄을 넣지 않는다. 모델이 넣더라도 서버가 뺀다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 문단(paragraph) 블록, `**` 뺀 길이 40자 이하, `(최종|마지막)? (업데이트|수정|갱신|작성|확인)(일|날짜|일자)? [:：]? YYYY[.-/년]`로 시작 | 그 블록 삭제 |
| 그 밖 (긴 문단 안의 날짜, 목록·표 안의 날짜) | 유지 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 규칙 문서 | 금지 | | `blog-writer:rules/default-writing-rules.md:51` |
| 서버(작성 직후) | `stripUpdateLines` | 40자 이하 문단만 | `blog-writer:server/writer.ts:178-182` |
| 화면 | 없음 | | |
| 테스트 | 짧은 날짜 문단만 삭제, 긴 문단·소제목은 유지 | | `blog-writer:tests/writer.test.ts:6-16` |

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
