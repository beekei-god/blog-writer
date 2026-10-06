---
type: integration
project: blog-writer
system: 블로그 에디터 (네이버 SmartEditor ONE, 티스토리 TinyMCE)
confidence: high
source:
  - blog-writer:server/browser/blogPost.ts:69-88
  - blog-writer:server/browser/adapters.ts:201-386
  - blog-writer:server/browser/userChrome.ts:349-483
  - blog-writer:server/routes/browser.ts:79-82
updated: 2026-10-07
---
# 블로그 에디터

## 무엇에 쓰나
네이버·티스토리에 초안을 넣고 임시저장할 대상. 이 두 블로그는 API를 쓰지 않고 **글쓰기 화면**을 조작한다. 워드프레스는 화면 조작 경로를 지우고 REST API로 올린다 → [[_system/integrations/wordpress-rest]].

## 플랫폼별 주소와 화면 요소
| 플랫폼 | 글쓰기 주소 | 로그인 주소 / 로그인 감지 | 제목 | 본문 | 이미지 | 태그 | 임시저장 |
|---|---|---|---|---|---|---|---|
| 네이버 | `https://blog.naver.com/<blogId>/postwrite` | `nid.naver.com/nidlogin.login?url=…` / URL에 `nid.naver.com` | `.se-documentTitle` | `.se-component.se-text` (예전엔 `iframe#mainFrame` 안) | 툴바 사진 버튼 `input[type=file]` 또는 파일 paste. **파일 이름이 alt** | 발행 창에만 있음 → 본문 끝 `#태그` 줄 | 상단 "저장"(`save_btn`) |
| 티스토리 | `https://<blogId>.tistory.com/manage/newpost` | `https://www.tistory.com/auth/login` / `accounts.kakao.com`, `tistory.com/auth/login` | `#post-title-inp` | `iframe#editor-tistory_ifr` 안 `body#tinymce` | "첨부 > 사진", alt는 `tinymce.activeEditor.dom.setAttrib` | 하단 `#tagText`에 하나씩 Enter | 하단 "임시저장" |

근거: `blog-writer:server/browser/blogPost.ts:69-88`, `blog-writer:server/routes/browser.ts:79-82`, `blog-writer:server/browser/adapters.ts:201-381`.

삭제된 행 (2026-10-07 갱신에 반영): 워드프레스(`<site>/wp-admin/post-new.php`, Gutenberg 셀렉터, 대표 이미지·태그 패널 조작)는 크롬 경로에서 빠졌다.

## 호출 방식
경로 세 가지 ([[_system/modules/server-browser]]): Claude in Chrome(프롬프트로 위 안내 전달), 평소 크롬 AppleScript(네이버 전용), 앱 전용 크롬 Playwright(네이버·티스토리 어댑터).

## 실패 처리
"이어쓰기" 팝업은 취소(새 글로 시작), 도움말·Welcome Guide 닫기. 저장 버튼을 못 찾으면 사용자가 직접 저장하도록 오류. 자세한 것은 [[publishing/flows/블로그 임시저장 플로우]].

## 바깥 변화에 취약한 지점
위 표의 셀렉터·버튼 이름·한국어/영어 관리자 화면 문구 전부. 어댑터 파일 주석도 "블로그 UI 개편으로 바뀔 수 있으니 실패하면 이 파일만 고치면 된다"고 적고 있다 (`blog-writer:server/browser/adapters.ts:10-13`).

## 관련 규칙과 흐름
[[publishing/business-rules/BR-PUB-005 썸네일 위치]], [[publishing/business-rules/BR-PUB-006 태그 입력 위치]], [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]]
