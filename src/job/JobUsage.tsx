import { useEffect, useState } from "react";
import type { Job, TokenTotals } from "../../shared/types";
import { api } from "../api";
import { fmtTokens, prettyModel, totalTokens } from "../labels";

/** 이 글을 만들며 쓴 모델과 토큰 */
export function JobUsage({ jobId, status }: { jobId: string; status: Job["status"] }) {
  const [rows, setRows] = useState<{ model: string; totals: TokenTotals }[]>([]);
  useEffect(() => {
    api.getJobUsage(jobId).then(setRows).catch(() => {});
  }, [jobId, status]);
  if (!rows.length) return null;
  const sum = rows.reduce((a, r) => a + totalTokens(r.totals), 0);
  return (
    <details>
      <summary>
        Claude 사용: {rows.map((r) => prettyModel(r.model)).join(", ")} · {fmtTokens(sum)} 토큰
      </summary>
      <ul className="sources">
        {rows.map((r) => (
          <li key={r.model}>
            <b>{prettyModel(r.model)}</b> — 입력 {fmtTokens(r.totals.input)} · 출력 {fmtTokens(r.totals.output)} · 캐시{" "}
            {fmtTokens(r.totals.cacheRead + r.totals.cacheWrite)} · 호출 {r.totals.calls}회
          </li>
        ))}
      </ul>
    </details>
  );
}
