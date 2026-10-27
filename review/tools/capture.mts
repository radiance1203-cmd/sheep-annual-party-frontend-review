import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fixtures, defaultReply, failure, ids } from '../../apps/web/tests/page-state-fixtures.ts';
import type { FixtureOptions } from '../../apps/web/tests/page-state-fixtures.ts';
import { BUILD } from '../../packages/game-core/src/index.ts';
const batch = process.argv[2] ?? 'lobby';
const out = `output/visual-repair-v1/${batch}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const captures: unknown[] = [];
const cases: {id:string;route:string;options:FixtureOptions;honor?:number;error?:string;offline?:boolean;loading?:string}[] = batch.startsWith('lobby') ? [
 {id:'LC-01',route:'/',options:{identity:'anonymous',phase:'CHECK_IN'}},
 {id:'LC-02',route:'/',options:{phase:'CHECK_IN'},honor:0},
 {id:'LC-03',route:'/',options:{phase:'PLAYING'},honor:0},
 {id:'LC-04',route:'/',options:{phase:'PLAYING',slots:1},honor:178},
 {id:'LC-05',route:'/',options:{phase:'DRAINING',slots:1},honor:178},
] : [
 {id:'BC-01-verified',route:`/result/${ids.session}`,options:{sessionState:'SETTLED'}},
 {id:'BC-01-pending',route:`/result/${ids.session}`,options:{sessionState:'VERIFYING'}},
 {id:'BC-02-open',route:'/gifts',options:{phase:'REDEEMING'}},
 {id:'BC-02-closed',route:'/gifts',options:{phase:'CLOSED'}},
 {id:'BC-02-frozen',route:`/order/${ids.order}`,options:{phase:'CLOSED',frozen:true,orders:true}},
 {id:'BC-02-claimed',route:`/order/${ids.order}`,options:{phase:'CLOSED',orderStatus:'CLAIMED',orders:true}},
 {id:'BC-03-tied',route:'/leaderboard',options:{}},
 {id:'BC-03-empty',route:'/leaderboard',options:{empty:true}},
 {id:'EC-01-error',route:'/leaderboard',options:{},error:'/api/leaderboard'},
 {id:'EC-01-loading',route:'/leaderboard',options:{},loading:'/api/leaderboard'},
 {id:'EC-01-offline',route:'/',options:{},offline:true},
];
try {
 for(const width of [320,360,390,430]) for(const c of cases) {
  const height=width===320?740:width===360?800:width===430?932:844;
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message));
  const f=fixtures(c.options); f.event.name='羊年游园会'; f.me.participant.display_name='视觉样例同事';
  if(!batch.startsWith('lobby')){f.me.tickets[2]!.state='SPENT';f.me.tickets[2]!.current_session_id=ids.session;f.me.tickets[2]!.current_contribution_points=60;}
  if(c.honor!==undefined){f.me.participant.honor_total=c.honor;f.me.participant.wallet_balance=c.honor;}
  if(c.id==='LC-04'||c.id==='LC-05')for(const t of f.me.tickets)if(t.state==='SPENT'){t.current_contribution_points=89;t.current_session_id=`cccccccc-cccc-4ccc-8ccc-ccccccccccc${t.slot_no}`;}
  if(c.id==='BC-01-verified'&&f.session.settlement){const s=f.session.settlement;s.original_awarded_points=44;s.current_contribution_points=44;f.session.current_contribution_points=44;s.conclusion={game_id:'stack',end_tick:800,end_reason:'THREE_MISSES',accepted_actions_count:11,stats:{success_layers:8,perfect_layers:4,misses:3},performance_points:24};f.me.participant.honor_total=44;f.me.participant.wallet_balance=44;f.me.tickets[2]!.current_contribution_points=44;}
  if(c.id==='BC-01-pending'){f.me.participant.honor_total=0;f.me.participant.wallet_balance=0;f.me.tickets[2]!.current_contribution_points=0;}
  f.gift.name='羊年年会暖心纪念礼品 · 奶油绒毛小羊与红围巾套装';
  f.order.gift_name_snapshot=f.gift.name;
  // Competition rank 1,2,2,4 requires the fourth total to be lower than the tied pair.
  if(f.leaderboard.rows[3])f.leaderboard.rows[3].honor_total=20;
  // Claim screenshots never expose a complete reusable token or QR, including fixtures.
  f.order.voucher_token=null;
  const requests:{method:string;path:string}[]=[];
  if(c.offline)await page.addInitScript(()=>Object.defineProperty(navigator,'onLine',{value:false,configurable:true}));
  await page.route('**/api/**',async route=>{
   const request=route.request();const path=new URL(request.url()).pathname;
   requests.push({method:request.method(),path});
   if(request.method()!=='GET')throw new Error(`Visual fixture attempted mutation ${path}`);
   if(c.loading===path)await new Promise(resolve=>setTimeout(resolve,5000));
   const r=c.error===path?failure():defaultReply(path,f,c.options);
   await route.fulfill({status:r.status,json:r.body});
  });
  await page.goto(`${process.env.REVIEW_ORIGIN??'http://127.0.0.1:5175'}/#${c.route}`);
  try{await page.locator('main').waitFor();}catch(error){await page.screenshot({path:`${out}/initialization-failure.png`,fullPage:true});await writeFile(`${out}/initialization-failure.json`,JSON.stringify({case:c.id,width,error:String(error),pageErrors,body:await page.locator('body').innerText(),requests},null,2));throw error;}
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>undefined)));});
  await page.waitForTimeout(c.loading?180:550);
  const metrics=await page.evaluate(()=>({
   dpr:devicePixelRatio,zoom:visualViewport?.scale,fontReady:document.fonts.status,font:getComputedStyle(document.body).fontFamily,
   width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyHeight:document.documentElement.scrollHeight,
   headings:[...document.querySelectorAll('h1')].map(el=>el.textContent),
   images:[...document.images].map(i=>({src:i.getAttribute('src'),complete:i.complete,decoded:i.naturalWidth>0,width:i.naturalWidth,height:i.naturalHeight,rect:{w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height},fit:getComputedStyle(i).objectFit})),
   controls:[...document.querySelectorAll<HTMLElement>('a,button,input,summary')].filter(el=>el.getBoundingClientRect().width>0).map(el=>({text:el.textContent?.trim().slice(0,60),tag:el.tagName,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,font:getComputedStyle(el).fontSize,disabled:el.getAttribute('aria-disabled')??el.getAttribute('disabled')})),
   smallText:[...document.querySelectorAll<HTMLElement>('p,small,label,.notice')].filter(el=>el.getBoundingClientRect().width>0&&parseFloat(getComputedStyle(el).fontSize)<16).map(el=>({text:el.textContent?.slice(0,70),font:getComputedStyle(el).fontSize})),
   lastCard:(()=>{const card=[...document.querySelectorAll('.game-card')].at(-1);return card?{bottom:card.getBoundingClientRect().bottom+scrollY}:null;})(),
  }));
  const prefix=`${out}/${c.id}-${width}`;
  await page.screenshot({path:`${prefix}-first.png`});
  await page.screenshot({path:`${prefix}-full.png`,fullPage:true});
  const writes=requests.filter(r=>r.method!=='GET').length;
  const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const doc=await cdp.send('DOM.getDocument');const selected=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'main p'});
  const actualFonts=selected.nodeId?await cdp.send('CSS.getPlatformFontsForNode',{nodeId:selected.nodeId}):null;
  captures.push({id:c.id,width,height,dpr:1,browser:browser.version(),zoom:metrics.zoom,build:BUILD,actualFonts,scope:'isolated-schema-validated-view-fixture; not real API/device',phase:c.options.phase??'PLAYING',mutations:writes,first:`${prefix}-first.png`,full:`${prefix}-full.png`,metrics});
  await page.close();
 }
 const manifest=await readFile('apps/web/public/assets/asset-manifest.v1.json');
 await writeFile(`${out}/captures.json`,JSON.stringify({batch,at:new Date().toISOString(),manifestHash:createHash('sha256').update(manifest).digest('hex'),assetVersion:JSON.parse(manifest.toString()).art_version,captures},null,2));
 console.log(JSON.stringify({batch,captures:captures.length,output:out,overflow:captures.filter((r:any)=>r.metrics.scrollWidth>r.width).length,smallText:captures.filter((r:any)=>r.metrics.smallText.length).length}));
}finally{await browser.close();}
