import type { Locator, Page } from "playwright-core";

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Pt = { x: number; y: number };

function cubicBezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y,
  };
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** 화면에 마우스 커서가 움직이는 게 보이도록 페이지에 오버레이 점을 심는다. */
export const CURSOR_OVERLAY_SCRIPT = `
(() => {
  if (window.top !== window) return;
  const install = () => {
    if (document.getElementById('__bw_cursor')) return;
    const d = document.createElement('div');
    d.id = '__bw_cursor';
    d.style.cssText = 'position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(255,64,64,.55);border:2px solid #ff4040;pointer-events:none;left:-50px;top:-50px;';
    document.documentElement.appendChild(d);
    document.addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
  };
  if (document.documentElement) install();
  else document.addEventListener('DOMContentLoaded', install);
})();
`;

export class HumanMouse {
  private pos: Pt = { x: 200, y: 200 };

  constructor(private page: Page) {}

  /** 현재 위치에서 (x,y)까지 곡선 궤적으로 이동한다. */
  async moveTo(x: number, y: number) {
    const from = this.pos;
    const to = { x, y };
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(12, Math.round(dist / 12));
    const spread = Math.min(120, dist / 3);
    const c1 = { x: from.x + (to.x - from.x) * 0.3 + rand(-spread, spread), y: from.y + (to.y - from.y) * 0.3 + rand(-spread, spread) };
    const c2 = { x: from.x + (to.x - from.x) * 0.7 + rand(-spread, spread), y: from.y + (to.y - from.y) * 0.7 + rand(-spread, spread) };
    const totalMs = Math.min(1400, 250 + dist * 1.2);

    for (let i = 1; i <= steps; i++) {
      const p = cubicBezier(from, c1, c2, to, easeInOut(i / steps));
      await this.page.mouse.move(p.x, p.y);
      await sleep(totalMs / steps);
    }
    this.pos = to;
  }

  /** 요소 안의 (정중앙이 아닌) 임의 지점으로 이동해서 클릭한다. */
  async click(target: Locator) {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error("클릭할 요소의 위치를 찾지 못했습니다.");
    const x = box.x + box.width * rand(0.3, 0.7);
    const y = box.y + box.height * rand(0.3, 0.7);
    await this.moveTo(x, y);
    await sleep(rand(80, 200));
    await this.page.mouse.down();
    await sleep(rand(40, 110));
    await this.page.mouse.up();
    await sleep(rand(150, 350));
  }

}
