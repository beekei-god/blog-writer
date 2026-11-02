---
type: business-rule
domain: publishing
id: BR-PUB-003
name: 예약 시각 규칙
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/wordpress.ts:checkSchedule
  - blog-writer:server/routes/jobs.ts:post-to-blog
  - blog-writer:shared/types.ts:NAVER_MINUTE_STEP
  - blog-writer:server/browser/publish.ts:kstParts
entities: [블로그별 상태]
updated: 2026-11-02
---
# BR-PUB-003 예약 시각 규칙

## 규칙
예약발행 시각은 **지금보다 1분 이상 뒤**여야 한다(과거 시각을 보내면 사이트가 바로 공개해 버리기 때문). 네이버는 예약 시각이 **10분 단위**여야 한다. 시각은 UTC(ISO)로 주고받고, 크롬 발행 창에는 한국 시간(연·월·일·시·분)으로 넣는다. 예약 시각을 넣은 뒤 **다시 읽어 요청과 같을 때만** 마지막 발행 버튼을 누른다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 시각 없음/형식 오류 | "예약 시각을 올바르게 입력하세요" |
| 지금+1분 미만 | "예약 시각은 지금보다 1분 이상 뒤여야 합니다" |
| 네이버 + 분이 10의 배수 아님 | 400 "네이버 예약 시각은 10분 단위" |
| 워드프레스 | `date_gmt`(UTC, Z 없는 ISO)로 전송. 업로드 전에 먼저 검사 |
| 크롬: 입력 후 읽은 값이 다름 | 발행하지 않고 멈춤 → [[publishing/business-rules/BR-PUB-004 임시저장 우선과 발행 단계 실패]] |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `checkSchedule` | 1분, date_gmt | `blog-writer:server/wordpress.ts:251` |
| 공용 | `NAVER_MINUTE_STEP` | 10 | `blog-writer:shared/types.ts` |
| 서버 | `kstParts`, 발행 단계 | 한국 시간, 다시 읽어 확인 | `blog-writer:server/browser/publish.ts` |
| 테스트 | 예약 시각, 10분 단위, 한국 시간 | | `blog-writer:tests/wordpress.test.ts:19`, `tests/publish.test.ts:5-25` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 시각 규칙은 라우트(네이버 10분)와 `checkSchedule`(공통)에 나뉘어 있고 화면 선택기도 같은 단위로 맞춰져 있다 → [[_system/modules/web-job]].

## 영향받는 플로우
[[publishing/flows/블로그에 올리기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
