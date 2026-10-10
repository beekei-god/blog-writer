import { useCallback, useEffect, useRef, useState } from "react";
import type { Recommendation, TopicCandidate } from "../shared/types";
import { api } from "./api";
import { errorText } from "./labels";
import { Sentences } from "./Sentences";

const EVIDENCE_KIND = { news: "뉴스", stat: "통계", official: "공식" } as const;

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 28;
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${h - (v / max) * (h - 2) - 1}`).join(" ");
  return (
    <svg width={w} height={h} className="spark" aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CandidateCard({ c, rank, datalabOk, onUse }: { c: TopicCandidate; rank: number; datalabOk: boolean; onUse: () => void }) {
  return (
    <li className="candidate">
      <div className="cand-head">
        <span className="rank">{rank}</span>
        <h4>{c.topic}</h4>
        <button className="primary" onClick={onUse} title="새 글 화면에 주제와 근거 링크를 채웁니다">
          이 주제로 글쓰기 →
        </button>
      </div>
      <div className="cand-metrics">
        <span>
          검색어 {c.keywords.map((k) => <code key={k}>{k}</code>)}
        </span>
        {datalabOk && c.interest && (
          <span className="interest">
            관심도 <b>{c.interest.level}</b>
            <span className={`momentum ${c.interest.momentum >= 0 ? "up" : "down"}`}>
              {c.interest.momentum >= 0 ? "▲" : "▼"} {Math.abs(c.interest.momentum)}%
            </span>
            <Sparkline values={c.interest.series} />
          </span>
        )}
        <span className="hint small">자동완성 {c.autocompleteCount ?? 0}개</span>
      </div>
      <p>{c.reason}</p>
      <ul className="evidence">
        {c.evidence.map((e) => (
          <li key={e.url}>
            <span className={`kind-badge ${e.kind === "official" ? "official" : e.kind === "news" ? "press" : ""}`}>
              {EVIDENCE_KIND[e.kind]}
            </span>
            {e.date && <span className="hint small">{e.date} </span>}
            <a href={e.url} target="_blank" rel="noreferrer noopener">
              {e.title || e.url}
            </a>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** 다른 화면(키워드 탐색)에서 넘어온 추천 요청: field로 바로 시작한다. nonce는 요청마다 달라 같은 요청을 두 번 시작하지 않게 한다 */
export interface RecommendRequest {
  field: string;
  nonce: number;
}

export function Recommend({
  onUseTopic,
  request,
  onRequestHandled,
}: {
  onUseTopic: (topic: string, links: string[]) => void;
  request?: RecommendRequest | null;
  onRequestHandled?: () => void;
}) {
  const [field, setField] = useState("");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [datalabConfigured, setDatalabConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRecs(await api.listRecommendations());
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    api.getDatalab().then((d) => setDatalabConfigured(d.configured)).catch(() => {});
  }, [refresh]);

  const busy = recs.some((r) => r.status === "running");
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => void refresh(), 2000);
    return () => clearInterval(t);
  }, [busy, refresh]);

  const selected = recs.find((r) => r.id === selectedId) ?? recs[0];

  async function begin(f: string) {
    setError("");
    try {
      const r = await api.startRecommendation(f);
      setSelectedId(r.id);
      await refresh();
    } catch (err) {
      setError(errorText(err));
    }
  }
  const start = (e: React.FormEvent) => {
    e.preventDefault();
    void begin(field.trim());
  };

  // 키워드 탐색에서 "주제 추천받기"로 넘어온 경우: 그 키워드를 분야에 넣고 바로 시작한다 (진행 중이면 서버가 거절하고 그 문구를 보여 준다).
  const handled = useRef<number | null>(null);
  useEffect(() => {
    if (!request || handled.current === request.nonce) return;
    handled.current = request.nonce;
    setField(request.field);
    onRequestHandled?.();
    void begin(request.field);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="detail recommend">
      <header>
        <div>
          <h2>주제 추천</h2>
          <Sentences className="hint small">
            입력한 분야에서 최근 뉴스·통계를 찾아 주제 후보를 만들고, 네이버 자동완성과 데이터랩 검색 관심도로 순위를 매깁니다.
            관심도는 기준 키워드의 최근 4주 평균을 100으로 놓은 상대값이고, ▲▼는 최근 7일과 그 전 3주의 비교입니다.
          </Sentences>
        </div>
      </header>
      {datalabConfigured === false && (
        <p className="warn">데이터랩이 연결되지 않아 검색 관심도 순위 없이 찾은 순서대로 보여 줍니다. "설정"에서 데이터랩 키를 넣으면 순위를 매깁니다.</p>
      )}
      <form className="rec-form" onSubmit={start}>
        <input maxLength={100} value={field} onChange={(e) => setField(e.target.value)} placeholder="분야 (예: 청약·부동산, 정부 지원금, 제주 여행)" />
        <button type="submit" className="primary" disabled={busy || field.trim().length < 2}>
          {busy ? "추천 중..." : "주제 추천받기"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {recs.length > 1 && (
        <div className="rec-history">
          {recs.map((r) => (
            <button key={r.id} className={r.id === selected?.id ? "active" : ""} onClick={() => setSelectedId(r.id)}>
              {r.field} · {new Date(r.createdAt).toLocaleDateString("ko-KR")}
              {r.status === "running" ? " (진행 중)" : r.status === "failed" ? " (실패)" : ""}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          {selected.error && <p className="error">{selected.error}</p>}
          {selected.status === "running" && selected.logs.length > 0 && (
            <p className="current-activity">
              <span className="spinner" /> {selected.logs[selected.logs.length - 1].message}
            </p>
          )}
          <details className="logs">
            <summary>진행 로그 ({selected.logs.length})</summary>
            <ol>
              {selected.logs.map((l, i) => (
                <li key={i}>
                  <time>{new Date(l.at).toLocaleTimeString()}</time> {l.message}
                </li>
              ))}
            </ol>
          </details>
          {selected.status === "done" && (
            <>
              <h3>
                추천 주제 {selected.candidates.length}개
                <span className="hint small">
                  {" "}
                  {selected.datalab === "ok"
                    ? `· 데이터랩 ${selected.period?.start} ~ ${selected.period?.end}, 기준 키워드 "${selected.anchorKeyword}"`
                    : "· 데이터랩 미사용: 검색량 근거가 없어 순위 없이 찾은 순서대로 보여 줍니다"}
                </span>
              </h3>
              <ol className="candidates">
                {selected.candidates.map((c, i) => (
                  <CandidateCard
                    key={c.topic}
                    c={c}
                    rank={i + 1}
                    datalabOk={selected.datalab === "ok"}
                    onUse={() => onUseTopic(c.topic, c.evidence.map((e) => e.url))}
                  />
                ))}
              </ol>
            </>
          )}
          {selected.status === "running" && (
            <button
              className="danger"
              onClick={async () => {
                if (!confirm("진행 중인 주제 추천을 중지할까요?")) return;
                await api.cancelRecommendation(selected.id).catch((e) => setError(String(e.message ?? e)));
                await refresh();
              }}
            >
              추천 중지
            </button>
          )}
          <button
            className="danger ghost"
            disabled={selected.status === "running"}
            onClick={async () => {
              if (!confirm("이 추천 결과를 삭제할까요?")) return;
              await api.deleteRecommendation(selected.id).catch((e) => setError(String(e.message ?? e)));
              setSelectedId(null);
              await refresh();
            }}
          >
            추천 결과 삭제
          </button>
        </>
      )}
    </div>
  );
}
