---
type: business-rule
domain: topic
id: BR-TOP-006
name: 데이터랩 키 확인과 우선순위
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/secrets.ts:7-59
  - blog-writer:server/routes/settings.ts:61-89
  - blog-writer:server/datalab.ts:51-55
  - blog-writer:src/SettingsPanel.tsx:107-162
  - blog-writer:src/SettingsPanel.tsx:264-290
updated: 2026-10-07
---
# BR-TOP-006 데이터랩 키 확인과 우선순위

## 규칙
데이터랩 키는 저장하기 전에 실제로 한 번 호출해 맞는지 확인한다. 값은 이 컴퓨터에만 저장하고 화면으로 돌려주지 않는다(Client ID 앞 4자만). 환경변수 `NAVER_CLIENT_ID`·`NAVER_CLIENT_SECRET`이 둘 다 있으면 파일보다 우선한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| ID·Secret 중 빈 값 | 400 "Client ID와 Client Secret을 모두 입력하세요." |
| 확인 호출 실패 | 400 + 원인 메시지(401/403/429 등), 저장 안 함 |
| 성공 | `data/secrets.json`(0600)에 저장, `{configured: true, clientIdHint: "abcd…"}` |
| 키 삭제 | 비밀 파일에서 네이버 키 항목만 지운다 (같은 파일의 워드프레스 연결 정보는 남김). 환경변수 키가 있으면 여전히 연결됨 → 화면 "….env에서 빼 주세요." |
| 저장·삭제가 겹침 | 비밀 파일 쓰기를 하나씩 줄 세워(읽기-합치기-쓰기) 다른 항목을 지우지 않음 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `getNaverKeys`(환경변수 우선), `saveNaverKeys`(자기 항목만 바꿔 합침, `serialQueue` + `writeJsonAtomic` 0600) | `blog-writer:server/secrets.ts:36-59` |
| 서버 API | 확인 후 저장, 힌트만 반환 | `blog-writer:server/routes/settings.ts:61-89` |
| 서버 | `testDatalab`: 최근 7일 "날씨" | `blog-writer:server/datalab.ts:52-55` |
| 화면 | "네이버 데이터랩 설정" 카드: 입력·비밀번호 칸·삭제 안내 | `blog-writer:src/SettingsPanel.tsx:264-290`, `:107-120`, `:149-162` |

## 영향받는 플로우
[[topic/flows/주제 추천 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 비밀 파일에 워드프레스 연결 정보도 함께 저장하게 되어, 키 저장·삭제가 다른 항목을 보존하도록 바뀜. API는 `server/routes/settings.ts`로 이동 | `blog-writer:server/secrets.ts:7-39` |
