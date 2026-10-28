import { useState } from 'react';
import { BUILD } from '@sheep/game-core';
import { api, formatTime, gameNames, key, secret, unwrap } from '../api';
import type { Schema } from '../api';
import { Field, JsonDetails, MutationStatus, Notice, Panel, formString, useMutation, useResource } from '../ui';
import { durable } from './admin-requests';
import { formatCents } from './operations-model';
import { parsePlaytestJSON, parsePracticeJSON } from './playtest-json';

export function StaffRoleEditor({ person, event, actorId, onUpdated }: { person: Schema<'ParticipantAdmin'>; event: Schema<'EventPublic'> | undefined; actorId: string; onUpdated: () => void }) {
  const mutation = useMutation();
  const [result, setResult] = useState<{ name: string; uid: string; token: string | null; revoked: number }>();
  const self = actorId === person.participant_id;
  const canGrant = event?.phase === 'CHECK_IN';
  return <details className="role-editor"><summary>工作人员角色配置</summary>
    <p>原身份：{person.roles.length ? person.roles.join(' / ') : '无有效登录角色'}。{person.roles.includes('PARTICIPANT') ? '参与者资格与原三槽保留。' : '纯工作人员不会新增参与资格或三槽。'}</p>
    {self && <Notice>不能修改本人工作人员授权，请由另一位主办方操作。</Notice>}
    {!canGrant && <Notice>当前仅可撤销已有工作人员授权，新增授权只在签到阶段开放。</Notice>}
    <form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void mutation.run(async () => {
      setResult(undefined);
      const staff_roles = (['ORGANIZER', 'REDEEMER'] as const).filter(role => data.getAll('staff_roles').includes(role));
      const body: Schema<'StaffRolesRequest'> = { idempotency_key: key(), expected_control_epoch: person.control_epoch, staff_roles, replacement_invite_token: secret(), reason: formString(data, 'role_reason') };
      await durable(`staff-roles:${person.participant_id}`, body, async original => {
        const response = unwrap(await api.PATCH('/api/admin/participants/{id}/staff-roles', { params: { path: { id: person.participant_id } }, body: original })).data;
        setResult({ name: response.participant.display_name, uid: response.participant.display_uid, token: response.replacement_invite_issued ? original.replacement_invite_token : null, revoked: response.revoked_auth_session_count });
      }); onUpdated();
    }); }}>
      <fieldset disabled={self || mutation.pending}>
        <legend>仅配置工作人员授权</legend>
        {(['ORGANIZER', 'REDEEMER'] as const).map(role => <label key={role} className="checkbox"><input type="checkbox" name="staff_roles" value={role} defaultChecked={person.roles.includes(role)} disabled={!canGrant && !person.roles.includes(role)} />{role === 'ORGANIZER' ? '主办方授权' : '核销员授权'}</label>)}
        <Field label="角色变更原因" name="role_reason" />
        <p>变更会撤销目标旧邀请码、认证与正式局控制权，不返还或增加正式机会。</p>
        <button disabled={self || mutation.pending}>确认变更此人工作人员授权</button>
      </fieldset>
    </form><MutationStatus state={mutation} />
    {result && <Notice>已确认变更对象：{result.name}（{result.uid}）；撤销旧认证 {result.revoked} 个。{result.token ? <><br />仅私密交付给该对象的替换邀请码：<code>{result.token}</code></> : <><br />未签发替换码，纯工作人员无角色时停止登录。</>}</Notice>}
  </details>;
}

function ProcurementSummary({ value }: { value: Schema<'ProcurementSummary'> }) {
  return <><div className="metric-grid">
    <div><small>已知总采购估算</small><b className="money">{formatCents(value.known_total_cost_cents)}</b></div>
    <div><small>物流与包装</small><b className="money">{formatCents(value.extra_cost_cents)}</b></div>
    <div><small>预算上限</small><b className="money">{value.budget_limit_cents === null ? '未设置' : formatCents(value.budget_limit_cents)}</b></div>
  </div><p>库存已知成本 {formatCents(value.priced_stock_cost_cents)} · 预留部分 {formatCents(value.reserved_stock_cost_cents)} · 已领部分 {formatCents(value.claimed_stock_cost_cents)}</p>
    <Notice error={value.exceeds_budget === true}>{value.exceeds_budget === true ? '已知采购估算已超过预算上限。' : value.exceeds_budget === null ? '是否超出预算：暂不能判断。' : '服务端核对：当前已知估算未超过预算上限。'}{!value.is_complete && <> 成本尚不完整：{value.unpriced_gift_count} 种礼品、{value.unpriced_stock_count} 件库存成本未知，不能当免费。</>}</Notice>
    <p className="small">这是服务端按全部库存与当前采购价计算的估算，不代表已采购或已付款；积分账本与人民币预算分别记录。</p>
  </>;
}
export function OperationsSettings({ section = 'all', refresh, onRevision }: { section?: 'all' | 'procurement'; refresh: () => void; onRevision?: (revision: number) => void }) {
  const resource = useResource(async () => unwrap(await api.GET('/api/admin/event/operations')).data, `operations:${section}`, 5);
  const mutation = useMutation(); const current = resource.data;
  return <><Panel title="采购预算与估算">
    {!current && !resource.error && <Notice>正在读取采购与保留配置……</Notice>}{resource.error && <Notice error>{resource.error}</Notice>}
    {current && <><ProcurementSummary value={current.procurement} />
      <form key={`budget:${current.event_revision}`} onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void mutation.run(async () => {
        const body: Schema<'OperationsConfigRequest'> = { idempotency_key: key(), expected_event_revision: current.event_revision, procurement_budget_cents: formString(data, 'budget') || null, procurement_extra_cost_cents: formString(data, 'extra'), reason: formString(data, 'budget_reason') };
        await durable('procurement-config', body, async original => { const confirmed = unwrap(await api.PATCH('/api/admin/event/operations', { body: original })).data; onRevision?.(confirmed.event_revision); }); resource.refresh(); refresh();
      }); }}>
        <label>采购预算上限（整数分，留空为未设置）<input name="budget" inputMode="numeric" pattern="(0|[1-9][0-9]{0,29})" maxLength={30} defaultValue={current.procurement.budget_limit_cents ?? ''} /></label>
        <label>物流包装费用（整数分）<input name="extra" required inputMode="numeric" pattern="(0|[1-9][0-9]{0,29})" maxLength={30} defaultValue={current.procurement.extra_cost_cents} /></label>
        <Field label="预算变更原因" name="budget_reason" /><button disabled={mutation.pending}>保存采购预算配置</button>
      </form></>}
    <MutationStatus state={mutation} />
  </Panel>{section === 'all' && current && <RetentionEditor key={`retention:${current.event_revision}`} current={current} onUpdated={revision => { onRevision?.(revision); resource.refresh(); refresh(); }} />}</>;
}
function RetentionEditor({ current, onUpdated }: { current: Schema<'OperationsConfig'>; onUpdated: (revision: number) => void }) {
  const mutation = useMutation(); const policy = current.retention_policy;
  const [enabled, setEnabled] = useState(policy !== null);
  return <Panel title="人工保留复核策略"><Notice>这里只保存人工复核期限、责任人和范围，不会自动删除任何身份、日志、订单、账本、审计或试玩数据；保存不表示已清理。</Notice>
    {current.retention_review_due && <Notice error>人工复核已到期，请责任人检查并追加实际处置记录。</Notice>}
    {policy ? <p>当前责任人 {policy.responsible_person} · {policy.review_after_days} 天后复核 · 到期 {formatTime(policy.review_due_at)} · 范围 {policy.scope.join(' / ')}</p> : <p>当前未配置人工保留策略。</p>}
    <form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void mutation.run(async () => {
      const scope = (['IDENTITY', 'GAME_LOGS', 'ORDERS_LEDGER', 'AUDIT', 'PLAYTESTS'] as const).filter(value => data.getAll('scope').includes(value));
      const retention_policy: Schema<'RetentionPolicy'> | null = enabled ? { review_after_days: Number(data.get('days')), review_due_at: new Date(formString(data, 'due')).toISOString(), responsible_person: formString(data, 'responsible'), scope, notes: formString(data, 'notes'), automatic_deletion: false } : null;
      const body: Schema<'OperationsConfigRequest'> = { idempotency_key: key(), expected_event_revision: current.event_revision, retention_policy, reason: formString(data, 'retention_reason') };
      await durable('retention-config', body, async original => { const confirmed = unwrap(await api.PATCH('/api/admin/event/operations', { body: original })).data; onUpdated(confirmed.event_revision); });
    }); }}>
      <label className="checkbox"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />启用人工保留复核提醒</label>
      <fieldset disabled={!enabled || mutation.pending}><legend>人工提醒配置</legend>
        <Field label="复核间隔天数" name="days" type="number" value={policy?.review_after_days ?? ''} />
        <Field label="人工复核到期（当地时间）" name="due" type="datetime-local" value={policy ? new Date(Date.parse(policy.review_due_at) - new Date(policy.review_due_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} />
        <Field label="人工复核责任人" name="responsible" value={policy?.responsible_person ?? ''} />
        {(['IDENTITY', 'GAME_LOGS', 'ORDERS_LEDGER', 'AUDIT', 'PLAYTESTS'] as const).map(value => <label key={value} className="checkbox"><input type="checkbox" name="scope" value={value} defaultChecked={policy?.scope.includes(value)} />{({ IDENTITY: '身份', GAME_LOGS: '游戏日志', ORDERS_LEDGER: '订单与账本', AUDIT: '审计', PLAYTESTS: '匿名试玩' })[value]}</label>)}
        <label>人工策略说明<textarea name="notes" defaultValue={policy?.notes ?? ''} /></label>
      </fieldset><Field label="保留策略变更原因" name="retention_reason" /><button disabled={mutation.pending}>保存人工保留策略（不清理数据）</button>
    </form><MutationStatus state={mutation} /></Panel>;
}

export function DiscrepancyDetails({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={e => setOpen(e.currentTarget.open)}><summary>查看已领取异常差额</summary>{open && <DiscrepancyPanel id={id} />}</details>;
}
function DiscrepancyPanel({ id }: { id: string }) {
  const resource = useResource(async () => unwrap(await api.GET('/api/admin/redemptions/{id}/discrepancy', { params: { path: { id } } })).data, `discrepancy:${id}`, 5);
  const mutation = useMutation(); const current = resource.data;
  return <div className="discrepancy">{!current && !resource.error && <Notice>正在读取已领取原单差额……</Notice>}{resource.error && <Notice error>{resource.error}</Notice>}{current && <>
    <h3>当前积分短缺 {current.shortfall_points} 分</h3><p>原成交 {current.original_price_points} 积分 · 真实钱包 {current.wallet_balance} · 荣誉 {current.honor_total}</p>
    <Notice>差额是积分短缺，不是人民币债务。只读记录不自动补款、扣分、退款、回库或解除冻结；已记录处置也不代表已追回。</Notice>
    <p>{current.eligible ? '当前有参与资格' : '当前资格暂停'} · {current.claims_frozen ? '领取资格冻结' : '领取资格未冻结'}</p>
    <p>待复核编号：{current.open_review_ids.join('、') || '无'}<br />反向局号：{current.reversed_session_ids.join('、') || '无'}</p>
    {current.notes.length === 0 && <p>尚无人工处置说明。</p>}{current.notes.map(note => <article className="record" key={note.note_id}><b>{note.state === 'ACKNOWLEDGED' ? '已记录处置' : '待处理'}</b><p>{note.note}</p><small>{note.created_by_display_name} · {formatTime(note.created_at)}</small></article>)}
    <form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void mutation.run(async () => {
      const body: Schema<'DiscrepancyNoteRequest'> = { idempotency_key: key(), state: data.get('state') === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'OPEN', note: formString(data, 'note'), reason: formString(data, 'note_reason') };
      await durable(`discrepancy-note:${id}`, body, async original => unwrap(await api.POST('/api/admin/redemptions/{id}/exception-notes', { params: { path: { id } }, body: original }))); resource.refresh();
    }); }}><label>处置记录状态<select name="state"><option value="OPEN">待处理</option><option value="ACKNOWLEDGED">已记录处置（不表示补款）</option></select></label><label>实际人工处置说明<textarea name="note" required /></label><Field label="处置记录原因" name="note_reason" /><button disabled={mutation.pending}>仅追加人工处置记录</button></form>
  </>}<MutationStatus state={mutation} /></div>;
}

const emptyPlaytest = { started_at: '', entry_label: '', browser_label: '', seed: null, interruption_reason: null, final_zero_reason: null, batch_id: '', anon_id: '', skill_group: '', game_order: '', game_id: '', run_kind: '', trial: 1, source_kind: '', device_id: '', network_label: '', build: BUILD, ended_at: '', help_count: 0, tutorial_replays: 0, observed_points: null, invalid_reason: null, observations: '', process: null, reason: '' };
export function Playtests() {
  const [batch, setBatch] = useState(''); const [offset, setOffset] = useState(0);
  const [raw, setRaw] = useState(() => JSON.stringify(emptyPlaytest, null, 2));
  const [localError, setLocalError] = useState(''); const [recordId, setRecordId] = useState('');
  const mutation = useMutation();
  const resource = useResource(async () => unwrap(await api.GET('/api/admin/playtests', { params: { query: { offset, limit: 50, ...(batch ? { batch_id: batch } : {}) } } })).data, `playtests:${batch}:${offset}`, 5);
  return <><Panel title="匿名试玩原始记录"><Notice>仅在隔离开发活动记录实际观察。不要填写真人姓名或邀请码；没有实际参与者时不创建记录，不自动上传练习。AUTOMATED 必须保留自动标签，不能计作真人样本。</Notice>
    <p>已开始试次的放弃、超时或技术失败可明确填写实际 final_zero_reason、观察 0 分及非空失败原因，作为工作人员零分结案，不能冒充规则核自然核验。</p><p>JSON 必须填写实际开始/结束时间（不得倒推）、入口、浏览器、固定 seed、批次、匿名码、熟练度、游戏顺序、练习/测试试次、来源、设备网络、结束时间、帮助、观察与构建等真实信息。没有完整过程时仅记观察，不会产生核验分。</p>
    <label>导入本地练习终局过程（可选）<input type="file" accept="application/json,.json" onChange={e => { const file = e.target.files?.[0]; if (!file) return; void file.text().then(value => { const parsed = parsePracticeJSON(value); const draft: unknown = JSON.parse(raw); if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new Error('先填写合法 JSON 对象。'); setRaw(JSON.stringify({ ...draft, game_id: parsed.game_id, build: parsed.build, started_at: parsed.started_at, ended_at: parsed.ended_at, seed: parsed.seed, entry_label: parsed.entry_label, browser_label: parsed.browser_label, final_zero_reason: null, process: { end_tick: parsed.end_tick, end_reason: parsed.end_reason, inputs: parsed.inputs } }, null, 2)); setLocalError(''); }).catch(error => setLocalError(error instanceof Error ? error.message : '本地过程无法读取')); }} /></label>
    <form onSubmit={e => { e.preventDefault(); void mutation.run(async () => {
      const body = parsePlaytestJSON(raw);
      await durable('playtest-create', body, async original => {
        const process = original.process ? { ...original.process, inputs: original.process.inputs.map(input => input.type === 'DOG_MOVE' ? input : { tick: input.tick, seq: input.seq, type: input.type }) } : null;
        const result = unwrap(await api.POST('/api/admin/playtests', { body: { ...original, process } })).data; setRecordId(result.record_id);
      }); resource.refresh();
    }); }}><label>实际试玩记录 JSON<textarea className="json-editor" name="playtest_json" required value={raw} onChange={e => setRaw(e.target.value)} /></label><button disabled={mutation.pending}>记录这一次实际匿名试玩</button></form>{localError && <Notice error>{localError}</Notice>}<MutationStatus state={mutation} />
    {recordId && <Notice>服务器已记录独立试玩编号 {recordId}。没有写入正式三槽或积分账本。</Notice>}
  </Panel><Panel title="匿名试玩列表"><label>按批次查询<input value={batch} onChange={e => { setBatch(e.target.value); setOffset(0); }} /></label>
    {!resource.data && !resource.error && <Notice>正在读取匿名试玩记录……</Notice>}{resource.error && <Notice error>{resource.error}</Notice>}{resource.data?.items.length === 0 && <Notice>当前没有匿名试玩记录；不会生成示例真人样本。</Notice>}
    {resource.data?.items.map(run => <PlaytestCard key={run.record_id} run={run} />)}<div className="pagination"><button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 50))}>上一页</button><button disabled={!resource.data || offset + 50 >= resource.data.total} onClick={() => setOffset(offset + 50)}>下一页</button></div>
  </Panel></>;
}
function PlaytestCard({ run }: { run: Schema<'PlaytestRun'> }) {
  const [open, setOpen] = useState(false);
  return <article className="record"><h3>{run.anon_id} · {gameNames[run.game_id]} · {run.run_kind === 'PRACTICE' ? '练习' : '测试'}第 {run.trial} 次</h3><p>{run.source_kind === 'AUTOMATED' ? '自动控制记录 · 不计真人样本' : '实际人工观察记录'} · {run.batch_id}</p>
    {run.verification_status === 'FINAL_ZERO' && <Notice>工作人员记录的零分结案；不是规则核自然终局核验。</Notice>}<p>{run.verification_status === 'FINAL_ZERO' ? '结案状态' : '核验状态'}：{run.verification_status} · {run.verification_status === 'FINAL_ZERO' ? '工作人员结案积分' : '独立核验积分'}：{run.verified_points === null ? '—（尚无核验结果）' : run.verified_points}</p>
    {run.verification_status === 'OBSERVATION_ONLY' && <Notice>仅观察记录，无完整过程，核验积分为空。</Notice>}{['PENDING', 'VERIFYING'].includes(run.verification_status) && <Notice>过程待核验，不显示为 0 分，不预支正式积分。</Notice>}
    <p>分数来源：{run.score_source === 'CORE_REPLAY' ? '共享规则核重放' : run.score_source === 'OPERATOR_FINAL_ZERO' ? '工作人员零分结案' : '暂无核验来源'} · 顺序第 {run.game_position} 款</p><p>核验分拆：参与 {run.participation_points ?? '—'} / 表现 {run.performance_points ?? '—'} · 有效操作 {run.accepted_actions_count ?? '—'}</p><p>声明终局：{run.declared_end_tick ?? '—'} / {run.declared_end_reason ?? '—'} · 内核终局：{run.end_tick ?? '—'} / {run.end_reason ?? '—'}</p>{run.sheep_entry_ticks && <p>各羊入圈 tick：{run.sheep_entry_ticks.map(item => `${item.sheep_id}:${item.tick}`).join('、') || '无入圈记录'}</p>}<p className="small">实际开始 {formatTime(run.started_at)} · 实际结束 {formatTime(run.ended_at)}<br />入口 {run.entry_label} · 浏览器 {run.browser_label} · seed {run.seed}</p>{run.interruption_reason && <Notice>中断原因：{run.interruption_reason}</Notice>}{run.final_zero_reason && <Notice>零分结案原因：{run.final_zero_reason} · {run.invalid_reason}</Notice>}<p>观察分：{run.observed_points ?? '未填写'}（不是服务器核验分） · 帮助 {run.help_count} · 教程重看 {run.tutorial_replays}</p><p>{run.device_id} · {run.network_label} · {formatTime(run.ended_at)}</p>{run.kernel_failure_reason && <Notice error>{run.kernel_failure_reason}</Notice>}
    <details onToggle={e => setOpen(e.currentTarget.open)}><summary>查看这条试玩的最新详情</summary>{open && <PlaytestDetail id={run.record_id} />}</details>
  </article>;
}
function PlaytestDetail({ id }: { id: string }) {
  const resource = useResource(async () => unwrap(await api.GET('/api/admin/playtests/{id}', { params: { path: { id } } })).data, `playtest:${id}`, 5);
  return <>{resource.error && <Notice error>{resource.error}</Notice>}{resource.data ? <JsonDetails value={resource.data} /> : !resource.error && <Notice>正在查询原试玩记录……</Notice>}</>;
}
