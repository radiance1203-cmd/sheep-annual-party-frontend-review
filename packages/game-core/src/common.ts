import type { GameId, GameInput, InputTick, NormalizeResult, Sha256, ValidatedRules } from './contracts/types.js';
import { RULES } from './rules.js';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') {
    if (/[\uD800-\uDFFF]/u.test(value)) throw new Error('Invalid Unicode surrogate');
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite JSON number');
    return JSON.stringify(value === 0 ? 0 : value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key => canonicalJson(key) + ':' + canonicalJson(Reflect.get(value, key))).join(',') + '}';
  }
  throw new Error('Only plain JSON values are accepted');
}

export async function sha256Utf8(value: string): Promise<Sha256> {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function freeze(value: unknown): void {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(RULES);

function assertFrozenRules(value: unknown): asserts value is ValidatedRules {
  if (canonicalJson(value) !== canonicalJson(RULES)) throw new Error('$: frozen rules mismatch');
}

export function validateRules(raw: unknown): { ok: true; rules: ValidatedRules } | { ok: false; errors: readonly string[] } {
  try {
    if (canonicalJson(raw) !== canonicalJson(RULES)) return { ok: false, errors: ['$: must match the complete frozen onsite-v2.1-candidate release'] };
    // Mint the opaque brand only after validating the entire frozen JSON.
    const validated: unknown = structuredClone(RULES);
    assertFrozenRules(validated);
    freeze(validated);
    return { ok: true, rules: validated };
  } catch (error) { return { ok: false, errors: ['$: ' + (error instanceof Error ? error.message : 'invalid rules')] }; }
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function normalizeInputs<G extends GameId>(game: G, raw: unknown, endTick: InputTick): NormalizeResult<G> {
  const fail = (code: 'EVENT_LIMIT' | 'UNKNOWN_FIELD' | 'UNKNOWN_TYPE' | 'OUT_OF_RANGE' | 'CONFLICTING_SEQ' | 'SEQ_ORDER' | 'TICK_ORDER' | 'PER_TICK_LIMIT' | 'INPUT_AFTER_END', index: number | null): NormalizeResult<G> => ({ ok: false, issues: [{ code, event_index: index, message: code }] });
  if (!Array.isArray(raw) || raw.length > RULES.common.max_input_events) return fail('EVENT_LIMIT', null);
  if (!Number.isSafeInteger(endTick) || endTick < 1 || endTick > RULES.common.max_ticks) return fail('OUT_OF_RANGE', null);
  const inputs: GameInput[] = [];
  const seen = new Map<number, string>();
  let lastSeq = 0, lastTick = 0;
  const perTick = new Set<string>();
  for (let index = 0; index < raw.length; index++) {
    const entry: unknown = raw[index];
    if (!object(entry)) return fail('OUT_OF_RANGE', index);
    if (Object.keys(entry).some(k => !['tick', 'seq', 'type', 'value'].includes(k))) return fail('UNKNOWN_FIELD', index);
    const { tick, seq, type } = entry;
    if (typeof tick !== 'number' || !Number.isSafeInteger(tick) || tick < 1 || tick > RULES.common.max_ticks || typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 1) return fail('OUT_OF_RANGE', index);
    if (tick > endTick) return fail('INPUT_AFTER_END', index);
    let input: GameInput;
    if (type === 'DOG_MOVE' && game === 'herd') {
      const v = entry.value;
      if (!object(v) || Object.keys(v).sort().join(',') !== 'x,y' || typeof v.x !== 'number' || typeof v.y !== 'number' || !Number.isSafeInteger(v.x) || !Number.isSafeInteger(v.y) || Math.abs(v.x) > 1000 || Math.abs(v.y) > 1000) return fail('OUT_OF_RANGE', index);
      input = { tick, seq, type, value: { x: v.x, y: v.y } };
    } else if ((game === 'stack' && type === 'DROP') || (game === 'runner' && type === 'JUMP') || (game === 'herd' && type === 'BARK')) {
      if (entry.value !== undefined && entry.value !== null) return fail('OUT_OF_RANGE', index);
      input = { tick, seq, type, value: null };
    } else return fail('UNKNOWN_TYPE', index);
    const bytes = canonicalJson(input);
    const previous = seen.get(seq);
    if (previous !== undefined) {
      if (previous !== bytes) return fail('CONFLICTING_SEQ', index);
      continue;
    }
    if (seq <= lastSeq) return fail('SEQ_ORDER', index);
    if (tick < lastTick) return fail('TICK_ORDER', index);
    const key = tick + ':' + type;
    if (perTick.has(key)) return fail('PER_TICK_LIMIT', index);
    perTick.add(key); seen.set(seq, bytes); lastSeq = seq; lastTick = tick; inputs.push(input);
  }
  // Game-specific discriminants were validated in the branches above.
  return { ok: true, inputs: inputs as GameInput<G>[], highest_input_tick: lastTick };
}

export function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }
export function truncDiv(a: number, b: number): number { return Math.trunc(a / b); }
export function isqrt(n: number): number {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('isqrt requires a nonnegative safe integer');
  let lo = 0, hi = Math.min(n, 94906265) + 1;
  while (lo + 1 < hi) { const mid = Math.floor((lo + hi) / 2); if (mid * mid <= n) lo = mid; else hi = mid; }
  return lo;
}
export function ceilSqrt(n: number): number { const d = isqrt(n); return d * d < n ? d + 1 : d; }
export function unit1024(x: number, y: number): [number, number] {
  const d = ceilSqrt(x * x + y * y);
  return d === 0 ? [0, 0] : [truncDiv(x * RULES.common.direction_scale, d), truncDiv(y * RULES.common.direction_scale, d)];
}
export function normalizeMove(x: number, y: number): [number, number] {
  const scale = RULES.herd.move_input_normalization_scale;
  const n = x * x + y * y;
  if (n <= scale * scale) return [x, y];
  const d = ceilSqrt(n); return [truncDiv(x * scale, d), truncDiv(y * scale, d)];
}
export interface Wall { readonly min_x: number; readonly max_x: number; readonly min_y: number; readonly max_y: number; }
function sweepAxis(pos: number, delta: number, other: number, walls: readonly Wall[], axis: 'x' | 'y'): number {
  let target = pos + delta;
  for (const wall of walls) {
    const lo = axis === 'x' ? wall.min_x : wall.min_y, hi = axis === 'x' ? wall.max_x : wall.max_y;
    const otherLo = axis === 'x' ? wall.min_y : wall.min_x, otherHi = axis === 'x' ? wall.max_y : wall.max_x;
    if (!(otherLo < other && other < otherHi)) continue;
    if (delta > 0 && pos <= lo && target > lo) target = Math.min(target, lo);
    if (delta < 0 && pos >= hi && target < hi) target = Math.max(target, hi);
  }
  return target;
}
export function sweepMove(x: number, y: number, dx: number, dy: number, walls: readonly Wall[], bounds: readonly number[]): [number, number] {
  const [minX, maxX, minY, maxY] = bounds;
  if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined) throw new Error('Invalid world bounds');
  const nx = clamp(sweepAxis(x, dx, y, walls, 'x'), minX, maxX);
  return [nx, clamp(sweepAxis(y, dy, nx, walls, 'y'), minY, maxY)];
}
export function facing(x: number, y: number, previous: number): number {
  if (x === 0 && y === 0) return previous;
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ay * 1024 <= ax * 424) return x > 0 ? 0 : 4;
  if (ax * 1024 <= ay * 424) return y > 0 ? 2 : 6;
  return x > 0 ? (y > 0 ? 1 : 7) : (y > 0 ? 3 : 5);
}
