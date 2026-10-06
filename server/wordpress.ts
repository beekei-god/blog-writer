import fs from "node:fs/promises";
import path from "node:path";
import { MAX_TAGS, type Post, type PostBlock, type PublishMode, type Settings, type WordPressRecord } from "../shared/types";
import { esc, rich, TABLE_COLORS } from "../shared/postHtml";
import { currentSignal, throwIfCancelled } from "./cancel";
import { getWordPressAuth, type WordPressAuth } from "./secrets";
import { getSettings, jobImageDir } from "./store";
import { errorText } from "../shared/labels";

/**
 * 워드프레스 REST API로 글을 올린다 (크롬 조작 없이).
 * - 인증: Application Password (HTTP Basic, https 필수)
 * - 글: POST /wp/v2/posts (신규) 또는 POST /wp/v2/posts/<id> (이미 올린 글 갱신)
 * - 이미지: POST /wp/v2/media, 태그: /wp/v2/tags (이름으로 조회해 없으면 만든다)
 * 비밀번호는 요청 헤더에만 쓰고 로그·오류 메시지에 넣지 않는다.
 */

export class WordPressError extends Error {}

interface Ctx {
  site: string;
  auth: WordPressAuth;
}

/** 설정의 사이트 주소를 https 주소로 정리한다 (프로토콜이 없으면 https). http는 Application Password를 보낼 수 없어 거부한다. */
export function normalizeSite(raw: string): string {
  const s = raw.trim().replace(/\/+$/, "");
  if (!s) throw new WordPressError("먼저 설정에서 워드프레스 사이트 주소를 입력하세요.");
  if (/^http:\/\//i.test(s)) throw new WordPressError("워드프레스 사이트 주소는 https://로 시작해야 합니다. (Application Password는 https에서만 쓸 수 있습니다)");
  return /^https:\/\//i.test(s) ? s : `https://${s}`;
}

/** 워드프레스 사이트 주소 (기본 블로그가 무엇이든 따로 저장한 값) */
export const wordpressSiteOf = (s: Pick<Settings, "wordpressUrl">) => s.wordpressUrl?.trim() ?? "";

async function context(): Promise<Ctx> {
  const settings = await getSettings();
  const site = normalizeSite(wordpressSiteOf(settings));
  const auth = await getWordPressAuth();
  if (!auth) throw new WordPressError("워드프레스 연결 정보가 없습니다. 설정 → 워드프레스 설정에서 Application Password로 연결하세요.");
  return { site, auth };
}

const authHeader = (a: WordPressAuth) => `Basic ${Buffer.from(`${a.username}:${a.appPassword}`).toString("base64")}`;

interface WpErrorBody {
  code?: string;
  message?: string;
  data?: { status?: number; term_id?: number };
}

/** 요청을 보내고 JSON을 돌려준다. 실패하면 한국어 메시지의 WordPressError. */
async function wp<T>(ctx: Ctx, method: string, route: string, body?: unknown, opts: { raw?: Buffer; headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<T> {
  const [routePath, query] = route.split("?");
  const headers: Record<string, string> = { Authorization: authHeader(ctx.auth), Accept: "application/json", ...opts.headers };
  let payload: BodyInit | undefined;
  if (opts.raw) payload = new Uint8Array(opts.raw);
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const signals = [AbortSignal.timeout(opts.timeoutMs ?? 30_000)];
  const cancel = currentSignal();
  if (cancel) signals.push(cancel);
  const signal = AbortSignal.any(signals);

  const send = (url: string) => fetch(url, { method, headers, body: payload, signal, redirect: "manual" });
  let res: Response;
  try {
    res = await send(`${ctx.site}/wp-json${routePath}${query ? `?${query}` : ""}`);
    // 고유주소가 "기본"이면 /wp-json이 없고 ?rest_route= 로만 열린다.
    if (res.status === 404 && !(res.headers.get("content-type") ?? "").includes("json")) {
      res = await send(`${ctx.site}/?rest_route=${routePath}${query ? `&${query}` : ""}`);
    }
  } catch (e) {
    if (cancel?.aborted) throw e;
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new WordPressError("워드프레스 사이트가 제때 응답하지 않았습니다.");
    throw new WordPressError(`워드프레스 사이트에 연결하지 못했습니다: ${errorText(e)}`);
  }
  if (res.status >= 300 && res.status < 400) {
    throw new WordPressError(`워드프레스 사이트가 다른 주소로 이동시켰습니다 (${res.status}). 설정의 사이트 주소를 실제 주소(https://, www 여부)로 고쳐 주세요.`);
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* HTML 등 */
  }
  if (!res.ok) {
    const err = (json ?? {}) as WpErrorBody;
    if (res.status === 401) {
      // 오류 코드로 원인을 나눈다. 비밀번호가 틀리면 워드프레스가 incorrect_password 등을 돌려주고,
      // rest_not_logged_in이면 인증 헤더가 워드프레스까지 오지 않은 것이다 (호스팅·보안 설정이 Authorization 헤더를 지움).
      if (err.code === "rest_not_logged_in") {
        throw new WordPressError(
          "워드프레스가 인증 정보를 받지 못했습니다. 입력한 값이 틀린 것이 아니라, 호스팅이나 보안 설정이 Authorization 헤더를 막고 있을 가능성이 큽니다. 호스팅 업체에 \"REST API의 Authorization 헤더 전달\"을 문의하세요.",
        );
      }
      if (err.code === "invalid_username" || err.code === "invalid_email") {
        throw new WordPressError("워드프레스에 없는 사용자명입니다. 표시 이름이 아니라 로그인 아이디(또는 이메일)를 입력하세요.");
      }
      if (err.code === "incorrect_password") {
        throw new WordPressError("Application Password가 올바르지 않습니다. 로그인 비밀번호가 아니라 wp-admin 프로필에서 만든 애플리케이션 비밀번호를 입력하세요.");
      }
      throw new WordPressError(`워드프레스 인증에 실패했습니다${err.message ? `: ${err.message}` : ""}. 사용자명과 Application Password를 확인하세요.`);
    }
    if (res.status === 403) throw new WordPressError(`워드프레스 권한이 없습니다${err.message ? `: ${err.message}` : ""}. 글을 쓸 수 있는 사용자의 Application Password인지 확인하세요.`);
    if (res.status === 404 && json === null) throw new WordPressError("워드프레스 REST API를 찾지 못했습니다. 사이트 주소가 맞는지, 보안 플러그인이 REST API를 막지 않는지 확인하세요.");
    const e = new WordPressError(`워드프레스 오류 ${res.status}${err.message ? `: ${err.message}` : ""}`);
    (e as WordPressError & { body?: WpErrorBody; status?: number }).body = err;
    (e as WordPressError & { status?: number }).status = res.status;
    throw e;
  }
  return json as T;
}

const httpStatus = (e: unknown) => (e as { status?: number }).status;
const errBody = (e: unknown) => (e as { body?: WpErrorBody }).body;

// ───────── 연결 확인 · 카테고리 ─────────

/** 사이트 주소와 인증 정보가 맞는지 확인한다 (글을 쓸 수 있는 권한까지). */
export async function testWordPress(override?: WordPressAuth): Promise<{ name: string }> {
  const settings = await getSettings();
  const ctx: Ctx = { site: normalizeSite(wordpressSiteOf(settings)), auth: override ?? (await context()).auth };
  const me = await wp<{ name?: string; capabilities?: Record<string, boolean> }>(ctx, "GET", "/wp/v2/users/me?context=edit");
  if (me.capabilities && !me.capabilities.edit_posts) throw new WordPressError("이 사용자는 글을 쓸 권한(edit_posts)이 없습니다.");
  return { name: me.name ?? ctx.auth.username };
}


export async function listCategories(): Promise<{ id: number; name: string }[]> {
  const ctx = await context();
  const list = await wp<{ id: number; name: string }[]>(ctx, "GET", "/wp/v2/categories?per_page=100&_fields=id,name");
  return list.map((c) => ({ id: c.id, name: decodeEntities(c.name) }));
}

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");

// ───────── 이미지 ─────────

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

type MediaRef = { id: number; url: string };

/** 이미지를 올린다. 이미 올린 파일(기록에 있고 사이트에 아직 있는 것)은 다시 올리지 않는다. */
async function ensureMedia(ctx: Ctx, jobId: string, file: string, alt: string, known: Record<string, MediaRef>): Promise<MediaRef> {
  const name = path.basename(file);
  const prev = known[name];
  if (prev) {
    try {
      const m = await wp<{ id: number; source_url: string }>(ctx, "GET", `/wp/v2/media/${prev.id}?_fields=id,source_url`);
      return { id: m.id, url: m.source_url };
    } catch {
      /* 사이트에서 지워졌으면 다시 올린다 */
    }
  }
  const full = path.join(jobImageDir(jobId), name);
  const data = await fs.readFile(full);
  const ext = path.extname(name).toLowerCase();
  const created = await wp<{ id: number; source_url: string }>(ctx, "POST", "/wp/v2/media", undefined, {
    raw: data,
    headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"` },
    timeoutMs: 120_000,
  });
  if (alt.trim()) await wp(ctx, "POST", `/wp/v2/media/${created.id}`, { alt_text: alt.trim() });
  return { id: created.id, url: created.source_url };
}

// ───────── 태그 ─────────

/** 태그 이름 → ID. 이름이 정확히 같은 태그가 있으면 쓰고, 없으면 만든다. */
async function resolveTagIds(ctx: Ctx, names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, MAX_TAGS)) {
    throwIfCancelled();
    const found = await wp<{ id: number; name: string }[]>(ctx, "GET", `/wp/v2/tags?per_page=100&_fields=id,name&search=${encodeURIComponent(name)}`);
    const hit = found.find((t) => decodeEntities(t.name).toLowerCase() === name.toLowerCase());
    if (hit) {
      ids.push(hit.id);
      continue;
    }
    try {
      ids.push((await wp<{ id: number }>(ctx, "POST", "/wp/v2/tags", { name })).id);
    } catch (e) {
      const id = errBody(e)?.data?.term_id;
      if (errBody(e)?.code === "term_exists" && id) ids.push(id);
      else throw e;
    }
  }
  return ids;
}

// ───────── 본문 ─────────

/** 워드프레스용 표: 본문 폭을 꽉 채우고 칸 안쪽 여백을 넉넉하게 둔다 (테마 기본 표는 칸이 좁게 나온다). */
function wpTableHtml(b: Extract<PostBlock, { type: "table" }>): string {
  const border = `border:1px solid ${TABLE_COLORS.border};`;
  const cell = `${border}padding:12px 16px;text-align:left;vertical-align:top;line-height:1.7;`;
  const th = `${cell}background-color:${TABLE_COLORS.headerBg};font-weight:bold;`;
  const head = `<tr>${b.headers.map((h) => `<th style="${th}">${rich(h)}</th>`).join("")}</tr>`;
  const body = b.rows.map((r) => `<tr>${r.map((c) => `<td style="${cell}">${rich(c)}</td>`).join("")}</tr>`).join("");
  return `<table style="border-collapse:collapse;width:100%;font-size:1em;margin:1.5em 0;${border}"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

/** 초안 블록을 Gutenberg 블록 마크업으로. 이미지는 올린 미디어 URL을 쓴다. 표는 서식(색·테두리)을 그대로 두려고 사용자 지정 HTML 블록에 넣는다. */
export function postToBlocks(post: Pick<Post, "blocks">, imageOf: (file: string) => MediaRef | undefined, log: (m: string) => void): string {
  const out: string[] = [];
  const plain = (s: string) => s.replace(/\*\*/g, "");
  for (const b of post.blocks as PostBlock[]) {
    switch (b.type) {
      case "heading":
        out.push(`<!-- wp:heading -->\n<h2 class="wp-block-heading">${esc(plain(b.text))}</h2>\n<!-- /wp:heading -->`);
        break;
      case "paragraph":
        out.push(`<!-- wp:paragraph -->\n<p>${rich(b.text).replace(/\n/g, "<br>")}</p>\n<!-- /wp:paragraph -->`);
        break;
      case "list":
        out.push(`<!-- wp:list -->\n<ul class="wp-block-list">${b.items.map((it) => `<li>${rich(it)}</li>`).join("")}</ul>\n<!-- /wp:list -->`);
        break;
      case "quote":
        out.push(`<!-- wp:quote -->\n<blockquote class="wp-block-quote"><!-- wp:paragraph -->\n<p>${rich(b.text)}</p>\n<!-- /wp:paragraph --></blockquote>\n<!-- /wp:quote -->`);
        break;
      case "table":
        out.push(`<!-- wp:html -->\n${wpTableHtml(b)}\n<!-- /wp:html -->`);
        break;
      case "image": {
        const m = b.file ? imageOf(b.file) : undefined;
        if (!m) {
          log(`이미지 건너뜀 (생성되지 않음): ${b.alt || b.prompt.slice(0, 30)}`);
          break;
        }
        out.push(
          `<!-- wp:image {"id":${m.id},"sizeSlug":"large","linkDestination":"none"} -->\n<figure class="wp-block-image size-large"><img src="${esc(m.url)}" alt="${esc(b.alt)}" class="wp-image-${m.id}"/></figure>\n<!-- /wp:image -->`,
        );
        break;
      }
    }
  }
  return out.join("\n\n");
}

// ───────── 등록 ─────────

export interface PublishResult extends WordPressRecord {
  /** 사이트가 돌려준 글 상태 (draft / future / publish) */
  wpStatus: string;
}

const WP_STATUS: Record<PublishMode, string> = { draft: "draft", schedule: "future", publish: "publish" };

/** 예약 시각은 지금보다 1분 이상 뒤여야 한다. (과거 시각을 보내면 사이트가 바로 공개해 버린다) */
export function checkSchedule(scheduledAt: string | undefined, now = Date.now()): string {
  const t = scheduledAt ? Date.parse(scheduledAt) : NaN;
  if (!Number.isFinite(t)) throw new WordPressError("예약 시각을 올바르게 입력하세요.");
  if (t < now + 60_000) throw new WordPressError("예약 시각은 지금보다 1분 이상 뒤여야 합니다.");
  return new Date(t).toISOString().slice(0, 19); // date_gmt: UTC, 'Z' 없는 ISO
}

export async function publishToWordPress(
  post: Post,
  jobId: string,
  settings: Settings,
  mode: PublishMode,
  scheduledAt: string | undefined,
  existing: WordPressRecord | undefined,
  log: (m: string) => void,
): Promise<PublishResult> {
  const dateGmt = mode === "schedule" ? checkSchedule(scheduledAt) : undefined; // 업로드 전에 먼저 확인
  const ctx = await context();
  const mediaIds: Record<string, MediaRef> = { ...existing?.mediaIds };
  const used: Record<string, MediaRef> = {};

  // 이미지: 썸네일은 대표 이미지, 본문 이미지는 본문에 넣는다.
  const files: { file: string; alt: string; label: string }[] = [];
  if (post.thumbnail?.file) files.push({ file: post.thumbnail.file, alt: post.thumbnail.alt, label: "썸네일" });
  post.blocks.forEach((b, i) => {
    if (b.type === "image" && b.file) files.push({ file: b.file, alt: b.alt, label: `본문 이미지 #${i}` });
  });
  for (const [n, f] of files.entries()) {
    throwIfCancelled();
    log(`이미지 올리는 중 (${n + 1}/${files.length}): ${f.label}`);
    try {
      used[path.basename(f.file)] = await ensureMedia(ctx, jobId, f.file, f.alt, mediaIds);
    } catch (e) {
      throw new WordPressError(`${f.label} 업로드에 실패했습니다: ${errorText(e)}`);
    }
  }

  throwIfCancelled();
  log("태그 확인 중");
  const tags = await resolveTagIds(ctx, post.tags);

  const thumb = post.thumbnail?.file ? used[path.basename(post.thumbnail.file)] : undefined;
  const payload: Record<string, unknown> = {
    title: post.title,
    content: postToBlocks(post, (f) => used[path.basename(f)], log),
    excerpt: post.summary,
    status: WP_STATUS[mode],
    tags,
    featured_media: thumb?.id ?? 0,
  };
  if (settings.wordpressCategoryId) payload.categories = [settings.wordpressCategoryId];
  if (dateGmt) payload.date_gmt = dateGmt;
  // 예약해 둔 글을 자동발행으로 다시 올리면, 글에 남아 있는 미래 예약 시각 때문에 워드프레스가 "예약"으로 되돌린다.
  // 그래서 이 경우에는 공개 시각을 지금으로 맞춘다. (이미 자동발행한 글을 갱신할 때는 원래 공개 시각을 그대로 둔다)
  else if (mode === "publish" && existing?.mode !== "publish") payload.date_gmt = new Date().toISOString().slice(0, 19);

  throwIfCancelled();
  type PostResponse = { id: number; link: string; status: string };
  let saved: PostResponse;
  if (existing?.postId) {
    log("이미 올린 글을 갱신합니다");
    try {
      saved = await wp<PostResponse>(ctx, "POST", `/wp/v2/posts/${existing.postId}`, payload);
    } catch (e) {
      if (httpStatus(e) !== 404) throw e;
      log("사이트에서 글을 찾지 못해 새 글로 올립니다");
      saved = await wp<PostResponse>(ctx, "POST", "/wp/v2/posts", payload);
    }
  } else {
    saved = await wp<PostResponse>(ctx, "POST", "/wp/v2/posts", payload);
  }
  return { postId: saved.id, link: saved.link, mode, scheduledAt: mode === "schedule" ? scheduledAt : undefined, mediaIds: used, wpStatus: saved.status };
}
