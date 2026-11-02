---
type: integration
project: blog-writer
name: 워드프레스 REST
source:
  - blog-writer:server/wordpress.ts
updated: 2026-11-02
---
# 워드프레스 REST

## 무엇을 위해
자체 호스팅 워드프레스에 글·이미지를 REST API로 올린다. 브라우저를 쓰지 않는다.

## 인증·설정
- 사이트 주소(`settings.wordpressUrl`, https 필수)와 사용자명·Application Password(`secrets.json`).
- 주소가 http면 거부하고, 주소 없이 쓰면 https를 붙인다. 301/302로 이동시키면 실제 주소로 고치라는 안내를 낸다.

## 동작
이미지는 미디어로 올린 뒤 본문에 넣고, 카테고리는 사이트에서 읽어 선택한다. 연결 상태는 `/api/wordpress/status` 계열로 확인한다.

## 실패 형태
인증 실패, 주소 이동, 권한 부족, REST 비활성 — `WordPressError` 한국어 문구로 전달.

## 주의
- 예전 워드프레스닷컴(`wpcom*`) 저장 값은 쓰지 않고 연결 저장·삭제 때 지운다.
- 모듈: [[_system/modules/server-wordpress]]
