import type { Post, WritingTone } from "./types";
import { TONE_LABEL } from "./labels";

const REFERENCE_HEADING = /참고\s*(한\s*)?자료|출처/;

/** 문장 끝으로 말투를 가른다: 합니다체(~니다·~니까), 해요체(~요·~죠), 반말·평서(~다·~함 등). 어느 쪽도 아닌 끝(명사형 목록 등)은 세지 않는다. */
export type EndingKind = "formal" | "polite" | "plain";

export function endingKind(sentence: string): EndingKind | null {
  const s = sentence.replace(/\*\*/g, "").trim().replace(/[^가-힣A-Za-z0-9]+$/u, "");
  if (!s) return null;
  if (/(니다|니까)$/.test(s)) return "formal";
  if (/[요죠]$/.test(s)) return "polite";
  if (/(다|네|군|함|임|음)$/.test(s)) return "plain";
  return null;
}

/** 본문(참고 자료 앞까지)의 문장들 */
function bodySentences(post: Pick<Post, "blocks">): string[] {
  const out: string[] = [];
  for (const b of post.blocks) {
    if (b.type === "heading" && REFERENCE_HEADING.test(b.text)) break;
    const texts = b.type === "paragraph" || b.type === "quote" ? [b.text] : b.type === "list" ? b.items : [];
    for (const t of texts) out.push(...t.split(/\n|(?<=[.!?。])\s+/).map((x) => x.trim()).filter(Boolean));
  }
  return out;
}

export interface ToneStats {
  formal: number;
  polite: number;
  plain: number;
  total: number;
}

export function toneStats(post: Pick<Post, "blocks">): ToneStats {
  const st: ToneStats = { formal: 0, polite: 0, plain: 0, total: 0 };
  for (const s of bodySentences(post)) {
    const k = endingKind(s);
    if (!k) continue;
    st[k]++;
    st.total++;
  }
  return st;
}

/** 세어 볼 문장이 이보다 적으면 판단하지 않는다 */
const MIN_SENTENCES = 5;
const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`;

/**
 * 글이 고른 말투의 문장 끝을 따르는지 본다. 어긋나면 이유를, 맞거나 판단하기 어려우면 null.
 * - 정보형: 합니다체(~니다) 80% 이상
 * - 친근형·스토리형: 해요체(~요) 80% 이상
 * - 정리형: 해요체·합니다체 합이 90% 이상이고, 둘 중 한쪽이 80% 이상 (섞이지 않게)
 */
export function toneProblem(post: Pick<Post, "blocks">, tone: WritingTone): string | null {
  const st = toneStats(post);
  if (st.total < MIN_SENTENCES) return null;
  const want = (kind: "formal" | "polite", name: string) =>
    st[kind] / st.total >= 0.8 ? null : `${name} 문장이 ${pct(st[kind], st.total)}뿐입니다 (합니다체 ${pct(st.formal, st.total)}, 해요체 ${pct(st.polite, st.total)}, 반말 ${pct(st.plain, st.total)})`;
  if (tone === "info") return want("formal", "합니다체(~니다)");
  if (tone === "friendly" || tone === "story") return want("polite", "해요체(~요)");
  const polite = st.formal + st.polite;
  if (polite / st.total < 0.9) return `존댓말 문장이 ${pct(polite, st.total)}뿐입니다 (반말 ${pct(st.plain, st.total)})`;
  if (Math.max(st.formal, st.polite) / polite < 0.8) return `합니다체 ${pct(st.formal, st.total)}와 해요체 ${pct(st.polite, st.total)}가 섞여 있습니다`;
  return null;
}

export const toneName = (tone: WritingTone) => TONE_LABEL[tone];
