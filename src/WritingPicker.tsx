import { LENGTH_PRESETS, MAX_TARGET_CHARS, MIN_TARGET_CHARS } from "../shared/length";
import { TONE_HINT, TONE_LABEL } from "../shared/labels";
import { WRITING_TONES, type WritingOptions, type WritingTone } from "../shared/types";

/** 고르는 중인 분량·말투. 분량은 입력 중인 글자 그대로 둔다 (지우고 다시 쓰는 중에 숫자로 바뀌지 않게) */
export interface WritingDraft {
  charsText: string;
  tone: WritingTone;
}

export const draftOf = (w: WritingOptions): WritingDraft => ({ charsText: String(w.targetChars), tone: w.tone });

/** 입력이 올바르면 분량·말투, 아니면 오류 문구 (서버 검사와 같은 기준) */
export function parseWriting(d: WritingDraft): { writing: WritingOptions; error: null } | { writing: null; error: string } {
  const n = Number(d.charsText);
  return Number.isInteger(n) && n >= MIN_TARGET_CHARS && n <= MAX_TARGET_CHARS
    ? { writing: { targetChars: n, tone: d.tone }, error: null }
    : { writing: null, error: `본문 분량은 ${MIN_TARGET_CHARS.toLocaleString()}~${MAX_TARGET_CHARS.toLocaleString()}자 사이로 입력하세요.` };
}

/** 본문 분량(프리셋 또는 직접 입력)과 말투 고르기 */
export function WritingPicker({ value, onChange, disabled }: { value: WritingDraft; onChange: (d: WritingDraft) => void; disabled?: boolean }) {
  const { error } = parseWriting(value);
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
        {TONE_LABEL[value.tone]}: {TONE_HINT[value.tone]}. 어느 말투든 존댓말로 쓰고, 확인된 사실만 씁니다. 분량은 확인된 자료가 부족하면 목표보다 짧아질 수 있습니다.
      </p>
    </>
  );
}
