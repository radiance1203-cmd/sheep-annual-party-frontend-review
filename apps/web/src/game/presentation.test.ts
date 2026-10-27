import { expect, it } from 'vitest';
import { animationFrame, fitFrame } from './presentation';

it('holds the final landing frame instead of restarting a nonlooping action', () => {
  const land = { frames: ['land-0', 'land-1', 'land-2'], fps: 15, loop: false };
  expect(animationFrame(land, 0)).toBe('land-0');
  expect(animationFrame(land, 2)).toBe('land-1');
  expect(animationFrame(land, 30)).toBe('land-2');
});

it('fits a textured prop uniformly inside a core box while preserving its authored pivot', () => {
  expect(fitFrame({ rect: [1, 1, 16, 60], pivot_px: [8, 60] }, { x: 150, y: 150, width: 8, height: 30 })).toEqual({ x: 154, y: 180, scale: .5 });
  expect(fitFrame({ rect: [0, 0, 128, 128], pivot_px: [64, 112] }, { x: 10, y: 20, width: 112, height: 6 })).toEqual({ x: 66, y: 25.25, scale: .046875 });
});

it('loops a walk action using simulation ticks and returns to the first frame when seeked back', () => {
  const walk = { frames: ['walk-0', 'walk-1', 'walk-2'], fps: 15, loop: true };
  expect(animationFrame(walk, 8)).toBe('walk-1');
  expect(animationFrame(walk, 0)).toBe('walk-0');
});
