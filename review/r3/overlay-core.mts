import { createContext, createState, normalizeInputs, RULES, step, view } from '@sheep/game-core';
import type { GameId, GameView } from '@sheep/game-core';
import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
const captureSchema = z.object({
  before: z.object({ stage: z.object({ gameTick: z.coerce.number().int().optional() }).passthrough(), teaching: z.object({ teachingTick: z.coerce.number().int().optional() }).passthrough() }).passthrough(),
  after: z.object({ stage: z.object({ gameTick: z.coerce.number().int().optional() }).passthrough() }).passthrough(),
  actualInputPrefixes: z.object({ beforeScreenshot: z.array(z.unknown()), afterScreenshot: z.array(z.unknown()) }),
  screenshotSha256: z.string(), candidateManifestSha256: z.string(), hashes: z.record(z.string(), z.string()),
});
const rows = [];
function replay(game: GameId, target: number, raw: readonly unknown[]): GameView {
  const inputs = normalizeInputs(game, raw, Math.max(1, target));
  if (!inputs.ok) throw new Error('Captured input prefix failed shared-core normalization');
  const context = createContext(game); let state = createState(context);
  for (let tick = 1; tick <= target && !state.conclusion; tick++) state = step(context, state, { tick, inputs: inputs.inputs.filter(input => input.tick === tick) }).state;
  return view(state);
}
for (const game of ['stack', 'runner', 'herd'] as const) {
  const capture = captureSchema.parse(JSON.parse(await readFile(`output/r3-20261028/pages/${game}-running-390.json`, 'utf8')));
  const target = capture.before.stage.gameTick ?? capture.before.teaching.teachingTick ?? 0;
  rows.push({ game, tick: target, after_tick: capture.after.stage.gameTick, view: replay(game, target, capture.actualInputPrefixes.beforeScreenshot), after_view: replay(game, capture.after.stage.gameTick ?? target, capture.actualInputPrefixes.afterScreenshot), screenshot_sha256: capture.screenshotSha256, candidate_manifest: capture.candidateManifestSha256, rules_sha256: capture.hashes['config/game_rules.v2.1.json'], geometry: game === 'stack' ? { width: RULES.stack.world_width_u / 1000, height: RULES.stack.reference_view_height_u / 1000, tray_width: RULES.stack.tray_width_u / 1000, layer_height: RULES.stack.layer_height_u / 1000 } : game === 'runner' ? { width: RULES.runner.world_view_width_u / 1000, height: RULES.runner.world_view_height_u / 1000, ground_y: RULES.runner.ground_y_u / 1000, outer_radius: RULES.runner.grass_outer_radius_u / 1000, inner_radius: RULES.runner.grass_inner_radius_u / 1000 } : { width: RULES.herd.world_width_u / 1000, height: RULES.herd.world_height_u / 1000, fence_y: RULES.herd.fence_y_u / 1000, gate: RULES.herd.gate_open_x_u.map(value => value / 1000), sheep_radius: RULES.herd.sheep_radius_u / 1000, dog_radius: RULES.herd.dog_radius_u / 1000 } });
}
await writeFile('output/r3-20261028/overlay-core.json', JSON.stringify({ scope: 'Actual pre-screenshot view replayed only through unchanged game-core; screenshot records its before/after tick interval; original prototype is illustrative and never authoritative geometry', rows }, null, 2));
console.log('Overlay views: shared core replay PASS 3');
