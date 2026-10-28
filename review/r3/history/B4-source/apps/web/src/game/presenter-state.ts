import type { GameView, SimulationEvent } from '@sheep/game-core';

export type PresentationMode = 'ready' | 'running' | 'paused' | 'ended' | 'recovering';
/** Read-only display time. Never fed into core, inputs or submission. Phaser owns its only update loop. */
export class PresentationClock {
  mode: PresentationMode = 'ready';
  fixed: number | null = null;
  elapsed = 0;
  private previous: number | null = null;
  advance(now: number): number {
    const delta = this.previous === null ? 0 : Math.max(0, now - this.previous);
    this.previous = now;
    if (this.fixed !== null) return this.fixed;
    if (this.mode !== 'paused' && this.mode !== 'recovering') this.elapsed += delta;
    return this.elapsed;
  }
  reset(): void { this.elapsed = 0; this.previous = null; this.fixed = null; this.mode = 'ready'; }
}
export interface DisplayEvent {
  readonly id: string; readonly eventIndex: number; readonly event: SimulationEvent;
  readonly snapshot: GameView; readonly timeMs: number;
  decorationOmitted?: 'queue-capacity' | 'expired' | 'pool-capacity' | 'no-decoration';
}
/** Keeps original ordering/indices. Rolling bounded diagnostics; counters always come from view. */
export class EventJournal {
  history: DisplayEvent[] = [];
  omitted = 0;
  private queue: DisplayEvent[] = [];
  private seen = new Set<string>();
  private highestTick = -1;
  private session = 'preview';
  private epoch = 0;
  private capacity: number;
  constructor(capacity = 512) { this.capacity = capacity; }
  begin(session: string, epoch: number): void {
    this.session = session; this.epoch = epoch; this.queue = []; this.history = []; this.seen.clear(); this.highestTick = -1; this.omitted = 0;
  }
  push(snapshot: GameView, events: readonly SimulationEvent[], timeMs: number): DisplayEvent[] {
    const added: DisplayEvent[] = [];
    events.forEach((event, eventIndex) => {
      // A session is monotone. Evicting diagnostics must not make old deliveries replayable.
      if (event.tick < this.highestTick) return;
      if (event.tick > this.highestTick) { this.highestTick = event.tick; this.seen.clear(); }
      const id = `${this.session}:${this.epoch}:${event.tick}:${eventIndex}`;
      if (this.seen.has(id)) return;
      const envelope: DisplayEvent = { id, eventIndex, event: { ...event }, snapshot, timeMs };
      this.seen.add(id); this.history.push(envelope); this.queue.push(envelope); added.push(envelope);
    });
    while (this.queue.length > this.capacity) { const item = this.queue.shift(); if (item) item.decorationOmitted = 'queue-capacity'; this.omitted++; }
    while (this.history.length > this.capacity) this.history.shift();
    return added;
  }
  drain(): DisplayEvent[] { const queue = this.queue; this.queue = []; return queue; }
}
export function advanceStride(phase: number, before: { x: number; y: number }, after: { x: number; y: number }): number {
  return phase + Math.hypot(after.x - before.x, after.y - before.y);
}
export function bufferLayout(availableWidth: number, availableHeight: number, worldWidth: number, worldHeight: number, requestedDpr: number) {
  const cssScale = Math.max(.001, Math.min(availableWidth / worldWidth, availableHeight / worldHeight));
  // First R2 budget sample caps DPR at 2. DPR3 requests are explicitly reported as adopted 2.
  const effectiveDpr = Math.max(1, Math.min(2, requestedDpr || 1));
  const cssWidth = worldWidth * cssScale, cssHeight = worldHeight * cssScale;
  const bufferWidth = Math.max(1, Math.round(cssWidth * effectiveDpr));
  const bufferHeight = Math.max(1, Math.round(cssHeight * effectiveDpr));
  const zoom = Math.min(bufferWidth / worldWidth, bufferHeight / worldHeight);
  return { cssWidth, cssHeight, bufferWidth, bufferHeight, effectiveDpr, requestedDpr, zoom, offsetX: (bufferWidth - worldWidth * zoom) / 2, offsetY: (bufferHeight - worldHeight * zoom) / 2 };
}
type Layout = ReturnType<typeof bufferLayout>;
type Rect = { left: number; top: number; width: number; height: number };
export function clientToWorld(point: { x: number; y: number }, rect: Rect, layout: Layout) {
  return { x: ((point.x - rect.left) * layout.bufferWidth / rect.width - layout.offsetX) / layout.zoom, y: ((point.y - rect.top) * layout.bufferHeight / rect.height - layout.offsetY) / layout.zoom };
}
export function worldToClient(point: { x: number; y: number }, rect: Rect, layout: Layout) {
  return { x: rect.left + (point.x * layout.zoom + layout.offsetX) * rect.width / layout.bufferWidth, y: rect.top + (point.y * layout.zoom + layout.offsetY) * rect.height / layout.bufferHeight };
}
