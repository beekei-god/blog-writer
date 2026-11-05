---
type: log
---
# 기록 (추가만)

## [2026-11-02] ingest | 전체 재작성
- 기존 vault 내용을 백업하고 비운 뒤 코드(73f47a6)를 읽어 project-wiki 구조로 다시 만들었다. `.obsidian/`은 유지.
- 도메인 5개(writing, image, publishing, topic, usage), `_system` 모듈 14·연동 12·`extending.md`.
- 이전 wiki에서 해결된 열린 질문의 이력은 백업에만 있다.

## [2026-11-02] update | writing, image, topic, usage (73f47a6 → 9a38c08)
- 열린 질문 14건 처리: writing 3·image 3·publishing 3·topic 3·usage 2를 닫고, usage #1은 일부만(집계 요약 테스트 없음) 남김.
- 코드 변경 반영: 근거 없는 추천 후보 제거(BR-TOP-001), `validateSvg` export·전용 테스트(BR-IMG-009), 규칙 문서 용어 "함께 많이 찾는"(BR-WRT-007), 새 테스트 4개와 데이터랩 테스트 이동.
- 각 도메인 `implementations`의 테스트 표와 `_system/modules/tests` 갱신.

## [2026-11-02] update | usage (9a38c08 → ead1094)
- `tests/usageSummary.test.ts` 추가로 usage 열린 질문 #1을 닫음. 구현 테스트 표와 BR-USG-005 이력 갱신.

## [2026-11-04] update | publishing (ead1094 → 8fba1f8)
- 네이버 장소 첨부 검색어를 정확한 주소(없으면 이름)로 변경 반영(BR-PUB-008), 평소 크롬 탭 열 창 선택·창 목록 로그 반영(BR-PUB-005), 구현 테스트 표 갱신.
- writing(`NewJob.tsx`, `place.ts`)·topic(`Recommend.tsx`)의 변경은 이번에 읽지 않아 `_registry.md` 분석 커밋과 스냅샷은 갱신하지 않음.

## [2026-11-05] update | writing (ead1094 → 2763f99)
- 제목 "직접 입력" 추가 반영(BR-WRT-005 화면 행·조건 표·이력, `web-job` 모듈), 장소 검색어 `placeSearchQuery` 반영(BR-WRT-008, writing 구현 지도), 새 글 폼 카드 이름 "본문 이미지"(`web-screens`).
- topic(`Recommend.tsx`)의 변경은 이번에 읽지 않아 `_registry.md` 분석 커밋과 스냅샷은 갱신하지 않음.
