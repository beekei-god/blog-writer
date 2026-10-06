/** 저장하지 않은 내용이 있는 화면이 등록하는 이탈 확인. 화면을 바꾸기 전에 canLeave()를 부른다. */
let guard: (() => string | null) | null = null;

export function setLeaveGuard(g: (() => string | null) | null) {
  guard = g;
}

export function canLeave(): boolean {
  const message = guard?.();
  return !message || confirm(message);
}
