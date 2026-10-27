import { createTeachingReplay } from '../src/game/tutorial-model';
import { canonicalJson } from '@sheep/game-core';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const out='output/r2-20261027/frontend'; await mkdir(out,{recursive:true});
const rows=[];
for(const game of ['stack','runner','herd'] as const){
  const replay=createTeachingReplay(game,{stopOnComplete:false});
  const events=[];let tutorialCompleteTick:null|number=null;
  while(!replay.snapshot().conclusion){
    const output=replay.advance();if(!output)break;
    events.push(...output.events);
    if(replay.progress().complete && tutorialCompleteTick===null)tutorialCompleteTick=output.view.tick;
  }
  const log={game,scope:'synthetic legal local teaching controller; unchanged shared core; no API/session',tutorialCompleteTick,endTick:replay.snapshot().tick,conclusion:replay.snapshot().conclusion,inputs:replay.inputs,events};
  const sha256=createHash('sha256').update(canonicalJson(log)).digest('hex');
  await writeFile(`${out}/${game}-legal-replay.json`,JSON.stringify({...log,sha256},null,2));
  rows.push({game,tutorialCompleteTick,endTick:replay.snapshot().tick,inputCount:replay.inputs.length,eventCount:events.length,sha256});
}
await writeFile(`${out}/legal-replay-index.json`,JSON.stringify(rows,null,2)); console.log(JSON.stringify(rows));
