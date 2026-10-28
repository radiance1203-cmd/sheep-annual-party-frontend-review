import { describe, expect, it } from 'vitest';
import * as presentation from './presentation';
import type { Atlas } from './assets';

const idle = { frames: ['idle'], fps: 8, loop: true };
const atlases: Record<string, Pick<Atlas, 'animations'>> = {
  sheep_iso8_v1: { animations: { 'idle.n': idle, 'walk.n': idle, 'walk.ne': idle } },
  r3_sheep_iso8: { animations: { 'idle.n': idle, 'walk.n': idle } },
  dog_iso8_v1: { animations: { 'idle.n': idle, 'bark.n': idle } },
  r3_dog_iso8: { animations: { 'idle.n': idle } },
};

describe('limited material sample selection', () => {
  it('selects a new material only for a produced action and direction', () => {
    expect(presentation.selectMaterialAtlas('sheep_iso8_v1', 'walk.n', atlases)).toBe('r3_sheep_iso8');
  });
  it('keeps an unproduced direction and bark on the original atlas', () => {
    expect(presentation.selectMaterialAtlas('sheep_iso8_v1', 'walk.ne', atlases)).toBe('sheep_iso8_v1');
    expect(presentation.selectMaterialAtlas('dog_iso8_v1', 'bark.n', atlases)).toBe('dog_iso8_v1');
  });
  it('never promotes a sample idle frame into an unproduced action', () => {
    expect(presentation.selectMaterialAtlas('dog_iso8_v1', 'walk.n', atlases)).toBe('dog_iso8_v1');
  });
  it('retains the original path when candidate material atlases are absent', () => {
    expect(presentation.selectMaterialAtlas('sheep_iso8_v1', 'walk.n', {})).toBe('sheep_iso8_v1');
    expect(presentation.selectMaterialAtlas('sheep_stack_candidate', 'stack_idle.e', atlases)).toBe('sheep_stack_candidate');
  });
});
