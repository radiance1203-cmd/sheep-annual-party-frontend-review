import { describe, expect, it } from 'vitest';
import { RULES } from '@sheep/game-core';
import { r3FencePanels, r3FenceParts } from './r3-scenery';

describe('candidate fence art stays on the real core boundary', () => {
  it('uses one shared middle post per blocked section without doubled joins or art inside the opening', () => {
    const parts = r3FenceParts();
    const posts = parts.filter(part => part.frame !== 'r3_fence_rails');
    expect(posts).toHaveLength(6);
    expect(new Set(posts.map(part => part.box.x)).size).toBe(posts.length);
    const [left, right] = RULES.herd.gate_open_x_u.map(value => value / 1000);
    for (const { box } of parts) expect(box.x + box.width <= (left ?? 0) || box.x >= (right ?? 0)).toBe(true);
  });
  it('covers both blocked fence segments, with no wood crossing the real opening', () => {
    const panels = r3FencePanels();
    const [left, right] = RULES.herd.gate_open_x_u.map(value => value / 1000);
    expect(left).toBeDefined(); expect(right).toBeDefined();
    expect(panels.length).toBeGreaterThan(0);
    expect(panels[0]?.x).toBe(0);
    const last = panels.at(-1);
    expect(last && last.x + last.width).toBe(RULES.herd.world_width_u / 1000);
    for (const panel of panels) {
      expect(panel.x + panel.width <= (left ?? 0) || panel.x >= (right ?? 0)).toBe(true);
      expect(panel.width).toBeGreaterThan(0);
    }
  });
  it('anchors visible wood at the unchanged fence line without new collision geometry', () => {
    const panels = r3FencePanels(); expect(panels.length).toBeGreaterThan(0);
    for (const panel of panels) expect(panel.y + panel.height).toBe(RULES.herd.fence_y_u / 1000);
  });
});
