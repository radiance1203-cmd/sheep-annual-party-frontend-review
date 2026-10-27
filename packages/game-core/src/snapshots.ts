import { z } from 'zod';
import type { GameState } from './model.js';
import type { GameId, SimulationContext } from './contracts/types.js';
import { RULES } from './rules.js';
import { freeze } from './common.js';

const integer = z.number().int().safe();
const tick = integer.min(0).max(RULES.common.max_ticks);
const point = z.object({ x_u: integer, y_u: integer }).strict();
const stackStats = z.object({ success_layers: integer.min(0).max(20), perfect_layers: integer.min(0).max(20), misses: integer.min(0).max(3) }).strict();
const runnerStats = z.object({ safe_passed: integer.min(0).max(20), collision_count: integer.min(0).max(20), outer_collected: integer.min(0).max(10), inner_collected: integer.min(0).max(10) }).strict();
const herdStats = z.object({ penned_count: integer.min(0).max(8), final_goal_tick: tick.nullable(), time_bonus_points: integer.min(0).max(32) }).strict();
const header = { tick, accepted_actions_count: integer.min(0).max(2700) };
const endBase = { end_tick: tick.min(1), accepted_actions_count: header.accepted_actions_count, performance_points: integer.min(0).max(80) };
const stack = z.object({ ...header, game_id: z.literal('stack'), conclusion: z.object({ ...endBase, game_id: z.literal('stack'), end_reason: z.enum(['THREE_MISSES','GOAL_REACHED','TIME_LIMIT']), stats: stackStats }).strict().nullable(), phase: z.enum(['READY','FALLING','SETTLING','ENDED']), x: integer.min(RULES.stack.swing_min_x_u).max(RULES.stack.swing_max_x_u), direction: z.union([z.literal(-1),z.literal(1)]), attempt: integer.min(0).max(23), landing_tick: integer.min(-1).max(1362), spawn_tick: integer.min(-1).max(1356), drop_x: integer.min(0).max(360000), top_x: integer.min(0).max(360000), top_y: integer.min(-450000).max(430000), stats: stackStats, placed_layers: z.array(z.object({ layer_no: integer.min(1).max(20), center: point, perfect: z.boolean() }).strict()).max(20) }).strict();
const runner = z.object({ ...header, game_id: z.literal('runner'), conclusion: z.object({ ...endBase, game_id: z.literal('runner'), end_reason: z.literal('TIME_LIMIT'), stats: runnerStats }).strict().nullable(), feet_y: integer.min(0).max(RULES.runner.ground_y_u), vy: integer.min(-12500).max(12500), pending_until: integer.min(-1).max(1353), distance_u: integer.min(0).max(4000000), obstacles: z.array(z.object({ id: integer.min(1).max(20), world_left: integer, width: integer.positive(), touched: z.boolean(), passed: z.boolean() }).strict()).length(20), grass: z.array(z.object({ id: integer.min(1).max(10), world_x: integer, y: integer, outer: z.boolean(), inner: z.boolean() }).strict()).length(10), stats: runnerStats }).strict();
const herd = z.object({ ...header, game_id: z.literal('herd'), conclusion: z.object({ ...endBase, game_id: z.literal('herd'), end_reason: z.enum(['GOAL_REACHED','TIME_LIMIT']), stats: herdStats }).strict().nullable(), dog: z.object({ x: integer.min(9000).max(351000), y: integer.min(85000).max(411000), facing: integer.min(0).max(7) }).strict(), sheep: z.array(z.object({ id: integer.min(1).max(8), x: integer.min(10000).max(350000), y: integer.min(10000).max(410000), in_pen: z.boolean(), facing: integer.min(0).max(7), stuck_ticks: integer.min(0).max(30), sidestep_remaining: integer.min(0).max(15), sidestep_dx: integer.min(-1000).max(1000), wall_guide_active: z.boolean(), fence_contact_ticks: integer.min(0).max(1350) }).strict()).length(8), rng: integer.min(0).max(4294967295), wander: z.array(z.array(integer.min(-1024).max(1024)).length(2)).length(8), bark_active_until: integer.min(0).max(1362), next_bark_tick: integer.min(1).max(1500), stats: herdStats }).strict();
const schema = z.discriminatedUnion('game_id',[stack,runner,herd]);

export function deserialize(context: SimulationContext<GameId>, payload: unknown): GameState {
  const envelope = z.object({ state_schema_version:z.literal('sheep-state-2.2.0'), state:schema }).strict().parse(payload);
  const state = envelope.state;
  if (state.game_id !== context.game_id) throw new Error('Checkpoint game mismatch');
  if (state.conclusion && state.conclusion.end_tick !== state.tick) throw new Error('Checkpoint end tick mismatch');
  if (state.game_id === 'stack' && (state.stats.perfect_layers > state.stats.success_layers || state.placed_layers.length !== state.stats.success_layers)) throw new Error('Invalid stack counters');
  if (state.game_id === 'runner' && state.stats.inner_collected > state.stats.outer_collected) throw new Error('Invalid grass counters');
  if (state.game_id === 'herd') {
    if (new Set(state.sheep.map(s => s.id)).size !== RULES.herd.sheep_count) throw new Error('Duplicate sheep');
    for (const sheep of state.sheep) for (const wall of RULES.herd.expanded_sheep_fence_aabbs_u) {
      if (sheep.x > wall.min_x && sheep.x < wall.max_x && sheep.y > wall.min_y && sheep.y < wall.max_y) throw new Error('Checkpoint sheep inside wall');
    }
    if (state.sheep.filter(s=>s.in_pen).length !== state.stats.penned_count) throw new Error('Invalid pen counter');
  }
  freeze(state); return state;
}
