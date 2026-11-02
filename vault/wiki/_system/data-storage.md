---
type: system-data
project: blog-writer
source:
  - blog-writer:server/store.ts:1-191
  - blog-writer:server/fsutil.ts:1-49
  - blog-writer:server/usage.ts
  - blog-writer:server/categories.ts
updated: 2026-11-02
---
# 데이터 저장소

DB 없이 `data/`(또는 `BLOG_WRITER_DATA_DIR`) 아래 파일에 둔다. 전부 git에서 제외되며 **읽거나 적지 않는다**(구조만 안다).

| 경로 | 내용 | 코드 |
|---|---|---|
| `data/jobs/<id>.json` | 글 작업 하나 → [[writing/entities/작업]] | `store.ts` |
| `data/images/<작업 id>/` | 생성·업로드한 이미지 파일 | `jobImageDir` |
| `data/settings.json` | 설정 → [[_system/configuration]] | `getSettings` |
| `data/secrets.json` | 비밀 키(0600) | `secrets.ts` |
| `data/writing-rules.md` | 사용자가 고친 글쓰기 규칙 → [[writing/business-rules/BR-WRT-009 글쓰기 규칙 문서와 작업별 사본]] | `rules.ts` |
| `data/recommendations/<id>.json` | 주제 추천 기록 → [[topic/entities/주제 추천]] | `recommend.ts` |
| `data/usage.jsonl` | Claude 호출 기록(90일) → [[usage/entities/호출 기록]] | `usage.ts` |
| `data/plan-limits.json` | 마지막 플랜 한도 → [[usage/entities/플랜 한도]] | `usage.ts` |
| `data/categories.json` | 카테고리 목록·마지막 선택 | `categories.ts` |
| `data/blocked-sites.json` | Claude in Chrome이 막은 블로그 | `blockedSites.ts` |
| `data/chrome-profile/` | 앱 전용 크롬 프로필(로그인 유지) | `CHROME_PROFILE_DIR` |
| `data/last-error.png` | 앱 전용 크롬 실패 화면 | `runner.ts` |

## 쓰기 규칙
- 원자적 쓰기(`writeFileAtomic`/`writeJsonAtomic`)로 파일이 반쯤 쓰인 채 남지 않게 한다.
- 같은 파일에 동시에 쓰지 않도록 `serialQueue`(전체 직렬) / `keyedQueue`(id별 직렬)를 쓴다.
- 이미지 파일 이름은 `basename`으로 제한해 폴더 밖을 가리키지 못하게 한다(`jobImagePath`).
- 예전 형식은 읽을 때 변환한다(`migrateJob`, `getSettings`).
