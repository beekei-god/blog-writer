import "dotenv/config";
import { createApp } from "./app";
import { recoverRecommendations } from "./recommend";
import { recoverStuckJobs } from "./store";
import { pruneUsage } from "./usage";

const port = Number(process.env.PORT ?? 5172);
await recoverStuckJobs();
await recoverRecommendations();
await pruneUsage().catch((e) => console.error("사용량 기록 정리 실패:", e));
createApp().listen(port, "127.0.0.1", () => console.log(`API listening on http://127.0.0.1:${port}`));
