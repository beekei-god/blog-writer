import { describe, expect, it } from "vitest";
import { ImageGenError } from "../server/images/errors";
import { validateSvg } from "../server/images/svg";

const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">${inner}</svg>`;

describe("validateSvg", () => {
  it("안전한 SVG는 앞뒤 공백만 지우고 그대로 돌려준다", () => {
    const svg = wrap('<rect width="1200" height="675" fill="#fff"/><text x="10" y="50">안녕</text>');
    expect(validateSvg(`\n  ${svg}  \n`)).toBe(svg);
  });

  it("SVG 형식이 아니면 svg_invalid", () => {
    for (const bad of ["hello", "<div></div>", '<svg viewBox="0 0 1 1">', "<p><svg></svg></p>"]) {
      expect(() => validateSvg(bad)).toThrow(ImageGenError);
      try {
        validateSvg(bad);
      } catch (e) {
        expect((e as ImageGenError).kind).toBe("svg_invalid");
      }
    }
  });

  it.each([
    ["script 태그", wrap("<script>alert(1)</script>")],
    ["javascript: 링크", wrap('<a href="javascript:alert(1)"><rect/></a>')],
    ["이벤트 속성", wrap('<rect onload="x()"/>')],
    ["foreignObject", wrap("<foreignObject><div/></foreignObject>")],
    ["image 태그", wrap('<image href="data:image/png;base64,AAAA"/>')],
    ["외부 use 참조", wrap('<use href="https://evil.example/a.svg#x"/>')],
    ["외부 url() 참조", wrap('<rect fill="url(https://evil.example/g)"/>')],
  ])("허용되지 않는 요소(%s)는 svg_invalid", (_name, svg) => {
    try {
      validateSvg(svg);
      throw new Error("통과하면 안 됩니다");
    } catch (e) {
      expect(e).toBeInstanceOf(ImageGenError);
      expect((e as ImageGenError).kind).toBe("svg_invalid");
    }
  });

  it("내부 참조(#id)와 단어 속 'on'은 막지 않는다", () => {
    const svg = wrap('<defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><text>Season onboard</text>');
    expect(validateSvg(svg)).toBe(svg);
  });
});
