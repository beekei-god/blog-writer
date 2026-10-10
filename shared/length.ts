import type { Job, Post } from "./types";

/** 본문 목표 글자수 (공백 포함 근사값, "참고 자료" 목록과 태그는 제외). 작업마다 고르고, 고르지 않은 예전 작업은 기본값 */
export const DEFAULT_TARGET_CHARS = 2500;
export const MIN_TARGET_CHARS = 1000;
export const MAX_TARGET_CHARS = 8000;
export const LENGTH_PRESETS = [
  { label: "짧게", chars: 1500 },
  { label: "보통", chars: 2500 },
  { label: "길게", chars: 4000 },
  { label: "아주 길게", chars: 6000 },
] as const;

const round100 = (n: number) => Math.round(n / 100) * 100;
/** 본문 분량 상한: 목표의 1.2배 (기본 2,500자 → 3,000자) */
export const maxBodyChars = (target: number) => round100(target * 1.2);
/** 처음 쓸 때 지시하는 목표 범위: 목표의 ±10% (기본 2,500자 → 2,300~2,800자) */
export const targetRange = (target: number): [number, number] => [round100(target * 0.9), round100(target * 1.1)];
export const targetCharsOf = (job: Pick<Job, "writingOptions">) => job.writingOptions?.targetChars ?? DEFAULT_TARGET_CHARS;

const REFERENCE_HEADING = /참고\s*(한\s*)?자료|출처/;
const strip = (s: string) => s.replace(/\*\*/g, "");
const len = (s: string) => Array.from(strip(s).replace(/[\r\n]/g, "")).length; // 이모지·한글을 한 글자로 센다. 줄바꿈은 세지 않는다

/**
 * 본문 글자수 (공백 포함). 제목, 이미지, 줄바꿈은 세지 않고,
 * "참고 자료" 소제목부터 끝까지는 제외한다.
 */
export function countBodyChars(post: Pick<Post, "blocks">): number {
  let n = 0;
  for (const b of post.blocks) {
    if (b.type === "heading" && REFERENCE_HEADING.test(b.text)) break;
    switch (b.type) {
      case "heading":
      case "paragraph":
      case "quote":
        n += len(b.text);
        break;
      case "list":
        n += b.items.reduce((a, it) => a + len(it), 0);
        break;
      case "table":
        n += [b.headers, ...b.rows].flat().reduce((a, c) => a + len(c), 0);
        break;
    }
  }
  return n;
}
