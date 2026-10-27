import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { fixtures, defaultReply } from './page-state-fixtures';
const out='output/r2-20261027/pages'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}); const results:object[]=[]; let writes=0;
try {
 for(const [width,height] of [[320,568],[390,844],[430,932]] as const){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2}); const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message)); const f=fixtures({phase:'CHECK_IN'});
  await page.route('**/api/**',async route=>{if(route.request().method()!=='GET'){writes++;await route.abort();return;}const reply=defaultReply(new URL(route.request().url()).pathname,f,{});await route.fulfill({status:reply.status,json:reply.body});});
  for(let cycle=0;cycle<3;cycle++)for(const game of ['stack','runner','herd']){
   await page.goto(`http://127.0.0.1:5175/#/practice/${game}`);
   const start=page.getByRole('button',{name:'开始不计分练习'});await start.waitFor();await page.waitForFunction(()=>!document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);await start.click();
   await page.waitForFunction(()=>Number(document.querySelector('.game-stage')?.getAttribute('data-game-tick'))>4);
   if(game==='stack'||game==='runner')await page.getByRole('button',{name:game==='stack'?'点击放下':'点击跳跃',exact:true}).click();else {await page.keyboard.down('ArrowUp');await page.waitForTimeout(100);await page.keyboard.up('ArrowUp');}
   await page.waitForTimeout(200);
   const metrics=await page.evaluate(()=>{const boxes:Record<string,{x:number;y:number;width:number;height:number;bottom:number}>={};for(const selector of ['.hud','.game-stage','.game-controls','.practice-toolbar','canvas']){const b=document.querySelector(selector)!.getBoundingClientRect();boxes[selector]={x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom};}const c=document.querySelector('canvas')!;return{hud:boxes['.hud']!,stage:boxes['.game-stage']!,controls:boxes['.game-controls']!,toolbar:boxes['.practice-toolbar']!,canvasCount:document.querySelectorAll('canvas').length,canvas:{width:c.width,height:c.height,css:boxes.canvas},tick:document.querySelector('.game-stage')?.getAttribute('data-game-tick'),displayPhase:document.querySelector<HTMLElement>('.game-stage')?.dataset.presentationTime,scrollY};});
   await writeFile(`${out}/latest-metrics.json`,JSON.stringify({game,width,height,cycle,metrics},null,2));
   assert.equal(metrics.canvasCount,1);assert(metrics.hud.y>=0,JSON.stringify({game,width,metrics}));assert(metrics.controls.bottom<=height,JSON.stringify({game,width,metrics}));
   assert(metrics.toolbar.bottom<=height,JSON.stringify({game,width,metrics}));
   if(cycle===0)await page.screenshot({path:`${out}/${game}-${width}.png`,fullPage:false});
   results.push({game,width,height,cycle,metrics,errors:[...errors]});
   await page.getByRole('button',{name:'重新练习',exact:true}).click(); await start.waitFor(); assert.equal(await page.locator('canvas').count(),1);
  }
  await page.close();
 }
}finally{await browser.close();}
await writeFile(`${out}/results.json`,JSON.stringify({scope:'real GamePage/renderer/core; isolated GET API fixture; browser viewport only; screenshot display phases recorded, no accepted golden',writes,results},null,2)); console.log(JSON.stringify({out,checks:results.length,writes}));
