import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import type { ImageStyle } from "../../shared/types";
import { assertExtensionInstalled, BROWSER_RULES, ChromeExtensionError } from "../browser/claudeChrome";
import { runClaude } from "../claude";
import { ImageGenError } from "./errors";
import { styledPrompt } from "./styles";

/**
 * Gemini / ChatGPT 웹 화면에서 Claude in Chrome으로 이미지를 만든다 (사용자가 평소 쓰는 크롬과 로그인 그대로).
 * 확장 프로그램에는 파일 저장 도구가 없어서, 사이트의 "다운로드" 버튼으로 받은 파일을 다운로드 폴더에서 가져온다.
 * 다운로드가 안 되면 Claude가 알려 준 이미지 주소로 직접 받아 본다.
 */

export type WebAi = "gemini" | "chatgpt";

const SITE: Record<WebAi, { name: string; url: string; input: string; guide: string }> = {
  gemini: {
    name: "Gemini",
    url: "https://gemini.google.com/app",
    input: 'rich-textarea .ql-editor, div.ql-editor[contenteditable="true"]',
    guide: `- 화면 오른쪽 위에 "로그인" 버튼이 보이거나 Google 로그인 페이지로 넘어가면 로그인되지 않은 것입니다.`,
  },
  chatgpt: {
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    input: "#prompt-textarea",
    guide: `- 화면에 "로그인/Log in" 버튼이 보이면 로그인되지 않은 것입니다.`,
  },
};

/**
 * 요청 전체를 입력창에 한 번에 넣는 스크립트. 여러 줄을 타이핑하면 줄바꿈(Enter)에서 중간까지만 보내지므로
 * paste 이벤트로 통째로 넣고, 안 되면 insertText로 넣는다. 들어간 글자 수를 돌려준다.
 */
export const insertScript = (selector: string, text: string) => `(async () => {
  const TEXT = ${JSON.stringify(text)};
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return "입력창 없음";
  el.focus();
  const dt = new DataTransfer();
  dt.setData("text/plain", TEXT);
  el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 400));
  const len = () => (el.innerText ?? el.value ?? "").replace(/\\s/g, "").length;
  const want = TEXT.replace(/\\s/g, "").length;
  if (len() < want * 0.95) {
    el.focus();
    document.execCommand("selectAll");
    document.execCommand("insertText", false, TEXT);
    await new Promise((r) => setTimeout(r, 400));
  }
  return "입력 " + len() + "/" + want + "자";
})()`;

/**
 * 가장 최근 이미지를 페이지 안에서 읽어 지정한 이름으로 내려받는 스크립트.
 * 사이트 다운로드 버튼은 위치·동작이 자주 바뀌고, 이미지 주소는 blob:이거나 로그인 쿠키가 필요해 서버에서 받을 수 없다.
 */
export const downloadScript = (name: string) => `(async () => {
  const imgs = [...document.querySelectorAll("img")].filter((i) => i.naturalWidth >= 400 && i.naturalHeight >= 200);
  const img = imgs[imgs.length - 1];
  if (!img) return "실패: 이미지 없음";
  const src = img.currentSrc || img.src;
  let blob = null, how = "";
  try {
    const r = await fetch(src, { credentials: "include" });
    if (r.ok) { const b = await r.blob(); if (b.type.startsWith("image/")) { blob = b; how = "fetch"; } }
  } catch {}
  if (!blob) {
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      blob = await new Promise((r) => c.toBlob(r, "image/png"));
      how = "canvas";
    } catch { blob = null; }
  }
  if (!blob) return "실패: 읽을 수 없음 " + src.slice(0, 60);
  const ext = { "image/jpeg": ".jpg", "image/webp": ".webp" }[blob.type] || ".png";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = ${JSON.stringify(name)} + ext;
  document.body.appendChild(a); a.click(); a.remove();
  return "ok " + how + " " + blob.size + " " + src.slice(0, 60);
})()`;

const ResultSchema = z.object({
  status: z.enum(["ok", "login_required", "refused", "limit", "failed"]),
  imageUrl: z.string(),
  downloadClicked: z.boolean(),
  replyText: z.string(),
  message: z.string(),
});

const RESULT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "imageUrl", "downloadClicked", "replyText", "message"],
  properties: {
    status: { type: "string", enum: ["ok", "login_required", "refused", "limit", "failed"] },
    imageUrl: { type: "string" },
    downloadClicked: { type: "boolean" },
    replyText: { type: "string" },
    message: { type: "string" },
  },
};

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const EXT_BY_MIME: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const downloadsDir = () => process.env.DOWNLOADS_DIR || path.join(os.homedir(), "Downloads");

/**
 * 다운로드 폴더에서 이번 이미지 파일을 찾는다. 다운로드 스크립트가 붙인 이름(name)으로 시작하는 파일만 쓴다.
 * 이름이 다른 새 이미지는 사용자가 따로 받은 파일일 수 있어 가져오지 않는다. 다운로드 중이면 끝날 때까지 기다린다.
 */
async function findNewDownload(since: number, name: string, waitMs = 60_000): Promise<string | null> {
  const dir = downloadsDir();
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    let names: string[] = [];
    try {
      names = await fs.readdir(dir);
    } catch {
      return null;
    }
    const recent: { file: string; mtime: number }[] = [];
    for (const n of names) {
      const full = path.join(dir, n);
      const st = await fs.stat(full).catch(() => null);
      if (!st || st.mtimeMs < since - 2000) continue;
      // 받는 중인 파일(.crdownload 등)은 확장자가 달라 목록에 들어오지 않으므로 끝날 때까지 다음 확인에서 기다리게 된다.
      if (IMAGE_EXT.test(n) && st.size > 5_000) recent.push({ file: full, mtime: st.mtimeMs });
    }
    const named = recent.find((f) => path.basename(f.file).startsWith(name));
    if (named) return named.file;
    await sleep(1000);
  }
  return null;
}

async function moveFile(from: string, to: string) {
  await fs.mkdir(path.dirname(to), { recursive: true });
  try {
    await fs.rename(from, to);
  } catch {
    await fs.copyFile(from, to); // 다른 디스크면 복사 후 삭제
    await fs.unlink(from).catch(() => {});
  }
}

async function fetchImage(url: string, outBase: string): Promise<string | null> {
  if (!/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const mime = (res.headers.get("content-type") ?? "").split(";")[0];
    if (!res.ok || !mime.startsWith("image/")) return null;
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length < 5_000) return null;
    const file = outBase + (EXT_BY_MIME[mime] ?? ".png");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return file;
  } catch {
    return null;
  }
}

/** 이미지 하나를 만들어 outBase(+확장자)로 저장하고 최종 경로를 돌려준다. */
export async function generateWithWebAi(
  ai: WebAi,
  prompt: string,
  style: ImageStyle,
  outBase: string,
  /** headline이 있으면 그 문구를 이미지 안에 넣는다 (썸네일은 가운데에 크게, 본문 이미지는 제목·라벨처럼) */
  opts: { jobId?: string; log: (m: string) => void; headline?: string; kind?: "thumbnail" | "body" },
): Promise<string> {
  try {
    await assertExtensionInstalled();
  } catch (e) {
    throw new ImageGenError("extension", (e as Error).message);
  }
  const site = SITE[ai];
  const headline = opts.headline?.trim();
  const request = headline
    ? opts.kind === "thumbnail"
      ? `블로그 썸네일 이미지를 생성해줘. 가로로 긴 16:9 비율로.
이미지 가운데에 아래 한국어 문구를 크고 굵고 또렷하게 넣어 줘. 글자는 맞춤법 그대로, 한 글자도 바꾸지 말고, 배경과 대비가 강하게 (흰 글자+어두운 테두리 또는 색 띠). 문구 말고 다른 글자는 넣지 마.
목록에서 정사각형으로 잘려도 보이도록 문구와 핵심 대상은 가운데에 모아 줘.
문구: "${headline}"

배경 장면:
${styledPrompt(prompt, style)}`
      : `블로그 본문에 들어갈 이미지를 생성해줘. 가로로 긴 16:9 비율로.
이미지 안에 아래 한국어 문구를 짧은 제목이나 라벨처럼 또렷하게 넣어 줘. 모바일에서도 읽히는 큰 글자로, 글자는 맞춤법 그대로 한 글자도 바꾸지 말고, 배경과 대비가 분명하게. 문구 말고 다른 글자는 넣지 마.
문구: "${headline}"

장면:
${styledPrompt(prompt, style)}`
    : `이미지 생성해줘. 이미지 안에 글자는 넣지 말고, 가로로 긴 16:9 비율로.\n\n${styledPrompt(prompt, style)}`;
  const system = `당신은 사용자의 크롬에서 ${site.name}로 이미지 한 장을 만드는 도우미입니다. Claude in Chrome 브라우저 도구만 씁니다.

${BROWSER_RULES}
- 이미지를 내려받은 뒤(또는 실패로 멈출 때) 만든 탭은 tabs_close_mcp로 닫으세요.

## 순서
1. 새 탭에서 ${site.url} 로 이동합니다.
${site.guide}
2. 요청 입력: computer로 타이핑하지 마세요 (요청이 여러 줄이라 줄바꿈에서 중간까지만 보내집니다).
   아래 "입력 스크립트"를 javascript_tool로 글자 하나 바꾸지 말고 그대로 실행하세요. 요청 전체를 입력창에 한 번에 넣고 "입력 N/M자"를 돌려줍니다.
   N이 M보다 많이 작으면 입력창을 비우고 한 번 더 실행하세요. 다 들어갔으면 보내기 버튼을 누르세요 (Enter 대신 버튼).
3. 이미지가 나올 때까지 기다립니다 (최대 4분 정도). javascript_tool로 "가장 최근 응답에 큰 img가 생겼거나 응답이 끝났는지"를 확인하며 60초까지 기다리는 Promise를 돌려주게 하고, 아직이면 다시 부르세요. 스크린샷으로 기다리지 마세요. 응답이 끝났는데 이미지 없이 글만 있으면 기다리지 말고 멈추세요.
4. 이미지가 다 나오면(로딩 표시가 사라진 뒤) 아래 "다운로드 스크립트"를 javascript_tool로 그대로 한 번 실행하세요. "ok ..."를 돌려주면 끝입니다.
   "실패..."를 돌려주면 사이트의 다운로드 버튼을 누르지 마세요. 파일 이름이 달라 서버가 찾지 못합니다. 대신 이미지의 img.src를 imageUrl에 담아 돌려주면 서버가 그 주소로 받아 봅니다.

## 결과
- status: 이미지를 받았으면 "ok". 로그인이 필요하면 "login_required". 이미지 대신 거절·정책 안내 글을 받았으면 "refused", 한도·나중에 다시 하라는 안내면 "limit". 그 밖에는 "failed".
- imageUrl: 다운로드 스크립트가 돌려준 문자열 끝의 주소 또는 이미지 img.src (모르면 빈 문자열). downloadClicked: 다운로드 스크립트가 "ok"를 돌려줬으면 true (그 밖에는 false).
- replyText: 이미지 대신 글로 답했다면 그 답변 (300자 이내, 없으면 빈 문자열). message: 한국어로 한 문장.`;

  const since = Date.now();
  // 다운로드 폴더에서 이 이미지 파일을 정확히 찾기 위한 이름
  const downloadName = `blogwriter-${path.basename(outBase)}`;
  opts.log(`Claude in Chrome으로 ${site.name}에서 이미지를 만듭니다.`);
  let raw: unknown;
  try {
    raw = await runClaude<unknown>({
      system,
      prompt: `## 요청 (참고용. 입력은 아래 입력 스크립트로)
${request}

## 입력 스크립트
${insertScript(site.input, request)}

## 다운로드 스크립트
${downloadScript(downloadName)}`,
      schema: RESULT_JSON_SCHEMA,
      effort: "low",
      timeoutMs: 10 * 60_000,
      stage: "browser",
      jobId: opts.jobId,
      chrome: true,
    });
  } catch (e) {
    if (e instanceof ChromeExtensionError) throw new ImageGenError("extension", e.message);
    throw e;
  }
  const r = ResultSchema.parse(raw);
  const quote = r.replyText ? ` "${r.replyText.replace(/\s+/g, " ").slice(0, 300)}"` : "";
  if (r.status === "login_required") throw new ImageGenError("login", `${site.name}에 로그인되어 있지 않습니다. 평소 쓰는 크롬에서 ${site.name}에 로그인한 뒤 다시 만드세요.`);
  if (r.status === "refused") throw new ImageGenError("refused", `${site.name}가 이미지 대신 글로 답했습니다:${quote || ` ${r.message}`}`);
  if (r.status === "limit") throw new ImageGenError("limit", `${site.name} 이미지 생성 한도 안내:${quote || ` ${r.message}`}`);
  if (r.status === "failed") throw new ImageGenError("ui_changed", `${site.name}에서 이미지를 만들지 못했습니다: ${r.message}`);

  const downloaded = r.downloadClicked ? await findNewDownload(since, downloadName) : null;
  if (downloaded) {
    const file = outBase + path.extname(downloaded).toLowerCase().replace(".jpeg", ".jpg");
    await moveFile(downloaded, file);
    return file;
  }
  const fetched = await fetchImage(r.imageUrl, outBase);
  if (fetched) return fetched;
  throw new ImageGenError(
    "download",
    `${site.name}에서 이미지는 만들었지만 파일을 받지 못했습니다. 다운로드 폴더(${downloadsDir()})에 새 이미지가 없고, 이미지 주소로도 받을 수 없었습니다. 크롬 설정의 "다운로드 전에 저장 위치 확인"이 켜져 있으면 꺼 주세요.`,
  );
}
