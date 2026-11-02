---
type: integration
project: blog-writer
name: 블로그 편집기 (네이버·티스토리)
source:
  - blog-writer:server/browser/adapters.ts
  - blog-writer:server/browser/postHtml.ts
  - blog-writer:server/browser/publish.ts
  - blog-writer:server/browser/blogPost.ts
updated: 2026-11-02
---
# 블로그 편집기 (네이버·티스토리)

## 무엇을 위해
글을 각 블로그 글쓰기 화면에 넣는 방법의 차이를 모은 곳.

| 블로그 | 글쓰기 주소 | 입력 방식 |
|---|---|---|
| 네이버 | `blog.naver.com/<ID>/postwrite` | AppleScript 또는 Playwright로 SmartEditor ONE에 붙여넣기 |
| 티스토리 | `<ID>.tistory.com/manage/newpost` | Claude in Chrome(`adapters.ts`가 화면 요소를 안내) |
| 워드프레스 | 편집기를 쓰지 않음 | REST → [[_system/integrations/wordpress-rest]] |

## 공통
- 본문은 `postHtml.ts`가 블로그별 붙여넣기 형식으로 만든다(이미지 대체 이름, 태그 줄, 장소 카드 링크 등) → [[publishing/overview]]
- 카테고리는 `category.ts`로 읽어 `data/categories.json`에 저장한다.
- 예약 발행·공개 범위 같은 올리기 옵션은 `publish.ts`의 단계(steps)로 정의한다.

## 주의
편집기 화면 구조가 바뀌면 이 단계들이 깨진다. 새 블로그를 추가하는 절차는 [[_system/extending]]
모듈: [[_system/modules/server-browser]]
