import type { Job } from "../../shared/types";

// ───────────────────────── 진행 단계 ─────────────────────────

export function Progress({ job }: { job: Job }) {
  const wantImages = job.imageOptions?.thumbnail || (job.imageOptions?.bodyImages ?? 0) > 0;
  const steps: { key: Job["status"]; label: string }[] = [
    { key: "researching", label: "자료 조사" },
    { key: "writing", label: "글 작성" },
    ...(wantImages ? [{ key: "generating_images" as const, label: "이미지" }] : []),
    { key: "draft_ready", label: "초안 검토" },
    { key: "posting", label: "블로그 작성" },
    { key: "posted", label: "임시저장" },
    { key: "published", label: "발행 완료" },
  ];

  let current: number;
  let failed = false;
  if (job.status === "failed") {
    failed = true;
    current = job.researchNotes ? 1 : 0;
  } else {
    // 예약됨(워드프레스 예약발행)은 임시저장 단계까지 끝난 것과 같게 본다.
    const key = job.status === "scheduled" ? "posted" : job.status;
    current = steps.findIndex((s) => s.key === key);
  }
  // 임시저장까지 끝났으면 그 단계는 완료이고 다음 단계(발행 완료)가 남은 일이다.
  if (job.status === "posted" || job.status === "scheduled") current += 1;
  const allDone = job.status === "published";

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

/** 임시저장·발행 완료 표시를 풀고 초안 완료로 되돌린다 (블로그에 올라간 글은 그대로이니 확인을 받는다) */
