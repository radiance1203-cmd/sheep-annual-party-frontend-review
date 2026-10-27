import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fixtures, defaultReply } from '../../apps/web/tests/page-state-fixtures.ts';
const batch = process.argv[2] ?? 'candidate';
const output = `output/repair-20261027/${batch}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const rows: object[] = [];
try {
  for (const width of (process.env.WIDTHS ?? '320,360,390,430').split(',').map(Number)) {
    for (const screen of (process.env.PAGES ?? 'lobby,tutorial/stack,tutorial/runner,tutorial/herd,practice/stack,practice/runner,practice/herd').split(',')) {
      const page = await browser.newPage({ viewport: { width, height: process.env.SHORT ? 568 : width === 320 ? 740 : 844 }, reducedMotion: 'reduce' });
      const f = fixtures({ phase: 'CHECK_IN' }); f.event.name = '羊年游园会'; f.me.participant.display_name = '隔离视觉样例';
      const errors: string[] = [], writes: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (route.request().method() !== 'GET') { writes.push(path); await route.abort(); return; }
        const reply = defaultReply(path, f, {}); await route.fulfill({ status: reply.status, json: reply.body });
      });
      await page.goto(`${process.env.REVIEW_ORIGIN ?? 'http://127.0.0.1:5175'}/#/${screen === 'lobby' ? '' : screen}`);
      if (screen !== 'lobby') await page.locator('canvas').waitFor();
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
      await page.waitForTimeout(400);
      const metrics = await page.evaluate(() => ({
        viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth,
        canvas: [...document.querySelectorAll('canvas')].map(c => ({ logicalWidth: c.width, logicalHeight: c.height, rect: c.getBoundingClientRect().toJSON() })),
        controls: [...document.querySelectorAll<HTMLElement>('button,.button,.game-card,.joystick')].filter(e => e.getBoundingClientRect().width && !e.closest('details:not([open])')).map(e => ({ text: e.innerText, box: e.getBoundingClientRect().toJSON() })),
      }));
      const name = `${screen.replaceAll('/', '-')}-${width}${process.env.SHORT ? '-short' : ''}`;
      await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
      await page.screenshot({ path: `${output}/${name}-viewport.png` });
      rows.push({ screen, width, metrics, errors, writes, screenshot: `${output}/${name}.png` });
      await page.close();
    }
  }
} finally { await browser.close(); }
await writeFile(`${output}/captures.json`, JSON.stringify({ scope: 'Actual pages; isolated invalid business fixtures; browser viewport is not a physical phone', browser: browser.version(), rows }, null, 2));
console.log(JSON.stringify({ output, count: rows.length }));
