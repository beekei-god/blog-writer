import { useState } from "react";
import { blockText, collapseSame, diffBlocks } from "../../shared/blockDiff";
import { MAX_BODY_CHARS } from "../../shared/length";
import type { Job, Post } from "../../shared/types";

/** 고칠 부분 이름: "글 전체" 또는 "#2~#5 (블록 4개)" */
function rangeLabel(range: { start: number; end: number } | undefined) {
  if (!range) return "글 전체";
  const n = range.end - range.start + 1;
  return `#${range.start}${n > 1 ? `~#${range.end}` : ""} (블록 ${n}개)`;
}

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
  onStart: (prompt: string, range: { start: number; end: number } | undefined) => void;
  onApply: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const p = job.editProposal;
  const running = p?.status === "running";
  const range = rangeOf(selected);
  const sparse = selected.length > 0 && selected.length < (range ? range.end - range.start + 1 : 0);

  return (
    <details className="edit-card" open={!!p || undefined}>
      <summary>프롬프트로 글 고치기 · 내용 추가</summary>

      {running ? (
        <div className="edit-running">
          <p className="current-activity">
            <span className="spinner" /> Claude가 {rangeLabel(p.range)}를 고치는 중입니다 (웹 검색을 하면 몇 분 걸립니다). 끝나도 바로 적용되지 않습니다. {lastLog && <span className="hint small">{lastLog}</span>}
          </p>
          <p className="hint small">요청: {p.prompt}</p>
          <button onClick={onCancel}>중지</button>
        </div>
      ) : (
        <>
          <label className="mini-label">
            어떻게 고칠까요? (예: "두 번째 소제목에 신청 기간을 더 자세히", "전체를 더 친근한 말투로", "마지막에 자주 묻는 질문 3개 추가")
            <textarea
              rows={3}
              maxLength={2000}
              value={prompt}
              disabled={disabled}
              placeholder="고칠 내용이나 더할 내용을 적어 주세요. 필요하면 웹에서 확인해서 씁니다."
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <div className="edit-actions">
            <button className="primary" disabled={disabled || prompt.trim().length < 2} onClick={() => onStart(prompt.trim(), range)}>
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

      {p?.status === "failed" && (
        <div className="edit-result failed">
          <p className="error">{p.error}</p>
          <p className="hint small">요청: {p.prompt}</p>
          <div className="edit-actions">
            <button
              onClick={() => {
                setPrompt(p.prompt);
                onDiscard();
              }}
            >
              요청을 고쳐서 다시 하기
            </button>
            <button className="ghost" onClick={onDiscard}>
              닫기
            </button>
          </div>
        </div>
      )}

      {p?.status === "ready" && p.before && p.after && (
        <div className="edit-result">
          <p>
            <b>{rangeLabel(p.range)}</b>를 고쳤습니다. {p.note}
          </p>
          <p className="hint small">요청: {p.prompt}</p>
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
            <p className={`hint small ${p.charsAfter > MAX_BODY_CHARS ? "error" : ""}`}>
              본문 {p.charsBefore?.toLocaleString()}자 → {p.charsAfter.toLocaleString()}자
              {p.charsAfter > MAX_BODY_CHARS && ` · 상한(${MAX_BODY_CHARS.toLocaleString()}자)을 넘습니다. 적용한 뒤 직접 줄여 주세요.`}
            </p>
          )}
          <div className="edit-actions">
            <button className="primary" onClick={onApply}>
              적용
            </button>
            <button
              onClick={() => {
                setPrompt(p.prompt);
                onDiscard();
              }}
            >
              요청을 고쳐서 다시 만들기
            </button>
            <button className="ghost" onClick={onDiscard}>
              버리기
            </button>
          </div>
        </div>
      )}
    </details>
  );
}
