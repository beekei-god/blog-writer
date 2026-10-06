import { useState } from "react";
import { bodyImageKey, type Post } from "../../shared/types";
import { postToHtml, postToText, splitUrl } from "../../shared/postHtml";
import { errorText } from "../labels";
import { type ImageToolsProps, PreviewImage } from "./images";

// ───────────────────────── 복사 ─────────────────────────

/** 클립보드에 HTML(서식)과 텍스트를 함께 넣는다. 붙여넣는 곳이 서식을 받으면 HTML, 아니면 텍스트가 들어간다. */
async function copyToClipboard(text: string, html?: string) {
  if (html && typeof ClipboardItem !== "undefined") {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
  } else {
    await navigator.clipboard.writeText(text);
  }
}

/** 생성된 글을 복사하는 버튼들 (편집 중인 내용 그대로) */
export function CopyBar({ post }: { post: Post }) {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const imageCount = (post.thumbnail ? 1 : 0) + post.blocks.filter((b) => b.type === "image").length;

  const copy = async (key: string, text: string, html?: string) => {
    setError("");
    try {
      await copyToClipboard(text, html);
      setDone(key);
      window.setTimeout(() => setDone((d) => (d === key ? null : d)), 2000);
    } catch (e) {
      setError(`복사하지 못했습니다: ${errorText(e)}`);
    }
  };

  const items: { key: string; label: string; run: () => Promise<void> }[] = [
    { key: "body", label: "본문 복사 (서식 포함)", run: () => copy("body", postToText(post), postToHtml(post)) },
    { key: "text", label: "텍스트만 복사", run: () => copy("text", postToText(post)) },
    { key: "title", label: "제목 복사", run: () => copy("title", post.title) },
    ...(post.tags.length ? [{ key: "tags", label: "태그 복사", run: () => copy("tags", post.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")) }] : []),
  ];

  return (
    <div className="copy-bar">
      <span className="copy-label">복사</span>
      {items.map((it) => (
        <button key={it.key} className={done === it.key ? "copied" : ""} onClick={() => void it.run()}>
          {done === it.key ? "✓ 복사됨" : it.label}
        </button>
      ))}
      {imageCount > 0 && <span className="hint small">이미지는 복사되지 않고 [썸네일], [이미지 1: 설명] 처럼 자리만 표시됩니다.</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

// ───────────────────────── 미리보기 ─────────────────────────

/** 글 속 주소를 링크로 바꿔 보여 준다 (http/https만, 문장 끝 마침표·괄호는 주소에서 뺀다) */
function Linked({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s<>"'“”‘’]+)/).map((part, i) => {
        if (!/^https?:\/\//.test(part)) return <span key={i}>{part}</span>;
        const { url, tail } = splitUrl(part);
        return /^https?:\/\/[^/]+\./.test(url) ? (
          <span key={i}>
            <a href={url} target="_blank" rel="noreferrer noopener">
              {url}
            </a>
            {tail}
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

/** **굵게** 표시와 주소 링크만 렌더링한다 (HTML로 해석하지 않음). */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part) ? (
          <strong key={i}>
            <Linked text={part.slice(2, -2)} />
          </strong>
        ) : (
          <Linked key={i} text={part} />
        ),
      )}
    </>
  );
}

export function Preview({
  jobId,
  post,
  generating,
  regenerating,
  tools,
}: {
  jobId: string;
  post: Post;
  generating: string[];
  regenerating: string[];
  tools: ImageToolsProps;
}) {
  return (
    <article className="preview">
      {post.thumbnail && (
        <PreviewImage jobId={jobId} spec={post.thumbnail} thumbnail generating={generating.includes("thumbnail")} regenerating={regenerating.includes("thumbnail")} target="thumbnail" tools={tools} />
      )}
      <h1>{post.title}</h1>
      {post.blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return (
              <h2 key={i}>
                <Rich text={b.text.replace(/\*\*/g, "")} />
              </h2>
            );
          case "paragraph":
            return (
              <p key={i}>
                <Rich text={b.text} />
              </p>
            );
          case "quote":
            return (
              <blockquote key={i}>
                <Rich text={b.text} />
              </blockquote>
            );
          case "list":
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Rich text={it} />
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div className="table-wrap" key={i}>
                <table>
                  <thead>
                    <tr>
                      {b.headers.map((h, j) => (
                        <th key={j}>
                          <Rich text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k}>
                            <Rich text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "image":
            return <PreviewImage key={i} jobId={jobId} spec={b} generating={generating.includes(bodyImageKey(i))} regenerating={regenerating.includes(bodyImageKey(i))} target={bodyImageKey(i)} tools={tools} />;
        }
      })}
      {post.tags.length > 0 && <p className="pv-tags">{post.tags.map((t) => `#${t}`).join(" ")}</p>}
    </article>
  );
}
