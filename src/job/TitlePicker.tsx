import { useState } from "react";
import type { Post } from "../../shared/types";
import { errorText } from "../labels";

/**
 * 본문 맨 위 제목 아래의 제목 후보: 누르면 제목이 바뀌고(자동 저장), "제목 다시 만들기"로 후보만 새로 받는다.
 * 지금 제목이 후보에 없으면(직접 고쳤거나 후보를 새로 받았을 때) 맨 앞에 "지금 제목"으로 함께 보여 준다.
 * "직접 입력"으로 미리보기 화면에서도 제목을 바로 고칠 수 있다.
 */
export function TitlePicker({
  post,
  disabled,
  onPick,
  onRegenerate,
}: {
  post: Post;
  disabled: boolean;
  onPick: (title: string) => void;
  /** 새 후보를 받아 글에 넣는다 */
  onRegenerate: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const candidates = post.titleCandidates ?? [];
  const regenerate = async () => {
    setLoading(true);
    setError("");
    try {
      await onRegenerate();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };

  const applyTyped = () => {
    const t = typed.trim();
    if (t && t !== post.title) onPick(t);
    setTyping(false);
  };

  return (
    <div className="title-picker">
      <div className="title-picker-head">
        <span className="hint small">{candidates.length ? "제목 후보 (눌러서 제목으로 바꿀 수 있습니다)" : "제목 후보가 없습니다."}</span>
        <div className="title-picker-actions">
          <button
            type="button"
            onClick={() => {
              setTyped(post.title);
              setTyping(true);
            }}
            disabled={disabled || typing}
          >
            직접 입력
          </button>
          <button type="button" onClick={() => void regenerate()} disabled={disabled || loading}>
            {loading ? "만드는 중..." : "제목 다시 만들기"}
          </button>
        </div>
      </div>
      {typing && (
        <div className="title-picker-head">
          <input
            className="title-input"
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) applyTyped();
              if (e.key === "Escape") setTyping(false);
            }}
          />
          <span className="hint small">{typed.trim().length}자</span>
          <div className="title-picker-actions">
            <button type="button" onClick={applyTyped} disabled={!typed.trim()}>
              적용
            </button>
            <button type="button" onClick={() => setTyping(false)}>
              취소
            </button>
          </div>
        </div>
      )}
      {loading && <span className="hint small">본문을 보고 새 제목 후보 3개를 만듭니다. 30초~1분쯤 걸립니다. 지금 제목은 고르기 전까지 그대로입니다.</span>}
      {error && <span className="error small">{error}</span>}
      {candidates.length > 0 && (
        <ul className="title-candidates">
          {!candidates.includes(post.title) && post.title && (
            <li>
              <button type="button" className="active" disabled>
                ✓ {post.title} <span className="hint small">(지금 제목, {post.title.length}자)</span>
              </button>
            </li>
          )}
          {candidates.map((t) => (
            <li key={t}>
              <button type="button" className={t === post.title ? "active" : ""} disabled={disabled} onClick={() => t !== post.title && onPick(t)}>
                {t === post.title && "✓ "}
                {t} <span className="hint small">({t.length}자)</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
