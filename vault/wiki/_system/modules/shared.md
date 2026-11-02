---
type: module
project: blog-writer
module: shared
paths: [shared/**]
source:
  - blog-writer:shared/types.ts
  - blog-writer:shared/length.ts
  - blog-writer:shared/keywords.ts
  - blog-writer:shared/tone.ts
updated: 2026-11-02
---
# shared (서버·화면 공용)

## 역할
서버와 화면이 같은 타입과 판정 함수를 쓰게 한다. 규칙 값이 여기 있으면 한 곳만 고치면 양쪽에 반영된다.

## 주요 파일과 export
| 파일 | 내용 |
|---|---|
| `types.ts`(452줄) | 모든 도메인 타입·상수(`Platform`, `ImageOptions`, `WritingOptions`, `Post`, `Job`, `Settings`, `Recommendation` …) |
| `length.ts` | 분량 상수·`countBodyChars` → [[writing/business-rules/BR-WRT-001 분량 목표와 상한]] |
| `keywords.ts` | `KEYWORD_RULES`, 횟수 세기 → [[writing/business-rules/BR-WRT-004 키워드 횟수와 검색 의도]] |
| `tone.ts` | 말투 판정 → [[writing/business-rules/BR-WRT-002 말투와 문장 끝 검사]] |
| `place.ts` | 장소 카드 → [[writing/business-rules/BR-WRT-008 장소 블록]] |
| `blockDiff.ts` | 고치기 비교 |
| `blogStatus.ts` | 블로그별 위치·필터 → [[publishing/business-rules/BR-PUB-009 수동 상태 표시와 목록 필터]] |
| `postHtml.ts` | 붙여넣기 HTML → [[publishing/business-rules/BR-PUB-008 본문 변환과 붙여넣기 형식]] |
| `imageErrors.ts` | 이미지 오류 분류 → [[image/entities/이미지 오류 종류]] |
| `labels.ts` | 화면·로그 공통 이름·문구 |

## 의존하는 모듈 / 쓰이는 곳
서버 전체와 `src/`가 가져다 쓴다. 이 폴더는 서버·브라우저 어디서나 돌아야 하므로 Node 전용 API를 쓰지 않는다.

## 주의할 점
- `KEYWORD_RULES` 같은 프롬프트 문구가 여기 있어 서버 프롬프트와 함께 바뀐다.
