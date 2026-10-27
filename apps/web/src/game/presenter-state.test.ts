import { describe, expect, it } from 'vitest';
import { createContext, createState, view } from '@sheep/game-core';
import { EventJournal, PresentationClock, bufferLayout, clientToWorld, worldToClient, advanceStride } from './presenter-state';

describe('R2 presentation boundaries', () => {
  it('keeps every original event index, including same-tick same-entity duplicates, once', () => {
    const journal = new EventJournal(); journal.begin('session', 2);
    const snapshot = view(createState(createContext('herd')));
    const events = [0, 1].map(() => ({ event_key: 'same', tick: 1, type: 'SHEEP_PENNED' as const, entity_id: 1 }));
    expect(journal.push(snapshot, events, 0).map(x => x.id)).toEqual(['session:2:1:0', 'session:2:1:1']);
    expect(journal.push(snapshot, events, 1)).toEqual([]);
    expect(journal.drain()).toHaveLength(2);
    expect(journal.drain()).toHaveLength(0);
    journal.begin('session', 3);
    expect(journal.history).toHaveLength(0);
    expect(journal.push(snapshot, events, 2)).toHaveLength(2);
  });
  it('retains intermediate confirmed views for catch-up and bounds history/queue', () => {
    const journal = new EventJournal(3); journal.begin('s', 0);
    for (let i = 1; i <= 5; i++) journal.push({ ...view(createState(createContext('runner'))), tick: i }, [{ event_key: `e${i}`, tick: i, type: 'GRASS_OUTER', entity_id: i }], i * 10);
    expect(journal.history.map(e => e.snapshot.tick)).toEqual([3, 4, 5]);
    expect(journal.drain().map(e => e.event.tick)).toEqual([3, 4, 5]);
    expect(journal.omitted).toBe(2);
    expect(journal.push(view(createState(createContext('runner'))), [{ event_key: 'old', tick: 1, type: 'GRASS_OUTER', entity_id: 1 }], 99)).toEqual([]);
  });
  it('advances after terminal core state, freezes on pause and restarts cleanly', () => {
    const clock = new PresentationClock();
    clock.advance(0); expect(clock.advance(500)).toBe(500);
    clock.mode = 'ended'; expect(clock.advance(1000)).toBe(1000);
    clock.mode = 'paused'; expect(clock.advance(2000)).toBe(1000);
    clock.mode = 'running'; expect(clock.advance(2250)).toBe(1250);
    clock.reset(); expect(clock.advance(6000)).toBe(0);
    expect(clock.advance(6100)).toBe(100);
    clock.fixed = 72; expect(clock.advance(7000)).toBe(72);
  });
  for (const [w, h] of [[304, 405.33], [374, 457.11], [414, 483]] as const) for (const dpr of [1, 2, 3]) {
    it(`fits buffer ${w}/${h} DPR${dpr} and roundtrips corners/center/edge after resize`, () => {
      const layout = bufferLayout(w, h, 360, 420, dpr);
      expect(layout.effectiveDpr).toBe(Math.min(2, dpr));
      expect(Math.abs(layout.bufferWidth - layout.cssWidth * layout.effectiveDpr)).toBeLessThanOrEqual(.5);
      const rect = { left: 7, top: 12, width: layout.cssWidth, height: layout.cssHeight };
      for (const p of [{ x: 0, y: 0 }, { x: 360, y: 0 }, { x: 0, y: 420 }, { x: 360, y: 420 }, { x: 180, y: 210 }, { x: 1, y: 419 }]) {
        const c = worldToClient(p, rect, layout);
        const q = clientToWorld(c, rect, layout);
        expect(q.x).toBeCloseTo(p.x, 8); expect(q.y).toBeCloseTo(p.y, 8);
      }
    });
  }
  it('walk stride follows displacement independently of facing and bark', () => {
    const p = advanceStride(0, { x: 10, y: 10 }, { x: 13, y: 14 });
    expect(p).toBe(5);
    expect(advanceStride(p, { x: 13, y: 14 }, { x: 13, y: 14 })).toBe(5);
    expect(advanceStride(p, { x: 13, y: 14 }, { x: 10, y: 10 })).toBe(10);
  });
});
