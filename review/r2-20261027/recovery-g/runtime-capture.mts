// Evidence-only page. Reuses the unchanged production renderer and shared-core
// legal-input helper. No application file, manifest or business API is modified.
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
const out='review/r2-20261027/recovery-g/runtime';await mkdir(out,{recursive:true});
const assetRoot='apps/web/public/assets/candidates/r2/r2g';
const metadataPath=`${assetRoot}/sheep_stack_r2g.atlas.json`,imagePath=`${assetRoot}/sheep_stack_r2g.png`;
const metaHash=createHash('sha256').update(await readFile(metadataPath)).digest('hex'),imageHash=createHash('sha256').update(await readFile(imagePath)).digest('hex');
const doc=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#f1eddf;color:#483c2e;font:16px/1.5 system-ui}main{padding:8px;max-width:430px;margin:auto}h1{font-size:20px;margin:0 0 4px}p{font-size:13px}#stage{width:100%;aspect-ratio:360/480;overflow:hidden;border-radius:14px;background:#d2e0ad}canvas{display:block}</style><main><h1>R2g · 单帧母样真实引擎对照</h1><p>唯一core合法输入至tick150；仅stack_idle为G，其余动作/道具/环境仍为v4。非完整新动作，未艺术签认。</p><div id="stage"></div><p id="phase">解码中</p></main><script type="module">
import {createRenderer} from '/src/game/renderer.ts';
import {preloadAssets,parseAtlas} from '/src/game/assets.ts';
import {createTeachingReplay} from '/src/game/tutorial-model.ts';
const atlases=await preloadAssets('stack');
const raw=await(await fetch('/assets/candidates/r2/r2g/sheep_stack_r2g.atlas.json')).json();
const image=new Image();image.src='/assets/candidates/r2/r2g/sheep_stack_r2g.png';await image.decode();
atlases.sheep_stack_candidate={...parseAtlas(raw),decodedImage:image};
const replay=createTeachingReplay('stack',{stopOnComplete:false});
const renderer=createRenderer(document.querySelector('#stage'),replay.snapshot(),atlases);await renderer.ready;
renderer.beginSession('recovery-g-evidence',0);renderer.render(replay.snapshot());
for(let i=0;i<150;i++){const o=replay.advance();if(o)renderer.presentStep(o.view,o.events);}
renderer.setMode('paused');renderer.setPresentationTime(500);
document.querySelector('#phase').textContent='tick150 · 固定表现500ms · DPR预算上限2 · 静态对照，不是实速录屏';
window.evidence={renderer,snapshot:replay.snapshot(),metadata:raw};
</script></html>`;
const browser=await chromium.launch({headless:true});const results:object[]=[];
try{for(const width of [320,390,430]){const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let apiRequests=0;page.on('request',r=>{if(r.url().includes('/api/'))apiRequests++;});await page.route('**/r2g-evidence',route=>route.fulfill({contentType:'text/html',body:doc}));await page.goto('http://127.0.0.1:5175/r2g-evidence');await page.waitForFunction(()=>Boolean((window as any).evidence));await page.waitForTimeout(120);const state=await page.evaluate(()=>{const e=(window as any).evidence;return{snapshot:e.snapshot,diagnostics:e.renderer.diagnostics(),version:e.metadata.version};});assert.equal(errors.length,0);assert.equal(apiRequests,0);assert.equal(state.snapshot.tick,150);assert(state.diagnostics.scene.sprites.some((a:any)=>a.frame==='stack_sample'));await page.screenshot({path:`${out}/stack-r2g-${width}.png`,fullPage:true});results.push({width,height:844,requestedDpr:2,imageHash,metaHash,apiRequests,errors,...state});await page.close();}}finally{await browser.close();}
await writeFile(`${out}/results.json`,JSON.stringify({scope:'new G static sample, unchanged real renderer/core, evidence-only document route, not full animation or device test',imagePath,metadataPath,results},null,2));console.log(JSON.stringify({out,captures:results.length,imageHash,metaHash}));
