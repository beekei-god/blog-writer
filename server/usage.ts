import fs from "node:fs/promises";
import path from "node:path";
import type { PlanLimits, TokenTotals, UsageStage, UsageSummary } from "../shared/types";
import { serialQueue, writeFileAtomic, writeJsonAtomic } from "./fsutil";
import { DATA_DIR } from "./store";

/**
 * Claude 호출 기록. 호출마다 한 줄(JSON)을 data/usage.jsonl에 덧붙인다.
 * 플랜 한도 사용률은 마지막으로 받은 값만 data/plan-limits.json에 둔다.
 */
const USAGE_FILE = path.join(DATA_DIR, "usage.jsonl");
const PLAN_FILE = path.join(DATA_DIR, "plan-limits.json");
const KEEP_DAYS = 90;

export interface UsageRecord {
  at: string;
  stage: UsageStage;
  jobId?: string;
  /** 같은 Claude 호출에서 나온 여러 모델 줄을 하나의 호출로 세기 위한 id (예전 기록에는 없음) */
  callId?: string;
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  costUSD: number;
}

/** "default" 선택 시 실제로 쓰인 모델 (claude CLI init 이벤트에서 알게 된 값) */
let defaultModel: string | null = null;
export const setDefaultModel = (m: string) => {
  defaultModel = m;
};

const serial = serialQueue();

export function recordUsage(records: UsageRecord[]) {
  if (!records.length) return Promise.resolve();
  return serial(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.appendFile(USAGE_FILE, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  }).catch((e) => console.error("사용량 기록 실패:", e));
}

export function savePlanLimits(plan: PlanLimits) {
  return serial(() => writeJsonAtomic(PLAN_FILE, plan)).catch((e) => console.error("한도 정보 저장 실패:", e));
}

async function readPlan(): Promise<PlanLimits | null> {
  try {
    return JSON.parse(await fs.readFile(PLAN_FILE, "utf8"));
  } catch {
    return null;
  }
}

async function readRecords(): Promise<UsageRecord[]> {
  let raw: string;
  try {
    raw = await fs.readFile(USAGE_FILE, "utf8");
  } catch {
    return [];
  }
  const out: UsageRecord[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* 깨진 줄은 건너뜀 */
    }
  }
  return out;
}

/** 오래된 기록을 정리한다 (서버 시작 시 한 번). */
export async function pruneUsage() {
  const records = await readRecords();
  const cutoff = Date.now() - KEEP_DAYS * 24 * 3600_000;
  const kept = records.filter((r) => Date.parse(r.at) >= cutoff);
  if (kept.length === records.length) return;
  await serial(() => writeFileAtomic(USAGE_FILE, kept.map((r) => JSON.stringify(r)).join("\n") + (kept.length ? "\n" : "")));
}

/** 한 글(작업)에 쓴 모델별 토큰 */
export async function getJobUsage(jobId: string): Promise<{ model: string; totals: TokenTotals }[]> {
  const byModel = new Map<string, TokenTotals>();
  for (const r of await readRecords()) {
    if (r.jobId !== jobId) continue;
    if (!byModel.has(r.model)) byModel.set(r.model, empty());
    add(byModel.get(r.model)!, r);
  }
  return [...byModel].map(([model, totals]) => ({ model, totals }));
}

// ───── 집계 (날짜는 한국 시간 기준) ─────

const kstDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d); // YYYY-MM-DD
const DAY = 24 * 3600_000;

const empty = (): TokenTotals => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUSD: 0, calls: 0 });
/** 집계 묶음마다 이미 센 호출 id (같은 호출의 모델별 줄은 한 번만 센다) */
const seenCalls = new WeakMap<TokenTotals, Set<string>>();
function add(t: TokenTotals, r: UsageRecord) {
  t.input += r.input;
  t.output += r.output;
  t.cacheRead += r.cacheRead;
  t.cacheWrite += r.cacheWrite;
  t.costUSD += r.costUSD;
  if (r.callId) {
    const seen = seenCalls.get(t) ?? new Set<string>();
    seenCalls.set(t, seen);
    if (seen.has(r.callId)) return;
    seen.add(r.callId);
  }
  t.calls += 1;
}

/** 이번 주 월요일 (한국 시간, YYYY-MM-DD) */
function kstWeekStart(now: Date): string {
  const today = kstDate(now);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=일 … 6=토
  const back = (weekday + 6) % 7;
  return kstDate(new Date(now.getTime() - back * DAY));
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const [records, plan] = await Promise.all([readRecords(), readPlan()]);
  const now = new Date();
  const today = kstDate(now);
  const weekStart = kstWeekStart(now);
  const days = Array.from({ length: 7 }, (_, i) => kstDate(new Date(now.getTime() - (6 - i) * DAY)));

  const todayT = empty();
  const weekT = empty();
  const byDay = new Map(days.map((d) => [d, empty()]));
  const byModel = new Map<string, TokenTotals>();
  const byStage = new Map<UsageStage, TokenTotals>();
  const lastModelByStage: Partial<Record<UsageStage, string>> = {};

  for (const r of records) {
    const d = kstDate(new Date(r.at));
    if (d === today) add(todayT, r);
    const day = byDay.get(d);
    if (day) add(day, r);
    if (d >= weekStart) {
      add(weekT, r);
      if (!byModel.has(r.model)) byModel.set(r.model, empty());
      add(byModel.get(r.model)!, r);
      if (!byStage.has(r.stage)) byStage.set(r.stage, empty());
      add(byStage.get(r.stage)!, r);
    }
    lastModelByStage[r.stage] = r.model; // 기록은 시간순으로 쌓인다
  }

  const total = (t: TokenTotals) => t.input + t.output + t.cacheRead + t.cacheWrite;
  return {
    plan,
    today: todayT,
    week: weekT,
    weekStart,
    days: days.map((date) => ({ date, totals: byDay.get(date)! })),
    byModel: [...byModel].map(([model, totals]) => ({ model, totals })).sort((a, b) => total(b.totals) - total(a.totals)),
    byStage: [...byStage].map(([stage, totals]) => ({ stage, totals })).sort((a, b) => total(b.totals) - total(a.totals)),
    lastModelByStage,
    defaultModel,
  };
}
