import { Fragment, useState } from "react";
import { MAX_BODY_IMAGES, MAX_TAGS, bodyImageKey, type ImageSpec, type Post, type PostBlock } from "../../shared/types";
import { FailedPlaceholder, ImageTools, type ImageToolsProps } from "./images";
import { imageUrl } from "../api";

// ───────────────────────── 편집기 ─────────────────────────

/** 태그 입력: Enter 또는 쉼표로 추가, 빈 칸에서 Backspace로 마지막 태그 삭제 */
function TagInput({ tags, onChange, disabled }: { tags: string[]; onChange: (t: string[]) => void; disabled: boolean }) {
  const [text, setText] = useState("");
  const full = tags.length >= MAX_TAGS;
  const add = (raw: string) => {
    const t = raw.replace(/^#+/, "").trim();
    if (t && !tags.includes(t) && !full) onChange([...tags, t]);
    setText("");
  };
  return (
    <div className={`tag-input ${disabled ? "disabled" : ""}`}>
      {tags.map((t) => (
        <span key={t} className="chip">
          #{t}
          <button type="button" disabled={disabled} onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`${t} 태그 삭제`}>
            ×
          </button>
        </span>
      ))}
      <input
        value={text}
        disabled={disabled || full}
        placeholder={full ? `태그는 최대 ${MAX_TAGS}개입니다` : tags.length ? "태그 추가" : "태그 입력 후 Enter"}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) v.split(",").slice(0, -1).forEach(add);
          setText(v.includes(",") ? v.split(",").pop()! : v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && !text && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => text.trim() && add(text)}
      />
    </div>
  );
}

/** 표 편집: 한 줄에 한 행, 칸은 | 로 구분, 첫 줄은 머리글 */
const tableToText = (b: { headers: string[]; rows: string[][] }) =>
  [b.headers, ...b.rows].map((r) => r.join(" | ")).join("\n");
const textToTable = (s: string) => {
  const [headers = [], ...rows] = s.split("\n").map((l) => l.split("|").map((c) => c.trim()));
  return { type: "table" as const, headers, rows };
};

function ImageEditor({
  jobId,
  spec,
  onChange,
  disabled,
  thumbnail,
  target,
  tools,
}: {
  jobId: string;
  spec: ImageSpec;
  onChange: (s: ImageSpec) => void;
  disabled: boolean;
  thumbnail?: boolean;
  target: string;
  tools: ImageToolsProps;
}) {
  return (
    <div className="image-editor">
      {spec.file ? (
        <img src={imageUrl(jobId, spec.file)} alt={spec.alt} />
      ) : (
        <FailedPlaceholder spec={spec} />
      )}
      {!tools.disabled && <ImageTools target={target} tools={tools} again={!!spec.file || !!spec.error} hasFile={!!spec.file} />}
      {spec.basis && <p className="basis">이 이미지가 그리는 본문: “{spec.basis}”</p>}
      <label className="mini-label">
        {thumbnail
          ? "이미지 안 문구 (썸네일 가운데에 크게 들어가는 글자, 8~16자 권장 · 본문에 있는 사실만)"
          : "이미지 안 문구 (이미지에 제목·라벨처럼 들어가는 글자, 4~20자 · 비우면 글자 없이)"}
        <textarea
          rows={thumbnail ? 2 : 1}
          disabled={disabled}
          value={spec.headline ?? ""}
          maxLength={60}
          placeholder={thumbnail ? "줄바꿈하면 2줄로 들어갑니다" : "예: 계약금 10% · 잔금 90%"}
          onChange={(e) => onChange({ ...spec, headline: e.target.value || undefined, userEdited: true })}
        />
      </label>
      <label className="mini-label">
        이미지 설명 (다시 만들 때 사용)
        <textarea rows={2} disabled={disabled} value={spec.prompt} onChange={(e) => onChange({ ...spec, prompt: e.target.value, userEdited: true })} />
      </label>
      {spec.userEdited ? (
        <p className="hint small">
          직접 고친 설명과 문구라서 다시 만들 때 그대로 씁니다.{" "}
          <button type="button" className="link" disabled={disabled} onClick={() => onChange({ ...spec, userEdited: undefined })}>
            본문을 보고 자동으로 다시 정하게 하기
          </button>
        </p>
      ) : (
        <p className="hint small">다시 만들 때 본문을 참고해 설명과 문구를 자동으로 다시 정합니다. 고치면 그대로 씁니다.</p>
      )}
      <label className="mini-label">
        대체 텍스트 (이미지를 못 볼 때 보이는 설명)
        <input disabled={disabled} value={spec.alt} onChange={(e) => onChange({ ...spec, alt: e.target.value })} />
      </label>
    </div>
  );
}

export function PostEditor({
  jobId,
  post,
  onChange,
  disabled,
  tools,
  selection,
}: {
  jobId: string;
  post: Post;
  onChange: (p: Post) => void;
  disabled: boolean;
  tools: ImageToolsProps;
  /** 프롬프트로 고칠 블록 고르기 (고른 블록 번호와 토글) */
  selection?: { selected: number[]; toggle: (i: number) => void };
}) {
  const setBlock = (i: number, b: PostBlock) => onChange({ ...post, blocks: post.blocks.map((x, j) => (j === i ? b : x)) });
  const removeBlock = (i: number) => {
    if (!confirm("이 블록을 지울까요?")) return;
    onChange({ ...post, blocks: post.blocks.filter((_, j) => j !== i) });
  };
  const imageCount = post.blocks.filter((b) => b.type === "image").length;
  const kindLabel = { heading: "소제목", paragraph: "문단", list: "목록", quote: "인용", table: "표", image: "이미지" } as const;

  return (
    <section className="editor">
      <label className="mini-label">
        제목
        <input className="title-input" value={post.title} disabled={disabled} onChange={(e) => onChange({ ...post, title: e.target.value })} />
      </label>
      <label className="mini-label">
        태그
        <TagInput tags={post.tags} disabled={disabled} onChange={(tags) => onChange({ ...post, tags })} />
      </label>
      {post.thumbnail && (
        <div className="block">
          <span className="kind">썸네일</span>
          <ImageEditor
            jobId={jobId}
            spec={post.thumbnail}
            disabled={disabled}
            thumbnail
            target="thumbnail"
            tools={tools}
            onChange={(t) => onChange({ ...post, thumbnail: t })}
          />
          <span />
        </div>
      )}
      {post.blocks.map((b, i) => (
        <Fragment key={i}>
        <div className={`block ${b.type}`}>
          <span className="kind">
            {selection && (
              <input
                type="checkbox"
                className="pick"
                title="프롬프트로 고칠 부분으로 고릅니다 (위의 프롬프트로 글 고치기 카드)"
                aria-label={`블록 #${i} 고를 부분으로 선택`}
                checked={selection.selected.includes(i)}
                disabled={disabled}
                onChange={() => selection.toggle(i)}
              />
            )}
            {kindLabel[b.type]}
          </span>
          {b.type === "image" ? (
            <ImageEditor
              jobId={jobId}
              spec={b}
              disabled={disabled}
              target={bodyImageKey(i)}
              tools={tools}
              onChange={(spec) => setBlock(i, { type: "image", ...spec })}
            />
          ) : b.type === "table" ? (
            <div>
              <textarea
                className="mono"
                disabled={disabled}
                rows={b.rows.length + 1}
                value={tableToText(b)}
                onChange={(e) => setBlock(i, textToTable(e.target.value))}
              />
              <p className="hint small">한 줄이 한 행이고 칸은 | 로 나눕니다. 첫 줄은 머리글입니다.</p>
            </div>
          ) : (
            <div>
              <textarea
                disabled={disabled}
                rows={b.type === "heading" ? 1 : Math.max(2, Math.ceil((b.type === "list" ? b.items.join("\n") : b.text).length / 70))}
                value={b.type === "list" ? b.items.join("\n") : b.text}
                onChange={(e) =>
                  setBlock(i, b.type === "list" ? { type: "list", items: e.target.value.split("\n") } : { ...b, text: e.target.value })
                }
              />
              {b.type === "list" && <p className="hint small">한 줄이 항목 하나입니다.</p>}
            </div>
          )}
          <button
            className="x"
            disabled={disabled || (b.type === "image" && tools.locked)}
            onClick={() => (b.type === "image" ? tools.onDelete(bodyImageKey(i)) : removeBlock(i))}
            aria-label={b.type === "image" ? "이미지 삭제" : "블록 삭제"}
            title={b.type === "image" ? "이미지 삭제 (이미지 파일도 지웁니다)" : "블록 삭제"}
          >
            ×
          </button>
        </div>
        {b.type !== "image" && post.blocks[i + 1]?.type !== "image" && (
          <div className="add-image-row">
            <button
              type="button"
              className="ghost"
              disabled={disabled || tools.locked || imageCount >= MAX_BODY_IMAGES}
              title={imageCount >= MAX_BODY_IMAGES ? `본문 이미지는 최대 ${MAX_BODY_IMAGES}장입니다` : "이 블록 아래에 이미지 자리를 추가합니다"}
              onClick={() => tools.onAdd(i)}
            >
              ＋ 여기에 이미지 추가
            </button>
          </div>
        )}
        </Fragment>
      ))}
      <p className="hint small">
        **굵게** 처럼 별표 두 개로 감싸면 굵은 글씨가 됩니다. 고친 내용은 자동으로 저장됩니다. 이미지는 "이미지 추가"로 자리를 만든 뒤 "이미지 생성"(또는 "직접 올리기")으로 채우세요. 이미지 자리가 비어 있으면 블로그에 올릴 때 건너뜁니다.
      </p>
    </section>
  );
}
