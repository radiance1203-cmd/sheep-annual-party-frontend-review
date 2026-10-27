import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const mode = process.argv[2] ?? 'red';
const out = `output/repair-20261027/ui/resource-poll-${mode}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage(); page.setDefaultTimeout(2500);
await page.route('**/repair-resource?poll=1', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true; import("/tests/repair-state/resource-harness.tsx");</script>' }));
const results: { id: string; pass: boolean; error?: string }[] = [];
try {
  await page.goto('http://127.0.0.1:5175/repair-resource?poll=1');
  await page.waitForFunction('window.repairResource?.requests.length >= 1');
  await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent?.startsWith('A:'));
  assert.match(await page.getByRole('status').innerText(), /^A:\d+$/u, 'a stable slow response must become visible');
  results.push({ id: 'resource-slow-poll-350ms-over-200ms', pass: true });
} catch (cause) { results.push({ id: 'resource-slow-poll-350ms-over-200ms', pass: false, error: String(cause) }); }
await page.screenshot({ path: `${out}/slow-poll.png` });
await writeFile(`${out}/results.json`, JSON.stringify({ environment: 'real useResource hook in Chromium, deterministic 350ms read and 200ms interval fixture; no business API', results, requestCount: await page.evaluate('window.repairResource.requests.length') }, null, 2));
await browser.close(); console.log(JSON.stringify(results, null, 2)); if (results.some(r => !r.pass)) process.exitCode = 1;
