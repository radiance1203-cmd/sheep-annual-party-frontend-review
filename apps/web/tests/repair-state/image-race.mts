import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import qrcode from 'qrcode-generator';
const mode = process.argv[2] ?? 'green';
const out = `output/repair-20261027/ui/b-image-${mode}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: { id: string; pass: boolean; error?: string }[] = [];
for (const change of ['retry', 'key']) {
  const page = await browser.newPage(); page.setDefaultTimeout(3000);
  await page.route('**/repair-gift-image', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true; import("/tests/repair-state/image-harness.tsx");</script>' }));
  await page.addInitScript(`globalThis.__name = target => target; window.repairDecode=[]; const originalDecode=HTMLImageElement.prototype.decode; HTMLImageElement.prototype.decode=function(){ if(this.src.includes('fixture-image-A.png'))return new Promise((resolve,reject)=>window.repairDecode.push({resolve,reject})); return originalDecode.call(this); };`);
  await page.route('**/assets/asset-manifest.v1.json', route => route.fulfill({ json: { assets: [{ asset_id: 'image-A', runtime_path: '/fixture-image-A.png' }, { asset_id: 'image-B', runtime_path: '/fixture-image-B.png' }] } }));
  const qr = qrcode(0, 'M'); qr.addData('fixture-image'); qr.make(); const raw = qr.createDataURL().split(',')[1]; if (!raw) throw new Error('Missing image fixture');
  let requests = 0;
  await page.route('**/fixture-image-A.png*', route => route.fulfill(++requests === 1 ? { contentType: 'image/gif', body: Buffer.from(raw, 'base64') } : { status: 404, body: 'retry-image-missing' }));
  await page.route('**/fixture-image-B.png*', route => route.fulfill({ status: 404, body: 'B-image-missing' }));
  try {
    await page.goto('http://127.0.0.1:5175/repair-gift-image');
    await page.getByText('实物图待配置').waitFor();
    await page.evaluate('window.repairImage.select("image-A")');
    await page.waitForFunction('window.repairDecode.length === 1');
    if (change === 'retry') {
      // Controlled callback fixture: hold decode, deliver image error, then
      // exercise the real retry UI and a genuine 404 for the new attempt.
      await page.locator('img').evaluate(img => img.dispatchEvent(new Event('error')));
      await page.getByRole('button', { name: '重试礼品图片' }).click();
    } else await page.evaluate('window.repairImage.select("image-B")');
    await page.getByText('礼品图片加载失败').waitFor();
    await page.evaluate('window.repairImageChanges = 0; new MutationObserver(changes => { for (const change of changes) for(const node of change.addedNodes) if(node.nodeName === "IMG") window.repairImageChanges++; }).observe(document.getElementById("root"), {subtree:true, childList:true});');
    await page.evaluate('window.repairDecode[0].resolve()');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate('window.repairImageChanges'), 0, 'late decode must not briefly reinsert a known failed image');
    assert.equal(await page.getByRole('button', { name: '重试礼品图片' }).count(), 1, 'late decode from detached image must preserve current failure and retry');
    assert.equal(await page.getByRole('img', { name: '夹具礼品图片' }).count(), 0);
    results.push({ id: `F14-${change}-late-decode`, pass: true });
  } catch (cause) { results.push({ id: `F14-${change}-late-decode`, pass: false, error: String(cause) }); }
  await page.screenshot({ path: `${out}/${change}.png` }); await page.close();
}
await browser.close();
await writeFile(`${out}/results.json`, JSON.stringify({ environment: 'real AssetImage, controlled delayed decode/error callbacks, actual HTTP 404 fixture; no business API', results }, null, 2));
console.log(JSON.stringify(results, null, 2)); if (results.some(r => !r.pass)) process.exitCode = 1;
