---
type: business-rule
domain: publishing
id: BR-PUB-010
name: 이어쓰기 글이 있으면 중단
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/browser/userChrome.ts:383-408
  - blog-writer:server/browser/blogPost.ts:65
  - blog-writer:server/browser/blogPost.ts:75
  - blog-writer:server/browser/adapters.ts:237
  - blog-writer:server/browser/adapters.ts:330
updated: 2026-10-09
---
# BR-PUB-010 이어쓰기 글이 있으면 중단

## 규칙
글쓰기 화면이 "작성 중인 글이 있습니다. 이어서 작성하시겠습니까?"를 물으면 **취소(새 글로 시작)**한다. 그래도 예전에 쓰던 글이 에디터에 남아 있으면 새 글과 섞이지 않도록 멈춘다.

## 조건과 결과
| 경로 | 조건 | 결과 |
|---|---|---|
| 평소 크롬(네이버) | 에디터가 뜬 뒤 6초 동안 "작성 중인 글" 팝업 감시 | 나타나면 "취소" 클릭 |
| 평소 크롬(네이버) | 제목이나 본문 입력 노드에 글자가 있거나 컴포넌트가 3개 이상 | 오류 `editor` "예전에 작성 중이던 글이 불러와져 있어서 멈췄습니다. 크롬에 열린 탭을 닫거나 내용을 지운 뒤 다시 시도하세요" |
| Claude in Chrome | 프롬프트: 이어쓰기 팝업이면 "취소", 티스토리 "저장된 글이 있습니다"면 취소/닫기 | 프롬프트 판단 |
| 자동 조작 | 네이버 `.se-popup-button-cancel` 보이면 클릭, 티스토리 dialog는 모두 dismiss | 남은 글 검사는 없음 |

## 구현 현황
위 source 참고. 남은 글 검사는 평소 크롬 경로에만 있다. 워드프레스는 API로 새 글을 만들거나 기록된 글을 갱신하므로 이 규칙과 관계없다 ([[publishing/business-rules/BR-PUB-016 워드프레스 재등록은 같은 글 갱신]]).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 근거 줄 번호 갱신 (동작 변화 없음) | |
| 2026-10-09 | 근거 줄 번호 갱신 (동작 변화 없음) | 커밋 65bfa3e |
