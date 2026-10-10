import express from "express";
import { router as browserRouter } from "./routes/browser";
import { router as categoriesRouter } from "./routes/categories";
import { router as editRouter } from "./routes/edit";
import { router as imagesRouter } from "./routes/images";
import { router as jobsRouter } from "./routes/jobs";
import { router as keywordsRouter } from "./routes/keywords";
import { router as recommendationsRouter } from "./routes/recommendations";
import { router as settingsRouter } from "./routes/settings";
import { router as usageRouter } from "./routes/usage";
import { router as claudeAuthRouter } from "./routes/claudeAuth";

/** API 앱. 서버 시작(복구·listen)은 index.ts가 한다. */
export function createApp() {
  const app = express();

  // 로컬 전용 API: 다른 사이트가 브라우저를 통해 호출하는 것(CSRF)과 DNS 리바인딩을 막는다.
  // Host와 Origin(있을 때)이 모두 localhost/127.0.0.1 이어야 한다. (vite 프록시는 Host를 그대로 넘긴다)
  const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    let originOk = true;
    if (origin) {
      try {
        originOk = LOCAL_HOST.test(new URL(origin).host);
      } catch {
        originOk = false;
      }
    }
    if (!LOCAL_HOST.test(req.headers.host ?? "") || !originOk) return void res.status(403).json({ error: "forbidden" });
    next();
  });
  app.use(express.json({ limit: "2mb" }));

  for (const router of [settingsRouter, browserRouter, usageRouter, claudeAuthRouter, recommendationsRouter, jobsRouter, imagesRouter, categoriesRouter, editRouter, keywordsRouter]) app.use(router);

  app.use(((err, _req, res, _next) => {
    // JSON 파싱 오류 등 body-parser 오류는 4xx 상태를 그대로 돌려준다.
    const status = typeof err?.status === "number" && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 && err instanceof Error ? err.message : status === 500 ? "server error" : "요청 형식이 올바르지 않습니다." });
  }) as express.ErrorRequestHandler);
  return app;
}
