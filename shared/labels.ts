import type { Job, Platform } from "./types";

/** 화면과 서버 오류 메시지에서 함께 쓰는 이름 */
export const STATUS_LABEL: Record<Job["status"], string> = {
  researching: "딥서칭 중",
  writing: "글 작성 중",
  generating_images: "이미지 생성 중",
  draft_ready: "초안 완료",
  posting: "크롬 작성 중",
  posted: "임시저장 완료",
  scheduled: "예약됨",
  published: "발행 완료",
  failed: "실패",
};

/** 글 하나의 상태 이름. 올리는 중(posting)은 올리는 블로그에 따라 다르다 (워드프레스는 크롬을 쓰지 않는다). */
export const statusLabel = (job: Pick<Job, "status" | "postingTo">) =>
  job.status === "posting" && job.postingTo === "wordpress" ? "워드프레스 등록 중" : STATUS_LABEL[job.status];

export const PLATFORM_LABEL: Record<Platform, string> = { naver: "네이버 블로그", tistory: "티스토리", wordpress: "워드프레스" };
/** 문장 안에서 쓰는 짧은 이름 ("네이버 블로그 ID", "네이버 로그인 창") */
export const PLATFORM_SHORT_LABEL: Record<Platform, string> = { naver: "네이버", tistory: "티스토리", wordpress: "워드프레스" };

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
