---
type: business-rule
domain: image
id: BR-IMG-012
name: 실패 후 다른 AI 추천
status: deprecated
confidence: high
consistency: single-source
source:
  - blog-writer:src/job/images.tsx:80-154
entities: [ImageSpec]
updated: 2026-10-09
---
# BR-IMG-012 실패 후 다른 AI 추천

> **폐기 (2026-10-08, 커밋 38ae96c)**: 위쪽 실패 안내(`ImageFailures`)를 없애고, 실패하면 이미지마다 "이미지 다시 생성"으로 한 장씩 다시 만들도록 바뀌었다. 원인에 따라 다른 AI를 권하는 동작과 AI 버튼의 "· 실패" 표시가 함께 사라졌다. 한 장 도구는 글의 이미지 설정 AI로 시작한다. → [[image/business-rules/BR-IMG-009 다시 만들기 범위]], [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]]
>
> 이 페이지의 `source`·근거 라인은 폐기 직전 커밋(38ae96c의 부모) 기준이다. 해당 코드(`ImageFailures`)는 지금 HEAD에 없다 (2026-10-09 확인: `src/job/images.tsx`에 `ImageFailures` 없음).

## 규칙
이미지가 실패하면 실패한 것만 다른 AI로 다시 만들도록 권한다. 기본 선택은 이번에 실패하지 않은 AI이고, 원인에 따라 순서를 달리한다.

## 조건과 결과
| 조건 | 기본으로 권하는 AI 순서 | 기본 스타일 |
|---|---|---|
| 원인에 extension / browser_busy / browser_closed 포함 (크롬 문제) | Claude → Gemini → ChatGPT | 현재 스타일 (Claude면 플랫으로 맞춤) |
| 그 밖 | Gemini → ChatGPT → Claude (화풍 유지 가능한 다른 웹 AI 먼저) | 현재 스타일 |
| 원인에 refused 포함, 현재 스타일 ≠ flat | (위와 같음) | **flat** |
| 모든 AI가 이미 실패 | 현재 AI | |

실패한 AI 버튼에는 "· 실패" 표시.

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 화면 | `ImageFailures` | `blog-writer:src/job/images.tsx:93-101` |
| 서버 | 없음 (화면이 고른 값으로 요청) | |

## 영향받는 플로우
[[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-08 | 폐기: 실패 안내 영역과 추천 로직 삭제 | 커밋 38ae96c |
