import Ajv2020 from 'ajv/dist/2020.js';
import { apiDocument } from '@sheep/contracts';
import type { components } from '@sheep/contracts';
import { BUILD } from '@sheep/game-core';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export type S<K extends keyof components['schemas']> = components['schemas'][K];
export const ids = { event: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', participant: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', session: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', gift: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', order: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', instance: 'ffffffff-ffff-4fff-8fff-ffffffffffff', review: '11111111-1111-4111-8111-111111111112', grant: '11111111-1111-4111-8111-111111111113' };
const manifestHash = createHash('sha256').update(readFileSync('apps/web/public/assets/asset-manifest.v1.json')).digest('hex');
export interface FixtureOptions {
  identity?: 'participant' | 'organizer' | 'redeemer' | 'anonymous';
  phase?: S<'Phase'>;
  frozen?: boolean;
  paused?: boolean;
  recovery?: boolean;
  eligible?: boolean;
  balance?: number;
  slots?: number;
  grant?: boolean;
  expired?: boolean;
  unconfigured?: boolean;
  active?: boolean;
  sessionState?: S<'SessionState'>;
  eligibilityReason?: S<'Settlement'>['eligibility_reason'];
  historical?: boolean;
  orderStatus?: S<'Redemption'>['status'];
  claimAction?: S<'ClaimView'>['claim_action'];
  orders?: boolean;
  empty?: boolean;
  soldOut?: boolean;
  staffTarget?: boolean;
  procurementUnknown?: boolean;
  overBudget?: boolean;
  retentionDue?: boolean;
  playtestStatus?: S<'PlaytestRun'>['verification_status'];
}
export function fixtures(options: FixtureOptions = {}) {
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();
  const grant: S<'MakeupGrant'> = { makeup_grant_id: ids.grant, participant_id: ids.participant, original_slot_no: 1, replaced_session_id: ids.session, ticket_binding_version: 2, admission_deadline: at(600000), status: 'ACTIVE', used_session_id: null, created_at: at(-10000), reason: '夹具：原槽系统故障授权' };
  const event: S<'EventPublic'> = { event_id: ids.event, name: options.unconfigured ? '' : '界面状态验收夹具', phase: options.phase ?? 'PLAYING', accepting_new_sessions: !options.paused, challenge_closes_at: options.unconfigured ? null : at(600000), claim_closes_at: options.unconfigured ? null : at(options.expired ? -60000 : 3600000), rank_frozen_at: options.frozen ? at(-10000) : null, rank_revision: options.frozen ? 2 : 1, event_revision: 5, release: options.unconfigured ? null : { build: BUILD, asset_manifest_hash: manifestHash, asset_base_url: '/assets/', rules_url: `/api/rules/${BUILD.rules_hash}`, published_at: at(-60000) }, practice_allowed: !options.paused && ['PLAYING', 'CHECK_IN'].includes(options.phase ?? 'PLAYING'), ordinary_start_allowed: !options.paused && (options.phase ?? 'PLAYING') === 'PLAYING', recovery_review_required: Boolean(options.recovery) };
  const participant: S<'ParticipantPublic'> = { participant_id: ids.participant, display_uid: 'VIEW-001', display_name: options.identity === 'organizer' ? '私有主办身份不可出现在大屏' : '状态夹具参与者', roles: [options.identity === 'organizer' ? 'ORGANIZER' : options.identity === 'redeemer' ? 'REDEEMER' : 'PARTICIPANT'], eligible: options.eligible ?? true, claims_frozen: options.frozen ?? false, honor_total: 60, wallet_balance: options.balance ?? 60 };
  const tickets: S<'Ticket'>[] = [1, 2, 3].map(slot_no => ({ slot_no, state: options.grant && slot_no === 1 ? 'RESERVED_FOR_MAKEUP' : slot_no > (options.slots ?? 3) ? 'SPENT' : 'AVAILABLE', binding_version: options.grant && slot_no === 1 ? 2 : 1, current_session_id: slot_no > (options.slots ?? 3) ? ids.session : null, current_contribution_points: 0, makeup_grant: options.grant && slot_no === 1 ? grant : null }));
  const conclusion: S<'StackConclusion'> = { game_id: 'stack', end_tick: 49, end_reason: 'THREE_MISSES', accepted_actions_count: options.eligibilityReason === 'NO_ACCEPTED_ACTION' ? 0 : 1, stats: { success_layers: 0, perfect_layers: 0, misses: 3 }, performance_points: 0 };
  const state = options.sessionState ?? 'SCHEDULED';
  const reason = options.eligibilityReason ?? 'VERIFIED';
  const settlement: S<'Settlement'> | null = ['SETTLED', 'VOIDED'].includes(state) ? { validation: reason === 'INVALID_PROCESS' ? 'INVALID_PROCESS' : 'VERIFIED', eligibility_reason: state === 'VOIDED' ? 'VOIDED' : reason, eligible_currently: state === 'SETTLED' && reason === 'VERIFIED', original_awarded_points: state === 'VOIDED' || reason === 'VERIFIED' ? 20 : 0, current_contribution_points: state === 'SETTLED' && reason === 'VERIFIED' ? 20 : 0, settled_at: at(-10000), conclusion: reason === 'INVALID_PROCESS' ? null : conclusion } : null;
  const session: S<'Session'> = { session_id: ids.session, event_id: ids.event, participant_id: ids.participant, slot_no: 1, game_id: 'stack', seed: 1, session_nonce: 'n'.repeat(43), build: BUILD, controller_epoch: 1, ticket_binding_version: 1, client_instance_id: ids.instance, created_at: at(state === 'SCHEDULED' ? 0 : -10000), play_started_at: at(state === 'SCHEDULED' ? 3000 : -7000), play_ends_at: at(38000), submit_deadline: at(53000), state, first_received_at: ['VERIFYING', 'SETTLED', 'REVIEW', 'VOIDED'].includes(state) ? at(-1000) : null, process_digest: ['VERIFYING', 'SETTLED', 'REVIEW', 'VOIDED'].includes(state) ? 'a'.repeat(64) : null, settlement, current_contribution_points: settlement?.current_contribution_points ?? 0, is_current_binding: !options.historical && state !== 'VOIDED', has_unsealed_receipt: false, can_attempt_control: true, terminal_reason: state === 'VOIDED' ? '系统故障作废原尝试' : null };
  const me: S<'Me'> | S<'StaffMe'> = { participant, tickets: options.identity === 'organizer' || options.identity === 'redeemer' ? [] : tickets, active_session: options.active ? session : null, csrf_token: 'x'.repeat(43), auth_expires_at: at(7200000) };
  const gift: S<'GiftAdmin'> = { gift_id: ids.gift, name: '夹具纪念礼品', description: '仅验证页面展示，不是真实库存', image_asset_key: null, price_points: 20, active: true, available_count: options.soldOut ? 0 : 9, total_count: 10, reserved_count: options.soldOut ? 10 : 1, claimed_count: 0, revision: 2, purchase_unit_cost_cents: options.procurementUnknown ? null : 100 };
  const order: S<'Redemption'> = { redemption_id: ids.order, event_id: ids.event, participant_id: ids.participant, gift_id: ids.gift, gift_name_snapshot: gift.name, price_points_snapshot: 20, status: options.orderStatus ?? 'RESERVED', created_at: at(-30000), claim_closes_at: at(options.expired ? -60000 : 3600000), claims_frozen: options.frozen ?? false, claimed_at: options.orderStatus === 'CLAIMED' ? at(-20000) : null, claimed_by_display_name: options.orderStatus === 'CLAIMED' ? '夹具核销员' : null, cancelled_at: options.orderStatus === 'CANCELLED' ? at(-20000) : null, cancellation_reason: options.orderStatus === 'CANCELLED' ? '夹具取消原价退分' : null, voucher_token: (options.orderStatus ?? 'RESERVED') === 'RESERVED' ? 'v'.repeat(43) : null };
  const leaderboard: S<'Leaderboard'> = { rank_revision: options.frozen ? 2 : 1, is_frozen: options.frozen ?? false, total_entries: options.empty ? 0 : 4, offset: 0, limit: 50, rows: options.empty ? [] : [1, 2, 2, 4].map((rank, i) => ({ rank, display_uid: `MASK-${i}`, display_name: `掩码同事${i}`, honor_total: i ? 40 : 60 })), me: options.empty ? null : { rank: 1, display_uid: participant.display_uid, display_name: participant.display_name, honor_total: 60 } };
  const blockers: S<'BlockerCounts'> = { scheduled: 1, running: 2, awaiting_submission: 3, ingress_pending: 4, verifying: 5, review: 6, unused_makeup_grants: 1, recovery_review: options.recovery ? 1 : 0, pending_compensation: 1 };
  const status: S<'AdminStatus'> = { event, blockers, reserved_orders: 1, claimed_orders: 1, expired_reserved_orders: 0, worker_pending: 5, worker_running: 2, worker_pool_size: 2, api_instance_count: 1 };
  const person: S<'ParticipantAdmin'> = { ...participant, ...(options.staffTarget ? { participant_id: '22222222-2222-4222-8222-222222222222', display_name: '被配置的目标同事', display_uid: 'TARGET-002', roles: ['PARTICIPANT' as const] } : {}), external_ref: 'FIXTURE-001', control_epoch: 2, open_review_count: 1, tickets };
  const review: S<'Review'> = { review_id: ids.review, session_id: ids.session, participant_id: ids.participant, kind: 'SYSTEM_FAULT', state: 'OPEN', reason: '夹具复核原因和证据', resolution: null, created_at: at(-10000), resolved_at: null };
  const claim: S<'ClaimView'> = { order: { ...order, voucher_token: null }, participant_display_name: participant.display_name, participant_display_uid: participant.display_uid, claim_action: options.claimAction ?? 'CAN_CLAIM' };
  const page = <T>(items: T[]) => ({ items, total: items.length, offset: 0, limit: 50 });
  const operations: S<'OperationsConfig'> = { event_id: ids.event, event_revision: 5, procurement: { priced_stock_cost_cents: '1000', extra_cost_cents: '200', known_total_cost_cents: '1200', reserved_stock_cost_cents: '100', claimed_stock_cost_cents: '0', budget_limit_cents: '2000', unpriced_gift_count: options.procurementUnknown ? 1 : 0, unpriced_stock_count: options.procurementUnknown ? 2 : 0, is_complete: !options.procurementUnknown, exceeds_budget: options.overBudget ? true : options.procurementUnknown ? null : false }, retention_policy: options.retentionDue ? { review_after_days: 30, review_due_at: at(-60000), responsible_person: '夹具责任人', scope: ['PLAYTESTS', 'AUDIT'], notes: '人工核对，不自动清理', automatic_deletion: false } : null, retention_review_due: Boolean(options.retentionDue) };
  const discrepancy: S<'OrderDiscrepancy'> = { redemption_id: ids.order, participant_id: ids.participant, original_price_points: 20, honor_total: 40, wallet_balance: -15, shortfall_points: 15, eligible: false, claims_frozen: true, open_review_ids: [ids.review], reversed_session_ids: [ids.session], notes: [] };
  const playtest: S<'PlaytestRun'> = { started_at: at(-60000), entry_label: 'isolated-fixture-practice', browser_label: 'isolated-browser-not-real-device', seed: 1, interruption_reason: null, final_zero_reason: options.playtestStatus === 'FINAL_ZERO' ? 'TECHNICAL_FAILURE' : null, game_position: 1, declared_end_tick: null, declared_end_reason: null, end_tick: null, end_reason: null, accepted_actions_count: null, performance_points: null, participation_points: null, score_source: options.playtestStatus === 'FINAL_ZERO' ? 'OPERATOR_FINAL_ZERO' : options.playtestStatus === 'VERIFIED' ? 'CORE_REPLAY' : null, sheep_entry_ticks: null, record_id: ids.review, batch_id: 'fixture-batch', anon_id: 'anon-001', skill_group: 'novice', game_order: 'stack-runner-herd', game_id: 'stack', run_kind: 'TEST', trial: 1, source_kind: 'AUTOMATED', device_id: 'fixture-browser-not-real-device', network_label: 'isolated', build: BUILD, ended_at: at(-10000), help_count: 0, tutorial_replays: 0, observed_points: options.playtestStatus === 'FINAL_ZERO' ? 0 : null, invalid_reason: options.playtestStatus === 'FINAL_ZERO' ? '夹具：已开始试次技术中断' : null, observations: '仅视图夹具，非真人记录', verification_status: options.playtestStatus ?? 'OBSERVATION_ONLY', verified_points: options.playtestStatus === 'VERIFIED' ? 20 : options.playtestStatus === 'INVALID' || options.playtestStatus === 'FINAL_ZERO' ? 0 : null, process_digest: options.playtestStatus && options.playtestStatus !== 'OBSERVATION_ONLY' ? 'c'.repeat(64) : null, stats: null, kernel_failure_reason: options.playtestStatus === 'REVIEW' ? '夹具：核验基础设施待复核' : null, created_at: at(-5000) };
  return { event, me, session, gift, order, leaderboard, status, person, review, claim, grant, page, operations, discrepancy, playtest };
}

export interface Reply { status: number; body: unknown; schema?: string; delay?: number; abort?: boolean; text?: string }
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
ajv.addSchema(apiDocument, 'contract');
const validators = new Map<string, ReturnType<typeof ajv.compile>>();
export function checkedReply(schema: keyof components['schemas'], body: unknown, status = 200): Reply {
  let validate = validators.get(schema);
  if (!validate) { validate = ajv.compile({ $ref: `contract#/components/schemas/${schema}` }); validators.set(schema, validate); }
  if (!validate(body)) throw new Error(`Invalid ${schema} view fixture: ${ajv.errorsText(validate.errors)}`);
  return { status, body, schema };
}
export function envelope(schema: keyof components['schemas'], data: unknown, status = 200): Reply {
  return checkedReply(schema, { data, server_now: new Date().toISOString(), request_id: 'isolated-view-state-fixture' }, status);
}
export function failure(code: S<'ErrorCode'> = 'SERVER_BUSY', status = 503, text = '夹具：连接暂不可用，请恢复原请求'): Reply {
  return checkedReply('ErrorEnvelope', { error: { code, message: text, retryable: status === 503 || status === 429 }, server_now: new Date().toISOString(), request_id: 'isolated-view-state-error' }, status);
}
export function defaultReply(path: string, f: ReturnType<typeof fixtures>, options: FixtureOptions): Reply {
  switch (path) {
    case '/api/event': return envelope('EventPublicResponse', f.event);
    case '/api/display': return envelope('DisplayResponse', { event: f.event, leaderboard: { ...f.leaderboard, me: null }, participant_count: 4 });
    case '/api/me': return options.identity === 'anonymous' ? failure('UNAUTHENTICATED', 401, '夹具：会话已过期，请重新绑定身份') : envelope('IdentityResponse', f.me);
    case '/api/leaderboard': return envelope('LeaderboardResponse', f.leaderboard);
    case '/api/gifts': return envelope('GiftListResponse', options.empty ? [] : [f.gift].map(gift => ({ gift_id: gift.gift_id, name: gift.name, description: gift.description, image_asset_key: gift.image_asset_key, price_points: gift.price_points, active: gift.active, available_count: gift.available_count })));
    case '/api/sessions': return envelope('PageSessionResponse', f.page(options.empty ? [] : [f.session]));
    case `/api/sessions/${ids.session}`: return envelope('SessionResponse', f.session);
    case '/api/redemptions': return envelope('PageOrderResponse', f.page(options.orders ? [f.order] : []));
    case `/api/redemptions/${ids.order}`: return envelope('RedemptionResponse', f.order);
    case '/api/admin/event/status': return envelope('AdminStatusResponse', f.status);
    case '/api/admin/participants': return envelope('PageParticipantResponse', f.page(options.empty ? [] : [f.person]));
    case '/api/admin/sessions': return envelope('PageSessionResponse', f.page(options.empty ? [] : [f.session]));
    case '/api/admin/reviews': return envelope('PageReviewResponse', f.page(options.empty ? [] : [f.review]));
    case '/api/admin/gifts': return envelope('GiftAdminListResponse', options.empty ? [] : [f.gift]);
    case '/api/admin/redemptions': return envelope('PageOrderResponse', f.page(options.empty ? [] : [{ ...f.order, voucher_token: null }]));
    case '/api/admin/event/operations': return envelope('OperationsConfigResponse', f.operations);
    case `/api/admin/redemptions/${ids.order}/discrepancy`: return envelope('OrderDiscrepancyResponse', f.discrepancy);
    case '/api/admin/playtests': return envelope('PagePlaytestResponse', f.page(options.empty ? [] : [f.playtest]));
    case `/api/admin/playtests/${ids.review}`: return envelope('PlaytestRunResponse', f.playtest);
    default: return failure('NOT_FOUND', 404, '夹具：资源不存在');
  }
}
