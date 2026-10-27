import type { Atlas } from './assets';
import { RULES } from '@sheep/game-core';

export function animationFrame(animation: Atlas['animations'][string], elapsedTicks: number): string | undefined {
  const index = Math.floor(Math.max(0, elapsedTicks) * animation.fps / RULES.common.tick_hz);
  return animation.frames[animation.loop ? index % animation.frames.length : Math.min(index, animation.frames.length - 1)];
}
