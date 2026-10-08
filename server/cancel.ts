import { AsyncLocalStorage } from "node:async_hooks";

/**
 * 작업 중지. 작업마다 AbortController를 두고, 그 작업 안에서 부르는 runClaude 등은
 * AsyncLocalStorage로 신호를 받아 바로 멈춘다 (함수마다 signal을 넘기지 않아도 된다).
 */
export class CancelledError extends Error {
  constructor() {
    super("사용자가 작업을 중지했습니다.");
  }
}

const store = new AsyncLocalStorage<AbortSignal>();
// 한 작업에서 이미지 여러 장을 동시에 다시 만들 수 있어 작업마다 여러 개를 둔다.
const controllers = new Map<string, Set<AbortController>>();

export function withCancel<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const c = new AbortController();
  const set = controllers.get(id) ?? new Set();
  set.add(c);
  controllers.set(id, set);
  return store.run(c.signal, fn).finally(() => {
    set.delete(c);
    if (!set.size && controllers.get(id) === set) controllers.delete(id);
  });
}

/** 진행 중인 작업이 있으면 (동시에 도는 것까지 모두) 중지 신호를 보내고 true */
export function cancelJob(id: string): boolean {
  const live = [...(controllers.get(id) ?? [])].filter((c) => !c.signal.aborted);
  for (const c of live) c.abort();
  return live.length > 0;
}

export const currentSignal = () => store.getStore();

export function throwIfCancelled() {
  if (currentSignal()?.aborted) throw new CancelledError();
}
