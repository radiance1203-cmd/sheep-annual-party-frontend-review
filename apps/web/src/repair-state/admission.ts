import { clock } from '../api';
import type { Schema } from '../api';

export type GameAdmission =
  | { kind: 'ordinary'; label: string }
  | { kind: 'makeup'; label: string; grant: Schema<'MakeupGrant'> }
  | { kind: 'recover'; label: string; session: Schema<'Session'> }
  | { kind: 'result'; label: string; session: Schema<'Session'> }
  | { kind: 'login'; label: string }
  | { kind: 'blocked'; label: string; reason: string };

export function gameAdmission(event: Schema<'EventPublic'> | undefined, me: Schema<'Me'> | Schema<'StaffMe'> | undefined, nowMs = clock.now(performance.now())): GameAdmission {
  const blocked = (reason: string): GameAdmission => ({ kind: 'blocked', label: reason, reason });
  if (!event) return blocked('正在读取活动状态');
  if (!me) return { kind: 'login', label: '绑定身份后正式挑战' };
  const session = me.active_session;
  if (session) return ['SCHEDULED', 'RUNNING', 'AWAITING_SUBMISSION'].includes(session.state)
    ? { kind: 'recover', label: '恢复原局', session }
    : { kind: 'result', label: '查看原局状态', session };
  if (!me.participant.roles.includes('PARTICIPANT')) return blocked('当前身份没有正式挑战资格');
  if (!me.participant.eligible) return blocked('当前资格已暂停，请联系工作人员');
  if (me.participant.claims_frozen) return blocked('积分资格待复核，请联系工作人员');
  if (event.rank_frozen_at) return blocked('荣誉榜已封榜');
  if (event.recovery_review_required) return blocked('正在恢复复核，暂停新挑战');
  if (!event.accepting_new_sessions) return blocked('新挑战入口已暂停');
  if (!event.release) return blocked('活动尚未绑定正式构建');
  const grant = me.tickets.find(ticket => ticket.state === 'RESERVED_FOR_MAKEUP' && ticket.makeup_grant?.status === 'ACTIVE' && ticket.binding_version === ticket.makeup_grant.ticket_binding_version && Date.parse(ticket.makeup_grant.admission_deadline) > nowMs)?.makeup_grant;
  if (grant && ['PLAYING', 'DRAINING'].includes(event.phase)) return { kind: 'makeup', label: '原机会补场 · 使用授权机会', grant };
  if (event.ordinary_start_allowed && me.tickets.some(ticket => ticket.state === 'AVAILABLE')) return { kind: 'ordinary', label: '正式挑战 · 使用 1 次机会' };
  if (event.phase === 'CHECK_IN') return blocked('等待正式挑战开放');
  if (!me.tickets.some(ticket => ticket.state === 'AVAILABLE')) return blocked('正式机会已用尽，仍可查看原局记录');
  return blocked('当前未开放新的正式挑战');
}
