import type { components } from '@sheep/contracts';
import { RULES } from '@sheep/game-core';
type GameId = components['schemas']['GameId'];
type GameInput = components['schemas']['GameInput'];
export class ServerClock {
  private offset = 0;
  private bestRtt = Infinity;
  sample(server: number, sent: number, received: number): void {
    const rtt = received - sent;
    if (rtt <= this.bestRtt) { this.bestRtt = rtt; this.offset = server - (sent + received) / 2; }
  }
  now(monotonic: number): number { return monotonic + this.offset; }
  tick(start: number, monotonic: number, processed: number): number {
    return Math.max(processed, Math.min(RULES.common.max_ticks, Math.max(0, Math.floor((this.now(monotonic) - start) * RULES.common.tick_hz / 1000))));
  }
}
export class InputTimeline {
  private readonly game: GameId;
  private processed = 0;
  private seq = 0;
  private lastEventTick = 0;
  private current = { x: 0, y: 0 };
  private readonly directions = new Map<number, { x: number; y: number }>();
  private readonly actions = new Map<number, 'DROP' | 'JUMP' | 'BARK'>();
  constructor(game: GameId, lastSeq = 0) { this.game = game; this.seq = lastSeq; }
  private eventTick(candidate: number): number | null {
    if (!Number.isSafeInteger(candidate) || candidate <= this.processed || candidate > RULES.common.max_ticks) return null;
    // Clock estimates may move backwards. Input changes retain their observed
    // order; a later release replaces the old direction in the same future tick.
    this.lastEventTick = Math.max(this.lastEventTick, candidate);
    return this.lastEventTick;
  }
  direction(x: number, y: number, tick: number): void {
    const at = this.eventTick(tick); if (at === null) return;
    this.directions.set(at, { x: Math.round(Math.max(-1000, Math.min(1000, x))), y: Math.round(Math.max(-1000, Math.min(1000, y))) });
  }
  action(type: 'DROP' | 'JUMP' | 'BARK', tick: number): void {
    const at = this.eventTick(tick); if (at !== null) this.actions.set(at, type);
  }
  consume(tick: number): GameInput[] {
    const result: GameInput[] = [];
    for (const [at, value] of this.directions) if (at <= tick) { this.current = value; this.directions.delete(at); }
    if (this.game === 'herd' && (this.current.x !== 0 || this.current.y !== 0)) result.push({ tick, seq: ++this.seq, type: 'DOG_MOVE', value: { ...this.current } });
    const action = this.actions.get(tick);
    if (action) result.push({ tick, seq: ++this.seq, type: action, value: null });
    this.actions.delete(tick);
    this.processed = tick;
    return result;
  }
}
