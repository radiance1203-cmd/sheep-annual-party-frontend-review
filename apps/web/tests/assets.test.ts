import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseAtlas, validateGameAtlas } from '../src/game/assets';
it('reads the delivered animation objects and every named frame', () => {
  const raw: unknown = JSON.parse(readFileSync('apps/web/public/assets/characters/sheep_side_v1.atlas.json', 'utf8'));
  const atlas = parseAtlas(raw);
  expect(atlas.animations['idle.e']?.frames.length).toBeGreaterThan(0);
  for (const animation of Object.values(atlas.animations)) for (const frame of animation.frames) expect(atlas.frames[frame]).toBeDefined();
});
it('rejects animation references to missing frames before consuming a slot', () => {
  expect(() => parseAtlas({ image: 'x.png', frames: {}, animations: { 'idle.e': { frames: ['missing'], fps: 8, loop: true } } })).toThrow();
});
it('rejects missing required direction/action and decoded size mismatch', () => {
  const atlas = parseAtlas(JSON.parse(readFileSync('apps/web/public/assets/characters/sheep_side_v1.atlas.json', 'utf8')));
  expect(() => validateGameAtlas('sheep_side_v1', atlas, 1, 1)).toThrow();
  const broken = structuredClone(atlas); delete broken.animations['celebrate.e'];
  expect(() => validateGameAtlas('sheep_side_v1', broken, 1024, 1024)).toThrow();
  expect(() => validateGameAtlas('sheep_side_v1', atlas, 1024, 1024)).not.toThrow();
});
it('requires dedicated compact poses and bounded props for the new art profile while retaining old releases', () => {
  const old = parseAtlas(JSON.parse(readFileSync('apps/web/public/assets/characters/sheep_side_v1.atlas.json', 'utf8')));
  expect(() => validateGameAtlas('sheep_side_v1', old, 1024, 1024, true)).toThrow('叠层');
  expect(() => validateGameAtlas('sheep_side_v1', old, 1024, 1024)).not.toThrow();
  const farm = parseAtlas(JSON.parse(readFileSync('apps/web/public/assets/environment/farm_side_v1.atlas.json', 'utf8')));
  expect(() => validateGameAtlas('farm_side_v1', farm, farm.size_px[0], farm.size_px[1], true)).toThrow('道具');
});
