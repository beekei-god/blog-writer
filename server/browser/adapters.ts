import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FrameLocator, Locator, Page } from "playwright-core";
import { MAX_TAGS, type Platform, type Post, type PostBlock, type PostSettings } from "../../shared/types";
import { jobImageDir } from "../store";
import { HumanMouse } from "./mouse";
import { altFileName, tableHtml } from "./postHtml";

/**
 * 예전 자동 조작 방식의 블로그별 입력 순서. Claude in Chrome이 막는 사이트에서만 쓴다.
 * 셀렉터는 블로그 UI 개편으로 바뀔 수 있으니 실패하면 이 파일만 고치면 된다.
 */
export interface AdapterContext {
  page: Page;
  mouse: HumanMouse;
  post: Post;
  jobId: string;
  settings: PostSettings;
  log: (msg: string) => void;
}

/** 에디터가 iframe 안에 있을 수도, 페이지에 바로 있을 수도 있다 */
type EditorRoot = Pick<FrameLocator, "locator" | "getByRole">;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// file은 화면에서 수정 가능한 초안 JSON에서 오므로 basename으로 잘라 이미지 폴더 밖 파일이 업로드되지 않게 한다.
const imagePath = (ctx: AdapterContext, file: string) => path.join(jobImageDir(ctx.jobId), path.basename(file));

/** 파일이 실제로 생성된 이미지 블록만 */
function hasFile(b: PostBlock): b is Extract<PostBlock, { type: "image" }> & { file: string } {
  return b.type === "image" && !!b.file;
}

type TableBlock = Extract<PostBlock, { type: "table" }>;

/** 텍스트 블록을 줄 단위로 바꾼다. **굵게** 표시는 typeRich가 단축키로 처리한다. */
function plainLines(b: PostBlock): string[] {
  switch (b.type) {
    case "heading":
      return [`**${b.text.replace(/\*\*/g, "")}**`];
    case "paragraph":
      return [b.text];
    case "quote":
      return [`“${b.text}”`];
    case "list":
      return b.items.map((it) => `• ${it}`);
    case "table":
      return tableAsLines(b);
    case "image":
      return [];
  }
}

/** 표를 붙여넣지 못했을 때의 대체 표현: 행마다 "• 헤더: 값 / 헤더: 값" */
function tableAsLines(b: TableBlock): string[] {
  return b.rows.map((r) => `• ${r.map((c, i) => `${b.headers[i]}: ${c}`).join(" / ")}`);
}

/** **굵게** 구간은 굵게 단축키를 켜고 끄며 타이핑한다. */
async function typeRich(page: Page, text: string) {
  for (const part of text.split(/(\*\*[^*]+\*\*)/)) {
    if (!part) continue;
    const bold = /^\*\*[^*]+\*\*$/.test(part);
    if (bold) await page.keyboard.press("ControlOrMeta+B");
    await page.keyboard.type(bold ? part.slice(2, -2) : part, { delay: 12 + Math.random() * 25 });
    if (bold) await page.keyboard.press("ControlOrMeta+B");
  }
}

async function typeLines(page: Page, lines: string[]) {
  for (const line of lines) {
    if (line) await typeRich(page, line);
    await page.keyboard.press("Enter");
  }
}

/** 커서를 문서 끝으로 (macOS: ⌘↓, 그 외: Ctrl+End) */
const moveCaretToEnd = (page: Page) => page.keyboard.press(process.platform === "darwin" ? "Meta+ArrowDown" : "Control+End");

/**
 * 에디터에 HTML 붙여넣기 이벤트를 보낸다. 세 에디터 모두 붙여넣은 HTML 표를 자기 표 컴포넌트로 바꾼다.
 * (표를 칸마다 마우스로 만드는 것보다 훨씬 안정적이다)
 */
async function pasteHtml(target: Locator, html: string, text: string) {
  await target.evaluate(
    (el, { html, text }) => {
      const doc = el.ownerDocument;
      const active = (doc.activeElement as HTMLElement | null) ?? (el as HTMLElement);
      const dt = new DataTransfer();
      dt.setData("text/html", html);
      dt.setData("text/plain", text);
      active.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    },
    { html, text },
  );
}

/** 표 붙여넣기를 시도하고, 표가 생기지 않으면 목록 형태로 타이핑한다. */
async function insertTableOrList(ctx: AdapterContext, b: TableBlock, pasteTarget: Locator, tables: Locator, extraHtml = ""): Promise<boolean> {
  const before = await tables.count();
  await pasteHtml(pasteTarget, tableHtml(b) + extraHtml, tableAsLines(b).join("\n"));
  try {
    await waitForCountIncrease(tables, before, 5000);
    return true;
  } catch {
    ctx.log("표 붙여넣기가 적용되지 않아 목록 형태로 입력합니다.");
    await typeLines(ctx.page, tableAsLines(b));
    return false;
  }
}

interface BodyHandlers {
  /** alt: 대체 텍스트 (넣을 수 있는 에디터만 넣는다) */
  image: (file: string, alt: string) => Promise<void>;
  table: (b: TableBlock) => Promise<void>;
  /** 에디터의 소제목 서식을 쓰는 경우. 없으면 굵은 글씨 한 줄로 입력한다. */
  heading?: (text: string) => Promise<void>;
}

/** 이미지·표·소제목은 플랫폼별 함수로, 나머지는 타이핑으로 본문을 채운다. */
async function fillPlainBody(ctx: AdapterContext, h: BodyHandlers) {
  const { page, post, log } = ctx;
  let first = true;
  for (const b of post.blocks) {
    if (b.type === "image") {
      if (!hasFile(b)) {
        log(`이미지 건너뜀 (생성되지 않음): ${b.alt || b.prompt.slice(0, 30)}`);
        continue;
      }
      log("본문 이미지 삽입");
      await h.image(imagePath(ctx, b.file), b.alt);
      first = false;
      continue;
    }
    // 글쓰기 규칙 6장: 빈 줄은 소제목 위 한 줄만. 문단 사이에는 두지 않는다.
    if (!first && b.type === "heading") await page.keyboard.press("Enter");
    if (b.type === "table") {
      log("표 입력");
      await h.table(b);
    } else if (b.type === "heading" && h.heading) {
      await h.heading(b.text.replace(/\*\*/g, ""));
    } else {
      await typeLines(page, plainLines(b));
    }
    first = false;
  }
}

/** 로그인 페이지로 튕기면 기다리지 않고 멈춘다 (다른 입력 경로와 같게). 직접 로그인하지 않는다. */
async function waitForLogin(ctx: AdapterContext, isLoginUrl: (url: string) => boolean) {
  if (!isLoginUrl(ctx.page.url())) return;
  throw new Error('블로그에 로그인되어 있지 않습니다. 설정의 "블로그 로그인 창 열기"로 로그인한 뒤 다시 시도하세요.');
}

/** 보이면 클릭, 아니면 조용히 넘어간다 (팝업 닫기용). */
async function clickIfVisible(ctx: AdapterContext, loc: Locator) {
  try {
    await loc.first().waitFor({ state: "visible", timeout: 2500 });
    await ctx.mouse.click(loc.first());
  } catch {
    /* 팝업이 없으면 무시 */
  }
}

/** 임시저장 버튼을 마우스로 누른다. 버튼을 못 찾으면 사용자가 직접 저장하도록 오류를 낸다. */
async function clickSaveDraft(ctx: AdapterContext, button: Locator) {
  const btn = button.first();
  try {
    await btn.waitFor({ state: "visible", timeout: 10_000 });
  } catch {
    throw new Error("임시저장 버튼을 찾지 못했습니다. 열린 크롬 창에서 직접 저장해 주세요.");
  }
  ctx.log("임시저장 클릭");
  await ctx.mouse.click(btn);
  await sleep(2500);
}

/** 개수가 늘어날 때까지 기다린다 (이미지 업로드 완료 확인). */
async function waitForCountIncrease(loc: Locator, before: number, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await loc.count()) > before) {
      await sleep(1200);
      return;
    }
    await sleep(500);
  }
  throw new Error("이미지 업로드가 끝나지 않았습니다.");
}

/** 버튼 클릭이 파일 선택창을 여는 에디터용: 마우스로 클릭하고 선택창에 파일을 넣는다. */
async function pickFileByClicks(ctx: AdapterContext, clickSteps: () => Promise<void>, file: string) {
  const [chooser] = await Promise.all([ctx.page.waitForEvent("filechooser", { timeout: 15_000 }), clickSteps()]);
  await chooser.setFiles(file);
}

// ───────────────────────── 네이버 블로그 ─────────────────────────
// SmartEditor ONE. 에디터는 #mainFrame iframe 안에 있다.
async function naver(ctx: AdapterContext) {
  const { page, mouse, post, settings, log } = ctx;
  if (!settings.blogId) throw new Error("설정에서 네이버 블로그 ID를 입력하세요.");

  const url = `https://blog.naver.com/${settings.blogId}/postwrite`;
  log("네이버 블로그 글쓰기 페이지로 이동");
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForLogin(ctx, (u) => u.includes("nid.naver.com"));
  if (!page.url().includes("postwrite")) await page.goto(url, { waitUntil: "domcontentloaded" });

  // 예전에는 에디터가 #mainFrame iframe 안에 있었고, 지금은 페이지 본문에 바로 있다.
  await page.locator(".se-documentTitle, #mainFrame").first().waitFor({ timeout: 30_000 });
  const editor: EditorRoot = (await page.locator(".se-documentTitle").count()) ? page : page.frameLocator("#mainFrame");
  await editor.locator(".se-documentTitle").waitFor({ timeout: 30_000 });
  await clickIfVisible(ctx, editor.locator(".se-popup-button-cancel")); // 이어쓰기 팝업
  await clickIfVisible(ctx, editor.locator(".se-help-panel-close-button")); // 도움말 패널

  log("제목 입력");
  await mouse.click(editor.locator(".se-documentTitle .se-text-paragraph").first());
  await page.keyboard.type(post.title, { delay: 25 });

  const uploaded = editor.locator(".se-component.se-image");
  const insertImage = async (file: string, alt: string) => {
    const before = await uploaded.count();
    // 네이버는 파일 이름이 이미지 alt가 되므로 대체 텍스트 이름의 사본을 올린다.
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bw-alt-"));
    const named = path.join(dir, altFileName(alt, path.extname(file) || ".png"));
    try {
      await fs.copyFile(file, named);
      await pickFileByClicks(ctx, () => mouse.click(editor.locator("button.se-image-toolbar-button").first()), named);
      await waitForCountIncrease(uploaded, before);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  };

  log("본문 입력");
  await mouse.click(editor.locator(".se-component.se-text .se-text-paragraph").first());
  // 네이버는 본문 첫 이미지가 대표(썸네일) 이미지가 된다.
  if (post.thumbnail?.file) {
    log("썸네일(첫 이미지) 삽입");
    await insertImage(imagePath(ctx, post.thumbnail.file), post.thumbnail.alt);
  }
  await fillPlainBody(ctx, {
    image: insertImage,
    table: async (b) => {
      await insertTableOrList(ctx, b, editor.locator("body"), editor.locator(".se-component.se-table"));
    },
    heading: async (text) => {
      // 에디터의 문단 서식을 "소제목"으로 바꿔 입력하고, 다음 줄은 "본문"으로 되돌린다.
      if (await setNaverTextFormat(ctx, editor, "소제목")) {
        await typeRich(page, text);
        await page.keyboard.press("Enter");
        await setNaverTextFormat(ctx, editor, "본문");
      } else {
        await typeLines(page, [`**${text}**`]);
      }
    },
  });

  // 네이버 태그는 발행 창에서만 입력할 수 있어서, 임시저장만 하는 지금은 본문 끝에 "#태그" 줄로 넣는다.
  if (post.tags.length) {
    log("본문 끝에 태그 입력");
    for (let i = 0; i < 3; i++) await page.keyboard.press("Enter"); // 본문과 태그 사이 빈 줄 3개
    await page.keyboard.type(post.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" "), { delay: 15 });
  }

  await clickSaveDraft(
    ctx,
    editor.locator('button[class*="save_btn"], button[data-click-area="tpb.save"]').or(editor.getByRole("button", { name: /^저장$/ })),
  );
  log("임시저장 완료. 크롬에서 내용을 검토한 뒤 직접 발행해 주세요.");
}

let naverFormatWarned = false;

/** SmartEditor ONE 툴바의 문단 서식 드롭다운에서 서식(본문/소제목 등)을 고른다. 실패하면 false. */
async function setNaverTextFormat(ctx: AdapterContext, editor: EditorRoot, name: "소제목" | "본문"): Promise<boolean> {
  try {
    const opener = editor.locator('button.se-text-format-toolbar-button, button[data-name="text-format"]').first();
    await opener.waitFor({ state: "visible", timeout: 3000 });
    await ctx.mouse.click(opener);
    const option = editor
      .locator('button[class*="se-toolbar-option-text-format"], .se-toolbar-option-text-format button, [class*="text-format"] button')
      .filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) })
      .first();
    await option.waitFor({ state: "visible", timeout: 3000 });
    await ctx.mouse.click(option);
    return true;
  } catch {
    if (!naverFormatWarned) {
      naverFormatWarned = true;
      ctx.log("네이버 소제목 서식 메뉴를 찾지 못해 소제목을 굵은 글씨로 입력합니다.");
    }
    await ctx.page.keyboard.press("Escape").catch(() => {});
    return false;
  }
}

// ───────────────────────── 티스토리 ─────────────────────────
async function tistory(ctx: AdapterContext) {
  const { page, mouse, post, settings, log } = ctx;
  if (!settings.blogId) throw new Error("설정에서 티스토리 블로그 이름을 입력하세요.");

  page.on("dialog", (d) => d.dismiss().catch(() => {})); // "저장된 글이 있습니다" 등

  const url = `https://${settings.blogId}.tistory.com/manage/newpost`;
  log("티스토리 글쓰기 페이지로 이동");
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForLogin(ctx, (u) => /accounts\.kakao\.com|tistory\.com\/auth\/login/.test(u));
  if (!page.url().includes("newpost")) await page.goto(url, { waitUntil: "domcontentloaded" });

  const title = page.locator("#post-title-inp");
  await title.waitFor({ timeout: 30_000 });
  log("제목 입력");
  await mouse.click(title);
  await page.keyboard.type(post.title, { delay: 25 });

  const frame = page.frameLocator("#editor-tistory_ifr");
  const body = frame.locator("body#tinymce");
  await body.waitFor({ timeout: 15_000 });

  const imgs = frame.locator("body#tinymce img");
  const insertImage = async (file: string, alt: string) => {
    const before = await imgs.count();
    await pickFileByClicks(
      ctx,
      async () => {
        await mouse.click(page.locator('#mceu_0-open, button[aria-label*="첨부"]').first());
        await mouse.click(page.locator('#attach-image, [role="menuitem"]:has-text("사진")').first());
      },
      file,
    );
    await waitForCountIncrease(imgs, before);
    // 대체 텍스트: 방금 올린(마지막) 이미지의 alt를 TinyMCE API로 넣어야 저장되는 본문에 반영된다.
    const altSet = await page
      .evaluate((text) => {
        const ed = (window as any).tinymce?.activeEditor;
        const list = ed?.getBody()?.querySelectorAll("img");
        const img = list?.[list.length - 1];
        if (!img) return false;
        ed.dom.setAttrib(img, "alt", text);
        ed.fire("change");
        return true;
      }, alt)
      .catch(() => false);
    if (!altSet) log("이미지 대체 텍스트를 넣지 못했습니다 (계속 진행).");
    await mouse.click(body); // 포커스를 본문으로 되돌린다
    await moveCaretToEnd(page);
    await page.keyboard.press("Enter");
  };

  log("본문 입력");
  await mouse.click(body);
  // 티스토리도 본문 첫 이미지가 대표 이미지가 된다.
  if (post.thumbnail?.file) {
    log("썸네일(첫 이미지) 삽입");
    await insertImage(imagePath(ctx, post.thumbnail.file), post.thumbnail.alt);
  }
  await fillPlainBody(ctx, {
    image: insertImage,
    table: async (b) => {
      if (await insertTableOrList(ctx, b, body, frame.locator("body#tinymce table"))) {
        await moveCaretToEnd(page);
        await page.keyboard.press("Enter");
      }
    },
  });

  log("태그 입력");
  const tag = page.locator("#tagText");
  for (const t of post.tags.slice(0, MAX_TAGS)) {
    await mouse.click(tag);
    await page.keyboard.type(t, { delay: 30 });
    await page.keyboard.press("Enter");
  }

  await clickSaveDraft(ctx, page.locator(".btn-draft, button.action:has-text('임시저장')").or(page.getByRole("button", { name: /임시\s*저장/ })));
  log("임시저장 완료. 크롬에서 내용을 검토한 뒤 직접 발행해 주세요.");
}

/** 크롬으로 올리는 블로그. 워드프레스는 REST API로 올린다 (server/wordpress.ts). */
export const ADAPTERS: Record<Exclude<Platform, "wordpress">, (ctx: AdapterContext) => Promise<void>> = {
  naver,
  tistory,
};
