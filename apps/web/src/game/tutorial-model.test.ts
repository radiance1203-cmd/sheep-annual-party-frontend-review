import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeInputs } from '@sheep/game-core';
import { createTeachingReplay } from './tutorial-model';

describe('R2 tutorial time ownership', () => {
  it('does not complete teaching from an independent four-second wall timer', () => {
    const source = readFileSync('apps/web/src/App.tsx', 'utf8');
    expect(source).not.toContain('setLesson(value => Math.min(3, value + 1)), 4000');
  });
  it('does not discard a legal teaching replay at tick 240 before entry/collection events', () => {
    const source = readFileSync('apps/web/src/game/TutorialScene.tsx', 'utf8');
    expect(source).not.toContain('state.tick >= 240');
  });
  it('keeps cumulative statistics outside transient feedback', () => {
    expect(readFileSync('apps/web/src/game/GamePage.tsx','utf8')).toContain('className="game-cumulative"');
  });
});

describe('R2 legal event-confirmed teaching replays',()=>{
  for (const game of ['stack','runner','herd'] as const) {
    it(`${game} completes only from actual ordered shared-core events`,()=>{
      const replay=createTeachingReplay(game);
      expect(replay.progress().complete).toBe(false);
      const ticks:number[]=[];
      for(let i=0;i<1350 && !replay.progress().complete;i++) {
        const output=replay.advance();
        expect(output).not.toBeNull();
        if(output) ticks.push(output.state.tick);
      }
      expect(replay.progress().complete).toBe(true);
      expect(ticks).toEqual(Array.from({length:ticks.length},(_,i)=>i+1));
      expect(normalizeInputs(game,replay.inputs,replay.progress().tick).ok).toBe(true);
      const frozen=replay.snapshot();
      expect(replay.advance()).toBeNull();
      expect(replay.snapshot()).toEqual(frozen);
      if(game==='runner') expect(replay.progress().events).toEqual(expect.arrayContaining(['GRASS_OUTER','GRASS_INNER']));
      if(game==='herd') expect(replay.progress().events).toContain('SHEEP_PENNED');
    });
    it(`${game} can continue the same legal input path through natural conclusion for motion samples`,()=>{
      const replay=createTeachingReplay(game,{stopOnComplete:false});
      while(!replay.snapshot().conclusion && replay.progress().tick<1350) expect(replay.advance()).not.toBeNull();
      expect(replay.progress().complete).toBe(true);
      expect(replay.snapshot().conclusion).not.toBeNull();
      expect(replay.advance()).toBeNull();
      expect(normalizeInputs(game,replay.inputs,replay.progress().tick).ok).toBe(true);
    });
  }
});
