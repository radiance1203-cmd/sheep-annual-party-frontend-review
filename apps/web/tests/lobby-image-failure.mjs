import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const output = `output/visual-repair-v1/frontend-image-${process.argv[2] ?? 'check'}`;
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile('apps/web/public/assets/asset-manifest.v1.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const results = [];
let writes = 0;
try {
  for (const id of ['hero.lobby', 'cover.stack', 'cover.runner', 'cover.herd']) {
    const asset = manifest.assets.find(a => a.asset_id === id);
    assert.ok(asset?.runtime_path);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.url().includes('/api/') && r.method() !== 'GET') writes++; });
    const routePattern = `**${asset.runtime_path}`;
    await page.route(routePattern, route => route.abort());
    const blocked = page.waitForEvent('requestfailed', { predicate: request => new URL(request.url()).pathname === asset.runtime_path });
    await page.goto('http://127.0.0.1:5175/#/');
    await blocked;
    await page.waitForTimeout(100);
    const feedback = page.getByRole('alert').filter({ hasText: '插画加载失败，请重新加载' });
    assert.equal(await feedback.count(), 1, `${id} must expose the real image failure`);
    assert.equal(await page.locator(`img[src="${asset.runtime_path}"]`).count(), 0, 'failed image must have an explicit explanation');
    assert.deepEqual(await page.locator('.game-card').evaluateAll(cards => cards.map(card => card.getAttribute('href'))), ['#/tutorial/stack', '#/tutorial/runner', '#/tutorial/herd']);
    assert.equal(await page.locator('.game-card button').count(), 0, 'cover errors must not add nested interactive controls');
    await page.screenshot({ path: `${output}/${id}-failed.png`, fullPage: true });
    await page.unroute(routePattern);
    if (id === 'hero.lobby') await page.getByRole('button', { name: '重试大厅插画' }).click();
    else await page.reload();
    await page.locator(`img[src="${asset.runtime_path}"]`).waitFor();
    await page.waitForFunction(path => [...document.images].some(image => image.getAttribute('src') === path && image.complete && image.naturalWidth > 0), asset.runtime_path);
    assert.equal(await feedback.count(), 0, 'reloading the original image must reset failure feedback');
    assert.deepEqual(errors, []);
    results.push({ asset: id, result: 'PASS', originalUrl: asset.runtime_path, retry: id === 'hero.lobby' ? 'local button' : 'page reload', errors });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/report.json`, JSON.stringify({ results, writes }, null, 2));
console.log(JSON.stringify({ results, writes }));
assert.equal(writes, 0);
