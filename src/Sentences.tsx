import { Children, Fragment, isValidElement, type ReactNode } from "react";

/** 문장이 끝나는 곳: 마침표·물음표·느낌표(또는 닫는 따옴표·괄호가 붙은 것) 뒤의 공백 */
const SENTENCE_END = /(?<=[.?!。][)"'」』]?)\s+/;

/**
 * 설명문을 문장마다 새 줄로 보여 준다 (한 문장이 칸보다 길면 그 안에서는 자동으로 줄바꿈된다).
 * 글자 사이에 `<b>`·`<code>` 같은 요소가 있어도 문장 끝(마침표·물음표·느낌표 뒤 공백)에서만 줄을 나눈다.
 * `className`은 바깥 `<p>`에 그대로 붙는다.
 */
export function Sentences({ children, className }: { children: ReactNode; className?: string }) {
  const lines: ReactNode[][] = [[]];
  const push = (n: ReactNode) => lines[lines.length - 1].push(n);
  const visit = (node: ReactNode) => {
    if (typeof node === "string") {
      const parts = node.split(SENTENCE_END);
      parts.forEach((part, i) => {
        if (part) push(part);
        if (i < parts.length - 1) lines.push([]);
      });
    } else if (isValidElement(node) || node == null || typeof node === "number" || typeof node === "boolean") {
      push(node);
    } else {
      Children.forEach(node, visit);
    }
  };
  Children.forEach(children, visit);
  return (
    <p className={className}>
      {lines
        .filter((l) => l.some((n) => n !== "" && n != null && n !== false))
        .map((l, i) => (
          <span key={i} className="sentence">
            {l.map((n, j) => (
              <Fragment key={j}>{n}</Fragment>
            ))}
          </span>
        ))}
    </p>
  );
}
