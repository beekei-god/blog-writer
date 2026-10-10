import type { BlogStatus, Job, ManualStatus, Platform, PublishMode, WritingTone } from "./types";

/** 화면과 서버 오류 메시지에서 함께 쓰는 이름 */
export const STATUS_LABEL: Record<Job["status"], string> = {
  researching: "자료 조사 중",
  writing: "글 작성 중",
  generating_images: "이미지 생성 중",
  draft_ready: "초안 검토",
  posting: "블로그 임시저장 중",
  failed: "실패",
};

/** 블로그 하나에서의 글 상태 이름 */
export const BLOG_STATUS_LABEL: Record<BlogStatus, string> = { posted: "임시저장 완료", scheduled: "발행 예약", published: "발행완료" };
/** 글 상태 직접 바꾸기의 선택지 이름 */
export const MANUAL_STATUS_LABEL: Record<ManualStatus, string> = { none: "올리지 않음", ...BLOG_STATUS_LABEL };

/** 글 하나의 상태 이름 (진행 단계 이름과 같게 쓴다. 올리는 블로그와 관계없이 같다) */
export const statusLabel = (job: Pick<Job, "status" | "postingTo">) => STATUS_LABEL[job.status];

export const PLATFORM_LABEL: Record<Platform, string> = { naver: "네이버 블로그", tistory: "티스토리", wordpress: "워드프레스" };
/** 문장 안에서 쓰는 짧은 이름 ("네이버 블로그 ID", "네이버 로그인 창") */
export const PLATFORM_SHORT_LABEL: Record<Platform, string> = { naver: "네이버", tistory: "티스토리", wordpress: "워드프레스" };
/** 목록 배지 등에 쓰는 "네이버 발행완료" */
export const blogStatusText = (p: Platform, s: BlogStatus) => `${PLATFORM_SHORT_LABEL[p]} ${BLOG_STATUS_LABEL[s]}`;

/** 블로그에 올리는 방식 이름 (모든 블로그에서 고른다) */
export const PUBLISH_MODE_LABEL: Record<PublishMode, string> = { draft: "임시저장", schedule: "예약발행", publish: "자동발행" };

/** 본문 말투 이름과 짧은 설명 (새 글 폼과 작업 로그) */
export const TONE_LABEL: Record<WritingTone, string> = { info: "정보형", friendly: "친근형", story: "스토리형", summary: "정리형" };
export const TONE_HINT: Record<WritingTone, string> = {
  info: "존댓말 + 칼럼체",
  friendly: "해요체 + 수다형",
  story: "스토리텔링 + 일기체 + 유머",
  summary: "Q&A + 요약 리스트",
};

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
