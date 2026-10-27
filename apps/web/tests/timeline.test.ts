import { describe, expect, it } from 'vitest';
import { InputTimeline, ServerClock } from '../src/game/timeline';

describe('server monotonic clock', () => {
  it('retains the lowest RTT mapping and never rewinds a processed tick', () => {
    const clock = new ServerClock();
    clock.sample(10000, 100, 120);
    expect(clock.now(220)).toBe(10110);
    clock.sample(10000, 130, 330);
    expect(clock.now(220)).toBe(10110);
    expect(clock.tick(10000, 220, 8)).toBe(8);
  });
});

describe('input timeline', () => {
  it('never backfills a new gesture into old catch-up ticks', () => {
    const queue = new InputTimeline('herd');
    queue.direction(1000, 0, 10);
    expect(queue.consume(1)).toEqual([]);
    expect(queue.consume(9)).toEqual([]);
    expect(queue.consume(10)[0]).toMatchObject({ tick: 10, type: 'DOG_MOVE', value: { x: 1000, y: 0 } });
  });
  it('clears a held direction at the cancellation tick and merges discrete edges', () => {
    const queue = new InputTimeline('herd');
    queue.direction(800, 0, 1);
    queue.direction(0, 0, 2);
    expect(queue.consume(1)).toHaveLength(1);
    expect(queue.consume(2)).toEqual([]);
    expect(queue.consume(3)).toEqual([]);
    queue.action('BARK', 4);
    queue.action('BARK', 4);
    expect(queue.consume(4)).toHaveLength(1);
  });
  it('discards gestures aimed at already processed ticks', () => {
    const queue = new InputTimeline('stack');
    queue.consume(5);
    queue.action('DROP', 4);
    expect(queue.consume(6)).toEqual([]);
  });
  it('does not revive an old future direction when a later clear maps to an earlier tick', () => {
    const queue = new InputTimeline('herd');
    queue.direction(1000, 0, 100);
    queue.direction(0, 0, 95);
    for (let tick = 1; tick <= 110; tick++) expect(queue.consume(tick)).toEqual([]);
  });
  it('keeps discrete event ordering monotonic when clock calibration moves backwards', () => {
    const queue = new InputTimeline('runner');
    queue.action('JUMP', 100);
    queue.action('JUMP', 95);
    expect(queue.consume(95)).toEqual([]);
    expect(queue.consume(100)).toEqual([{ tick: 100, seq: 1, type: 'JUMP', value: null }]);
  });
});
