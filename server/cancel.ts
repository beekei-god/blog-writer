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
const controllers = new Map<string, AbortController>();

export function withCancel<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const c = new AbortController();
  controllers.set(id, c);
  return store.run(c.signal, fn).finally(() => {
    if (controllers.get(id) === c) controllers.delete(id);
  });
}

/** 진행 중인 작업이 있으면 중지 신호를 보내고 true */
export function cancelJob(id: string): boolean {
  const c = controllers.get(id);
  if (!c || c.signal.aborted) return false;
  c.abort();
  return true;
}

export const currentSignal = () => store.getStore();

export function throwIfCancelled() {
  if (currentSignal()?.aborted) throw new CancelledError();
}
