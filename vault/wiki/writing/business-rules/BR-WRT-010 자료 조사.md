---
type: business-rule
domain: writing
id: BR-WRT-010
name: 자료 조사
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/research.ts:1-88
  - blog-writer:server/pipeline.ts:doDraft
entities: [작업, 글]
updated: 2026-11-02
---
# BR-WRT-010 자료 조사

## 규칙
글을 쓰기 전에 Claude가 웹 검색(WebSearch)과 페이지 열람(WebFetch)으로 주제를 조사한다. 사용자가 준 링크는 모두 읽고, 그 밖의 페이지 열람은 최대 6개로 제한한다. 조사 결과로 **검색 질문 1개, 메인 키워드 1개, 서브 키워드 2~3개, 조사 노트, 출처 목록**을 받는다. 출처는 공식·언론·블로그·기타로 분류하고, http(s) 주소만 중복 없이 남긴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 조사 | effort high, 제한 20분, 단계 `research` |
| 출처 종류 | official / press / blog / other |
| URL이 http(s)가 아님 | 출처에서 제외 |
| 조사 실패 | 작업 `failed` + 오류, 다시 시도 가능 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `deepResearch` | 도구 WebSearch/WebFetch, 열람 6개 | `blog-writer:server/research.ts` |
| 서버 | `doDraft`가 호출하고 notes·sources 저장 | researching 단계 | `blog-writer:server/pipeline.ts` |
| 규칙 문서 | "5. 확인된 내용만 사용" 우선순위 | 공식 > 언론 > 개인 블로그(참고용) | `blog-writer:rules/default-writing-rules.md:40-52` |

## 예외 / 경계값
- 모델 호출 자체는 로컬 `claude -p` CLI를 쓴다. → [[_system/integrations/claude-cli]]

## 영향받는 플로우
[[writing/flows/초안 작성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
