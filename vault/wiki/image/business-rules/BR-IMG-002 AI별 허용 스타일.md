---
type: business-rule
domain: image
id: BR-IMG-002
name: AI별 허용 스타일
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:9-14
  - blog-writer:shared/types.ts:80-82
  - blog-writer:server/routes/images.ts:POST /api/jobs/:id/images/:target/regenerate
  - blog-writer:server/images/styles.ts:1-40
entities: [이미지 옵션]
updated: 2026-11-02
---
# BR-IMG-002 AI별 허용 스타일

## 규칙
Claude(SVG)는 **플랫 일러스트(flat)만** 그릴 수 있고, Gemini·ChatGPT는 지브리·실사·애니·플랫 4가지를 쓴다. 고른 스타일이 그 AI에서 못 쓰는 것이면 그 AI의 첫 스타일로 맞춘다(`fitStyle`). 한 글 안의 이미지는 같은 스타일 문구를 붙여 화풍을 통일한다. 지브리 스타일은 서비스 정책상 거절될 수 있다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| Claude + 플랫 외 스타일 선택 | 옵션 해석 때 flat으로 맞춤 |
| 한 장 다시 만들기에서 허용 안 되는 조합 | 400 "Claude(SVG)는 플랫 일러스트만 그릴 수 있습니다" |
| 지브리가 거절됨 | 오류 `refused`로 기록, 다른 스타일/AI로 다시 만들 수 있음 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `STYLES_BY_PROVIDER`, `fitStyle`, `aiFor` | claude [flat]; gemini/chatgpt 4종 | `blog-writer:shared/types.ts` |
| 서버 | `STYLE_PROMPT`, `styledPrompt` | 스타일별 영어 문구 | `blog-writer:server/images/styles.ts` |
| 프롬프트 | `STYLE_GUIDE` (글 작성·기획) | 스타일 설명 | `blog-writer:server/writer.ts` |
| 서버 | 검증 | 조합 검사 | `blog-writer:server/routes/images.ts`, `server/schema.ts` |
| 화면 | 스타일 선택에서 비허용 항목 숨김/비활성 | | [[_system/modules/web-job]] |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 새 스타일을 추가하면 `ImageStyle` 타입, `STYLES_BY_PROVIDER`, `STYLE_PROMPT`, `STYLE_GUIDE`, 스키마의 enum, 화면 선택지를 모두 고친다 → [[_system/extending]]

## 영향받는 플로우
[[image/flows/이미지 생성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
