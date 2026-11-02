---
type: business-rule
domain: image
id: BR-IMG-003
name: 썸네일 AI와 본문 AI 분리
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:84-92
  - blog-writer:server/images/index.ts:generateImages
entities: [이미지 옵션]
updated: 2026-11-02
---
# BR-IMG-003 썸네일 AI와 본문 AI 분리

## 규칙
썸네일은 본문 이미지와 **다른 AI·스타일·만드는 방법**으로 만들 수 있다. 따로 정하지 않으면 본문 이미지와 같다. 대상마다 자기 AI·스타일·방법을 쓴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `thumbnailProvider` 없음 | 본문 `provider` |
| `thumbnailStyle` 없음/그 AI에서 불가 | 본문 `style`(또는 그 AI의 첫 스타일) |
| `thumbnailMethod` 없음 | 본문 `method`(기본 api) |
| 한 장 다시 만들기 | 고른 AI·스타일은 이번에만 쓰고 글의 이미지 설정은 바꾸지 않음. 단, 썸네일 전체 다시 만들기(`thumbnail` 범위)는 썸네일 설정을 갱신함 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `aiFor`, `methodFor` | 위 해석 | `blog-writer:shared/types.ts:84-92` |
| 서버 | `generateImages`가 대상마다 `aiOf(t)` | | `blog-writer:server/images/index.ts` |
| 서버 | `runImage`가 `thumbnailProvider/Style/Method` 갱신 | | `blog-writer:server/pipeline.ts:270-280` |
| 라우트 | `regenerate-images` 본문 | thumbnail* 필드 | `blog-writer:server/routes/images.ts` |
| 테스트 | 썸네일 크롬+본문 API 조합 | | `blog-writer:tests/imageApi.test.ts:68` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- Claude 썸네일과 Gemini 본문 같은 조합이 가능하므로 `generateImages`가 Claude를 먼저, 나머지를 뒤에 처리한다.

## 영향받는 플로우
[[image/flows/이미지 생성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
