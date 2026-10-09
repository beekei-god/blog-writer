import { z } from "zod";
import type { Post } from "../shared/types";
import { CancelledError } from "./cancel";
import { runClaude } from "./claude";

/**
 * 네이버 블로그 "주제" (발행 창의 주제 선택). 네이버 블로그에만 있고, 글 내용을 보고 Claude가 하나를 고른다.
 * 목록은 네이버 블로그의 주제 분류이며 바뀔 수 있다. 발행 창에서 같은 이름을 못 찾으면 주제 없이 올리고 "확인 필요"로 남긴다.
 */
const NAVER_TOPICS: Record<string, string[]> = {
  "엔터테인먼트·예술": ["문학·책", "영화", "미술·디자인", "공연·전시", "음악", "드라마", "스타·연예인", "만화·애니", "방송"],
  "생활·노하우·쇼핑": ["일상·생각", "육아·결혼", "반려동물", "좋은글·이미지", "패션·미용", "인테리어·DIY", "요리·레시피", "상품리뷰", "원예·재배"],
  "취미·여가·여행": ["게임", "스포츠", "사진", "자동차", "취미", "국내여행", "세계여행", "맛집"],
  "지식·동향": ["IT·컴퓨터", "사회·정치", "건강·의학", "비즈니스·경제", "어학·외국어", "교육·학문"],
};

export const NAVER_TOPIC_NAMES = Object.values(NAVER_TOPICS).flat();

const ResultSchema = z.object({ topic: z.string() });

/** 글에서 주제를 고르는 데 쓰는 요약: 제목, 요약, 태그, 소제목 */
function digest(post: Post): string {
  const headings = post.blocks.flatMap((b) => (b.type === "heading" ? [b.text.replace(/\*\*/g, "")] : [])).slice(0, 12);
  return [`제목: ${post.title}`, `요약: ${post.summary}`, post.tags.length ? `태그: ${post.tags.slice(0, 15).join(", ")}` : "", headings.length ? `소제목: ${headings.join(" / ")}` : ""]
    .filter(Boolean)
    .join("\n");
}

/** 목록에 있는 이름이면 그대로, 아니면 null (앞뒤 공백·가운뎃점 앞뒤 공백은 맞춰 본다) */
export function matchNaverTopic(raw: string): string | null {
  const norm = (s: string) => s.replace(/\s+/g, "").replace(/[·ㆍ・]/g, "·");
  return NAVER_TOPIC_NAMES.find((t) => norm(t) === norm(raw)) ?? null;
}

/**
 * 글 내용에 가장 맞는 네이버 블로그 주제 하나를 고른다. 어떤 이유로든 못 고르면 null (주제 없이 올린다).
 * 짧은 호출이라 effort는 낮게 둔다.
 */
export async function pickNaverTopic(post: Post, jobId: string, log: (m: string) => void): Promise<string | null> {
  try {
    const raw = await runClaude<unknown>({
      system: `당신은 네이버 블로그 글에 맞는 "주제"를 고르는 도우미입니다. 아래 주제 목록 중에서 글 내용에 가장 알맞은 것 하나만 고르세요. 목록에 없는 이름은 쓰지 마세요.
${Object.entries(NAVER_TOPICS)
  .map(([group, names]) => `- ${group}: ${names.join(", ")}`)
  .join("\n")}`,
      prompt: digest(post),
      schema: { type: "object", additionalProperties: false, required: ["topic"], properties: { topic: { type: "string", enum: NAVER_TOPIC_NAMES } } },
      effort: "low",
      timeoutMs: 2 * 60_000,
      stage: "writing",
      jobId,
    });
    const topic = matchNaverTopic(ResultSchema.parse(raw).topic);
    if (topic) log(`네이버 주제: ${topic} (글 내용을 보고 정함)`);
    else log("네이버 주제를 정하지 못해 주제 없이 올립니다.");
    return topic;
  } catch (e) {
    // 중지는 그대로 전달한다 (호출한 쪽이 중지로 처리)
    if (e instanceof CancelledError) throw e;
    log(`네이버 주제를 정하지 못해 주제 없이 올립니다: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
