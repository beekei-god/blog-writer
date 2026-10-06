import { useRef, useState } from "react";
import { STYLES_BY_PROVIDER, fitStyle, type ImageProvider, type ImageSpec, type ImageStyle, type Job, type Post, type PostBlock } from "../../shared/types";
import { classifyImageError, IMAGE_ERROR_INFO, type ImageErrorKind } from "../../shared/imageErrors";
import { ExtensionStatus } from "../ExtensionStatus";
import { PROVIDER_LABEL, STYLE_LABEL } from "../labels";

// ───────────────────────── 이미지 실패 · 다시 만들기 ─────────────────────────

export const imageSpecs = (post: Post): ImageSpec[] => [
  ...(post.thumbnail ? [post.thumbnail] : []),
  ...post.blocks.filter((b): b is Extract<PostBlock, { type: "image" }> => b.type === "image"),
];

// "unknown"으로 저장된 예전 기록은 분류 규칙이 늘어났을 수 있으니 메시지로 다시 분류한다.
const kindOf = (spec: ImageSpec): ImageErrorKind =>
  spec.errorKind && spec.errorKind !== "unknown" ? spec.errorKind : classifyImageError(spec.error);
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
  const info = IMAGE_ERROR_INFO[kindOf(spec)];
  return (
    <div className="image-placeholder failed">
      <b>⚠ {info.title}</b>
      {spec.errorProvider && <span> ({PROVIDER_LABEL[spec.errorProvider]})</span>}
      <br />
      <span className="small-note">위의 "이미지를 만들지 못했습니다" 안내에서 다른 AI로 다시 만들 수 있습니다.</span>
    </div>
  );
}

/** AI와 스타일 고르기 */
export function AiPicker({
  provider,
  style,
  onChange,
  failedWith,
}: {
  provider: ImageProvider;
  style: ImageStyle;
  onChange: (provider: ImageProvider, style: ImageStyle) => void;
  failedWith?: ImageProvider[];
}) {
  return (
    <div className="ai-picker">
      <div className="segmented" role="radiogroup" aria-label="이미지를 만들 AI">
        {PROVIDERS.map((p) => (
          <button key={p} type="button" className={provider === p ? "on" : ""} onClick={() => onChange(p, fitStyle(p, style))}>
            {PROVIDER_LABEL[p]}
            {failedWith?.includes(p) && <span className="failed-mark"> · 실패</span>}
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

/** 실패한 이미지의 이유와, 다른 AI로 실패한 것만 다시 만들기 */
export function ImageFailures({
  failed,
  current,
  onRun,
}: {
  failed: ImageSpec[];
  current: Job["imageOptions"];
  onRun: (o: { provider: ImageProvider; style: ImageStyle }) => void;
}) {
  const kinds = [...new Set(failed.map(kindOf))];
  const failedWith = [...new Set(failed.map((s) => s.errorProvider ?? current.provider))];

  // 기본 선택은 실패하지 않은 다른 AI. 확장 프로그램·크롬 문제면 둘 다 크롬이 필요한 웹 AI 대신 Claude,
  // 그 밖에는 화풍을 유지할 수 있는 다른 웹 AI(Gemini ↔ ChatGPT)를 먼저 권한다.
  const needsClaude = kinds.some((k) => k === "extension" || k === "browser_busy" || k === "browser_closed");
  const order: ImageProvider[] = needsClaude ? ["claude", "gemini", "chatgpt"] : ["gemini", "chatgpt", "claude"];
  const suggested = order.find((p) => !failedWith.includes(p)) ?? current.provider;
  // 거절이면 지브리풍 같은 화풍 대신 플랫을 먼저 권한다.
  const suggestedStyle = kinds.includes("refused") && current.style !== "flat" ? "flat" : current.style;
  const [provider, setProvider] = useState<ImageProvider>(suggested);
  const [style, setStyle] = useState<ImageStyle>(fitStyle(suggested, suggestedStyle));

  return (
    <section className="image-failures">
      <h3>⚠ 이미지 {failed.length}개를 만들지 못했습니다</h3>
      <ul className="failure-reasons">
        {kinds.map((k) => {
          const specs = failed.filter((s) => kindOf(s) === k);
          const by = [...new Set(specs.map((s) => s.errorProvider).filter(Boolean))] as ImageProvider[];
          return (
            <li key={k}>
              <b>
                {IMAGE_ERROR_INFO[k].title}
                {by.length > 0 && ` (${by.map((p) => PROVIDER_LABEL[p]).join(", ")})`}
              </b>
              {specs.length > 1 && <span className="hint small"> · {specs.length}개</span>}
              <p>{IMAGE_ERROR_INFO[k].advice}</p>
              <details>
                <summary>자세한 오류</summary>
                <ul className="raw-errors">
                  {[...new Set(specs.map((s) => s.error))].map((e) => (
                    <li key={e}>
                      <code>{e}</code>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
      {kinds.includes("extension") && <ExtensionStatus compact />}
      <div className="retry-row">
        <span className="field-label">다시 만들 AI</span>
        <AiPicker
          provider={provider}
          style={style}
          failedWith={failedWith}
          onChange={(p, s) => {
            setProvider(p);
            setStyle(s);
          }}
        />
        <button className="primary" onClick={() => onRun({ provider, style })}>
          실패한 {failed.length}개를 {PROVIDER_LABEL[provider]}로 다시 만들기
        </button>
      </div>
      <p className="hint small">
        만들어진 이미지는 그대로 두고 실패한 것만 다시 만듭니다.
        {provider !== "claude" && " Gemini·ChatGPT는 평소 쓰는 크롬에서 Claude in Chrome으로 만들며, 그 크롬에 로그인되어 있어야 합니다."}
      </p>
    </section>
  );
}

type ImageAi = { provider: ImageProvider; style: ImageStyle };
export type ImageToolsProps = {
  disabled: boolean;
  /** AI 고르기 창의 처음 값 (글의 썸네일·본문 이미지 설정) */
  defaults: { thumbnail: ImageAi; body: ImageAi };
  onRegenerate: (target: string, ai: ImageAi) => void;
  onUpload: (target: string, file: File) => void;
};

/** 이미지 한 장 다시 만들기(AI·스타일 선택) · 직접 올리기 */
export function ImageTools({ target, tools, hasFile }: { target: string; tools: ImageToolsProps; hasFile: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const initial = target === "thumbnail" ? tools.defaults.thumbnail : tools.defaults.body;
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState<ImageAi>(initial);
  const runText = hasFile ? "다시 만들기" : "만들기";
  if (open) {
    return (
      <div className="image-actions open">
        <AiPicker provider={ai.provider} style={ai.style} onChange={(provider, style) => setAi({ provider, style })} />
        <button
          type="button"
          className="primary"
          disabled={tools.disabled}
          onClick={() => {
            setOpen(false);
            tools.onRegenerate(target, ai);
          }}
        >
          {PROVIDER_LABEL[ai.provider]}로 {runText}
        </button>
        <button type="button" className="ghost" onClick={() => setOpen(false)}>
          취소
        </button>
        <span className="hint small">
          이 이미지에만 적용됩니다.{ai.provider !== "claude" && " Gemini·ChatGPT는 평소 쓰는 크롬에 로그인되어 있어야 합니다."}
        </span>
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
        {runText}…
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
      {!tools.disabled && <ImageTools target={target} tools={tools} hasFile={!!spec.file} />}
    </figure>
  );
}
