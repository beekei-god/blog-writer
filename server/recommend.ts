import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Recommendation, TopicCandidate } from "../shared/types";
import { serialQueue, writeJsonAtomic } from "./fsutil";
import { CancelledError, throwIfCancelled, withCancel } from "./cancel";
import { runClaude } from "./claude";
import { compareInterest, DatalabError } from "./datalab";
import { naverAutocomplete } from "./naver";
import { todayKST } from "./rules";
import { DATA_DIR, listJobs } from "./store";
import { errorText } from "../shared/labels";

const DIR = path.join(DATA_DIR, "recommendations");
const file = (id: string) => path.join(DIR, `${path.basename(id)}.json`);
let running: string | null = null;

// ───────── 저장 ─────────
const serial = serialQueue();
function update(id: string, fn: (r: Recommendation) => void): Promise<Recommendation> {
  return serial(async () => {
    const r = JSON.parse(await fs.readFile(file(id), "utf8")) as Recommendation;
    fn(r);
    r.updatedAt = new Date().toISOString();
    await writeJsonAtomic(file(id), r);
    return r;
  });
}
const log = (id: string, message: string) =>
  update(id, (r) => {
    r.logs.push({ at: new Date().toISOString(), message });
  });

export async function listRecommendations(): Promise<Recommendation[]> {
  await fs.mkdir(DIR, { recursive: true });
  const out: Recommendation[] = [];
  for (const f of await fs.readdir(DIR)) {
    if (!f.endsWith(".json")) continue;
    try {
      out.push(JSON.parse(await fs.readFile(path.join(DIR, f), "utf8")));
    } catch {
      /* 쓰는 중인 파일은 건너뜀 */
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteRecommendation(id: string) {
  if (running === id) throw new Error("진행 중인 추천은 삭제할 수 없습니다.");
  await fs.rm(file(id), { force: true });
}

export const isRecommending = () => running !== null;

/** 서버가 죽으면서 진행 중으로 남은 추천은 실패 처리 */
export async function recoverRecommendations() {
  for (const r of await listRecommendations()) {
    if (r.status === "running") {
      await update(r.id, (x) => {
        x.status = "failed";
        x.error = "서버가 재시작되어 중단되었습니다.";
      });
    }
  }
}

// ───────── 1단계: 최신 뉴스·통계로 후보 찾기 (Claude + 웹 검색) ─────────
const SYSTEM = (today: string) => `당신은 블로그 주제 기획자입니다. 오늘 날짜는 ${today}(한국 시간)입니다.
사용자가 준 분야에서, 지금 사람들이 네이버에서 많이 검색할 블로그 글 주제를 찾습니다.

## 찾는 방법
- WebSearch/WebFetch로 최근 2주 안의 뉴스와, 최근 발표된 공식 통계·공고(정부·공공기관·통계청 등)를 찾으세요. 검색어에 오늘 날짜 기준 연월을 넣으세요.
- 일정이 다가오는 것(신청 마감, 접수 시작, 시행일, 발표일), 새로 바뀐 제도, 큰 숫자 변화가 있는 통계를 우선하세요.
- 후보마다 근거(evidence)로 실제로 검색·열람한 기사나 자료의 제목, URL, 날짜, 종류를 적으세요. 확인하지 못한 날짜는 비워 두세요. 근거 없는 후보는 만들지 마세요.
- 근거는 WebSearch 결과(제목·URL·날짜·요약)로 충분합니다. WebFetch는 검색 결과만으로 날짜나 숫자를 확인할 수 없을 때만 쓰고, 전체에서 3번을 넘기지 마세요.

## 후보 작성
- 10~12개. 서로 검색 의도가 겹치지 않게 하세요. 이미 쓴 글 목록과 같은 의도의 주제는 빼세요.
- topic: 블로그 글 하나로 답할 수 있는 구체적인 주제 (예: "2026년 11월 서울 무순위 청약 일정과 자격").
- keywords: 사람들이 네이버 검색창에 실제로 칠 만한 짧은 검색어 1~3개 (2~4단어, 같은 의도의 다른 표현). 데이터랩 검색량 비교에 씁니다.
- reason: 왜 지금 이 주제인지 2~3문장 (근거의 날짜·숫자 포함).
- anchorKeyword: 이 분야를 대표하는 넓은 검색어 1개 (예: "청약"). 후보들의 검색량을 비교하는 기준이 됩니다.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["anchorKeyword", "candidates"],
  properties: {
    anchorKeyword: { type: "string" },
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "keywords", "reason", "evidence"],
        properties: {
          topic: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "url", "kind"],
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                date: { type: "string" },
                kind: { type: "string", enum: ["news", "stat", "official"] },
              },
            },
          },
        },
      },
    },
  },
};

const ResultSchema = z.object({
  anchorKeyword: z.string().min(1),
  candidates: z.array(
    z.object({
      topic: z.string().min(1),
      keywords: z.array(z.string()).min(1),
      reason: z.string(),
      evidence: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          date: z.string().optional(),
          kind: z.enum(["news", "stat", "official"]),
        }),
      ),
    }),
  ),
});

// ───────── 실행 ─────────
export async function startRecommendation(field: string): Promise<Recommendation> {
  if (running) throw new Error("이미 주제 추천이 진행 중입니다.");
  const now = new Date().toISOString();
  const rec: Recommendation = {
    id: randomUUID(),
    field,
    status: "running",
    createdAt: now,
    updatedAt: now,
    datalab: "pending",
    candidates: [],
    logs: [],
  };
  // await 전에 잡아 두어야 동시에 들어온 두 요청이 모두 통과하지 않는다.
  running = rec.id;
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(file(rec.id), JSON.stringify(rec, null, 2));
  } catch (e) {
    running = null;
    throw e;
  }
  void withCancel(rec.id, () => run(rec.id, field)).finally(() => {
    running = null;
  });
  return rec;
}

async function run(id: string, field: string) {
  try {
    const today = todayKST();
    const written = (await listJobs()).map((j) => j.post?.title ?? j.topic).slice(0, 50);

    await log(id, `최신 뉴스·통계 검색 시작: ${field}`);
    const raw = await runClaude<unknown>({
      system: SYSTEM(today),
      prompt: `분야: ${field}\n\n## 이미 쓴 글 (같은 의도는 제외)\n${written.map((t) => `- ${t}`).join("\n") || "(없음)"}`,
      tools: ["WebSearch", "WebFetch"],
      schema: SCHEMA,
      effort: "high",
      timeoutMs: 20 * 60_000,
      stage: "recommend",
      onToolUse: (name, input) => {
        if (name === "WebSearch") void log(id, `웹 검색: ${String(input.query ?? "")}`);
      },
    });
    const parsed = ResultSchema.parse(raw);
    throwIfCancelled();
    let candidates: TopicCandidate[] = parsed.candidates.map((c) => ({
      ...c,
      keywords: [...new Set(c.keywords.map((k) => k.trim()).filter(Boolean))].slice(0, 3),
      evidence: c.evidence.filter((e) => /^https?:\/\//i.test(e.url)),
    }));
    await update(id, (r) => {
      r.anchorKeyword = parsed.anchorKeyword;
      r.candidates = candidates;
    });
    await log(id, `후보 ${candidates.length}개 → 네이버 자동완성 확인`);

    // 2단계: 자동완성에 뜨는지 (검색 수요의 간접 신호)
    for (const c of candidates) {
      throwIfCancelled();
      c.autocompleteCount = (await naverAutocomplete(c.keywords[0])).length;
    }

    // 3단계: 데이터랩 검색 관심도
    let datalab: Recommendation["datalab"] = "not_configured";
    let period: Recommendation["period"];
    try {
      await log(id, `데이터랩 검색 관심도 비교 (기준 키워드: ${parsed.anchorKeyword})`);
      const res = await compareInterest(
        parsed.anchorKeyword,
        candidates.map((c, i) => ({ id: String(i), keywords: c.keywords })),
      );
      if (res) {
        candidates = candidates.map((c, i) => ({ ...c, interest: res.stats[String(i)] }));
        datalab = "ok";
        period = res.period;
        const skipped = candidates.filter((c) => !c.interest).length;
        if (skipped) await log(id, `기준 키워드 검색량이 0이라 관심도를 비교하지 못한 후보 ${skipped}개 (순위 맨 뒤)`);
      } else {
        await log(id, "데이터랩 키가 없어 검색량 비교는 건너뜁니다 (설정에서 키를 넣어 주세요).");
      }
    } catch (e) {
      datalab = "failed";
      await log(id, `데이터랩 조회 실패: ${e instanceof DatalabError ? e.message : String(e)}`);
    }

    // 순위: 데이터랩 관심도 → 상승세. 데이터랩이 없으면 검색량 근거가 없으므로 순위를 매기지 않는다
    // (자동완성 개수는 검색어 표현에 따라 0이 되기도 해서 순위 근거로 쓰기엔 부정확하다).
    if (datalab === "ok") {
      candidates.sort(
        (a, b) =>
          (b.interest?.level ?? -1) - (a.interest?.level ?? -1) || (b.interest?.momentum ?? 0) - (a.interest?.momentum ?? 0),
      );
    }

    throwIfCancelled();
    await update(id, (r) => {
      r.candidates = candidates;
      r.datalab = datalab;
      r.period = period;
      r.status = "done";
    });
    await log(id, "추천 완료");
  } catch (e) {
    const cancelled = e instanceof CancelledError;
    const msg = cancelled ? "사용자가 추천을 중지했습니다." : errorText(e);
    await log(id, cancelled ? msg : `실패: ${msg}`);
    await update(id, (r) => {
      r.status = "failed";
      r.error = msg;
    });
  }
}
