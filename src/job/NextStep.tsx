import { useState } from "react";
import type { Job, Platform, PublishMode } from "../../shared/types";
import { PLATFORM_LABEL } from "../../shared/labels";
import { STATUS_LABEL, statusLabel } from "../labels";

function confirmRevert(set: (status: "draft_ready") => void) {
  if (confirm("초안 완료 상태로 되돌릴까요?\n블로그에 이미 저장·발행된 글은 그대로 남습니다.")) set("draft_ready");
}

export function NextStep({
  job,
  hasDraft,
  blogReady,
  platform,
  destPicker,
  busy,
  onPost,
  onRetry,
  onOpenSettings,
  onSetStatus,
}: {
  job: Job;
  hasDraft: boolean;
  blogReady: boolean;
  platform?: Platform;
  /** 올릴 블로그를 고르는 부분 (기본 블로그가 없으므로 글마다 직접 고른다) */
  destPicker?: React.ReactNode;
  busy: boolean;
  onPost: (opts?: { mode?: PublishMode; scheduledAt?: string }) => void;
  onRetry: () => void;
  onOpenSettings: () => void;
  onSetStatus: (status: "draft_ready" | "posted" | "published") => void;
}) {
  if (busy) {
    const msg =
      job.status === "posting" && (job.postingTo ?? platform) === "wordpress"
        ? "워드프레스 API로 글과 이미지를 올리고 있습니다. 크롬은 필요 없습니다. 이 화면을 닫아도 계속 진행됩니다."
        : job.status === "posting"
        ? "평소 쓰는 크롬에서 Claude in Chrome이 글을 입력하고 있습니다. 끝날 때까지 Claude가 연 탭 그룹은 건드리지 마세요. 글 길이와 이미지 수에 따라 10~30분 걸릴 수 있습니다."
        : `${statusLabel(job)}입니다. 이 화면을 닫아도 계속 진행됩니다.`;
    return <div className="next-step info">{msg}</div>;
  }
  if (!hasDraft) {
    return (
      <div className="next-step warn">
        <span>초안을 만들지 못했습니다. 위 오류를 확인한 뒤 다시 시도하세요.</span>
        <button className="primary" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    );
  }
  const target = platform ? PLATFORM_LABEL[platform] : "블로그";
  if (!platform && job.status !== "published") {
    // 올릴 블로그를 아직 고르지 않았다: 고르기 전에는 등록 버튼을 보여 주지 않는다.
    const registered = job.status === "posted" || job.status === "scheduled";
    return (
      <>
        {destPicker}
        <div className={`next-step ${registered ? "ok" : ""}`}>
          <div>
            {registered ? <b>이미 {STATUS_LABEL[job.status]} 상태인 글입니다.</b> : <b>초안이 준비됐습니다.</b>} <b>올릴 블로그를 위에서 선택하세요.</b>
            {!blogReady && (
              <p className="hint small">
                연결된 블로그가 없습니다.{" "}
                <button className="link" onClick={onOpenSettings}>
                  설정에서 블로그 연결하기
                </button>
              </p>
            )}
          </div>
          {registered && (
            <div className="actions">
              <button className="primary" onClick={() => onSetStatus("published")}>
                발행 완료로 표시
              </button>
              <button onClick={() => confirmRevert(onSetStatus)}>초안 완료로 되돌리기</button>
            </div>
          )}
        </div>
      </>
    );
  }
  if (platform === "wordpress" && job.status !== "published") {
    return (
      <>
        {destPicker}
        <WordPressNext job={job} blogReady={blogReady} onPost={onPost} onSetStatus={onSetStatus} onOpenSettings={onOpenSettings} />
      </>
    );
  }
  if (job.status === "published") {
    return (
      <div className="next-step ok">
        <div>
          <b>발행 완료된 글입니다.</b>{" "}
          {job.wordpress
            ? "워드프레스에 발행했거나 발행 완료로 표시한 글입니다."
            : "앱은 발행하지 않으며, 블로그에서 직접 발행한 것을 표시한 상태입니다."}
          {job.wordpress?.link && (
            <>
              {" "}
              <a href={job.wordpress.link} target="_blank" rel="noreferrer noopener">
                글 열기
              </a>
            </>
          )}
        </div>
        <div className="actions">
          <button onClick={() => onSetStatus("posted")}>발행 완료 취소</button>
          <button onClick={() => confirmRevert(onSetStatus)}>초안 완료로 되돌리기</button>
        </div>
      </div>
    );
  }
  return (
    <>
    {destPicker}
    <div className={`next-step ${job.status === "posted" ? "ok" : ""}`}>
      <div>
        {job.status === "posted" ? (
          <>
            <b>{target}에 임시저장했습니다.</b> 크롬 창에서 내용을 확인하고 직접 발행하세요. 초안을 고쳤다면 다시 임시저장할 수 있지만, 이전 임시저장 글을 고치지 않고 블로그에 새 임시저장 글이 하나 더 생깁니다. 이전 글은 블로그에서 직접 지워 주세요.
          </>
        ) : (
          <>
            <b>초안이 준비됐습니다.</b> 아래에서 내용을 검토하고 고친 뒤, {target}에 임시저장하세요. 평소 쓰는 크롬에서 Claude in Chrome이 입력하며, 발행은 하지 않습니다.
          </>
        )}
        {!blogReady && (
          <p className="hint small">
            블로그 ID가 없어 아직 올릴 수 없습니다.{" "}
            <button className="link" onClick={onOpenSettings}>
              설정에서 입력하기
            </button>
          </p>
        )}
      </div>
      <div className="actions">
        {job.status === "posted" && (
          <button className="primary" onClick={() => onSetStatus("published")}>
            발행 완료로 표시
          </button>
        )}
        {job.status === "posted" && <button onClick={() => confirmRevert(onSetStatus)}>초안 완료로 되돌리기</button>}
        <button className={job.status === "posted" ? "" : "primary"} onClick={() => onPost()} disabled={!blogReady}>
          {job.status === "posted" ? "다시 임시저장" : `${target}에 임시저장`}
        </button>
      </div>
    </div>
    </>
  );
}

// ───────────────────────── 워드프레스 API 등록 ─────────────────────────

const MODE_TEXT: Record<PublishMode, string> = { draft: "임시저장", schedule: "예약발행", publish: "자동발행" };
const MODE_HINT: Record<PublishMode, string> = {
  draft: "사이트에 초안으로 저장합니다. 공개되지 않습니다.",
  schedule: "정한 시각에 사이트가 자동으로 공개합니다.",
  publish: "누르는 즉시 공개됩니다.",
};

const pad = (n: number) => String(n).padStart(2, "0");
/** datetime-local 입력 값 (브라우저 현지 시간) */
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const tomorrowNine = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return toLocalInput(d);
};

/** 워드프레스는 API로 올린다: 임시저장 / 예약발행 / 자동발행 중에서 고른다. 다시 등록하면 같은 글을 갱신한다. */
function WordPressNext({
  job,
  blogReady,
  onPost,
  onSetStatus,
  onOpenSettings,
}: {
  job: Job;
  blogReady: boolean;
  onPost: (opts?: { mode?: PublishMode; scheduledAt?: string }) => void;
  onSetStatus: (status: "draft_ready" | "posted" | "published") => void;
  onOpenSettings: () => void;
}) {
  const wp = job.wordpress;
  const [mode, setMode] = useState<PublishMode>("draft");
  const [when, setWhen] = useState(() => (wp?.scheduledAt ? toLocalInput(new Date(wp.scheduledAt)) : tomorrowNine()));
  const whenMs = new Date(when).getTime();
  const tooSoon = mode === "schedule" && !(whenMs > Date.now() + 60_000);

  const go = () => {
    if (mode === "publish" && !confirm("지금 바로 공개됩니다. 계속할까요?")) return;
    if (mode === "schedule" && !confirm(`${new Date(when).toLocaleString("ko-KR")}에 공개되도록 예약합니다. 계속할까요?`)) return;
    onPost({ mode, scheduledAt: mode === "schedule" ? new Date(when).toISOString() : undefined });
  };

  const link = wp?.link && (
    <a href={wp.link} target="_blank" rel="noreferrer noopener">
      글 열기
    </a>
  );
  // 이 글을 워드프레스에 올린 기록이 있을 때만 "등록됨"이다 (다른 블로그에 올려 임시저장 상태인 글은 아직 아니다).
  const registered = !!wp && (job.status === "posted" || job.status === "scheduled");

  return (
    <div className={`next-step ${registered ? "ok" : ""}`}>
      <div>
        {registered && job.status === "posted" ? (
          <>
            <b>워드프레스에 임시저장했습니다.</b> {link} 다시 등록하면 같은 글을 갱신합니다.
          </>
        ) : registered && job.status === "scheduled" ? (
          <>
            <b>워드프레스에 예약했습니다.</b> {wp?.scheduledAt ? `${new Date(wp.scheduledAt).toLocaleString("ko-KR")}에 공개됩니다.` : ""} {link} 다시 등록하면 같은 글을 갱신합니다.
          </>
        ) : job.status === "posted" || job.status === "scheduled" ? (
          <>
            <b>다른 블로그에 올린 글입니다.</b> 워드프레스에도 올릴 수 있습니다. 올리면 글의 상태가 워드프레스 기준으로 바뀝니다.
          </>
        ) : (
          <>
            <b>초안이 준비됐습니다.</b> 아래에서 내용을 검토하고 고친 뒤 워드프레스에 올리세요. API로 올리므로 크롬이 필요 없습니다.
          </>
        )}
        <div className="wp-publish">
          <div className="segmented" role="radiogroup" aria-label="등록 방식">
            {(Object.keys(MODE_TEXT) as PublishMode[]).map((m) => (
              <button key={m} type="button" className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
                {MODE_TEXT[m]}
              </button>
            ))}
          </div>
          <span className="hint small">{MODE_HINT[mode]}</span>
          {mode === "schedule" && (
            <label className="mini-label">
              공개 시각
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              {tooSoon && <span className="error small">지금보다 1분 이상 뒤여야 합니다.</span>}
            </label>
          )}
        </div>
        {!blogReady && (
          <p className="hint small">
            워드프레스 사이트 주소가 없어 아직 올릴 수 없습니다.{" "}
            <button className="link" onClick={onOpenSettings}>
              설정에서 입력하기
            </button>
          </p>
        )}
      </div>
      <div className="actions">
        {registered && (
          <button className="primary" onClick={() => onSetStatus("published")}>
            발행 완료로 표시
          </button>
        )}
        {registered && <button onClick={() => confirmRevert(onSetStatus)}>초안 완료로 되돌리기</button>}
        <button className={registered ? "" : "primary"} onClick={go} disabled={!blogReady || tooSoon}>
          {registered ? `다시 등록 (${MODE_TEXT[mode]})` : `워드프레스에 ${MODE_TEXT[mode]}`}
        </button>
      </div>
    </div>
  );
}
