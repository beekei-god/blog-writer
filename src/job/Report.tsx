import type { Post, Source } from "../../shared/types";

// ───────────────────────── 작성 리포트 ─────────────────────────

const SOURCE_KIND = { official: "공식", press: "언론", blog: "블로그·참고용", other: "기타" } as const;

/**
 * 규칙에서 "사용자에게 알리라"고 한 내용: 본문에는 들어가지 않는 작성 리포트.
 * 이 글에 적용된 글쓰기 규칙, 수집한 출처, 리서치 노트도 이 안에 둔다 (초안이 없어도 조사 결과는 보인다).
 */
export function Report({
  post,
  rulesSnapshot,
  sources,
  researchNotes,
}: {
  post?: Post;
  rulesSnapshot?: string;
  sources: Source[];
  researchNotes?: string;
}) {
  // 제목 후보는 본문 맨 위 제목 아래(TitlePicker)에서 고른다.
  const hasReport = post?.searchQuestion || post?.omittedItems?.length || post?.tagDetails?.length || rulesSnapshot || sources.length > 0 || researchNotes;
  if (!hasReport) return null;

  return (
    <section className="report">
      <h3>작성 리포트</h3>
      {post && (post.searchQuestion || post.mainKeyword) && (
        <div className="report-item">
          {post.searchQuestion && (
            <p>
              <b>검색 질문</b> {post.searchQuestion}
            </p>
          )}
          {post.mainKeyword && (
            <p>
              <b>키워드</b> 메인 <code>{post.mainKeyword}</code>
              {post.subKeywords?.length ? <> · 서브 {post.subKeywords.map((k) => <code key={k}>{k}</code>)}</> : null}
            </p>
          )}
        </div>
      )}
      {sources.length > 0 && (
        <details className="report-item">
          <summary>
            <b>수집한 출처 ({sources.length})</b>
          </summary>
          <ul className="sources">
            {sources.map((s) => (
              <li key={s.url}>
                {s.kind && <span className={`kind-badge ${s.kind}`}>{SOURCE_KIND[s.kind]}</span>}
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      {post?.omittedItems?.length ? (
        <details className="report-item">
          <summary>
            <b>본문에서 뺀 항목 {post.omittedItems.length}개</b> <span className="hint small">자료를 못 찾았거나 분량 때문에 뺌</span>
          </summary>
          <ul>
            {post.omittedItems.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {researchNotes && (
        <details className="report-item">
          <summary>
            <b>리서치 노트</b>
          </summary>
          <pre className="notes">{researchNotes}</pre>
        </details>
      )}
      {rulesSnapshot && (
        <details className="report-item">
          <summary>
            <b>이 글에 적용된 글쓰기 규칙</b>
          </summary>
          <pre className="notes">{rulesSnapshot}</pre>
        </details>
      )}
      {post?.tagDetails?.length ? (
        <details className="report-item">
          <summary>
            <b>태그를 고른 근거</b> <span className="hint small">글 작성 당시 기록이라 태그를 고쳐도 바뀌지 않습니다 · 확인 날짜 {post.tagsCheckedAt} · 검색어 제안은 시점에 따라 달라집니다</span>
          </summary>
          <table className="tag-table">
            <thead>
              <tr>
                <th>태그</th>
                <th>출처</th>
                <th>확인 검색어</th>
              </tr>
            </thead>
            <tbody>
              {post.tagDetails.map((t) => (
                <tr key={t.tag}>
                  <td>#{t.tag}</td>
                  <td>{t.source}</td>
                  <td>{t.query}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </section>
  );
}
