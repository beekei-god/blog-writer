import type { PostBlock } from "./types";

/** 비교 화면에서 블록 하나를 보여 줄 글 (이미지는 파일 대신 대체 텍스트) */
export function blockText(b: PostBlock): string {
  switch (b.type) {
    case "heading":
      return `## ${b.text}`;
    case "paragraph":
      return b.text;
    case "quote":
      return `“${b.text}”`;
    case "list":
      return b.items.map((it) => `• ${it}`).join("\n");
    case "table":
      return [b.headers, ...b.rows].map((r) => r.join(" | ")).join("\n");
    case "image":
      return `[이미지: ${b.alt || b.prompt.slice(0, 30)}]`;
  }
}

export type DiffRow = { kind: "same" | "del" | "add"; block: PostBlock };

/**
 * 고치기 전·후 블록을 비교한다 (같은 블록은 그대로 두고, 빠진 블록 "del"과 새 블록 "add"만 표시).
 * 가장 긴 공통 부분을 기준으로 하므로 문단 하나를 고치면 그 문단만 del·add로 나온다.
 */
export function diffBlocks(before: PostBlock[], after: PostBlock[]): DiffRow[] {
  const key = (b: PostBlock) => JSON.stringify(b);
  const a = before.map(key);
  const b = after.map(key);
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) rows.push({ kind: "same", block: before[i++] }), j++;
    else if (j >= b.length || (i < a.length && lcs[i + 1][j] >= lcs[i][j + 1])) rows.push({ kind: "del", block: before[i++] });
    else rows.push({ kind: "add", block: after[j++] });
  }
  return rows;
}

/** 바뀌지 않은 블록이 길게 이어지면 앞뒤 하나씩만 남기고 접는다. 접은 구간은 건너뛴 개수로 나온다 */
export function collapseSame(rows: DiffRow[], keep = 1): (DiffRow | { kind: "skip"; count: number })[] {
  const out: (DiffRow | { kind: "skip"; count: number })[] = [];
  for (let i = 0; i < rows.length; ) {
    if (rows[i].kind !== "same") {
      out.push(rows[i++]);
      continue;
    }
    let j = i;
    while (j < rows.length && rows[j].kind === "same") j++;
    const run = rows.slice(i, j);
    const head = i === 0 ? 0 : keep; // 맨 앞·맨 뒤 구간은 바뀐 쪽에 붙은 부분만 남긴다
    const tail = j === rows.length ? 0 : keep;
    if (run.length <= head + tail + 1) out.push(...run);
    else out.push(...run.slice(0, head), { kind: "skip", count: run.length - head - tail }, ...run.slice(run.length - tail));
    i = j;
  }
  return out;
}
