import { expect, it } from 'vitest';
import { animationFrame } from './presentation';

it('holds the final landing frame instead of restarting a nonlooping action', () => {
  const land = { frames: ['land-0', 'land-1', 'land-2'], fps: 15, loop: false };
  expect(animationFrame(land, 0)).toBe('land-0');
  expect(animationFrame(land, 2)).toBe('land-1');
  expect(animationFrame(land, 30)).toBe('land-2');
});

it('loops a walk action using simulation ticks and returns to the first frame when seeked back', () => {
  const walk = { frames: ['walk-0', 'walk-1', 'walk-2'], fps: 15, loop: true };
  expect(animationFrame(walk, 8)).toBe('walk-1');
  expect(animationFrame(walk, 0)).toBe('walk-0');
});
