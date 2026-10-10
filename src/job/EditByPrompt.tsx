import { useState } from "react";
import { blockText, collapseSame, diffBlocks } from "../../shared/blockDiff";
import { DEFAULT_TARGET_CHARS, maxBodyChars, targetCharsOf } from "../../shared/length";
import { TONE_LABEL } from "../../shared/labels";
import type { EditProposal, Job, Post, WritingOptions } from "../../shared/types";
import { draftOf, parseWriting, WritingPicker } from "../WritingPicker";

/** 고칠 부분 이름: "글 전체" 또는 "#2~#5 (블록 4개)" */
function rangeLabel(range: { start: number; end: number } | undefined) {
  if (!range) return "글 전체";
  const n = range.end - range.start + 1;
  return `#${range.start}${n > 1 ? `~#${range.end}` : ""} (블록 ${n}개)`;
}

/** 분량·말투를 바꿔 다시 쓰는 제안이면 "분량 약 4,000자 · 스토리형" */
const writingLabel = (w: WritingOptions) => `분량 약 ${w.targetChars.toLocaleString()}자 · ${TONE_LABEL[w.tone]}`;

/** 선택한 블록 번호들을 처음~끝 범위로 (사이의 블록도 포함한다). 선택이 없으면 글 전체 */
const rangeOf = (selected: number[]) => (selected.length ? { start: Math.min(...selected), end: Math.max(...selected) } : undefined);

/**
 * 프롬프트로 글 고치기: 수정 요청을 쓰면 Claude가 글 전체 또는 선택한 블록을 고치거나 내용을 더하고(웹 검색 포함),
 * 결과는 바뀐 부분만 비교해 보여 준다. "적용"을 눌러야 글에 들어간다.
 */
export function EditByPrompt({
  job,
  draft,
  selected,
  disabled,
  lastLog,
  onStart,
  onApply,
  onDiscard,
  onCancel,
}: {
  job: Job;
  draft: Post;
  /** 편집 화면에서 고른 블록 번호 */
  selected: number[];
  /** 다른 작업이 진행 중이라 시작할 수 없다 */
  disabled: boolean;
  lastLog?: string;
  /** writing이 있으면 그 분량·말투로 글 전체를 다시 쓴다 (prompt는 추가 요청) */
  onStart: (prompt: string, range: { start: number; end: number } | undefined, writing?: WritingOptions) => void;
  onApply: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  // 분량·말투 다시 쓰기 카드의 추가 요청 (프롬프트로 글 고치기 카드의 요청과 따로 둔다)
  const [rewritePrompt, setRewritePrompt] = useState("");
  const [rewrite, setRewrite] = useState(() => draftOf(job.writingOptions ?? { targetChars: DEFAULT_TARGET_CHARS, tone: "info" }));
  const rewriteWriting = parseWriting(rewrite).writing;
  const p = job.editProposal;
  // 다시 쓰는 제안은 새 목표의 상한으로 본다 (적용하면 그 목표가 이 글의 목표가 된다)
  const maxChars = maxBodyChars(p?.writing?.targetChars ?? targetCharsOf(job));
  /** 실패했거나 버릴 제안의 요청을 해당 카드의 입력 칸에 되돌린다 */
  const restore = (q: EditProposal) => {
    if (q.writing) {
      setRewritePrompt(q.prompt);
      setRewrite(draftOf(q.writing));
    } else setPrompt(q.prompt);
    onDiscard();
  };
  const running = p?.status === "running";
  const range = rangeOf(selected);
  const sparse = selected.length > 0 && selected.length < (range ? range.end - range.start + 1 : 0);
  // 제안이 만드는 중이거나 다른 작업이 진행 중이면 두 카드 모두 새로 시작할 수 없다
  const locked = disabled || running;

  /** 제안의 진행·실패·결과: 그 제안을 시작한 카드 안에 보인다 */
  const proposalView = (mine: boolean) => {
    if (!p || mine !== !!p.writing) return null;
    return (
      <>
        {running && (
          <div className="edit-running">
            <p className="current-activity">
              <span className="spinner" /> Claude가 {p.writing ? `글 전체를 ${writingLabel(p.writing)}(으)로 다시 쓰는` : `${rangeLabel(p.range)}를 고치는`} 중입니다 (웹 검색을 하면 몇 분 걸립니다). 끝나도 바로 적용되지 않습니다.{" "}
              {lastLog && <span className="hint small">{lastLog}</span>}
            </p>
            {p.prompt && <p className="hint small">요청: {p.prompt}</p>}
            <button onClick={onCancel}>중지</button>
          </div>
        )}

        {p.status === "failed" && (
          <div className="edit-result failed">
            <p className="error">{p.error}</p>
            {p.writing && <p className="hint small">다시 쓰기: {writingLabel(p.writing)}</p>}
            {p.prompt && <p className="hint small">요청: {p.prompt}</p>}
            <div className="edit-actions">
              <button onClick={() => restore(p)}>요청을 고쳐서 다시 하기</button>
              <button className="ghost" onClick={onDiscard}>
                닫기
              </button>
            </div>
          </div>
        )}

        {p.status === "ready" && p.before && p.after && (
          <div className="edit-result">
            <p>
              {p.writing ? (
                <>
                  <b>글 전체</b>를 {writingLabel(p.writing)}(으)로 다시 썼습니다. 적용하면 이 글의 목표 분량·말투도 바뀝니다.
                </>
              ) : (
                <>
                  <b>{rangeLabel(p.range)}</b>를 고쳤습니다.
                </>
              )}{" "}
              {p.note}
            </p>
            {p.prompt && <p className="hint small">요청: {p.prompt}</p>}
            {p.title !== undefined && p.title !== draft.title && (
              <p className="diff-title">
                제목: <del>{draft.title}</del> → <ins>{p.title}</ins>
              </p>
            )}
            {p.summary !== undefined && p.summary !== draft.summary && (
              <p className="diff-title">
                요약: <del>{draft.summary}</del> → <ins>{p.summary}</ins>
              </p>
            )}
            <div className="diff">
              {collapseSame(diffBlocks(p.before, p.after)).map((r, i) =>
                r.kind === "skip" ? (
                  <div key={i} className="diff-skip">
                    … 바뀌지 않은 블록 {r.count}개 …
                  </div>
                ) : (
                  <div key={i} className={`diff-row ${r.kind}`}>
                    <span className="diff-mark">{r.kind === "add" ? "＋" : r.kind === "del" ? "－" : ""}</span>
                    <pre>{blockText(r.block)}</pre>
                  </div>
                ),
              )}
            </div>
            {p.charsAfter !== undefined && (
              <p className={`hint small ${p.charsAfter > maxChars ? "error" : ""}`}>
                본문 {p.charsBefore?.toLocaleString()}자 → {p.charsAfter.toLocaleString()}자
                {p.charsAfter > maxChars && ` · 상한(${maxChars.toLocaleString()}자)을 넘습니다. 적용한 뒤 직접 줄여 주세요.`}
              </p>
            )}
            <div className="edit-actions">
              <button className="primary" onClick={onApply}>
                적용
              </button>
              <button onClick={() => restore(p)}>요청을 고쳐서 다시 만들기</button>
              <button className="ghost" onClick={onDiscard}>
                버리기
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* 1. 프롬프트로 글 고치기: 요청대로 글 전체 또는 고른 블록을 고친다 */}
      <details className="edit-card" open={(!!p && !p.writing) || undefined}>
        <summary>프롬프트로 글 고치기 · 내용 추가</summary>
        {!(running && !p.writing) && (
          <>
            <label className="mini-label">
              어떻게 고칠까요? (예: "두 번째 소제목에 신청 기간을 더 자세히", "마지막에 자주 묻는 질문 3개 추가")
              <textarea
                rows={3}
                maxLength={2000}
                value={prompt}
                disabled={locked}
                placeholder="고칠 내용이나 더할 내용을 적어 주세요. 필요하면 웹에서 확인해서 씁니다."
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <div className="edit-actions">
              <button className="primary" disabled={locked || prompt.trim().length < 2} onClick={() => onStart(prompt.trim(), range)}>
                {range ? `선택한 부분 고치기 (${rangeLabel(range)})` : "글 전체 고치기"}
              </button>
              <span className="hint small">
                {range
                  ? sparse
                    ? "고르지 않은 사이의 블록도 포함해서 고칩니다."
                    : "편집 화면에서 고른 블록만 고칩니다."
                  : "편집 화면에서 블록 앞의 칸을 고르면 그 부분만 고칠 수 있습니다."}{" "}
                이미지는 새로 만들거나 지우지 않고 그대로 둡니다.
              </span>
            </div>
          </>
        )}
        {proposalView(false)}
      </details>

      {/* 2. 분량·말투 바꾸기: 처음 조사한 자료로 글 전체를 새 분량·말투로 다시 쓴다 */}
      <details className="edit-card" open={!!p?.writing || undefined}>
        <summary>분량·말투 바꾸기</summary>
        {!(running && p.writing) && (
          <>
            <WritingPicker value={rewrite} onChange={setRewrite} disabled={locked} />
            <label className="mini-label">
              추가로 반영할 요청 (선택)
              <textarea
                rows={2}
                maxLength={2000}
                value={rewritePrompt}
                disabled={locked}
                placeholder="예) 도입부는 짧게, 표는 그대로 유지"
                onChange={(e) => setRewritePrompt(e.target.value)}
              />
            </label>
            <div className="edit-actions">
              <button className="primary" disabled={locked || !rewriteWriting} onClick={() => rewriteWriting && onStart(rewritePrompt.trim(), undefined, rewriteWriting)}>
                이 분량·말투로 다시 쓰기
              </button>
              <span className="hint small">
                처음 조사한 자료로 글 전체를 다시 씁니다. 이미지·태그는 그대로이고, 비교해 보고 적용해야 바뀝니다.
              </span>
            </div>
          </>
        )}
        {proposalView(true)}
      </details>
    </>
  );
}
