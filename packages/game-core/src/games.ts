import { RULES } from './rules.js';
import type { StackState, RunnerState, HerdState, Sheep, GameState } from './model.js';
import type { GameInput, SimulationEvent } from './contracts/types.js';
import { clamp, truncDiv, isqrt, unit1024, normalizeMove, sweepMove, facing } from './common.js';

export function performancePoints(state: GameState): number {
  switch (state.game_id) {
    case 'stack': return state.stats.success_layers * RULES.stack.points_per_success + state.stats.perfect_layers * RULES.stack.extra_points_per_perfect;
    case 'runner': return state.stats.safe_passed * RULES.runner.safe_pass_points + state.stats.outer_collected * RULES.runner.grass_outer_points + state.stats.inner_collected * RULES.runner.grass_inner_points;
    case 'herd': return state.stats.penned_count * RULES.herd.points_per_sheep + state.stats.time_bonus_points;
  }
}

export function createStack(seed: number): StackState {
  const s = RULES.stack, right = (seed & 1) !== 0;
  return { game_id: 'stack', tick: 0, accepted_actions_count: 0, conclusion: null, phase: 'READY', x: right ? s.swing_max_x_u : s.swing_min_x_u, direction: right ? -1 : 1, attempt: 0, landing_tick: -1, spawn_tick: -1, drop_x: 0, top_x: s.initial_top_x_u, top_y: s.initial_top_y_u, stats: { success_layers: 0, perfect_layers: 0, misses: 0 }, placed_layers: [] };
}
export function createRunner(): RunnerState {
  const r = RULES.runner;
  return { game_id: 'runner', tick: 0, accepted_actions_count: 0, conclusion: null, feet_y: r.ground_y_u, vy: 0, pending_until: -1, distance_u: 0, obstacles: r.obstacle_world_left_u.map((left, i) => {
    const width = r.obstacle_widths_u[i]; if (width === undefined) throw new Error('Missing obstacle width');
    return { id: i + 1, world_left: left, width, touched: false, passed: false };
  }), grass: r.grass_centers.map(g => ({ id: g.id, world_x: g.world_x_u, y: g.y_u, outer: false, inner: false })), stats: { safe_passed: 0, collision_count: 0, outer_collected: 0, inner_collected: 0 } };
}
export function createHerd(seed: number): HerdState {
  const h = RULES.herd, [x, y] = h.dog_initial_u;
  if (x === undefined || y === undefined) throw new Error('Invalid dog initial point');
  return { game_id: 'herd', tick: 0, accepted_actions_count: 0, conclusion: null, dog: { x, y, facing: 6 }, sheep: h.sheep_initial_centers_u.map((p, i) => {
    if (p[0] === undefined || p[1] === undefined) throw new Error('Invalid sheep initial point');
    return { id: i + 1, x: p[0], y: p[1], in_pen: false, facing: 6, stuck_ticks: 0, sidestep_remaining: 0, sidestep_dx: 0, wall_guide_active: false, fence_contact_ticks: 0 };
  }), rng: seed >>> 0 || RULES.common.rng.zero_seed_fallback, wander: h.direction_table_1024.map(() => [0, 0]), bark_active_until: 0, next_bark_tick: h.first_bark_eligible_tick, stats: { penned_count: 0, final_goal_tick: null, time_bonus_points: 0 } };
}
export function event(state: GameState, type: SimulationEvent['type'], entity: number | null = null): SimulationEvent {
  return { event_key: `${state.game_id}:${state.tick}:${type}:${entity ?? 0}`, tick: state.tick, type, entity_id: entity };
}
export function stepStack(state: StackState, inputs: readonly GameInput[], seed: number, events: SimulationEvent[]): void {
  const s = RULES.stack, tick = state.tick;
  if (state.phase === 'SETTLING' && tick === state.spawn_tick) {
    state.attempt++; const right = ((seed ^ state.attempt) & 1) !== 0;
    state.x = right ? s.swing_max_x_u : s.swing_min_x_u; state.direction = right ? -1 : 1; state.phase = 'READY';
  } else if (state.phase === 'READY') {
    if (inputs.some(i => i.type === 'DROP')) {
      state.drop_x = state.x; state.landing_tick = tick + s.fall_ticks; state.phase = 'FALLING';
      state.accepted_actions_count++; events.push(event(state, 'DROP_ACCEPTED'));
    } else {
      const speed = s.base_swing_speed_u_per_tick + s.speed_increment_u_per_tick * Math.floor(state.stats.success_layers / s.increase_every_success_layers);
      state.x += state.direction * speed;
      if (state.x >= s.swing_max_x_u) { state.x = 2 * s.swing_max_x_u - state.x; state.direction = -1; }
      else if (state.x <= s.swing_min_x_u) { state.x = 2 * s.swing_min_x_u - state.x; state.direction = 1; }
    }
  } else if (state.phase === 'FALLING' && tick === state.landing_tick) {
    const delta = Math.abs(state.drop_x - state.top_x), success = Math.max(0, s.tray_width_u - delta) >= s.minimum_overlap_u, perfect = success && delta <= s.perfect_center_error_u;
    if (success) {
      state.stats = { ...state.stats, success_layers: state.stats.success_layers + 1, perfect_layers: state.stats.perfect_layers + Number(perfect) };
      state.top_x = state.drop_x; state.top_y -= s.layer_height_u;
      state.placed_layers = [...state.placed_layers, { layer_no: state.stats.success_layers, center: { x_u: state.top_x, y_u: state.top_y }, perfect }];
      events.push(event(state, 'LAYER_LANDED', state.stats.success_layers));
    } else { state.stats = { ...state.stats, misses: state.stats.misses + 1 }; events.push(event(state, 'LAYER_MISSED', state.attempt)); }
    state.phase = 'SETTLING'; state.spawn_tick = tick + s.settle_ticks;
  }
  const reason = state.stats.misses >= s.max_misses ? 'THREE_MISSES' : state.stats.success_layers >= s.max_success_layers ? 'GOAL_REACHED' : tick === RULES.common.max_ticks ? 'TIME_LIMIT' : null;
  if (reason) {
    state.phase = 'ENDED'; state.conclusion = { game_id: 'stack', end_tick: tick, end_reason: reason, accepted_actions_count: state.accepted_actions_count, stats: { ...state.stats }, performance_points: performancePoints(state) };
    events.push(event(state, 'GAME_ENDED'));
  }
}

export function runnerDistance(tick: number): number {
  return RULES.runner.speed_segments.reduce((sum, segment) => sum + Math.max(0, Math.min(tick, segment.end_tick) - segment.start_tick + 1) * segment.speed_u_per_tick, 0);
}
export function stepRunner(state: RunnerState, inputs: readonly GameInput[], events: SimulationEvent[]): void {
  const r = RULES.runner, tick = state.tick;
  if (inputs.some(i => i.type === 'JUMP')) state.pending_until = tick + r.jump_buffer_extra_ticks;
  if (state.feet_y === r.ground_y_u && state.pending_until >= tick) {
    state.vy = r.jump_initial_vy_u_per_tick; state.pending_until = -1; state.accepted_actions_count++; events.push(event(state, 'JUMP_ACCEPTED'));
  }
  if (state.feet_y < r.ground_y_u || state.vy < 0) { state.vy += r.gravity_u_per_tick_squared; state.feet_y += state.vy; if (state.feet_y >= r.ground_y_u) { state.feet_y = r.ground_y_u; state.vy = 0; } }
  state.distance_u = runnerDistance(tick);
  let collisions = state.stats.collision_count, safe = state.stats.safe_passed, outside = state.stats.outer_collected, inside = state.stats.inner_collected;
  for (const o of state.obstacles) {
    const left = o.world_left - state.distance_u;
    if (!o.touched && left < r.sheep_body_x_max_u && left + o.width > r.sheep_body_x_min_u && state.feet_y + r.body_bottom_relative_to_foot_u > r.obstacle_top_y_u && state.feet_y + r.body_top_relative_to_foot_u < r.ground_y_u) { o.touched = true; collisions++; events.push(event(state, 'OBSTACLE_COLLISION', o.id)); }
  }
  for (const g of state.grass) {
    const dx = g.world_x - state.distance_u - r.pickup_point_x_u, dy = state.feet_y + r.pickup_point_y_relative_to_foot_u - g.y, d2 = dx * dx + dy * dy;
    if (!g.outer && d2 <= r.grass_outer_radius_u ** 2) { g.outer = true; outside++; events.push(event(state, 'GRASS_OUTER', g.id)); }
    if (!g.inner && d2 <= r.grass_inner_radius_u ** 2) { g.inner = true; inside++; events.push(event(state, 'GRASS_INNER', g.id)); }
  }
  for (const o of state.obstacles) if (!o.passed && o.world_left - state.distance_u + o.width <= r.sheep_body_x_min_u) {
    o.passed = true; if (!o.touched) { safe++; events.push(event(state, 'OBSTACLE_PASSED', o.id)); }
  }
  state.stats = { safe_passed: safe, collision_count: collisions, outer_collected: outside, inner_collected: inside };
  if (tick === RULES.common.max_ticks) {
    state.conclusion = { game_id: 'runner', end_tick: tick, end_reason: 'TIME_LIMIT', accepted_actions_count: state.accepted_actions_count, stats: { ...state.stats }, performance_points: performancePoints(state) };
    events.push(event(state, 'GAME_ENDED'));
  }
}

function d2(x: number, y: number, a: number, b: number): number { return (x - a) ** 2 + (y - b) ** 2; }
function rngNext(state: HerdState): number {
  let x = state.rng; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; state.rng = x >>> 0; return state.rng;
}
function sideDirection(s: Sheep): number { return s.x < RULES.herd.gate_attractor_u[0]! ? 1 : s.x > RULES.herd.gate_attractor_u[0]! ? -1 : s.id % 2 ? -1 : 1; }
export function stepHerd(state: HerdState, inputs: readonly GameInput[], events: SimulationEvent[]): void {
  const h = RULES.herd, tick = state.tick, scale = RULES.common.direction_scale;
  const move = inputs.find(i => i.type === 'DOG_MOVE');
  const [mx, my] = move?.type === 'DOG_MOVE' ? normalizeMove(move.value.x, move.value.y) : [0, 0];
  const oldDog = { ...state.dog };
  const dogWall = [{ min_x: -h.dog_radius_u, max_x: h.world_width_u + h.dog_radius_u, min_y: h.fence_y_u - h.dog_radius_u, max_y: h.fence_y_u + h.dog_radius_u }];
  const [dogX, dogY] = sweepMove(oldDog.x, oldDog.y, truncDiv(mx * h.dog_max_displacement_u_per_tick, h.move_input_normalization_scale), truncDiv(my * h.dog_max_displacement_u_per_tick, h.move_input_normalization_scale), dogWall, h.dog_center_bounds_u);
  state.dog = { x: dogX, y: dogY, facing: facing(dogX - oldDog.x, dogY - oldDog.y, oldDog.facing) };
  if (dogX !== oldDog.x || dogY !== oldDog.y) { state.accepted_actions_count++; events.push(event(state, 'DOG_MOVED')); }
  const active = state.sheep.filter(s => !s.in_pen);
  if (inputs.some(i => i.type === 'BARK') && tick >= state.next_bark_tick) {
    state.bark_active_until = tick + h.bark_duration_ticks; state.next_bark_tick = tick + h.bark_cooldown_ticks;
    if (active.some(s => d2(s.x, s.y, dogX, dogY) <= h.bark_influence_radius_u ** 2)) state.accepted_actions_count++;
    events.push(event(state, 'BARK_TRIGGERED'));
  }
  if ((tick - h.wander_first_refresh_tick) % h.wander_refresh_every_ticks === 0) state.wander = state.sheep.map(() => {
    const direction = h.direction_table_1024[rngNext(state) & 7]; if (!direction) throw new Error('Missing direction'); return [...direction];
  });
  const radius = tick < state.bark_active_until ? h.bark_influence_radius_u : h.normal_influence_radius_u;
  const gateX = h.gate_attractor_u[0], gateY = h.gate_attractor_u[1], gateLo = h.gate_center_x_allowed_u[0], gateHi = h.gate_center_x_allowed_u[1];
  if (gateX === undefined || gateY === undefined || gateLo === undefined || gateHi === undefined) throw new Error('Invalid gate');
  const insideGate = (x: number) => x >= gateLo && x <= gateHi;
  const updates: { sheep: Sheep; x: number; y: number }[] = [];
  for (const s of active) {
    const px = s.x, py = s.y, pressured = d2(px, py, dogX, dogY) <= radius * radius;
    const fallback = h.direction_table_1024[(s.id - 1) % h.direction_table_1024.length];
    if (!fallback || fallback[0] === undefined || fallback[1] === undefined) throw new Error('Missing flee direction');
    const flee = px === dogX && py === dogY ? fallback : unit1024(px - dogX, py - dogY);
    let sx = 0, sy = 0, sumX = 0, sumY = 0, neighbors = 0;
    for (const n of active) {
      if (s.id === n.id) continue;
      const ax = px - n.x, ay = py - n.y, n2 = ax * ax + ay * ay;
      if (n2 <= h.cohesion_radius_u ** 2) { neighbors++; sumX += n.x; sumY += n.y; }
      if (n2 < h.separation_radius_u ** 2) {
        const distance = isqrt(n2), [ux, uy] = unit1024(ax, ay);
        sx += truncDiv(ux * (h.separation_radius_u - distance), h.separation_radius_u); sy += truncDiv(uy * (h.separation_radius_u - distance), h.separation_radius_u);
      }
    }
    const separation = unit1024(sx, sy), cohesion = neighbors ? unit1024(truncDiv(sumX, neighbors) - px, truncDiv(sumY, neighbors) - py) : [0, 0];
    const gate = unit1024(gateX - px, gateY - py), wander = state.wander[s.id - 1];
    if (!wander || wander[0] === undefined || wander[1] === undefined || flee[0] === undefined || flee[1] === undefined || cohesion[0] === undefined || cohesion[1] === undefined) throw new Error('Invalid vector state');
    const a = h.active_weights, idle = h.idle_weights;
    const vx = pressured ? a.flee * flee[0] + a.cohesion * cohesion[0] + a.separation * separation[0] + a.gate * gate[0] : idle.cohesion * cohesion[0] + idle.separation * separation[0] + idle.wander * wander[0];
    const vy = pressured ? a.flee * flee[1] + a.cohesion * cohesion[1] + a.separation * separation[1] + a.gate * gate[1] : idle.cohesion * cohesion[1] + idle.separation * separation[1] + idle.wander * wander[1];
    const [ux, uy] = unit1024(vx, vy), speed = pressured ? h.sheep_flee_speed_u_per_tick : h.sheep_idle_speed_u_per_tick;
    let dx = truncDiv(ux * speed, scale), dy = truncDiv(uy * speed, scale);
    if (s.wall_guide_active && (!pressured || insideGate(px))) { s.wall_guide_active = false; s.fence_contact_ticks = 0; }
    const guiding = s.wall_guide_active, sidestepping = s.sidestep_remaining > 0 && !guiding;
    if (guiding) { dx = px < gateX ? h.wall_guide.speed_u_per_tick : -h.wall_guide.speed_u_per_tick; dy = 0; s.stuck_ticks = 0; s.sidestep_remaining = 0; }
    else if (sidestepping) { dx = s.sidestep_dx; dy = 0; s.sidestep_remaining--; if (s.sidestep_remaining === 0) s.stuck_ticks = 0; }
    const [nx, ny] = sweepMove(px, py, dx, dy, h.expanded_sheep_fence_aabbs_u, h.sheep_center_bounds_u);
    const fenceBottom = h.fence_y_u + h.sheep_radius_u;
    const blocked = pressured && dy < 0 && ny > py + dy && ny === fenceBottom && !insideGate(nx);
    if (!guiding) {
      s.fence_contact_ticks = blocked ? s.fence_contact_ticks + 1 : 0;
      if (s.fence_contact_ticks >= h.wall_guide.contact_ticks) { s.wall_guide_active = true; s.stuck_ticks = 0; s.sidestep_remaining = 0; }
    } else if (insideGate(nx)) { s.wall_guide_active = false; s.fence_contact_ticks = 0; }
    if (!guiding && !sidestepping && !s.wall_guide_active) {
      s.stuck_ticks = pressured && d2(px, py, nx, ny) <= h.stuck_displacement_threshold_u ** 2 ? s.stuck_ticks + 1 : 0;
      if (s.stuck_ticks >= h.stuck_ticks_to_sidestep) { s.sidestep_dx = sideDirection(s) * h.sidestep_speed_u_per_tick; s.sidestep_remaining = h.sidestep_duration_ticks; }
    }
    updates.push({ sheep: s, x: nx, y: ny });
  }
  for (const { sheep, x, y } of updates) { sheep.facing = facing(x - sheep.x, y - sheep.y, sheep.facing); sheep.x = x; sheep.y = y; }
  for (const { sheep, x, y } of updates) if (insideGate(x) && y <= h.in_pen_center_y_max_u) { sheep.in_pen = true; events.push(event(state, 'SHEEP_PENNED', sheep.id)); }
  const count = state.sheep.filter(s => s.in_pen).length, all = count === h.sheep_count;
  const bonus = all ? clamp(Math.floor((h.time_bonus.reference_tick - tick) / h.time_bonus.ticks_per_point), 0, h.time_bonus.cap) : 0;
  state.stats = { penned_count: count, final_goal_tick: all ? tick : null, time_bonus_points: bonus };
  if (all || tick === RULES.common.max_ticks) {
    state.conclusion = { game_id: 'herd', end_tick: tick, end_reason: all ? 'GOAL_REACHED' : 'TIME_LIMIT', accepted_actions_count: state.accepted_actions_count, stats: { ...state.stats }, performance_points: performancePoints(state) };
    events.push(event(state, 'GAME_ENDED'));
  }
}
