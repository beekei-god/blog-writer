---
type: business-rule
domain: usage
id: BR-USG-001
name: 단계별 추천 모델
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:53-72
  - blog-writer:src/labels.ts:26-58
  - blog-writer:server/store.ts:19-22
  - blog-writer:src/SettingsPanel.tsx:291-345
  - blog-writer:README.md:20
updated: 2026-10-07
---
# BR-USG-001 단계별 추천 모델

## 규칙
Claude를 부르는 다섯 단계마다 모델을 따로 고를 수 있고, 기본값은 단계별 추천 모델이다. 정확도·문장 품질이 중요한 **자료 조사·글 작성은 Opus**, 짧거나 반복 호출이 많은 **이미지(SVG)·브라우저 조작·주제 추천은 Sonnet**.

| 단계 | 추천 | 이유 (화면 문구 요약) |
|---|---|---|
| research 자료 조사 | opus | 여러 번 검색하며 출처를 비교·판단하는 긴 작업, 글의 사실 품질이 여기서 정해짐 |
| writing 글 작성 | opus | 규칙·분량·표·태그 형식을 함께 지키는 한국어 장문 |
| images 이미지 (Claude SVG) | sonnet | SVG로 도형을 그리는 짧은 작업, 빠르고 한도 절약 |
| browser 브라우저 조작 | sonnet | 스크린샷 보며 클릭·입력을 반복해 호출이 많음 |
| recommend 주제 추천 | sonnet | 넓게 훑는 작업이라 속도 중요, 사실 확인은 자료 조사에서 다시 |

선택지: "Claude Code 설정"(default), Fable(가장 뛰어나지만 한도를 가장 많이 씀), Opus(품질 우선), Sonnet(빠르고 한도 절약), Haiku(가장 가볍고 빠름).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 설정 파일 없음/일부 단계 없음 | 그 단계는 추천 모델 |
| "모두 추천 모델로" | 전 단계 추천으로 (이미 같으면 비활성) |
| 변경 저장 | 다음 Claude 호출부터 |
| 한도 확인·연결 확인 (check) | 설정과 무관하게 haiku |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `STAGES`, `MODEL_CHOICES`, `RECOMMENDED_MODELS` | `blog-writer:shared/types.ts:55-72` |
| 서버 | 기본 설정에 추천값, 단계별 병합 | `blog-writer:server/store.ts:19-22`, `:36` |
| 서버 검증 | 단계마다 `MODEL_CHOICES` enum | `blog-writer:server/routes/settings.ts:24` |
| 화면 | 이유·힌트·추천 배지 | `blog-writer:src/labels.ts:26-58`, `blog-writer:src/SettingsPanel.tsx:291-345` |
| README | 같은 내용 | `blog-writer:README.md:20` |

## 예외 / 경계값
- `MODEL_REASON`은 `RECOMMENDED_MODELS`와 함께 고쳐야 한다(코드 주석) — 한쪽만 바꾸면 화면 이유가 틀어진다.

## 영향받는 플로우
[[usage/flows/사용량 확인 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 줄 번호·경로 보정 (리팩터링: API는 `server/routes/`로, 저장은 `server/fsutil.ts` 공용 도우미로). 규칙 변화 없음 | |
