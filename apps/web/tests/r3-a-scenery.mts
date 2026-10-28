import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { fixtures, defaultReply } from './page-state-fixtures';
import { assertCriticalControls, assertPageAnchor, candidateDetails, metrics, sha } from './r3-support.mjs';

// Native stills of real routes with isolated read-only API fixtures. This does not
// certify art, physical devices, collision fidelity, or the live event gates.
const phase = process.argv.includes('--red') ? 'red' : 'green';
const output = `output/r3-a-window-20261028/page-fix/${phase}`;
const candidate = await candidateDetails();
const cssPath = 'apps/web/src/r3-ui.css';
const cssBytes = await readFile(cssPath);
const baseUrl = process.env.R3_BASE_URL ?? 'http://127.0.0.1:5175/';
await mkdir(output, { recursive: true });
await writeFile(`${output}/r3-ui.css`, cssBytes);
const browser = await chromium.launch({ headless: true });
const captures: object[] = [];
let attemptedApiMutations = 0;
try {
  for (const [width, height] of [[320, 568], [390, 844], [430, 932]] as const) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    const fixture = fixtures({ phase: 'CHECK_IN' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      if (route.request().method() !== 'GET') { attemptedApiMutations++; await route.abort(); return; }
      const reply = defaultReply(new URL(route.request().url()).pathname, fixture, {});
      await route.fulfill({ status: reply.status, json: reply.body });
    });
    for (const game of ['runner', 'stack', 'herd'] as const) {
      for (const state of game === 'runner' ? ['prep', 'tutorial', 'running'] as const : ['running'] as const) {
        errors.length = 0;
        const filename = `${game}-${state}-${width}`;
        await page.goto(`${baseUrl}?artCandidate=r3#/${state === 'tutorial' ? 'tutorial' : 'practice'}/${game}`);
        await page.locator('canvas').waitFor({ timeout: 30000 });
        if (state !== 'tutorial') {
          const start = page.getByRole('button', { name: '开始不计分练习', exact: true });
          await start.waitFor();
          await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
          if (state === 'running') {
            await start.click();
            await page.waitForFunction(tick => Number(document.querySelector<HTMLElement>('.game-stage')?.dataset.gameTick) >= tick, game === 'runner' ? 180 : 30);
          }
        } else await page.waitForFunction(() => Number(document.querySelector<HTMLElement>('.teaching-scene')?.dataset.teachingTick) >= 4);
        const before = await metrics(page);
        const background = await page.evaluate(() => {
          const element = document.querySelector<HTMLElement>('.game-page');
          if (!element) throw new Error('game page missing');
          const style = getComputedStyle(element, '::before');
          const size = element.style.getPropertyValue('--r3-page-scenery-size').split(/\s+/u).map(Number.parseFloat);
          const top = Number.parseFloat(element.style.getPropertyValue('--r3-page-scenery-top'));
          return { image: style.backgroundImage, size: style.backgroundSize, position: style.backgroundPosition,
            mask: style.maskImage, backdropBottom: top + (size[1] ?? 0), pageBackground: getComputedStyle(element).backgroundImage };
        });
        await page.screenshot({ path: `${output}/${filename}.png`, fullPage: false });
        const after = await metrics(page);
        assert.equal(errors.length, 0, errors.join('\n'));
        assert.equal(attemptedApiMutations, 0);
        assert.equal(before.canvasCount, 1);
        assert.equal(before.document.width, width);
        assertCriticalControls(before);
        const pageAnchor = assertPageAnchor({ measurement: before, candidate, game });
        let unchangedGeometry: boolean | null = null;
        if (phase === 'green') {
          const red = JSON.parse(await readFile(`output/r3-a-window-20261028/page-fix/red/${filename}.json`, 'utf8')) as { before: typeof before };
          assert.deepEqual(before.rects, red.before.rects, 'background repair must preserve every measured stage/control rectangle');
          assert.deepEqual(before.controls, red.before.controls, 'background repair must preserve controls');
          assert.equal(before.pageScenery?.size, red.before.pageScenery?.size);
          assert.equal(before.pageScenery?.top, red.before.pageScenery?.top);
          assert.equal(before.canvas?.worldWidth, red.before.canvas?.worldWidth);
          assert.equal(before.canvas?.worldHeight, red.before.canvas?.worldHeight);
          unchangedGeometry = true;
        }
        assert.equal(sha(await readFile(cssPath)), sha(cssBytes), 'CSS must stay stable throughout matrix');
        const row = { filename: `${filename}.png`, phase, game, state, viewport: { width, height }, before, after, background, pageAnchor, unchangedGeometry,
          cssSha256: sha(cssBytes), candidate, browser: browser.version(), attemptedApiMutations, errors: [...errors],
          screenshotSha256: sha(await readFile(`${output}/${filename}.png`)),
          scope: 'native screenshot of real App route; browser viewport simulation, no physical device; isolated GET fixtures; empty practice gameplay input prefix; live ticks recorded; visual judgement remains separate' };
        captures.push(row);
        await writeFile(`${output}/${filename}.json`, JSON.stringify(row, null, 2));
        await writeFile(`${output}/results.json`, JSON.stringify({ phase, attemptedApiMutations, captures }, null, 2));
        console.log(`${phase}: ${filename}`);
      }
    }
    await page.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ phase, captures: captures.length, attemptedApiMutations, output }));
