import { useCallback, useEffect, useState } from "react";
import { BUSY_STATUSES, blogIdOf, PLATFORMS, type Job, type Platform, type Settings, type UsageSummary } from "../shared/types";
import { matchesFilter, type BlogFilter, type StatusFilter } from "../shared/blogStatus";
import { blogStatusText, PLATFORM_SHORT_LABEL } from "../shared/labels";
import { api } from "./api";
import { JobDetail } from "./job/JobDetail";
import { errorText, statusLabel } from "./labels";
import { canLeave } from "./leaveGuard";
import { NewJob } from "./NewJob";
import { Keywords } from "./Keywords";
import { Recommend, type RecommendRequest } from "./Recommend";
import { RulesEditor } from "./RulesEditor";
import { SettingsPanel } from "./SettingsPanel";
import { Usage } from "./Usage";

type View = "new" | "job" | "recommend" | "keywords" | "rules" | "usage" | "settings";

const TABS: { view: View; label: string }[] = [
  { view: "new", label: "새 글" },
  { view: "keywords", label: "키워드 탐색" },
  { view: "recommend", label: "주제 추천" },
  { view: "rules", label: "글쓰기 규칙" },
  { view: "usage", label: "사용량" },
  { view: "settings", label: "설정" },
];

/** "내 글" 목록의 상태 필터 (묶는 기준은 `matchesFilter`). 블로그를 고르면 그 블로그에서의 상태로 거른다 */
const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "researching", label: "자료 조사 중" },
  { key: "draft", label: "초안검토" },
  { key: "saved", label: "임시저장" },
  { key: "published", label: "발행완료" },
];
const BLOG_FILTERS: { key: BlogFilter; label: string }[] = [{ key: "all", label: "전체 블로그" }, ...PLATFORMS.map((p) => ({ key: p, label: PLATFORM_SHORT_LABEL[p] }))];

function shortDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("new");
  const [topic, setTopic] = useState("");
  // 키워드 탐색에서 넘어온 주제 추천 요청 (주제 추천 화면이 받아 시작하면 비운다)
  const [recommendRequest, setRecommendRequest] = useState<RecommendRequest | null>(null);
  const [linksText, setLinksText] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [blogFilter, setBlogFilter] = useState<BlogFilter>("all");

  const refresh = useCallback(async () => {
    try {
      setJobs(await api.listJobs());
      setError("");
    } catch (e) {
      setError(`서버에 연결하지 못했습니다: ${errorText(e)}`);
    }
  }, []);

  const loadSettings = useCallback(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    void refresh();
    loadSettings();
  }, [refresh, loadSettings]);

  // 계정을 바꿀 때 사용량을 다시 읽는다: check면 새 계정으로 한도를 새로 확인(짧은 Claude 호출 한 번), 아니면 저장된 값만 읽는다
  const refreshUsage = (check: boolean) => {
    (check ? api.checkPlan() : api.getUsage()).then(setUsage).catch(() => api.getUsage().then(setUsage).catch(() => {}));
  };

  // 상단의 한도 표시: 1분마다, 그리고 작업이 끝날 때마다 새로 읽는다 (Claude 호출 없음).
  const busyCount = jobs.filter((j) => BUSY_STATUSES.includes(j.status)).length;
  useEffect(() => {
    const load = () => api.getUsage().then(setUsage).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [busyCount]);

  // 진행 중인 작업이 있을 때만 폴링한다.
  const hasBusy = jobs.some((j) => BUSY_STATUSES.includes(j.status) || j.editProposal?.status === "running");
  useEffect(() => {
    if (!hasBusy) return;
    const t = setInterval(() => void refresh(), 1500);
    return () => clearInterval(t);
  }, [hasBusy, refresh]);

  const go = (next: View, jobId?: string) => {
    if (!canLeave()) return;
    if (jobId !== undefined) setSelectedId(jobId);
    setView(next);
  };

  const selected = view === "job" ? (jobs.find((j) => j.id === selectedId) ?? null) : null;
  // 블로그마다 연결되어 있는지 (워드프레스는 사이트 주소, 그 밖은 블로그 ID). 글을 올릴 때마다 올릴 블로그를 직접 고른다.
  const ready: Record<Platform, boolean> = {
    naver: !!settings && !!blogIdOf(settings, "naver"),
    tistory: !!settings && !!blogIdOf(settings, "tistory"),
    wordpress: !!settings && !!blogIdOf(settings, "wordpress"),
  };
  const blogReady = ready.naver || ready.tistory || ready.wordpress; // 하나라도 연결되어 있으면 올릴 수 있다
  const visibleJobs = jobs.filter((j) => matchesFilter(j, blogFilter, filter));

  return (
    <div className="app">
      <header className="topbar">
        <h1>Blog Writer</h1>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.view} className={view === t.view ? "on" : ""} onClick={() => go(t.view)}>
              {t.label}
              {t.view === "settings" && settings && !blogReady && <span className="dot" aria-label="설정 필요" />}
            </button>
          ))}
        </nav>
        {usage?.plan && (
          <button className="plan-chip" onClick={() => go("usage")} title="Claude 플랜 한도 사용률 (계정 전체)">
            <PlanPct label="5시간" v={usage.plan.fiveHour?.utilization} />
            <PlanPct label="주간" v={usage.plan.sevenDay?.utilization} />
          </button>
        )}
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-head">
            <h2>내 글</h2>
            <span className="hint small">{jobs.length ? (visibleJobs.length === jobs.length ? `${jobs.length}개` : `${visibleJobs.length} / ${jobs.length}개`) : ""}</span>
          </div>
          <div className="filter-chips" role="group" aria-label="블로그별로 보기">
            {BLOG_FILTERS.map((b) => (
              <button key={b.key} className={blogFilter === b.key ? "on" : ""} aria-pressed={blogFilter === b.key} onClick={() => setBlogFilter(b.key)}>
                {b.label}
              </button>
            ))}
          </div>
          <div className="filter-chips" role="group" aria-label="상태별로 보기">
            {FILTERS.map((f) => {
              const count = jobs.filter((j) => matchesFilter(j, blogFilter, f.key)).length;
              return (
                <button key={f.key} className={filter === f.key ? "on" : ""} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label} <span className="count">{count}</span>
                </button>
              );
            })}
          </div>
          <ul className="job-list">
            {visibleJobs.map((j) => (
              <li key={j.id}>
                <button className={selected?.id === j.id ? "active" : ""} onClick={() => go("job", j.id)}>
                  <span className="topic">{j.post?.title ?? j.topic}</span>
                  <span className="meta">
                    {/* 올린 블로그가 있는 초안은 블로그별 상태만 보인다 (올리는 중·진행 중이면 그 상태도 함께) */}
                    <span className="badges">
                      {(j.status !== "draft_ready" || !PLATFORMS.some((p) => j.blogs?.[p])) && (
                        <span className={`badge ${j.status}`}>
                          {BUSY_STATUSES.includes(j.status) && <span className="spinner" />}
                          {statusLabel(j)}
                        </span>
                      )}
                      {PLATFORMS.map((p) => {
                        const b = j.blogs?.[p];
                        return b && <span key={p} className={`badge ${b.status}`}>{blogStatusText(p, b.status)}</span>;
                      })}
                    </span>
                    <span className="hint small">{shortDate(j.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
            {jobs.length === 0 && (
              <li className="empty small-empty">
                아직 쓴 글이 없습니다.
                <br />
                "새 글"에서 주제를 넣어 시작하세요.
              </li>
            )}
            {jobs.length > 0 && visibleJobs.length === 0 && <li className="empty small-empty">이 상태의 글이 없습니다.</li>}
          </ul>
        </aside>

        <main className="content">
          {error && <p className="error banner">{error}</p>}
          {settings && !blogReady && view !== "settings" && (
            <div className="notice">
              <span>블로그가 아직 연결되지 않았습니다. 초안은 만들 수 있지만, 블로그에 올리려면 블로그 ID를 넣어야 합니다.</span>
              <button onClick={() => go("settings")}>설정하기</button>
            </div>
          )}

          {view === "new" && (
            <NewJob
              topic={topic}
              links={linksText}
              onTopicChange={setTopic}
              onLinksChange={setLinksText}
              onOpenRecommend={() => go("recommend")}
              onCreated={async (id) => {
                await refresh();
                setSelectedId(id);
                setView("job");
              }}
            />
          )}
          {view === "recommend" && (
            <Recommend
              request={recommendRequest}
              onRequestHandled={() => setRecommendRequest(null)}
              onUseTopic={(t, links) => {
                if (!canLeave()) return;
                setTopic(t);
                setLinksText(links.join("\n"));
                setView("new");
              }}
            />
          )}
          {view === "keywords" && (
            <Keywords
              onUseKeyword={(k) => {
                if (!canLeave()) return;
                setTopic(k);
                setLinksText("");
                setView("new");
              }}
              onRecommend={(k) => {
                if (!canLeave()) return;
                setRecommendRequest({ field: k, nonce: Date.now() });
                setView("recommend");
              }}
              onOpenSettings={() => go("settings")}
            />
          )}
          {view === "rules" && <RulesEditor />}
          {view === "usage" && <Usage summary={usage} settings={settings} onSummary={setUsage} onOpenSettings={() => go("settings")} />}
          {view === "settings" && <SettingsPanel onSaved={setSettings} defaultModel={usage?.defaultModel ?? null} onUsage={refreshUsage} />}
          {view === "job" &&
            (selected ? (
              <JobDetail
                key={selected.id}
                job={selected}
                ready={ready}
                onChange={refresh}
                onOpenSettings={() => go("settings")}
                onDeleted={() => {
                  setSelectedId(null);
                  setView("new");
                  void refresh();
                }}
              />
            ) : (
              <p className="empty">왼쪽 목록에서 글을 선택하세요.</p>
            ))}
        </main>
      </div>
    </div>
  );
}

function PlanPct({ label, v }: { label: string; v: number | undefined }) {
  if (v === undefined) return null;
  const pct = Math.round(v * 100);
  return (
    <span className={pct >= 95 ? "critical" : pct >= 80 ? "warning" : ""}>
      {label} <b>{pct}%</b>
    </span>
  );
}
