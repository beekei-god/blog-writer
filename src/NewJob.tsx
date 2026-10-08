import { useEffect, useState } from "react";
import {
  fitStyle,
  MAX_BODY_IMAGES,
  methodFor,
  STYLES_BY_PROVIDER,
  type ImageMethod,
  type ImageOptions,
  type ImageProvider,
  type ImageStyle,
} from "../shared/types";
import { api, type ImageApiStatus } from "./api";
import { useImageApi } from "./job/images";
import { errorText, PROVIDER_HINT, PROVIDER_LABEL, STYLE_LABEL } from "./labels";

interface Props {
  topic: string;
  links: string;
  onTopicChange: (v: string) => void;
  onLinksChange: (v: string) => void;
  onCreated: (jobId: string) => void;
  onOpenRecommend: () => void;
}

const MAX_LINKS = 20; // 서버(POST /api/jobs)와 같은 상한

/** 서버 검사와 같은 기준: http(s)로 시작하는 올바른 URL */
const isHttpUrl = (s: string) => {
  if (!/^https?:\/\//i.test(s)) return false;
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

/** 참고 링크 칸의 문제를 알려 준다. 문제가 없으면 null */
function linkProblem(list: string[]): string | null {
  if (list.length > MAX_LINKS) return `참고 링크는 최대 ${MAX_LINKS}개입니다. (지금 ${list.length}개)`;
  const bad = list.findIndex((l) => !isHttpUrl(l));
  return bad >= 0 ? `참고 링크는 http(s)로 시작하는 주소여야 합니다. (${bad + 1}번째 줄)` : null;
}

export function NewJob({ topic, links, onTopicChange, onLinksChange, onCreated, onOpenRecommend }: Props) {
  const [images, setImages] = useState<ImageOptions>({
    thumbnail: true,
    bodyImages: 0,
    provider: "claude",
    style: "flat",
    thumbnailProvider: "claude",
    thumbnailStyle: "flat",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 마지막으로 쓴 이미지 옵션을 기본값으로 (썸네일은 항상 켬)
  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        const o = s.images;
        const tp = o.thumbnailProvider ?? o.provider;
        const ts = o.thumbnailStyle ?? o.style;
        setImages({ ...o, thumbnail: true, thumbnailProvider: tp, thumbnailStyle: ts, method: methodFor(o, "body"), thumbnailMethod: methodFor(o, "thumbnail") });
      })
      .catch(() => {});
  }, []);

  const setBodyImages = (n: number) => setImages({ ...images, bodyImages: Math.min(MAX_BODY_IMAGES, Math.max(0, n)) });
  // 썸네일과 본문 이미지는 서로 영향을 주지 않는다 (한쪽을 바꿔도 다른 쪽은 그대로).
  const setBodyAi = (provider: ImageProvider, style: ImageStyle, method: ImageMethod) =>
    setImages((o) => ({ ...o, provider, style, method }));
  const setThumbAi = (provider: ImageProvider, style: ImageStyle, method: ImageMethod) =>
    setImages((o) => ({ ...o, thumbnailProvider: provider, thumbnailStyle: style, thumbnailMethod: method }));
  const thumbSame =
    images.thumbnailProvider === images.provider &&
    images.thumbnailStyle === images.style &&
    methodFor(images, "thumbnail") === methodFor(images, "body");
  const apiStatus = useImageApi();

  const linkList = links.split("\n").map((l) => l.trim()).filter(Boolean);
  const linkError = linkProblem(linkList);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const job = await api.createJob(topic.trim(), images, linkList);
      onTopicChange("");
      onLinksChange("");
      onCreated(job.id);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="detail new-job" onSubmit={submit}>
      <header>
        <div>
          <h2>새 글 쓰기</h2>
          <p className="hint small">
            주제를 넣으면 웹에서 자료를 찾아(딥서칭) 글쓰기 규칙에 맞는 초안을 만듭니다. 보통 5~15분 걸립니다.
          </p>
        </div>
      </header>

      <section className="card">
        <label className="field">
          <span className="field-label">글 주제</span>
          <textarea
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            placeholder="예) 2026년 전기차 보조금 신청 방법"
            rows={2}
            maxLength={300}
            autoFocus
          />
          <span className="hint small">
            무엇을 쓸지 모르겠다면{" "}
            <button type="button" className="link" onClick={onOpenRecommend}>
              주제 추천
            </button>
            을 받아 보세요.
          </span>
        </label>

        <label className="field">
          <span className="field-label">
            참고 링크 <span className="optional">선택</span>
          </span>
          <textarea
            value={links}
            onChange={(e) => onLinksChange(e.target.value)}
            placeholder={"https://... (한 줄에 하나)\n공고문, 공식 안내 페이지처럼 꼭 반영할 자료"}
            rows={3}
            aria-invalid={!!linkError}
          />
          {linkError && <span className="error small">{linkError}</span>}
        </label>
      </section>

      <section className="card">
        <h3 className="card-title">이미지</h3>
        {/* 썸네일 설정과 본문 이미지 설정을 각각 한데 모은다 */}
        <div className="image-group">
          <div className="option-row">
            <span>썸네일(대표 이미지)</span>
            <label className="switch">
              <input type="checkbox" checked={images.thumbnail} onChange={(e) => setImages({ ...images, thumbnail: e.target.checked })} />
              <span>{images.thumbnail ? "만들기" : "안 만들기"}</span>
            </label>
          </div>
          {images.thumbnail && (
            <AiRows
              title="썸네일"
              provider={images.thumbnailProvider ?? images.provider}
              style={images.thumbnailStyle ?? images.style}
              method={methodFor(images, "thumbnail")}
              apiStatus={apiStatus}
              onChange={(p, st, m) => setThumbAi(p, fitStyle(p, st), m)}
            />
          )}
        </div>
        <div className="image-group">
          <div className="option-row">
            <span>본문 이미지</span>
            <div className="stepper-input">
              <button type="button" onClick={() => setBodyImages(images.bodyImages - 1)} disabled={images.bodyImages <= 0} aria-label="줄이기">
                −
              </button>
              <span>{images.bodyImages}장</span>
              <button
                type="button"
                onClick={() => setBodyImages(images.bodyImages + 1)}
                disabled={images.bodyImages >= MAX_BODY_IMAGES}
                aria-label="늘리기"
              >
                +
              </button>
            </div>
          </div>
          {images.bodyImages > 0 && (
            <AiRows
              title="본문 이미지"
              provider={images.provider}
              style={images.style}
              method={methodFor(images, "body")}
              apiStatus={apiStatus}
              onChange={(p, st, m) => setBodyAi(p, fitStyle(p, st), m)}
            />
          )}
        </div>
        {images.thumbnail && images.bodyImages > 0 && !thumbSame && (
          <p className="hint small">
            썸네일과 본문 이미지를 서로 다른 AI·스타일·방법으로 만듭니다.{" "}
            <button type="button" className="link" onClick={() => setThumbAi(images.provider, images.style, methodFor(images, "body"))}>
              본문 이미지와 같게 하기
            </button>
          </p>
        )}
      </section>

      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary big" disabled={submitting || topic.trim().length < 2 || !!linkError}>
          {submitting ? "시작하는 중..." : "딥서칭 시작"}
        </button>
        {topic.trim().length < 2 && <span className="hint small">주제를 2자 이상 입력하세요.</span>}
      </div>
    </form>
  );
}

/** 한 종류의 이미지(썸네일 또는 본문)를 만들 AI·스타일·방법 고르기 */
function AiRows({
  title,
  provider,
  style,
  method,
  apiStatus,
  onChange,
}: {
  title: string;
  provider: ImageProvider;
  style: ImageStyle;
  method: ImageMethod;
  apiStatus: ImageApiStatus | null;
  onChange: (provider: ImageProvider, style: ImageStyle, method: ImageMethod) => void;
}) {
  // 키가 없으면 "API"를 골라도 서버가 크롬에서 만들므로 화면도 크롬으로 보여 준다.
  const hasApi = provider !== "claude" && !!apiStatus?.[provider].configured;
  const shown: ImageMethod = hasApi ? method : "chrome";
  const name = PROVIDER_LABEL[provider];
  const noApiWhy = !apiStatus
    ? "API 연결 상태를 확인하는 중입니다."
    : `${name} API 키가 연결되어 있지 않습니다. 설정 → 이미지 API 설정에서 키를 연결하면 쓸 수 있습니다.`;
  return (
    <div className="ai-rows">
      <div className="option-row">
        <span>{title} 만드는 곳</span>
        <div className="segmented">
          {(Object.keys(PROVIDER_LABEL) as ImageProvider[]).map((p) => (
            <button type="button" key={p} className={provider === p ? "on" : ""} onClick={() => onChange(p, style, method)}>
              {PROVIDER_LABEL[p]}
            </button>
          ))}
        </div>
      </div>
      {provider !== "claude" && (
        <div className="option-row">
          <span>{title} 만드는 방법</span>
          <div className="segmented">
            {/* 누를 수 없는 버튼에는 툴팁이 뜨지 않는 브라우저가 있어 감싼 요소에 툴팁을 단다 */}
            <span className="tip-wrap" title={hasApi ? undefined : noApiWhy}>
              <button type="button" className={shown === "api" ? "on" : ""} disabled={!hasApi} onClick={() => onChange(provider, style, "api")}>
                {name} API
              </button>
            </span>
            <button type="button" className={shown === "chrome" ? "on" : ""} onClick={() => onChange(provider, style, "chrome")}>
              크롬
            </button>
          </div>
        </div>
      )}
      <p className="hint small">
        {provider !== "claude" && shown === "api"
          ? `${name} API로 만듭니다. 크롬을 쓰지 않아 다른 작업과 동시에 만들 수 있고, API 사용 요금이 듭니다.`
          : PROVIDER_HINT[provider]}
      </p>
      <div className="option-row">
        <span>{title} 스타일</span>
        <div className="segmented">
          {(Object.keys(STYLE_LABEL) as ImageStyle[]).map((st) => {
            const allowed = STYLES_BY_PROVIDER[provider].includes(st);
            return (
              <button
                type="button"
                key={st}
                className={style === st ? "on" : ""}
                disabled={!allowed}
                title={allowed ? undefined : "Gemini 또는 ChatGPT에서 고를 수 있습니다"}
                onClick={() => onChange(provider, st, method)}
              >
                {STYLE_LABEL[st]}
              </button>
            );
          })}
        </div>
      </div>
      {provider === "claude" && <p className="hint small">Claude는 플랫 일러스트만 그릴 수 있습니다.</p>}
      {style === "ghibli" && (
        <p className="hint small">지브리풍은 서비스 정책 때문에 거절될 수 있습니다. 거절되면 초안 화면에서 다른 스타일로 다시 만들 수 있습니다.</p>
      )}
    </div>
  );
}
