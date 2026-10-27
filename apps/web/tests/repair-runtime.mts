import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { fixtures, defaultReply } from './page-state-fixtures';

const phase = process.argv[2] ?? 'before';
const out = `output/repair-20261027/runtime/${phase}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: object[] = [];
try {
  for (const game of ['stack', 'runner', 'herd'] as const) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const f = fixtures({ phase: 'CHECK_IN' });
    const writes: string[] = [];
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() !== 'GET') { writes.push(path); await route.abort(); return; }
      const reply = defaultReply(path, f, {});
      await route.fulfill({ status: reply.status, json: reply.body });
    });
    try {
      await page.goto(`http://127.0.0.1:5175/#/practice/${game}`);
      const start = page.getByRole('button', { name: '开始不计分练习' });
      await start.waitFor();
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${out}/${game}-preparation.png`, fullPage: true });
      const count = await page.locator('.game-stage canvas').count();
      assert.equal(count, 1, 'preparation must draw the decoded tick-zero scene');
      assert.equal(await page.locator('.game-stage').getAttribute('data-game-tick'), '0');
      assert(!await page.locator('.game-page').innerText().then(s => s.includes('成功即使用 1 次正式机会')), 'practice must not describe consuming a formal chance');
      await page.waitForTimeout(600);
      assert.equal(await page.locator('.game-stage').getAttribute('data-game-tick'), '0');
      assert.equal(writes.length, 0);
      await page.locator('.game-stage canvas').evaluate(canvas => canvas.setAttribute('data-preparation-canvas', 'same-scene'));
      await start.click();
      await page.waitForFunction(() => Number(document.querySelector('.game-stage')?.getAttribute('data-game-tick')) > 3);
      assert.equal(await page.locator('.game-stage canvas').getAttribute('data-preparation-canvas'), 'same-scene', 'runtime must retain the decoded preparation renderer without a second canvas/texture boot');
      await page.screenshot({ path: `${out}/${game}-practice-running.png`, fullPage: true });
      await page.getByRole('button', { name: '重新练习', exact: true }).click();
      await start.waitFor();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.game-stage canvas').count(), 1, 'reset must retain a visible preparation scene');
      assert.equal(await page.locator('.game-stage').getAttribute('data-game-tick'), '0');
      assert.equal(writes.length, 0);
      results.push({ id: 'F03', game, status: 'PASS', tickZero: true, noBusinessWrites: true });
    } catch (e) { results.push({ id: 'F03', game, status: 'FAIL', error: String(e), writes }); }
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${out}/results.json`, JSON.stringify({ scope: 'real browser / real components / isolated API fixtures, not real device or server business acceptance', results }, null, 2));
console.log(JSON.stringify(results));
if (results.some(r => 'status' in r && r.status === 'FAIL')) process.exitCode = 1;
