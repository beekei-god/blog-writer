---
type: registry
vault_path: /Users/kei/Projects/blog-writer/vault
wiki_root: wiki
updated: 2026-10-07
---
# Registry

## 프로젝트
| 이름 | 경로 | 역할/스택 | 마지막 분석 커밋 | 분석일 |
|---|---|---|---|---|
| blog-writer | /Users/kei/Projects/blog-writer | 블로그 초안 자동 작성 로컬 앱: API 서버(Express 5, tsx) + 화면(React 19, Vite). Claude는 로컬 `claude -p` CLI로 호출 | 스냅샷 2026-10-07 01:40 (git 없음, `_snapshot.json` 참고) | 2026-10-07 |

git 저장소가 아니므로 변경 감지는 `_snapshot.json`의 파일 해시로 한다 (`wiki_tool.py changes`).

## 모듈
| 모듈 | 경로 | 페이지 |
|---|---|---|
| server-routes | `server/index.ts`, `server/app.ts`, `server/routes/**` | [[_system/modules/server-routes]] |
| server-core | `server/store.ts`, `server/fsutil.ts`, `server/cancel.ts`, `server/rules.ts`, `server/secrets.ts` | [[_system/modules/server-core]] |
| server-wordpress | `server/wordpress.ts` | [[_system/modules/server-wordpress]] |
| server-pipeline | `server/pipeline.ts`, `server/research.ts`, `server/writer.ts`, `server/schema.ts`, `server/naver.ts` | [[_system/modules/server-pipeline]] |
| server-claude | `server/claude.ts`, `server/usage.ts` | [[_system/modules/server-claude]] |
| server-recommend | `server/recommend.ts`, `server/datalab.ts` | [[_system/modules/server-recommend]] |
| server-images | `server/images/**` | [[_system/modules/server-images]] |
| server-browser | `server/browser/**` | [[_system/modules/server-browser]] |
| shared | `shared/**` | [[_system/modules/shared]] |
| web-app | `src/App.tsx`, `src/main.tsx`, `src/api.ts`, `src/labels.ts`, `src/leaveGuard.ts`, `src/vite-env.d.ts`, `src/styles.css` | [[_system/modules/web-app]] |
| web-job | `src/job/**` | [[_system/modules/web-job]] |
| web-screens | `src/NewJob.tsx`, `src/Recommend.tsx`, `src/RulesEditor.tsx`, `src/SettingsPanel.tsx`, `src/Usage.tsx`, `src/BlockedSites.tsx`, `src/ExtensionStatus.tsx`, `src/LoginWindow.tsx` | [[_system/modules/web-screens]] |
| project-root | `README.md`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `public/favicon.svg`, `.env.example`, `.gitignore`, `rules/default-writing-rules.md` | [[_system/modules/project-root]] |
| tests | `tests/**`, `vitest.config.ts` | [[_system/modules/tests]] |

## 도메인
| 슬러그 | 한글명 | 약어 | 상태 |
|---|---|---|---|
| writing | 글 작성 (작업·리서치·초안·글쓰기 규칙·태그) | WRT | 1차 ingest 완료 (2026-10-05) |
| image | 이미지 생성 (썸네일·본문 이미지) | IMG | 1차 ingest 완료 (2026-10-05) |
| publishing | 블로그 등록 (크롬 임시저장·워드프레스 API 등록·블로그별 설정) | PUB | 갱신 (2026-10-07) |
| topic | 주제 추천 (뉴스·통계·데이터랩) | TOP | 1차 ingest 완료 (2026-10-05) |
| usage | Claude 모델·사용량 | USG | 1차 ingest 완료 (2026-10-05) |

## 코드 ↔ 도메인 매핑
| 도메인 | 프로젝트 | 경로 패턴 | 확인 여부 |
|---|---|---|---|
| writing | blog-writer | `server/pipeline.ts`(doDraft·runDraft), `server/research.ts`, `server/writer.ts`, `server/schema.ts`(PostSchema·POST_JSON_SCHEMA), `server/naver.ts`, `server/rules.ts`, `server/store.ts`, `server/fsutil.ts`, `server/cancel.ts`, `server/routes/jobs.ts`, `server/routes/settings.ts`(rules), `shared/length.ts`, `shared/labels.ts`, `shared/types.ts`(Job·Post·Tag), `rules/**`, `src/NewJob.tsx`, `src/job/JobDetail.tsx`·`PostEditor.tsx`·`Report.tsx`·`Progress.tsx`·`Preview.tsx`, `src/RulesEditor.tsx` | 추정 |
| image | blog-writer | `server/images/**`, `shared/imageErrors.ts`, `shared/types.ts`(ImageOptions·ImageSpec·aiFor), `server/schema.ts`(ImageOptionsSchema), `server/pipeline.ts`(runImages·makeImages), `server/routes/images.ts`, `server/routes/jobs.ts`(keepImageResults), `src/job/images.tsx`, `src/NewJob.tsx`(AiRows) | 추정 |
| publishing | blog-writer | `server/browser/**`, `server/wordpress.ts`, `shared/postHtml.ts`, `shared/types.ts`(Settings·blogIdOf·settingsFor·PublishMode·WordPressRecord), `server/pipeline.ts`(runPost·doPost·doWordPressPost), `server/routes/jobs.ts`(post-to-blog·status), `server/routes/browser.ts`, `server/routes/settings.ts`(settings·wordpress), `server/secrets.ts`(워드프레스 인증), `src/job/NextStep.tsx`, `src/BlockedSites.tsx`, `src/LoginWindow.tsx`, `src/ExtensionStatus.tsx`, `src/SettingsPanel.tsx`(블로그별 카드) | 추정 |
| topic | blog-writer | `server/recommend.ts`, `server/datalab.ts`, `server/secrets.ts`, `server/routes/recommendations.ts`, `server/routes/settings.ts`(datalab), `src/Recommend.tsx`, `src/SettingsPanel.tsx`(데이터랩) | 추정 |
| usage | blog-writer | `server/claude.ts`, `server/usage.ts`, `server/routes/usage.ts`, `src/Usage.tsx`, `src/job/JobUsage.tsx`, `src/labels.ts`(모델·단계 문구), `src/SettingsPanel.tsx`(Claude 모델) | 추정 |

한 파일이 여러 도메인에 걸치면(`server/routes/*.ts`, `server/pipeline.ts`, `shared/types.ts`, `src/job/JobDetail.tsx`, `src/SettingsPanel.tsx`) 괄호 안의 함수·부분 기준으로 나눈다.

## 분석 제외 경로
`node_modules`, `dist`, `package-lock.json`, `.env`(존재와 키 이름만 기록), `data/`(런타임 데이터: 작업 기록·이미지·비밀 키·크롬 프로필. 구조는 그것을 읽고 쓰는 코드에서 파악), `vault/`(이 wiki 자신)

## 아직 읽지 않은 범위
- (없음) 2026-10-07 증분 갱신까지 소스 파일 전체를 반영했다. `src/styles.css`는 클래스 구성만 훑었다. 테스트 파일(`tests/**`)은 규칙 근거로도 쓴다.
