import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { fixtures, defaultReply } from './page-state-fixtures';
import { assertPageAnchor, candidateDetails, fingerprints, metrics, sha } from './r3-support.mjs';
import { createTeachingReplay } from '../src/game/tutorial-model';

const baseline = process.argv.includes('--baseline');
const firstThree = process.argv.includes('--first-three');
const shortScreen = process.argv.includes('--short-screen');
const baseUrl = process.env.R3_BASE_URL ?? 'http://127.0.0.1:5175/';
const output = `output/r3-a-window-20261028/${baseline ? 'baseline' : firstThree ? shortScreen ? 'first-three-320' : 'first-three' : 'pages'}`;
const games = ['stack', 'runner', 'herd'] as const;
const viewports = baseline || firstThree ? shortScreen ? [[320, 568]] as const : [[390, 844]] as const : [[320, 568], [390, 844], [430, 932]] as const;
const states = firstThree ? ['running'] as const : ['prep', 'tutorial', 'running'] as const;
await mkdir(output, { recursive: true });
const frozenHashes = await fingerprints();
const candidate = baseline ? undefined : await candidateDetails();
if (candidate) assert.equal(candidate.manifestSha256, frozenHashes['apps/web/public/assets/candidates/r3/manifest.json']);
const browser = await chromium.launch({ headless: true });
const rows: object[] = [];
let mutations = 0;
try {
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    const errors: string[] = [], resources = new Set<string>();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/assets/')) resources.add(new URL(request.url()).pathname); });
    const fixture = fixtures({ phase: 'CHECK_IN' });
    await page.route('**/api/**', async route => {
      if (route.request().method() !== 'GET') { mutations++; await route.abort(); return; }
      const reply = defaultReply(new URL(route.request().url()).pathname, fixture, {});
      await route.fulfill({ status: reply.status, json: reply.body });
    });
    for (const game of games) for (const state of states) {
      resources.clear(); errors.length = 0;
      const beforeHashes = await fingerprints();
      assert.deepEqual(beforeHashes, frozenHashes, 'all captures in one final matrix must share the same source/candidate version');
      const url = `${baseUrl}${baseline ? '' : '?artCandidate=r3'}#/${state === 'tutorial' ? 'tutorial' : 'practice'}/${game}`;
      await page.goto(url);
      await page.locator('canvas').waitFor({ timeout: 30000 });
      const inputs: object[] = [];
      if (state !== 'tutorial') {
        const start = page.getByRole('button', { name: '开始不计分练习', exact: true });
        await start.waitFor();
        await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
        if (state === 'running') {
          await start.click();
          await page.waitForFunction(tick => Number(document.querySelector<HTMLElement>('.game-stage')?.dataset.gameTick) >= tick, game === 'runner' ? 180 : 30);
        }
      } else await page.waitForFunction(() => Number(document.querySelector<HTMLElement>('.teaching-scene')?.dataset.teachingTick) >= 4);
      const before = await metrics(page), filename = `${game}-${state}-${width}.png`;
      await page.screenshot({ path: `${output}/${filename}`, fullPage: false });
      const after = await metrics(page), afterHashes = await fingerprints();
      const pageAnchor = candidate?.pageAnchors ? assertPageAnchor({ measurement: before, candidate, game }) : undefined;
      const teachingReplay = state === 'tutorial' ? createTeachingReplay(game) : undefined;
      const afterTick = Number(after.teaching.teachingTick ?? after.stage.gameTick ?? 0);
      while (teachingReplay && teachingReplay.snapshot().tick < afterTick && teachingReplay.advance()) { /* exact deterministic teaching input prefix */ }
      const actualInputPrefixes = {
        beforeScreenshot: teachingReplay?.inputs.filter(input => input.tick <= Number(before.teaching.teachingTick ?? 0)) ?? [],
        afterScreenshot: teachingReplay?.inputs.filter(input => input.tick <= afterTick) ?? [],
        provenance: state === 'tutorial' ? 'same deterministic teaching controller and seed bound by source hashes; prefixes correspond to sampled tutorial ticks' : 'exact empty runtime input prefix: no gameplay input dispatched in this still-capture run; representative actions are separately recorded in real-time videos',
      };
      assert.equal(before.canvasCount, 1, 'actual application must own exactly one canvas');
      assert.equal(errors.length, 0, errors.join('\n'));
      assert.equal(mutations, 0, 'no API write may be attempted');
      assert.deepEqual(afterHashes, beforeHashes, 'source changed during this capture; retry with stable source');
      const row = { filename, game, state, url, browser: browser.version(), candidate, pageAnchor, scope: 'real App route / GamePage or TutorialScene; schema-validated isolated GET fixtures; real core; native screenshot; browser viewport, not physical device',
        snapshotScope: 'live full-speed snapshot; tick/presentation ranges before and after screenshot below; no core or score patch',
        inputs, actualInputPrefixes, tutorialInputSource: state === 'tutorial' ? 'apps/web/src/game/tutorial-model.ts legal synthetic teaching controller' : null,
        capturedAt: new Date().toISOString(), before, after, hashes: beforeHashes,
        productionManifestSha256: beforeHashes['apps/web/public/assets/asset-manifest.v1.json'], candidateManifestSha256: beforeHashes['apps/web/public/assets/candidates/r3/manifest.json'],
        requestedAssets: [...resources], screenshotSha256: sha(await readFile(`${output}/${filename}`)), errors: [...errors] };
      rows.push(row); await writeFile(`${output}/${filename.replace('.png', '.json')}`, JSON.stringify(row, null, 2));
      await writeFile(`${output}/results.json`, JSON.stringify({ baseline, mutations, captures: rows }, null, 2));
      console.log(`${game}/${state}/${width} captured`);
    }
    await page.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ output, captures: rows.length, mutations }));
