---
type: business-rule
domain: publishing
id: BR-PUB-002
name: 올리기 전 조건
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/routes/jobs.ts:POST /api/jobs/:id/post-to-blog
entities: [블로그 설정]
updated: 2026-11-02
---
# BR-PUB-002 올리기 전 조건

## 규칙
올리기 요청은 아래 조건을 모두 만족해야 시작한다. 블로그는 **항상 직접 고른다**(기본 블로그 없음).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 초안 없음 | 400 "초안이 없습니다" |
| 작업 진행 중 | 409 "이미 진행 중입니다" |
| 블로그(platform) 안 고름/값 이상 | 400 "올릴 블로그를 선택하세요" |
| 그 블로그의 ID/주소가 설정에 없음 | 400 "먼저 설정에서 … 입력하세요" |
| 워드프레스: 주소가 https가 아님 등 | 400 → [[publishing/business-rules/BR-PUB-006 워드프레스 등록 규칙]] |
| 워드프레스: 연결 정보 없음 | 400 "설정 → 워드프레스 설정에서 연결하세요" |
| 워드프레스 카테고리에 사이트 ID가 없음 | 400 "사이트 목록에서 골라 주세요" |
| 네이버·티스토리: Claude in Chrome 미설치 | 400 + 설치 주소 |
| 예약 모드 시각 문제 | → [[publishing/business-rules/BR-PUB-003 예약 시각 규칙]] |
| 통과 | 작업을 `posting`으로 표시, 마지막 카테고리 기억, 백그라운드 실행(202) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | 라우트 검사 | 위 표 | `blog-writer:server/routes/jobs.ts` |
| 서버 | `extensionStatus` | 설치 여부 파일로 확인(연결 여부는 실행해 봐야 앎) | `blog-writer:server/browser/claudeChrome.ts` |
| 테스트 | 요청 검사 | | `blog-writer:tests/api.test.ts` |

## 영향받는 플로우
[[publishing/flows/블로그에 올리기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
