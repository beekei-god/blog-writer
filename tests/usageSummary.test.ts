import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getUsageSummary, recordUsage, savePlanLimits, setDefaultModel, type UsageRecord } from "../server/usage";

/** 2026-11-04(수) 낮 12시 KST. 이번 주 월요일은 2026-11-02 */
const NOW = new Date("2026-11-04T03:00:00Z");

const rec = (at: string, over: Partial<UsageRecord> = {}): UsageRecord => ({
  at,
  stage: "writing",
  model: "claude-a",
  input: 10,
  output: 5,
  cacheRead: 0,
  cacheWrite: 0,
  costUSD: 1,
  ...over,
});

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  await recordUsage([
    rec("2026-10-20T03:00:00Z", { callId: "old" }), // 7일 창·이번 주 밖
    rec("2026-11-01T10:00:00Z", { callId: "sun", stage: "research", model: "claude-b" }), // 지난주 일요일(KST 19시): 7일 창 안, 이번 주 밖
    rec("2026-11-03T14:30:00Z", { callId: "late-tue" }), // KST 화요일 23:30 → 어제
    rec("2026-11-03T15:30:00Z", { callId: "early-wed" }), // KST 수요일 00:30 → 오늘
    // 같은 호출에서 나온 모델 두 줄: 호출 수는 한 번
    rec("2026-11-04T01:00:00Z", { callId: "two", stage: "images", model: "claude-a", input: 100 }),
    rec("2026-11-04T01:00:00Z", { callId: "two", stage: "images", model: "claude-b", input: 1, output: 1, costUSD: 0.5 }),
  ]);
  await savePlanLimits({ fiveHour: { utilization: 0.4, resetsAt: null }, sevenDay: null, status: "allowed", checkedAt: NOW.toISOString() });
  setDefaultModel("claude-default-x");
});
afterAll(() => vi.useRealTimers());

describe("사용량 집계 (BR-USG-005)", () => {
  it("날짜는 한국 시간으로 센다: 오늘·이번 주 시작·최근 7일", async () => {
    const s = await getUsageSummary();
    expect(s.weekStart).toBe("2026-11-02");
    expect(s.days.map((d) => d.date)).toEqual(["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]);
    const calls = Object.fromEntries(s.days.map((d) => [d.date, d.totals.calls]));
    expect(calls).toMatchObject({ "2026-11-01": 1, "2026-11-03": 1, "2026-11-04": 2 }); // 00:30 KST는 오늘, 23:30 KST는 어제
    expect(s.days.reduce((n, d) => n + d.totals.calls, 0)).toBe(4); // 10-20 기록은 창 밖
  });

  it("오늘·이번 주 합계: 같은 callId의 모델 줄은 호출 수 한 번, 토큰·금액은 모두 더한다", async () => {
    const s = await getUsageSummary();
    expect(s.today).toMatchObject({ calls: 2, input: 10 + 100 + 1, output: 5 + 5 + 1, costUSD: 1 + 1 + 0.5 });
    expect(s.week.calls).toBe(3); // 월요일 이후: late-tue, early-wed, two (일요일·옛 기록 제외)
    expect(s.week.input).toBe(10 + 10 + 100 + 1);
  });

  it("이번 주 모델별·단계별 목록은 토큰 합이 큰 순이다", async () => {
    const s = await getUsageSummary();
    expect(s.byModel.map((m) => m.model)).toEqual(["claude-a", "claude-b"]);
    expect(s.byModel[0].totals.calls).toBe(3);
    expect(s.byStage.map((x) => x.stage)).toEqual(["images", "writing"]);
    expect(s.byStage.find((x) => x.stage === "research")).toBeUndefined(); // 지난주 기록
  });

  it("단계별 마지막 모델, 기본 모델, 한도 정보를 함께 준다", async () => {
    const s = await getUsageSummary();
    expect(s.lastModelByStage).toMatchObject({ writing: "claude-a", images: "claude-b", research: "claude-b" });
    expect(s.defaultModel).toBe("claude-default-x");
    expect(s.plan?.fiveHour?.utilization).toBe(0.4);
  });
});
