---
type: business-rule
domain: writing
id: BR-WRT-001
name: 분량 목표와 상한
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/length.ts:1-53
  - blog-writer:server/writer.ts:enforceLength
  - blog-writer:server/schema.ts:73-90
entities: [글쓰기 옵션, 글 블록]
updated: 2026-11-02
---
# BR-WRT-001 분량 목표와 상한

## 규칙
본문 분량은 사용자가 작업마다 고른 목표 글자수(공백 포함, 1,000~8,000자)를 따른다. 처음 쓸 때는 목표의 ±10%를 지시하고, 결과가 목표의 1.2배를 넘으면 사실은 유지한 채 줄여 다시 쓰게 한다(최대 2번). 글자수는 "참고 자료" 소제목 앞까지만, 제목·이미지·장소 블록은 빼고 센다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 목표 2,500자 | 지시 범위 2,300~2,800자, 상한 3,000자 |
| 결과가 상한 초과 | "본문 N자 → M자 이내로 줄이는 중 (n차)" 로그, 줄여 다시 쓰기, 최대 2번 |
| 2번 줄여도 초과 | "줄인 뒤에도 본문이 N자입니다. 직접 줄여 주세요" 안내만 하고 그대로 둠 |
| 결과가 목표 범위 하한 미만 | "목표보다 짧습니다" 안내만(확인된 자료가 부족하면 짧아질 수 있음) |
| 옵션 없는 예전 작업 | 목표 2,500자(`DEFAULT_TARGET_CHARS`) |
| 목표값이 1,000~8,000 밖 | 작업 만들기 거절(400) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `maxBodyChars`, `targetRange`, `countBodyChars`, `LENGTH_PRESETS` | 1.2배·±10%·프리셋 1,500/2,500/4,000/6,000 | `blog-writer:shared/length.ts` |
| 프롬프트 | `BASE_SYSTEM` 분량 지시 | 목표 범위와 상한 | `blog-writer:server/writer.ts:50` |
| 서버 | `enforceLength` | 최대 2번 줄이기 | `blog-writer:server/writer.ts:enforceLength` |
| 서버 | `WritingOptionsSchema`, 작업 생성 라우트 | 1,000~8,000 검사 | `blog-writer:server/schema.ts:73`, `blog-writer:server/routes/jobs.ts` |
| 프롬프트 | 고치기 시스템 프롬프트 | 고친 뒤에도 상한 안 | `blog-writer:server/editPost.ts` |
| 화면 | 분량 선택, 글자수 표시 | 프리셋 버튼 | `blog-writer:src/` (화면은 [[_system/modules/web-screens]]) |
| 테스트 | 상한 1.2배일 때만 줄이기, 짧으면 로그 | | `blog-writer:tests/writer.test.ts`, `tests/writingOptions.test.ts` |

## 예외 / 경계값
- 글자수 계산 범위는 키워드 횟수와 같다(`bodyTexts`). → [[writing/business-rules/BR-WRT-004 키워드 횟수와 검색 의도]]
- 값을 바꾸면 `shared/length.ts`, 프롬프트 문구, 근거 테스트 3곳을 함께 고친다.

## 영향받는 플로우
[[writing/flows/초안 작성]], [[writing/flows/프롬프트로 글 고치기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
