import { Router } from "express";
import { BUSY_STATUSES } from "../../shared/types";
import { cancelClaudeLogin, claudeLogout, getClaudeAuthStatus, startClaudeLogin } from "../claudeAuth";
import { isRecommending } from "../recommend";
import { clearPlanLimits } from "../usage";
import { listJobs } from "../store";
import { wrap } from "./util";

/** Claude Code 로그인 관리 (설정 화면) */
export const router = Router();

/** Claude를 쓰는 작업이 진행 중이면 계정을 바꾸지 못하게 한다 */
async function busyReason(): Promise<string | null> {
  if (isRecommending()) return "주제 추천이 진행 중입니다.";
  const busy = (await listJobs()).some((j) => BUSY_STATUSES.includes(j.status) || j.editProposal?.status === "running");
  return busy ? "글 작업이 진행 중입니다." : null;
}

router.get("/api/claude/auth", wrap(async (_req, res) => res.json(await getClaudeAuthStatus())));

// 로그인 (로그인 안 된 상태에서) 또는 다른 계정으로 로그인 (switch: 로그아웃 뒤 로그인)
router.post(
  "/api/claude/auth/login",
  wrap(async (req, res) => {
    const switchAccount = req.body?.switch === true;
    const status = await getClaudeAuthStatus();
    if (status.loginRunning) return void res.json(status);
    if (status.loggedIn && !switchAccount) return void res.status(409).json({ error: "이미 로그인되어 있습니다. 다른 계정으로 바꾸려면 \"다른 계정으로 로그인\"을 누르세요." });
    const reason = await busyReason();
    if (reason) return void res.status(409).json({ error: `${reason} 끝난 뒤에 계정을 바꿔 주세요.` });
    if (status.loggedIn) {
      await claudeLogout();
      await clearPlanLimits(); // 다른 계정으로 바뀌므로 이전 계정의 한도 정보는 지운다
    }
    startClaudeLogin();
    res.status(202).json(await getClaudeAuthStatus());
  }),
);

router.post(
  "/api/claude/auth/cancel",
  wrap(async (_req, res) => {
    cancelClaudeLogin();
    res.json(await getClaudeAuthStatus());
  }),
);
