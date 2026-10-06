import type express from "express";
import type { Platform } from "../../shared/types";
import { getWordPressAuth } from "../secrets";
import { updateJob } from "../store";

/** async 핸들러의 오류를 express 오류 처리기로 넘긴다. */
export const wrap =
  (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * 작업을 시작하기 전에 상태를 먼저 "진행 중"으로 바꾼다. 응답 직후 화면이 목록을 새로 읽을 때
 * 아직 이전 상태면 화면이 진행 상황을 따라가지 않아 결과(새 이미지 등)가 반영되지 않는다.
 */
export function markBusy(id: string, status: "researching" | "generating_images" | "posting", postingTo?: Platform) {
  return updateJob(id, (j) => {
    j.status = status;
    if (postingTo) j.postingTo = postingTo;
    j.error = undefined;
  });
}

/** 워드프레스 연결 여부 (Application Password는 돌려주지 않는다) */
export const wordpressStatus = async () => {
  const auth = await getWordPressAuth();
  return { configured: !!auth, username: auth?.username ?? null };
};
