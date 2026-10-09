---
type: integration
project: blog-writer
system: 블로그 에디터 (네이버 SmartEditor ONE, 티스토리 TinyMCE)
confidence: medium
source:
  - blog-writer:server/browser/blogPost.ts:62-81
  - blog-writer:server/browser/adapters.ts:223-433
  - blog-writer:server/browser/userChrome.ts:367-534
  - blog-writer:server/routes/browser.ts:79-82
  - blog-writer:server/browser/publish.ts:1-367
  - blog-writer:server/browser/category.ts:1-264
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

글쓰기 주소는 세 경로가 `writeUrl`(`blog-writer:server/browser/postHtml.ts:22-24`) 하나를 쓴다. 근거: `blog-writer:server/browser/blogPost.ts:62-81`, `blog-writer:server/routes/browser.ts:79-82`, `blog-writer:server/browser/adapters.ts:223-411`.

삭제된 행 (2026-10-07 갱신에 반영): 워드프레스(`<site>/wp-admin/post-new.php`, Gutenberg 셀렉터, 대표 이미지·태그 패널 조작)는 크롬 경로에서 빠졌다.

## 발행 창 (예약발행·자동발행, 2026-10-09)
늘 임시저장을 먼저 끝낸 뒤 발행 창을 연다. 발행 창은 클래스 이름이 자주 바뀌어 **화면 글자**로 찾는다: "공개" 글자와 끝이 "발행"인 버튼을 함께 가진 가장 작은 보이는 상자 (`blog-writer:server/browser/publish.ts:90-149`).

| 플랫폼 | 발행 창 열기 | 공개 설정 | 시간 | 예약 단위 | 마지막 버튼 | 발행 확인 |
|---|---|---|---|---|---|---|
| 네이버 | 상단 `button[class*="publish_btn"]` 또는 "발행" | (공개 설정은 바꾸지 않음) | "예약"(날짜 칸이 보일 때까지) 또는 "현재"(없으면 넘어감) | 10분 (`NAVER_MINUTE_STEP`) | 창 안 `confirm_btn` 또는 마지막 "발행" 버튼 | 주소가 `postwrite`·`GoBlogWrite`·`Redirect=Write`를 벗어남 |
| 티스토리 | `#publish-layer-btn` 또는 하단 "완료" | "공개" | "예약" 또는 "현재" | 1분 | `#publish-btn` 또는 마지막 "(공개\|예약) 발행" 버튼 | 주소가 `manage/newpost`·`manage/post/`를 벗어남 |

근거: `blog-writer:server/browser/publish.ts:231-273`.

- 예약 날짜·시각은 한국 시간(`kstParts`)으로 넣는다. 날짜 칸이 읽기 전용이면 달력(`calendar`/`datepicker`/`role=grid`)을 다음 달로 넘겨 날짜를 누르고, 시·분은 select/input을 이름(hour/minute/시/분) 또는 보이는 순서로 찾는다. 넣은 뒤 다시 읽어 요청과 같을 때만 마지막 버튼을 누른다 (`blog-writer:server/browser/publish.ts:153-208`).
- 실행 경로: 평소 크롬은 AppleScript `runJs`로, 앱 전용 크롬은 Playwright `evaluate`로(네이버 에디터가 `#mainFrame` 안이면 그 프레임에서) 같은 단계를 실행한다. Claude in Chrome은 단계 코드를 쓰지 않고 프롬프트(`publishPrompt`)로 같은 순서를 지시한다 → [[_system/integrations/claude-in-chrome]].
- 실패하면 `PublishStepError`: 글은 임시저장된 채로 남고 작업 상태는 "블로그 임시저장 완료", 이유는 `job.error`. 발행 버튼을 누른 뒤 확인만 실패하면 "발행됐는지 확인하지 못했습니다. 블로그에서 직접 확인하세요"로 알린다.
- **실제 네이버·티스토리 발행 창에서는 아직 시험하지 않았다.** 모의 발행 창과 단위 테스트(`tests/publish.test.ts`)로만 확인했다 → [[_system/known-issues]].

## 카테고리·주제 (2026-10-09)
올릴 때마다 글 화면에서 카테고리를 고른다(`category: {id?, name}`) → [[_system/api]]. 네이버·티스토리는 에디터에서 **이름으로** 고르고, 목록은 "목록 불러오기"로 에디터에서 읽어 `data/categories.json`에 저장한다 → [[_system/data-storage]].

| 항목 | 네이버 | 티스토리 |
|---|---|---|
| 카테고리 고르는 곳 | **발행 창에서만** (임시저장에는 적용 안 됨, 화면에 안내) — `naverStepsWithOptions`가 발행 창을 연 바로 뒤에 단계를 끼움 (`blog-writer:server/browser/category.ts:243-250`) | 임시저장하기 **전에** 에디터 위쪽 칸에서 (`chooseCategory`, 모든 방식, `blog-writer:server/browser/adapters.ts:38-43`) |
| 주제(topic) | 있음. 예약·자동발행일 때만 Claude가 고정 목록에서 골라 발행 창에서 지정 | 없음 |
| 목록 읽기 | `readNaverCategories`(평소 크롬 AppleScript, macOS만) → [[_system/integrations/chrome-applescript]] | `readTistoryCategories`(앱 전용 크롬 Playwright) → [[_system/integrations/playwright-chrome]] |

- **휴리스틱 찾기**: 클래스 이름이 아니라 화면 글자("카테고리"/"주제")와 모양으로 찾는다 — `<select>`(이름·id·라벨에 글자), 글자를 가진 버튼·콤보박스, 글자만 있으면 가까운 부모 3단계 안의 선택 상자·버튼 (`blog-writer:server/browser/category.ts:12-40`). 목록은 누르기 전과 후의 화면 글자를 비교해 새로 나타난 짧은 글자(40자 이하)를 항목으로 본다. 고를 때는 목록이 뜬 뒤 같은 이름의 가장 안쪽 항목을 누르고, 새 글자는 떴는데 몇 번을 봐도 이름이 없으면 "목록에 없습니다" (`blog-writer:server/browser/category.ts:122-160`).
- **주제 팝업이 발행 창을 바꾼다**: 네이버에서 주제 칸을 누르면 발행 창이 주제 팝업으로 바뀌고, 이름을 고른 뒤 팝업의 "확인"을 누르면 발행 창으로 돌아온다. 그래서 `selectTopicSteps`는 한 단계 안에서 phase(칸 누르기 → 이름 고르기 → 확인 → 팝업이 닫히고 발행 창이 돌아올 때까지)로 진행하고, 발행 창(`layer()`)은 첫 단계와 마지막 단계에서만 본다 (`blog-writer:server/browser/category.ts:181-235`). 이 흐름은 사용자 설명 기준이다.
- **못 골라도 멈추지 않는다**(`optional`): 이유와 그 순간의 화면 구조를 진행 로그에 남기고 "확인 필요"로 이어가며, 주제 팝업은 정리 스크립트(`cleanupJs`: 팝업의 "취소"·"닫기" 또는 Esc)로 닫는다. 카테고리를 못 고르면 블로그 기본 카테고리로 올라간다 (`blog-writer:server/browser/publish.ts:285-293`).
- 보이는 요소 판별을 `offsetParent`에서 `getClientRects().length>0 && visibility!=='hidden'`으로 바꿨다(position:fixed 팝업이 안 보이던 문제).
- **실제 네이버·티스토리 화면에서는 아직 검증하지 않았다**(특히 네이버 주제 팝업과 카테고리 드롭다운). 모의 화면과 단위 테스트(`tests/categories.test.ts`)로만 확인 → [[_system/known-issues]].

## 호출 방식
경로 세 가지 ([[_system/modules/server-browser]]): Claude in Chrome(프롬프트로 위 안내 전달), 평소 크롬 AppleScript(네이버 전용), 앱 전용 크롬 Playwright(네이버·티스토리 어댑터).

## 실패 처리
"이어쓰기" 팝업은 취소(새 글로 시작), 도움말·Welcome Guide 닫기. 저장 버튼을 못 찾으면 사용자가 직접 저장하도록 오류. 자세한 것은 [[publishing/flows/블로그 임시저장 플로우]].

## 바깥 변화에 취약한 지점
위 표의 셀렉터·버튼 이름·한국어/영어 관리자 화면 문구 전부. 카테고리·주제 칸은 "카테고리"/"주제" 글자와 모양에 기대는 휴리스틱이라 에디터 개편이나 영어 화면에서 못 찾을 수 있다(못 찾으면 읽기는 화면 구조와 함께 오류, 올릴 때는 기본 카테고리로 올리고 "확인 필요"). 발행 창 단계는 "발행"·"공개"·"예약"·"현재"·"완료" 같은 화면 글자와 달력·시각 칸 구조에 기대므로 화면 개편이나 영어 화면에서 멈출 수 있다 (멈추면 발행하지 않고, 그 순간의 발행 창 구조를 진행 로그에 남긴다). 어댑터 파일 주석도 "블로그 UI 개편으로 바뀔 수 있으니 실패하면 이 파일만 고치면 된다"고 적고 있다 (`blog-writer:server/browser/adapters.ts:13-16`).

## 관련 규칙과 흐름
[[publishing/business-rules/BR-PUB-005 썸네일 위치]], [[publishing/business-rules/BR-PUB-006 태그 입력 위치]], [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]], [[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치]]
