import { RULES } from '@sheep/game-core';
export interface FencePanelBox { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface FencePart { readonly frame: 'r3_fence_post_left' | 'r3_fence_post_right' | 'r3_fence_rails'; readonly box: FencePanelBox }
export function r3FenceParts(): readonly FencePart[] {
  const [left, right] = RULES.herd.gate_open_x_u.map(value => value / 1000);
  if (left === undefined || right === undefined) throw new Error('规则缺少真实入口。');
  const parts: FencePart[] = [], floor = RULES.herd.fence_y_u / 1000;
  for (const [start, end] of [[0, left], [right, RULES.herd.world_width_u / 1000]] as const) {
    const middle = (start + end) / 2;
    parts.push(
      { frame: 'r3_fence_post_left', box: { x: start, y: floor - 28, width: 10, height: 28 } },
      { frame: 'r3_fence_rails', box: { x: start + 10, y: floor - 25, width: middle - 5 - start - 10, height: 22 } },
      { frame: 'r3_fence_post_left', box: { x: middle - 5, y: floor - 28, width: 10, height: 28 } },
      { frame: 'r3_fence_rails', box: { x: middle + 5, y: floor - 25, width: end - 10 - middle - 5, height: 22 } },
      { frame: 'r3_fence_post_right', box: { x: end - 10, y: floor - 28, width: 10, height: 28 } },
    );
  }
  return parts;
}
/** Cosmetic panel tiling only: collision and gate admission remain exclusively in core. */
export function r3FencePanels(): readonly FencePanelBox[] {
  const [left, right] = RULES.herd.gate_open_x_u.map(value => value / 1000);
  if (left === undefined || right === undefined) throw new Error('规则缺少真实入口。');
  const panels: FencePanelBox[] = [];
  for (const [start, end] of [[0, left], [right, RULES.herd.world_width_u / 1000]] as const) {
    for (let x = start; x < end; x += 48) panels.push({ x, y: RULES.herd.fence_y_u / 1000 - 24, width: Math.min(48, end - x), height: 24 });
  }
  return panels;
}
