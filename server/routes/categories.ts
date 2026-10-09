import { Router } from "express";
import { z } from "zod";
import { errorText, PLATFORM_SHORT_LABEL } from "../../shared/labels";
import { settingsFor, type BlogCategory } from "../../shared/types";
import { CategoryError } from "../browser/category";
import { readTistoryCategoriesWithChrome } from "../browser/runner";
import { readNaverCategories, userChromeSupported } from "../browser/userChrome";
import { getLastCategory, getSavedCategories, saveCategoryList } from "../categories";
import { enqueueBrowser } from "../pipeline";
import { getSettings } from "../store";
import { listCategories, WordPressError } from "../wordpress";
import { wrap } from "./util";

/** 카테고리: 올릴 블로그의 카테고리 목록 (워드프레스는 사이트에서, 네이버·티스토리는 블로그 에디터에서 읽어 둔 것) */
export const router = Router();

const PlatformSchema = z.enum(["naver", "tistory", "wordpress"]);

type CategoryList = { categories: BlogCategory[]; fetchedAt?: string; last?: BlogCategory };

router.get(
  "/api/categories/:platform",
  wrap(async (req, res) => {
    const platform = PlatformSchema.safeParse(req.params.platform);
    if (!platform.success) return void res.status(404).json({ error: "알 수 없는 블로그입니다." });
    const p = platform.data;
    const last = await getLastCategory(p);
    const settings = await getSettings();
    if (p === "wordpress") {
      try {
        const categories = await listCategories();
        // 이 블로그에서 고른 적이 없으면 설정의 기본 카테고리를 처음 값으로 쓴다.
        const initial = last ?? categories.find((c) => c.id === settings.wordpressCategoryId);
        return void res.json({ categories, last: initial } satisfies CategoryList);
      } catch (e) {
        return void res.status(e instanceof WordPressError ? 400 : 502).json({ error: errorText(e) });
      }
    }
    const saved = await getSavedCategories(p, settingsFor(settings, p).blogId);
    res.json({ categories: saved?.categories ?? [], fetchedAt: saved?.fetchedAt, last } satisfies CategoryList);
  }),
);

/** 네이버·티스토리: 블로그 에디터를 열어 카테고리 목록을 읽어 저장한다 (글은 저장하지 않는다) */
router.post(
  "/api/categories/:platform/refresh",
  wrap(async (req, res) => {
    const platform = z.enum(["naver", "tistory"]).safeParse(req.params.platform);
    if (!platform.success) return void res.status(404).json({ error: "네이버·티스토리에서만 목록을 불러옵니다." });
    const p = platform.data;
    const settings = settingsFor(await getSettings(), p);
    if (!settings.blogId) {
      return void res.status(400).json({ error: `먼저 설정에서 ${PLATFORM_SHORT_LABEL[p]} 블로그 ID를 입력하세요.` });
    }
    if (p === "naver" && !userChromeSupported()) {
      return void res.status(400).json({ error: "네이버 카테고리 목록 불러오기는 macOS에서만 됩니다." });
    }
    try {
      const log = (m: string) => console.log(`[카테고리 ${p}] ${m}`);
      const names = await enqueueBrowser(() => (p === "naver" ? readNaverCategories(settings, log) : readTistoryCategoriesWithChrome(settings, log)));
      const fetchedAt = await saveCategoryList(p, settings.blogId, names);
      res.json({ categories: names.map((name) => ({ name })), fetchedAt, last: await getLastCategory(p) } satisfies CategoryList);
    } catch (e) {
      // 화면 구조를 같이 돌려줘서, 에디터 화면이 예상과 다를 때 원인을 볼 수 있게 한다.
      const dialog = e instanceof CategoryError && e.dialog ? `\n\n화면 구조 (문제 확인용, 글 본문은 빠짐):\n${e.dialog.slice(0, 3000)}` : "";
      res.status(502).json({ error: `카테고리 목록을 불러오지 못했습니다: ${errorText(e)}${dialog}` });
    }
  }),
);
