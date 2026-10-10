import type { Post } from "../../shared/types";

// ───────────────────────── 작성 리포트 ─────────────────────────

/** 규칙에서 "사용자에게 알리라"고 한 내용: 본문에는 들어가지 않는 작성 리포트 */
export function Report({ post, onChange, disabled }: { post: Post; onChange: (p: Post) => void; disabled: boolean }) {
  // 제목 후보는 본문 맨 위 제목 아래(TitlePicker)에서 고른다.
  const hasReport = post.searchQuestion || post.omittedItems?.length || post.tagDetails?.length;
  if (!hasReport) return null;

  return (
    <section className="report">
      <h3>작성 리포트</h3>
      {(post.searchQuestion || post.mainKeyword) && (
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
      {post.omittedItems?.length ? (
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
      {post.tagDetails?.length ? (
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
