import type { Schema } from '../api';

export function settlementReason(reason: unknown): string {
  switch (reason) {
    case 'VERIFIED': return '核验通过';
    case 'NO_ACCEPTED_ACTION': return '没有有效操作，本局 0 分';
    case 'INVALID_PROCESS': return '过程核验未通过，本局 0 分';
    case 'VOIDED': return '原尝试已作废，历史分数不再贡献荣誉';
    default: return '未知结算原因，请联系工作人员核对';
  }
}

export function hasKnownSettlementReason(reason: unknown): boolean {
  return reason === 'VERIFIED' || reason === 'NO_ACCEPTED_ACTION' || reason === 'INVALID_PROCESS' || reason === 'VOIDED';
}

export function verifiedStatistics(session: Schema<'Session'>): readonly string[] {
  const settled = session.settlement;
  const conclusion = settled?.conclusion;
  // These are the server's verified counters, including historical attempts.
  // They explain the record; they never calculate score or award eligibility.
  if (!['SETTLED', 'VOIDED'].includes(session.state) || settled?.validation !== 'VERIFIED' || !hasKnownSettlementReason(settled.eligibility_reason) || !conclusion || conclusion.game_id !== session.game_id) return [];
  switch (conclusion.game_id) {
    case 'stack': return [`叠稳 ${conclusion.stats.success_layers} 层`, `完美 ${conclusion.stats.perfect_layers} 次`, `失误 ${conclusion.stats.misses} 次`];
    case 'runner': return [`安全越栏 ${conclusion.stats.safe_passed} 次`, `外圈 ${conclusion.stats.outer_collected} 份`, `金芯 ${conclusion.stats.inner_collected} 份`];
    case 'herd': return [`入圈 ${conclusion.stats.penned_count} 只`, `时间奖励 ${conclusion.stats.time_bonus_points} 分`];
  }
}
