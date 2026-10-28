import { strict as assert } from 'node:assert';
import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { assertCriticalControls, sha } from './r3-support.mjs';
const rect = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number(), right: z.number(), bottom: z.number() });
const measurement = z.object({ rects: z.record(z.string(), rect), stage: z.record(z.string(), z.string()), canvas: z.object({ width: z.number(), height: z.number(), worldWidth: z.string(), worldHeight: z.string(), effectiveDpr: z.string() }), viewport: z.object({ width: z.number(), height: z.number(), requestedDpr: z.number() }), controls: z.array(rect.extend({ text: z.string(), tag: z.string(), disabled: z.boolean() })), pageScenery: z.object({ computedImage: z.string(), computedRepeat: z.string() }) });
const schema = z.object({ mutations: z.number(), captures: z.array(z.object({ filename: z.string(), game: z.enum(['stack', 'runner', 'herd']), state: z.enum(['prep', 'tutorial', 'running']), before: measurement, after: measurement, hashes: z.record(z.string(), z.string()), candidateManifestSha256: z.string(), productionManifestSha256: z.string(), screenshotSha256: z.string(), pageAnchor: z.object({ errorCssPx: z.number(), scope: z.string() }), actualInputPrefixes: z.object({ beforeScreenshot: z.array(z.unknown()), afterScreenshot: z.array(z.unknown()) }) })) });
const output = 'output/r3-20261028/pages';
const result = schema.parse(JSON.parse(await readFile(`${output}/results.json`, 'utf8')));
assert.equal(result.mutations, 0); assert.equal(result.captures.length, 27);
const first = result.captures[0]; assert(first);
const tuples = new Set<string>(), checks = [];
for (const row of result.captures) {
  const image = await readFile(`${output}/${row.filename}`), m = row.before, stage = m.rects['.game-stage'], canvas = m.rects.canvas; assert(stage); assert(canvas);
  assertCriticalControls(m);
  assert(Math.abs(row.pageAnchor.errorCssPx) <= 1);
  assert(m.pageScenery.computedImage.includes('blob:')); assert.equal(m.pageScenery.computedImage.match(/url\(/gu)?.length, 1); assert(m.pageScenery.computedRepeat.split(',').every(value => value.trim() === 'no-repeat'));
  assert.equal(sha(image), row.screenshotSha256);
  assert.equal(image.readUInt32BE(16), m.viewport.width * m.viewport.requestedDpr); assert.equal(image.readUInt32BE(20), m.viewport.height * m.viewport.requestedDpr);
  assert.deepEqual(row.hashes, first.hashes); assert.equal(row.candidateManifestSha256, first.candidateManifestSha256); assert.equal(row.productionManifestSha256, first.productionManifestSha256);
  assert(canvas.x >= stage.x - .5 && canvas.y >= stage.y - .5 && canvas.right <= stage.right + .5 && canvas.bottom <= stage.bottom + .5, `${row.filename} canvas clipped`);
  assert(canvas.y >= -.5 && canvas.bottom <= m.viewport.height + .5, `${row.filename} complete world outside viewport`);
  assert.equal(Number(m.canvas.worldWidth), 360); assert.equal(Number(m.canvas.worldHeight), row.game === 'stack' ? 480 : row.game === 'runner' ? 220 : 420);
  assert.equal(Number(m.canvas.effectiveDpr), 2);
  if (row.state !== 'tutorial') { assert.equal(row.actualInputPrefixes.beforeScreenshot.length, 0); assert.equal(row.actualInputPrefixes.afterScreenshot.length, 0); assert.equal(m.stage.acceptedActions, '0'); }
  else { const controls = m.rects['.teaching-controls']; assert(controls); assert(controls.y >= 0 && controls.bottom <= m.viewport.height, `${row.filename} teaching controls outside viewport`); }
  const key = `${row.game}/${row.state}/${m.viewport.width}`; assert(!tuples.has(key)); tuples.add(key);
  checks.push({ key, nativePngVerified: true, sameFrozenVersion: true, fullWorldContained: true, exactInputScopeVerified: true, configuredPageAnchorErrorCssPx: row.pageAnchor.errorCssPx });
}
await writeFile(`${output}/integrity-check.json`, JSON.stringify({ status: 'PASS', checks, candidateManifestSha256: first.candidateManifestSha256, productionManifestSha256: first.productionManifestSha256, scope: 'offline integrity/layout audit of actual browser evidence; no art or physical-device acceptance' }, null, 2));
console.log(JSON.stringify({ status: 'PASS', screenshots: checks.length, mutations: result.mutations }));
