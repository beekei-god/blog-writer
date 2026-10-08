import { useEffect, useRef, useState } from "react";
import { BUSY_STATUSES, aiFor, type ImageProvider, type ImageStyle, type Job, type Platform, type Post, type PublishMode } from "../../shared/types";
import { countBodyChars, MAX_BODY_CHARS } from "../../shared/length";
import { PLATFORM_LABEL } from "../../shared/labels";
import { api } from "../api";
import { ExtensionStatus } from "../ExtensionStatus";
import { LoginWindow } from "../LoginWindow";
import { errorText } from "../labels";
import { JobUsage } from "./JobUsage";
import { NextStep } from "./NextStep";
import { PostEditor } from "./PostEditor";
import { CopyBar, Preview } from "./Preview";
import { Progress } from "./Progress";
import { Report } from "./Report";
import { AiPicker, type ImageToolsProps } from "./images";

interface Props {
  job: Job;
  /** 블로그마다 연결되어 있는지 (ID·사이트 주소가 설정됨). 글을 올릴 때마다 올릴 블로그를 직접 고른다. */
  ready: Record<Platform, boolean>;
  onChange: () => Promise<void>;
  onDeleted: () => void;
  onOpenSettings: () => void;
}


type SaveState = "saved" | "pending" | "saving" | "error";

export function JobDetail({ job, ready, onChange, onDeleted, onOpenSettings }: Props) {
  const [draft, setDraft] = useState<Post | null>(job.post ?? null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const busy = BUSY_STATUSES.includes(job.status);

  // ───── 자동 저장: 입력을 멈추고 1초 뒤 저장. 저장은 순서대로 하나씩 보낸다. ─────
  const pending = useRef<Post | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const flush = () => {
    window.clearTimeout(timer.current);
    chain.current = chain.current
      .catch(() => {})
      .then(async () => {
        const p = pending.current;
        if (!p) return;
        pending.current = null;
        setSaveState("saving");
        try {
          await api.savePost(job.id, p);
          setSaveState(pending.current ? "pending" : "saved");
        } catch (e) {
          if (!pending.current) pending.current = p;
          setSaveState("error");
          setError(`자동 저장 실패: ${errorText(e)}`);
          throw e;
        }
      });
    return chain.current;
  };

  const edit = (next: Post) => {
    setDraft(next);
    pending.current = next;
    setSaveState("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush().then(onChange).catch(() => {}), 1000);
  };

  // 화면을 떠날 때 남은 수정 내용을 저장
  useEffect(() => {
    const id = job.id;
    return () => {
      window.clearTimeout(timer.current);
      if (pending.current) void api.savePost(id, pending.current).catch(() => {});
    };
  }, [job.id]);

  useEffect(() => {
    if (saveState === "saved") return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [saveState]);

  // 서버 쪽 초안이 바뀌면(작성 완료, 이미지 생성 등) 편집 중이 아닐 때 가져온다.
  useEffect(() => {
    if (!pending.current && job.post) setDraft(job.post);
  }, [job.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await onChange();
    } catch (e) {
      setError(errorText(e));
    }
  }

  // 이 글을 올릴 곳. 기본 블로그는 없고 올릴 때마다 직접 고른다.
  // 이미 워드프레스에 올린 기록이 있으면 그것은 사실이므로 그 블로그를 보여 준다.
  const [destPick, setDestPick] = useState<Platform | null>(job.wordpress ? "wordpress" : null);
  const dest: Platform | undefined = destPick ?? undefined;
  const postToBlog = (opts?: { mode?: PublishMode; scheduledAt?: string }) =>
    run(async () => {
      if (!dest) throw new Error("올릴 블로그를 선택하세요.");
      await flush();
      await api.postToBlog(job.id, { ...opts, platform: dest });
    });

  type RegenOpts = {
    provider?: ImageProvider;
    style?: ImageStyle;
    thumbnailProvider?: ImageProvider;
    thumbnailStyle?: ImageStyle;
    onlyFailed: boolean;
    addThumbnail?: boolean;
  };
  const regenerate = (opts: RegenOpts) =>
    run(async () => {
      await flush();
      await api.regenerateImages(job.id, opts);
    });
  // 이미지 한 장: target은 "thumbnail" 또는 "body-<블록 번호>"
  const thumbAi = aiFor(job.imageOptions, "thumbnail");
  const bodyAi = aiFor(job.imageOptions, "body");
  const imageTools: ImageToolsProps = {
    // 이미지를 한 장씩 다시 만드는 중이면 다른 이미지는 더 만들거나 올릴 수 있다 (만드는 중인 이미지는 그 자리에서 숨긴다).
    disabled: busy && !job.imageRunsOnly,
    defaults: { thumbnail: thumbAi, body: bodyAi },
    onRegenerate: (target, ai) =>
      run(async () => {
        await flush();
        await api.regenerateImage(job.id, target, ai);
      }),
    onUpload: (target, file) =>
      run(async () => {
        await flush();
        await api.uploadImage(job.id, target, file);
      }),
  };
  const cancel = () => {
    if (!confirm("진행 중인 작업을 중지할까요?\n지금까지 만든 초안과 이미지는 그대로 남습니다.")) return;
    void run(() => api.cancel(job.id));
  };
  const [missingThumb, setMissingThumb] = useState<{ provider: ImageProvider; style: ImageStyle }>(thumbAi);

  const retry = () => {
    if (job.post && !confirm("자료 조사부터 다시 해서 새 초안을 만듭니다.\n지금 초안(직접 고친 내용 포함)은 새 초안으로 바뀝니다. 계속할까요?")) return;
    void run(() => api.retry(job.id));
  };

  const remove = async () => {
    if (!confirm("이 글을 삭제할까요? 초안과 생성된 이미지가 모두 지워집니다.")) return;
    window.clearTimeout(timer.current);
    pending.current = null;
    try {
      await api.remove(job.id);
      onDeleted();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const lastLog = job.logs[job.logs.length - 1]?.message;
  const chars = draft ? countBodyChars(draft) : 0;

  return (
    <div className="detail">
      <header>
        <div className="title-wrap">
          <h2>{draft?.title || job.topic}</h2>
          {draft?.title && draft.title !== job.topic && <p className="hint small">주제: {job.topic}</p>}
        </div>
        <div className="actions">
          {draft && (
            <span className={`save-state ${saveState}`}>
              {saveState === "saved" ? "저장됨" : saveState === "error" ? "저장 실패" : "저장 중…"}
            </span>
          )}
          {busy && (
            <button className="danger" onClick={cancel} title="진행 중인 자료 조사·글 작성·이미지 생성·블로그 입력을 멈춥니다">
              작업 중지
            </button>
          )}
          <button className="danger ghost" onClick={remove} disabled={busy}>
            삭제
          </button>
        </div>
      </header>

      <Progress job={job} />

      {busy && lastLog && (
        <p className="current-activity">
          <span className="spinner" /> {lastLog}
        </p>
      )}
      {(error || job.error) && <p className="error banner">{error || job.error}</p>}
      {/Claude in Chrome 확장 프로그램|확장 프로그램에 연결/.test(error || job.error || "") && <ExtensionStatus compact />}
      {/* 자동 조작으로 올리다 실패했으면 (대부분 앱 전용 크롬의 블로그 로그인) 로그인 창을 바로 열 수 있게 한다 */}
      {!busy && job.error && (dest === "naver" || dest === "tistory") && job.logs.some((l) => l.message.includes("자동 조작")) && (
        <div className="next-step warn">
          <div>
            <b>자동 조작으로 올리지 못했습니다.</b> 앱 전용 크롬에 블로그 로그인이 안 되어 있을 수 있습니다. 로그인 창에서 로그인한 뒤 다시
            임시저장하세요.
            <LoginWindow platform={dest} compact />
          </div>
        </div>
      )}

      <NextStep
        job={job}
        hasDraft={!!draft}
        // 올릴 블로그를 고르기 전에는 "연결된 블로그가 하나라도 있는지"를 본다
        blogReady={dest ? ready[dest] : ready.naver || ready.tistory || ready.wordpress}
        platform={dest}
        destPicker={
          draft && !busy && job.status !== "published" ? (
            <div className="dest-picker">
              <span className="field-label">올릴 곳</span>
              <div className="segmented" role="radiogroup" aria-label="올릴 곳">
                {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={dest === p ? "on" : ""}
                    title={ready[p] ? undefined : "설정에서 먼저 연결하세요"}
                    onClick={() => setDestPick(p)}
                  >
                    {PLATFORM_LABEL[p]}
                    {!ready[p] && <span className="failed-mark"> · 미설정</span>}
                  </button>
                ))}
              </div>
            </div>
          ) : null
        }
        busy={busy}
        onPost={postToBlog}
        onRetry={retry}
        onOpenSettings={onOpenSettings}
        onSetStatus={(status) => run(() => api.setStatus(job.id, status))}
      />

      <details className="logs">
        <summary>진행 로그 ({job.logs.length})</summary>
        <ol>
          {job.logs.map((l, i) => (
            <li key={i}>
              <time>{new Date(l.at).toLocaleTimeString("ko-KR")}</time> {l.message}
            </li>
          ))}
        </ol>
      </details>

      {draft && (
        <>
          <div className="draft-bar">
            <div className="segmented">
              <button className={mode === "preview" ? "on" : ""} onClick={() => setMode("preview")}>
                미리보기
              </button>
              <button className={mode === "edit" ? "on" : ""} onClick={() => setMode("edit")} disabled={busy}>
                편집
              </button>
            </div>
            <span className={`char-count ${chars > MAX_BODY_CHARS ? "over" : ""}`} title="공백 포함, 참고 자료 목록 제외">
              본문 {chars.toLocaleString()} / {MAX_BODY_CHARS.toLocaleString()}자
              {chars > MAX_BODY_CHARS && " · 분량 초과"}
            </span>
          </div>

          <CopyBar post={draft} />

          {!draft.thumbnail && !busy && (
            <div className="thumb-missing">
              <div>
                <b>썸네일이 없습니다.</b> 블로그 본문 맨 위에 들어갈 대표 이미지를 만들 수 있습니다. 다른 이미지는 그대로 둡니다.
              </div>
              <AiPicker
                provider={missingThumb.provider}
                style={missingThumb.style}
                onChange={(p, s) => setMissingThumb({ provider: p, style: s })}
              />
              <button
                className="primary"
                onClick={() =>
                  regenerate({ thumbnailProvider: missingThumb.provider, thumbnailStyle: missingThumb.style, onlyFailed: true, addThumbnail: true })
                }
              >
                썸네일 만들기
              </button>
            </div>
          )}

          {mode === "preview" || busy ? (
            <Preview
              jobId={job.id}
              post={draft}
              generating={job.status === "generating_images" ? (job.generatingImages ?? []) : []}
              regenerating={job.status === "generating_images" ? (job.regeneratingImages ?? []) : []}
              tools={imageTools}
            />
          ) : (
            <PostEditor jobId={job.id} post={draft} onChange={edit} disabled={busy} tools={imageTools} />
          )}

          <Report post={draft} onChange={edit} disabled={busy} />
        </>
      )}

      {job.sources.length > 0 && (
        <details>
          <summary>수집한 출처 ({job.sources.length})</summary>
          <ul className="sources">
            {job.sources.map((s) => (
              <li key={s.url}>
                {s.kind && <span className={`kind-badge ${s.kind}`}>{SOURCE_KIND[s.kind]}</span>}
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      {job.researchNotes && (
        <details>
          <summary>리서치 노트</summary>
          <pre className="notes">{job.researchNotes}</pre>
        </details>
      )}

      <JobUsage jobId={job.id} status={job.status} />

      {job.rulesSnapshot && (
        <details>
          <summary>이 글에 적용된 글쓰기 규칙</summary>
          <pre className="notes">{job.rulesSnapshot}</pre>
        </details>
      )}

      {draft && (
        <div className="footer-actions">
          <button onClick={retry} disabled={busy}>
            자료 조사부터 다시 하기
          </button>
        </div>
      )}
    </div>
  );
}

const SOURCE_KIND = { official: "공식", press: "언론", blog: "블로그·참고용", other: "기타" } as const;
