import { expect, it } from 'vitest';
import { BUILD, createContext, createState, step } from '@sheep/game-core';
import { formatCents, practiceProcess } from '../src/pages/operations-model';

it('formats integer cents exactly beyond floating-point safe range and preserves unknown costs', () => {
  expect(formatCents('123456789012345678901234567890')).toBe('1,234,567,890,123,456,789,012,345,678.90 元');
  expect(formatCents('1')).toBe('0.01 元');
  expect(formatCents(0)).toBe('0.00 元');
  expect(formatCents(null)).toBe('成本未知');
});
it('exports only a natural practice conclusion and its exact inputs, without any score field', () => {
  expect(() => practiceProcess(null, [])).toThrow('自然终局');
  const context = createContext('runner'); let state = createState(context);
  const inputs = [{ tick: 1, seq: 1, type: 'JUMP' as const, value: null }];
  for (let tick = 1; tick <= 1350; tick++) state = step(context, state, { tick, inputs: tick === 1 ? inputs : [] }).state;
  const metadata = { started_at: '2026-10-27T02:00:00.000Z', ended_at: '2026-10-27T02:00:46.000Z', seed: 1, entry_label: 'unit-practice', browser_label: 'unit-browser' };
  const output = practiceProcess(state.conclusion, inputs, metadata);
  expect(output).toEqual({ game_id: 'runner', build: BUILD, end_tick: 1350, end_reason: 'TIME_LIMIT', inputs, ...metadata });
  inputs[0]!.seq = 99;
  expect(output.inputs[0]?.seq).toBe(1);
  expect(output).not.toHaveProperty('performance_points');
  expect(output).not.toHaveProperty('predicted_points');
});
