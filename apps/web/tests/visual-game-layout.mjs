import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const output = `output/visual-repair-v1/frontend-${process.argv[2] ?? 'layout'}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const event = (await (await fetch('http://127.0.0.1:3100/api/display')).json()).data.event;
const results = [];
let writes = 0;
try {
  for (const [width, height] of [[320, 740], [360, 800], [390, 844], [430, 932]]) {
    await Promise.all(['stack', 'runner', 'herd'].map(async game => {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (r.url().includes('/api/') && r.method() !== 'GET') writes++; });
      await page.goto(`http://127.0.0.1:5175/?event_id=${event.event_id}#/practice/${game}`);
      await page.getByRole('button', { name: '开始不计分练习' }).click();
      await page.locator('canvas').waitFor();
      await page.waitForTimeout(180);
      await page.evaluate(() => scrollTo(0, 0));
      const metrics = await page.evaluate(() => {
        const box = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom } : null; };
        return {
          controls: box('.game-controls'), stage: box('.game-stage'), canvas: box('canvas'),
          overflow: document.documentElement.scrollWidth > innerWidth,
          targets: [...document.querySelectorAll('button,.joystick')].filter(e => e.getBoundingClientRect().width).map(e => ({ label: e.getAttribute('aria-label') ?? e.textContent, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })),
          smallText: [...document.querySelectorAll('p,small,.mode-badge')].filter(e => e.getBoundingClientRect().width && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.textContent),
        };
      });
      const pass = Boolean(metrics.controls && metrics.controls.y >= 0 && metrics.controls.bottom <= height && !metrics.overflow && !metrics.smallText.length && metrics.targets.every(t => t.width >= 48 && t.height >= 48) && !errors.length);
      const screenshot = `${output}/${game}-${width}.png`;
      await page.screenshot({ path: screenshot });
      results.push({ game, width, height, actualDevice: false, mode: 'actual API practice; no formal session', errors, pass, metrics, screenshot });
      await page.close();
    }));
  }
} finally { await browser.close(); }
await writeFile(`${output}/metrics.json`, JSON.stringify({ writes, results }, null, 2));
console.log(JSON.stringify({ output, writes, pass: results.filter(r => r.pass).length, total: results.length, controls: results.map(r => ({ game: r.game, width: r.width, bottom: r.metrics.controls?.bottom, viewport: r.height })) }));
if (writes || results.some(r => !r.pass)) process.exitCode = 1;
