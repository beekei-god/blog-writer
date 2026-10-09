---
type: integration
project: blog-writer
system: 네이버 검색광고 API 키워드 도구
confidence: medium
source:
  - blog-writer:server/searchad.ts:1-129
  - blog-writer:server/explore.ts:1-74
  - blog-writer:server/secrets.ts:58-79
  - blog-writer:server/routes/settings.ts:91-119
  - blog-writer:server/routes/keywords.ts:1-25
  - blog-writer:tests/searchad.test.ts:1-124
updated: 2026-10-09
---
# 네이버 검색광고 API 키워드 도구

## 무엇에 쓰나
키워드 탭("키워드 탐색")에서 입력한 키워드의 **연관 키워드와 최근 한 달 월간 검색량(PC·모바일), 경쟁 정도**를 보여 준다. 네이버 기준의 절대 값이다. 경쟁 정도는 광고 입찰 경쟁이라 글 경쟁과는 다르다 (`blog-writer:server/searchad.ts:5-11`, `blog-writer:src/Keywords.tsx:7-13`). 주제 추천이 쓰는 데이터랩([[_system/integrations/naver-datalab]])과는 키·주소·응답이 모두 다른 별개 서비스다. 구글 트렌드와 함께 쓰는 흐름은 [[_system/integrations/google-trends]].

> 상태: 호출·서명·응답 해석은 공식 문서를 보고 쓴 뒤 **가짜 서버 테스트로만** 확인했다. 실제 검색광고 API로 호출해 본 적은 없다 → [[_system/known-issues]] #34. 그래서 `confidence: medium`.

## 호출 방식
- `GET https://api.searchad.naver.com/keywordstool?hintKeywords=<쉼표로 구분>&showDetail=1`, 20초 타임아웃 (`blog-writer:server/searchad.ts:12-15`, `:79-91`). 시험용으로만 환경변수 `SEARCHAD_HOST`로 주소를 바꾼다 ([[_system/configuration]]).
- **인증 방식(값은 적지 않음)**: 헤더 4개 `X-Timestamp`(현재 시각 밀리초), `X-API-KEY`, `X-Customer`(고객 ID), `X-Signature`. 키는 검색광고 계정의 "API 사용 관리"에서 받으며 개발자센터·NCP 키와 다르다 (`blog-writer:server/secrets.ts:58-63`).
- **서명**: `X-Signature = base64(HMAC-SHA256(비밀 키, "<timestamp>.<method>.<uri>"))`, 여기서 method는 `GET`, uri는 `/keywordstool`(쿼리 제외) (`blog-writer:server/searchad.ts:28-30`, `:88`). 고정 값으로 확인하는 테스트가 있다 (`blog-writer:tests/searchad.test.ts:17-20`).
- **한 번에 키워드 5개까지**(`MAX_HINTS`), 키워드 안의 공백은 허용되지 않아 공백을 뺀다 (`:9`, `:67-74`). 5개를 넘으면 5개씩 나눠 차례로 부르고 합친다. 같은 키워드가 여러 번 나오면 검색량이 큰 쪽을 쓴다 (`:109-128`). 입력이 없을 때 구글 트렌드 상위 10개는 그래서 두 번 호출한다.
- 응답 `keywordList[]`의 `relKeyword`, `monthlyPcQcCnt`, `monthlyMobileQcCnt`, `compIdx`(낮음·중간·높음)를 읽는다. 검색량 순 정렬 뒤 **상위 200개**(`MAX_ROWS`)만 화면에 준다 (`:17`, `:44-64`).
- **검색량이 10 미만이면 숫자 대신 `"< 10"`** 이 온다. 코드는 5로 치고 `lowPc`/`lowMobile`로 표시하며 화면은 `<10`으로 보여 준다 (`:32-39`, `blog-writer:shared/types.ts:283-297`, `blog-writer:src/Keywords.tsx:10`). 즉 합계·정렬에 쓰는 5는 실제 값이 아니다(실제는 0~9).
- 호출 수를 세거나 막는 코드는 없다. 429를 받으면 알려 줄 뿐이다 (`:97`).

## 키 관리
- 저장 위치: 환경변수 `SEARCHAD_CUSTOMER_ID`·`SEARCHAD_API_KEY`·`SEARCHAD_SECRET_KEY`가 **셋 다** 있으면 파일보다 우선, 아니면 `data/secrets.json`의 `searchAdCustomerId`·`searchAdApiKey`·`searchAdSecretKey`(권한 0600) (`blog-writer:server/secrets.ts:66-73`).
- 저장 전에 키 확인: "날씨" 하나로 실제 호출해 보고(`testSearchAd`) 성공해야 저장한다. 실패 메시지는 400으로 돌려준다 (`blog-writer:server/searchad.ts:104-107`, `blog-writer:server/routes/settings.ts:97-112`).
- 화면으로는 값을 돌려주지 않는다: `{configured, customerIdHint(고객 ID 앞 3자+…), fromEnv}`만 (`blog-writer:server/routes/settings.ts:91-96`). 삭제는 파일의 키만 지우므로 환경변수 키는 남는다.

## 실패 처리
| 상황 | 메시지·동작 |
|---|---|
| 키 없음 | `exploreKeywords`가 null → `GET /api/keywords`가 400 "먼저 설정에서 네이버 검색광고 API 키를 연결하세요." (`blog-writer:server/routes/keywords.ts:19`) |
| 401·403 | "검색광고 키가 올바르지 않습니다 (<코드>). 고객 ID·API 키·비밀 키를 확인하세요." + 응답 본문 앞 160자 (`blog-writer:server/searchad.ts:94-96`) |
| 429 | "검색광고 API 호출 한도를 넘었습니다 (429). 잠시 뒤에 다시 하세요." (`:97`) |
| 그 밖 | "검색광고 API 오류 <코드>: <본문 앞 200자>" (`:98`) |
| 네트워크 오류 등 | 라우터에서 502 (`SearchAdError`는 400) (`blog-writer:server/routes/keywords.ts:22`) |
위 오류는 키워드 탐색 **전체** 오류다. 입력 없는 탐색에서 구글 트렌드만 실패한 경우와 달리 덩어리별로 나누지 않는다 → [[_system/integrations/google-trends]].

## 바깥 변화에 취약한 지점
- 서명 규칙(`timestamp.method.uri`)·헤더 이름·`/keywordstool` 주소·`showDetail`·`hintKeywords`(최대 5개, 공백 불가) 제약.
- 응답 필드 이름(`relKeyword`, `monthlyPcQcCnt`, `monthlyMobileQcCnt`, `compIdx`)과 값 형식. 숫자 대신 `"< 10"` 문자열이 오는 동작에 기대어 `/<|미만/`으로 판별한다. 형식이 바뀌면 검색량이 0으로 읽힐 수 있다(오류가 나지 않음).
- `compIdx`가 "낮음·중간·높음" 한국어가 아니면 "알 수 없음"으로 보인다.
- 한 번에 5개·1,000개 응답(최대) 같은 문서상 제한. 이 값은 코드에 고정되어 있다.
