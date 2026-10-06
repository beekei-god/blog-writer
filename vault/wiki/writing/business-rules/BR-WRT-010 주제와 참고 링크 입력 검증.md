---
type: business-rule
domain: writing
id: BR-WRT-010
name: 주제와 참고 링크 입력 검증
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/routes/jobs.ts:43-72
  - blog-writer:src/NewJob.tsx:22-40
  - blog-writer:src/NewJob.tsx:78-96
  - blog-writer:src/NewJob.tsx:128-140
  - blog-writer:src/NewJob.tsx:192-197
  - blog-writer:tests/api.test.ts:59-65
entities: [Job]
updated: 2026-10-07
---
# BR-WRT-010 주제와 참고 링크 입력 검증

## 규칙
새 작업의 주제는 앞뒤 공백을 뺀 2~300자, 참고 링크는 http(s)로 시작하는 올바른 URL 최대 20개다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 주제 2자 미만 | 화면: 버튼 비활성·안내. 서버: 400 "주제를 2자 이상 입력하세요." |
| 주제 300자 초과 | 화면: textarea `maxLength=300`으로 입력 불가. 서버: 400 "주제는 300자 이하로 입력하세요." |
| 링크 줄이 http(s)로 시작하는 올바른 URL이 아님 | 화면: 칸 아래에 "참고 링크는 http(s)로 시작하는 주소여야 합니다. (N번째 줄)" 표시, 버튼 비활성. 서버: 400 "참고 링크는 http(s)로 시작하는 주소여야 합니다." |
| 링크 21개 이상 | 화면: "참고 링크는 최대 20개입니다. (지금 N개)" 표시, 버튼 비활성. 서버: 400 (링크 형식과 같은 메시지) |
| 통과 | 이미지 옵션을 설정의 기본값으로 저장, 작업 생성, 초안 파이프라인 시작 |

링크는 줄마다 앞뒤 공백을 지우고 빈 줄은 무시한 뒤 검사한다 (화면·서버 같음).

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | zod + 길이 초과 전용 문구 | topic 2~300, links ≤20 http(s) URL | `blog-writer:server/routes/jobs.ts:46-64` |
| 화면 | 주제: 2자 이상 + `maxLength=300`. 링크: `isHttpUrl`(`^https?://` + `new URL`), `MAX_LINKS = 20`, 오류 표시와 버튼 비활성 (2026-10-05 추가) | 서버와 같은 기준 | `blog-writer:src/NewJob.tsx:22-40`, `:78-79`, `:116`, `:137-139`, `:193-196` |
| 테스트 | 2자 미만·300자 초과·http(s) 아닌 링크의 서버 오류 문구 | | `blog-writer:tests/api.test.ts:59-65` |

모든 레이어가 같은 값이다.

## 예외 / 경계값
- 화면의 URL 판정은 서버 zod `.url()`과 완전히 같지는 않을 수 있다(브라우저 `URL` 생성자 기준). 화면이 통과시킨 링크를 서버가 거절하면 서버 메시지가 오류 배너로 나온다.
- 주제 추천의 "이 주제로 글쓰기"는 근거 URL을 링크 칸에 채운다. 근거가 20개를 넘으면 이제 화면이 오류를 보여 준다 (`blog-writer:src/Recommend.tsx:173`).

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[topic/flows/주제 추천 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 주제 300자 상한을 화면에도 적용, 서버 초과 오류 문구 분리 (링크 검증은 여전히 서버만) | `blog-writer:src/NewJob.tsx:116`, `blog-writer:server/routes/jobs.ts:53-64` |
| 2026-10-05 | 링크 형식·개수(20개)를 화면에서도 검사 (consistency conflict → consistent) | `blog-writer:src/NewJob.tsx:22-40`, `:193` |
