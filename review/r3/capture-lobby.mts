import { chromium } from 'playwright';
import { fixtures, defaultReply } from '../../apps/web/tests/page-state-fixtures';
import { writeFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const fixture = fixtures({ phase: 'CHECK_IN' });
const errors: string[] = [], candidates: string[] = []; let writes = 0;
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (request.url().includes('/assets/candidates/r3/')) candidates.push(request.url()); });
await page.route('**/api/**', async route => { if (route.request().method() !== 'GET') { writes++; await route.abort(); return; } const reply = defaultReply(new URL(route.request().url()).pathname, fixture, {}); await route.fulfill({ status: reply.status, json: reply.body }); });
try {
  await page.goto('http://127.0.0.1:5175/#/'); await page.locator('.game-cards').waitFor();
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  await page.screenshot({ path: 'output/r3-20261028/shared-regression/lobby-default-390.png', fullPage: true });
  assert.equal(writes, 0); assert.equal(errors.length, 0); assert.equal(candidates.length, 0);
  await writeFile('output/r3-20261028/shared-regression/lobby-default.json', JSON.stringify({ status: 'PASS', scope: 'actual default App/lobby + isolated GET fixture, no R3 candidate/no business write; browser not physical device', errors, candidates, writes }, null, 2));
  console.log('Default lobby: PASS, no candidate resource or mutation');
} finally { await browser.close(); }
