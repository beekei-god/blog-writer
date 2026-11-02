---
type: system-configuration
project: blog-writer
source:
  - blog-writer:.env.example
  - blog-writer:server/store.ts:1-60
  - blog-writer:server/secrets.ts:1-113
  - blog-writer:vite.config.ts
updated: 2026-11-02
---
# 설정

값은 적지 않고 **키 이름과 용도**만 적는다. `.env`와 `data/secrets.json`은 읽지 않는다.

## 환경 변수 (`.env`, 모두 선택)
| 키 | 용도 |
|---|---|
| `PORT` | 서버 포트(기본 5172) |
| `CLAUDE_MODEL` | 모델 선택이 `default`일 때 쓸 별칭 → [[usage/business-rules/BR-USG-001 단계별 모델 선택]] |
| `CLAUDE_BIN` | `claude` 실행 파일 경로 |
| `CHROME_PATH` | Playwright가 쓸 크롬 경로 |
| `DOWNLOADS_DIR` | 크롬이 받은 이미지를 가져올 다운로드 폴더 → [[image/business-rules/BR-IMG-004 API와 크롬 생성 방법]] |
| `BLOG_WRITER_DATA_DIR` | 데이터 폴더 위치 바꾸기(테스트·가짜 데이터용) |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | 이미지 API 키(설정 화면에서도 가능, `.env` 값이 우선) |
| `GEMINI_IMAGE_MODEL`, `OPENAI_IMAGE_MODEL` | 이미지 모델 이름 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 데이터랩(NCP API HUB) 키 |
| `SEARCHAD_CUSTOMER_ID`, `SEARCHAD_API_KEY`, `SEARCHAD_SECRET_KEY` | 검색광고 키 |
| 시험용 | `SEARCHAD_HOST`, `SEARCHAD_GAP_MS`, `TRENDS_URL`, `BW_HEADLESS` |

## 설정 파일 (`data/settings.json`)
이미지 옵션 기본값, 글쓰기 옵션 기본값, 단계별 모델, 블로그별 ID/주소(`naverBlogId`, `tistoryBlogId`, `wordpressUrl`). 읽을 때 기본값과 병합하고 예전 필드(마우스 속도, 워드프레스 기본 카테고리, 기본 블로그)는 버리거나 옮긴다.

## 비밀 (`data/secrets.json`, 권한 0600)
`naverClientId/Secret`, `wpUsername/wpAppPassword`, `geminiApiKey`, `openaiApiKey`, `searchAdCustomerId/ApiKey/SecretKey`. 한 파일이라 저장할 때 항상 기존 내용을 읽어 합친 뒤 자기 항목만 바꾼다. 예전 `wpcom*` 값은 더 쓰지 않고 워드프레스 연결을 저장·삭제할 때 같이 지운다. 화면으로는 키 값을 돌려주지 않는다.

## 개발 서버
Vite가 5173에서 `/api`를 `127.0.0.1:5172`로 프록시한다. `npm run dev`(서버 `tsx watch` + vite), `npm start`(서버만), `npm test`(vitest), `npm run typecheck`.
