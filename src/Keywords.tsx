import { useEffect, useMemo, useState } from "react";
import type { KeywordRow, KeywordSection } from "../shared/types";
import { api, type KeywordResult } from "./api";
import { errorText } from "./labels";

type SortKey = "total" | "pc" | "mobile" | "keyword";
const COMP_ORDER: Record<KeywordRow["competition"], number> = { 낮음: 0, 중간: 1, 높음: 2, "알 수 없음": 3 };

/** 검색량 표시: 10 미만으로만 나온 쪽은 "<10" */
const countText = (n: number, low: boolean) => (low ? "<10" : n.toLocaleString());

/**
 * 키워드 탐색: 키워드(쉼표로 최대 5개)를 넣으면 연관 키워드와 최근 한 달 월간 검색량(PC·모바일), 경쟁 정도를 보여 준다 (네이버 검색광고 키워드 도구).
 * 키워드를 비워 두면 지금 뜨는 검색어(구글 트렌드)와 최근 주제 추천의 분야를 기준으로 각각 찾는다.
 * 검색량은 네이버 기준의 절대 값이고, 경쟁 정도는 광고 입찰 경쟁이라 글 경쟁과는 다르다. 키워드를 골라 새 글 주제로 넘길 수 있다.
 */
export function Keywords({
  onUseKeyword,
  onRecommend,
  onOpenSettings,
}: {
  onUseKeyword: (keyword: string) => void;
  /** 이 키워드를 분야로 주제 추천을 바로 시작한다 (주제 추천 화면으로 넘어간다) */
  onRecommend: (keyword: string) => void;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [result, setResult] = useState<(KeywordResult & { query: string; at: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "total", dir: -1 });
  const [minVolume, setMinVolume] = useState(0);
  const [comp, setComp] = useState<"all" | KeywordRow["competition"]>("all");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api.getSearchAd().then((s) => setConfigured(s.configured)).catch(() => setConfigured(null));
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await api.exploreKeywords(query.trim());
      setResult({ ...r, query: query.trim(), at: new Date().toLocaleTimeString("ko-KR") });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  /** 조건(키워드 포함, 최소 검색량, 경쟁)에 맞게 거르고 정렬한 줄 */
  const view = useMemo(() => {
    const { key, dir } = sort;
    const norm = (s: string) => s.replace(/\s+/g, "");
    return (result?.sections ?? []).map((sec) => {
      const rows = sec.rows
        .filter((x) => x.total >= minVolume && (comp === "all" || x.competition === comp) && (!filter.trim() || norm(x.keyword).includes(norm(filter))))
        .sort((a, b) => (key === "keyword" ? a.keyword.localeCompare(b.keyword, "ko") : a[key] - b[key]) * dir || b.total - a.total);
      return { sec, rows };
    });
  }, [result, sort, minVolume, comp, filter]);

  const th = (key: SortKey, label: string) => (
    <th>
      <button type="button" className="link" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "keyword" ? 1 : -1 }))}>
        {label}
        {sort.key === key ? (sort.dir === -1 ? " ▼" : " ▲") : ""}
      </button>
    </th>
  );

  const table = (sec: KeywordSection, rows: KeywordRow[]) => {
    const max = Math.max(1, ...sec.rows.map((r) => r.total));
    return rows.length === 0 ? (
      <p className="hint">조건에 맞는 키워드가 없습니다.</p>
    ) : (
      <div className="keyword-table-wrap">
        <table className="keyword-table">
          <thead>
            <tr>
              {th("keyword", "키워드")}
              {th("total", "월간 검색량")}
              {th("pc", "PC")}
              {th("mobile", "모바일")}
              <th>
                <button type="button" className="link" onClick={() => setComp((c) => (c === "낮음" ? "all" : "낮음"))} title="누르면 경쟁 낮은 것만 보기">
                  경쟁
                </button>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.keyword} className={r.seed ? "seed" : ""}>
                <td>
                  {r.keyword} {r.seed && <span className="optional">{sec.id === "input" ? "입력" : "기준"}</span>}
                  {r.trend && <span className="optional" title="구글 트렌드가 알려 주는 오늘의 대략적인 검색 규모"> 급상승 {r.trend}</span>}
                </td>
                <td>
                  <span className="vol-bar" style={{ width: `${Math.max(2, Math.round((r.total / max) * 100))}%` }} />
                  <b>{r.total.toLocaleString()}</b>
                </td>
                <td>{countText(r.pc, r.lowPc)}</td>
                <td>{countText(r.mobile, r.lowMobile)}</td>
                <td className={`comp comp-${COMP_ORDER[r.competition]}`}>{r.competition}</td>
                <td className="row-actions">
                  <button
                    type="button"
                    disabled={r.keyword.trim().length < 2}
                    title={r.keyword.trim().length < 2 ? "주제 추천의 분야는 2자 이상이어야 합니다" : "이 키워드를 분야로 주제 추천을 시작합니다 (몇 분 걸리고 Claude 사용량이 듭니다)"}
                    onClick={() => onRecommend(r.keyword)}
                  >
                    주제 추천받기
                  </button>
                  <button type="button" onClick={() => onUseKeyword(r.keyword)}>
                    이 키워드로 글쓰기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="detail keywords">
      <header>
        <div>
          <h2>키워드 탐색</h2>
          <p className="hint small">
            키워드를 넣으면 연관 키워드와 <b>최근 한 달 월간 검색량</b>(네이버, PC·모바일), 경쟁 정도를 보여 줍니다. 비워 두면 지금 뜨는 검색어와 최근 주제 추천의 분야를 기준으로
            찾습니다. 검색량이 큰 키워드를 골라 새 글의 주제로 쓰거나, 그 키워드를 분야로 <b>주제 추천</b>을 받을 수 있습니다.
          </p>
        </div>
      </header>

      {configured === false && (
        <div className="next-step warn">
          <span>네이버 검색광고 API 키가 연결되어 있지 않습니다. 키가 있어야 검색량을 볼 수 있습니다.</span>
          <button onClick={onOpenSettings}>설정에서 연결하기</button>
        </div>
      )}

      <form className="card" onSubmit={search}>
        <label className="field">
          <span className="field-label">
            키워드 <span className="optional">선택</span>
          </span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예) 청약 일정, 전기차 보조금 (쉼표로 최대 5개). 비워 두면 지금 뜨는 검색어·최근 주제 추천 분야로 찾습니다" maxLength={200} autoFocus />
        </label>
        <div className="form-actions">
          <button type="submit" className="primary" disabled={loading || configured === false}>
            {loading ? "조회 중..." : query.trim() ? "키워드 찾기" : "지금 뜨는 키워드 찾기"}
          </button>
          <span className="hint small">공백은 빼고 조회합니다. 연관 키워드는 검색량 큰 순으로 최대 200개를 보여 줍니다.</span>
        </div>
      </form>

      {error && <p className="error banner">{error}</p>}

      {result && (
        <>
          <section className="card">
            <div className="keyword-filters">
              <label className="mini-label">
                키워드 포함
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="결과 안에서 찾기" />
              </label>
              <label className="mini-label">
                최소 월간 검색량
                <select className="inline-select" value={minVolume} onChange={(e) => setMinVolume(Number(e.target.value))}>
                  {[0, 100, 500, 1000, 5000, 10000].map((v) => (
                    <option key={v} value={v}>
                      {v ? `${v.toLocaleString()} 이상` : "전체"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mini-label">
                경쟁 정도
                <select className="inline-select" value={comp} onChange={(e) => setComp(e.target.value as typeof comp)}>
                  <option value="all">전체</option>
                  {(["낮음", "중간", "높음"] as const).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <span className="hint small">{result.at} 조회</span>
            </div>
          </section>

          {view.map(({ sec, rows }) => (
            <section className="card" key={sec.id}>
              <div className="card-head">
                <h3 className="card-title">
                  {sec.id === "input" ? `“${sec.seeds.join(", ")}” 연관 키워드` : sec.title}{" "}
                  <span className="optional">
                    {sec.rows.length}개{rows.length !== sec.rows.length ? ` 중 ${rows.length}개 표시` : ""}
                  </span>
                </h3>
              </div>
              {sec.note && <p className="hint small">{sec.note}</p>}
              {sec.seeds.length > 0 && sec.id !== "input" && <p className="hint small">조회한 키워드: {sec.seeds.join(", ")}</p>}
              {sec.error ? <p className="error small">{sec.error}</p> : table(sec, rows)}
            </section>
          ))}
          <p className="hint small">
            검색량은 네이버 검색광고 키워드 도구의 최근 한 달 값입니다(10 미만은 “&lt;10”이고 합계에는 5로 계산). 경쟁 정도는 광고 입찰 경쟁이라 블로그 글 경쟁과 같지 않으니 참고만 하세요.
            “지금 뜨는 검색어”는 구글 트렌드 기준이라 한국 블로그 분야와 맞지 않는 검색어(스포츠 경기 등)도 섞여 있습니다.
          </p>
        </>
      )}
    </div>
  );
}
