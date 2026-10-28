import { strict as assert } from 'node:assert';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { z } from 'zod';
import { assertCriticalControls, assertDisjointRectangles } from './r3-support.mjs';
const rect = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number(), right: z.number(), bottom: z.number() });
const schema = z.object({ captures: z.array(z.object({ game: z.string(), candidateManifestSha256: z.string(), before: z.object({ rects: z.record(z.string(), rect), viewport: z.object({ width: z.number(), height: z.number(), requestedDpr: z.number() }), controls: z.array(rect.extend({ text: z.string(), tag: z.string(), disabled: z.boolean() })) }) })) });
const legacy = process.argv.includes('--legacy');
const output = 'output/r3-20261028/B4-layout-validation'; await mkdir(output, { recursive: true });
const evidence = schema.parse(JSON.parse(await readFile('output/r3-20261028/first-three-320/results.json', 'utf8')));
const rows = [], failures: string[] = [];
for (const row of evidence.captures) {
  const m = row.before, controls = m.rects['.game-controls'], toolbar = m.rects['.practice-toolbar'], stage = m.rects['.game-stage'], canvas = m.rects.canvas;
  assert(controls); assert(toolbar); assert(stage); assert(canvas);
  let failure: string | undefined;
  try {
    if (legacy) assert(toolbar.y >= controls.bottom - .5, 'legacy vertical-only practice controls cannot overlap action');
    else {
      assertCriticalControls(m); assertDisjointRectangles(controls, toolbar); assertDisjointRectangles(stage, toolbar); assertDisjointRectangles(stage, controls);
      assert(canvas.x >= stage.x - .5 && canvas.y >= stage.y - .5 && canvas.right <= stage.right + .5 && canvas.bottom <= stage.bottom + .5, 'full world must remain inside stage');
      for (const box of [controls, toolbar, stage]) assert(box.x >= 0 && box.y >= 0 && box.right <= m.viewport.width && box.bottom <= m.viewport.height);
    }
  } catch (error) { failure = error instanceof Error ? error.message : String(error); failures.push(`${row.game}: ${failure}`); }
  rows.push({ game: row.game, candidateManifestSha256: row.candidateManifestSha256, controls, toolbar, stage, canvas, failure });
}
if (!legacy) {
  const first = { x: 0, y: 0, right: 48, bottom: 48 };
  assertDisjointRectangles(first, { x: 52, y: 0, right: 100, bottom: 48 });
  assertDisjointRectangles(first, { x: 0, y: 52, right: 48, bottom: 100 });
  assert.throws(() => assertDisjointRectangles(first, { x: 20, y: 20, right: 68, bottom: 68 }), /overlap in both axes/u);
}
await writeFile(`${output}/${legacy ? 'legacy-vertical-red' : 'rectangle-geometry-green'}.json`, JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', scope: 'same real B4 320×568 snapshots; revised geometry accepts horizontal/vertical separation and rejects genuine 2D overlap; no product changes', rows, failures, syntheticNegativeOverlapRejected: !legacy }, null, 2));
if (failures.length) process.exitCode = 1;
console.log(JSON.stringify({ mode: legacy ? 'legacy' : 'rectangles', rows: rows.length, failures }));
