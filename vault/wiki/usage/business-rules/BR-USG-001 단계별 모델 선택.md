---
type: business-rule
domain: usage
id: BR-USG-001
name: 단계별 모델 선택
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:98-116
  - blog-writer:server/claude.ts:modelFor
  - blog-writer:server/store.ts:21-25
entities: [단계별 모델]
updated: 2026-11-02
---
# BR-USG-001 단계별 모델 선택

## 규칙
Claude를 호출하는 5개 단계(research, writing, images, browser, recommend)마다 모델을 따로 고른다. 기본값은 추천 모델이고 이유(품질이 중요한 조사·글쓰기는 opus, 나머지는 sonnet)는 화면 문구(`MODEL_REASON`)에 있다. `default`를 고르면 `.env`의 `CLAUDE_MODEL`, 그것도 없으면 `claude` CLI 기본 모델을 쓴다. 한도 확인용 `check` 호출은 설정과 관계없이 호출하는 쪽이 지정한 모델(haiku)을 쓴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 호출에 `model`이 지정됨 | 그 모델 |
| 단계가 `check` | 모델 지정 없음(CLI 기본) |
| 설정이 `default` | `CLAUDE_MODEL` 또는 CLI 기본. 실제 쓰인 모델은 init 이벤트로 알게 되어 사용량 화면에 표시 |
| 설정 파일에 일부 단계만 있음 | 나머지는 추천 기본값으로 병합 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `STAGES`, `MODEL_CHOICES`, `RECOMMENDED_MODELS` | 위 표 | `blog-writer:shared/types.ts` |
| 서버 | `modelFor`, `getSettings` 병합 | | `blog-writer:server/claude.ts`, `server/store.ts` |
| 화면 | 단계별 모델 선택, 이유 문구 | `MODEL_REASON` | [[_system/modules/web-screens]] |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 단계를 추가하면 `STAGES`, `RECOMMENDED_MODELS`, 호출하는 곳의 `stage`, 사용량 집계 화면, 설정 화면을 함께 고친다 → [[_system/extending]]

## 영향받는 플로우
[[usage/flows/Claude 호출]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
