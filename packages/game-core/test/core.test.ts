import {describe,it,expect} from 'vitest';
import { createContext, createState, step, normalizeInputs, replay, previewAward, canonicalJson, unit1024, normalizeMove, sweepMove, serialize, deserialize, performancePoints, RULES } from '../src/index.js';
import golden from '../../../acceptance/golden_herd_inputs.json';
import type { GameId, RawInput } from '../src/contracts/types.js';
function run(game:GameId,inputs:readonly RawInput[]) {
 const c=createContext(game);let s=createState(c);
 while(!s.conclusion) s=step(c,s,{tick:s.tick+1,inputs:inputs.filter(e=>e.tick===s.tick+1)}).state;
 return s;
}
describe('frozen games and portable integer math',()=>{
 it('reports live performance from the core',()=>{const c=createContext('stack');let s=createState(c);for(let tick=1;tick<=49;tick++)s=step(c,s,{tick,inputs:tick===37?[{tick,seq:1,type:'DROP',value:null}]:[]}).state;expect(performancePoints(s)).toBe(4);});
 it('returns immutable snapshots and validates checkpoint restoration',()=>{const c=createContext('herd'); const s=createState(c);expect(Object.isFrozen(s)).toBe(true); const next=step(c,s,{tick:1,inputs:[]}).state;expect(Object.isFrozen(next)).toBe(true);expect(deserialize(c,serialize(next))).toEqual(next);expect(()=>deserialize(c,{...serialize(next),tick:1.5})).toThrow();expect(()=>deserialize(c,{...serialize(next),dog:{x:180000,y:76000,facing:6}})).toThrow();});

 it('stack golden ends at 966 with 20 perfect whole trays',()=>{const s=run('stack',RULES.stack.golden_full_score_drop_ticks.map((tick,i)=>({tick,seq:i+1,type:'DROP',value:null})));expect(s.conclusion).toMatchObject({end_tick:966,end_reason:'GOAL_REACHED',performance_points:80,accepted_actions_count:20});expect(previewAward(s.conclusion!,createContext('stack').rules).predicted_points).toBe(100);});
 it('runner golden always runs full 1350 and independently collects both rings',()=>{const s=run('runner',RULES.runner.golden_full_score_jump_ticks.map((tick,i)=>({tick,seq:i+1,type:'JUMP',value:null})));expect(s.conclusion).toMatchObject({end_tick:1350,end_reason:'TIME_LIMIT',performance_points:80,stats:{safe_passed:20,collision_count:0,outer_collected:10,inner_collected:10}});});
 it('herd frozen golden ends at 225 with eight sheep',()=>{const n=normalizeInputs('herd',golden.inputs,225);expect(n.ok).toBe(true);if(!n.ok)return; const s=run('herd',n.inputs);expect(s.conclusion).toMatchObject({end_tick:225,end_reason:'GOAL_REACHED',performance_points:80,stats:{penned_count:8,time_bonus_points:32}});});
 it('optionally reports actual sheep entry ticks without changing replay hashes',async()=>{
  const n=normalizeInputs('herd',golden.inputs,225);if(!n.ok)throw new Error('invalid fixture');
  const base={context:createContext('herd'),inputs:n.inputs,declared_end_tick:225,declared_end_reason:'GOAL_REACHED' as const};
  const plain=await replay(base), traced=await replay({...base,collect_diagnostics:true});
  expect(traced).toMatchObject({ok:true,diagnostics:{sheep_entry_ticks:[{tick:87,sheep_id:2},{tick:97,sheep_id:3},{tick:100,sheep_id:7},{tick:107,sheep_id:6},{tick:125,sheep_id:4},{tick:136,sheep_id:1},{tick:220,sheep_id:8},{tick:225,sheep_id:5}]}});
  expect(plain).not.toHaveProperty('diagnostics');
  if(!plain.ok||!traced.ok)throw new Error('expected golden replay');
  expect(traced.final_state_hash).toBe(plain.final_state_hash);expect(traced.conclusion).toEqual(plain.conclusion);
 });
 it.each(['stack','runner','herd'] as const)('%s zero input grants no participation',g=>{const s=run(g,[]);expect(s.conclusion?.end_tick).toBe(1350);expect(previewAward(s.conclusion!,createContext(g).rules).predicted_points).toBe(0);});
 it('ignores identical seq including omitted value, rejects conflicting seq/order/count',()=>{expect(normalizeInputs('stack',[{tick:1,seq:1,type:'DROP'},{tick:1,seq:1,type:'DROP',value:null}],1350)).toMatchObject({ok:true,inputs:[{tick:1,seq:1,type:'DROP',value:null}]});for(const a of [[{tick:2,seq:1,type:'DROP'},{tick:1,seq:2,type:'DROP'}],[{tick:1,seq:1,type:'DROP'},{tick:2,seq:1,type:'DROP'}],Array(4097).fill({tick:1,seq:1,type:'DROP'})])expect(normalizeInputs('stack',a,1350).ok).toBe(false);});
 it('uses ceil square roots and axis swept walls',()=>{expect(unit1024(1,1)).toEqual([512,512]);expect(normalizeMove(1000,1000)).toEqual([706,706]);expect(normalizeMove(1,1000)).toEqual([0,999]);const walls=RULES.herd.expanded_sheep_fence_aabbs_u,bounds=RULES.herd.sheep_center_bounds_u;for(const [p,d,result] of [[[153000,87000],[0,-4000],[153000,86000]],[[154000,87000],[0,-4000],[154000,83000]],[[153000,87000],[2000,-4000],[155000,83000]],[[155000,83000],[-3000,-1000],[154000,82000]]]){if(p&&d&&result)expect(sweepMove(p[0]!,p[1]!,d[0]!,d[1]!,walls,bounds)).toEqual(result);}});
 it('canonicalizes object keys and rejects non-JSON numbers',()=>{expect(canonicalJson({b:-0,a:[1,'羊']})).toBe('{"a":[1,"羊"],"b":0}');expect(()=>canonicalJson({a:NaN})).toThrow();});
 it('replay rejects invented early end and trailing terminal actions',async()=>{const c=createContext('runner');expect(await replay({context:c,inputs:[],declared_end_tick:10,declared_end_reason:'TIME_LIMIT'})).toMatchObject({ok:false,code:'NO_NATURAL_END'});const ticks=RULES.stack.golden_full_score_drop_ticks;const inputs=ticks.map((tick,i)=>({tick,seq:i+1,type:'DROP' as const,value:null}));expect(await replay({context:createContext('stack'),inputs:[...inputs,{tick:967,seq:21,type:'DROP',value:null}],declared_end_tick:967,declared_end_reason:'GOAL_REACHED'})).toMatchObject({ok:false,code:'INPUT_AFTER_END'});});
});
