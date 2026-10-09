import { useEffect, useRef, useState } from "react";
import { STYLES_BY_PROVIDER, fitStyle, type ImageMethod, type ImageProvider, type ImageSpec, type ImageStyle } from "../../shared/types";
import { classifyImageError, IMAGE_ERROR_INFO, type ImageErrorKind } from "../../shared/imageErrors";
import { api, imageUrl, type ImageApiStatus } from "../api";
import { PROVIDER_LABEL, STYLE_LABEL } from "../labels";

// ───────────────────────── 이미지 실패 · 한 장씩 다시 만들기 ─────────────────────────

// "unknown"으로 저장된 예전 기록은 분류 규칙이 늘어났을 수 있으니 메시지로 다시 분류한다.
// 사이트 오류가 생기기 전에는 사이트 오류도 "ui_changed"로 저장했으므로 메시지가 사이트 오류면 그것으로 본다.
const kindOf = (spec: ImageSpec): ImageErrorKind => {
  const byMessage = classifyImageError(spec.error);
  if (!spec.errorKind || spec.errorKind === "unknown") return byMessage;
  return spec.errorKind === "ui_changed" && byMessage === "site_error" ? byMessage : spec.errorKind;
};
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
export function useImageApi() {
  const [status, setStatus] = useState<ImageApiStatus | null>(null);
  useEffect(() => {
    api.getImageApi().then(setStatus).catch(() => {});
  }, []);
  return status;
}

/** 이 AI의 이미지를 API로 만들 수 있는지 (설정에서 API 키를 연결했는지) */
const hasImageApi = (provider: ImageProvider, apiStatus: ImageApiStatus | null) =>
  provider !== "claude" && !!apiStatus?.[provider].configured;

/** API로 만들 수 없을 때 버튼 툴팁에 보여 줄 이유 */
const noImageApiReason = (provider: ImageProvider, apiStatus: ImageApiStatus | null) =>
  !apiStatus
    ? "API 연결 상태를 확인하는 중입니다."
    : `${PROVIDER_LABEL[provider]} API 키가 연결되어 있지 않습니다. 설정 → 이미지 API 설정에서 키를 연결하면 쓸 수 있습니다.`;

/** 스타일 고르기. 고른 AI가 그릴 수 없는 스타일은 누를 수 없다 (새 글 쓰기와 이미지 다시 생성이 같이 쓴다) */
export function StylePicker({ provider, style, onChange }: { provider: ImageProvider; style: ImageStyle; onChange: (style: ImageStyle) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="이미지 스타일">
      {(Object.keys(STYLE_LABEL) as ImageStyle[]).map((st) => {
        const allowed = STYLES_BY_PROVIDER[provider].includes(st);
        return (
          <button
            type="button"
            key={st}
            className={style === st ? "on" : ""}
            disabled={!allowed}
            title={allowed ? undefined : "Gemini 또는 ChatGPT에서 고를 수 있습니다"}
            onClick={() => onChange(st)}
          >
            {STYLE_LABEL[st]}
          </button>
        );
      })}
    </div>
  );
}

/** 이미지를 만들 AI 고르기 */
export function ProviderPicker({ provider, onChange }: { provider: ImageProvider; onChange: (provider: ImageProvider) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="이미지를 만들 AI">
      {PROVIDERS.map((p) => (
        <button key={p} type="button" className={provider === p ? "on" : ""} onClick={() => onChange(p)}>
          {PROVIDER_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

/** 스타일과 AI를 한 줄에서 고르기 (스타일 → AI 순서). AI를 바꾸면 그 AI가 그릴 수 있는 스타일로 맞춘다 */
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
      <StylePicker provider={provider} style={style} onChange={(st) => onChange(provider, st)} />
      <ProviderPicker provider={provider} onChange={(p) => onChange(p, fitStyle(p, style))} />
    </div>
  );
}

/** 화면에 보여 줄 만드는 방법: 키가 없으면 "API"를 골라도 서버가 크롬에서 만들므로 크롬으로 보여 준다. */
export const shownMethod = (provider: ImageProvider, method: ImageMethod, apiStatus: ImageApiStatus | null): ImageMethod =>
  hasImageApi(provider, apiStatus) ? method : "chrome";

/**
 * Gemini/ChatGPT 이미지를 API로 만들지 크롬에서 만들지 고르기 (새 글 쓰기와 이미지 다시 생성이 같이 쓴다).
 * 설정에서 API 키를 연결하지 않았으면 API는 누를 수 없게 하고 툴팁으로 이유를 알려 준다.
 */
export function MethodPicker({
  provider,
  method,
  apiStatus,
  onChange,
}: {
  provider: ImageProvider;
  method: ImageMethod;
  apiStatus: ImageApiStatus | null;
  onChange: (method: ImageMethod) => void;
}) {
  const hasApi = hasImageApi(provider, apiStatus);
  const shown = shownMethod(provider, method, apiStatus);
  return (
    <div className="segmented" role="radiogroup" aria-label="만드는 방법">
      {/* 누를 수 없는 버튼에는 툴팁이 뜨지 않는 브라우저가 있어 감싼 요소에 툴팁을 단다 */}
      <span className="tip-wrap" title={hasApi ? undefined : noImageApiReason(provider, apiStatus)}>
        <button type="button" className={shown === "api" ? "on" : ""} disabled={!hasApi} onClick={() => onChange("api")}>
          {PROVIDER_LABEL[provider]} API
        </button>
      </span>
      <button type="button" className={shown === "chrome" ? "on" : ""} onClick={() => onChange("chrome")}>
        크롬
      </button>
    </div>
  );
}

/** 이미지 다시 생성 창의 한 줄: 왼쪽 이름표와 고르기 */
function RegenRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="regen-row">
      <span className="regen-label">{label}</span>
      <div className="ai-picker">{children}</div>
    </div>
  );
}

type ImageAi = { provider: ImageProvider; style: ImageStyle };
export type ImageToolsProps = {
  disabled: boolean;
  /** AI 고르기 창의 처음 값 (글의 썸네일·본문 이미지 설정) */
  defaults: { thumbnail: ImageAi; body: ImageAi };
  onRegenerate: (target: string, ai: ImageAi & { method: ImageMethod }) => void;
  onUpload: (target: string, file: File) => void;
  /** 이미지 삭제 (확인은 부른 쪽이 받는다) */
  onDelete: (target: string) => void;
  /** 본문 이미지 자리 추가: afterBlock 번 블록 바로 뒤 */
  onAdd: (afterBlock: number) => void;
  /** 이미지 추가·삭제는 블록 번호가 밀리므로 어떤 작업이든 진행 중이면 할 수 없다 */
  locked: boolean;
};

/** 이미지 한 장 다시 만들기(AI·스타일 선택) · 직접 올리기. again: 이미 만들었거나 실패한 이미지면 "다시 만들기" */
export function ImageTools({ target, tools, again, hasFile }: { target: string; tools: ImageToolsProps; again: boolean; hasFile: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const initial = target === "thumbnail" ? tools.defaults.thumbnail : tools.defaults.body;
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState<ImageAi>(initial);
  const [method, setMethod] = useState<ImageMethod>("api");
  const apiStatus = useImageApi();
  const runText = again ? "다시 만들기" : "만들기";
  if (open) {
    return (
      <div className="image-actions open">
        {/* 고르는 항목마다 한 줄씩 나눠 보여 준다 */}
        <RegenRow label="스타일">
          <StylePicker provider={ai.provider} style={ai.style} onChange={(style) => setAi({ ...ai, style })} />
        </RegenRow>
        <RegenRow label="만드는 곳">
          <ProviderPicker provider={ai.provider} onChange={(provider) => setAi({ provider, style: fitStyle(provider, ai.style) })} />
        </RegenRow>
        {ai.provider !== "claude" && (
          <RegenRow label="만드는 방법">
            <MethodPicker provider={ai.provider} method={method} apiStatus={apiStatus} onChange={setMethod} />
          </RegenRow>
        )}
        <div className="retry-actions">
          <button
            type="button"
            className="primary"
            disabled={tools.disabled}
            onClick={() => {
              setOpen(false);
              tools.onRegenerate(target, { ...ai, method: ai.provider === "claude" ? "api" : shownMethod(ai.provider, method, apiStatus) });
            }}
          >
            이미지 {runText}
          </button>
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
          setMethod("api");
          setOpen(true);
        }}
      >
        {again ? "이미지 다시 생성" : "이미지 생성"}
      </button>
      <button type="button" disabled={tools.disabled} onClick={() => input.current?.click()}>
        직접 올리기
      </button>
      {/* 만들어진 이미지가 있을 때만 보인다 (아직 없거나 실패한 자리는 에디터 블록의 ×로 없앤다) */}
      {hasFile && (
        <button type="button" className="danger ghost" disabled={tools.locked} onClick={() => tools.onDelete(target)}>
          이미지 삭제
        </button>
      )}
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
        <img src={imageUrl(jobId, spec.file)} alt={spec.alt} />
      ) : (
        <FailedPlaceholder spec={spec} generating={generating} />
      )}
      {thumbnail && <figcaption>썸네일{spec.headline ? ` · 문구 “${spec.headline}”` : ""}</figcaption>}
      {regenerating && spec.file && (
        <p className="current-activity">
          <span className="spinner" /> 이 이미지를 다시 만드는 중입니다
        </p>
      )}
      {!tools.disabled && !generating && !regenerating && <ImageTools target={target} tools={tools} again={!!spec.file || !!spec.error} hasFile={!!spec.file} />}
    </figure>
  );
}
