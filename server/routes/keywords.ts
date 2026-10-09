import { Router } from "express";
import { z } from "zod";
import { errorText } from "../../shared/labels";
import { exploreKeywords } from "../explore";
import { MAX_HINTS, SearchAdError } from "../searchad";
import { wrap } from "./util";

/** 키워드 탐색: 입력한 키워드와 연관 키워드의 월간 검색량 (네이버 검색광고 키워드 도구) */
export const router = Router();

router.get(
  "/api/keywords",
  wrap(async (req, res) => {
    // 비워 두면 지금 뜨는 검색어와 최근 주제 추천의 분야를 기준으로 찾는다
    const q = z.string().trim().max(200).default("").safeParse(req.query.q);
    if (!q.success) return void res.status(400).json({ error: `키워드는 200자 이하로 입력하세요. (쉼표로 나눠 최대 ${MAX_HINTS}개)` });
    try {
      const r = await exploreKeywords(q.data);
      if (!r) return void res.status(400).json({ error: "먼저 설정에서 네이버 검색광고 API 키를 연결하세요." });
      res.json(r);
    } catch (e) {
      res.status(e instanceof SearchAdError ? 400 : 502).json({ error: errorText(e) });
    }
  }),
);
