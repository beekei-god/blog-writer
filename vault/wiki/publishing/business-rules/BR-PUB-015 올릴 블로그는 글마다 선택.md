---
type: business-rule
domain: publishing
id: BR-PUB-015
name: 올릴 블로그는 글마다 선택
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:138-167
  - blog-writer:server/routes/jobs.ts:107-128
  - blog-writer:server/pipeline.ts:369-392
  - blog-writer:src/job/JobDetail.tsx:104-113
  - blog-writer:src/job/JobDetail.tsx:236-256
  - blog-writer:src/job/NextStep.tsx:79-101
  - blog-writer:src/App.tsx:101-107
  - blog-writer:src/SettingsPanel.tsx:172-196
entities: [블로그 설정, Job]
updated: 2026-10-09
---
# BR-PUB-015 올릴 블로그는 글마다 선택

## 규칙
**기본 블로그는 없다.** 네이버·티스토리·워드프레스는 설정에서 각각 따로 연결해 두고, 글을 올릴 때마다 글 화면에서 **올릴 블로그를 직접 고른다**. 고르기 전에는 등록 버튼을 보여 주지 않는다. 서버도 올릴 블로그(`platform`)가 없는 요청을 거절한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 글 화면을 처음 엶 | 올릴 곳 선택 없음. 단, 워드프레스에 올린 기록(`job.wordpress`)이 있으면 워드프레스가 골라져 있음 |
| 올릴 곳 버튼 | 네이버 블로그 / 티스토리 / 워드프레스. 연결 안 된 블로그는 " · 미설정" 표시와 "설정에서 먼저 연결하세요" 안내(고를 수는 있음) |
| 고르지 않음 | "초안이 준비됐습니다. 올릴 블로그를 위에서 선택하세요." (등록 버튼 없음). 이미 임시저장 완료·발행 예약인 글이면 "이미 <상태 이름> 상태인 글입니다. 올릴 블로그를 위에서 선택하세요." |
| 고른 블로그가 연결 안 됨 | 등록 버튼 비활성 + "설정에서 입력하기" |
| 연결된 블로그가 하나도 없음 | 상단 안내 "블로그가 아직 연결되지 않았습니다…", 설정 탭에 빨간 점 |
| `POST /post-to-blog`에 `platform` 없음·잘못된 값 | 400 "올릴 블로그를 선택하세요." |
| 고른 블로그의 ID·주소 없음 | 400 "먼저 설정에서 <블로그> 블로그 ID/사이트 주소를 입력하세요." |
| 블로그 발행완료·진행 중·초안 없음 | 올릴 곳 선택을 보이지 않음 |
| 한 글을 여러 블로그에 올림 | 가능. 상태는 마지막으로 올린 결과로 바뀐다 (예: 네이버에 임시저장한 글을 워드프레스에 올리면 워드프레스 기준 상태). 지금 고른 블로그에 올린 글인지 따로 보여 준다 → [[publishing/business-rules/BR-PUB-019 다른 블로그에 올린 글 표시]] |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | 블로그별 필드, `blogIdOf`, `settingsFor` | `blog-writer:shared/types.ts:138-167` |
| 서버 | `platform` 필수, 블로그별 값 확인 | `blog-writer:server/routes/jobs.ts:107-128` |
| 서버 | 고른 블로그로 경로 분기, 고른 블로그의 설정으로 입력 | `blog-writer:server/pipeline.ts:369-392`, `:371` |
| 화면 | `destPick`, 올릴 곳 선택(`destPicker`) | `blog-writer:src/job/JobDetail.tsx:104-113`, `:223-243` |
| 화면 | 고르기 전 안내 | `blog-writer:src/job/NextStep.tsx:79-101` |
| 화면 | 블로그별 연결 여부 `ready` | `blog-writer:src/App.tsx:101-107` |
| 화면(설정) | 블로그별 카드, 카드마다 자기 값만 저장 | `blog-writer:src/SettingsPanel.tsx:27-32`, `:86-101`, `:172-258` |

## 예외 / 경계값
- 예전 설정의 `platform`·`blogId`는 불러올 때 블로그별 칸으로 옮긴다 → [[publishing/entities/블로그 설정]].
- 올릴 곳 선택은 화면 상태라 글 화면을 다시 열면 다시 골라야 한다(워드프레스 기록이 있는 글 제외).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-07 | 최초 기록. 예전에는 설정의 기본 블로그(`platform`) 하나에만 올렸다 | `blog-writer:server/routes/jobs.ts:107-128` |
| 2026-10-09 | 규칙 변화 없음. 상태 이름 변경 반영, 다른 블로그에 올린 글 표시(BR-PUB-019) 연결, 근거 줄 번호 갱신 | 커밋 65bfa3e |
