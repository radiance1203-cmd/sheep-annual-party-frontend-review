import { describe, expect, test } from 'vitest';
import { fixtures } from '../page-state-fixtures';
import { hasKnownSettlementReason, settlementReason, verifiedStatistics } from '../../src/repair-state/result-presentation';

describe('server result presentation', () => {
  test.each([
    ['VERIFIED', '核验通过'],
    ['NO_ACCEPTED_ACTION', '没有有效操作'],
    ['INVALID_PROCESS', '过程核验未通过'],
    ['VOIDED', '原尝试已作废'],
  ])('known reason %s has a participant explanation', (reason, expected) => {
    expect(settlementReason(reason)).toContain(expected);
    expect(hasKnownSettlementReason(reason)).toBe(true);
  });
  test('unknown reason stays neutral and is not accepted as a known result', () => {
    expect(settlementReason('FUTURE_REASON')).toContain('未知结算原因');
    expect(hasKnownSettlementReason('FUTURE_REASON')).toBe(false);
    expect(hasKnownSettlementReason(undefined)).toBe(false);
  });
  test('statistics use verified server counters without calculating points', () => {
    const f = fixtures({ sessionState: 'SETTLED' });
    const conclusion = f.session.settlement?.conclusion;
    if (!conclusion || conclusion.game_id !== 'stack') throw new Error('Missing stack fixture');
    conclusion.performance_points = 80;
    expect(verifiedStatistics(f.session)).toEqual(['叠稳 0 层', '完美 0 次', '失误 3 次']);
  });
  test('pending and mismatched game statistics are not displayed', () => {
    const f = fixtures({ sessionState: 'SETTLED' });
    expect(verifiedStatistics({ ...f.session, game_id: 'runner' })).toEqual([]);
    expect(verifiedStatistics({ ...f.session, state: 'VERIFYING' })).toEqual([]);
  });
  test('an invalid process never exposes an unverified conclusion', () => {
    const f = fixtures({ sessionState: 'SETTLED' });
    if (!f.session.settlement) throw new Error('Missing settlement fixture');
    f.session.settlement.validation = 'INVALID_PROCESS';
    expect(verifiedStatistics(f.session)).toEqual([]);
  });
});
