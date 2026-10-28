import type { Atlas } from './assets';
import { RULES } from '@sheep/game-core';

export function animationFrame(animation: Atlas['animations'][string], elapsedTicks: number): string | undefined {
  const index = Math.floor(Math.max(0, elapsedTicks) * animation.fps / RULES.common.tick_hz);
  return animation.frames[animation.loop ? index % animation.frames.length : Math.min(index, animation.frames.length - 1)];
}

export function fitFrame(frame: Atlas['frames'][string], box: { x: number; y: number; width: number; height: number }): { x: number; y: number; scale: number } {
  const width = frame.rect[2], height = frame.rect[3];
  const scale = Math.min(box.width / width, box.height / height);
  return { x: box.x + (box.width - width * scale) / 2 + frame.pivot_px[0] * scale, y: box.y + (box.height - height * scale) / 2 + frame.pivot_px[1] * scale, scale };
}

/** A finite material sample must never stand in for a direction/action it did not produce. */
export function selectMaterialAtlas(base: string, animation: string, atlases: Readonly<Record<string, Pick<Atlas, 'animations'>>>): string {
  const samples: Readonly<Record<string, string>> = {
    sheep_side_v1: 'r3_sheep_side', sheep_iso8_v1: 'r3_sheep_iso8', dog_iso8_v1: 'r3_dog_iso8',
  };
  const sample = samples[base];
  return sample && atlases[sample]?.animations[animation] ? sample : base;
}
