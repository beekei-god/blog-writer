import { Router } from "express";
import { z } from "zod";
import { applyProposal, EDIT_PROMPT_MAX } from "../editPost";
import { WritingOptionsSchema } from "../schema";
import { isRunning, startEdit } from "../pipeline";
import { getJob, log, updateJob } from "../store";
import { wrap } from "./util";

/** 프롬프트로 글 고치기: 시작 → (Claude가 고침) → 바뀐 부분을 보고 적용 또는 버리기 */
export const router = Router();

router.post(
  "/api/jobs/:id/edit",
  wrap(async (req, res) => {
    const body = z
      .object({
        prompt: z.string().trim().max(EDIT_PROMPT_MAX).default(""),
        /** 고칠 블록 범위 (처음·끝 포함). 없으면 글 전체 */
        range: z.object({ start: z.number().int().min(0), end: z.number().int().min(0) }).optional(),
        /** 이 분량·말투로 글 전체를 다시 쓴다. 이때 prompt는 추가 요청이라 비어 있어도 된다 */
        writing: WritingOptionsSchema.optional(),
      })
      .safeParse(req.body ?? {});
    if (body.success && body.data.writing && body.data.range) return void res.status(400).json({ error: "분량·말투를 바꿀 때는 글 전체를 다시 씁니다." });
    if (body.error?.issues[0]?.path[0] === "writing") return void res.status(400).json({ error: "분량·말투 값이 올바르지 않습니다." });
    if (!body.success || (!body.data.writing && body.data.prompt.length < 2)) {
      return void res.status(400).json({ error: `고칠 내용을 2자 이상 ${EDIT_PROMPT_MAX.toLocaleString()}자 이하로 써 주세요.` });
    }
    const { prompt, range, writing } = body.data;
    const job = await getJob(String(req.params.id));
    if (!job?.post) return void res.status(400).json({ error: "초안이 없습니다." });
    if (range && (range.end < range.start || range.end >= job.post.blocks.length)) {
      return void res.status(400).json({ error: "고칠 부분을 찾지 못했습니다. 화면을 새로고침해 주세요." });
    }
    if (!(await startEdit(job.id, { prompt, range, writing }))) return void res.status(409).json({ error: "진행 중인 작업이 끝난 뒤에 시작해 주세요." });
    res.status(202).json({ ok: true });
  }),
);

/** 고친 결과를 글에 넣는다. 제안을 만든 뒤 그 범위의 글이 바뀌었으면 거절한다 */
router.post(
  "/api/jobs/:id/edit/apply",
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const job = await getJob(id);
    if (!job?.post || job.editProposal?.status !== "ready") return void res.status(400).json({ error: "적용할 결과가 없습니다." });
    if (isRunning(id)) return void res.status(409).json({ error: "진행 중인 작업이 끝난 뒤에 적용해 주세요." });
    const proposal = job.editProposal;
    let applied = false;
    const next = await updateJob(id, (j) => {
      const post = j.post && applyProposal(j.post, proposal);
      if (!post) return;
      j.post = post;
      if (proposal.writing) j.writingOptions = proposal.writing; // 다시 쓴 분량·말투가 이 글의 목표가 된다
      delete j.editProposal;
      applied = true;
    });
    if (!next) return void res.status(404).json({ error: "not found" });
    if (!applied) return void res.status(409).json({ error: "그 사이 글이 바뀌어서 적용할 수 없습니다. 같은 요청으로 다시 만들어 주세요." });
    await log(id, `프롬프트로 글을 고쳤습니다: ${proposal.note ?? proposal.prompt.slice(0, 60)}`);
    res.json(await getJob(id));
  }),
);

/** 제안을 버린다 (만드는 중이면 먼저 "중지"로 멈춰야 한다) */
router.delete(
  "/api/jobs/:id/edit",
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const job = await getJob(id);
    if (!job) return void res.status(404).json({ error: "not found" });
    if (isRunning(id)) return void res.status(409).json({ error: "만드는 중입니다. 중지한 뒤에 버려 주세요." });
    await updateJob(id, (j) => void delete j.editProposal);
    res.json(await getJob(id));
  }),
);
