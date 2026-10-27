import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fixtures, defaultReply } from './page-state-fixtures';

const phase = process.argv[2] ?? 'before';
const out = `output/r2-20261027/renderer/${phase}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: unknown[] = [];
let writes = 0;
try {
  for (const dpr of [1, 2, 3]) for (const game of ['stack', 'runner', 'herd'] as const) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
    const f = fixtures({ phase: 'CHECK_IN' });
    await page.route('**/api/**', async route => {
      if (route.request().method() !== 'GET') { writes++; await route.abort(); return; }
      const reply = defaultReply(new URL(route.request().url()).pathname, f, {});
      await route.fulfill({ status: reply.status, json: reply.body });
    });
    await page.goto(`http://127.0.0.1:5175/#/practice/${game}`);
    await page.getByRole('button', { name: '开始不计分练习' }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
    const metrics = await page.locator('canvas').evaluate(canvas => {
      const r = canvas.getBoundingClientRect();
      return { width: (canvas as HTMLCanvasElement).width, height: (canvas as HTMLCanvasElement).height, cssWidth: r.width, cssHeight: r.height, requestedDpr: devicePixelRatio, renderer: (canvas as HTMLCanvasElement).dataset };
    });
    await page.screenshot({ path: `${out}/${game}-dpr${dpr}.png` });
    let terminal: unknown = null;
    if (game === 'runner' && dpr === 1) {
      await page.getByRole('button', { name: '开始不计分练习' }).click();
      await page.clock.install();
      await page.clock.runFor(46000);
      const tick = await page.locator('.game-stage').getAttribute('data-game-tick');
      const hashes: string[] = [];
      for (let i = 0; i < 3; i++) {
        hashes.push(createHash('sha256').update(await page.locator('canvas').screenshot()).digest('hex'));
        if (i < 2) await page.clock.runFor(500);
      }
      terminal = { tick, offsetsMs: [0, 500, 1000], hashes, changes: new Set(hashes).size };
    }
    results.push({ game, dpr, metrics, terminal, scope: 'real Phaser/core; isolated GET fixtures; desktop viewport, not a physical phone' });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${out}/results.json`, JSON.stringify({ writes, results }, null, 2));
console.log(JSON.stringify({ out, writes, results }));
