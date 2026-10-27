import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';

const out = `output/r2-20261027/samples-${process.argv[2] ?? 'final'}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: object[] = [], errors: string[] = [];
let writes = 0;
try {
  for (const game of ['stack', 'runner', 'herd']) for (const [width, height] of [[320, 568], [390, 844], [430, 932]] as const) for (const dpr of [1, 2, 3]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', req => { if (req.url().includes('/api/') && req.method() !== 'GET') writes++; });
    await page.goto(`http://127.0.0.1:5175/tests/r2-preview.html?game=${game}`);
    await page.waitForFunction(() => Boolean((window as any).r2));
    await page.evaluate(() => { (window as any).r2.advanceTicks(150); (window as any).r2.freeze(500); });
    await page.waitForTimeout(100);
    const metrics = await page.evaluate(() => {
      const r2 = (window as any).r2, d = r2.diagnostics();
      const canvas = document.querySelector('canvas')!, r = canvas.getBoundingClientRect();
      const points = [[0, 0], [360, 0], [0, d.layout.bufferHeight / d.layout.zoom], [360, d.layout.bufferHeight / d.layout.zoom], [180, d.layout.bufferHeight / d.layout.zoom / 2]];
      const mapped = points.map(([x, y]) => {
        const cx = r.left + (x! * d.layout.zoom + d.layout.offsetX) * r.width / d.layout.bufferWidth;
        const cy = r.top + (y! * d.layout.zoom + d.layout.offsetY) * r.height / d.layout.bufferHeight;
        return { expected: { x, y }, actual: r2.renderer.clientToWorld(cx, cy), camera: r2.renderer.cameraToWorld(x! * d.layout.zoom + d.layout.offsetX, y! * d.layout.zoom + d.layout.offsetY) };
      });
      return { width: canvas.width, height: canvas.height, cssWidth: r.width, cssHeight: r.height, layout: d.layout, tick: d.coreTick, phaseMs: d.displayTime, mapped, textures: d.textures, rgba8TextureBytes: d.rgba8TextureBytes, replayEqual: JSON.stringify(d.snapshot) === JSON.stringify(r2.replayPrefix()) };
    });
    assert(metrics.replayEqual, 'renderer must not mutate core prefix');
    assert(Math.abs(metrics.width - metrics.cssWidth * Math.min(dpr, 2)) <= 1.1, 'buffer must follow real CSS width');
    assert(Math.abs(metrics.height - metrics.cssHeight * Math.min(dpr, 2)) <= 1.1, 'buffer must follow real CSS height');
    for (const m of metrics.mapped) { assert(Math.abs(m.expected.x! - m.actual.x) < 1e-6); assert(Math.abs(m.expected.y! - m.actual.y) < 1e-6); assert(m.camera && Math.abs(m.camera.x - m.expected.x!) < .001 && Math.abs(m.camera.y - m.expected.y!) < .001, 'actual Phaser camera must match CSS transform'); }
    if (dpr === 2) await page.screenshot({ path: `${out}/${game}-${width}-dpr2.png`, fullPage: true });
    results.push({ game, viewport: { width, height }, requestedDpr: dpr, metrics });
    // Actual pointer mapping after resize, including corners/center; input itself stays core-owned.
    if (game === 'herd' && width === 390 && dpr === 2) {
      await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(120);
      const resized = await page.evaluate(() => { const r2=(window as any).r2, c=document.querySelector('canvas')!,r=c.getBoundingClientRect(); return { layout:r2.diagnostics().layout,center:r2.renderer.clientToWorld(r.left+r.width/2,r.top+r.height/2) }; });
      assert(Math.abs(resized.center.x - 180) < 1e-5); assert(Math.abs(resized.center.y - 210) < 1e-5);
      results.push({ resized });
    }
    await page.close();
  }
  // Real-time recordings: no controlled clock or fast forward; legal input policy, real Phaser/core.
  for (const game of ['stack', 'runner', 'herd']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, recordVideo: { dir: `${out}/raw-video`, size: { width: 390, height: 844 } } });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:5175/tests/r2-preview.html?game=${game}`);
    await page.waitForFunction(() => Boolean((window as any).r2));
    await page.getByRole('button', { name: '开始实速回放' }).click();
    const startTime = Date.now(); await page.waitForTimeout(game === 'herd' ? 15000 : 12000); const durationMs = Date.now() - startTime;
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    const trace = await page.evaluate(() => (window as any).r2.diagnostics());
    await writeFile(`${out}/${game}-realtime-trace.json`, JSON.stringify({ scope:'real-time legal input replay; v4 assets plus R2 presenter; not full game or physical device',durationMs, ...trace }, null, 2));
    const video = page.video()!; await context.close(); await video.saveAs(`${out}/${game}-realtime.webm`);
    results.push({ game, realTime: true, durationMs, tick: trace.coreTick, inputCount: trace.inputs.length, eventTypes: [...new Set(trace.eventLog.map((e: any) => e.event.type))], video: `${game}-realtime.webm` });
  }
} finally { await browser.close(); }
const manifestHash = createHash('sha256').update(await readFile('apps/web/public/assets/asset-manifest.v1.json')).digest('hex');
await writeFile(`${out}/results.json`, JSON.stringify({ scope: 'desktop Chromium viewport and real-time browser recordings, no physical device claim', manifestHash, errors, writes, results }, null, 2));
console.log(JSON.stringify({ out, count: results.length, errors, writes, manifestHash }));
if (errors.length || writes) process.exitCode = 1;
