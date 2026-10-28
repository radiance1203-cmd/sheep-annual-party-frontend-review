import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { fixtures, defaultReply } from './page-state-fixtures';
import { assertPageAnchor, candidateDetails, fingerprints, metrics } from './r3-support.mjs';
const browser = await chromium.launch({ headless: true });
const candidate = await candidateDetails(), hashes = await fingerprints();
let mutations = 0, failure: string | undefined;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const fixture = fixtures({ phase: 'CHECK_IN' });
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') { mutations++; await route.abort(); return; }
    const reply = defaultReply(new URL(route.request().url()).pathname, fixture, {}); await route.fulfill({ status: reply.status, json: reply.body });
  });
  await page.goto('http://127.0.0.1:5175/?artCandidate=r3#/practice/runner');
  await page.getByRole('button', { name: '开始不计分练习', exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
  await page.locator('canvas').waitFor();
  const prepared = await metrics(page);
  await page.getByRole('button', { name: '开始不计分练习', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector<HTMLElement>('.game-stage')?.dataset.gameTick) >= 30);
  const running = await metrics(page);
  let pageAnchor: ReturnType<typeof assertPageAnchor> | undefined;
  try { pageAnchor = assertPageAnchor({ measurement: running, candidate, game: 'runner' }); } catch (error) { failure = error instanceof Error ? error.message : String(error); }
  assert.deepEqual(await fingerprints(), hashes); assert.equal(mutations, 0);
  await writeFile('output/r3-20261028/first-three/anchor-probe.json', JSON.stringify({ candidate, hashes, prepared, running, pageAnchor, failure, mutations, scope: 'real GamePage prepared-to-running anchor diagnosis; no clock/core/input patch' }, null, 2));
  console.log(JSON.stringify({ preparedStage: prepared.rects['.game-stage'], runningStage: running.rects['.game-stage'], preparedScenery: prepared.pageScenery, runningScenery: running.pageScenery, pageAnchor, failure, mutations }));
  if (failure) process.exitCode = 1;
} finally { await browser.close(); }
