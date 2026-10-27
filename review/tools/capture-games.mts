import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fixtures, defaultReply, ids } from '../../apps/web/tests/page-state-fixtures.ts';
import { BUILD, RULES, canonicalJson, sha256Utf8 } from '../../packages/game-core/src/index.ts';
const checkpoints=JSON.parse(await readFile('review/checkpoints.json','utf8'));
const batch=process.argv[2]??'games';const output=`output/visual-repair-v1/${batch}`;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});const captures:unknown[]=[];
try{
 for(const width of (process.env.WIDTHS??'320,360,390,430').split(',').map(Number))for(const game of ((process.env.GAMES??'stack,runner,herd').split(',') as ('stack'|'runner'|'herd')[])){
  const height=width===320?740:width===360?800:width===430?932:844;
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  let now=Date.now();await page.clock.install({time:now});
  const f=fixtures({phase:'PLAYING',active:true,sessionState:'RUNNING',slots:2});const cp=checkpoints[game];
  f.event.name='羊年游园会';f.me.participant.display_name='隔离重放样例';f.me.participant.honor_total=0;f.me.participant.wallet_balance=0;
  Object.assign(f.session,{game_id:game,seed:RULES.common.official_logic_seed_by_game[game],created_at:new Date(now-cp.tick*1000/30-3000).toISOString(),play_started_at:new Date(now-cp.tick*1000/30).toISOString(),play_ends_at:new Date(now-cp.tick*1000/30+45000).toISOString(),submit_deadline:new Date(now-cp.tick*1000/30+60000).toISOString()});
  f.me.active_session=f.session;
  const requests:{path:string;method:string}[]=[];const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;const method=route.request().method();requests.push({path,method});
   if(method!=='GET')throw new Error(`Checkpoint screenshot attempted ${method} ${path}`);
   const r=defaultReply(path,f,{});const body={...(r.body as object),server_now:new Date(now).toISOString()};
   await route.fulfill({status:r.status,json:body});
  });
  await page.goto(`${process.env.REVIEW_ORIGIN??'http://127.0.0.1:5175'}/#/play/${game}`);
  try{await page.getByRole('button',{name:'恢复原局 / 重试原开局请求'}).waitFor({timeout:1500});}
  catch(error){await page.screenshot({path:`${output}/fixture-initialization-failure.png`,fullPage:true});await writeFile(`${output}/fixture-initialization-failure.json`,JSON.stringify({body:await page.locator('body').innerText(),requests,errors,error:String(error)},null,2));throw error;}
  // Let React's lazy import/Suspense mount before freezing fixture time.
  now=await page.evaluate(()=>Date.now())+100;await page.clock.pauseAt(now);
  Object.assign(f.session,{created_at:new Date(now-cp.tick*1000/30-3000).toISOString(),play_started_at:new Date(now-cp.tick*1000/30).toISOString(),play_ends_at:new Date(now-cp.tick*1000/30+45000).toISOString(),submit_deadline:new Date(now-cp.tick*1000/30+60000).toISOString()});
  const record={version:1,start:{idempotency_key:ids.instance,game_id:game,client_instance_id:ids.instance,controller_secret:'s'.repeat(43),build:BUILD},session:f.session,inputs:cp.inputs,processedTick:cp.tick,logDigest:await sha256Utf8(canonicalJson({inputs:cp.inputs,tick:cp.tick})),sealed:null};
  await page.evaluate(async({record,key})=>{
   await new Promise<void>((resolve,reject)=>{const open=indexedDB.open('sheep-onsite-v2.1',1);open.onupgradeneeded=()=>open.result.createObjectStore('records');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const tx=db.transaction('records','readwrite');tx.objectStore('records').put(record,key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
  },{record,key:`run:${ids.participant}`});
  await page.getByRole('button',{name:'恢复原局 / 重试原开局请求'}).click();
  await page.locator('canvas').waitFor();
  await page.clock.runFor(Number(process.env.FRAME_MS??165));
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>undefined)));scrollTo(0,0);});
  const metrics=await page.evaluate(()=>({dpr:devicePixelRatio,zoom:visualViewport?.scale,fontReady:document.fonts.status,font:getComputedStyle(document.querySelector('.app')!).fontFamily,scrollWidth:document.documentElement.scrollWidth,tick:Number(document.querySelector('.game-stage')?.getAttribute('data-game-tick')),hud:document.querySelector('.hud')?.textContent,feedback:document.querySelector('.game-feedback')?.textContent,canvas:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height,cssWidth:c.getBoundingClientRect().width,cssHeight:c.getBoundingClientRect().height})),controls:[...document.querySelectorAll<HTMLElement>('button,.joystick')].filter(e=>e.getBoundingClientRect().width).map(e=>({text:e.textContent,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize})),smallText:[...document.querySelectorAll<HTMLElement>('p,small,.mode-badge')].filter(e=>e.getBoundingClientRect().width&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>({text:e.textContent,font:getComputedStyle(e).fontSize}))}));
  Object.assign(metrics,{canvasLayout:await page.locator('canvas').evaluate(c=>({style:c.getAttribute('style'),rect:c.getBoundingClientRect().toJSON(),parent:c.parentElement?.getBoundingClientRect().toJSON()}))});
  const prefix=`${output}/GC-0${game==='stack'?1:game==='runner'?2:3}-${width}`;
  await page.screenshot({path:`${prefix}-first.png`});await page.screenshot({path:`${prefix}-full.png`,fullPage:true});
  captures.push({game,width,height,dpr:1,zoom:metrics.zoom,browser:browser.version(),build:BUILD,scope:'isolated schema response + actual core-derived restored-prefix fixture; no server scoring or real device',sourceCheckpoint:cp.tick,prefixDigest:record.logDigest,expectedPerformance:cp.performance,expectedStats:cp.view.stats,apiMutations:requests.filter(r=>r.method!=='GET').length,errors,metrics,screenshots:[`${prefix}-first.png`,`${prefix}-full.png`]});
  if(!metrics.hud?.includes(String(cp.performance)))throw new Error(`HUD mismatch ${game}: ${metrics.hud}`);
  if(errors.length||requests.some(r=>r.method!=='GET'))throw new Error('Fixture runtime or mutation error');
  await page.close();
 }
 const manifest=await readFile('apps/web/public/assets/asset-manifest.v1.json');
 await writeFile(`${output}/captures.json`,JSON.stringify({at:new Date().toISOString(),manifestHash:createHash('sha256').update(manifest).digest('hex'),assetVersion:JSON.parse(manifest.toString()).art_version,captures},null,2));
 console.log(JSON.stringify({captures:captures.length,output}));
}finally{await browser.close();}
