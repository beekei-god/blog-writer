---
type: system-overview
project: blog-writer
updated: 2026-11-02
---
# blog-writer 시스템 개요

## 무엇인가
주제를 입력하면 웹 조사 → 글 작성 → 이미지 → 블로그 등록(네이버·티스토리·워드프레스)까지 해 주는 **개인용 로컬 앱**이다. 서버(Express 5, 127.0.0.1:5172)와 화면(React 19 + Vite, :5173)이 한 저장소에 있고, 모든 데이터는 `data/` 폴더의 JSON·이미지 파일이다(DB 없음). 글쓰기에 필요한 Claude는 이 컴퓨터에 로그인된 `claude` CLI를 호출한다(구독 한도, API 키 불필요).

## 도메인 (업무 영역)
| 도메인 | 하는 일 | 개요 |
|---|---|---|
| writing | 조사·글·제목·태그·고치기 | [[writing/overview]] |
| image | 본문 이미지·썸네일 | [[image/overview]] |
| publishing | 블로그 등록·상태 | [[publishing/overview]] |
| topic | 주제 추천·키워드 탐색 | [[topic/overview]] |
| usage | 모델·사용량·로그인 | [[usage/overview]] |

## 시스템 페이지
- 구조: [[_system/architecture]] · API: [[_system/api]] · 설정: [[_system/configuration]] · 저장소: [[_system/data-storage]]
- 운영: [[_system/operations]] · 알려진 문제: [[_system/known-issues]] · **기능 추가 가이드**: [[_system/extending]]
- 모듈: [[_system/modules/project-root]], [[_system/modules/server-core]], [[_system/modules/server-pipeline]], [[_system/modules/server-claude]], [[_system/modules/server-images]], [[_system/modules/server-browser]], [[_system/modules/server-wordpress]], [[_system/modules/server-recommend]], [[_system/modules/server-routes]], [[_system/modules/shared]], [[_system/modules/web-app]], [[_system/modules/web-job]], [[_system/modules/web-screens]], [[_system/modules/tests]]
- 외부 연동: [[_system/integrations/claude-cli]], [[_system/integrations/claude-in-chrome]], [[_system/integrations/chrome-applescript]], [[_system/integrations/playwright-chrome]], [[_system/integrations/blog-editors]], [[_system/integrations/wordpress-rest]], [[_system/integrations/image-api]], [[_system/integrations/gemini-chatgpt-web]], [[_system/integrations/naver-search]], [[_system/integrations/naver-datalab]], [[_system/integrations/naver-searchad]], [[_system/integrations/google-trends]]
