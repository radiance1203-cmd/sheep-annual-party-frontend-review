import { performancePoints, createContext, createState, step, view } from '@sheep/game-core';
import type { GameId, GameInput, GameView } from '@sheep/game-core';
import { createRenderer } from '../src/game/renderer';
import { preloadAssets, parseAtlas, releaseAssets } from '../src/game/assets';
import { createTeachingReplay } from '../src/game/tutorial-model';

const params = new URLSearchParams(location.search);
const game = (params.get('game') ?? 'stack') as GameId;
if (!['stack', 'runner', 'herd'].includes(game)) throw new Error('invalid sample game');
const stage = document.querySelector<HTMLDivElement>('#stage')!;
stage.style.aspectRatio = game === 'stack' ? '360 / 480' : game === 'runner' ? '360 / 220' : '360 / 420';
const title = document.querySelector('#title')!;
title.textContent = `${({ stack: '羊羊叠高高', runner: '羊羊跨栏', herd: '赶羊入圈' })[game]} · R2 技术样板`;
const start = document.querySelector<HTMLButtonElement>('#start')!, pause = document.querySelector<HTMLButtonElement>('#pause')!, restart = document.querySelector<HTMLButtonElement>('#restart')!;
const status = document.querySelector('#status')!;
const assets = await preloadAssets(game);
const candidate = params.get('candidate');
if (candidate === 'r2a' && game === 'herd') {
  // Explicit partial comparison: one candidate background and only walk+bark.SE.
  // v4 remains labelled for every other action/direction. Production precheck is untouched.
  const raw = await (await fetch('/assets/candidates/r2/dog_iso_r2a.atlas.json')).json();
  const atlas = parseAtlas(raw); const image = new Image(); image.src = '/assets/candidates/r2/dog_iso_r2a.png'; await image.decode();
  // A separate texture key is supported by renderer preview bindings below, never merged into production atlas.
  assets.dog_walk_bark_candidate = { ...atlas, decodedImage: image };
  const bg = new Image(); bg.src = '/assets/candidates/r2/backdrop_herd_r2a.png'; await bg.decode();
  if (assets.farm_backdrop_v3) releaseAssets({ backdrop: assets.farm_backdrop_v3 });
  assets.farm_backdrop_v3 = { image: 'backdrop_herd_r2a.png', size_px: [720, 840], scene_size_px: [360, 420], frames: { backdrop_herd: { rect: [0, 0, 720, 840], pivot_px: [0, 0] } }, animations: {}, decodedImage: bg };
  document.querySelector('#gap')!.textContent = '局部对照：r2a 背景 + 犬移动吠叫 SE；其他角色/动作仍为 v4。新羊动作未制作，未替换正式清单。';
}
if (candidate && ['r2c','r2d','r2e','r2f2'].includes(candidate) && game === 'stack') {
  const raw = await (await fetch(`/assets/candidates/r2/${candidate}/sheep_stack_${candidate}.atlas.json`)).json();
  const atlas = parseAtlas(raw), image = new Image(); image.src = `/assets/candidates/r2/${candidate}/sheep_stack_${candidate}.png`; await image.decode();
  assets.sheep_stack_candidate = { ...atlas, decodedImage: image };
  document.querySelector('#gap')!.textContent = `局部静态对照：${candidate} 仅 stack_idle 单帧；托盘/背景/其他动作复用 v4。缺落下/接触动画，不能视为完整新角色。`;
}
const textureBytes = Object.values(assets).reduce((sum, atlas) => sum + atlas.size_px[0] * atlas.size_px[1] * 4, 0);
let replay = createTeachingReplay(game, { stopOnComplete: false });
const renderer = createRenderer(stage, replay.snapshot(), assets);
await renderer.ready;
renderer.beginSession(`r2-sample:${game}`, 0); renderer.setMode('ready');
let epoch = 0, running = false, startedAt = 0, baseTick = 0, lastSnapshot = replay.snapshot();
const eventLog: unknown[] = [], timings: number[] = [];
let lastTimer = performance.now();
const refresh = () => {
  document.querySelector('#tick')!.textContent = `tick ${lastSnapshot.tick} · ${game}`;
  document.querySelector('#score')!.textContent = `表现 ${lastSnapshot.conclusion?.performance_points ?? 0}/80 · 不入账`;
  status.textContent = `${running ? '实速运行' : '已暂停/准备'} · DPR ${renderer.diagnostics().layout.effectiveDpr} · ${candidate ? `${candidate}局部 + v4` : 'v4现有资产'}`;
};
const advance = () => {
  const output = replay.advance();
  if (!output) { running = false; renderer.setMode(lastSnapshot.conclusion ? 'ended' : 'paused'); return; }
  lastSnapshot = output.view; renderer.presentStep(output.view, output.events);
  eventLog.push(...output.events.map((event, eventIndex) => ({ epoch, eventIndex, event, view: output.view })));
  const nonMove = output.events.filter(e => e.type !== 'DOG_MOVED');
  if (nonMove.length) document.querySelector('#events')!.textContent = nonMove.map(e => `${e.tick}: ${e.type}`).join(' · ');
  document.querySelector('#score')!.textContent = `表现 ${performancePoints(output.state)}/80 · 不入账`;
};
const timer = window.setInterval(() => {
  const now = performance.now(); timings.push(now - lastTimer); lastTimer = now;
  if (timings.length > 1800) timings.shift();
  if (!running) return;
  const target = baseTick + Math.floor((now - startedAt) * 30 / 1000);
  while (lastSnapshot.tick < target && running) advance();
  document.querySelector('#tick')!.textContent = `tick ${lastSnapshot.tick} · ${game}`;
}, 1000 / 30);
start.disabled = pause.disabled = restart.disabled = false;
start.onclick = () => { if (running || lastSnapshot.conclusion) return; running = true; startedAt = performance.now(); baseTick = lastSnapshot.tick; renderer.setMode('running'); refresh(); };
pause.onclick = () => { running = !running; if (running) { startedAt = performance.now(); baseTick = lastSnapshot.tick; } renderer.setMode(running ? 'running' : 'paused'); refresh(); };
restart.onclick = () => { running = false; replay = createTeachingReplay(game, { stopOnComplete: false }); lastSnapshot = replay.snapshot(); renderer.beginSession(`r2-sample:${game}`, ++epoch); renderer.render(lastSnapshot); renderer.setMode('ready'); eventLog.length = 0; refresh(); };
refresh();
const api = {
  renderer,
  diagnostics: () => ({ ...renderer.diagnostics(), snapshot: lastSnapshot, inputs: replay.inputs, eventLog, timerIntervals: timings, rgba8TextureBytes: textureBytes, epoch, candidate, browser: navigator.userAgent, dpr: devicePixelRatio }),
  advanceTicks(count: number) { running = true; for (let i = 0; i < count && running; i++) advance(); running = false; renderer.setMode(lastSnapshot.conclusion ? 'ended' : 'paused'); refresh(); },
  freeze(ms: number) { renderer.setPresentationTime(ms); },
  manualReplay(inputs: GameInput[], ticks: number) {
    running = false; renderer.beginSession(`r2-manual:${game}`, ++epoch); renderer.setMode('running');
    let state = createState(createContext(game)); renderer.render(view(state)); eventLog.length = 0;
    for (let tick = 1; tick <= ticks && !state.conclusion; tick++) {
      const output = step(createContext(game), state, { tick, inputs: inputs.filter(input => input.tick === tick) }); state = output.state;
      lastSnapshot = output.view; renderer.presentStep(output.view, output.events);
      eventLog.push(...output.events.map((event, eventIndex) => ({ epoch, eventIndex, event, view: output.view })));
    }
    renderer.setMode(lastSnapshot.conclusion ? 'ended' : 'paused'); refresh();
  },
  repeatLastBatch() { const item = eventLog.at(-1) as { view: GameView } | undefined; if (item) { const events = eventLog.filter(x => (x as { view: GameView }).view.tick === item.view.tick).map(x => (x as { event: Parameters<typeof renderer.presentStep>[1][number] }).event); renderer.presentStep(item.view, events); } },
  replayPrefix() { let state = createState(createContext(game)); for (let tick = 1; tick <= lastSnapshot.tick && !state.conclusion; tick++) state = step(createContext(game), state, { tick, inputs: replay.inputs.filter((input: GameInput) => input.tick === tick) }).state; return view(state); },
};
Object.assign(window, { r2: api });
window.addEventListener('pagehide', () => { clearInterval(timer); renderer.destroy(); }, { once: true });
