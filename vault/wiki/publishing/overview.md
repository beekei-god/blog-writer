---
type: domain-overview
domain: publishing
aliases: [블로그 등록, 발행, 임시저장, 예약발행]
projects: [blog-writer]
updated: 2026-11-02
---
# publishing (블로그 등록) 도메인

## 한 문단 요약
완성한 초안을 네이버·티스토리·워드프레스에 올린다. 워드프레스는 REST API로, 네이버·티스토리는 크롬 자동 조작으로 올린다. 어느 블로그든 임시저장·예약발행·즉시발행 중에서 고르며, 크롬 방식은 **늘 임시저장을 먼저** 끝낸 뒤 발행 창에서 발행한다. 발행 단계에서 멈춰도 글은 임시저장된 채로 남는다. 글의 "올린 상태"는 **블로그마다 따로** 기록한다(한 글을 여러 블로그에 올릴 수 있다).

## 경계
- 포함: 블로그 선택·설정, 올리기 3가지 방식, 카테고리, 네이버 주제, 블로그별 상태, 수동 상태 표시, 내 글 목록 필터
- 제외: 글·이미지 만들기 → [[writing/overview]], [[image/overview]]. Claude in Chrome 확장 설치·연결은 시스템 연동 → [[_system/integrations/claude-in-chrome]]

## 핵심 개념
- [[publishing/entities/블로그별 상태]] — 블로그마다의 올림 상태
- [[publishing/entities/블로그 설정]] — 블로그 ID/주소, 카테고리 기억
- [[publishing/entities/워드프레스 기록]] — 올린 글 ID·링크·이미지 ID

## 주요 플로우
- [[publishing/flows/블로그에 올리기]]
- [[publishing/flows/워드프레스 등록]]

## 규칙
[[publishing/index]]의 규칙 표 (BR-PUB-001~009)

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 서버 | 올리기 오케스트레이션(`runPost`), 방식 선택, 큐 | [[_system/modules/server-pipeline]] |
| 서버 | Claude in Chrome, 평소 크롬(AppleScript), 앱 전용 크롬(Playwright) | [[_system/modules/server-browser]] |
| 서버 | 워드프레스 REST | [[_system/modules/server-wordpress]] |
| 공용 | 붙여넣기 HTML, 장소 카드, 상태·필터 | [[_system/modules/shared]] |
| 화면 | 올리기 패널, 상태 표시, 내 글 필터 | [[_system/modules/web-job]], [[_system/modules/web-screens]] |

## 구현 지도
- [[publishing/implementations/blog-writer 구현]]
