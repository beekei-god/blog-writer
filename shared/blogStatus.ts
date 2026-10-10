import { PLATFORMS, type BlogStatus, type Job, type Platform } from "./types";

/** 블로그 하나에서 본 글의 위치: 올리는 중, 올리지 않음(초안), 또는 블로그 상태 */
export type BlogPosition = "posting" | "none" | BlogStatus;

export function blogPositionOf(job: Pick<Job, "status" | "postingTo" | "blogs">, p: Platform): BlogPosition {
  if (job.status === "posting" && job.postingTo === p) return "posting";
  return job.blogs?.[p]?.status ?? "none";
}

const RANK: Record<BlogStatus, number> = { posted: 1, scheduled: 2, published: 3 };
/** 블로그들 중 가장 앞선 상태 (진행 단계 표시용). 올린 블로그가 없으면 undefined */
export function furthestBlogStatus(job: Pick<Job, "blogs">): BlogStatus | undefined {
  return PLATFORMS.map((p) => job.blogs?.[p]?.status)
    .filter((s): s is BlogStatus => !!s)
    .sort((a, b) => RANK[b] - RANK[a])[0];
}

/** "내 글" 목록의 상태 필터. 글 작성 단계별로 묶는다 (실패한 글은 "전체"에서만 보인다) */
export type StatusFilter = "all" | "researching" | "draft" | "saved" | "published";
/** 블로그 필터: 전체 블로그 또는 블로그 하나 */
export type BlogFilter = "all" | Platform;

const BEFORE_DRAFT: Job["status"][] = ["researching", "writing", "generating_images"];
const POSITIONS: Partial<Record<StatusFilter, BlogPosition[]>> = {
  saved: ["posting", "posted"],
  published: ["scheduled", "published"],
};

/**
 * 블로그를 고르면 그 블로그에서의 상태로, 전체 블로그면 어느 블로그든 해당하면 보인다.
 * - 자료 조사 중: 초안이 나오기 전 (블로그와 관계없음)
 * - 초안검토: 초안이 있고, 고른 블로그(전체면 모든 블로그)에 아직 올리지 않은 글
 * - 임시저장: 올리는 중이거나 임시저장 / 발행완료: 발행예약이거나 발행완료
 */
export function matchesFilter(job: Pick<Job, "status" | "postingTo" | "blogs" | "post">, blog: BlogFilter, f: StatusFilter): boolean {
  if (f === "all") return true;
  if (f === "researching") return BEFORE_DRAFT.includes(job.status);
  const platforms = blog === "all" ? PLATFORMS : [blog];
  const positions = platforms.map((p) => blogPositionOf(job, p));
  if (f === "draft") return !!job.post && (job.status === "draft_ready" || job.status === "posting") && positions.every((x) => x === "none");
  return positions.some((x) => POSITIONS[f]!.includes(x));
}
