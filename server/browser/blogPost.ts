import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { MAX_TAGS, type Platform, type Post, type PostBlock, type PostSettings } from "../../shared/types";
import { runClaude } from "../claude";
import { jobImageDir, jobImagePath } from "../store";
import { altFileName, BLANK_LINE, esc, pasteBlockHtml, skippedImageLabel, TAG_GAP_LINES, tagLine, writeUrl } from "./postHtml";
import { assertExtensionInstalled, BROWSER_RULES, SITE_BLOCKED_TEXT, SiteBlockedError } from "./claudeChrome";
import { publishPrompt, PublishStepError, type PublishRequest } from "./publish";

/**
 * Claude in Chrome으로 블로그 글쓰기 화면에 초안을 입력하고 임시저장한다 (발행은 하지 않는다).
 * 본문은 "HTML 붙여넣기 조각"과 "이미지 파일"을 순서대로 나눈 목록으로 넘긴다.
 * 세 에디터 모두 붙여넣은 HTML(소제목·목록·표·굵게)을 자기 서식으로 바꿔 주므로, 한 글자씩 치는 것보다 빠르고 정확하다.
 */

// 소제목은 <h3>으로 붙인다. 앞의 빈 줄은 buildSegments가 넣는다.
const blockHtml = (b: Exclude<PostBlock, { type: "image" }>) => pasteBlockHtml(b, "h3");

type Segment = { kind: "html"; html: string } | { kind: "image"; path: string; alt: string; role: "thumbnail" | "body" };

/** 본문을 붙여넣기 조각과 이미지로 나눈다. 연속된 텍스트 블록은 한 조각으로 합친다. */
function buildSegments(post: Post, jobId: string, platform: Platform): { segments: Segment[]; skipped: string[] } {
  const segments: Segment[] = [];
  const skipped: string[] = [];
  let html: string[] = [];
  const flush = () => {
    if (html.length) segments.push({ kind: "html", html: html.join("") });
    html = [];
  };
  // 네이버·티스토리는 본문 첫 이미지가 대표 이미지가 된다.
  if (post.thumbnail?.file) {
    segments.push({ kind: "image", path: jobImagePath(jobId, post.thumbnail.file), alt: post.thumbnail.alt, role: "thumbnail" });
  }
  for (const b of post.blocks) {
    if (b.type === "image") {
      if (!b.file) {
        skipped.push(skippedImageLabel(b));
        continue;
      }
      flush();
      segments.push({ kind: "image", path: jobImagePath(jobId, b.file), alt: b.alt, role: "body" });
    } else {
      // 소제목마다 위에 한 줄을 띄운다 (글 맨 처음은 제외)
      if (b.type === "heading" && (html.length || segments.length)) html.push(BLANK_LINE);
      html.push(blockHtml(b));
    }
  }
  // 네이버는 태그를 발행 창에서만 넣을 수 있어 본문 끝에 #태그 줄로 넣는다.
  if (platform === "naver" && post.tags.length) {
    for (let i = 0; i < TAG_GAP_LINES; i++) html.push("<p>&nbsp;</p>"); // 본문과 태그 사이 빈 줄
    html.push(`<p>${esc(tagLine(post))}</p>`);
  }
  flush();
  return { segments, skipped };
}

/** 크롬으로 올리는 블로그의 에디터 안내. 워드프레스는 REST API로 올린다 (server/wordpress.ts). */
const PLATFORM_GUIDE: Record<Exclude<Platform, "wordpress">, string> = {
  naver: `네이버 블로그 (SmartEditor ONE)
- 에디터는 iframe#mainFrame 안에 있습니다. javascript_tool로 붙여넣을 때는 document.querySelector('#mainFrame').contentDocument 안의 요소를 쓰세요.
- "작성 중인 글이 있습니다" 같은 이어쓰기 팝업이 뜨면 "취소"를 눌러 새 글로 시작하세요. 도움말 패널은 닫으세요.
- 제목은 .se-documentTitle 영역, 본문은 .se-component.se-text 영역입니다.
- 사진은 툴바 "사진" 기능이 쓰는 input[type=file]에 file_upload로 넣으세요.
- 대체 텍스트: 네이버 에디터에는 대체 텍스트 입력 칸이 없고 올린 파일 이름이 대체 텍스트가 됩니다. 이미지 조각의 path 파일 이름이 이미 대체 텍스트이니 그 파일을 그대로 올리고, 따로 넣지 않아도 됩니다.
- 소제목은 붙여넣은 <h3>이 "소제목" 서식이 되지 않으면 그 줄을 선택해 툴바 문단 서식에서 "소제목"으로 바꾸세요. 어려우면 굵은 글씨로 두어도 됩니다. 소제목 위의 빈 줄은 그대로 두세요.
- 본문 맨 위에 썸네일 이미지 조각이 있으면 제목 바로 아래, 본문 첫 줄에 넣으세요.
- 표의 머리글 배경색과 테두리는 붙여넣은 HTML의 스타일을 그대로 두세요.
- 태그는 본문 마지막 줄의 #태그로 이미 들어 있습니다 (태그 칸은 발행 창에만 있음).
- 임시저장: 상단의 "저장" 버튼 (발행 버튼 아님).`,
  tistory: `티스토리 (TinyMCE 에디터)
- "저장된 글이 있습니다" 같은 확인 창이 뜨면 취소/닫기를 눌러 새 글로 시작하세요.
- 제목은 #post-title-inp, 본문은 iframe#editor-tistory_ifr 안의 body#tinymce 입니다.
- 사진은 툴바 "첨부 > 사진" 기능이 쓰는 input[type=file]에 file_upload로 넣으세요.
- 대체 텍스트: javascript_tool로 tinymce.activeEditor의 본문에서 방금 올린 img를 찾아 tinymce.activeEditor.dom.setAttrib(img, "alt", 대체텍스트) 후 tinymce.activeEditor.fire("change")를 실행하세요.
- 태그는 하단 태그 입력란(#tagText)에 하나씩 입력하고 Enter를 누르세요.
- 임시저장: 하단의 "임시저장" 버튼 (완료/발행 버튼 아님).`,
};

const PASTE_HELPER = `// 에디터에 HTML을 붙여넣는 예시 (target은 커서가 있는 편집 영역 요소)
const dt = new DataTransfer();
dt.setData("text/html", HTML);
dt.setData("text/plain", TEXT);
target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));`;

const ResultSchema = z.object({
  status: z.enum(["saved", "published", "scheduled", "login_required", "failed"]),
  message: z.string(),
  imagesInserted: z.number(),
  problems: z.array(z.string()),
});
export type BlogPostResult = z.infer<typeof ResultSchema>;

const RESULT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "message", "imagesInserted", "problems"],
  properties: {
    status: { type: "string", enum: ["saved", "published", "scheduled", "login_required", "failed"] },
    message: { type: "string" },
    imagesInserted: { type: "number" },
    problems: { type: "array", items: { type: "string" } },
  },
};

export class BlogLoginRequired extends Error {}

/**
 * Claude in Chrome으로 블로그에 입력하고 임시저장한다.
 * publish가 예약발행·자동발행이면 임시저장 뒤 발행 창에서 발행까지 하게 한다 (못 하면 PublishStepError).
 */
export async function postWithClaudeInChrome(
  post: Post,
  jobId: string,
  settings: PostSettings,
  log: (m: string) => void,
  publish: PublishRequest = { mode: "draft" },
): Promise<BlogPostResult> {
  if (settings.platform === "wordpress") throw new Error("워드프레스는 크롬이 아니라 REST API로 올립니다.");
  await assertExtensionInstalled();
  const { segments, skipped } = buildSegments(post, jobId, settings.platform);
  for (const s of skipped) log(`이미지 건너뜀 (생성되지 않음): ${s}`);
  const imageCount = segments.filter((s) => s.kind === "image").length;

  // 네이버는 올린 파일 이름이 이미지 대체 텍스트가 된다. 다른 두 입력 경로처럼 대체 텍스트로 이름을 붙인 사본을 올린다.
  let altDir: string | null = null;
  if (settings.platform === "naver" && imageCount > 0) {
    altDir = await fs.mkdtemp(path.join(os.tmpdir(), "bw-alt-"));
    const used = new Set<string>();
    for (const s of segments) {
      if (s.kind !== "image") continue;
      const ext = path.extname(s.path) || ".png";
      let name = altFileName(s.alt, ext);
      for (let n = 2; used.has(name); n++) name = altFileName(`${s.alt} (${n})`, ext); // 같은 이름은 덮어쓰지 않게 번호를 붙인다
      used.add(name);
      const copy = path.join(altDir, name);
      await fs.copyFile(s.path, copy);
      s.path = copy;
    }
  }

  const system = `당신은 사용자의 크롬에서 블로그 글을 대신 입력하는 도우미입니다. Claude in Chrome 브라우저 도구만 씁니다.
${publish.mode === "draft"
    ? `목표: 주어진 제목·본문·이미지·태그를 블로그 글쓰기 화면에 넣고 "임시저장"까지 한 뒤 멈춥니다. 절대 발행(공개)하지 마세요.`
    : `목표: 주어진 제목·본문·이미지·태그를 블로그 글쓰기 화면에 넣고 "임시저장"한 뒤, 아래 "발행" 절차대로 ${publish.mode === "schedule" ? "예약발행" : "발행"}합니다. 그 밖의 발행은 하지 마세요.`}

${BROWSER_RULES}
- 작업이 끝나면(성공이든 실패든) 블로그 탭은 닫지 말고 그대로 두세요. 사용자가 크롬에서 결과를 확인합니다.

## 입력 방법
- 본문은 아래 "본문 조각" 순서대로 넣습니다. html 조각은 javascript_tool로 에디터에 paste 이벤트를 보내 붙여넣으세요. 직접 타이핑하는 것보다 빠르고 서식(소제목·목록·표·굵게)이 유지됩니다.
${PASTE_HELPER}
- 붙여넣기가 서식 없이 들어가거나 표가 깨지면, 그 조각만 다른 방법(타이핑, 에디터 메뉴)으로 넣고 problems에 적으세요.
- image 조각은 커서를 그 위치(앞 조각 끝)에 두고 file_upload로 해당 파일을 올리세요. 올라간 것을 화면으로 확인한 뒤 다음 조각으로 넘어가세요.
- 올린 이미지마다 그 조각의 alt를 에디터의 "대체 텍스트"로 넣으세요 (아래 플랫폼 안내 참고). 화면에 보이는 img의 alt 속성만 바꾸면 저장되지 않으니 에디터 기능으로 넣으세요. 넣지 못한 이미지는 problems에 적고 계속 진행하세요.
- 각 조각을 넣은 뒤 커서를 본문 맨 끝으로 옮기고 다음 조각을 넣으세요.
- 끝까지 넣은 뒤 스크린샷으로 제목·본문·이미지 개수를 한 번 확인하고 임시저장을 누르세요. 저장 완료 표시(토스트, "저장됨" 등)를 확인하세요.

## 플랫폼 안내
${PLATFORM_GUIDE[settings.platform as Exclude<Platform, "wordpress">]}

${publishPrompt(settings.platform, publish)}

## 결과
- status: 임시저장까지 했으면 "saved", 로그인 화면이 나와 멈췄으면 "login_required", 그 밖에 끝내지 못했으면 "failed".
- message: 한국어로 한두 문장. imagesInserted: 실제로 올린 이미지 수. problems: 제대로 안 된 부분 (없으면 빈 배열).`;

  const prompt = `## 글쓰기 화면
${writeUrl(settings.platform, settings.blogId)}

## 제목
${post.title}

## 본문 조각 (순서대로, 이미지 ${imageCount}개)
${JSON.stringify(segments, null, 1)}
## 태그 (${settings.platform === "naver" ? "본문 끝에 이미 포함됨" : "태그 입력란에 입력"})
${post.tags.slice(0, MAX_TAGS).join(", ") || "(없음)"}`;

  log(`Claude in Chrome으로 ${settings.platform} 글쓰기 화면을 엽니다. 작업이 끝날 때까지 그 탭은 건드리지 마세요.`);
  let raw: unknown;
  try {
    raw = await runClaude<unknown>({
      system,
      prompt,
      schema: RESULT_JSON_SCHEMA,
      effort: "medium",
      timeoutMs: 45 * 60_000,
      stage: "browser",
      jobId,
      chrome: true,
      addDirs: altDir ? [jobImageDir(jobId), altDir] : [jobImageDir(jobId)],
      onToolUse: (name, input) => {
        const summary = typeof input.action_summary === "string" ? input.action_summary : "";
        const short = name.replace("mcp__claude-in-chrome__", "");
        if (short === "navigate") log(`이동: ${String(input.url ?? "")}`);
        else if (short === "file_upload") log("이미지 올리는 중");
        else if (summary) log(summary);
      },
    });
  } finally {
    if (altDir) await fs.rm(altDir, { recursive: true, force: true });
  }
  const result = ResultSchema.parse(raw);
  if (result.status === "login_required") throw new BlogLoginRequired(`블로그에 로그인되어 있지 않습니다. 평소 쓰는 크롬에서 블로그에 로그인한 뒤 다시 시도하세요. (${result.message})`);
  // 도구 결과로 바로 잡지 못하고 Claude가 결과에 적어 보낸 경우
  const said = [result.message, ...result.problems].join(" ");
  if (result.status !== "saved" && SITE_BLOCKED_TEXT.test(said)) throw new SiteBlockedError(result.message);
  if (result.status === "failed") throw new Error(`블로그 입력을 끝내지 못했습니다: ${result.message}${result.problems.length ? ` / ${result.problems.join(" / ")}` : ""}`);
  if (publish.mode !== "draft" && result.status !== (publish.mode === "schedule" ? "scheduled" : "published")) {
    throw new PublishStepError(`임시저장은 했지만 ${publish.mode === "schedule" ? "예약발행" : "발행"}하지 못했습니다: ${result.message}${result.problems.length ? ` / ${result.problems.join(" / ")}` : ""}. 크롬에 열린 탭에서 직접 발행하세요.`);
  }
  return result;
}
