import fs from "node:fs/promises";
import path from "node:path";
import { CancelledError, currentSignal } from "../cancel";
import { getImageApiKey } from "../secrets";
import { ImageGenError } from "./errors";
import type { WebAi } from "./webAi";

/**
 * Gemini / OpenAI 이미지 API로 이미지를 만든다.
 * 오류는 모두 ImageGenError로 그 이미지의 실패가 된다. 크롬으로 저절로 넘기지 않고, 사용자가 화면에서
 * API로 다시 하거나 크롬에서 만들기를 고른다.
 */

const NAME: Record<WebAi, string> = { gemini: "Gemini", chatgpt: "OpenAI" };
const modelOf = (ai: WebAi) =>
  ai === "gemini" ? process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image" : process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare";

const OPENAI = "https://api.openai.com/v1";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

const LIMIT = /insufficient_quota|billing_hard_limit|billing|RESOURCE_EXHAUSTED|quota/i;
const BAD_KEY = /invalid_api_key|Incorrect API key|API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i;
const REFUSED = /moderation_blocked|content_policy|safety/i;

/** 실패한 응답을 원인별로 나눈다. */
function apiError(ai: WebAi, status: number, body: string): Error {
  let message = body.slice(0, 300);
  try {
    const e = (JSON.parse(body) as { error?: { message?: string; code?: unknown; status?: string } }).error;
    if (e?.message) message = `${e.message} (${[e.code, e.status].filter(Boolean).join(", ")})`;
  } catch {
    /* JSON이 아니면 본문 앞부분을 그대로 쓴다 */
  }
  const name = NAME[ai];
  if (status === 429 || LIMIT.test(body)) return new ImageGenError("limit", `${name} API 한도·잔액 부족: ${message}`);
  if (status === 401 || status === 403 || BAD_KEY.test(body))
    return new ImageGenError("api_error", `${name} API 키가 올바르지 않습니다. 설정 → 이미지 API에서 키를 확인하세요. (${status}: ${message})`);
  if (REFUSED.test(body)) return new ImageGenError("refused", `${name} API가 이미지 요청을 거절했습니다: ${message}`);
  return new ImageGenError("api_error", `${name} API 오류 ${status}: ${message}`);
}

async function call(ai: WebAi, url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const user = currentSignal();
  const signal = user ? AbortSignal.any([user, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal });
  } catch (e) {
    if (user?.aborted) throw new CancelledError();
    if ((e as Error).name === "TimeoutError") throw new ImageGenError("timeout", `${NAME[ai]} API 응답 시간이 초과되었습니다.`);
    throw new ImageGenError("api_error", `${NAME[ai]} API에 연결하지 못했습니다: ${(e as Error).message}`);
  }
  const text = await res.text();
  if (!res.ok) throw apiError(ai, res.status, text);
  return JSON.parse(text);
}

const authHeaders = (ai: WebAi, key: string): Record<string, string> =>
  ai === "gemini" ? { "x-goog-api-key": key } : { Authorization: `Bearer ${key}` };

const EXT_BY_MIME: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

/** 받은 이미지를 형식에 맞는 확장자로 outBase(+확장자)에 저장하고 최종 경로를 돌려준다. 모르는 형식은 .png */
export async function saveImageFile(outBase: string, mime: string, data: Buffer): Promise<string> {
  const file = outBase + (EXT_BY_MIME[mime] ?? ".png");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
  return file;
}

/** 이미지 하나를 만들어 outBase(+확장자)로 저장하고 최종 경로를 돌려준다. */
export async function generateWithApi(ai: WebAi, request: string, outBase: string): Promise<string> {
  const auth = await getImageApiKey(ai);
  if (!auth) throw new ImageGenError("api_error", `${NAME[ai]} API 키가 없습니다. 설정 → 이미지 API에서 키를 넣거나 크롬에서 만드세요.`);
  const headers = { ...authHeaders(ai, auth.key), "Content-Type": "application/json" };
  const timeout = 3 * 60_000;
  let data: string | undefined;
  let mime = "image/png";

  if (ai === "chatgpt") {
    const r = (await call(
      ai,
      `${OPENAI}/images/generations`,
      { method: "POST", headers, body: JSON.stringify({ model: modelOf(ai), prompt: request, size: "1536x864", n: 1 }) },
      timeout,
    )) as { data?: { b64_json?: string }[] };
    data = r.data?.[0]?.b64_json;
    if (!data) throw new ImageGenError("api_error", "OpenAI API가 이미지 없이 응답했습니다.");
  } else {
    const r = (await call(
      ai,
      `${GEMINI}/models/${modelOf(ai)}:generateContent`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: request }] }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
        }),
      },
      timeout,
    )) as {
      promptFeedback?: { blockReason?: string };
      candidates?: { finishReason?: string; content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const c = r.candidates?.[0];
    const parts = c?.content?.parts ?? [];
    const image = parts.find((p) => p.inlineData?.data)?.inlineData;
    if (!image) {
      const reply = parts.map((p) => p.text ?? "").join(" ").replace(/\s+/g, " ").trim().slice(0, 300);
      const blocked = r.promptFeedback?.blockReason ?? (/SAFETY|PROHIBITED|BLOCKLIST/.test(c?.finishReason ?? "") ? c?.finishReason : undefined);
      if (blocked || reply) throw new ImageGenError("refused", `Gemini API가 이미지 대신 답했습니다: ${reply || blocked}`);
      throw new ImageGenError("api_error", `Gemini API가 이미지 없이 응답했습니다. (${c?.finishReason ?? "응답 없음"})`);
    }
    data = image.data!;
    mime = image.mimeType ?? mime;
  }

  return saveImageFile(outBase, mime, Buffer.from(data, "base64"));
}

/** 저장 전에 키가 맞는지 가볍게 확인한다 (모델 목록 조회, 이미지 생성 비용 없음). */
export async function testImageApiKey(ai: WebAi, key: string): Promise<void> {
  try {
    await call(ai, ai === "gemini" ? `${GEMINI}/models?pageSize=1` : `${OPENAI}/models`, { headers: authHeaders(ai, key) }, 20_000);
  } catch (e) {
    // 한도 부족이어도 키 자체는 맞다.
    if (e instanceof ImageGenError && e.kind === "limit") return;
    throw e;
  }
}
