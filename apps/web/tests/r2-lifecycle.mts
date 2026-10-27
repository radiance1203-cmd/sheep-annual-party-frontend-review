import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
const out='output/r2-20261027/lifecycle';await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true});const results:object[]=[];
try{
 for(const game of ['stack','runner','herd']){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});await page.clock.install();await page.goto(`http://127.0.0.1:5175/tests/r2-preview.html?game=${game}`);await page.waitForFunction(()=>Boolean((window as any).r2));
  await page.getByRole('button',{name:'开始实速回放'}).click();
  for(const ms of [100,250,1000]){await page.clock.runFor(ms);const d=await page.evaluate(()=>(window as any).r2.diagnostics());assert(d.coreTick>0);results.push({game,catchupMs:ms,tick:d.coreTick,eventCount:d.eventLog.length});}
  await page.getByRole('button',{name:'暂停',exact:true}).click();const paused=await page.evaluate(()=>(window as any).r2.diagnostics());await page.clock.runFor(1000);const still=await page.evaluate(()=>(window as any).r2.diagnostics());assert.equal(still.coreTick,paused.coreTick);assert.equal(still.displayTime,paused.displayTime);
  await page.getByRole('button',{name:'暂停',exact:true}).click();await page.clock.runFor(250);
  const beforeCatchupTick=await page.evaluate(()=>(window as any).r2.diagnostics().coreTick);await page.evaluate(()=>(window as any).r2.advanceTicks(1350));await page.clock.runFor(50);const end=await page.evaluate(()=>(window as any).r2.diagnostics());assert(end.snapshot.conclusion);assert.deepEqual(end.snapshot,await page.evaluate(()=>(window as any).r2.replayPrefix()));
  const count=end.events.length;await page.evaluate(()=>(window as any).r2.repeatLastBatch());await page.clock.runFor(50);assert.equal(await page.evaluate(()=>(window as any).r2.diagnostics().events.length),count);
  const oldDecorations=end.events.filter((e:any)=>['LAYER_LANDED','LAYER_MISSED','OBSTACLE_COLLISION','GRASS_OUTER','GRASS_INNER','BARK_TRIGGERED','SHEEP_PENNED'].includes(e.event.type)&&end.coreTick-e.event.tick>54&&e.event.tick>beforeCatchupTick);await writeFile(`${out}/${game}-ttl-diagnostic.json`,JSON.stringify({tick:end.coreTick,time:end.displayTime,beforeCatchupTick,oldDecorations},null,2));assert(oldDecorations.every((e:any)=>e.decorationOmitted==='expired'),'catch-up decorations older than 1800ms in core time must be omitted: '+JSON.stringify(oldDecorations.map((e:any)=>({tick:e.event.tick,time:e.timeMs,reason:e.decorationOmitted}))));
  const hashes:string[]=[];for(let i=0;i<3;i++){hashes.push(createHash('sha256').update(await page.locator('canvas').screenshot()).digest('hex'));if(i<2)await page.clock.runFor(500);}
  const end2=await page.evaluate(()=>(window as any).r2.diagnostics());assert.deepEqual(end2.snapshot,end.snapshot);assert.equal(end2.coreTick,end.coreTick);assert(new Set(hashes).size>1,'celebration must advance while core stays terminal');
  if(game==='herd'){const last=end.eventLog.filter((e:any)=>e.event.tick===end.coreTick).map((e:any)=>e.event.type);assert(last.includes('SHEEP_PENNED')&&last.includes('GAME_ENDED'));results.push({lastTickTypes:last});}
  await page.getByRole('button',{name:'重播',exact:true}).click();await page.clock.runFor(30);const reset=await page.evaluate(()=>(window as any).r2.diagnostics());assert.equal(reset.coreTick,0);assert.equal(reset.events.length,0);assert.equal(reset.scene.effects,0);
  if(game==='herd')assert(reset.scene.sprites.filter((s:any)=>s.id.startsWith('actor:')).every((s:any)=>s.action==='idle'),'new ready session must not inherit walking from old positions');
  const refs=reset.scene.sprites.map((s:any)=>({id:s.id,instance:s.instance}));await page.clock.runFor(300);const idle=await page.evaluate(()=>(window as any).r2.diagnostics());assert.deepEqual(idle.scene.sprites.map((s:any)=>({id:s.id,instance:s.instance})),refs);
  results.push({game,endTick:end.coreTick,terminalHashes:hashes,coreStable:true,duplicateBatchSuppressed:true,restartCleared:true,persistentSpriteRefs:true,textureCount:end.textures,resetTextureCount:reset.textures});await page.close();
 }
 // Exactly one candidate direction, using only legal inputs; missing directions remain labelled.
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});await page.goto('http://127.0.0.1:5175/tests/r2-preview.html?game=herd&candidate=r2a');await page.waitForFunction(()=>Boolean((window as any).r2));
 await page.evaluate(()=>{const inputs:any[]=[];for(let tick=60;tick<=63;tick++){inputs.push({tick,seq:inputs.length+1,type:'DOG_MOVE',value:{x:1000,y:1000}});if(tick===60)inputs.push({tick,seq:inputs.length+1,type:'BARK',value:null});}(window as any).r2.manualReplay(inputs,63);});await page.waitForTimeout(120);const candidate=await page.evaluate(()=>(window as any).r2.diagnostics());const dog=candidate.scene.sprites.find((s:any)=>s.id==='actor:dog');assert.equal(dog.action,'walk_bark');assert.equal(dog.facing,'se');await page.screenshot({path:`${out}/herd-candidate-walk-bark-se.png`});results.push({candidate:true,dog,tick:candidate.coreTick,scope:'r2a SE only, controlled legal prefix, other directions v4'});await page.close();
}finally{await browser.close();}
await writeFile(`${out}/results.json`,JSON.stringify({results},null,2));console.log(JSON.stringify({out,checks:results.length}));
