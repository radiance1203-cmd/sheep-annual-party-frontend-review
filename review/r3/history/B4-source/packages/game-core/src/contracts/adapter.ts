/** V2.2 contract baseline: interfaces only. No simulator, rendering or wallet code. */
import type {
  AnyNaturalConclusion, AwardPreview, Checkpoint, CompletedTick, GameId,
  GameInput, InputTick, JsonObject, NaturalConclusion, NormalizeResult,
  ReplayRequest, ReplayResult, Sha256, SimulationContext, StateHeader,
  StepOutput, TickBatch, ValidatedRules, ViewByGame,
} from './types.js';

/**
 * Core owner implements one adapter per game. No DOM/Phaser/Node APIs, wall time,
 * network, persistence, floats in physics, or unseeded randomness in these methods.
 * All calls use one validated frozen context. Input objects and returned snapshots
 * must not be mutated by callers. Browser and worker import the same implementation.
 */
export interface GameAdapter<G extends GameId, S extends StateHeader<G>> {
  readonly game_id: G;
  readonly state_schema_version: string;
  /** Returns exact tick=0 state with accepted_actions_count=0, conclusion=null. */
  create(context: SimulationContext<G>): S;
  /**
   * Running state requires batch.tick === state.tick + 1, within 1..1350.
   * Ended state is unchanged; events empty. Protocol validation still rejects any
   * submitted events after the FIRST terminal tick, rather than silently ignoring them.
   * Herd missing DOG_MOVE is zero; movement precedes bark, then sheep snapshot/move.
   */
  step(context: SimulationContext<G>, state: S, batch: TickBatch<G>): StepOutput<G, S>;
  /** Read-only projection; interpolation/camera/effects in Phaser cannot feed back. */
  view(state: S): ViewByGame[G];
  conclusion(state: S): NaturalConclusion<G> | null;
  /** Snapshot includes every logical counter/RNG state, excludes cosmetics. */
  serialize(state: S): JsonObject;
  /** Validate schema, version, tick and integer ranges; reject incompatible snapshots. */
  deserialize(context: SimulationContext<G>, payload: unknown): S;
}

/** Shared functions implemented once in packages/game-core. */
export interface CoreServices {
  /** Schema + frozen-parameter validation; errors must name JSON paths. */
  validateRules(raw: unknown): { readonly ok: true; readonly rules: ValidatedRules } |
    { readonly ok: false; readonly errors: readonly string[] };
  /**
   * Original array cap 4096 checked BEFORE dedup. Do not sort away illegal order.
   * Scan in received order: identical seq/content repeats ignored, differing repeats
   * rejected; unique seq increases, tick never decreases; per-tick limits then checked.
   * Missing discrete value => null; unknown fields rejected; no client state accepted.
   */
  normalizeInputs<G extends GameId>(game_id: G, raw: unknown, end_tick: InputTick): NormalizeResult<G>;
  /** Zero-filled absent ticks; sequential pure steps. Promise only permits portable digest work after simulation; no wall-clock input. */
  replay<G extends GameId>(request: ReplayRequest<G>): Promise<ReplayResult<G>>;
  /**
   * Same pure reward helper for client preview and server after protocol verification.
   * Zero accepted actions => predicted total 0. A positive preview is never spendable.
   * Actual credit requires backend time/control/version/binding validation and ledger TX.
   */
  previewAward(conclusion: AnyNaturalConclusion, rules: ValidatedRules): AwardPreview;
  /** Stable JSON used by shared checkpoints; async digest does not enter step(). */
  canonicalJson(value: unknown): string;
  sha256Utf8(canonical: string): Promise<Sha256>;
}

/** Browser host owns timing, capture and durable history; never lives in the core. */
export interface LocalRunRecord<G extends GameId> {
  readonly session_id: string;
  readonly client_instance_id: string;
  readonly controller_secret: string;
  readonly controller_epoch: number;
  readonly ticket_binding_version: number;
  readonly start_idempotency_key: string;
  readonly build: {
    readonly client_version: string; readonly simulator_version: string;
    readonly rule_version: 'onsite-v2.1-candidate'; readonly rules_hash: Sha256;
  };
  readonly scheduled_time: {
    readonly created_at: string; readonly play_started_at: string;
    readonly play_ends_at: string; readonly submit_deadline: string;
  };
  readonly inputs: readonly GameInput<G>[];
  readonly last_seq: number;
  readonly completed_tick: CompletedTick;
  readonly checkpoint: Checkpoint<G> | null;
  /** Persist once at terminal; subsequent retries use exactly this body. */
  readonly sealed_finish_body_utf8: string | null;
}

/**
 * Integration rules (implementation requirements, not executable tests here):
 * - tick 0 is initial; end_tick is completed steps 1..1350, not an array index.
 * - Rendering RAF may interpolate only; integer step is fixed 30 Hz.
 * - Input queues preserve historical timestamped control changes; no late backdating.
 * - A foreground hold is sampled each tick; hidden/blur/cancel clears it.
 * - Restore needs the complete input prefix; checkpoint cannot replace that prefix.
 * - JS numbers for simulation must be safe integers; herd ceil/floor sqrt roles follow JSON.
 * - Runner always ends at 1350 TIME_LIMIT; collisions do not end the run.
 * - Test both browser and Node with the same JSON and portable golden input fixtures.
 */
