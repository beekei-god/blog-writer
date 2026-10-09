import { describe, expect, it } from "vitest";
import { CancelledError, cancelJob, withCancel } from "../server/cancel";
import { kstParts, kstText, naverPublishSteps, publishPrompt, PUBLISH_DUMP_JS, PUBLISH_HELPERS, runPublishSteps, PublishStepError, tistoryPublishSteps } from "../server/browser/publish";

describe("예약 시각은 한국 시간으로", () => {
  it("UTC를 한국 시간 연·월·일·시·분으로", () => {
    expect(kstParts("2026-10-09T15:30:00.000Z")).toEqual({ y: 2026, m: 10, d: 10, hour: 0, minute: 30 });
    expect(kstText("2026-12-31T23:10:00.000Z")).toBe("2027.01.01 08:10");
  });
});

describe("발행 창 단계", () => {
  const at = "2026-10-10T00:30:00.000Z"; // 한국 시간 09:30
  it("네이버 예약은 10분 단위가 아니면 단계를 만들지 않는다", () => {
    expect(() => naverPublishSteps({ mode: "schedule", scheduledAt: "2026-10-10T00:35:00.000Z" })).toThrow(PublishStepError);
  });
  it("예약이면 날짜·시각을 넣고 다시 읽어 확인한 뒤에 발행 버튼을 누른다", () => {
    for (const steps of [naverPublishSteps({ mode: "schedule", scheduledAt: at }), tistoryPublishSteps({ mode: "schedule", scheduledAt: at })]) {
      const names = steps.map((s) => s.name);
      expect(names.indexOf("예약 시각 확인")).toBeGreaterThan(names.indexOf("예약 시각 입력"));
      expect(names.indexOf("발행 버튼 누르기")).toBeGreaterThan(names.indexOf("예약 시각 확인"));
      expect(names.at(-1)).toBe("발행 확인");
    }
  });
  it("즉시 발행에는 예약 단계가 없다", () => {
    expect(naverPublishSteps({ mode: "publish" }).some((s) => s.name.startsWith("예약"))).toBe(false);
  });
  it("단계의 js는 문법이 맞다", () => {
    for (const s of [...naverPublishSteps({ mode: "schedule", scheduledAt: at }), ...tistoryPublishSteps({ mode: "schedule", scheduledAt: at })]) {
      expect(() => new Function(s.js)).not.toThrow();
    }
  });
});

describe("단계 실행", () => {
  const steps = [
    { name: "하나", js: "1" },
    { name: "둘", js: "2" },
  ];
  it("모든 단계가 true면 끝난다 (false면 다시 실행)", async () => {
    const seen: string[] = [];
    let tries = 0;
    await runPublishSteps(steps, async (js) => (seen.push(js), js === "1" ? ++tries > 1 : true), () => {}, 1);
    expect(seen).toEqual(["1", "1", "2"]);
  });
  it("ERR면 바로 멈추고 임시저장은 됐다고 알린다", async () => {
    await expect(runPublishSteps(steps, async () => "ERR:버튼 없음", () => {}, 1)).rejects.toThrow(/임시저장은 했지만 발행 창의 "하나"에서 멈췄습니다: 버튼 없음/);
  });
  it("발행 버튼을 누르기 전에는 중지하면 멈추고, 누른 뒤에는 끝까지 확인한다", async () => {
    const before = withCancel("pub-a", () => runPublishSteps([{ name: "기다림", js: "w", timeoutMs: 5_000 }], async () => false, () => {}, 5));
    setTimeout(() => cancelJob("pub-a"), 20);
    await expect(before).rejects.toBeInstanceOf(CancelledError);

    let checks = 0;
    const after = withCancel("pub-b", () =>
      runPublishSteps(
        [
          { name: "발행 버튼 누르기", js: "click", publishes: true },
          { name: "발행 확인", js: "check", timeoutMs: 5_000 },
        ],
        async (js) => (js === "click" ? (cancelJob("pub-b"), true) : ++checks > 3),
        () => {},
        5,
      ),
    );
    await expect(after).resolves.toBeUndefined();
  });
  it("멈추면 그 순간의 화면 구조를 오류에 붙이고, 구조를 못 읽어도 원래 오류는 그대로 낸다", async () => {
    const fail = (dump: () => Promise<unknown>) =>
      runPublishSteps([{ name: "하나", js: "1" }], (js) => (js === PUBLISH_DUMP_JS ? dump() : Promise.resolve("ERR:버튼 없음")), () => {}, 1).catch((e) => e);
    const withDump = await fail(async () => "blog.naver.com/nid/postwrite\nbutton \"발행\"");
    expect(withDump).toBeInstanceOf(PublishStepError);
    expect(withDump.dialog).toContain('button "발행"');
    const noDump = await fail(() => Promise.reject(new Error("탭이 닫힘")));
    expect(noDump.message).toContain("버튼 없음");
    expect(noDump.dialog).toBeUndefined();
  });
  it("보이는 요소를 offsetParent로 판별하지 않는다 (position:fixed 팝업이 안 보이게 된다)", () => {
    expect(PUBLISH_HELPERS).not.toMatch(/\.offsetParent/);
    expect(PUBLISH_DUMP_JS).not.toMatch(/\.offsetParent/);
    expect(PUBLISH_HELPERS).toContain("getClientRects");
  });
  it("화면 구조를 읽는 스크립트는 문법이 맞고 글 본문(편집 영역)은 건너뛴다", () => {
    expect(() => new Function(PUBLISH_DUMP_JS)).not.toThrow();
    expect(PUBLISH_DUMP_JS).toContain('[contenteditable="true"]');
  });
  it("발행 확인이 안 되면 블로그에서 직접 확인하라고 알린다", async () => {
    await expect(runPublishSteps([{ name: "발행 확인", js: "x", timeoutMs: 5 }], async () => false, () => {}, 1)).rejects.toThrow(/발행됐는지 확인하지 못했습니다/);
  });
});

describe("Claude in Chrome 발행 안내", () => {
  it("임시저장만이면 안내가 없고, 예약이면 한국 시간과 확인 조건을 넣는다", () => {
    expect(publishPrompt("tistory", { mode: "draft" })).toBe("");
    const p = publishPrompt("tistory", { mode: "schedule", scheduledAt: "2026-10-10T00:30:00.000Z" });
    expect(p).toContain("2026년 10월 10일, 시각 09:30");
    expect(p).toContain('status를 "scheduled"');
    expect(p).toContain("발행 버튼을 누르지 말고");
    // 입력에 확인할 점이 있어도 발행은 진행한다 (예약 시각이 다를 때만 멈춘다)
    expect(p).toContain("문제가 있어도 발행은 진행하세요");
  });
});
