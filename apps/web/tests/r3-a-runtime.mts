import { chromium, type Page } from 'playwright';
import { strict as assert } from 'node:assert';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fixtures, defaultReply } from './page-state-fixtures';
import { assertCriticalControls, assertDisjointRectangles, assertPageAnchor, candidateDetails, fingerprints, metrics, sha } from './r3-support.mjs';

const output = 'output/r3-a-window-20261028/runtime';
const base = process.env.R3_BASE_URL ?? 'http://127.0.0.1:5175/';
const games = ['stack', 'runner', 'herd'] as const;
const mode = process.argv.includes('--isolation') ? 'isolation' : 'lifecycle';
const rows: object[] = [], errors: string[] = [], mutations: string[] = [];
const prodPath = 'apps/web/public/assets/asset-manifest.v1.json';
const sourceBefore = await fingerprints(), productionHash = sha(await readFile(prodPath));
const candidate = await candidateDetails();
assert.equal(candidate.manifestSha256, sourceBefore['apps/web/public/assets/candidates/r3/manifest.json']);
const candidateRequest = (url: string) => /\/assets\/candidates\/r3\//u.test(new URL(url).pathname);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
async function isolated(page: Page) {
  const fixture = fixtures({ phase: 'CHECK_IN' });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') { mutations.push(route.request().url()); await route.abort(); return; }
    const reply = defaultReply(new URL(route.request().url()).pathname, fixture, {});
    await route.fulfill({ status: reply.status, json: reply.body });
  });
}
async function prepared(page: Page, game: string, candidate = true) {
  await page.goto(`${base}${candidate ? '?artCandidate=r3' : ''}#/practice/${game}`);
  await page.getByRole('button', { name: '开始不计分练习', exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
  await page.locator('canvas').waitFor();
}
async function start(page: Page) {
  await page.getByRole('button', { name: '开始不计分练习', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector<HTMLElement>('.game-stage')?.dataset.gameTick) >= 4);
}
function geometry(m: Awaited<ReturnType<typeof metrics>>, game: string, width: number, height: number) {
  assertCriticalControls(m);
  assert(m.pageScenery);
  assert(m.pageScenery.computedImage.includes('blob:'), 'verified portrait scenery must reach the actual page background');
  assert.equal(m.pageScenery.computedImage.match(/url\(/gu)?.length, 1, 'one portrait page image only');
  assert(m.pageScenery.computedRepeat.split(',').every(value => value.trim() === 'no-repeat'), 'page scenery must not repeat');
  assert.equal(m.canvasCount, 1);
  const canvas = m.canvas; assert(canvas);
  assert.equal(Number(canvas.worldWidth), 360);
  const worldHeight = game === 'stack' ? 480 : game === 'runner' ? 220 : 420;
  assert.equal(Number(canvas.worldHeight), worldHeight);
  const c = m.rects.canvas!;
  assert(Math.abs(c.width / c.height - 360 / worldHeight) < .01, 'canvas must preserve authoritative world aspect ratio');
  for (const selector of ['.hud', '.game-stage', '.game-controls', '.practice-toolbar']) {
    const box = m.rects[selector]; assert(box, `${selector} must exist`);
    assert(box.y >= -.5 && box.bottom <= height + .5 && box.x >= -.5 && box.right <= width + .5, `${game} ${selector} outside viewport: ${JSON.stringify(box)}`);
  }
  const stage = m.rects['.game-stage']!, hud = m.rects['.hud']!, controls = m.rects['.game-controls']!, toolbar = m.rects['.practice-toolbar']!;
  assert(c.x >= stage.x - .5 && c.y >= stage.y - .5 && c.right <= stage.right + .5 && c.bottom <= stage.bottom + .5, 'complete uniformly fitted canvas must stay inside stage without clipping or HUD overlap');
  assert(stage.y >= hud.bottom - .5, 'stage cannot cover HUD');
  assert(controls.y >= stage.bottom - .5, 'controls cannot cover world');
  assertDisjointRectangles(controls, toolbar);
  assertDisjointRectangles(stage, toolbar);
  assert(stage.height >= (game === 'runner' ? 150 : height * .35), 'stage must retain useful space, not collapse to a floor strip');
  const action = m.rects['.game-controls .primary']!; assert(action.height >= 48 && action.width >= 48, 'primary action requires 48 CSSpx touch target');
  assert(m.document.width <= width, 'no horizontal overflow');
}
let failure: string | null = null;
try {
  // Official routes must remain bound solely to the registered production manifest.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); await isolated(page);
  for (const route of ['#/practice/stack', '?artCandidate=r3#/play/stack', '?artCandidate=r3#/']) {
    const requested: string[] = []; const record = (request: { url(): string }) => { if (candidateRequest(request.url())) requested.push(request.url()); };
    page.on('request', record); await page.goto(`${base}${route}`);
    await page.locator(route.endsWith('#/') ? '.game-cards' : 'canvas').waitFor(); await page.waitForTimeout(150);
    page.off('request', record); assert.equal(requested.length, 0, `official route leaked candidate: ${route}`);
    assert.equal(await page.locator('.game-page[data-art-candidate="r3"]').count(), 0);
    rows.push({ check: 'candidate-isolation', route, requested });
  }
  const requested: string[] = []; page.on('request', request => { if (candidateRequest(request.url())) requested.push(request.url()); });
  await prepared(page, 'stack');
  assert.equal(await page.locator('.game-page[data-art-candidate="r3"]').count(), 1);
  assert(requested.some(url => url.endsWith('/manifest.json')), 'candidate practice must load isolated manifest');
  rows.push({ check: 'candidate-opt-in', requested }); await page.close();
  if (mode === 'lifecycle') {
    const retryPage = await browser.newPage({ viewport: { width: 390, height: 844 } }); await isolated(retryPage);
    let failImage = true;
    await retryPage.route('**/assets/candidates/r3/stack.png', async route => { if (failImage) await route.abort(); else await route.continue(); });
    await retryPage.goto(`${base}?artCandidate=r3#/practice/stack`);
    await retryPage.getByRole('button', { name: '重试场景加载', exact: true }).waitFor();
    assert.equal(await retryPage.locator('canvas').count(), 0, 'failed scene must not show a partly rendered game');
    failImage = false; await retryPage.getByRole('button', { name: '重试场景加载', exact: true }).click();
    await retryPage.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
    assert.equal(await retryPage.locator('canvas').count(), 1); rows.push({ check: 'failed-load-retry', failedCanvasCount: 0, recoveredCanvasCount: 1 }); await retryPage.close();
    const portraitRetry = await browser.newPage({ viewport: { width: 390, height: 844 } }); await isolated(portraitRetry);
    let failPortrait = true;
    assert(candidate.pageAnchors?.stack);
    await portraitRetry.route(`**/assets/candidates/r3/${candidate.pageAnchors.stack.image}`, async route => { if (failPortrait) await route.abort(); else await route.continue(); });
    await portraitRetry.goto(`${base}?artCandidate=r3#/practice/stack`);
    await portraitRetry.getByRole('button', { name: '重试场景加载', exact: true }).waitFor();
    assert.equal(await portraitRetry.locator('canvas').count(), 0, 'failed page scenery must fail preparation');
    failPortrait = false; await portraitRetry.getByRole('button', { name: '重试场景加载', exact: true }).click();
    await portraitRetry.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
    assert.equal(await portraitRetry.locator('canvas').count(), 1); rows.push({ check: 'portrait-failed-load-retry', failedCanvasCount: 0, recoveredCanvasCount: 1 }); await portraitRetry.close();
    for (const [width, height] of [[320, 568], [390, 844], [430, 932]] as const) for (const dpr of [1, 2, 3]) {
      const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr }); await isolated(p);
      for (const game of games) {
        await prepared(p, game); await start(p); const m = await metrics(p); geometry(m, game, width, height);
        const pageAnchor = assertPageAnchor({ measurement: m, candidate, game });
        assert.equal(Number(m.canvas?.requestedDpr), dpr); assert.equal(Number(m.canvas?.effectiveDpr), Math.min(2, dpr));
        // Integer buffer axes are rounded before Phaser uniformly fits that
        // integer ratio into the stage (see rounding-probe.json). At most one
        // physical pixel can differ from CSSsize × adopted DPR.
        assert(Math.abs((m.canvas?.width ?? 0) - Math.round(m.rects.canvas!.width * Math.min(2, dpr))) <= 1);
        assert(Math.abs((m.canvas?.height ?? 0) - Math.round(m.rects.canvas!.height * Math.min(2, dpr))) <= 1);
        rows.push({ check: 'viewport-dpr-geometry', game, width, height, dpr, metrics: m, pageAnchor });
      }
      await p.close();
    }
    const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await isolated(p);
    for (const game of games) {
      await prepared(p, game); await start(p);
      const action = p.getByRole('button', { name: game === 'stack' ? '点击放下' : game === 'runner' ? '点击跳跃' : '吠叫', exact: true });
      await action.click(); await p.waitForFunction(() => Number(document.querySelector<HTMLElement>('.game-stage')?.dataset.acceptedActions) > 0);
      await p.getByRole('button', { name: '暂停练习', exact: true }).click();
      const paused = await metrics(p); await p.waitForTimeout(350); const still = await metrics(p);
      assert.equal(still.stage.gameTick, paused.stage.gameTick); assert.equal(still.stage.presentationTime, paused.stage.presentationTime);
      await p.getByRole('button', { name: '继续练习', exact: true }).click(); await p.waitForTimeout(150);
      assert(Number((await metrics(p)).stage.gameTick) > Number(paused.stage.gameTick));
      await p.getByRole('button', { name: '重新练习', exact: true }).click();
      await p.getByRole('button', { name: '开始不计分练习', exact: true }).waitFor();
      const reset = await metrics(p); assert.equal(reset.stage.gameTick, '0'); assert.equal(reset.stage.acceptedActions, '0'); assert.equal(reset.canvasCount, 1);
      rows.push({ check: 'pause-resume-restart', game, paused, reset });
      await p.goto(`${base}?artCandidate=r3#/tutorial/${game}`); await p.getByRole('button', { name: '暂停演示', exact: true }).waitFor();
      await p.waitForFunction(() => Number(document.querySelector<HTMLElement>('.teaching-scene')?.dataset.teachingTick) > 0);
      await p.getByRole('button', { name: '暂停演示', exact: true }).click(); const teachingPaused = await metrics(p); await p.waitForTimeout(200);
      assert.equal((await metrics(p)).teaching.teachingTick, teachingPaused.teaching.teachingTick);
      await p.getByRole('button', { name: '继续演示', exact: true }).click();
      await p.waitForFunction(() => document.querySelector<HTMLElement>('.teaching-scene')?.dataset.teachingComplete === 'true', {}, { timeout: 25000 });
      rows.push({ check: 'real-core-tutorial-complete', game, metrics: await metrics(p), eventTypes: await p.locator('[data-teaching-events]').getAttribute('data-teaching-events') });
    }
    // Route transitions exercise normal destroy/revoke paths. Resource-release counters
    // are observed below through browser APIs, without exposing renderer internals.
    await p.close();
    const releasePage = await browser.newPage({ viewport: { width: 390, height: 844 } }); await isolated(releasePage);
    await releasePage.addInitScript(() => {
      const outstanding = new Set<string>(), originalCreate = URL.createObjectURL.bind(URL), originalRevoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = value => { const url = originalCreate(value); outstanding.add(url); document.documentElement.dataset.r3LiveObjectUrls = String(outstanding.size); return url; };
      URL.revokeObjectURL = url => { originalRevoke(url); outstanding.delete(url); document.documentElement.dataset.r3LiveObjectUrls = String(outstanding.size); };
    });
    await prepared(releasePage, 'stack');
    for (let i = 0; i < 9; i++) {
      const game = games[i % games.length]!;
      await releasePage.evaluate(game => { location.hash = `/practice/${game}`; }, game);
      await releasePage.waitForFunction(game => document.querySelector<HTMLElement>('.game-page')?.dataset.game === game && document.querySelectorAll('canvas').length === 1, game);
      await releasePage.waitForTimeout(100);
      rows.push({ check: 'fast-switch', game, canvasCount: await releasePage.locator('canvas').count(), liveObjectUrls: await releasePage.locator('html').getAttribute('data-r3-live-object-urls') });
    }
    await releasePage.evaluate(() => { location.hash = '/'; }); await releasePage.locator('.game-cards').waitFor();
    await releasePage.waitForFunction(() => document.querySelectorAll('canvas').length === 0 && document.documentElement.dataset.r3LiveObjectUrls === '0');
    rows.push({ check: 'resource-release', canvasCount: 0, liveObjectUrls: 0 }); await releasePage.close();
  }
  assert.equal(mutations.length, 0); assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(sha(await readFile(prodPath)), productionHash, 'registered production manifest must remain immutable');
  assert.deepEqual(await fingerprints(), sourceBefore, 'final acceptance requires stable source/candidate hashes');
} catch (error) { failure = error instanceof Error ? error.stack ?? error.message : String(error); process.exitCode = 1; }
finally {
  await browser.close();
  await writeFile(`${output}/${mode}.json`, JSON.stringify({ status: failure ? 'FAIL' : 'PASS', mode, candidate, scope: 'real App; isolated schema GET fixtures; normal wall clock; browser emulation, not physical device or art acceptance', hashes: sourceBefore, productionHash, mutations, errors, rows, failure }, null, 2));
}
console.log(JSON.stringify({ mode, rows: rows.length, mutations: mutations.length, errors: errors.length, failure }));
