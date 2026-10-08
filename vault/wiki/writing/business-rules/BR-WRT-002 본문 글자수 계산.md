---
type: business-rule
domain: writing
id: BR-WRT-002
name: 본문 글자수 계산
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/length.ts:6-33
  - blog-writer:tests/shared.test.ts:23-45
entities: [Post]
updated: 2026-10-07
---
# BR-WRT-002 본문 글자수 계산

## 규칙
본문 글자수는 소제목·문단·인용·목록 항목·표의 모든 칸 글자를 공백 포함으로 더한 값이다. 제목, 이미지, 줄바꿈은 세지 않고, "참고 자료"(또는 "참고한 자료", "출처") 소제목부터 끝까지는 뺀다. `**` 굵게 표시는 빼고, 이모지·한글은 한 글자로 센다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 소제목이 `/참고\s*(한\s*)?자료|출처/`에 맞음 | 거기서 세기를 멈춤 |
| 문단 안 줄바꿈 `\n`(`\r` 포함) | 세지 않음 (2026-10-05 수정, 예전엔 1자로 셌음) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `countBodyChars` | 위 규칙 | `blog-writer:shared/length.ts:14-33` |
| 서버 | 작성·줄이기 판단, 로그 | 같은 함수 | `blog-writer:server/writer.ts:152`, `:194` |
| 화면 | 글자수 칩 | 같은 함수 | `blog-writer:src/job/JobDetail.tsx:168`, `:272-275` |
| 테스트 | 공백 포함·줄바꿈/굵게/이미지 제외, 참고 자료 이후 제외, 이모지 1자 | | `blog-writer:tests/shared.test.ts:23-45` |
| 프롬프트 | "참고 자료 소제목 앞까지만, 공백 포함" | | `blog-writer:server/writer.ts:201` |

## 예외 / 경계값
- 줄바꿈은 세지 않는다. 주석·규칙 문서와 일치한다 (2026-10-05 수정).
- "출처"라는 단어가 들어간 일반 소제목(예: "출처별 비교")도 거기서 세기를 멈춘다.

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]]

## 확인 필요
- 해결됨: [[writing/open-questions]] #3
## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 문단 안 줄바꿈을 글자수에서 제외 | `blog-writer:shared/length.ts:8` |
