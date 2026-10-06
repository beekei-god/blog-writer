import { Router } from "express";
import { runClaude } from "../claude";
import { getJobUsage, getUsageSummary } from "../usage";
import { wrap } from "./util";

/** Claude 사용량 */
export const router = Router();

router.get("/api/usage", wrap(async (_req, res) => res.json(await getUsageSummary())));

// 플랜 한도 사용률은 Claude를 호출해야 갱신되므로, Haiku로 아주 짧은 호출을 한 번 보낸다.
let checkingPlan = false;
router.post(
  "/api/usage/check",
  wrap(async (_req, res) => {
    if (checkingPlan) return void res.status(409).json({ error: "이미 확인 중입니다." });
    checkingPlan = true;
    try {
      await runClaude({
        system: "Reply with ok=true.",
        prompt: "ok",
        schema: { type: "object", additionalProperties: false, required: ["ok"], properties: { ok: { type: "boolean" } } },
        effort: "low",
        timeoutMs: 60_000,
        stage: "check",
        model: "haiku",
      });
    } finally {
      checkingPlan = false;
    }
    res.json(await getUsageSummary());
  }),
);

router.get("/api/jobs/:id/usage", wrap(async (req, res) => res.json(await getJobUsage(String(req.params.id)))));
