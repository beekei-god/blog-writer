import { Router } from "express";
import { z } from "zod";
import { errorText } from "../../shared/labels";
import { cancelJob } from "../cancel";
import { deleteRecommendation, isRecommending, listRecommendations, startRecommendation } from "../recommend";
import { wrap } from "./util";

/** 주제 추천 */
export const router = Router();

router.get("/api/recommendations", wrap(async (_req, res) => res.json(await listRecommendations())));
router.post(
  "/api/recommendations",
  wrap(async (req, res) => {
    const parsed = z.object({ field: z.string().trim().min(2).max(100) }).safeParse(req.body);
    if (!parsed.success) {
      const tooLong = parsed.error.issues[0].code === "too_big";
      return void res.status(400).json({ error: tooLong ? "분야는 100자 이하로 입력하세요." : "분야를 2자 이상 입력하세요." });
    }
    if (isRecommending()) return void res.status(409).json({ error: "이미 주제 추천이 진행 중입니다." });
    res.status(201).json(await startRecommendation(parsed.data.field));
  }),
);
// 진행 중인 주제 추천을 멈춘다 (작업 중지와 같은 방식). 멈춘 추천은 failed로 남는다.
router.post(
  "/api/recommendations/:id/cancel",
  wrap(async (req, res) => {
    if (!cancelJob(String(req.params.id))) return void res.status(409).json({ error: "중지할 추천이 없습니다." });
    res.status(202).json({ ok: true });
  }),
);
router.delete(
  "/api/recommendations/:id",
  wrap(async (req, res) => {
    try {
      await deleteRecommendation(String(req.params.id));
      res.status(204).end();
    } catch (e) {
      res.status(409).json({ error: errorText(e) });
    }
  }),
);
