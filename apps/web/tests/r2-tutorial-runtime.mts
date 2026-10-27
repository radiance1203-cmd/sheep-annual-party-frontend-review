import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { fixtures, defaultReply } from './page-state-fixtures';

const phase = process.argv[2] ?? 'before';
const out = `output/r2-20261027/frontend/${phase}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks: unknown[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
  const f = fixtures({ phase: 'CHECK_IN' });
  const writes: string[] = [];
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') { writes.push(route.request().url()); await route.abort(); return; }
    const r = defaultReply(new URL(route.request().url()).pathname, f, {});
    await route.fulfill({ status: r.status, json: r.body });
  });
  for (const game of ['stack', 'runner', 'herd']) {
    await page.goto(`http://127.0.0.1:5175/#/practice/${game}`);
    const start = page.getByRole('button', { name: '开始不计分练习' });
    await start.waitFor({state:'visible'}); await page.waitForTimeout(1800); await start.click();
    await page.waitForFunction(() => Number(document.querySelector('.game-stage')?.getAttribute('data-game-tick')) > 3);
    await page.waitForTimeout(200);
    const bounds = await page.locator('.game-stage').boundingBox();
    const hud = await page.locator('.hud').boundingBox();
    const actionBox = await page.locator('.game-controls .primary').boundingBox();
    await page.screenshot({path:`${out}/${game}-started.png`,fullPage:true});
    checks.push({game,scope:'short-start',bounds,hud,actionBox,scroll:await page.evaluate(()=>scrollY)});
    if(phase!=='before') { assert(hud && hud.y >= 0, `${game} HUD must remain onscreen`); assert(bounds && bounds.y >= 0 && bounds.y+bounds.height <=568, `${game} world must fit short viewport`); assert(actionBox && actionBox.y>=0 && actionBox.y+actionBox.height<=568,`${game} action must be touchable without hiding world`); }
    if(phase!=='before') {
      await page.locator('.game-controls .primary').click();
      await page.waitForFunction(()=>Number(document.querySelector('.game-stage')?.getAttribute('data-accepted-actions'))>0);
      assert.equal(await page.locator('.game-cumulative').count(),1);
      assert.equal(await page.locator('.game-feedback').count(),1);
    }
    await page.getByRole('button',{name:'暂停练习',exact:true}).click();
    const before = await page.locator('.game-stage').getAttribute('data-game-tick');
    await page.waitForTimeout(400); assert.equal(await page.locator('.game-stage').getAttribute('data-game-tick'),before);
    await page.getByRole('button',{name:'继续练习',exact:true}).click();
    await page.getByRole('button',{name:'返回',exact:true}).click();
    await page.getByRole('button',{name:'继续挑战',exact:true}).click();
    await page.getByRole('button',{name:'重新练习',exact:true}).click(); await start.waitFor(); await start.click();
    await page.waitForTimeout(250);
    const restartHud = await page.locator('.hud').boundingBox();
    checks.push({game,scope:'restart',restartHud});
    if(phase!=='before') assert(restartHud && restartHud.y>=0);
    await page.goto(`http://127.0.0.1:5175/#/tutorial/${game}`);
    await page.getByRole('button',{name:'暂停演示',exact:true}).waitFor(); await page.waitForTimeout(1000);
    await page.getByRole('button',{name:'暂停演示',exact:true}).click();
    const teaching = await page.locator('.teaching-scene').innerText();
    await page.waitForTimeout(4500);
    const pausedText = await page.locator('.tutorial-step').innerText();
    checks.push({game,scope:'tutorial-pause',teaching,pausedText});
    await page.screenshot({path:`${out}/${game}-tutorial-paused.png`,fullPage:true});
    if(phase!=='before') {
      assert.equal(await page.locator('.teaching-scene').innerText(),teaching);
      const controls=await page.locator('.teaching-controls').boundingBox();
      const nav=await page.locator('.bottom-nav').boundingBox();
      assert(controls && nav && controls.y+controls.height<=nav.y,`${game} tutorial controls must not hide behind bottom navigation`);
      await page.getByRole('button',{name:'继续演示',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.teaching-scene')?.getAttribute('data-teaching-complete')==='true',{},{timeout:20000});
      const events=await page.locator('[data-teaching-events]').getAttribute('data-teaching-events');
      if(game==='runner') {assert(events?.includes('GRASS_OUTER'));assert(events?.includes('GRASS_INNER'));}
      if(game==='herd') assert(events?.includes('SHEEP_PENNED'));
      checks.push({game,scope:'real-teaching-complete',tick:await page.locator('.teaching-scene').getAttribute('data-teaching-tick'),events,controls,nav});
      await page.screenshot({path:`${out}/${game}-tutorial-complete.png`,fullPage:true});
      await page.getByRole('button',{name:'重播演示',exact:true}).click();
      await page.getByRole('button',{name:'暂停演示',exact:true}).waitFor();
      await page.getByRole('link',{name:'继续到练习',exact:true}).click();
      await page.getByRole('button',{name:'开始不计分练习',exact:true}).waitFor();
      assert(page.url().includes(`/practice/${game}`));
    }
  }
  assert.equal(writes.length,0);
  await page.close();
} finally { await browser.close(); await writeFile(`${out}/results.json`,JSON.stringify({phase,scope:'Chromium viewport fixture; not physical phone; no business writes',checks},null,2)); }
console.log(JSON.stringify({phase,checks:checks.length}));
