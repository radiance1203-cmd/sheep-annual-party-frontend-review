import { chromium } from 'playwright';
import { fixtures, defaultReply } from '../../apps/web/tests/page-state-fixtures';
import { metrics } from '../../apps/web/tests/r3-support.mjs';
import { writeFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
const phase = process.argv.includes('--green') ? 'green' : 'red';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2 });
const fixture = fixtures({ phase: 'CHECK_IN' });
let writes = 0;
await page.route('**/api/**', async route => {
  if (route.request().method() !== 'GET') { writes++; await route.abort(); return; }
  const reply = defaultReply(new URL(route.request().url()).pathname, fixture, {});
  await route.fulfill({ status: reply.status, json: reply.body });
});
const rows = [];
try {
  for (const game of ['stack', 'herd']) {
    await page.goto(`http://127.0.0.1:5175/?artCandidate=r3#/practice/${game}`);
    const start = page.getByRole('button', { name: '开始不计分练习', exact: true });
    await start.waitFor(); await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
    const before = await metrics(page);
    await start.click(); await page.waitForTimeout(350);
    const after = await metrics(page);
    const stage = after.rects['.game-stage']; const canvas = after.rects.canvas;
    assert(stage && canvas);
    const contained = canvas.x >= stage.x - 1 && canvas.y >= stage.y - 1 && canvas.right <= stage.right + 1 && canvas.bottom <= stage.bottom + 1;
    rows.push({ game, before, after, contained });
    await page.screenshot({ path: `output/r3-20261028/fit-${phase}-${game}.png` });
  }
} finally { await browser.close(); }
await writeFile(`output/r3-20261028/fit-${phase}.json`, JSON.stringify({ phase, rows, writes, hypothesis: 'Phaser setGameSize refresh reads cached parentSize, ResizeObserver changed actual parent but did not update that cache' }, null, 2));
assert.equal(writes, 0);
assert(rows.every(row => row.contained), 'Canvas must fit wholly inside changed stage; no crop or enlarged hit regions');
console.log(`FIT ${phase}: PASS ${rows.length}`);
