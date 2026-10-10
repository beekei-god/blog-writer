import { furthestBlogStatus } from "../../shared/blogStatus";
import type { Job } from "../../shared/types";

// ───────────────────────── 진행 단계 ─────────────────────────

export function Progress({ job }: { job: Job }) {
  const wantImages = job.imageOptions?.thumbnail || (job.imageOptions?.bodyImages ?? 0) > 0;
  const steps: { key: string; label: string }[] = [
    { key: "researching", label: "자료 조사" },
    { key: "writing", label: "글 작성" },
    ...(wantImages ? [{ key: "generating_images" as const, label: "이미지 생성" }] : []),
    { key: "draft_ready", label: "초안검토" },
    // 블로그에 올리는 중(posting)과 임시저장(posted)는 한 단계다.
    { key: "posted", label: "블로그 임시저장" },
    { key: "published", label: "블로그 발행완료" },
  ];

  // 블로그 단계는 블로그들 중 가장 앞선 상태로 보인다 (블로그별 상태는 아래 "블로그별 글 상태"에서 본다).
  const blog = job.status === "draft_ready" ? furthestBlogStatus(job) : undefined;
  let current: number;
  let failed = false;
  if (job.status === "failed") {
    failed = true;
    current = job.researchNotes ? 1 : 0;
  } else {
    // 올리는 중은 블로그 임시저장 단계를 진행 중으로, 발행예약은 그 단계까지 끝난 것으로 본다.
    const key = job.status === "posting" || blog === "scheduled" ? "posted" : (blog ?? job.status);
    current = steps.findIndex((s) => s.key === key);
  }
  // 임시저장까지 끝났으면 그 단계는 완료이고 다음 단계(블로그 발행완료)가 남은 일이다.
  if (blog === "posted" || blog === "scheduled") current += 1;
  const allDone = blog === "published";

  return (
    <ol className="progress">
      {steps.map((s, i) => {
        const state = allDone || i < current ? "done" : i === current ? (failed ? "failed" : "current") : "todo";
        return (
          <li key={s.key} className={state}>
            <span className="bullet">{state === "done" ? "✓" : state === "failed" ? "!" : i + 1}</span>
            <span className="label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
