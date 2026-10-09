import { useEffect, useState } from "react";
import { MANUAL_STATUSES, NAVER_MINUTE_STEP, type BlogCategory, type Job, type ManualStatus, type Platform, type PublishMode } from "../../shared/types";
import { PLATFORM_LABEL, PUBLISH_MODE_LABEL } from "../../shared/labels";
import { api, type CategoryList } from "../api";
import { errorText, STATUS_LABEL, statusLabel } from "../labels";


/** 블로그에 올리는 요청: 방식(임시저장·예약발행·자동발행), 예약 시각, 고른 카테고리 */
export type PostOpts = { mode?: PublishMode; scheduledAt?: string; category?: BlogCategory };

/**
 * 초안 검토 이후의 글 상태를 직접 바꾼다 (앱이 블로그에 올리거나 발행하지는 않는다).
 * 초안 검토로 되돌릴 때는 블로그에 올라간 글은 그대로이니 확인을 받는다.
 */
export function StatusPicker({ status, onSetStatus }: { status: Job["status"]; onSetStatus: (status: ManualStatus) => void }) {
  const pick = (s: ManualStatus) => {
    if (s === status) return;
    if (s === "draft_ready" && !confirm("초안 검토 상태로 되돌릴까요?\n블로그에 이미 저장·발행된 글은 그대로 남습니다.")) return;
    onSetStatus(s);
  };
  return (
    <div className="option-row status-picker">
      <span className="field-label">글 상태</span>
      <div className="segmented" role="radiogroup" aria-label="글 상태">
        {MANUAL_STATUSES.map((s) => (
          <button key={s} type="button" className={status === s ? "on" : ""} onClick={() => pick(s)}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {status === "scheduled" && <span className="hint small">지금은 {STATUS_LABEL.scheduled} 상태입니다.</span>}
    </div>
  );
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
}: {
  job: Job;
  hasDraft: boolean;
  blogReady: boolean;
  platform?: Platform;
  /** 올릴 블로그를 고르는 부분 (기본 블로그가 없으므로 글마다 직접 고른다) */
  destPicker?: React.ReactNode;
  busy: boolean;
  onPost: (opts?: PostOpts) => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  if (busy) {
    const msg =
      job.editProposal?.status === "running"
        ? "프롬프트로 글을 고치는 중입니다. 끝나면 바뀐 부분을 보고 적용할지 정할 수 있습니다."
        : job.status === "posting" && (job.postingTo ?? platform) === "wordpress"
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
        </div>
      </>
    );
  }
  if (platform === "wordpress" && job.status !== "published") {
    return (
      <>
        {destPicker}
        <WordPressNext job={job} blogReady={blogReady} onPost={onPost} onOpenSettings={onOpenSettings} />
      </>
    );
  }
  if (job.status === "published") {
    return (
      <div className="next-step ok">
        <div>
          <b>블로그 발행완료된 글입니다.</b>{" "}
          {job.wordpress ? "워드프레스에 발행했거나 블로그 발행완료로 표시한 글입니다." : "블로그에 발행했거나 블로그 발행완료로 표시한 글입니다."}
          {job.wordpress?.link && (
            <>
              {" "}
              <a href={job.wordpress.link} target="_blank" rel="noreferrer noopener">
                글 열기
              </a>
            </>
          )}
        </div>
      </div>
    );
  }
  return (
    <>
      {destPicker}
      <ChromeBlogNext job={job} target={target} platform={platform} blogReady={blogReady} onPost={onPost} onOpenSettings={onOpenSettings} />
    </>
  );
}

/**
 * 네이버·티스토리는 크롬으로 올린다: 임시저장 / 예약발행 / 자동발행 중에서 고른다.
 * 늘 임시저장을 먼저 하고, 예약·자동이면 이어서 블로그의 발행 창에서 발행한다. 다시 올리면 블로그에 새 글이 하나 더 생긴다.
 */
function ChromeBlogNext({
  job,
  target,
  platform,
  blogReady,
  onPost,
  onOpenSettings,
}: {
  job: Job;
  target: string;
  platform?: Platform;
  blogReady: boolean;
  onPost: (opts?: PostOpts) => void;
  onOpenSettings: () => void;
}) {
  const pm = usePublishMode(platform === "naver" ? NAVER_MINUTE_STEP : 1);
  const cats = useCategories(platform);
  const registered = job.status === "posted" || job.status === "scheduled";
  // 마지막으로 올린 블로그가 이 블로그일 때만 "올렸다"고 본다 (예전 글은 올린 블로그 기록이 없으면 이 블로그로 본다).
  const again = registered && (!job.postingTo || job.postingTo === platform);
  const go = () => {
    const dup = again ? "\n이전에 올린 글은 그대로 두고 블로그에 새 글이 하나 더 생깁니다." : "";
    if (pm.mode === "publish" && !confirm(`${target}에 임시저장한 뒤 바로 공개합니다. 계속할까요?${dup}`)) return;
    if (pm.mode === "schedule" && !confirm(`${target}에 임시저장한 뒤 ${new Date(pm.when).toLocaleString("ko-KR")}에 공개되도록 예약합니다. 계속할까요?${dup}`)) return;
    onPost({ ...pm.request(), category: cats.selected });
  };
  return (
    <div className={`next-step ${again ? "ok" : ""}`}>
      <div>
        {registered && !again ? (
          <>
            <b>다른 블로그에 올린 글입니다.</b> {target}에도 올릴 수 있습니다. 올리면 글의 상태가 {target} 기준으로 바뀝니다.
          </>
        ) : job.status === "posted" ? (
          <>
            <b>{target}에 임시저장했습니다.</b> 크롬 창에서 내용을 확인하고 직접 발행하거나, 아래에서 다시 올릴 수 있습니다. 다시 올리면 이전 글을 고치지 않고 블로그에 새 글이 하나 더 생깁니다. 이전 글은 블로그에서 직접 지워 주세요.
          </>
        ) : job.status === "scheduled" ? (
          <>
            <b>{target}에 발행 예약했습니다.</b> 예약 시각은 진행 로그에서 볼 수 있습니다. 다시 올리면 블로그에 새 글이 하나 더 생깁니다.
          </>
        ) : (
          <>
            <b>초안이 준비됐습니다.</b> 아래에서 내용을 검토하고 고친 뒤 {target}에 올리세요. 평소 쓰는 크롬에서 입력하며, 늘 임시저장을 먼저 한 뒤 고른 방식대로 발행합니다.
          </>
        )}
        <PublishModeFields pm={pm} hints={CHROME_MODE_HINT} />
        <CategoryField cats={cats} platform={platform} mode={pm.mode} />
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
        <button className={again ? "" : "primary"} onClick={go} disabled={!blogReady || !!pm.problem}>
          {again ? `다시 올리기 (${PUBLISH_MODE_LABEL[pm.mode]})` : `${target}에 ${PUBLISH_MODE_LABEL[pm.mode]}`}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── 워드프레스 API 등록 ─────────────────────────

const WP_MODE_HINT: Record<PublishMode, string> = {
  draft: "사이트에 초안으로 저장합니다. 공개되지 않습니다.",
  schedule: "정한 시각에 사이트가 자동으로 공개합니다.",
  publish: "누르는 즉시 공개됩니다.",
};
const CHROME_MODE_HINT: Record<PublishMode, string> = {
  draft: "블로그에 임시저장만 합니다. 공개되지 않습니다.",
  schedule: "임시저장한 뒤 블로그의 발행 창에서 예약합니다. 정한 시각에 블로그가 공개합니다.",
  publish: "임시저장한 뒤 바로 공개합니다.",
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

/** 올리는 방식(임시저장·예약발행·자동발행)과 예약 시각. minuteStep: 예약 분 단위 (네이버는 10분) */
function usePublishMode(minuteStep = 1, initialWhen?: string) {
  const [mode, setMode] = useState<PublishMode>("draft");
  const [when, setWhen] = useState(() => initialWhen ?? tomorrowNine());
  const at = new Date(when);
  const problem =
    mode !== "schedule"
      ? ""
      : !(at.getTime() > Date.now() + 60_000)
        ? "지금보다 1분 이상 뒤여야 합니다."
        : at.getMinutes() % minuteStep
          ? `${minuteStep}분 단위로 고를 수 있습니다.`
          : "";
  const request = () => ({ mode, scheduledAt: mode === "schedule" ? at.toISOString() : undefined });
  return { mode, setMode, when, setWhen, problem, minuteStep, request };
}

/** 올릴 블로그의 카테고리 목록과 고른 카테고리. 블로그를 바꾸면 그 블로그의 목록과 마지막으로 고른 카테고리를 다시 불러온다 */
function useCategories(platform: Platform | undefined) {
  const [list, setList] = useState<CategoryList | null>(null);
  const [selected, setSelected] = useState<BlogCategory | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setList(null);
    setSelected(undefined);
    setError("");
    if (!platform) return;
    let live = true;
    api
      .getCategories(platform)
      .then((r) => {
        if (!live) return;
        setList(r);
        setSelected(r.last);
      })
      .catch((e) => live && setError(errorText(e)));
    return () => {
      live = false;
    };
  }, [platform]);
  /** 네이버·티스토리: 블로그 에디터에서 목록을 다시 읽는다 */
  const refresh = async () => {
    if (!platform) return;
    setLoading(true);
    setError("");
    try {
      setList(await api.refreshCategories(platform));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };
  return { list, selected, setSelected, error, loading, refresh };
}

/** 카테고리 고르기. 네이버·티스토리는 "목록 불러오기"로 블로그에서 목록을 읽어 온다 */
function CategoryField({ cats, platform, mode }: { cats: ReturnType<typeof useCategories>; platform?: Platform; mode: PublishMode }) {
  if (!platform) return null;
  const fromEditor = platform !== "wordpress"; // 블로그 에디터에서 읽어 오는 블로그
  const items = cats.list?.categories ?? [];
  const sel = cats.selected;
  const options = sel && !items.some((c) => c.name === sel.name) ? [sel, ...items] : items;
  return (
    <div className="category-field">
      <label className="mini-label">
        카테고리
        <select
          className="inline-select"
          value={sel?.name ?? ""}
          disabled={!cats.list && !cats.error}
          onChange={(e) => cats.setSelected(options.find((c) => c.name === e.target.value))}
        >
          <option value="">블로그 기본 카테고리</option>
          {options.map((c) => (
            <option key={c.id ?? c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {fromEditor && (
        <button type="button" onClick={() => void cats.refresh()} disabled={cats.loading}>
          {cats.loading ? "불러오는 중..." : cats.list?.fetchedAt ? "목록 다시 불러오기" : "목록 불러오기"}
        </button>
      )}
      <span className="hint small">
        {cats.loading
          ? "블로그 글쓰기 화면을 열어 읽는 중입니다 (30초쯤 걸릴 수 있습니다). 글은 저장하지 않습니다."
          : fromEditor && !items.length
            ? "\"목록 불러오기\"를 누르면 블로그 에디터에서 카테고리를 읽어 옵니다."
            : platform === "naver" && mode === "draft" && sel
              ? "네이버는 발행 창에서만 카테고리를 고를 수 있어, 임시저장에는 적용되지 않습니다."
              : fromEditor
                ? "에디터에서 같은 이름을 찾아 고릅니다. 못 찾으면 기본 카테고리로 올리고 진행 로그에 \"확인 필요\"로 남깁니다."
                : "이 글에만 적용됩니다. 처음 값은 마지막으로 고른 카테고리, 없으면 설정의 기본 카테고리입니다."}
      </span>
      {platform === "naver" && mode !== "draft" && <span className="hint small">네이버 주제는 글 내용을 보고 자동으로 고릅니다.</span>}
      {cats.error && <pre className="error small category-error">{cats.error}</pre>}
    </div>
  );
}

/** 올리는 방식 고르기와 예약 시각 칸 */
function PublishModeFields({ pm, hints }: { pm: ReturnType<typeof usePublishMode>; hints: Record<PublishMode, string> }) {
  return (
    <div className="wp-publish">
      <div className="segmented" role="radiogroup" aria-label="올리는 방식">
        {(Object.keys(PUBLISH_MODE_LABEL) as PublishMode[]).map((m) => (
          <button key={m} type="button" className={pm.mode === m ? "on" : ""} onClick={() => pm.setMode(m)}>
            {PUBLISH_MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <span className="hint small">{hints[pm.mode]}</span>
      {pm.mode === "schedule" && (
        <label className="mini-label">
          공개 시각
          <input type="datetime-local" step={pm.minuteStep * 60} value={pm.when} onChange={(e) => pm.setWhen(e.target.value)} />
          {pm.problem && <span className="error small">{pm.problem}</span>}
        </label>
      )}
    </div>
  );
}

/** 워드프레스는 API로 올린다: 임시저장 / 예약발행 / 자동발행 중에서 고른다. 다시 등록하면 같은 글을 갱신한다. */
function WordPressNext({
  job,
  blogReady,
  onPost,
  onOpenSettings,
}: {
  job: Job;
  blogReady: boolean;
  onPost: (opts?: PostOpts) => void;
  onOpenSettings: () => void;
}) {
  const wp = job.wordpress;
  const pm = usePublishMode(1, wp?.scheduledAt ? toLocalInput(new Date(wp.scheduledAt)) : undefined);
  const cats = useCategories("wordpress");
  const { mode } = pm;

  const go = () => {
    if (mode === "publish" && !confirm("지금 바로 공개됩니다. 계속할까요?")) return;
    if (mode === "schedule" && !confirm(`${new Date(pm.when).toLocaleString("ko-KR")}에 공개되도록 예약합니다. 계속할까요?`)) return;
    onPost({ ...pm.request(), category: cats.selected });
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
        <PublishModeFields pm={pm} hints={WP_MODE_HINT} />
        <CategoryField cats={cats} platform="wordpress" mode={mode} />
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
        <button className={registered ? "" : "primary"} onClick={go} disabled={!blogReady || !!pm.problem}>
          {registered ? `다시 등록 (${PUBLISH_MODE_LABEL[mode]})` : `워드프레스에 ${PUBLISH_MODE_LABEL[mode]}`}
        </button>
      </div>
    </div>
  );
}
