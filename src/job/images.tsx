import { useEffect, useRef, useState } from "react";
import { STYLES_BY_PROVIDER, fitStyle, type ImageMethod, type ImageProvider, type ImageSpec, type ImageStyle } from "../../shared/types";
import { classifyImageError, IMAGE_ERROR_INFO, type ImageErrorKind } from "../../shared/imageErrors";
import { api, type ImageApiStatus } from "../api";
import { PROVIDER_LABEL, STYLE_LABEL } from "../labels";

// ───────────────────────── 이미지 실패 · 한 장씩 다시 만들기 ─────────────────────────

// "unknown"으로 저장된 예전 기록은 분류 규칙이 늘어났을 수 있으니 메시지로 다시 분류한다.
const kindOf = (spec: ImageSpec): ImageErrorKind =>
  spec.errorKind && spec.errorKind !== "unknown" ? spec.errorKind : classifyImageError(spec.error);
/** 화면에 보여 줄 실패 이유: 실제 오류 메시지의 첫 줄 (없으면 원인 종류의 제목) */
const reasonOf = (spec: ImageSpec): string => spec.error?.split("\n")[0].trim() || IMAGE_ERROR_INFO[kindOf(spec)].title;
const PROVIDERS = Object.keys(PROVIDER_LABEL) as ImageProvider[];


export function FailedPlaceholder({ spec, generating }: { spec: ImageSpec; generating?: boolean }) {
  if (generating) {
    return (
      <div className="image-placeholder">
        <span className="spinner" /> 이미지를 만드는 중입니다
      </div>
    );
  }
  if (!spec.error) return <div className="image-placeholder">이미지가 아직 없습니다</div>;
  // 실패 이유와 해결 방법을 이미지 자리에 바로 보여 준다. 다시 만들기는 바로 아래 "이미지 다시 생성"에서 한 장씩 한다.
  return (
    <div className="image-placeholder failed">
      <b>⚠ {reasonOf(spec)}</b>
      {spec.errorProvider && <span> ({PROVIDER_LABEL[spec.errorProvider]})</span>}
      <br />
      <span className="small-note">{IMAGE_ERROR_INFO[kindOf(spec)].advice}</span>
    </div>
  );
}

/** 이미지 API 키 연결 상태 (Gemini/ChatGPT를 API로 만들 수 있는지) */
function useImageApi() {
  const [status, setStatus] = useState<ImageApiStatus | null>(null);
  useEffect(() => {
    api.getImageApi().then(setStatus).catch(() => {});
  }, []);
  return status;
}

/** AI와 스타일 고르기 */
export function AiPicker({
  provider,
  style,
  onChange,
}: {
  provider: ImageProvider;
  style: ImageStyle;
  onChange: (provider: ImageProvider, style: ImageStyle) => void;
}) {
  return (
    <div className="ai-picker">
      <div className="segmented" role="radiogroup" aria-label="이미지를 만들 AI">
        {PROVIDERS.map((p) => (
          <button key={p} type="button" className={provider === p ? "on" : ""} onClick={() => onChange(p, fitStyle(p, style))}>
            {PROVIDER_LABEL[p]}
          </button>
        ))}
      </div>
      <select
        className="inline-select"
        value={style}
        disabled={STYLES_BY_PROVIDER[provider].length === 1}
        onChange={(e) => onChange(provider, e.target.value as ImageStyle)}
        aria-label="이미지 스타일"
        title={provider === "claude" ? "Claude는 플랫 일러스트만 그릴 수 있습니다" : undefined}
      >
        {STYLES_BY_PROVIDER[provider].map((st) => (
          <option key={st} value={st}>
            {STYLE_LABEL[st]}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * 고른 AI로 만드는 버튼. Gemini/ChatGPT는 "API로"와 "크롬에서" 두 버튼을 나란히 보여 주어 누르는 버튼으로 방법을 정한다.
 * 설정에서 API 키를 연결하지 않았으면 API 버튼은 누를 수 없게 하고 툴팁으로 이유를 알려 준다.
 */
function MakeButtons({
  provider,
  apiStatus,
  verb,
  disabled,
  onMake,
}: {
  provider: ImageProvider;
  apiStatus: ImageApiStatus | null;
  /** "다시 만들기", "만들기" 등 */
  verb: string;
  disabled?: boolean;
  onMake: (method: ImageMethod) => void;
}) {
  const name = PROVIDER_LABEL[provider];
  if (provider === "claude") {
    return (
      <button type="button" className="primary" disabled={disabled} onClick={() => onMake("api")}>
        {name}로 {verb}
      </button>
    );
  }
  const hasApi = !!apiStatus?.[provider].configured;
  const why = !apiStatus
    ? "API 연결 상태를 확인하는 중입니다."
    : `${name} API 키가 연결되어 있지 않습니다. 설정 → 이미지 API 설정에서 키를 연결하면 쓸 수 있습니다.`;
  return (
    <>
      {/* 누를 수 없는 버튼에는 툴팁이 뜨지 않는 브라우저가 있어 감싼 요소에 툴팁을 단다 */}
      <span className="tip-wrap" title={hasApi ? undefined : why}>
        <button type="button" className={hasApi ? "primary" : ""} disabled={disabled || !hasApi} onClick={() => onMake("api")}>
          {name} API로 {verb}
        </button>
      </span>
      <button type="button" className={hasApi ? "" : "primary"} disabled={disabled} onClick={() => onMake("chrome")}>
        크롬에서 {name}로 {verb}
      </button>
    </>
  );
}

type ImageAi = { provider: ImageProvider; style: ImageStyle };
export type ImageToolsProps = {
  disabled: boolean;
  /** AI 고르기 창의 처음 값 (글의 썸네일·본문 이미지 설정) */
  defaults: { thumbnail: ImageAi; body: ImageAi };
  onRegenerate: (target: string, ai: ImageAi & { method: ImageMethod }) => void;
  onUpload: (target: string, file: File) => void;
};

/** 이미지 한 장 다시 만들기(AI·스타일 선택) · 직접 올리기. again: 이미 만들었거나 실패한 이미지면 "다시 만들기" */
export function ImageTools({ target, tools, again }: { target: string; tools: ImageToolsProps; again: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const initial = target === "thumbnail" ? tools.defaults.thumbnail : tools.defaults.body;
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState<ImageAi>(initial);
  const apiStatus = useImageApi();
  const runText = again ? "다시 만들기" : "만들기";
  if (open) {
    return (
      <div className="image-actions open">
        <AiPicker provider={ai.provider} style={ai.style} onChange={(provider, style) => setAi({ provider, style })} />
        <div className="retry-actions">
          <MakeButtons
            provider={ai.provider}
            apiStatus={apiStatus}
            verb={runText}
            disabled={tools.disabled}
            onMake={(method) => {
              setOpen(false);
              tools.onRegenerate(target, { ...ai, method });
            }}
          />
          <button type="button" className="ghost" onClick={() => setOpen(false)}>
            취소
          </button>
        </div>
        <span className="hint small">이 이미지에만 적용됩니다.</span>
      </div>
    );
  }
  return (
    <div className="image-tools">
      <button
        type="button"
        disabled={tools.disabled}
        onClick={() => {
          setAi(initial);
          setOpen(true);
        }}
      >
        {again ? "이미지 다시 생성" : "이미지 생성"}
      </button>
      <button type="button" disabled={tools.disabled} onClick={() => input.current?.click()}>
        직접 올리기
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) tools.onUpload(target, file);
        }}
      />
    </div>
  );
}

export function PreviewImage({
  jobId,
  spec,
  thumbnail,
  generating,
  regenerating,
  target,
  tools,
}: {
  jobId: string;
  spec: ImageSpec;
  thumbnail?: boolean;
  generating?: boolean;
  regenerating?: boolean;
  target: string;
  tools: ImageToolsProps;
}) {
  return (
    <figure className={`pv-image ${thumbnail ? "thumb" : ""}`}>
      {spec.file ? (
        <img src={`/api/images/${jobId}/${encodeURIComponent(spec.file)}`} alt={spec.alt} />
      ) : (
        <FailedPlaceholder spec={spec} generating={generating} />
      )}
      {thumbnail && <figcaption>썸네일{spec.headline ? ` · 문구 “${spec.headline}”` : ""}</figcaption>}
      {regenerating && spec.file && (
        <p className="current-activity">
          <span className="spinner" /> 이 이미지를 다시 만드는 중입니다
        </p>
      )}
      {!tools.disabled && !generating && !regenerating && <ImageTools target={target} tools={tools} again={!!spec.file || !!spec.error} />}
    </figure>
  );
}
