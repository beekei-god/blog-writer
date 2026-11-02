import { describe, expect, it } from "vitest";
import { interestStat } from "../server/datalab";

describe("데이터랩 관심도 환산", () => {
  it("기준 키워드 평균을 100으로 환산하고 최근 7일 증감을 구한다", () => {
    const raw = [...Array(21).fill(10), ...Array(7).fill(20)];
    const s = interestStat(raw, 20);
    expect(s.series[0]).toBe(50);
    expect(s.series[27]).toBe(100);
    expect(s.level).toBe(62.5);
    expect(s.momentum).toBe(100);
  });
  it("이전 값이 0이면 최근 값이 있을 때 100%", () => {
    expect(interestStat([...Array(21).fill(0), ...Array(7).fill(5)], 10).momentum).toBe(100);
    expect(interestStat(Array(28).fill(0), 10).momentum).toBe(0);
  });
});
