---
type: system-operations
project: blog-writer
source:
  - blog-writer:package.json
  - blog-writer:server/index.ts:1-11
  - blog-writer:tests/setup.ts
updated: 2026-11-02
---
# 운영

## 실행
| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 서버(`tsx watch server/index.ts`)와 화면(vite)을 함께 |
| `npm start` | 서버만 |
| `npm run build` | 화면 빌드(vite) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | vitest. 임시 데이터 폴더를 쓰므로 실제 `data/`를 건드리지 않는다(`tests/setup.ts`) |

변경 후 항상 `npx tsc --noEmit`과 `npm test`를 돌린다(프로젝트 지침).

## 서버 시작 순서
`.env` 로드 → 진행 중이던 작업 복구 → 추천 복구 → 90일 지난 사용량 정리 → 127.0.0.1에 listen.

## 선행 조건
- `claude` CLI 설치와 로그인(없으면 "Claude Code를 설치하고 로그인했는지 확인하세요")
- 크롬. 블로그 작성은 Claude in Chrome 확장, 평소 크롬 방식은 macOS + "Apple Events의 자바스크립트 허용" → [[publishing/business-rules/BR-PUB-005 크롬 방식 선택과 막힌 사이트]]
- 선택: 이미지 API 키, 데이터랩/검색광고 키, 워드프레스 Application Password

## 확인용 실행
비밀·내 데이터를 건드리지 않으려면 `BLOG_WRITER_DATA_DIR`을 임시 폴더로 지정해 가짜 데이터 앱을 따로 띄운다.

## 로그
작업 진행은 작업 파일의 `logs`에 쌓이고 콘솔에도 `[id 앞 8자] 메시지`로 찍힌다. 발행 창에서 멈추면 화면 구조가 로그에 남는다 → [[publishing/business-rules/BR-PUB-004 임시저장 우선과 발행 단계 실패]]
