---
type: domain-index
domain: usage
updated: 2026-11-02
---
# usage 목차

개요: [[usage/overview]] · 구현 지도: [[usage/implementations/blog-writer 구현]] · 열린 질문: [[usage/open-questions]]

## 엔티티
[[usage/entities/호출 기록]] · [[usage/entities/플랜 한도]] · [[usage/entities/단계별 모델]]

## 규칙
| 번호 | 이름 | 한 줄 |
|---|---|---|
| BR-USG-001 | [[usage/business-rules/BR-USG-001 단계별 모델 선택]] | 5개 단계, 추천 기본값, default는 CLI 기본 |
| BR-USG-002 | [[usage/business-rules/BR-USG-002 Claude 호출 방식]] | claude -p, 키 없음, 임시 폴더, 도구 제한 |
| BR-USG-003 | [[usage/business-rules/BR-USG-003 호출 기록과 보관]] | 호출마다 기록, 실패해도 기록, 90일 |
| BR-USG-004 | [[usage/business-rules/BR-USG-004 플랜 한도 사용률]] | 마지막 호출에서 받은 값, Haiku로 확인 |
| BR-USG-005 | [[usage/business-rules/BR-USG-005 집계 기준]] | 한국 시간, 주는 월요일 시작 |
| BR-USG-006 | [[usage/business-rules/BR-USG-006 Claude 로그인 관리]] | 토큰은 읽지 않음, 계정 바꾸면 한도 정보 지움 |

## 플로우
[[usage/flows/Claude 호출]]
