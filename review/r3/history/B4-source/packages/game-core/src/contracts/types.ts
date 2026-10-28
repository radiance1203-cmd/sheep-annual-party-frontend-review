/**
 * V2.2 contract baseline — types only; no playable simulator is implemented here.
 * Rule authority: onsite-v2.1-candidate, ../../config/game_rules.v2.1.json and 02/07.
 * Owner after adoption: controller, packages/game-core/src/contracts/.
 * Runtime validation is mandatory. TypeScript `number` does not enforce integers/ranges.
 */

export type GameId = 'stack' | 'runner' | 'herd';
export type RuleVersion = 'onsite-v2.1-candidate';
export type SlotNo = 1 | 2 | 3;
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonObject;
export interface JsonObject { readonly [key: string]: JsonValue; }

/** UTC ISO-8601 string, exact millisecond precision, ending in Z; not read by step(). */
export type UtcMillis = string;
/** Lowercase 64-character SHA-256; validation must check the pattern. */
export type Sha256 = string;
/** Safe integer 1..1350. */
export type InputTick = number;
/** Safe integer 0..1350: number of fully completed simulation steps. */
export type CompletedTick = number;
/** Whole-session safe positive integer; gaps allowed. */
export type InputSeq = number;
/** Integer in frozen world units; no CSS pixels/DPR or sprite bounds. */
export type Unit = number;

export interface Vec2U { readonly x_u: Unit; readonly y_u: Unit; }
export interface AabbU {
  readonly min_x_u: Unit; readonly min_y_u: Unit;
  readonly max_x_u: Unit; readonly max_y_u: Unit;
}

interface InputBase { readonly tick: InputTick; readonly seq: InputSeq; }
export interface DropInput extends InputBase { readonly type: 'DROP'; readonly value: null; }
export interface JumpInput extends InputBase { readonly type: 'JUMP'; readonly value: null; }
export interface BarkInput extends InputBase { readonly type: 'BARK'; readonly value: null; }
export interface DogMoveInput extends InputBase {
  readonly type: 'DOG_MOVE';
  /** Each integer -1000..1000. Missing a DOG_MOVE in a tick means zero for that tick. */
  readonly value: { readonly x: number; readonly y: number };
}
export interface InputByGame {
  readonly stack: DropInput;
  readonly runner: JumpInput;
  readonly herd: DogMoveInput | BarkInput;
}
export type GameInput<G extends GameId = GameId> = InputByGame[G];

/** Wire accepts missing discrete `value`; normalize to null before hashing/stepping. */
export type RawDiscreteInput = InputBase & {
  readonly type: 'DROP' | 'JUMP' | 'BARK'; readonly value?: null;
};
export type RawInput = RawDiscreteInput | DogMoveInput;

export interface BuildBinding {
  readonly rule_version: RuleVersion;
  readonly rules_hash: Sha256;
  readonly simulator_version: string;
  readonly client_version: string;
}

/** A validated immutable config; runtime parser owns the brand, not client casts. */
declare const validatedRules: unique symbol;
export type ValidatedRules = Readonly<JsonObject> & { readonly [validatedRules]: true };

export interface SimulationContext<G extends GameId> {
  readonly game_id: G;
  readonly rules: ValidatedRules;
  readonly rule_version: RuleVersion;
  readonly rules_hash: Sha256;
  readonly simulator_version: string;
  /** Formal seeds from config: stack=1, runner=1, herd=47. Not an anti-cheat secret. */
  readonly seed: number;
}

export interface EndReasonByGame {
  readonly stack: 'THREE_MISSES' | 'GOAL_REACHED' | 'TIME_LIMIT';
  readonly runner: 'TIME_LIMIT';
  readonly herd: 'GOAL_REACHED' | 'TIME_LIMIT';
}
export type EndReason<G extends GameId = GameId> = EndReasonByGame[G];

export interface StackStats {
  readonly success_layers: number; readonly perfect_layers: number; readonly misses: number;
}
export interface RunnerStats {
  readonly safe_passed: number; readonly collision_count: number;
  readonly outer_collected: number; readonly inner_collected: number;
}
export interface HerdStats {
  readonly penned_count: number;
  readonly final_goal_tick: InputTick | null;
  readonly time_bonus_points: number;
}
export interface StatsByGame {
  readonly stack: StackStats; readonly runner: RunnerStats; readonly herd: HerdStats;
}

export interface NaturalConclusion<G extends GameId> {
  readonly game_id: G;
  readonly end_tick: InputTick;
  readonly end_reason: EndReason<G>;
  readonly accepted_actions_count: number;
  readonly stats: StatsByGame[G];
  /** Pure game-core calculation, integer 0..80, including zero-action natural endings. */
  readonly performance_points: number;
}

export type AnyNaturalConclusion = {
  readonly [G in GameId]: NaturalConclusion<G>
}[GameId];

/**
 * Common immutable state boundary. The concrete model for each game extends this
 * in packages/game-core, with every RNG/phase/counter included in its checkpoint.
 * Phaser never mutates it. A running model has conclusion=null; terminal step is a no-op.
 */
export interface StateHeader<G extends GameId> {
  readonly game_id: G;
  readonly tick: CompletedTick;
  readonly accepted_actions_count: number;
  readonly conclusion: NaturalConclusion<G> | null;
}

/** Rendering contracts: units and semantic phases, no texture names or collision authority. */
export interface StackView extends StateHeader<'stack'> {
  readonly moving_tray: null | {
    readonly center: Vec2U; readonly width_u: Unit;
    readonly phase: 'SWING' | 'FALL' | 'SETTLE';
    readonly phase_ticks_remaining: number;
  };
  readonly placed_layers: readonly { readonly layer_no: number; readonly center: Vec2U; readonly perfect: boolean }[];
  readonly top_support: { readonly center: Vec2U; readonly width_u: Unit };
  readonly stats: StackStats;
}
export interface RunnerView extends StateHeader<'runner'> {
  readonly distance_u: Unit;
  readonly sheep_foot: Vec2U;
  readonly sheep_vy_u_per_tick: Unit;
  readonly on_ground: boolean;
  readonly obstacles: readonly {
    readonly obstacle_id: number; readonly bounds: AabbU;
    readonly collision_recorded: boolean; readonly passed: boolean;
  }[];
  readonly grass: readonly {
    readonly grass_id: number; readonly center: Vec2U;
    readonly outer_collected: boolean; readonly inner_collected: boolean;
  }[];
  readonly stats: RunnerStats;
}
export interface HerdView extends StateHeader<'herd'> {
  readonly dog: { readonly center: Vec2U; readonly facing_index: number };
  readonly sheep: readonly {
    readonly sheep_id: number; readonly center: Vec2U;
    readonly facing_index: number; readonly in_pen: boolean;
  }[];
  readonly bark_ticks_remaining: number;
  readonly bark_cooldown_ticks_remaining: number;
  readonly stats: HerdStats;
}
export interface ViewByGame { readonly stack: StackView; readonly runner: RunnerView; readonly herd: HerdView; }

export interface SimulationEvent {
  /** Stable within one replay for suppressing duplicate sounds on recovery; no scoring authority. */
  readonly event_key: string;
  readonly tick: InputTick;
  readonly type: 'DROP_ACCEPTED' | 'LAYER_LANDED' | 'LAYER_MISSED' | 'JUMP_ACCEPTED' |
    'OBSTACLE_COLLISION' | 'OBSTACLE_PASSED' | 'GRASS_OUTER' | 'GRASS_INNER' |
    'DOG_MOVED' | 'BARK_TRIGGERED' | 'SHEEP_PENNED' | 'GAME_ENDED';
  readonly entity_id: number | null;
}

export interface StepOutput<G extends GameId, S extends StateHeader<G>> {
  readonly state: S;
  readonly view: ViewByGame[G];
  readonly events: readonly SimulationEvent[];
  /** Count of actions newly accepted this tick; can differ from submitted event count. */
  readonly accepted_actions_delta: number;
}

export interface TickBatch<G extends GameId> {
  readonly tick: InputTick;
  /** Already normalized, deduplicated, correct type, seq order and per-tick count. */
  readonly inputs: readonly GameInput<G>[];
}

/** Full prefix remains mandatory; a checkpoint alone is never a valid server finish. */
export interface Checkpoint<G extends GameId> {
  readonly game_id: G; readonly completed_tick: CompletedTick;
  readonly rule_version: RuleVersion; readonly rules_hash: Sha256;
  readonly simulator_version: string;
  readonly input_prefix_hash: Sha256;
  readonly state_schema_version: string;
  readonly state: JsonObject;
}

export interface NormalizeIssue {
  readonly code: 'EVENT_LIMIT' | 'UNKNOWN_FIELD' | 'UNKNOWN_TYPE' | 'OUT_OF_RANGE' |
    'CONFLICTING_SEQ' | 'SEQ_ORDER' | 'TICK_ORDER' | 'PER_TICK_LIMIT' | 'INPUT_AFTER_END';
  readonly event_index: number | null;
  readonly message: string;
}
export type NormalizeResult<G extends GameId> =
  | { readonly ok: true; readonly inputs: readonly GameInput<G>[]; readonly highest_input_tick: CompletedTick }
  | { readonly ok: false; readonly issues: readonly NormalizeIssue[] };

export interface ReplayRequest<G extends GameId> {
  readonly context: SimulationContext<G>;
  readonly inputs: readonly GameInput<G>[];
  readonly declared_end_tick: InputTick;
  readonly declared_end_reason: EndReason<G>;
    /** Optional observation data from the same core events; never changes simulation or scoring. */
    readonly collect_diagnostics?: boolean;
}
  export interface ReplayDiagnostics {
    readonly sheep_entry_ticks: readonly { readonly sheep_id: number; readonly tick: InputTick }[];
  }
export type ReplayResult<G extends GameId> =
    | { readonly ok: true; readonly conclusion: NaturalConclusion<G>; readonly final_state_hash: Sha256; readonly diagnostics?: ReplayDiagnostics }
    | { readonly ok: false; readonly code: 'NO_NATURAL_END' | 'END_TICK_MISMATCH' | 'END_REASON_MISMATCH' | 'INPUT_AFTER_END'; readonly actual: NaturalConclusion<G> | null; readonly diagnostics?: ReplayDiagnostics };

/** Provided by one shared pure award helper, never by three independent UI formulas. */
export interface AwardPreview {
  readonly participation_eligible: boolean;
  readonly participation_points: number;
  readonly performance_points: number;
  readonly predicted_points: number;
  readonly final: false;
}

export type SessionState = 'SCHEDULED' | 'RUNNING' | 'AWAITING_SUBMISSION' |
  'VERIFYING' | 'SETTLED' | 'REVIEW' | 'ABANDONED' | 'TIMED_OUT' | 'VOIDED';

/** Backend DTO — authoritative only after an atomic replay/result/ledger commit. */
export interface VerifiedAward {
  readonly eligible: boolean;
  readonly reason: 'VERIFIED' | 'NO_ACCEPTED_ACTION' | 'INVALID_PROCESS';
  readonly participation_points: number;
  readonly performance_points: number;
  readonly awarded_points: number;
  readonly settled_at: UtcMillis;
}
