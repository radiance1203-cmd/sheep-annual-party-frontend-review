import { RULES, ceilSqrt, createContext, createState, step, truncDiv, unit1024, view } from '@sheep/game-core';
import type { GameId, GameInput, GameView, SimulationEvent } from '@sheep/game-core';

export interface TeachingProgress { step: number; complete: boolean; tick: number; events: readonly SimulationEvent['type'][]; }
const checkpoints: Record<GameId, readonly SimulationEvent['type'][]> = {
  stack: ['DROP_ACCEPTED', 'LAYER_LANDED'],
  runner: ['JUMP_ACCEPTED', 'OBSTACLE_PASSED', 'GRASS_OUTER', 'GRASS_INNER'],
  herd: ['DOG_MOVED', 'BARK_TRIGGERED', 'SHEEP_PENNED'],
};
export const teachingInstructions: Record<GameId, readonly string[]> = {
  stack: ['看托盘靠近下层，等待对齐。', '真实放下已触发：观察下落与接触。', '已叠稳：对齐越准，表现越好。'],
  runner: ['小羊自动向前跑，等待合适起跳点。', '已真实起跳并越栏：继续观察双层福草。', '观察真实外圈与金芯采集；两者分别计分。'],
  herd: ['牧羊犬先绕到羊群后方，引导它们朝上方入口移动。', '已真实吠叫：看羊群逐只穿过上方真实门线。', '已真实入圈：在圈内停稳，不需要再次驱赶。'],
};

// Only generates legal local tutorial inputs. All movement, contact and scoring
// remain authoritative in the unchanged shared core; no session/API exists here.
export function createTeachingReplay(game: GameId, options: {stopOnComplete?: boolean} = {}) {
  const context = createContext(game);
  let state = createState(context), sequence = 0;
  const seen = new Set<SimulationEvent['type']>();
  const inputs: GameInput[] = [];
  const progress = (): TeachingProgress => ({
    step: game === 'stack' ? seen.has('LAYER_LANDED') ? 2 : seen.has('DROP_ACCEPTED') ? 1 : 0
      : game === 'runner' ? seen.has('OBSTACLE_PASSED') ? 2 : seen.has('JUMP_ACCEPTED') ? 1 : 0
      : seen.has('SHEEP_PENNED') ? 2 : seen.has('BARK_TRIGGERED') ? 1 : 0,
    complete: checkpoints[game].every(type => seen.has(type)), tick: state.tick, events: [...seen],
  });
  return {
    snapshot: (): GameView => view(state), progress, inputs,
    advance() {
      if (state.conclusion || options.stopOnComplete !== false && progress().complete) return null;
      const tick = state.tick + 1, batch: GameInput[] = [];
      if (game === 'stack' && RULES.stack.golden_full_score_drop_ticks.includes(tick)) batch.push({tick,seq:++sequence,type:'DROP',value:null});
      if (game === 'runner' && RULES.runner.golden_full_score_jump_ticks.includes(tick)) batch.push({tick,seq:++sequence,type:'JUMP',value:null});
      if (state.game_id === 'herd') {
        const active = state.sheep.filter(s => !s.in_pen);
        if (active.length) {
          const cx = truncDiv(active.reduce((sum,s)=>sum+s.x,0),active.length), cy = truncDiv(active.reduce((sum,s)=>sum+s.y,0),active.length);
          const [ux,uy] = unit1024(cx-180000,cy-60000);
          const dx = cx+truncDiv(ux*55000,1024)-state.dog.x, dy = cy+truncDiv(uy*55000,1024)-state.dog.y;
          const den = Math.max(3200,ceilSqrt(dx*dx+dy*dy));
          batch.push({tick,seq:++sequence,type:'DOG_MOVE',value:{x:truncDiv(dx*1000,den),y:truncDiv(dy*1000,den)}});
          if (tick>=60 && tick>=state.next_bark_tick) batch.push({tick,seq:++sequence,type:'BARK',value:null});
        }
      }
      inputs.push(...batch);
      const output=step(context,state,{tick,inputs:batch}); state=output.state;
      output.events.forEach(event=>seen.add(event.type));
      return output;
    },
  };
}
