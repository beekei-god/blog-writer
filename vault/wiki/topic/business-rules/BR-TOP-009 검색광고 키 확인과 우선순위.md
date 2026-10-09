---
type: business-rule
domain: topic
id: BR-TOP-009
name: 검색광고 키 확인과 우선순위
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/secrets.ts:58-79
  - blog-writer:server/routes/settings.ts:91-119
  - blog-writer:server/searchad.ts:28-30
  - blog-writer:server/searchad.ts:79-107
  - blog-writer:src/SearchAdSettings.tsx:6-79
  - blog-writer:tests/searchad.test.ts:82-102
entities: []
updated: 2026-10-09
---
# BR-TOP-009 검색광고 키 확인과 우선순위

## 규칙
네이버 검색광고 API 키(고객 ID·API 키·비밀 키 세 값)는 저장하기 전에 실제로 키워드 도구를 한 번 호출해 맞는지 확인한다. 환경변수 `SEARCHAD_CUSTOMER_ID`·`SEARCHAD_API_KEY`·`SEARCHAD_SECRET_KEY`가 **셋 다** 있으면 파일보다 우선한다. 값은 이 컴퓨터(`data/secrets.json`, 0600)에만 두고 화면으로 돌려주지 않는다(고객 ID 앞 3자만). [[topic/business-rules/BR-TOP-006 데이터랩 키 확인과 우선순위]]와 같은 방식이지만 **별개의 키**(개발자센터·NCP·데이터랩 키로는 안 됨)이며 요청마다 HMAC 서명이 필요하다.

## BR-TOP-006(데이터랩 키)과 비교
| 항목 | 데이터랩 (BR-TOP-006) | 검색광고 (이 규칙) |
|---|---|---|
| 값 | Client ID + Client Secret | 고객 ID + API 키 + 비밀 키 |
| 환경변수 | `NAVER_CLIENT_ID`·`NAVER_CLIENT_SECRET` | `SEARCHAD_CUSTOMER_ID`·`SEARCHAD_API_KEY`·`SEARCHAD_SECRET_KEY` |
| 확인 호출 | 최근 7일 "날씨" 트렌드 | 키워드 도구 "날씨" 1건 |
| 인증 | 헤더 `X-NCP-APIGW-API-KEY-ID`·`X-NCP-APIGW-API-KEY` | 헤더 + `X-Signature` = base64(HMAC-SHA256(비밀 키, `타임스탬프.GET./keywordstool`)) |
| 화면에 돌려주는 힌트 | Client ID 앞 4자 | 고객 ID 앞 3자 + `fromEnv`(환경변수 사용 여부) |
| 입력 검증 | 둘 다 비면 안 됨 | 셋 다 필수, 고객 ID ≤40자, 키 ≤200자 |
| 키 없을 때 | 추천은 순위 없이 진행 | 키워드 탐색은 400으로 거절하고 설정 안내 |

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 세 값 중 하나라도 비었거나 길이 초과 | 400 "고객 ID, API 키, 비밀 키를 모두 입력하세요." |
| 확인 호출 실패 | 400 + 원인(401/403 "검색광고 키가 올바르지 않습니다", 429 한도, 그 밖의 오류), 저장 안 함 |
| 성공 | 저장 후 `{configured: true, customerIdHint: "123…", fromEnv: false}` |
| 키 삭제 | 검색광고 3개 항목만 지운다(다른 비밀 항목 보존). 환경변수가 있으면 여전히 연결됨 → 화면 ".env에서 빼 주세요" |
| 환경변수 3개 중 일부만 | 환경변수는 무시되고 파일 값을 본다 |
| 확인 호출 타임아웃 | 20초 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `getSearchAdKeys`(환경변수 우선, `fromEnv`), `saveSearchAdKeys`(자기 항목만 교체) | | `blog-writer:server/secrets.ts:58-79` |
| 서버 API | `GET/PUT/DELETE /api/searchad`: 확인 후 저장, 힌트만 반환 | | `blog-writer:server/routes/settings.ts:91-119` |
| 서버 | `sign`, `call`(헤더·오류 문구), `testSearchAd` | | `blog-writer:server/searchad.ts:29-30`, `:79-107` |
| 화면 | "네이버 검색광고 API 설정" 카드: 3칸 입력, 연결 확인 후 저장/새 키로 바꾸기, 키 삭제, `.env` 안내 | 설정 화면 안에서 `<SearchAdSettings />` | `blog-writer:src/SearchAdSettings.tsx:6-79`, `blog-writer:src/SettingsPanel.tsx:252` |
| 키워드 탐색 화면 | 미연결이면 안내와 "설정에서 연결하기", 검색 버튼 비활성 | | `blog-writer:src/Keywords.tsx:37-39`, `:144-149`, `:159` |
| 테스트 | 401이면 저장 안 함, 성공 시 값 비노출·서명 헤더 확인, 삭제, 필드 누락 400 | | `blog-writer:tests/searchad.test.ts:82-102` |
| 프롬프트 | 없음 | | |

## 예외 / 경계값
- 확인 호출은 쓰기 없는 조회라 광고 집행 여부와 무관하게 쓸 수 있다고 화면이 안내한다(실제 계정 동작은 미확인 → [[topic/open-questions]] #5).
- `SEARCHAD_HOST`로 호출 주소를 바꿀 수 있지만 시험용이다(`blog-writer:server/searchad.ts:12-13`).

## 영향받는 플로우
[[topic/flows/키워드 탐색 플로우]]

## 확인 필요
- [[topic/open-questions]] #5

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 (커밋 4ffb5eb). 데이터랩 설정 UI는 별도 컴포넌트(`SearchAdSettings.tsx`)로 분리되어 추가됨 | `blog-writer:server/secrets.ts:58-79` |
