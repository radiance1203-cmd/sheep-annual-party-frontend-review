import { useEffect, useRef, useState } from 'react';
import { createContext, createState, step, view } from '@sheep/game-core';
import type { GameId, GameInput } from '@sheep/game-core';
import type { Schema } from '../api';
import { message } from '../api';
import { Notice } from '../ui';
import { preloadAssets, releaseAssets } from './assets';
import { createRenderer } from './renderer';

// A labelled, local teaching replay. It has no session, wallet or submission path.
export function TutorialScene({ game, event, lesson }: { game: GameId; event: Schema<'EventPublic'>; lesson: number }) {
  const parent = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const pause = useRef(false);
  useEffect(() => {
    let active = true;
    let renderer: ReturnType<typeof createRenderer> | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    setReady(false); setError('');
    void (async () => {
      let assets: Awaited<ReturnType<typeof preloadAssets>> | undefined;
      try {
        assets = await preloadAssets(game, event.release?.asset_base_url, event.release?.asset_manifest_hash);
        if (!active || !parent.current) { releaseAssets(assets); return; }
        const context = createContext(game);
        let state = createState(context), sequence = 0;
        renderer = createRenderer(parent.current, view(state), assets); assets = undefined;
        if (!await renderer.ready || !active) return;
        setReady(true);
        timer = setInterval(() => {
          if (pause.current) return;
          if (state.conclusion || state.tick >= 240) { state = createState(context); sequence = 0; }
          const tick = state.tick + 1;
          const inputs: GameInput[] = [];
          const teaching = view(state);
          if (teaching.game_id === 'stack' && teaching.moving_tray?.phase === 'SWING' && Math.abs(teaching.moving_tray.center.x_u - teaching.top_support.center.x_u) < 6000) inputs.push({ tick, seq: ++sequence, type: 'DROP', value: null });
          if (game === 'runner' && tick % 60 === 35) inputs.push({ tick, seq: ++sequence, type: 'JUMP', value: null });
          if (game === 'herd') {
            inputs.push({ tick, seq: ++sequence, type: 'DOG_MOVE', value: { x: tick < 100 ? 1000 : tick < 160 ? -1000 : 0, y: -1000 } });
            if (tick === 60) inputs.push({ tick, seq: ++sequence, type: 'BARK', value: null });
          }
          state = step(context, state, { tick, inputs }).state;
          renderer?.render(view(state));
        }, 1000 / 30);
      } catch (cause) { if (assets) releaseAssets(assets); if (active) setError(message(cause)); }
    })();
    return () => { active = false; if (timer) clearInterval(timer); renderer?.destroy(); };
  }, [game, event.release?.asset_base_url, event.release?.asset_manifest_hash, revision]);
  return <section className="teaching-scene" aria-label="玩法教学演示，不计分" data-lesson={lesson}>
    <div className={`game-stage stage-${game}`} ref={parent} />
    {!ready && !error && <Notice>正在加载本款游戏教学场景……</Notice>}
    {error && <Notice error>{error}<button onClick={() => setRevision(value => value + 1)}>重试教学场景</button></Notice>}
    <p>教学演示 · 不占正式机会、不入账</p>
    <button disabled={!ready} onClick={() => { pause.current = !pause.current; setPaused(pause.current); }}>{paused ? '继续演示' : '暂停演示'}</button>
  </section>;
}
