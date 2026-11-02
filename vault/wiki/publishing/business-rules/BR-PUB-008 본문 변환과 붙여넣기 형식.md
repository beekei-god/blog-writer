---
type: business-rule
domain: publishing
id: BR-PUB-008
name: 본문 변환과 붙여넣기 형식
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/postHtml.ts:1-66
  - blog-writer:server/browser/postHtml.ts
  - blog-writer:server/browser/blogPost.ts:buildSegments
entities: [글 블록]
updated: 2026-11-02
---
# BR-PUB-008 본문 변환과 붙여넣기 형식

## 규칙
네이버·티스토리 에디터에는 글을 **HTML 붙여넣기 조각**과 **이미지 파일**을 순서대로 나눈 목록으로 넣는다(에디터가 소제목·목록·표·굵게를 자기 서식으로 바꿔 주므로 한 글자씩 치는 것보다 빠르고 정확하다). 연속한 텍스트 블록은 한 조각으로 합친다. 소제목은 `<h3>`로 붙이고 소제목마다 위에 빈 줄 한 줄을 넣는다(글 맨 처음 제외). 본문 첫 이미지는 대표 이미지가 되므로 썸네일을 맨 앞에 둔다. 파일이 없는 이미지 블록은 건너뛰고 "확인 필요"에 적는다. 네이버는 태그를 발행 창에서만 넣을 수 있어 본문 끝에 빈 줄 3개 뒤 `#태그` 한 줄로 넣는다(태그의 공백은 제거, 최대 30개). 장소 블록은 이름·주소·지도 링크 카드로 바뀐다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 굵게 `**…**` | `<strong>` |
| URL 문자열 | 링크로 바꿈(`linkify`) |
| 표 | 헤더 배경 `#eef1f6`, 테두리 `#d5dae3`인 표 HTML |
| 이미지 파일명 | 대체 텍스트로 만든 파일명(`altFileName`)으로 올림 |
| 워드프레스 | 같은 블록 목록을 Gutenberg 마크업으로 변환 → [[publishing/business-rules/BR-PUB-006 워드프레스 등록 규칙]] |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `rich`, `tableHtml`, `placeHtml`, `BLANK_LINE`, `TAG_GAP_LINES`, `tagLine` | HTML 조각 | `blog-writer:shared/postHtml.ts` |
| 서버 | `pasteBlockHtml`, `altFileName`, `writeUrl` | 헤딩 태그·주소 | `blog-writer:server/browser/postHtml.ts` |
| 서버 | `buildSegments` | 조각·이미지 순서, 태그 줄 | `blog-writer:server/browser/blogPost.ts` |
| 서버 | 평소 크롬 | 같은 변환 + 이미지 파일 입력 | `blog-writer:server/browser/userChrome.ts` |
| 화면 | 미리보기·복사 | 같은 공용 함수 | [[_system/modules/web-job]] |
| 테스트 | 장소 HTML 포함 | | `blog-writer:tests/place.test.ts:24` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 형식을 바꾸면 공용 `postHtml.ts`와 서버 `buildSegments`, 평소 크롬 경로, 워드프레스 변환, 화면 미리보기를 함께 본다. → [[writing/business-rules/BR-WRT-013 글 구조와 문단 형식]]

## 영향받는 플로우
[[publishing/flows/블로그에 올리기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
