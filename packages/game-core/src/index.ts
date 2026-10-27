import type { AnyNaturalConclusion, AwardPreview, GameId, RawInput, SimulationContext, SimulationEvent, ReplayRequest, ReplayResult, JsonObject, NaturalConclusion } from './contracts/types.js';
import type { GameState, GameView } from './model.js';
import { RULES } from './rules.js';
import { BUILD } from './build.js';
import { canonicalJson, sha256Utf8, normalizeInputs, validateRules, freeze } from './common.js';
import { createStack, createRunner, createHerd, stepStack, stepRunner, stepHerd } from './games.js';
export * from './contracts/types.js';
export type * from './contracts/adapter.js';
export type * from './model.js';
export * from './common.js';
export { RULES, BUILD };
export { performancePoints } from './games.js';
export { deserialize } from './snapshots.js';

const validated = validateRules(RULES);
if (!validated.ok) throw new Error(validated.errors.join(';'));
const frozenRules = validated.rules;
export function createContext<G extends GameId>(game: G): SimulationContext<G> {
  return { game_id: game, rules: frozenRules, rule_version: BUILD.rule_version, rules_hash: BUILD.rules_hash, simulator_version: BUILD.simulator_version, seed: RULES.common.official_logic_seed_by_game[game] };
}
export function createState(context: SimulationContext<GameId>): GameState {
  if (context.seed !== RULES.common.official_logic_seed_by_game[context.game_id] || context.rules_hash !== BUILD.rules_hash || context.simulator_version !== BUILD.simulator_version) throw new Error('Frozen simulation context mismatch');
  const state = context.game_id === 'stack' ? createStack(context.seed) : context.game_id === 'runner' ? createRunner() : createHerd(context.seed);
  freeze(state); return state;
}

export function view(state: GameState): GameView {
  const base = { game_id: state.game_id, tick: state.tick, accepted_actions_count: state.accepted_actions_count };
  switch (state.game_id) {
    case 'stack': {
      const s = RULES.stack;
      const phase = state.phase === 'READY' ? 'SWING' : state.phase === 'FALLING' ? 'FALL' : 'SETTLE';
      return { ...base, game_id: 'stack', conclusion: state.conclusion, stats: { ...state.stats }, placed_layers: state.placed_layers.map(l => ({ ...l, center: { ...l.center } })), top_support: { center: { x_u: state.top_x, y_u: state.top_y }, width_u: s.tray_width_u }, moving_tray: state.conclusion ? null : { center: { x_u: state.phase === 'FALLING' ? state.drop_x : state.x, y_u: state.top_y - s.layer_height_u * 3 }, width_u: s.tray_width_u, phase, phase_ticks_remaining: state.phase === 'FALLING' ? state.landing_tick - state.tick : state.phase === 'SETTLING' ? state.spawn_tick - state.tick : 0 } };
    }
    case 'runner': {
      const r = RULES.runner;
      return { ...base, game_id: 'runner', conclusion: state.conclusion, stats: { ...state.stats }, distance_u: state.distance_u, sheep_foot: { x_u: r.sheep_foot_x_u, y_u: state.feet_y }, sheep_vy_u_per_tick: state.vy, on_ground: state.feet_y === r.ground_y_u, obstacles: state.obstacles.map(o => ({ obstacle_id: o.id, bounds: { min_x_u: o.world_left - state.distance_u, max_x_u: o.world_left - state.distance_u + o.width, min_y_u: r.obstacle_top_y_u, max_y_u: r.ground_y_u }, collision_recorded: o.touched, passed: o.passed })), grass: state.grass.map(g => ({ grass_id: g.id, center: { x_u: g.world_x - state.distance_u, y_u: g.y }, outer_collected: g.outer, inner_collected: g.inner })) };
    }
    case 'herd': return { ...base, game_id: 'herd', conclusion: state.conclusion, stats: { ...state.stats }, dog: { center: { x_u: state.dog.x, y_u: state.dog.y }, facing_index: state.dog.facing }, sheep: state.sheep.map(s => ({ sheep_id: s.id, center: { x_u: s.x, y_u: s.y }, facing_index: s.facing, in_pen: s.in_pen })), bark_ticks_remaining: Math.max(0, state.bark_active_until - state.tick), bark_cooldown_ticks_remaining: Math.max(0, state.next_bark_tick - state.tick) };
  }
}

export interface CoreStepOutput { readonly state: GameState; readonly view: GameView; readonly events: readonly SimulationEvent[]; readonly accepted_actions_delta: number; }
export function step(context: SimulationContext<GameId>, state: GameState, batch: { readonly tick: number; readonly inputs: readonly RawInput[] }): CoreStepOutput {
  if (context.game_id !== state.game_id) throw new Error('Game/state mismatch');
  if (state.conclusion) return { state, view: view(state), events: [], accepted_actions_delta: 0 };
  if (batch.tick !== state.tick + 1 || batch.tick > RULES.common.max_ticks || batch.inputs.some(i => i.tick !== batch.tick)) throw new Error('Invalid next tick');
  const normalized = normalizeInputs(context.game_id, batch.inputs, batch.tick);
  if (!normalized.ok) throw new Error(normalized.issues.map(i => i.code).join(','));
  const next = structuredClone(state), events: SimulationEvent[] = [];
  next.tick = batch.tick;
  switch (next.game_id) {
    case 'stack': stepStack(next, normalized.inputs, context.seed, events); break;
    case 'runner': stepRunner(next, normalized.inputs, events); break;
    case 'herd': stepHerd(next, normalized.inputs, events); break;
  }
  freeze(next);
  return { state: next, view: view(next), events, accepted_actions_delta: next.accepted_actions_count - state.accepted_actions_count };
}

export function previewAward(conclusion: NaturalConclusion<GameId>, _rules: SimulationContext<GameId>['rules']): AwardPreview {
  const eligible = conclusion.accepted_actions_count >= RULES.common.min_accepted_actions;
  return { participation_eligible: eligible, participation_points: eligible ? RULES.common.participation_points : 0, performance_points: conclusion.performance_points, predicted_points: eligible ? RULES.common.participation_points + conclusion.performance_points : 0, final: false };
}

function matchesConclusion<G extends GameId>(actual: AnyNaturalConclusion, game: G): actual is AnyNaturalConclusion & NaturalConclusion<G> { return actual.game_id === game; }

export async function replay<G extends GameId>(request: ReplayRequest<G>): Promise<ReplayResult<G>> {
  const entries: {sheep_id:number;tick:number}[]=[];
  const result=(value:ReplayResult<G>):ReplayResult<G>=>request.collect_diagnostics?{...value,diagnostics:{sheep_entry_ticks:entries}}:value;
  const normalized = normalizeInputs(request.context.game_id, request.inputs, request.declared_end_tick);
  if (!normalized.ok) return result({ ok: false, code: 'INPUT_AFTER_END', actual: null });
  let state = createState(request.context), cursor = 0;
  for (let tick = 1; tick <= request.declared_end_tick; tick++) {
    if (state.conclusion) {
      if (!matchesConclusion(state.conclusion, request.context.game_id)) throw new Error('Conclusion game mismatch');
      return result({ ok: false, code: 'INPUT_AFTER_END', actual: state.conclusion });
    }
    const inputs: RawInput[] = [];
    while (normalized.inputs[cursor]?.tick === tick) { const input = normalized.inputs[cursor]; if (input) inputs.push(input); cursor++; }
    const output=step(request.context, state, { tick, inputs });
    if(request.collect_diagnostics)for(const event of output.events)if(event.type==='SHEEP_PENNED'&&event.entity_id!==null)entries.push({sheep_id:event.entity_id,tick:event.tick});
    state=output.state;
  }
  const actual = state.conclusion;
  if (!actual) return result({ ok: false, code: 'NO_NATURAL_END', actual: null });
  // The initial state and all steps are bound to request.context.game_id above.
  if (!matchesConclusion(actual, request.context.game_id)) throw new Error('Conclusion game mismatch');
  const conclusion = actual;
  if (actual.end_tick !== request.declared_end_tick) return result({ ok: false, code: 'END_TICK_MISMATCH', actual: conclusion });
  if (actual.end_reason !== request.declared_end_reason) return result({ ok: false, code: 'END_REASON_MISMATCH', actual: conclusion });
  return result({ ok: true, conclusion, final_state_hash: await sha256Utf8(canonicalJson(state)) });
}

function isJsonObject(value: unknown): value is JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(v => v === null || typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v) || Array.isArray(v) && v.every(i => isJsonObject({ i })) || isJsonObject(v));
}
export function serialize(state: GameState): JsonObject {
  const value: unknown = JSON.parse(canonicalJson({state_schema_version:'sheep-state-2.2.0',state}));
  if (!isJsonObject(value)) throw new Error('Invalid state JSON'); return value;
}
