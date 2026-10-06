import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { z } from "zod";
import { runClaude } from "../claude";
import { ImageGenError } from "./errors";

const SYSTEM = `당신은 블로그용 벡터 일러스트 디자이너입니다. 요청 설명대로 단일 SVG를 그립니다.
- 루트 <svg>에 xmlns와 지정된 viewBox를 반드시 넣으세요. width/height 속성은 넣지 마세요.
- 평평한(flat) 도형, 그라데이션, 아이콘, 다이어그램 스타일. 배경은 꽉 채운 <rect>로 시작하세요.
- 글자는 요청에 "이미지 안 문구"가 있으면 그 문구를, 없으면 꼭 필요한 짧은 한글 라벨만 쓰세요. font-family="Apple SD Gothic Neo, Noto Sans KR, sans-serif".
- 글자는 모바일에서도 읽히게 크게(가로 1200 기준 40 이상), 배경과 대비를 충분히 주세요. 텍스트가 도형 밖으로 넘치지 않게 하세요.
- <script>, 이벤트 속성(onload 등), 외부 URL/이미지 참조는 절대 쓰지 마세요.
- svg 필드에는 <svg ...>...</svg> 마크업만 담으세요.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["svg"],
  properties: { svg: { type: "string" } },
};

export type ImageKind = "thumbnail" | "body";
const SIZE: Record<ImageKind, { w: number; h: number }> = {
  thumbnail: { w: 1200, h: 630 },
  body: { w: 1200, h: 675 },
};

function validateSvg(svg: string): string {
  const s = svg.trim();
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) throw new ImageGenError("svg_invalid", "SVG 형식이 아닙니다.");
  if (/<script|javascript:|\son\w+\s*=|<foreignObject|<image|<use[^>]+href=["']https?:|url\(\s*["']?https?:/i.test(s)) {
    throw new ImageGenError("svg_invalid", "허용되지 않는 SVG 요소가 포함되어 있습니다.");
  }
  return s;
}

/** Claude가 SVG를 그리고 Chrome으로 PNG로 렌더링한다. */
export async function generateSvgImage(
  prompt: string,
  kind: ImageKind,
  outFile: string,
  topic: string,
  jobId?: string,
  /** 썸네일 문구: 있으면 가운데에 크게 넣는다 */
  headline?: string,
): Promise<void> {
  const { w, h } = SIZE[kind];
  const raw = await runClaude<unknown>({
    system: SYSTEM,
    prompt: `블로그 주제: ${topic}\n이미지 종류: ${kind === "thumbnail" ? "대표 썸네일" : "본문 삽화"}\nviewBox: "0 0 ${w} ${h}"\n\n그릴 내용:\n${prompt}${
      headline?.trim()
        ? kind === "thumbnail"
          ? `\n\n## 이미지 안 문구 (반드시 넣기)\n"${headline.trim()}"\n- 이 문구를 화면 가운데에 크게(글자 크기 80~120, font-weight 800) 넣으세요. 줄바꿈(\\n)이 있으면 그 줄에서 나누고, 길면 2줄로 나누세요. 한 글자도 바꾸지 마세요.\n- 글자 뒤에 반투명 띠나 둥근 상자를 깔아 배경과 대비를 강하게 하세요. 문구와 핵심 그림은 가운데 정사각형(가로 ${h}px) 안에 모으세요 (목록에서 정사각형으로 잘림).`
          : `\n\n## 이미지 안 문구 (반드시 넣기)\n"${headline.trim()}"\n- 짧은 제목이나 라벨처럼 읽기 쉽게(글자 크기 44~72, font-weight 700) 넣으세요. 그림을 가리지 않는 위치에 두고 글자 뒤에 띠나 상자를 깔아 대비를 주세요. 한 글자도 바꾸지 마세요.`
        : ""
    }`,
    schema: SCHEMA,
    effort: "low",
    timeoutMs: 5 * 60_000,
    stage: "images",
    jobId,
  });
  const svg = validateSvg(z.object({ svg: z.string() }).parse(raw).svg);

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    // JS 비활성 + 네트워크 차단: 모델이 만든 마크업은 신뢰하지 않고 렌더링만 한다.
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.route(/^https?:/, (r) => r.abort());
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`,
    );
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: w, height: h } });
  } finally {
    await browser.close();
  }
}
