import { useState } from "react";
import { LENGTH_PRESETS, MAX_TARGET_CHARS, MIN_TARGET_CHARS } from "../shared/length";
import { FORMAT_HINT, FORMAT_LABEL, TONE_HINT, TONE_LABEL } from "../shared/labels";
import { MAX_EXPERIENCE_CHARS, WRITING_FORMATS, WRITING_TONES, type WritingFormat, type WritingOptions, type WritingTone } from "../shared/types";
import { api } from "./api";
import { errorText } from "./labels";

/** 고르는 중인 분량·말투·글 형식. 분량은 입력 중인 글자 그대로 둔다 (지우고 다시 쓰는 중에 숫자로 바뀌지 않게) */
export interface WritingDraft {
  charsText: string;
  tone: WritingTone;
  format: WritingFormat;
  /** 리뷰 형식의 경험 메모 */
  experience: string;
}

export const draftOf = (w: WritingOptions): WritingDraft => ({ charsText: String(w.targetChars), tone: w.tone, format: w.format ?? "info", experience: w.experience ?? "" });

/** 입력이 올바르면 분량·말투, 아니면 오류 문구 (서버 검사와 같은 기준) */
export function parseWriting(d: WritingDraft): { writing: WritingOptions; error: null } | { writing: null; error: string } {
  const n = Number(d.charsText);
  return Number.isInteger(n) && n >= MIN_TARGET_CHARS && n <= MAX_TARGET_CHARS
    ? {
        writing: {
          targetChars: n,
          tone: d.tone,
          format: d.format,
          // 경험 메모는 리뷰 형식에서만 쓴다
          ...(d.format === "review" && d.experience.trim() ? { experience: d.experience.trim() } : {}),
        },
        error: null,
      }
    : { writing: null, error: `본문 분량은 ${MIN_TARGET_CHARS.toLocaleString()}~${MAX_TARGET_CHARS.toLocaleString()}자 사이로 입력하세요.` };
}

/** 본문 분량(프리셋 또는 직접 입력), 글 형식, 말투 고르기. topic은 리뷰 경험 메모 초안을 만들 때 쓴다 */
export function WritingPicker({ value, onChange, disabled, topic }: { value: WritingDraft; onChange: (d: WritingDraft) => void; disabled?: boolean; topic?: string }) {
  const { error } = parseWriting(value);
  const [drafting, setDrafting] = useState(false);
  const [memoError, setMemoError] = useState("");
  const canDraft = !!topic && topic.trim().length >= 2;
  async function draftMemo() {
    setMemoError("");
    setDrafting(true);
    try {
      const { memo } = await api.draftExperience(topic!.trim());
      onChange({ ...value, experience: memo });
    } catch (e) {
      setMemoError(errorText(e));
    } finally {
      setDrafting(false);
    }
  }
  return (
    <>
      <div className="option-row">
        <span>본문 분량 (공백 포함, 근사값)</span>
        <div className="length-picker">
          <div className="segmented" role="radiogroup" aria-label="본문 분량">
            {LENGTH_PRESETS.map((p) => (
              <button
                type="button"
                key={p.chars}
                className={value.charsText === String(p.chars) ? "on" : ""}
                disabled={disabled}
                onClick={() => onChange({ ...value, charsText: String(p.chars) })}
              >
                {p.label} ≈{p.chars.toLocaleString()}
              </button>
            ))}
          </div>
          <label className="chars-input">
            <input
              type="number"
              min={MIN_TARGET_CHARS}
              max={MAX_TARGET_CHARS}
              step={100}
              value={value.charsText}
              disabled={disabled}
              aria-label="본문 목표 글자수"
              aria-invalid={!!error}
              onChange={(e) => onChange({ ...value, charsText: e.target.value })}
            />
            자
          </label>
        </div>
      </div>
      {error && <span className="error small">{error}</span>}
      <div className="option-row">
        <span>글 형식</span>
        <div className="segmented" role="radiogroup" aria-label="글 형식">
          {WRITING_FORMATS.map((f) => (
            <button
              type="button"
              key={f}
              className={value.format === f ? "on" : ""}
              title={FORMAT_HINT[f]}
              disabled={disabled}
              onClick={() => onChange({ ...value, format: f })}
            >
              {FORMAT_LABEL[f]}
            </button>
          ))}
        </div>
      </div>
      {value.format === "review" && (
        <label className="field experience-field">
          <span className="field-label">내 경험 메모 (선택)</span>
          <textarea
            rows={5}
            maxLength={MAX_EXPERIENCE_CHARS}
            disabled={disabled}
            value={value.experience}
            placeholder={"직접 써 보고 느낀 점을 적어 주세요. 예)\n- 한 달 정도 사용\n- 좋았던 점: ...\n- 아쉬운 점: ...\n비워 두면 경험담 없이 공개된 자료로만 평가합니다."}
            onChange={(e) => onChange({ ...value, experience: e.target.value })}
          />
          <span className="field-actions">
            <button type="button" disabled={disabled || drafting || !canDraft} onClick={() => void draftMemo()}>
              {drafting ? "조사해서 초안 만드는 중…" : "AI로 메모 초안 만들기"}
            </button>
            <span className="hint small">
              AI가 웹에서 조사해 장단점을 채워 줍니다(1~3분). 사용 기간·겪은 일 같은 개인 경험은 만들지 않으니, 실제로 겪은 내용을 덧붙이거나 고쳐 쓰세요. 메모에 있는 것만 후기로 쓰입니다.
            </span>
          </span>
          {!canDraft && <span className="hint small">글 주제를 먼저 입력하면 초안을 만들 수 있습니다.</span>}
          {memoError && <span className="error small">{memoError}</span>}
        </label>
      )}
      <div className="option-row">
        <span>말투</span>
        <div className="segmented" role="radiogroup" aria-label="말투">
          {WRITING_TONES.map((t) => (
            <button
              type="button"
              key={t}
              className={value.tone === t ? "on" : ""}
              title={TONE_HINT[t]}
              disabled={disabled}
              onClick={() => onChange({ ...value, tone: t })}
            >
              {TONE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <p className="hint small">
        {FORMAT_LABEL[value.format]}: {FORMAT_HINT[value.format]}. {TONE_LABEL[value.tone]}: {TONE_HINT[value.tone]}. 어느 말투든 존댓말로 쓰고, 확인된 사실만 씁니다. 분량은 확인된 자료가 부족하면 목표보다 짧아질 수 있습니다.
      </p>
    </>
  );
}
