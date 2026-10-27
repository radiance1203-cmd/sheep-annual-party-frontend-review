import { expect, it } from 'vitest';
import { BUILD } from '@sheep/game-core';
import { parsePlaytestJSON, parsePracticeJSON } from '../src/pages/playtest-json';

const observation = { batch_id: 'unit-batch', anon_id: 'unit-anon', skill_group: 'novice', game_order: 'stack-runner-herd', game_id: 'stack', run_kind: 'TEST', trial: 1, source_kind: 'AUTOMATED', device_id: 'unit-device', network_label: 'unit-only', build: BUILD, started_at: '2026-10-27T01:00:00.000Z', ended_at: '2026-10-27T01:00:46.000Z', entry_label: 'unit-practice', browser_label: 'unit-browser', seed: 1, interruption_reason: null, final_zero_reason: null, help_count: 0, tutorial_replays: 0, observed_points: null, invalid_reason: null, observations: 'unit observation, no human sample', process: null, reason: 'unit schema test' };
it('preserves actual raw times and unknown observed points instead of generating samples or scores', () => {
  const parsed = parsePlaytestJSON(JSON.stringify(observation));
  expect(parsed.started_at).toBe(observation.started_at);
  expect(parsed.observed_points).toBeNull();
  expect(parsed.anon_id).toBe('unit-anon');
  expect(parsed).not.toHaveProperty('verified_points');
  expect(() => parsePlaytestJSON(JSON.stringify({ ...observation, started_at: '' }))).toThrow();
  expect(() => parsePlaytestJSON(JSON.stringify({ ...observation, generated_score: 100 }))).toThrow();
});
it('imports complete practice metadata and input process but refuses scores and missing actual start time', () => {
  const download = { game_id: 'stack', build: BUILD, started_at: observation.started_at, ended_at: observation.ended_at, entry_label: observation.entry_label, browser_label: observation.browser_label, seed: 1, end_tick: 1350, end_reason: 'TIME_LIMIT', inputs: [] };
  expect(parsePracticeJSON(JSON.stringify(download))).toEqual(download);
  expect(() => parsePracticeJSON(JSON.stringify({ ...download, performance_points: 80 }))).toThrow();
  const { started_at: _started, ...missingStart } = download;
  expect(() => parsePracticeJSON(JSON.stringify(missingStart))).toThrow();
});
it('rejects invalid calendar timestamps and a seed from another frozen game', () => {
  expect(() => parsePlaytestJSON(JSON.stringify({ ...observation, started_at: '2026-02-30T01:00:00.000Z' }))).toThrow();
  expect(() => parsePlaytestJSON(JSON.stringify({ ...observation, game_id: 'herd', seed: 1 }))).toThrow();
});
it('enforces the tightened non-whitespace source fields and explicit final-zero reason', () => {
  for (const field of ['device_id', 'entry_label', 'browser_label', 'network_label']) expect(() => parsePlaytestJSON(JSON.stringify({ ...observation, [field]: '   ' }))).toThrow();
  expect(() => parsePlaytestJSON(JSON.stringify({ ...observation, observed_points: 0, final_zero_reason: 'TECHNICAL_FAILURE', invalid_reason: '   ' }))).toThrow();
});
