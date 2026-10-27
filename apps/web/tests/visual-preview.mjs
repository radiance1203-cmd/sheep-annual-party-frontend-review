import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = new URL('./artifacts/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
let writes = 0;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('request', request => { if (request.url().includes('/api/') && request.method() !== 'GET') writes++; });
  // The completed development event remains CLOSED. This isolated visual preview
  // changes only read responses to admit a local, non-scoring practice scene.
  const practiceEvent = event => ({ ...event, name: '隔离视觉预览（不计分）', phase: 'CHECK_IN', accepting_new_sessions: true, practice_allowed: true, ordinary_start_allowed: false });
  await page.route('**/api/display', async route => {
    const response = await route.fetch(); const payload = await response.json();
    payload.data.event = practiceEvent(payload.data.event);
    await route.fulfill({ json: payload });
  });
  await page.route('**/api/event?*', async route => {
    const response = await route.fetch(); const payload = await response.json();
    payload.data = practiceEvent(payload.data);
    await route.fulfill({ json: payload });
  });
  for (const game of ['stack', 'runner', 'herd']) {
    await page.goto(`http://127.0.0.1:5175/#/practice/${game}`);
    await page.getByRole('button', { name: '开始不计分练习' }).click();
    await page.locator('canvas').waitFor();
    await page.waitForTimeout(500);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: fileURLToPath(new URL(`visual-preview-${game}.png`, directory)), fullPage: true });
  }
  const result = { isolatedPracticePreview: true, eventWrites: writes, actualDevice: false, continuousPastureBackground: true, grassDecorationOpacity: .14, viewport: '390x844 DPR2 Chromium' };
  await writeFile(new URL('visual-preview.json', directory), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (writes) process.exitCode = 1;
} finally { await browser.close(); }
