import { describe, expect, it } from "vitest";
import { getLastCategory, getSavedCategories, saveCategoryList, saveLastCategory } from "../server/categories";
import { categoryPrompt, cleanCategoryNames, naverStepsWithOptions, selectCategorySteps, selectTopicSteps } from "../server/browser/category";
import { runPublishSteps } from "../server/browser/publish";

describe("블로그 카테고리 기억", () => {
  it("목록은 저장한 블로그의 것만 돌려준다 (블로그 ID가 바뀌면 없는 것)", async () => {
    expect(await getSavedCategories("tistory", "myblog")).toBeNull();
    const at = await saveCategoryList("tistory", "myblog", ["일상", "여행"]);
    expect(await getSavedCategories("tistory", "myblog")).toEqual({ categories: [{ name: "일상" }, { name: "여행" }], fetchedAt: at });
    expect(await getSavedCategories("tistory", "other")).toBeNull();
    expect(await getSavedCategories("naver", "myblog")).toBeNull();
  });
  it("마지막으로 고른 카테고리는 블로그마다 따로 기억하고, 고르지 않으면 지운다", async () => {
    await saveLastCategory("wordpress", { id: 7, name: "여행" });
    await saveLastCategory("naver", { name: "맛집" });
    expect(await getLastCategory("wordpress")).toEqual({ id: 7, name: "여행" });
    expect(await getLastCategory("naver")).toEqual({ name: "맛집" });
    await saveLastCategory("naver", undefined);
    expect(await getLastCategory("naver")).toBeUndefined();
    expect(await getLastCategory("wordpress")).toEqual({ id: 7, name: "여행" });
  });
});

describe("카테고리 읽기·고르기 코드", () => {
  it("읽은 글자에서 카테고리 이름만 남긴다", () => {
    const long = "가".repeat(41);
    expect(cleanCategoryNames([" 일상 ", "여행\n  후기", "카테고리", "", "일상", 3, long, "맛집"])).toEqual(["일상", "여행 후기", "맛집"]);
    expect(cleanCategoryNames(Array.from({ length: 150 }, (_, i) => `c${i}`))).toHaveLength(100);
  });
  it("고르기 단계는 optional이고 스크립트 문법이 맞다", () => {
    for (const root of ["document", "layer()"]) {
      const [step] = selectCategorySteps('따옴표 "와 \\ 가 있는 이름', root);
      expect(step.optional).toBe(true);
      expect(() => new Function(step.js)).not.toThrow();
      expect(step.js).toContain(JSON.stringify('따옴표 "와 \\ 가 있는 이름'));
    }
  });
  it("네이버는 발행 창을 연 바로 뒤에 카테고리 단계를 넣고, 임시저장이거나 카테고리가 없으면 넣지 않는다", () => {
    const names = (r: Parameters<typeof naverStepsWithOptions>[0]) => naverStepsWithOptions(r).map((s) => s.name);
    expect(names({ mode: "publish", category: { name: "여행" } }).slice(0, 3)).toEqual(["발행 창 열기", "카테고리 고르기", "현재 시각 발행 고르기"]);
    expect(names({ mode: "schedule", scheduledAt: "2026-10-10T00:30:00.000Z", category: { name: "여행" } })[1]).toBe("카테고리 고르기");
    expect(names({ mode: "draft", category: { name: "여행" } })).not.toContain("카테고리 고르기");
    expect(names({ mode: "publish" })).not.toContain("카테고리 고르기");
  });
  it("네이버는 카테고리 다음에 주제를 고르고, 주제만 있어도 임시저장이면 넣지 않는다", () => {
    const names = (r: Parameters<typeof naverStepsWithOptions>[0]) => naverStepsWithOptions(r).map((s) => s.name);
    expect(names({ mode: "publish", category: { name: "여행" }, topic: "국내여행" }).slice(0, 4)).toEqual(["발행 창 열기", "카테고리 고르기", "주제 고르기", "현재 시각 발행 고르기"]);
    expect(names({ mode: "publish", topic: "맛집" }).slice(0, 3)).toEqual(["발행 창 열기", "주제 고르기", "현재 시각 발행 고르기"]);
    expect(names({ mode: "draft", topic: "맛집" })).not.toContain("주제 고르기");
    for (const step of naverStepsWithOptions({ mode: "publish", topic: "맛집" })) expect(() => new Function(step.js)).not.toThrow();
    expect(naverStepsWithOptions({ mode: "publish", topic: "맛집" })[1].optional).toBe(true);
  });
  it("optional 단계가 안 되면 멈추지 않고 확인 필요 문구와 화면 구조를 남긴 채 다음 단계로 간다", async () => {
    const done: string[] = [];
    const logs: string[] = [];
    const problems: string[] = [];
    await runPublishSteps(
      [
        { name: "카테고리 고르기", js: "cat", optional: true },
        { name: "다음", js: "next" },
      ],
      async (js) => (js === "cat" ? "ERR:카테고리 칸을 찾지 못했습니다" : js === "next" ? (done.push("next"), true) : "button \"발행\""),
      (m) => logs.push(m),
      1,
      problems,
    );
    expect(done).toEqual(["next"]);
    expect(problems).toEqual(["카테고리 고르기: 카테고리 칸을 찾지 못했습니다"]);
    expect(logs.some((l) => l.includes("화면 구조") && l.includes('button "발행"'))).toBe(true);
  });
  it("주제 단계는 팝업 순서(열기→이름→확인→닫힘)를 한 단계로 하고, 실패하면 팝업을 닫는 정리 스크립트를 돌린다", async () => {
    const [step] = selectTopicSteps("맛집", "layer()");
    expect(step.name).toBe("주제 고르기");
    expect(step.js).toContain("text(b) === '확인'");
    expect(() => new Function(step.js)).not.toThrow();
    expect(() => new Function(step.cleanupJs!)).not.toThrow();
    const ran: string[] = [];
    const problems: string[] = [];
    await runPublishSteps(
      [step],
      async (js) => (js === step.js ? "ERR:주제 팝업에서 \"맛집\"을(를) 찾지 못했습니다" : (ran.push(js === step.cleanupJs ? "cleanup" : "dump"), true)),
      () => {},
      1,
      problems,
    );
    expect(ran).toEqual(["dump", "cleanup"]);
    expect(problems).toHaveLength(1);
  });
  it("주제 팝업이 떠 있는 동안 발행 창은 사라지므로, 발행 창은 첫 단계와 마지막(돌아왔는지)에서만 본다", () => {
    const { js } = selectTopicSteps("맛집", "layer()")[0];
    const uses = [...js.matchAll(/layer\(\)/g)].map((m) => m.index!);
    expect(uses).toHaveLength(2);
    expect(uses[0]).toBeGreaterThan(js.indexOf("st.phase === 0"));
    expect(uses[0]).toBeLessThan(js.indexOf("st.phase === 1"));
    expect(uses[1]).toBeGreaterThan(js.indexOf("popup()) return wait(24"));
    expect(js).toContain("발행 창으로 돌아오지 않았습니다");
  });
  it("새로 나타난 목록은 글자가 아니라 요소로 가려낸다 (칸이 현재 선택값을 보여 줘서 첫 항목의 글자가 이미 화면에 있다)", () => {
    const read = selectCategorySteps("x", "document")[0].js;
    expect(read).toContain("markSeen()");
    expect(read).toContain("data-bw-seen");
    expect(read).not.toContain("__bwCatBefore");
    expect(read).not.toContain("leafTexts");
  });
  it("필수 단계는 여전히 멈춘다", async () => {
    await expect(runPublishSteps([{ name: "필수", js: "x" }], async () => "ERR:없음", () => {}, 1, [])).rejects.toThrow("필수");
  });
  it("Claude in Chrome 안내: 티스토리는 저장 전에, 네이버는 발행 창에서만", () => {
    expect(categoryPrompt("tistory", undefined, "draft")).toBe("");
    expect(categoryPrompt("tistory", { name: "여행" }, "draft")).toContain('"여행"을(를) 고르세요. 임시저장하기 전에');
    expect(categoryPrompt("naver", { name: "여행" }, "draft")).toContain("임시저장에서는 고르지 않습니다");
    expect(categoryPrompt("naver", { name: "여행" }, "schedule")).toContain("발행 창의 카테고리");
    expect(categoryPrompt("naver", { name: "여행" }, "publish", "맛집")).toContain('"주제" 설정을 눌러 팝업이 열리면 "맛집"');
    expect(categoryPrompt("naver", { name: "여행" }, "publish", "맛집")).toContain('"확인" 버튼을 눌러 팝업을 닫으세요');
    expect(categoryPrompt("naver", undefined, "publish", "맛집")).toContain("## 주제");
    expect(categoryPrompt("naver", undefined, "draft", "맛집")).toBe("");
    expect(categoryPrompt("tistory", { name: "여행" }, "publish", "맛집")).not.toContain("주제");
  });
});
