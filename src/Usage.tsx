import { useEffect, useRef, useState } from "react";
import { STAGES, type PlanWindow, type Settings, type TokenTotals, type UsageSummary } from "../shared/types";
import { api } from "./api";
import {
  errorText,
  fmtTokens,
  fmtUSD,
  MODEL_CHOICE_LABEL,
  prettyModel,
  resetText,
  STAGE_LABEL,
  timeAgo,
  totalTokens,
} from "./labels";

interface Props {
  summary: UsageSummary | null;
  settings: Settings | null;
  onSummary: (s: UsageSummary) => void;
  onOpenSettings: () => void;
}

export function Usage({ summary, settings, onSummary, onOpenSettings }: Props) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  // 이 화면을 보는 동안에는 15초마다 새로 읽는다 (Claude 호출 없음).
  useEffect(() => {
    const load = () => api.getUsage().then(onSummary).catch((e) => setError(errorText(e)));
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [onSummary]);

  async function check() {
    setChecking(true);
    setError("");
    try {
      onSummary(await api.checkPlan());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setChecking(false);
    }
  }

  if (!summary) return <p className="empty">{error || "불러오는 중..."}</p>;
  const plan = summary.plan;

  return (
    <div className="detail usage">
      <header>
        <div>
          <h2>Claude 사용량</h2>
          <p className="hint small">이 앱은 이 컴퓨터에 로그인된 Claude Code로 Claude를 부릅니다. API 요금은 나가지 않고, Claude 플랜 한도를 씁니다.</p>
        </div>
      </header>

      <section className="card">
        <div className="card-head">
          <h3 className="card-title">플랜 한도</h3>
          <div className="form-actions">
            {plan && <span className="hint small">마지막 확인 {timeAgo(plan.checkedAt)}</span>}
            <button onClick={check} disabled={checking}>
              {checking ? "확인 중..." : "지금 확인"}
            </button>
          </div>
        </div>
        {plan ? (
          <div className="meters">
            <Meter label="5시간 한도" w={plan.fiveHour} />
            <Meter label="주간 한도 (7일)" w={plan.sevenDay} />
          </div>
        ) : (
          <p className="hint">아직 확인한 값이 없습니다. "지금 확인"을 누르거나 글을 하나 만들면 표시됩니다.</p>
        )}
        <p className="hint small">
          계정 전체 사용량입니다. 이 앱뿐 아니라 터미널의 Claude Code 등 같은 계정으로 쓴 양이 모두 포함됩니다. "지금 확인"은 Haiku로 아주 짧은
          요청을 한 번 보내서 최신 값을 받아 옵니다.
        </p>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h3 className="card-title">이 앱이 쓴 토큰</h3>
        <div className="tiles">
          <Tile label="오늘" t={summary.today} />
          <Tile label={`이번 주 (${summary.weekStart.slice(5).replace("-", "/")} 월요일부터)`} t={summary.week} />
        </div>
        <DailyBars days={summary.days} />
        <p className="hint small">중지하거나 시간 초과로 끊긴 호출의 토큰은 기록되지 않아 실제보다 적게 보일 수 있습니다.</p>
      </section>

      <section className="card">
        <div className="card-head">
          <h3 className="card-title">단계별 모델</h3>
          <button className="link" onClick={onOpenSettings}>
            모델 바꾸기
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>단계</th>
                <th>설정</th>
                <th>마지막으로 쓴 모델</th>
                <th className="num">이번 주 토큰</th>
                <th className="num">호출</th>
              </tr>
            </thead>
            <tbody>
              {STAGES.map((stage) => {
                const choice = settings?.models[stage] ?? "default";
                const row = summary.byStage.find((s) => s.stage === stage)?.totals;
                return (
                  <tr key={stage}>
                    <td>{STAGE_LABEL[stage]}</td>
                    <td>
                      {choice === "default"
                        ? `Claude Code 설정${summary.defaultModel ? ` (${prettyModel(summary.defaultModel)})` : ""}`
                        : MODEL_CHOICE_LABEL[choice].name}
                    </td>
                    <td>{summary.lastModelByStage[stage] ? prettyModel(summary.lastModelByStage[stage]) : <span className="hint">아직 없음</span>}</td>
                    <td className="num">{row ? fmtTokens(totalTokens(row)) : "–"}</td>
                    <td className="num">{row?.calls ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {summary.byModel.length > 0 && (
        <section className="card">
          <h3 className="card-title">이번 주 모델별</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>모델</th>
                  <th className="num">입력</th>
                  <th className="num">출력</th>
                  <th className="num">캐시 읽기</th>
                  <th className="num">캐시 쓰기</th>
                  <th className="num" title="API 정가로 계산했을 때의 금액. 구독 요금과는 관계없습니다.">
                    정가 환산
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.byModel.map(({ model, totals }) => (
                  <tr key={model}>
                    <td title={model}>{prettyModel(model)}</td>
                    <td className="num">{fmtTokens(totals.input)}</td>
                    <td className="num">{fmtTokens(totals.output)}</td>
                    <td className="num">{fmtTokens(totals.cacheRead)}</td>
                    <td className="num">{fmtTokens(totals.cacheWrite)}</td>
                    <td className="num">{fmtUSD(totals.costUSD)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint small">정가 환산은 같은 양을 API로 썼을 때의 금액입니다. 구독 플랜에는 따로 청구되지 않습니다.</p>
        </section>
      )}
    </div>
  );
}

function Meter({ label, w }: { label: string; w: PlanWindow | null }) {
  if (!w) {
    return (
      <div className="meter">
        <div className="meter-head">
          <span>{label}</span>
          <span className="hint small">정보 없음</span>
        </div>
      </div>
    );
  }
  const pct = Math.round(w.utilization * 100);
  const level = pct >= 95 ? "critical" : pct >= 80 ? "warning" : "normal";
  return (
    <div className={`meter ${level}`}>
      <div className="meter-head">
        <span>{label}</span>
        <b>{pct}%</b>
      </div>
      <div className="meter-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
        <div className="meter-fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="meter-foot">
        {level !== "normal" && <span className="meter-status">⚠ {level === "critical" ? "거의 다 씀" : "많이 씀"}</span>}
        <span className="hint small">{resetText(w.resetsAt)}</span>
      </div>
    </div>
  );
}

function Tile({ label, t }: { label: string; t: TokenTotals }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{fmtTokens(totalTokens(t))}</span>
      <span className="tile-unit">토큰 · 호출 {t.calls}회</span>
      <span className="tile-sub">
        입력 {fmtTokens(t.input)} · 출력 {fmtTokens(t.output)} · 캐시 {fmtTokens(t.cacheRead + t.cacheWrite)}
      </span>
    </div>
  );
}

// date는 서버가 한국 시간 기준으로 만든 YYYY-MM-DD다. 브라우저 시간대에 영향받지 않게 문자열에서 요일을 계산한다.
const dayLabel = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d} (${"일월화수목금토"[weekday]})`;
};

/** 최근 7일 일별 토큰 (단일 시리즈 막대) */
function DailyBars({ days }: { days: UsageSummary["days"] }) {
  const [hover, setHover] = useState<number | null>(null);
  // 화면 너비 그대로 그려서 글자가 확대·축소되지 않게 한다.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(560);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const values = days.map((d) => totalTokens(d.totals));
  const max = Math.max(...values, 1);
  const H = 140;
  const top = 18;
  const slot = W / days.length;
  const barW = Math.min(32, slot - 16);
  const hovered = hover !== null ? days[hover] : null;

  return (
    <div className="daily">
      <div className="daily-head">
        <span className="field-label">최근 7일 일별 토큰</span>
        {hovered ? (
          <span className="hint small">
            {dayLabel(hovered.date)} · <b className="ink">{fmtTokens(totalTokens(hovered.totals))}</b> · 입력 {fmtTokens(hovered.totals.input)} · 출력{" "}
            {fmtTokens(hovered.totals.output)} · 캐시 {fmtTokens(hovered.totals.cacheRead + hovered.totals.cacheWrite)} · 호출 {hovered.totals.calls}회
          </span>
        ) : (
          <span className="hint small">막대에 마우스를 올리면 자세히 보입니다</span>
        )}
      </div>
      <div ref={box}>
      <svg width={W} height={H + 24} className="bars" role="img" aria-label="최근 7일 일별 토큰 사용량">
        <line x1={0} x2={W} y1={H} y2={H} className="axis" />
        {days.map((d, i) => {
          const v = values[i];
          const h = v ? Math.max(3, ((H - top) * v) / max) : 0;
          const x = i * slot + (slot - barW) / 2;
          const isToday = i === days.length - 1;
          return (
            <g
              key={d.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={hover === i ? "on" : ""}
            >
              <rect x={i * slot} y={0} width={slot} height={H + 24} className="hit" />
              {h > 0 && <path d={roundedTop(x, H - h, barW, h, 4)} className="bar" />}
              {v > 0 && (hover === i || v === max) && (
                <text x={x + barW / 2} y={H - h - 5} textAnchor="middle" className="val">
                  {fmtTokens(v)}
                </text>
              )}
              <text x={x + barW / 2} y={H + 16} textAnchor="middle" className={`tick ${isToday ? "today" : ""}`}>
                {isToday ? "오늘" : dayLabel(d.date).split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      <details>
        <summary>표로 보기</summary>
        <table className="data-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th className="num">합계</th>
              <th className="num">입력</th>
              <th className="num">출력</th>
              <th className="num">캐시</th>
              <th className="num">호출</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td>{dayLabel(d.date)}</td>
                <td className="num">{fmtTokens(totalTokens(d.totals))}</td>
                <td className="num">{fmtTokens(d.totals.input)}</td>
                <td className="num">{fmtTokens(d.totals.output)}</td>
                <td className="num">{fmtTokens(d.totals.cacheRead + d.totals.cacheWrite)}</td>
                <td className="num">{d.totals.calls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** 위쪽 모서리만 둥근 막대 (바닥은 기준선에 붙는다) */
function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
