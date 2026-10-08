import { bodyImageKey, type Post } from "../../shared/types";
import { splitUrl } from "../../shared/postHtml";
import { type ImageToolsProps, PreviewImage } from "./images";

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
