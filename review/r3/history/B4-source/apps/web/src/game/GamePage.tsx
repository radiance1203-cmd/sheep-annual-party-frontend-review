import { useEffect, useRef, useState } from 'react';
import { BUILD, RULES, canonicalJson, createContext, createState, normalizeInputs, performancePoints, sha256Utf8, step, view } from '@sheep/game-core';
import type { GameState, GameView, SimulationEvent } from '@sheep/game-core';
import { api, clock, gameNames, key, message, secret, unwrap } from '../api';
import type { Schema } from '../api';
import { Notice, Panel, navigate } from '../ui';
import { getRecord, preflightStorage, putRecord } from './storage';
import type { RunRecord } from './storage';
import { createRenderer } from './renderer';
import { preloadAssets, releaseAssets } from './assets';
import { InputTimeline } from './timeline';
import { practiceProcess } from '../pages/operations-model';
import type { PracticeMetadata } from '../pages/operations-model';
import { HeldDirections, permitsGameplayKey } from './keyboard';
import { gameAdmission } from '../repair-state/admission';
import { r3CandidateRequested } from './r3-candidate';

type Renderer = ReturnType<typeof createRenderer>;
interface Runtime { state: GameState; queue: InputTimeline; startMs: number; record: RunRecord | null; storageKey: string; busy: boolean; stopped: boolean; received: boolean; nextSubmit: number; pausedAt: number | null; practiceInputs: Schema<'GameInput'>[]; practiceMetadata: Omit<PracticeMetadata, 'ended_at'> & { ended_at: string | null }; releaseLock: () => void }
const feedbackText: Partial<Record<SimulationEvent['type'], string>> = { LAYER_LANDED: '叠稳 +2 · 完美再 +2', LAYER_MISSED: '这次没托住，找准位置再来', OBSTACLE_PASSED: '安全越栏 +3', OBSTACLE_COLLISION: '碰栏一次，继续向前！', GRASS_OUTER: '草叶外圈 +1，金芯仍可再取', GRASS_INNER: '金芯精准 +1', SHEEP_PENNED: '一只小羊进圈啦！', BARK_TRIGGERED: '吠叫！从后方引导羊群', GAME_ENDED: '本局自然结束' };
async function acquireLock(id: string): Promise<() => void> {
  if (!navigator.locks) throw new Error('当前浏览器不支持正式局多窗口控制保护，请使用支持 Web Locks 的浏览器。');
  return new Promise((resolve, reject) => {
    void navigator.locks.request(`sheep-run:${id}`, { ifAvailable: true }, async lock => {
      if (!lock) { reject(new Error('原局已由另一个窗口控制。此窗口可查看结果，请回到原窗口。')); return; }
      await new Promise<void>(release => resolve(release));
    }).catch(reject);
  });
}
export function GamePage({ game, practice, event, me, onUpdate }: { game: Schema<'GameId'>; practice: boolean; event: Schema<'EventPublic'>; me: Schema<'Me'> | Schema<'StaffMe'> | undefined; onUpdate: () => void }) {
  const artCandidate = practice && r3CandidateRequested();
  const container = useRef<HTMLDivElement>(null);
  const renderer = useRef<Renderer | null>(null);
  const restartEpoch = useRef(0);
  const runtime = useRef<Runtime | null>(null);
  const mounted = useRef(true);
  const [current, setCurrent] = useState<GameView>(() => view(createState(createContext(game))));
  const [livePoints, setPerformance] = useState(0);
  const [status, setStatus] = useState(practice ? '正在准备练习场景；练习不占正式机会，也不入账。' : '场景就绪后可预检并预约；成功即使用 1 次正式机会。');
  const [sceneReady, setSceneReady] = useState(false);
  const [preparedBinding, setPreparedBinding] = useState('');
  const [sceneRevision, setSceneRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [confirmReturn, setConfirmReturn] = useState(false);
  const confirmReturnRef = useRef(false);
  const [silent, setSilent] = useState(true);
  const silentRef = useRef(true);
  const audio = useRef(new Map<string, HTMLAudioElement>());
  useEffect(() => { if(!feedback) return; const timer=window.setTimeout(()=>setFeedback(''),2200); return ()=>window.clearTimeout(timer); },[feedback]);
  const [practiceDone, setPracticeDone] = useState(false);
  const [practicePaused, setPracticePaused] = useState(false);
  const participantId = me?.participant.participant_id;
  const storageKey = `run:${participantId ?? 'practice'}`;
  const context = createContext(game);
  const sceneBinding = `${game}:${event.release?.asset_base_url ?? '/assets/'}:${event.release?.asset_manifest_hash ?? ''}`;
  const admission = gameAdmission(event, me);
  const held = useRef(new HeldDirections());
  const candidateTick = () => {
    const r = runtime.current;
    if (!r || r.stopped || r.pausedAt !== null || r.state.conclusion || clock.now(performance.now()) < r.startMs) return 0;
    return Math.max(r.state.tick + 1, Math.floor((clock.now(performance.now()) - r.startMs) * RULES.common.tick_hz / 1000) + 1);
  };
  const clear = () => { held.current.clear(); const r = runtime.current; if (r) r.queue.direction(0, 0, Math.max(1, candidateTick())); };
  const action = () => {
    const r = runtime.current; const tick = candidateTick();
    if (!r || !tick || document.hidden || confirmReturnRef.current) return;
    r.queue.action(game === 'stack' ? 'DROP' : game === 'runner' ? 'JUMP' : 'BARK', tick);
  };
  async function save(r: Runtime): Promise<void> {
    if (!r.record) return;
    r.record.processedTick = r.state.tick;
    r.record.logDigest = await sha256Utf8(canonicalJson({ tick: r.record.processedTick, inputs: r.record.inputs }));
    await putRecord(r.storageKey, structuredClone(r.record));
  }
  async function submit(r: Runtime): Promise<void> {
    const record = r.record; const session = record?.session;
    if (!record || !session || !record.sealed || r.received) return;
    if (clock.now(performance.now()) > Date.parse(session.submit_deadline)) {
      const server = unwrap(await api.GET('/api/sessions/{id}', { params: { path: { id: session.session_id } } })).data;
      if (server.process_digest || ['SETTLED', 'VERIFYING', 'REVIEW', 'TIMED_OUT', 'VOIDED', 'ABANDONED'].includes(server.state)) { r.received = true; navigate(`/result/${server.session_id}`); onUpdate(); return; }
      setStatus('完整提交截止已过，正在查询原局；不再生成新过程。'); return;
    }
    setStatus('完整日志已封存，正在使用同一份过程提交……');
    const body = { ...record.sealed, inputs: record.sealed.inputs.map(input => input.type === 'DOG_MOVE' ? input : { tick: input.tick, seq: input.seq, type: input.type }) };
    const result = unwrap(await api.POST('/api/sessions/{id}/finish', { params: { path: { id: session.session_id } }, body })).data;
    r.received = true; r.stopped = true; r.releaseLock(); setStatus('服务器已受理，正在核验。'); onUpdate(); navigate(`/result/${result.session_id}`);
  }
  async function bootstrap(recover: boolean): Promise<void> {
    if (busy || !sceneReady || preparedBinding !== sceneBinding || !renderer.current || runtime.current) return;
    setBusy(true); setError(''); setStatus('正在校验版本和本地完整日志存储……');
    let releaseLock = () => {};
    let runtimeOwnsLock = false;
    let pendingCreated = false;
    let startSent = false;
    try {
      if (!mounted.current) return;
      if (!practice && !participantId) throw new Error('请先绑定个人身份。');
      await preflightStorage();
      if (!mounted.current) return;
      const lock = await acquireLock(participantId ?? `practice:${key()}`); releaseLock = lock;
      if (!mounted.current) return;
      let record: RunRecord | null = practice ? null : await getRecord<RunRecord>(storageKey) ?? null;
      let state = createState(context);
      let startMs = clock.now(performance.now());
      if (!practice) {
        if (!navigator.onLine) throw new Error('离线无法获取可靠的新服务端时轴，请联网恢复；缓存已保留。');
        if (record?.version !== 1 && record !== null) throw new Error('本地日志格式无法恢复，请保留局号并联系工作人员。');
        if (record?.session) {
          const server = unwrap(await api.GET('/api/sessions/{id}', { params: { path: { id: record.session.session_id } } })).data;
          if (!mounted.current) return;
          if (server.process_digest || ['VERIFYING', 'SETTLED', 'REVIEW', 'VOIDED', 'ABANDONED', 'TIMED_OUT'].includes(server.state)) {
            if (recover) { releaseLock(); navigate(`/result/${server.session_id}`); return; }
            record = null;
          } else {
            if (server.game_id !== game) throw new Error(`另一款游戏仍有原局，请回到${gameNames[server.game_id]}恢复。`);
            record.session = server;
          }
        }
        if (me?.active_session && !record) throw new Error('此设备缺少原局完整日志和控制凭证，仅可查询原局；不能用空日志续跑。');
        if (!record) {
          if (recover) throw new Error('本地没有可恢复的原局日志。请查看服务器局号并联系现场工作人员。');
          const capability = gameAdmission(event, me);
          if (capability.kind !== 'ordinary' && capability.kind !== 'makeup') throw new Error(capability.label);
          const grant = capability.kind === 'makeup' ? capability.grant : undefined;
          if (!event.release || canonicalJson(event.release.build) !== canonicalJson(BUILD)) throw new Error('活动尚未绑定本版已审核构建，正式局不可开启。');
          const start: Schema<'StartRequest'> = { idempotency_key: key(), game_id: game, client_instance_id: key(), controller_secret: secret(), build: BUILD, ...(grant ? { makeup_grant_id: grant.makeup_grant_id } : {}) };
          record = { version: 1, start, session: null, inputs: [], processedTick: 0, sealed: null };
          pendingCreated = true;
          await putRecord(storageKey, record);
        }
        if (record.start.game_id !== game) throw new Error('存在另一款游戏的开局请求结果未明，请返回对应游戏恢复原请求。');
        if (!mounted.current) return;
        if (!record.session) { startSent = true; record.session = unwrap(await api.POST('/api/sessions/start', { body: record.start })).data; await putRecord(storageKey, record); }
        const session = record.session;
        if (canonicalJson(session.build) !== canonicalJson(BUILD) || session.seed !== context.seed) throw new Error('原局构建或 seed 与当前规则核不匹配，无法恢复。');
        if (!session.can_attempt_control || session.client_instance_id !== record.start.client_instance_id) throw new Error('当前身份已无原局控制权，请查看结果或联系工作人员。');
        const normalized = normalizeInputs(game, record.inputs, record.processedTick || 1);
        if (!normalized.ok || record.processedTick > 0 && (!record.logDigest || record.logDigest !== await sha256Utf8(canonicalJson({ tick: record.processedTick, inputs: record.inputs })))) throw new Error('完整日志前缀校验失败，不能凭分数或快照恢复。请联系工作人员。');
        let cursor = 0;
        for (let tick = 1; tick <= record.processedTick; tick++) {
          const inputs: Schema<'GameInput'>[] = [];
          while (record.inputs[cursor]?.tick === tick) { const input = record.inputs[cursor++]; if (input) inputs.push(input); }
          if (state.conclusion) throw new Error('日志包含首次终局之后的记录，无法恢复。');
          state = step(context, state, { tick, inputs }).state;
        }
        startMs = Date.parse(session.play_started_at);
      } else {
        const freshEvent = unwrap(await api.GET('/api/event', { params: { query: { event_id: event.event_id } } })).data;
        if (!freshEvent.practice_allowed) throw new Error('当前未开放练习入口。');
        startMs = clock.now(performance.now());
      }
      if (!mounted.current) return;
      const lastSeq = record?.inputs.at(-1)?.seq ?? 0;
      const r: Runtime = { state, queue: new InputTimeline(game, lastSeq), startMs, record, storageKey, busy: false, stopped: false, received: false, nextSubmit: 0, pausedAt: null, practiceInputs: [], practiceMetadata: { started_at: new Date(startMs).toISOString(), ended_at: null, seed: context.seed, entry_label: `${window.location.pathname}#/practice/${game}`, browser_label: navigator.userAgent }, releaseLock };
      runtime.current = r;
      runtimeOwnsLock = true;
      // The validated preview already owns the decoded textures and canvas.
      // Starting/restoring changes the view, never boots a second Phaser instance.
      renderer.current?.beginSession(record?.session?.session_id ?? `practice:${game}`,restartEpoch.current);
      renderer.current?.setMode(recover ? 'recovering' : 'running');
      renderer.current?.render(view(state));
      renderer.current?.setMode('running');
      setCurrent(view(state)); setStarted(true); setStatus(practice ? '练习中 · 不占正式机会，不产生正式积分' : record?.sealed ? '发现已封存过程，只重传原完整请求。' : '原局日志已恢复，按服务端原时轴继续。');
      if (record?.sealed) { r.stopped = true; await submit(r); }
    } catch (cause) { if (mounted.current) { setError(message(cause)); setStatus(practice ? '练习准备未完成，可修复连接后重试；未使用正式机会。' : '预检或恢复未完成。开局响应不明时请恢复原请求。'); } }
    finally { if (!runtimeOwnsLock) releaseLock(); if (!mounted.current && pendingCreated && !startSent) await putRecord(storageKey, null).catch(() => {}); if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    // Only an explicit start/restart transition aligns the play surface. Core
    // updates, pause and dialogs never scroll a page under the player's hand.
    if (!started || !container.current) return;
    const page=container.current.closest<HTMLElement>('.game-page');
    if(page) window.scrollTo({top:Math.max(0,window.scrollY+page.getBoundingClientRect().top),behavior:'instant'});
    container.current.focus({preventScroll:true});
  },[started]);
  useEffect(() => {
    let active = true;
    let preview: Renderer | undefined;
    if (runtime.current) return;
    setSceneReady(false); setError('');
    void (async () => {
      let assets: Awaited<ReturnType<typeof preloadAssets>> | undefined;
      try {
        assets = await preloadAssets(game, event.release?.asset_base_url, event.release?.asset_manifest_hash, artCandidate ? 'r3' : undefined);
        if (!active || !container.current) { releaseAssets(assets); return; }
        const initial = view(createState(createContext(game)));
        renderer.current?.destroy();
        preview = createRenderer(container.current, initial, assets);
        preview.beginSession(`preparation:${game}`,restartEpoch.current); preview.setMode('ready');
        assets = undefined;
        renderer.current = preview;
        const drawn = await preview.ready;
        if (active && drawn) { setCurrent(initial); setPreparedBinding(`${game}:${event.release?.asset_base_url ?? '/assets/'}:${event.release?.asset_manifest_hash ?? ''}`); setSceneReady(true); setStatus(practice ? '练习场景已就绪 · 不占正式机会，不产生正式积分。' : '场景已就绪；预检并预约成功即使用 1 次正式机会。'); }
      } catch (cause) { if (assets) releaseAssets(assets); if (active) setError(message(cause)); }
    })();
    return () => { active = false; if (preview && renderer.current === preview && !runtime.current) { preview.destroy(); renderer.current = null; } };
  }, [game, practice, event.release?.asset_base_url, event.release?.asset_manifest_hash, sceneRevision, artCandidate]);
  useEffect(() => {
    mounted.current = true;
    let alive = true;
    const timer = window.setInterval(() => {
      const r = runtime.current; if (!r || r.busy || r.received || r.pausedAt !== null) return;
      r.busy = true;
      void (async () => {
        try {
          const now = performance.now(); setCountdown(Math.max(0, Math.ceil((r.startMs - clock.now(now)) / 1000)));
          if (!r.stopped && !r.state.conclusion) {
            const target = clock.tick(r.startMs, now, r.state.tick);
            const feedbackBatch: string[]=[];
            for (let tick = r.state.tick + 1; tick <= target && !r.state.conclusion; tick++) {
              const inputs = r.queue.consume(tick);
              const previous = r.state;
              const output = step(createContext(game), r.state, { tick, inputs });
              if (r.record) r.record.inputs.push(...inputs); else r.practiceInputs.push(...inputs); r.state = output.state;
              renderer.current?.presentStep(output.view,output.events);
              for (const feedbackEvent of output.events) {
              if (feedbackEvent && alive) {
                const landed = feedbackEvent.type === 'LAYER_LANDED' && output.state.game_id === 'stack' && previous.game_id === 'stack';
                const text=landed ? output.state.stats.perfect_layers > previous.stats.perfect_layers ? '完美！叠稳 +2 · 完美再 +2' : '叠稳 +2' : feedbackText[feedbackEvent.type];
                if(text) feedbackBatch.push(text);
                if (!silentRef.current) {
                  const sound = ({ LAYER_LANDED: 'success', LAYER_MISSED: 'mistake', OBSTACLE_COLLISION: 'mistake', OBSTACLE_PASSED: 'success', GRASS_OUTER: 'success', GRASS_INNER: 'success', SHEEP_PENNED: 'enter', BARK_TRIGGERED: 'bark', GAME_ENDED: 'celebrate' } as Partial<Record<SimulationEvent['type'], string>>)[feedbackEvent.type];
                  if (sound) { let player = audio.current.get(sound); if (!player) { player = new Audio(`/assets/audio/${sound}.wav`); player.volume = .2; audio.current.set(sound, player); } player.currentTime = 0; void player.play().catch(() => {}); }
                }
              }
              }
            }
            if(alive && feedbackBatch.length) setFeedback(feedbackBatch.join(' · '));
            if (r.record && target > r.record.processedTick) await save(r);
            if (alive) { const snapshot = view(r.state); setCurrent(snapshot); setPerformance(performancePoints(r.state)); renderer.current?.render(snapshot); }
          }
          if (r.state.conclusion) {
            renderer.current?.setMode('ended');
            r.stopped = true;
            if (!r.record) { r.practiceMetadata.ended_at ??= new Date(clock.now(performance.now())).toISOString(); if (alive) { setPracticeDone(true); setStatus('练习结束；预测表现不入账，不占正式机会。'); } return; }
            if (!r.record.sealed && r.record.session) {
              const s = r.record.session, conclusion = r.state.conclusion;
              r.record.sealed = { game_id: s.game_id, build: s.build, client_instance_id: s.client_instance_id, controller_epoch: s.controller_epoch, ticket_binding_version: s.ticket_binding_version, controller_secret: r.record.start.controller_secret, end_tick: conclusion.end_tick, end_reason: conclusion.end_reason, inputs: structuredClone(r.record.inputs) };
              await save(r);
            }
          }
          if (r.record?.sealed && now >= r.nextSubmit) { r.nextSubmit = now + 2500; await submit(r); }
        } catch (cause) { if (alive) setError(message(cause)); } finally { r.busy = false; }
      })();
    }, 33);
    const visibility = () => { if (document.hidden) { clear(); renderer.current?.setMode('paused'); } else renderer.current?.setMode(runtime.current?.state.conclusion?'ended':runtime.current?.pausedAt!==null && runtime.current?'paused':runtime.current?'running':'ready'); };
    const direction = () => { const r = runtime.current, tick = candidateTick(); if (game === 'herd' && r && tick) { const { x, y } = held.current.vector(); r.queue.direction(x, y, tick); } };
    const keyboard = (e: KeyboardEvent) => { const target = e.target instanceof Element ? e.target.closest('button,a,input,textarea,select,summary,[contenteditable],[role=dialog]') ?? e.target : null; if (!permitsGameplayKey(target?.tagName ?? '', confirmReturnRef.current || Boolean(target?.closest('[role=dialog],[contenteditable]')), e.repeat)) return; if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault(); if (e.key === ' ') action(); if (held.current.press(e.key)) direction(); };
    const keyup = (e: KeyboardEvent) => { if (held.current.release(e.key)) direction(); };
    window.addEventListener('blur', clear); window.addEventListener('keyup', keyup); window.addEventListener('keydown', keyboard); document.addEventListener('visibilitychange', visibility);
    return () => { mounted.current = false; alive = false; clearInterval(timer); clear(); runtime.current?.releaseLock(); renderer.current?.destroy(); for (const player of audio.current.values()) { player.pause(); player.src = ''; } audio.current.clear(); window.removeEventListener('blur', clear); window.removeEventListener('keyup', keyup); window.removeEventListener('keydown', keyboard); document.removeEventListener('visibilitychange', visibility); };
  }, [game]);
  async function abandon(): Promise<void> {
    const r = runtime.current;
    if (!r?.record?.session) { navigate('/'); return; }
    if (r.record.sealed) { navigate(`/result/${r.record.session.session_id}`); return; }
    setBusy(true); clear();
    try {
      const session = r.record.session;
      r.record.abandon ??= { idempotency_key: key(), controller_epoch: session.controller_epoch, client_instance_id: session.client_instance_id, controller_secret: r.record.start.controller_secret, reason: 'USER_RETURN' };
      await putRecord(r.storageKey, r.record);
      const response = unwrap(await api.POST('/api/sessions/{id}/abandon', { params: { path: { id: session.session_id } }, body: r.record.abandon })).data;
      r.stopped = true; r.releaseLock(); onUpdate(); navigate(`/result/${response.session_id}`);
    } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }
  function pausePractice(): void {
    const r = runtime.current; if (!practice || !r) return;
    clear();
    const now = clock.now(performance.now());
    if (r.pausedAt === null) { r.pausedAt = now; setPracticePaused(true); renderer.current?.setMode('paused'); }
    else { r.startMs += now - r.pausedAt; r.pausedAt = null; setPracticePaused(false); renderer.current?.setMode('running'); }
  }
  function downloadPractice(): void {
    const r = runtime.current; if (!practice || !r || r.record || !r.state.conclusion || !r.practiceMetadata.ended_at) return;
    const body = practiceProcess(r.state.conclusion, r.practiceInputs, { ...r.practiceMetadata, ended_at: r.practiceMetadata.ended_at });
    const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `practice-${game}-${key()}.json`; link.click(); URL.revokeObjectURL(url);
  }
  function resetPractice(): void {
    if (!practice) return;
    clear(); runtime.current?.releaseLock(); runtime.current = null;
    restartEpoch.current++;
    renderer.current?.beginSession(`practice:${game}`,restartEpoch.current); renderer.current?.setMode('ready');
    const initial = view(createState(context)); renderer.current?.render(initial);
    setCurrent(initial); setPerformance(0); setFeedback(''); setPracticeDone(false); setPracticePaused(false); setStarted(false); setError(''); setStatus('练习可重新开始，不影响正式机会。');
    if (preparedBinding !== sceneBinding) { setSceneReady(false); setSceneRevision(value => value + 1); }
  }
  return <section className="game-page" data-art-candidate={artCandidate ? 'r3' : undefined} data-game={game} data-play-state={started ? practiceDone ? 'ended' : 'running' : 'ready'}><div className="game-top"><button aria-label="返回" onClick={() => started && !practiceDone ? (confirmReturnRef.current = true, clear(), setConfirmReturn(true)) : navigate('/')}>{artCandidate ? <img src="/assets/ui/icon_back.svg" alt="" /> : '‹'}</button><div><h1>{gameNames[game]}</h1><span className="mode-badge">{practice ? '自由练习 · 不入账' : '正式挑战'}</span></div><button aria-label={silent ? '开启音效' : '关闭音效'} onClick={() => { silentRef.current = !silent; setSilent(!silent); if (!silent) for (const player of audio.current.values()) player.pause(); }}>{artCandidate ? <img src={silent ? '/assets/ui/icon_sound_off.svg' : '/assets/ui/icon_sound_on.svg'} alt="" /> : silent ? '静音' : '音效'}</button></div><div className="hud"><div><small>剩余时间</small><strong>{Math.ceil((RULES.common.max_ticks - current.tick) / RULES.common.tick_hz)}秒</strong></div><div><small>局内表现</small><strong>{livePoints}<small> /80</small></strong></div><div><small>{current.game_id === 'stack' ? '失误' : current.game_id === 'runner' ? '失误次数' : '已入圈'}</small><strong>{current.game_id === 'stack' ? `${current.stats.misses}/3` : current.game_id === 'runner' ? current.stats.collision_count : `${current.stats.penned_count}/8`}</strong></div></div><div className={`game-stage stage-${game}`} ref={container} tabIndex={-1} data-game-tick={current.tick} data-accepted-actions={current.accepted_actions_count} onPointerDown={game === 'herd' ? undefined : action} aria-label={`${gameNames[game]}游戏画面`} />{started && countdown > 0 && <div className="countdown" role="status">{countdown}<small>按原服务端时刻开赛</small></div>}<div className="game-cumulative" aria-label="本局累计统计">{current.game_id === 'stack' ? `已叠稳 ${current.stats.success_layers} 层 · 完美 ${current.stats.perfect_layers} 层` : current.game_id === 'runner' ? `距离 ${Math.round(current.distance_u / 1000)} · 越栏 ${current.stats.safe_passed} · 外圈 ${current.stats.outer_collected} · 金芯 ${current.stats.inner_collected}` : `已入圈 ${current.stats.penned_count}/8 · 从后方引导羊群`}</div><div className="game-feedback" role="status">{feedback || '看准时机，按下方按钮操作'}</div>{!started ? <Panel><Notice>{status}</Notice>{error && <Notice error>{error}{!sceneReady && <button onClick={() => setSceneRevision(value => value + 1)}>重试场景加载</button>}</Notice>}<div className="action-stack"><button className="primary" disabled={busy || !sceneReady || preparedBinding !== sceneBinding || !practice && admission.kind !== 'ordinary' && admission.kind !== 'makeup'} onClick={() => void bootstrap(false)}>{busy ? '正在预检……' : practice ? '开始不计分练习' : admission.kind === 'ordinary' ? '预检并预约 · 使用 1 次机会' : admission.label}</button>{!practice && <button disabled={busy || !sceneReady || preparedBinding !== sceneBinding || !participantId} onClick={() => void bootstrap(true)}>恢复原局 / 重试原开局请求</button>}</div></Panel> : <><p className="small game-status">{status}</p>{error && <Notice error>{error}</Notice>}{!practiceDone && !current.conclusion && <div className="game-controls" onKeyDown={e => { if (e.repeat && (e.key === ' ' || e.key === 'Enter')) e.preventDefault(); }}>{game === 'herd' ? <><div className="joystick" tabIndex={0} role="group" aria-label="拖动摇杆移动牧羊犬" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); const rect = e.currentTarget.getBoundingClientRect(); runtime.current?.queue.direction((e.clientX - rect.left - rect.width / 2) / (rect.width / 2) * 1000, (e.clientY - rect.top - rect.height / 2) / (rect.height / 2) * 1000, candidateTick()); }} onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; const rect = e.currentTarget.getBoundingClientRect(); runtime.current?.queue.direction((e.clientX - rect.left - rect.width / 2) / (rect.width / 2) * 1000, (e.clientY - rect.top - rect.height / 2) / (rect.height / 2) * 1000, candidateTick()); }} onPointerUp={clear} onPointerCancel={clear} onLostPointerCapture={clear}><span>↑<br />← ● →<br />↓</span></div><button className="primary bark" disabled={countdown > 0 || current.game_id === 'herd' && current.bark_cooldown_ticks_remaining > 0} onClick={action}>吠叫{current.game_id === 'herd' && current.bark_cooldown_ticks_remaining > 0 && <small>冷却 {Math.ceil(current.bark_cooldown_ticks_remaining / RULES.common.tick_hz)} 秒</small>}</button></> : <button className="primary gameplay-action" disabled={countdown > 0} onClick={action}>{game === 'stack' ? '点击放下' : '点击跳跃'}</button>}</div>}{practice && <div className="practice-toolbar"><button aria-label={practicePaused ? '继续练习' : '暂停练习'} data-short-label={practicePaused ? '继续' : '暂停'} onClick={pausePractice} disabled={practiceDone}>{practicePaused ? '继续练习' : '暂停练习'}</button><button aria-label="重新练习" data-short-label="重练" onClick={resetPractice}>重新练习</button></div>}{practiceDone && <Panel><h2>练习完成</h2><p>表现预测 {current.conclusion?.performance_points} /80，正式积分未入账。</p><button onClick={downloadPractice}>下载本局完整练习过程（不含分数）</button><p className="small">仅保存本局实际输入和自然终局，不自动上传。请另记录实际匿名参与者与设备情况。</p><a className="button primary" href={`#/tutorial/${game}`}>回到玩法，准备正式挑战</a></Panel>}</>}{confirmReturn && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">{practice ? '结束这次练习？' : '放弃本局？'}</h2><p>{practice ? '练习不影响正式机会。' : '本次机会已使用，放弃计 0 分；确认框打开时，原局仍按原时轴计时。'}</p><button className="primary" onClick={() => (confirmReturnRef.current = false, setConfirmReturn(false))}>继续挑战</button><button disabled={busy} onClick={() => void abandon()}>确认放弃，返回大厅</button></div></div>}</section>;
}
