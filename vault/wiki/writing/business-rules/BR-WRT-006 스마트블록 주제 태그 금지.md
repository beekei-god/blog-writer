---
type: business-rule
domain: writing
id: BR-WRT-006
name: 스마트블록 주제 태그 금지
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/writer.ts:31
  - blog-writer:rules/default-writing-rules.md:33-36
  - blog-writer:server/writer.ts:227-241
  - blog-writer:shared/types.ts:182
  - blog-writer:tests/writer.test.ts:50-68
  - blog-writer:README.md:206
entities: [Post]
updated: 2026-10-07
---
# BR-WRT-006 스마트블록 주제 태그 금지

## 규칙
네이버 "스마트블록 주제"는 수집하지 않으므로 그 출처의 태그는 만들지 않는다 (글 작성 프롬프트와 README 기준).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 글 작성 | 프롬프트: "스마트블록 주제는 이번에 수집하지 못했으므로 그 출처의 태그는 만들지 마세요" |
| 모델이 그래도 `source: "스마트블록 주제"` 태그를 냄 | 서버 `verifyTagSources`가 제거하고 로그 "수집 목록에 없는 태그 N개 제외: #태그(스마트블록 주제)" |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 프롬프트(작성) | 금지 | 만들지 말 것 | `blog-writer:server/writer.ts:31` |
| 기본 글쓰기 규칙 | 금지와 일치 (2026-10-05 수정) | 태그 순서·구성에서 스마트블록 언급 삭제 (자동완성·함께 많이 찾는만) | `blog-writer:rules/default-writing-rules.md:31-36` |
| 서버 검증 | 제거 (2026-10-05 추가) | 이 출처 태그는 무조건 제외 | `blog-writer:server/writer.ts:234-237` |
| 공용 타입 | 출처 값으로 아직 허용 | `TAG_SOURCES`에 포함 (모델 출력 스키마 enum 때문에 남겨 둠) | `blog-writer:shared/types.ts:182` |
| 테스트 | 스마트블록 출처 태그 제외 확인 | | `blog-writer:tests/writer.test.ts:50-68` |
| README | 자동완성·"함께 많이 찾는"만 수집, 목록 밖 출처 태그는 서버가 제외 (스마트블록 직접 언급은 없음) | | `blog-writer:README.md:206` |

모든 레이어가 "스마트블록 주제 태그는 만들지 않는다"로 같다.

## 예외 / 경계값
- 규칙 문서의 "연관검색어"는 프롬프트가 "함께 많이 찾는"으로 대응시킨다 (`blog-writer:server/writer.ts:30`).
- `data/writing-rules.md` 수정본이 있으면 기본 규칙 파일 변경이 적용되지 않는다. 수정본에 스마트블록 문구가 남아 있을 수 있어도 서버가 그 출처 태그를 제거한다.

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]]

## 확인 필요
- 해결됨: [[writing/open-questions]] #2

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 금지로 통일: 규칙 문서에서 스마트블록 삭제, 서버가 그 출처 태그 제거 (consistency conflict → consistent) | `blog-writer:rules/default-writing-rules.md:31-36`, `blog-writer:server/writer.ts:234-237` |
