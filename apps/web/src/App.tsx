import { lazy, Suspense, useEffect, useState } from 'react';
import { RULES } from '@sheep/game-core';
import { api, gameNames, phaseNames, secret, setCsrf, unwrap } from './api';
import type { Schema } from './api';
import { getRecord, putRecord } from './game/storage';
import { verifyManifest } from './game/assets';
import { LobbyIllustration } from './LobbyIllustration';
import { gameAdmission } from './repair-state/admission';
import { Gifts, Leaderboard, Order, PublicDisplay, Records, Results } from './pages/ParticipantPages';
import { Field, MutationStatus, Notice, Panel, formString, navigate, useMutation, useResource } from './ui';
const AdminPage = lazy(async () => ({ default: (await import('./pages/AdminPage')).AdminPage }));
const GamePage = lazy(async () => ({ default: (await import('./game/GamePage')).GamePage }));
const TutorialScene = lazy(async () => ({ default: (await import('./game/TutorialScene')).TutorialScene }));
type IdentityStatus = 'loading' | 'anonymous' | 'failed' | 'ready';

export function App() {
  const [path, setPath] = useState(window.location.hash.slice(1) || '/');
  const [online, setOnline] = useState(navigator.onLine);
  const event = useResource(async () => { const id = new URLSearchParams(window.location.search).get('event_id') ?? window.location.pathname.match(/^\/e\/([^/]+)/u)?.[1]; return id ? unwrap(await api.GET('/api/event', { params: { query: { event_id: id } } })).data : unwrap(await api.GET('/api/display')).data.event; }, 'event', 10);
  const identity = useResource(async () => { const value = unwrap(await api.GET('/api/me')).data; return { ...value, active_session: 'active_session' in value ? value.active_session : null }; }, 'me', 10);
  useEffect(() => {
    // Only accepted identity data may update transport state. Discarded reads
    // have no side effects; a transient read failure preserves original-run CSRF.
    if (identity.errorCode === 'UNAUTHENTICATED') setCsrf('');
    else if (!identity.error && identity.data) setCsrf(identity.data.csrf_token);
  }, [identity.data, identity.error, identity.errorCode]);
  useEffect(() => {
    const route = () => setPath(window.location.hash.slice(1) || '/');
    const connection = () => setOnline(navigator.onLine);
    window.addEventListener('hashchange', route); window.addEventListener('online', connection); window.addEventListener('offline', connection);
    return () => { window.removeEventListener('hashchange', route); window.removeEventListener('online', connection); window.removeEventListener('offline', connection); };
  }, []);
  const me = identity.data;
  const identityStatus: IdentityStatus = identity.error ? identity.errorCode === 'UNAUTHENTICATED' ? 'anonymous' : 'failed' : me ? 'ready' : 'loading';
  const readyMe = identityStatus === 'ready' ? me : undefined;
  const currentEvent = event.data;
  const parts = path.split('/').filter(Boolean);
  const screen = parts[0] || 'lobby';
  const game = parts[1] === 'runner' || parts[1] === 'herd' ? parts[1] : 'stack';
  const fullScreen = screen === 'screen';
  const lobby = screen === 'lobby' || screen === '';
  return <div className={fullScreen ? 'app big-screen' : 'app'} data-page={screen} data-visual-repair={fullScreen || ['admin', 'claim'].includes(screen) ? undefined : 'v1'}>
    {!lobby && <header className="topbar"><a href="#/" aria-label="返回大厅">♧ 牧场</a><span>{currentEvent?.name || '羊年游园会'}</span>{fullScreen ? <span>只读现场大屏</span> : me ? <span className="identity">{me.participant.display_name}</span> : identityStatus === 'anonymous' ? <a href="#/login">绑定身份</a> : <span>身份正在同步</span>}</header>}
    {!online && <Notice error>当前离线。游戏按原时轴继续；请保留页面，联网后恢复原请求。</Notice>}
    {currentEvent && !lobby && <div className="phase-banner">✦ {phaseNames[currentEvent.phase]} {currentEvent.recovery_review_required && '· 正在恢复复核'}</div>}
    <main id="main">
      {!fullScreen && identityStatus === 'loading' && <Notice>正在读取身份，请稍候……</Notice>}
      {!fullScreen && identityStatus === 'failed' && <Notice error>{identity.error}。{me ? '已保留上次身份显示，余额与资格同步失败，相关操作已暂停。' : '尚未确认身份，相关操作已暂停。'}<button onClick={identity.refresh}>重新读取身份</button></Notice>}
      {!fullScreen && identityStatus === 'anonymous' && <Notice>当前未绑定身份或会话已过期。可重新绑定个人身份。</Notice>}
      {event.error && <Notice error>{event.error}<button onClick={event.refresh}>重新连接活动</button></Notice>}
      {!currentEvent && !event.error && <Notice>正在连接活动……</Notice>}
      {screen === 'login' && currentEvent && <Login event={currentEvent} onLogin={() => { identity.refresh(); navigate('/'); }} />}
      {lobby && <Lobby event={currentEvent} me={me} identityStatus={identityStatus} refresh={identity.refresh} />}
      {screen === 'tutorial' && currentEvent && <Tutorial game={game} event={currentEvent} me={readyMe} identityStatus={identityStatus} />}
      {screen === 'rules' && <Panel title="活动规则"><p>每人整场共用 {RULES.common.event_ticket_slots} 次正式机会，三款自由选择、允许重复，无每日刷新。</p><p>正式预约成功即使用机会，按服务器时刻 {RULES.common.scheduled_start_delay_ms / 1000} 秒后开赛；每局最长 {RULES.common.duration_seconds} 秒，完整提交截止为开赛后 {RULES.common.submission_deadline_after_play_start_ms / 1000} 秒。</p><p>合法自然结束、有有效操作、准时完整提交并核验通过后，获得 {RULES.common.participation_points} 参与分和最多 {RULES.common.performance_cap} 表现分。主动放弃、零操作、超时或无效过程计 0 分，机会已使用。</p><p>荣誉按有效总分同分并列。兑换只扣可用余额，不降低荣誉积分。默认一人一件，工作人员确认核销成功后才交实物。</p><p>领取截止：{currentEvent?.claim_closes_at ? new Date(currentEvent.claim_closes_at).toLocaleString('zh-CN') : '主办方尚未公布'}</p><p className="small">冻结规则版本：{RULES.rule_version}</p><a href="#/" className="button">返回大厅</a></Panel>}
      {(screen === 'practice' || screen === 'play') && currentEvent && <Suspense fallback={<Notice>正在加载游戏引擎，尚未使用机会……</Notice>}><GamePage key={path} game={game} practice={screen === 'practice'} event={currentEvent} me={readyMe} onUpdate={identity.refresh} /></Suspense>}
      {screen === 'result' && parts[1] && <Results key={parts[1]} id={parts[1]} />}
      {screen === 'records' && <Records me={me} />}
      {screen === 'leaderboard' && <Leaderboard event={currentEvent} />}
      {screen === 'screen' && <PublicDisplay />}
      {screen === 'gifts' && <Gifts key={`${currentEvent?.event_id}:${readyMe?.participant.participant_id}`} event={currentEvent} me={readyMe} refresh={identity.refresh} />}
      {screen === 'order' && parts[1] && <div inert={identityStatus !== 'ready'}><Order key={parts[1]} id={parts[1]} refresh={identity.refresh} /></div>}
      {(screen === 'admin' || screen === 'claim') && (identityStatus === 'ready' || identityStatus === 'anonymous') && <Suspense fallback={<Notice>正在加载工作人员页面……</Notice>}><AdminPage key={`${screen}:${readyMe?.participant.participant_id}`} me={readyMe} event={currentEvent} claimOnly={screen === 'claim'} refresh={() => { event.refresh(); identity.refresh(); }} /></Suspense>}
    </main>
    {!fullScreen && !['play', 'practice'].includes(screen) && <nav className="bottom-nav" aria-label="主要导航"><a href="#/" aria-current={lobby ? 'page' : undefined}><img src="/assets/ui/icon_home.svg" alt="" width={24} height={24} />游园会</a><a href="#/leaderboard" aria-current={screen === 'leaderboard' ? 'page' : undefined}><img src="/assets/ui/icon_leaderboard.svg" alt="" width={24} height={24} />荣誉榜</a><a href="#/gifts" aria-current={['gifts', 'order'].includes(screen) ? 'page' : undefined}><img src="/assets/ui/icon_gift.svg" alt="" width={24} height={24} />兑换礼品</a></nav>}
    {!fullScreen && me?.participant.roles.some(role => role !== 'PARTICIPANT') && !['play', 'practice'].includes(screen) && <footer><a href="#/admin">主办控制台</a> · <a href="#/claim">核销工作台</a> · <a href="#/screen">只读大屏</a></footer>}
  </div>;
}
function Login({ event, onLogin }: { event: Schema<'EventPublic'>; onLogin: () => void }) {
  const mutation = useMutation();
  return <Panel title="欢迎来到羊年游园会"><p>请输入分配给本人的随机邀请码。公共活动入口不会直接发放机会。</p><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void mutation.run(async () => {
    const token = formString(data, 'invite');
    const cached = await getRecord<Schema<'LoginRequest'>>('pending-login');
    const body = cached?.invite_token === token ? cached : { event_id: event.event_id, invite_token: token, login_nonce: secret() };
    await putRecord('pending-login', body);
    const me = unwrap(await api.POST('/api/auth/login', { body })).data; setCsrf(me.csrf_token); onLogin();
  }); }}><Field label="我的个人邀请码" name="invite" /><button className="primary" disabled={mutation.pending}>绑定并进入</button></form><MutationStatus state={mutation} /></Panel>;
}
function Lobby({ event, me, refresh, identityStatus }: { identityStatus: IdentityStatus; event: Schema<'EventPublic'> | undefined; me: Schema<'Me'> | Schema<'StaffMe'> | undefined; refresh: () => void }) {
  const mutation = useMutation();
  const artwork = useResource(async () => {
    const manifest = await verifyManifest('/assets/');
    return Object.fromEntries(['hero.lobby', 'cover.stack', 'cover.runner', 'cover.herd'].map(id => {
      const asset = manifest.assets.find(entry => entry.asset_id === id);
      if (!asset?.runtime_path) throw new Error('大厅插画未在资源清单中登记，请重新加载或联系工作人员。');
      return [id, asset.runtime_path];
    }));
  }, 'lobby-art-v2');
  return <>
    <section className="lobby-hero" aria-labelledby="lobby-title"><h1 id="lobby-title" className="visually-hidden">羊年游园会</h1>{artwork.data ? <LobbyIllustration key={artwork.data['hero.lobby']} className="vr-hero" src={artwork.data['hero.lobby']} width={860} height={430} label="大厅" fetchPriority="high" retryLabel="重试大厅插画" /> : <Notice>{artwork.error || '正在加载牧场插画……'}</Notice>}</section>
    {event && <div className="lobby-phase" role="status"><span>✦ {phaseNames[event.phase]}{event.recovery_review_required && ' · 正在恢复复核'}</span></div>}
    {event?.name && event.name !== '羊年游园会' && <p className="lobby-event-name">{event.name}</p>}
    {me ? <><section className="lobby-identity vr-panel"><div className="score-strip"><div><span>我的荣誉积分</span><strong>{me.participant.honor_total}</strong></div><div><span>剩余正式机会</span><strong>{me.tickets.filter(ticket => ticket.state === 'AVAILABLE').length} / {RULES.common.event_ticket_slots}</strong></div></div></section>{me.tickets.some(ticket => ticket.state === 'RESERVED_FOR_MAKEUP') && <Notice>原机会补场已授权。<div className="recovery-actions"><a className="button" href="#/records">查看对应机会与截止</a></div></Notice>}{me.active_session && <Notice>有一局{me.active_session.state === 'VERIFYING' ? '正在核验' : '尚未完成'}。<div className="recovery-actions"><a className="button" href={`#/play/${me.active_session.game_id}`}>恢复原局</a><a className="button" href={`#/result/${me.active_session.session_id}`}>查看状态</a></div></Notice>}{!me.participant.eligible && <Notice error>当前资格已暂停，请联系现场工作人员。</Notice>}{me.participant.claims_frozen && <Notice error>积分资格待复核，兑换与待领凭证暂时冻结。</Notice>}</> : identityStatus === 'anonymous' ? <section className="lobby-identity vr-panel"><p>每人整场 3 次正式机会，三款任选，也可重复挑战。</p><a className="button primary vr-primary-button" href="#/login">绑定身份</a></section> : <section className="lobby-identity vr-panel"><p>{identityStatus === 'loading' ? '身份正在读取中……' : '身份暂时无法确认，请使用上方按钮重试。'}</p></section>}
    <h2 className="section-title">45 秒一局 · 三款任选</h2>
    <div className="game-cards">{(['stack', 'runner', 'herd'] as const).map((game, i) => <a className={`game-card vr-game-card game-${game}`} key={game} href={`#/tutorial/${game}`} aria-label={`${gameNames[game]}，查看玩法`}>
      {artwork.data && <LobbyIllustration key={artwork.data[`cover.${game}`]} className="vr-cover" src={artwork.data[`cover.${game}`]} width={384} height={384} label={gameNames[game]} />}
      <div className="vr-card-copy"><h2 className="vr-wood-label">{gameNames[game]}</h2><p>{i === 0 ? '看准位置，叠得更高！' : i === 1 ? '轻轻一跳，越过障碍！' : '绕到羊后方，赶它们进圈！'}</p><span className="card-start vr-primary-button">玩法 ›</span></div></a>)}</div>
    <p className="participation-note">★ 核验通过得 <strong>20</strong> 参与分<br />表现最高加 <strong>80</strong> 分</p><p className="lobby-links"><a href="#/rules">完整活动规则</a><a href="#/records">我的机会与记录</a></p>
    {event && !event.accepting_new_sessions && ['CHECK_IN', 'PLAYING', 'DRAINING'].includes(event.phase) && <Notice>新开局已暂停，练习入口同时暂停；已预约局仍按原时轴进行。</Notice>}
    {event && !event.ordinary_start_allowed && <Notice>{event.phase === 'DRAINING' ? '普通开局已截止。已获授权的原机会补场请进入对应游戏。' : '当前暂未开放正式挑战。已有结果和领取凭证仍可查询。'}</Notice>}
    {me && <details className="panel"><summary>身份与活动规则</summary><p>{me.participant.display_name}</p><div className="slots">{me.tickets.map(ticket => <a key={ticket.slot_no} href={ticket.current_session_id ? `#/result/${ticket.current_session_id}` : '#/'}><span>机会 {ticket.slot_no}</span><b>{ticket.state === 'AVAILABLE' ? '可挑战' : ticket.state === 'RESERVED_FOR_MAKEUP' ? '原机会补场' : `${ticket.current_contribution_points} 分`}</b></a>)}</div><p>荣誉积分只累计有效成绩；兑换扣除余额，不降低荣誉积分。同分并列，整场无按日刷新。</p><button disabled={mutation.pending || identityStatus !== 'ready'} onClick={() => void mutation.run(async () => { unwrap(await api.POST('/api/auth/logout')); setCsrf(''); refresh(); window.location.reload(); })}>退出当前身份</button><MutationStatus state={mutation} /></details>}
  </>;
}
function Tutorial({ game, event, me, identityStatus }: { identityStatus: IdentityStatus; game: Schema<'GameId'>; event: Schema<'EventPublic'>; me: Schema<'Me'> | Schema<'StaffMe'> | undefined }) {
  const [lesson, setLesson] = useState(0);
  const admission = gameAdmission(event, me);
  useEffect(() => { setLesson(0); const timer = setInterval(() => setLesson(value => Math.min(3, value + 1)), 4000); return () => clearInterval(timer); }, [game]);
  const lessons = game === 'stack' ? ['先看上方托盘左右移动，等它接近下方托盘。', '点击放下。羊的大小保持不变，稳稳托住才成功。', '完美对齐会多得表现分。三次失误后自然结束。'] : game === 'runner' ? ['小羊会自动往前跑，你只需要把握跳跃时机。', '点击跳跃越栏；碰到栏杆也会继续，不会扣掉生命。', '草叶外圈和金芯分别得分，外圈吃到后仍可取金芯。'] : ['拖动摇杆移动牧羊犬，先绕到羊的后方。', '从后面慢慢接近，让羊朝上方围栏入口移动。', '吠叫会短暂扩大影响范围，冷却时继续绕后引导。'];
  return <Panel title={gameNames[game]}><div className={`tutorial-art game-${game}`}><Suspense fallback={<Notice>正在加载玩法场景……</Notice>}><TutorialScene game={game} event={event} lesson={lesson} /></Suspense></div><h3>{game === 'stack' ? '点击放羊，托盘对齐才稳' : game === 'runner' ? '自动向前跑，点击跳跃' : '绕到小羊后面，带它进圈'}</h3><p>{game === 'stack' ? '每叠稳一层 +2，完美再 +2。完整托盘一直保留；20 层、3 次失误或时间到自然结束。' : game === 'runner' ? '安全越栏 +3，草叶外圈 +1、金芯再 +1。碰栏后继续跑，失误不是生命值；完整进行到 45 秒。' : '拖动摇杆移动牧羊犬，接近羊后方驱赶。吠叫有冷却；每只入圈 +6，全齐另有时间奖励。'}</p><Notice>练习不占正式机会，也不会产生正式积分。正式局在预约成功后立即使用 1 次机会，3 秒后开赛；返回或放弃仍消耗本次机会。</Notice><div className="tutorial-step" aria-live="polite"><progress max={3} value={Math.min(3, lesson + 1)} /><p>{lesson < 3 ? `12 秒教程 · 第 ${lesson + 1} 步` : '教程已完成，可随时练习'}</p><strong>{lessons[Math.min(2, lesson)]}</strong></div><div className="action-stack"><a className={`button ${event.practice_allowed ? '' : 'disabled'}`} aria-disabled={!event.practice_allowed} href={event.practice_allowed ? `#/practice/${game}` : '#/'}>{lesson < 3 ? '跳过教程，先练习' : '先练习一次'}</a>{identityStatus === 'loading' || identityStatus === 'failed' ? <button disabled>等待身份确认</button> : admission.kind === 'ordinary' || admission.kind === 'makeup' ? <a className="button primary" href={`#/play/${game}`}>{admission.label}</a> : admission.kind === 'recover' ? <a className="button primary" href={`#/play/${admission.session.game_id}`}>{admission.label}</a> : admission.kind === 'result' ? <a className="button primary" href={`#/result/${admission.session.session_id}`}>{admission.label}</a> : admission.kind === 'login' ? <a className="button primary" href="#/login">{admission.label}</a> : <button disabled>{admission.label}</button>}<a className="button quiet" href="#/">返回大厅</a></div></Panel>;
}
