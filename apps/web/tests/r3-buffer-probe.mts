import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { fixtures, defaultReply } from './page-state-fixtures';
import { metrics } from './r3-support.mjs';
import { bufferLayout } from '../src/game/presenter-state';
import { strict as assert } from 'node:assert';
const browser = await chromium.launch({ headless: true });
let mutations = 0;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const fixture = fixtures({ phase: 'CHECK_IN' });
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') { mutations++; await route.abort(); return; }
    const reply = defaultReply(new URL(route.request().url()).pathname, fixture, {}); await route.fulfill({ status: reply.status, json: reply.body });
  });
  await page.goto('http://127.0.0.1:5175/?artCandidate=r3#/practice/runner');
  await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
  await page.getByRole('button', { name: '开始不计分练习', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector<HTMLElement>('.game-stage')?.dataset.gameTick) > 4);
  const actual = await metrics(page), stage = actual.rects['.game-stage']; if (!stage) throw new Error('Missing stage');
  const expected = bufferLayout(stage.width, stage.height, 360, 220, 1);
  assert.equal(mutations, 0);
  const record = { scope: 'real GamePage rounding diagnosis; pure existing bufferLayout compared against actual DOM and buffer', actual, expected, formula: 'buffer rounds each world-scaled CSS axis independently; Phaser FIT then contains the integer buffer ratio in the stage. Resulting CSSwidth*DPR can differ from bufferWidth by one pixel.' };
  await writeFile('output/r3-20261028/runtime/rounding-probe.json', JSON.stringify(record, null, 2)); console.log(JSON.stringify(record));
} finally { await browser.close(); }
