import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createContext, createState, step, normalizeInputs, previewAward, type RawInput } from '../src/index.js';

const rowSchema = z.object({ game:z.enum(['stack','runner','herd']), inputs:z.array(z.unknown()), expected:z.record(z.string(),z.unknown()), samples:z.array(z.object({tick:z.number(),dog:z.array(z.number()),sheep:z.array(z.tuple([z.number(),z.number(),z.number(),z.boolean()])),rng:z.number()})).optional() });
const python = spawnSync('python',['acceptance/differential_reference.py'],{cwd:process.cwd(),encoding:'utf8',maxBuffer:16*1024*1024});
if(python.status!==0) throw new Error(python.stderr);
const rows=z.array(rowSchema).parse(JSON.parse(python.stdout));

describe('TypeScript versus independent Python reference',()=>{
  for(const [index,row] of rows.entries()) it(`${row.game} independent fixture ${index}`,()=>{
    const context=createContext(row.game), expected=row.expected;
    const end=expected['end_tick']; if(typeof end!=='number')throw new Error('Missing end tick');
    const n=normalizeInputs(row.game,row.inputs,end);if(!n.ok)throw new Error(JSON.stringify(n));
    let state=createState(context), cursor=0;
    while(!state.conclusion){
      const tick=state.tick+1,inputs:RawInput[]=[];
      while(n.inputs[cursor]?.tick===tick){const e=n.inputs[cursor];if(e)inputs.push(e);cursor++;}
      state=step(context,state,{tick,inputs}).state;
      const sample=row.samples?.find(s=>s.tick===tick);
      if(sample && state.game_id==='herd'){
        expect([state.dog.x,state.dog.y]).toEqual(sample.dog);
        expect(state.sheep.map(s=>[s.id,s.x,s.y,s.in_pen])).toEqual(sample.sheep);
        expect(state.rng).toBe(sample.rng);
      }
    }
    const c=state.conclusion;
    expect(c.end_tick).toBe(end);
    expect(c.end_reason).toBe(expected['end_reason']??expected['end']);
    expect(c.performance_points).toBe(expected['performance']);
    expect(previewAward(c,context.rules).predicted_points).toBe(expected['credited']??expected['credit']);
    expect(c.accepted_actions_count).toBe(expected['accepted']??Number(expected['accepted_moves'])+Number(expected['accepted_barks']));
    if(c.game_id==='stack')expect([c.stats.success_layers,c.stats.perfect_layers,c.stats.misses]).toEqual([expected['success'],expected['perfect'],expected['misses']]);
    if(c.game_id==='runner')expect([c.stats.safe_passed,c.stats.collision_count,c.stats.outer_collected,c.stats.inner_collected]).toEqual([expected['safe_passed'],expected['mistakes'],expected['outer_collected'],expected['inner_collected']]);
    if(c.game_id==='herd')expect(c.stats.penned_count).toBe(expected['in_pen']);
  });
});
