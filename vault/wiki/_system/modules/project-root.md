---
type: module
project: blog-writer
module: project-root
paths: [README.md, package.json, tsconfig.json, vite.config.ts, index.html, public/favicon.svg, .env.example, .gitignore, rules/default-writing-rules.md]
source:
  - blog-writer:README.md:1-274
  - blog-writer:package.json:1-33
  - blog-writer:rules/default-writing-rules.md:1-79
updated: 2026-10-07
---
# project-root 모듈

## 책임
프로젝트 설명, 빌드·실행 설정, 기본 글쓰기 규칙.

## 파일
| 파일 | 줄 | 역할 | 관련 페이지 |
|---|---|---|---|
| `README.md` | 274 | 처음 쓰는 사람용 단계별 안내: 준비물·설치와 실행·첫 설정·글 쓰는 법·화면별 안내·블로그별 등록·이미지·Claude 호출과 모델·문제 해결·데이터와 보안·개발자 정보 | [[_system/overview]], [[_system/operations]] |
| `package.json` | 33 | 스크립트(`dev`, `build`, `typecheck`, `test`, `start`)와 의존성 (테스트: vitest) | [[_system/operations]] |
| `tsconfig.json` | 15 | 단순 파일: TS 설정 (ES2022, bundler, strict, noEmit, `server`·`src`·`shared`·`tests` 포함) | |
| `vite.config.ts` | 10 | 단순 파일: React 플러그인, 포트 5173, `/api` → `http://127.0.0.1:5172` 프록시 (`localhost`는 IPv6로 풀려 다른 프로그램에 붙을 수 있어 IPv4로 고정) | [[_system/architecture]] |
| `index.html` | 13 | 단순 파일: SPA 진입 HTML (`/src/main.tsx`), 파비콘 링크 | |
| `public/favicon.svg` | 8 | 단순 파일: 브라우저 탭 아이콘 | |
| `.env.example` | 4 | `PORT`, `CLAUDE_MODEL` 예시 | [[_system/configuration]] |
| `.gitignore` | 4 | 단순 파일: `node_modules`, `dist`, `.env`, `data/` 제외 | |
| `rules/default-writing-rules.md` | 79 | 기본 글쓰기 규칙 6개 장: 쉬운 문장, 존댓말, SEO, 태그, 확인된 내용만, 소제목·섹션 구성 | [[writing/entities/글쓰기 규칙]] |

## 주의할 점
- 기본 규칙 문서는 "채팅 답변"·"사용자에게 안내" 같은 대화형 표현을 쓰고, 글 작성 프롬프트가 이를 "본문에 넣지 말고 omittedItems로"로 바꿔 해석한다 (`blog-writer:server/writer.ts:26`).
