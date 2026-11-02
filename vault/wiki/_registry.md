---
type: registry
updated: 2026-11-02
---
# 레지스트리

## 프로젝트
| 프로젝트 | 경로 | wiki | 마지막 분석 커밋 | 분석일 |
|---|---|---|---|---|
| blog-writer | `.` | `vault/wiki` | 9a38c08 | 2026-11-02 |

## 모듈
| 모듈 | 경로 | 페이지 |
|---|---|---|
| project-root | 루트 설정·`rules/` | [[_system/modules/project-root]] |
| server-core | `server/{app,index,store,secrets,schema,fsutil,cancel,rules,experience}.ts` | [[_system/modules/server-core]] |
| server-pipeline | `server/{pipeline,writer,editPost,titles,titleGuide,research}.ts` | [[_system/modules/server-pipeline]] |
| server-claude | `server/{claude,claudeAuth,usage}.ts` | [[_system/modules/server-claude]] |
| server-images | `server/images/**` | [[_system/modules/server-images]] |
| server-browser | `server/browser/**`, `server/categories.ts`, `server/naverTopic.ts` | [[_system/modules/server-browser]] |
| server-wordpress | `server/wordpress.ts` | [[_system/modules/server-wordpress]] |
| server-recommend | `server/{recommend,naver,datalab,searchad,trends,explore}.ts` | [[_system/modules/server-recommend]] |
| server-routes | `server/routes/**` | [[_system/modules/server-routes]] |
| shared | `shared/**` | [[_system/modules/shared]] |
| web-app | `src/*.ts(x)` 뼈대 | [[_system/modules/web-app]] |
| web-job | `src/job/**` | [[_system/modules/web-job]] |
| web-screens | `src/` 탭 화면 | [[_system/modules/web-screens]] |
| tests | `tests/**` | [[_system/modules/tests]] |

## 도메인
| 도메인 | 약어 | 규칙 | 시작점 |
|---|---|---|---|
| writing (글 작성) | WRT | 001–013 | [[writing/index]] |
| image (이미지) | IMG | 001–011 | [[image/index]] |
| publishing (블로그 등록) | PUB | 001–009 | [[publishing/index]] |
| topic (주제 추천) | TOP | 001–007 | [[topic/index]] |
| usage (Claude 모델·사용량) | USG | 001–006 | [[usage/index]] |

## 코드 ↔ 도메인 매핑
매핑은 이 표에만 둔다. `wiki_tool.py changes`가 이 표의 백틱 경로로 영향받는 도메인을 찾는다.

| 도메인 | 프로젝트 | 경로 패턴 | 확인 |
|---|---|---|---|
| writing | blog-writer | `server/writer.ts`, `server/editPost.ts`, `server/titles.ts`, `server/titleGuide.ts`, `server/research.ts`, `server/rules.ts`, `server/experience.ts`, `shared/length.ts`, `shared/keywords.ts`, `shared/tone.ts`, `shared/place.ts`, `shared/blockDiff.ts`, `rules/default-writing-rules.md`, `src/NewJob.tsx`, `src/WritingPicker.tsx`, `src/RulesEditor.tsx`, `src/Sentences.tsx`, `src/job/PostEditor.tsx`, `src/job/TitlePicker.tsx`, `src/job/EditByPrompt.tsx`, `server/routes/edit.ts` | 읽음 |
| image | blog-writer | `server/images/`, `shared/imageErrors.ts`, `src/job/images.tsx`, `src/ImageApiSettings.tsx`, `server/routes/images.ts` | 읽음 |
| publishing | blog-writer | `server/browser/`, `server/wordpress.ts`, `server/categories.ts`, `server/naverTopic.ts`, `shared/blogStatus.ts`, `shared/postHtml.ts`, `src/job/NextStep.tsx`, `src/job/Preview.tsx`, `src/ExtensionStatus.tsx`, `src/LoginWindow.tsx`, `server/routes/browser.ts`, `server/routes/categories.ts` | 읽음 |
| topic | blog-writer | `server/recommend.ts`, `server/naver.ts`, `server/datalab.ts`, `server/searchad.ts`, `server/trends.ts`, `server/explore.ts`, `src/Recommend.tsx`, `src/Keywords.tsx`, `src/SearchAdSettings.tsx`, `server/routes/recommendations.ts`, `server/routes/keywords.ts` | 읽음 |
| usage | blog-writer | `server/claude.ts`, `server/claudeAuth.ts`, `server/usage.ts`, `src/Usage.tsx`, `src/ClaudeAuth.tsx`, `server/routes/usage.ts`, `server/routes/claudeAuth.ts` | 읽음 |
| (공통 흐름) | blog-writer | `server/pipeline.ts`, `server/store.ts`, `server/schema.ts`, `shared/types.ts`, `server/routes/jobs.ts`, `server/routes/settings.ts`, `src/job/JobDetail.tsx`, `src/App.tsx`, `src/api.ts`, `src/SettingsPanel.tsx` | 여러 도메인에 걸침 — 바뀐 함수로 도메인 판단 |

## 제외한 경로
`node_modules/`, `dist/`, `data/`(내 데이터·비밀), `.env`, `vault/`.

## 읽지 않은 범위
- `src/styles.css`(스타일), 화면 컴포넌트의 세부 마크업은 규칙에 영향이 적어 훑기만 했다.
