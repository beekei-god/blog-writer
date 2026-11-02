---
type: module
project: blog-writer
module: project-root
paths: [package.json, vite.config.ts, tsconfig.json, .env.example, rules/**, README.md]
source:
  - blog-writer:package.json
  - blog-writer:vite.config.ts
  - blog-writer:.env.example
  - blog-writer:rules/default-writing-rules.md
updated: 2026-11-02
---
# 프로젝트 루트

## 역할
빌드·실행 설정과 기본 글쓰기 규칙 문서.

## 주요 파일과 export
- `package.json`: ESM, 스크립트 dev/build/typecheck/test/start, 의존성 express 5, react 19, zod 4, playwright-core, dotenv
- `vite.config.ts`: 포트 5173, `/api` → 5172 프록시
- `rules/default-writing-rules.md`: 기본 글쓰기 규칙 → [[writing/business-rules/BR-WRT-009 글쓰기 규칙 문서와 작업별 사본]]
- `.env.example`: 환경 변수 키 목록 → [[_system/configuration]]

## 의존하는 모듈 / 쓰이는 곳
서버는 `tsx`로 직접 실행(빌드 없음). 화면만 vite로 빌드.

## 주의할 점
- `data/`, `.env`는 git 제외. `vault/wiki/_snapshot.json`도 제외.
