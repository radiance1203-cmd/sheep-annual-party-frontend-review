import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {BUILD,RULES,createContext,createState,step,view,canonicalJson,sha256Utf8,normalizeInputs} from '@sheep/game-core';
import type {GameId,GameState,RawInput,SimulationEvent} from '@sheep/game-core';
import type {ArtCatalog,ArtCase,ArtTrajectory} from './art-contracts';
const out='output/repair-20261027/audit/art-runtime';await mkdir(out,{recursive:true});
interface Trace {states:GameState[];events:readonly SimulationEvent[][];inputs:RawInput[]}
const traces=new Map<string,Trace>();const trajectories:ArtTrajectory[]=[];const cases:ArtCase[]=[];
async function trace(id:string,game:GameId,inputs:RawInput[],provenance:string):Promise<Trace>{
 const context=createContext(game);let state=createState(context),cursor=0;const states=[state];const events:SimulationEvent[][]=[[]];
 while(!state.conclusion){const tick=state.tick+1;const batch:RawInput[]=[];while(inputs[cursor]?.tick===tick)batch.push(inputs[cursor++]!);const next=step(context,state,{tick,inputs:batch});state=next.state;states.push(state);events.push([...next.events]);}
 const used=inputs.filter(i=>i.tick<=state.tick);assert.ok(normalizeInputs(game,used,state.tick).ok);const t={states,events,inputs:used};traces.set(id,t);trajectories.push({id,game,inputs:used,endTick:state.tick,provenance,inputHash:await sha256Utf8(canonicalJson(used)),finalStateHash:await sha256Utf8(canonicalJson(state))});return t;
}
async function add(id:string,trajectory:string,tick:number,primary:boolean,features:ArtCase['features']={}){const t=traces.get(trajectory);assert.ok(t);const state=t.states[tick];assert.ok(state);const shown=view(state);assert.ok(!cases.some(c=>c.id===id));cases.push({id,trajectory,game:state.game_id,tick,view:shown,viewHash:await sha256Utf8(canonicalJson(shown)),stateHash:await sha256Utf8(canonicalJson(state)),prefixHash:await sha256Utf8(canonicalJson({inputs:t.inputs.filter(i=>i.tick<=tick),tick})),primary,features});}

// Decide only input timing; every position/stat/phase below comes from core.step.
let stack=createState(createContext('stack'));const stackInputs:RawInput[]=[];
while(!stack.conclusion){assert.equal(stack.game_id,'stack');if(stack.game_id!=='stack')throw Error('game');const tick=stack.tick+1;const batch:RawInput[]=stack.phase==='READY'&&Math.abs(stack.x-stack.top_x)<=RULES.stack.perfect_center_error_u?[{tick,seq:stackInputs.length+1,type:'DROP',value:null}]:[];stackInputs.push(...batch);stack=step(createContext('stack'),stack,{tick,inputs:batch}).state;}
assert.ok(stack.game_id==='stack'&&stack.stats.success_layers===20,'legal perfect-input trajectory must reach 20');
const st=await trace('stack-perfect','stack',stackInputs,'Synthetic deterministic legal DROP timing using frozen perfect alignment threshold; no state edits');
for(const count of [1,4,8,20]){
 const landing=st.states.findIndex(s=>s.game_id==='stack'&&s.stats.success_layers===count);assert.ok(landing>0);await add(`stack-${count}-layers`,'stack-perfect',landing,true,{layers:count,phase:'landing-or-terminal'});
 let beginning=landing-1;while(beginning>0){const previous=st.states[beginning-1];if(previous?.game_id!=='stack'||previous.stats.success_layers!==count-1||previous.phase==='SETTLING')break;beginning--;}
 let end=landing;while(end+1<st.states.length){const next=st.states[end+1];if(next?.game_id!=='stack'||next.phase!=='SETTLING')break;end++;}
 for(let tick=beginning;tick<=end;tick++){const state=st.states[tick]!;const v=view(state);if(v.game_id!=='stack')throw Error('game');await add(`stack-${count}-${v.moving_tray?.phase??'END'}-t${tick}`,'stack-perfect',tick,false,{targetLayer:count,phase:v.moving_tray?.phase??'END',everyTick:true});}
 if(end+1<st.states.length)await add(`stack-${count}-next-SWING`,'stack-perfect',end+1,true,{layers:count,phase:'SWING'});
}
await add('stack-terminal-20','stack-perfect',st.states.length-1,true,{terminal:true,layers:20});

const runnerInputs:RawInput[]=RULES.runner.golden_full_score_jump_ticks.map((tick,i)=>({tick,seq:i+1,type:'JUMP',value:null}));
const rt=await trace('runner-golden','runner',runnerInputs,'Frozen golden_full_score_jump_ticks from RULES.runner');
for(const width of [8,18,28]){const tick=rt.states.findIndex(s=>{const v=view(s);return v.game_id==='runner'&&v.obstacles.some(o=>(o.bounds.max_x_u-o.bounds.min_x_u)===width*1000&&o.bounds.min_x_u>=160000&&o.bounds.min_x_u<=280000);});assert.ok(tick>=0);await add(`runner-hurdle-width-${width}`,'runner-golden',tick,true,{obstacleWidth:width});}
const outerOnly=rt.states.findIndex(s=>s.game_id==='runner'&&s.grass.some(g=>g.outer&&!g.inner&&g.world_x-s.distance_u>=0&&g.world_x-s.distance_u<=360000));assert.ok(outerOnly>0,'golden trace has outer-only state');
const outerState=rt.states[outerOnly];assert.ok(outerState?.game_id==='runner');const targetGrass=outerState.grass.find(g=>g.outer&&!g.inner)!.id;
const beforeOuter=rt.states.findLastIndex((s,i)=>i<outerOnly&&s.game_id==='runner'&&s.grass.some(g=>g.id===targetGrass&&!g.outer&&!g.inner));
const both=rt.states.findIndex((s,i)=>i>=outerOnly&&s.game_id==='runner'&&s.grass.some(g=>g.id===targetGrass&&g.outer&&g.inner));assert.ok(beforeOuter>=0&&both>=outerOnly);
await add('runner-grass-uncollected','runner-golden',beforeOuter,true,{grassId:targetGrass,outer:false,inner:false});await add('runner-grass-outer-only','runner-golden',outerOnly,true,{grassId:targetGrass,outer:true,inner:false});await add('runner-grass-both','runner-golden',both,true,{grassId:targetGrass,outer:true,inner:true});
const jump=rt.events.findIndex(e=>e.some(v=>v.type==='JUMP_ACCEPTED'));const apex=rt.states.findIndex((s,i)=>i>jump&&s.game_id==='runner'&&s.vy>=0&&s.feet_y<RULES.runner.ground_y_u);const landing=rt.states.findIndex((s,i)=>i>jump&&s.game_id==='runner'&&s.feet_y===RULES.runner.ground_y_u);assert.ok(jump>0&&apex>jump&&landing>apex);
for(const [name,tick]of [['takeoff',jump],['air-apex',apex],['landing',landing]] as const)await add(`runner-${name}`,'runner-golden',tick,true,{motion:name});
const collision=await trace('runner-no-jumps','runner',[],'Legal zero-input diagnostic trace; no official score submission');const hit=collision.events.findIndex(e=>e.some(v=>v.type==='OBSTACLE_COLLISION'));assert.ok(hit>0);await add('runner-collision-before','runner-no-jumps',hit-1,true,{collision:false});await add('runner-collision-on','runner-no-jumps',hit,true,{collision:true});await add('runner-terminal-golden','runner-golden',1350,true,{terminal:true});

const directions=[['e',1000,0],['se',1000,1000],['s',0,1000],['sw',-1000,1000],['w',-1000,0],['nw',-1000,-1000],['n',0,-1000],['ne',1000,-1000]] as const;
for(const [name,x,y]of directions){let seq=0;const inputs:RawInput[]=[];for(let tick=1;tick<=8;tick++){inputs.push({tick,seq:++seq,type:'DOG_MOVE',value:{x,y}});if(tick===3)inputs.push({tick,seq:++seq,type:'BARK',value:null});}await trace(`herd-direction-${name}`,'herd',inputs,'Legal eight-direction DOG_MOVE prefix plus tick3 BARK; natural remainder remains no-input');await add(`herd-direction-${name}-walk`,`herd-direction-${name}`,2,true,{direction:name,action:'walk'});await add(`herd-direction-${name}-bark`,`herd-direction-${name}`,3,false,{direction:name,action:'bark'});await add(`herd-direction-${name}-bark-active`,`herd-direction-${name}`,7,false,{direction:name,action:'bark-active'});}
const golden=JSON.parse(await readFile('acceptance/golden_herd_inputs.json','utf8')) as {inputs:RawInput[];synthetic:boolean};assert.equal(golden.synthetic,true);const ht=await trace('herd-golden','herd',golden.inputs,'Existing acceptance/golden_herd_inputs.json synthetic legal prefix, seed47');await add('herd-eight-initial','herd-golden',0,true,{sheepCount:8});
for(let tick=1;tick<ht.events.length;tick++){for(const e of ht.events[tick]??[])if(e.type==='SHEEP_PENNED'){await add(`herd-entry-${e.entity_id}-before`,'herd-golden',tick-1,false,{sheepId:e.entity_id??0,entry:false});await add(`herd-entry-${e.entity_id}-after`,'herd-golden',tick,true,{sheepId:e.entity_id??0,entry:true});}}
const h=RULES.herd;const gateMid=(h.gate_open_x_u[0]!+h.gate_open_x_u[1]!)/2;let crowdTick=0,maxCrowd=-1;
for(const s of ht.states){if(s.game_id!=='herd')throw Error('game');const count=s.sheep.filter(sheep=>!sheep.in_pen&&Math.abs(sheep.y-h.fence_y_u)<=3*h.sheep_radius_u&&Math.abs(sheep.x-gateMid)<=(h.gate_open_x_u[1]!-h.gate_open_x_u[0]!)/2+2*h.sheep_radius_u).length;if(count>maxCrowd){maxCrowd=count;crowdTick=s.tick;}}
await add('herd-gate-most-crowded','herd-golden',crowdTick,true,{crowdCount:maxCrowd,metric:'un-penned within 3 sheep radii vertically, gate span plus 2 radii horizontally'});await add('herd-golden-terminal','herd-golden',ht.states.length-1,true,{terminal:true});
const result:ArtCatalog={createdAt:new Date().toISOString(),scope:'Standalone renderer diagnostics derived exclusively by actual frozen game-core input replay. Synthetic inputs; not business UI, server scoring, human or final art approval.',build:BUILD,rulesFileHash:createHash('sha256').update(await readFile('config/game_rules.v2.1.json')).digest('hex'),trajectories,cases};
await writeFile(`${out}/core-derived-states.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({trajectories:trajectories.length,cases:cases.length,primary:cases.filter(c=>c.primary).length,stackEnd:st.states.at(-1)?.tick,grassTarget:targetGrass,herdEnd:ht.states.at(-1)?.tick,maxCrowd,crowdTick}));
