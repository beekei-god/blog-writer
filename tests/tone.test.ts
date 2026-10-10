import { describe, expect, it } from "vitest";
import { endingKind, toneProblem, toneStats } from "../shared/tone";
import type { PostBlock } from "../shared/types";

const para = (...sentences: string[]): PostBlock => ({ type: "paragraph", text: sentences.join("\n") });
const formal = ["접수는 하루입니다.", "대상은 무주택 세대주입니다.", "서류는 미리 준비합니다.", "결과는 다음 주에 발표됩니다.", "문의는 콜센터에서 받습니다.", "일정을 꼭 확인하셔야 합니다."];
const polite = ["접수는 하루예요.", "대상은 무주택 세대주예요.", "서류는 미리 챙겨 두세요.", "결과는 다음 주에 나와요.", "문의는 콜센터에서 받아요.", "일정은 꼭 확인하세요."];
const plain = ["접수는 하루이다.", "대상은 무주택 세대주이다.", "서류는 미리 준비한다.", "결과는 다음 주에 발표된다.", "문의는 콜센터에서 받는다.", "일정을 꼭 확인해야 한다."];

describe("문장 끝으로 말투 가르기", () => {
  it("합니다체·해요체·반말을 구분하고, 어느 쪽도 아닌 끝(명사형)은 세지 않는다", () => {
    expect(endingKind("신청할 수 있습니다.")).toBe("formal");
    expect(endingKind("신청할 수 있습니까?")).toBe("formal");
    expect(endingKind("신청할 수 있어요!")).toBe("polite");
    expect(endingKind("꼭 챙기세요 😊")).toBe("polite");
    expect(endingKind("신청할 수 있다.")).toBe("plain");
    expect(endingKind("신청 기간")).toBeNull();
    expect(endingKind("**굵게 표시된 문장입니다**")).toBe("formal");
  });
  it("본문의 문단·목록·인용만 세고 소제목, 표, '참고 자료' 뒤는 세지 않는다", () => {
    const st = toneStats({
      blocks: [
        { type: "heading", text: "신청 방법이에요" },
        para("본문 첫 문장입니다.", "두 번째예요."),
        { type: "list", items: ["목록은 이렇게 합니다", "명사형 항목"] },
        { type: "table", headers: ["a"], rows: [["표 안 문장이에요"]] },
        { type: "heading", text: "참고 자료" },
        para("뒤의 문장이다."),
      ],
    });
    expect(st).toEqual({ formal: 2, polite: 1, plain: 0, total: 3 });
  });
});

describe("고른 말투와 글의 문장 끝 비교", () => {
  const post = (s: string[]) => ({ blocks: [para(...s)] });
  it("정보형은 합니다체 80% 이상이어야 한다", () => {
    expect(toneProblem(post(formal), "info")).toBeNull();
    expect(toneProblem(post(polite), "info")).toContain("합니다체(~니다) 문장이 0%뿐입니다");
    expect(toneProblem(post([...formal, ...formal.slice(0, 1), polite[0]]), "info")).toBeNull(); // 7문장 중 6개
    expect(toneProblem(post([...formal.slice(0, 3), ...polite.slice(0, 3)]), "info")).toContain("50%");
  });
  it("친근형·스토리형은 해요체 80% 이상이어야 한다", () => {
    expect(toneProblem(post(polite), "friendly")).toBeNull();
    expect(toneProblem(post(polite), "story")).toBeNull();
    expect(toneProblem(post(formal), "story")).toContain("해요체(~요) 문장이 0%뿐입니다");
    expect(toneProblem(post(plain), "friendly")).toContain("반말 100%");
  });
  it("정리형은 존댓말이면서 한 가지로 통일되어야 한다", () => {
    expect(toneProblem(post(formal), "summary")).toBeNull();
    expect(toneProblem(post(polite), "summary")).toBeNull();
    expect(toneProblem(post([...formal.slice(0, 3), ...polite.slice(0, 3)]), "summary")).toContain("섞여 있습니다");
    expect(toneProblem(post(plain), "summary")).toContain("존댓말 문장이 0%뿐입니다");
  });
  it("세어 볼 문장이 5개보다 적으면 판단하지 않는다", () => {
    expect(toneProblem(post(plain.slice(0, 4)), "info")).toBeNull();
    expect(toneProblem({ blocks: [] }, "story")).toBeNull();
  });
});
