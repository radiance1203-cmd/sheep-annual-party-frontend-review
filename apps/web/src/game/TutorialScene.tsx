import { useEffect, useRef, useState } from 'react';
import type { GameId } from '@sheep/game-core';
import type { Schema } from '../api';
import { message } from '../api';
import { Notice } from '../ui';
import { preloadAssets, releaseAssets } from './assets';
import { createRenderer } from './renderer';
import { createTeachingReplay, teachingInstructions } from './tutorial-model';
import type { TeachingProgress } from './tutorial-model';

// A labelled, local teaching replay. It has no session, wallet or submission path.
export function TutorialScene({ game, event, onProgress }: { game: GameId; event: Schema<'EventPublic'>; onProgress: (complete: boolean) => void }) {
  const parent = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const pause = useRef(false);
  const [progress, setProgress] = useState<TeachingProgress>({step:0,complete:false,tick:0,events:[]});
  const callback = useRef(onProgress); callback.current=onProgress;
  const presenter = useRef<ReturnType<typeof createRenderer> | null>(null);
  useEffect(() => {
    let active = true;
    let renderer: ReturnType<typeof createRenderer> | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    pause.current=false; setPaused(false); setReady(false); setError('');
    const replay=createTeachingReplay(game); setProgress(replay.progress()); callback.current(false);
    const visibility=()=>renderer?.setMode(document.hidden || pause.current?'paused':replay.progress().complete?'ended':'running');
    document.addEventListener('visibilitychange',visibility);
    void (async () => {
      let assets: Awaited<ReturnType<typeof preloadAssets>> | undefined;
      try {
        assets = await preloadAssets(game, event.release?.asset_base_url, event.release?.asset_manifest_hash);
        if (!active || !parent.current) { releaseAssets(assets); return; }
        renderer = createRenderer(parent.current, replay.snapshot(), assets); assets = undefined; presenter.current=renderer;
        renderer.beginSession(`tutorial:${game}`,revision); renderer.setMode('ready');
        if (!await renderer.ready || !active) return;
        setReady(true); renderer.setMode('running');
        timer = setInterval(() => {
          if (pause.current || document.hidden) return;
          const output=replay.advance();
          if (!output) return;
          renderer?.presentStep(output.view,output.events);
          const next=replay.progress(); setProgress(next); callback.current(next.complete);
          if(next.complete) renderer?.setMode('ended');
        }, 1000 / 30);
      } catch (cause) { if (assets) releaseAssets(assets); if (active) setError(message(cause)); }
    })();
    return () => { active = false; if (timer) clearInterval(timer); document.removeEventListener('visibilitychange',visibility); renderer?.destroy(); if(presenter.current===renderer) presenter.current=null; };
  }, [game, event.release?.asset_base_url, event.release?.asset_manifest_hash, revision]);
  return <section className="teaching-scene" aria-label="玩法教学演示，不计分" data-lesson={progress.step} data-teaching-tick={progress.tick} data-teaching-complete={progress.complete}>
    <div className="tutorial-step" aria-live="polite"><progress max={3} value={progress.complete?3:progress.step+1}/><p>{progress.complete?'已观察到真实示范事件，可重播或开始练习':`真实操作演示 · 第 ${progress.step+1} 步`}</p><strong>{teachingInstructions[game][progress.step]}</strong></div>
    <div className={`game-stage stage-${game}`} ref={parent} />
    {!ready && !error && <Notice>正在加载本款游戏教学场景……</Notice>}
    {error && <Notice error>{error}<button onClick={() => setRevision(value => value + 1)}>重试教学场景</button></Notice>}
    <div className="teaching-controls"><button disabled={!ready || progress.complete} onClick={() => { pause.current = !pause.current; setPaused(pause.current); presenter.current?.setMode(pause.current?'paused':'running'); }}>{paused ? '继续演示' : '暂停演示'}</button><button disabled={!ready} onClick={()=>setRevision(value=>value+1)}>重播演示</button><a className="button" aria-disabled={!event.practice_allowed} href={event.practice_allowed?`#/practice/${game}`:'#/'}>继续到练习</a></div>
    <p className="teaching-caption">教学示范 · 不占正式机会、不计积分。{game==='runner'?'观察外圈与金芯分别采集。':game==='herd'?'羊群穿过上方入口后确认入圈。':'看准对齐，再放下叠稳。'}</p>
    <span className="visually-hidden" data-teaching-events={progress.events.join(',')}>{progress.events.join('、')}</span>
  </section>;
}
