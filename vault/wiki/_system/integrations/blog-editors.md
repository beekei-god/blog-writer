---
type: integration
project: blog-writer
system: 블로그 에디터 (네이버 SmartEditor ONE, 티스토리 TinyMCE)
confidence: medium
source:
  - blog-writer:server/browser/blogPost.ts:60-79
  - blog-writer:server/browser/adapters.ts:211-399
  - blog-writer:server/browser/userChrome.ts:353-494
  - blog-writer:server/routes/browser.ts:79-82
  - blog-writer:server/browser/publish.ts:1-295
  - blog-writer:server/browser/postHtml.ts:22-24
updated: 2026-10-09
---
# 블로그 에디터

## 무엇에 쓰나
네이버·티스토리에 초안을 넣고 임시저장할 대상. 2026-10-09부터 사용자가 예약발행·자동발행을 고르면 임시저장 뒤 같은 화면의 **발행 창**에서 발행까지 한다. 이 두 블로그는 API를 쓰지 않고 **글쓰기 화면**을 조작한다. 워드프레스는 화면 조작 경로를 지우고 REST API로 올린다 → [[_system/integrations/wordpress-rest]].

## 플랫폼별 주소와 화면 요소
| 플랫폼 | 글쓰기 주소 | 로그인 주소 / 로그인 감지 | 제목 | 본문 | 이미지 | 태그 | 임시저장 |
|---|---|---|---|---|---|---|---|
| 네이버 | `https://blog.naver.com/<blogId>/postwrite` | `nid.naver.com/nidlogin.login?url=…` / URL에 `nid.naver.com` | `.se-documentTitle` | `.se-component.se-text` (예전엔 `iframe#mainFrame` 안) | 툴바 사진 버튼 `input[type=file]` 또는 파일 paste. **파일 이름이 alt** | 발행 창에만 있음 → 본문 끝 `#태그` 줄 | 상단 "저장"(`save_btn`) |
| 티스토리 | `https://<blogId>.tistory.com/manage/newpost` | `https://www.tistory.com/auth/login` / `accounts.kakao.com`, `tistory.com/auth/login` | `#post-title-inp` | `iframe#editor-tistory_ifr` 안 `body#tinymce` | "첨부 > 사진", alt는 `tinymce.activeEditor.dom.setAttrib` | 하단 `#tagText`에 하나씩 Enter | 하단 "임시저장" |

글쓰기 주소는 세 경로가 `writeUrl`(`blog-writer:server/browser/postHtml.ts:22-24`) 하나를 쓴다. 근거: `blog-writer:server/browser/blogPost.ts:60-79`, `blog-writer:server/routes/browser.ts:79-82`, `blog-writer:server/browser/adapters.ts:211-394`.

삭제된 행 (2026-10-07 갱신에 반영): 워드프레스(`<site>/wp-admin/post-new.php`, Gutenberg 셀렉터, 대표 이미지·태그 패널 조작)는 크롬 경로에서 빠졌다.

## 발행 창 (예약발행·자동발행, 2026-10-09)
늘 임시저장을 먼저 끝낸 뒤 발행 창을 연다. 발행 창은 클래스 이름이 자주 바뀌어 **화면 글자**로 찾는다: "공개" 글자와 끝이 "발행"인 버튼을 함께 가진 가장 작은 보이는 상자 (`blog-writer:server/browser/publish.ts:57-108`).

| 플랫폼 | 발행 창 열기 | 공개 설정 | 시간 | 예약 단위 | 마지막 버튼 | 발행 확인 |
|---|---|---|---|---|---|---|
| 네이버 | 상단 `button[class*="publish_btn"]` 또는 "발행" | "전체공개" | "예약"(날짜 칸이 보일 때까지) 또는 "현재"(없으면 넘어감) | 10분 (`NAVER_MINUTE_STEP`) | 창 안 `confirm_btn` 또는 마지막 "발행" 버튼 | 주소가 `postwrite`·`GoBlogWrite`·`Redirect=Write`를 벗어남 |
| 티스토리 | `#publish-layer-btn` 또는 하단 "완료" | "공개" | "예약" 또는 "현재" | 1분 | `#publish-btn` 또는 마지막 "(공개\|예약) 발행" 버튼 | 주소가 `manage/newpost`·`manage/post/`를 벗어남 |

근거: `blog-writer:server/browser/publish.ts:190-230`.

- 예약 날짜·시각은 한국 시간(`kstParts`)으로 넣는다. 날짜 칸이 읽기 전용이면 달력(`calendar`/`datepicker`/`role=grid`)을 다음 달로 넘겨 날짜를 누르고, 시·분은 select/input을 이름(hour/minute/시/분) 또는 보이는 순서로 찾는다. 넣은 뒤 다시 읽어 요청과 같을 때만 마지막 버튼을 누른다 (`blog-writer:server/browser/publish.ts:112-167`).
- 실행 경로: 평소 크롬은 AppleScript `runJs`로, 앱 전용 크롬은 Playwright `evaluate`로(네이버 에디터가 `#mainFrame` 안이면 그 프레임에서) 같은 단계를 실행한다. Claude in Chrome은 단계 코드를 쓰지 않고 프롬프트(`publishPrompt`)로 같은 순서를 지시한다 → [[_system/integrations/claude-in-chrome]].
- 실패하면 `PublishStepError`: 글은 임시저장된 채로 남고 작업 상태는 "블로그 임시저장 완료", 이유는 `job.error`. 발행 버튼을 누른 뒤 확인만 실패하면 "발행됐는지 확인하지 못했습니다. 블로그에서 직접 확인하세요"로 알린다.
- **실제 네이버·티스토리 발행 창에서는 아직 시험하지 않았다.** 모의 발행 창과 단위 테스트(`tests/publish.test.ts`)로만 확인했다 → [[_system/known-issues]].

## 호출 방식
경로 세 가지 ([[_system/modules/server-browser]]): Claude in Chrome(프롬프트로 위 안내 전달), 평소 크롬 AppleScript(네이버 전용), 앱 전용 크롬 Playwright(네이버·티스토리 어댑터).

## 실패 처리
"이어쓰기" 팝업은 취소(새 글로 시작), 도움말·Welcome Guide 닫기. 저장 버튼을 못 찾으면 사용자가 직접 저장하도록 오류. 자세한 것은 [[publishing/flows/블로그 임시저장 플로우]].

## 바깥 변화에 취약한 지점
위 표의 셀렉터·버튼 이름·한국어/영어 관리자 화면 문구 전부. 발행 창 단계는 "발행"·"공개"·"전체공개"·"예약"·"현재"·"완료" 같은 화면 글자와 달력·시각 칸 구조에 기대므로 화면 개편이나 영어 화면에서 멈출 수 있다 (멈추면 발행하지 않는다). 어댑터 파일 주석도 "블로그 UI 개편으로 바뀔 수 있으니 실패하면 이 파일만 고치면 된다"고 적고 있다 (`blog-writer:server/browser/adapters.ts:12-15`).

## 관련 규칙과 흐름
[[publishing/business-rules/BR-PUB-005 썸네일 위치]], [[publishing/business-rules/BR-PUB-006 태그 입력 위치]], [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]], [[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치]]
