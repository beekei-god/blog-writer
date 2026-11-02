---
type: index
updated: 2026-11-02
---
# blog-writer wiki

기능을 추가하거나 고치기 전에 여기서 시작한다. 코드가 기준이고 이 wiki는 코드를 읽고 만든 요약이다.

## 시작점
- 기능을 추가하려면: [[_system/extending]] (새 블로그, 새 이미지 AI, 글쓰기 옵션, 규칙, Claude 단계, API, 외부 서비스)
- 전체 그림: [[_system/overview]] · [[_system/architecture]] · [[_system/api]] · [[_system/data-storage]] · [[_system/configuration]] · [[_system/operations]]
- 알려진 문제: [[_system/known-issues]]
- 용어: [[glossary]] · 코드 위치 지도: [[_registry]] · 기록: [[log]]

## 도메인
| 도메인 | 다루는 것 |
|---|---|
| [[writing/index]] | 글 작성: 분량·말투·키워드·제목·사실 확인·장소·고치기 |
| [[image/index]] | 이미지: 개수·스타일·썸네일·생성 방법·실패 처리 |
| [[publishing/index]] | 블로그 등록: 네이버·티스토리·워드프레스, 예약, 상태 |
| [[topic/index]] | 주제 추천·키워드 탐색 |
| [[usage/index]] | Claude 모델 선택·호출·사용량·로그인 |

## 시스템
모듈: [[_system/modules/project-root]], [[_system/modules/server-core]], [[_system/modules/server-pipeline]], [[_system/modules/server-claude]], [[_system/modules/server-images]], [[_system/modules/server-browser]], [[_system/modules/server-wordpress]], [[_system/modules/server-recommend]], [[_system/modules/server-routes]], [[_system/modules/shared]], [[_system/modules/web-app]], [[_system/modules/web-job]], [[_system/modules/web-screens]], [[_system/modules/tests]]

연동: [[_system/integrations/claude-cli]], [[_system/integrations/claude-in-chrome]], [[_system/integrations/chrome-applescript]], [[_system/integrations/playwright-chrome]], [[_system/integrations/blog-editors]], [[_system/integrations/wordpress-rest]], [[_system/integrations/image-api]], [[_system/integrations/gemini-chatgpt-web]], [[_system/integrations/naver-search]], [[_system/integrations/naver-datalab]], [[_system/integrations/naver-searchad]], [[_system/integrations/google-trends]]
