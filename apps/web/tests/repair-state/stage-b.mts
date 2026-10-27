import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import qrcode from 'qrcode-generator';
import { fixtures, ids, envelope, failure, defaultReply } from '../page-state-fixtures';
import type { FixtureOptions, Reply } from '../page-state-fixtures';
const mode = process.argv[2] ?? 'green';
const out = `output/repair-20261027/ui/b-${mode}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: { id: string; pass: boolean; error?: string }[] = [];
type RequestInfo = { path: string; method: string; body: Record<string, unknown> | null };
type F = ReturnType<typeof fixtures>;
const visible = (p: Page, text: string) => p.getByText(text, { exact: false }).first().waitFor({ timeout: 3000 });
async function test(id: string, hash: string, options: FixtureOptions, reply: (r: RequestInfo, f: F) => Reply | undefined, check: (p: Page, requests: RequestInfo[], f: F) => Promise<void>) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); page.setDefaultTimeout(3500); const f = fixtures(options); const requests: RequestInfo[] = [];
  await page.route('**/api/**', async route => {
    const req = route.request(); const r = { path: new URL(req.url()).pathname, method: req.method(), body: req.postDataJSON() as Record<string, unknown> | null }; requests.push(r);
    const response = reply(r, f) ?? (r.method === 'GET' ? defaultReply(r.path, f, options) : failure('NOT_FOUND', 404));
    if (response.delay) await new Promise(resolve => setTimeout(resolve, response.delay));
    await route.fulfill({ status: response.status, json: response.body }).catch(() => {});
  });
  try { await page.goto(`http://127.0.0.1:5175/#${hash}`); await check(page, requests, f); results.push({ id, pass: true }); }
  catch (e) { results.push({ id, pass: false, error: String(e) }); }
  await page.screenshot({ path: `${out}/${id}.png`, fullPage: true }); await context.close();
}
let meReads = 0;
await test('F12-503-retry', '/', {}, r => r.path === '/api/me' && ++meReads === 1 ? failure('SERVER_BUSY', 503, '夹具：身份同步失败') : undefined, async p => {
  await visible(p, '夹具：身份同步失败');
  assert.equal(await p.getByText('绑定身份，领取正式机会', { exact: true }).count(), 0);
  await p.getByRole('button', { name: '重新读取身份' }).click(); await visible(p, '我的荣誉积分');
});
await test('F13-check-in-admission', '/tutorial/herd', { phase: 'CHECK_IN' }, () => undefined, async p => {
  await visible(p, '绕到小羊后面');
  assert.equal(await p.getByRole('link', { name: '正式挑战 · 使用 1 次机会' }).count(), 0);
  await visible(p, '等待正式挑战开放');
});
await test('F14-gift-image-failure', '/gifts', {}, (r, f) => r.path === '/api/gifts' ? envelope('GiftListResponse', [{ gift_id: f.gift.gift_id, name: f.gift.name, description: f.gift.description, image_asset_key: 'fixture-image', price_points: 20, active: true, available_count: 9 }]) : undefined, async p => {
  await p.route('**/assets/asset-manifest.v1.json', route => route.fulfill({ json: { assets: [{ asset_id: 'fixture-image', runtime_path: '/fixture-image.png' }] } }));
  await p.route('**/fixture-image.png', route => route.fulfill({ status: 404, body: 'missing' }));
  await p.reload(); await visible(p, '礼品图片加载失败');
  await p.getByRole('button', { name: '重试礼品图片' }).waitFor();
});
await test('F15-recovery-targets', '/', { active: true, sessionState: 'RUNNING' }, () => undefined, async p => {
  await visible(p, '有一局尚未完成');
  for (const width of [320, 360, 390, 430]) {
    await p.setViewportSize({ width, height: 844 });
    for (const name of ['恢复原局', '查看状态']) {
      const box = await p.getByRole('link', { name, exact: true }).boundingBox();
      assert.ok(box && box.width >= 48 && box.height >= 48, `${width} ${name} requires 48px target, got ${JSON.stringify(box)}`);
    }
  }
});
await test('F16-order-qr', `/order/${ids.order}`, { phase: 'REDEEMING' }, () => undefined, async p => {
  await visible(p, '向工作人员展示此领取码');
  await p.getByRole('img', { name: '领取凭证二维码' }).waitFor({ timeout: 3000 });
  assert.ok(!p.url().includes('v'.repeat(43)));
});
await test('F16-upload-and-lookup', '/claim', { identity: 'redeemer', phase: 'REDEEMING' }, (r, f) => r.path === '/api/admin/redemptions/lookup' ? envelope('ClaimViewResponse', f.claim) : undefined, async (p, requests) => {
  const qr = qrcode(0, 'M'); qr.addData('v'.repeat(43)); qr.make();
  const raw = qr.createDataURL(6, 24).split(',')[1]; if (!raw) throw new Error('Missing QR fixture');
  await p.getByLabel('上传领取凭证二维码图片').setInputFiles({ name: 'fixture-qr.gif', mimeType: 'image/gif', buffer: Buffer.from(raw, 'base64') });
  await visible(p, '当前可以核销');
  const lookups = requests.filter(r => r.path === '/api/admin/redemptions/lookup');
  assert.equal(lookups.length, 1); assert.deepEqual(lookups[0]?.body, { voucher_token: 'v'.repeat(43) });
  assert.equal(requests.filter(r => r.path === '/api/admin/redemptions/redeem').length, 0, 'scanning cannot claim without confirmation');
  await p.getByLabel('领取码 / 订单编号').fill('v'.repeat(43));
  await p.getByRole('button', { name: '查询领取记录', exact: true }).click(); await visible(p, '当前可以核销');
  assert.deepEqual(requests.filter(r => r.path === '/api/admin/redemptions/lookup')[1]?.body, lookups[0]?.body, 'manual input and decoded QR use the same lookup body');
});
await test('F12-first-slow-identity', '/gifts', { phase: 'REDEEMING' }, (r, f) => r.path === '/api/me' ? { ...envelope('IdentityResponse', f.me), delay: 900 } : undefined, async p => {
  await visible(p, '正在读取身份');
  assert.equal(await p.getByRole('link', { name: '绑定身份', exact: true }).count(), 0);
  await p.getByRole('button', { name: '确认扣除 20 分兑换' }).waitFor();
  assert.equal(await p.getByRole('button', { name: '确认扣除 20 分兑换' }).isDisabled(), true);
  await p.waitForTimeout(1000);
  assert.equal(await p.getByRole('button', { name: '确认扣除 20 分兑换' }).isDisabled(), false);
});
await test('F12-unauthenticated', '/', { identity: 'anonymous' }, () => undefined, async p => {
  await visible(p, '当前未绑定身份或会话已过期'); await p.getByRole('link', { name: '绑定身份', exact: true }).waitFor();
  assert.equal(await p.getByRole('button', { name: '重新读取身份' }).count(), 0);
});
let pollReads = 0;
await test('F12-poll-failure-disables-redeem', '/gifts', { phase: 'REDEEMING' }, r => r.path === '/api/me' && ++pollReads === 2 ? failure('SERVER_BUSY', 503, '夹具：轮询失同步') : undefined, async p => {
  await p.clock.install(); pollReads = 0; await p.reload();
  await p.getByRole('button', { name: '确认扣除 20 分兑换' }).waitFor();
  await p.clock.fastForward(11000); await visible(p, '夹具：轮询失同步');
  assert.equal(await p.getByRole('button', { name: '确认扣除 20 分兑换' }).isDisabled(), true);
  await p.getByRole('button', { name: '重新读取身份' }).click();
  await p.waitForFunction(() => !document.querySelector('main [role=alert]'));
  assert.equal(await p.getByRole('button', { name: '确认扣除 20 分兑换' }).isDisabled(), false);
});
for (const [suffix, options, expected] of [
  ['playing', {}, '正式挑战 · 使用 1 次机会'],
  ['draining-grant', { phase: 'DRAINING', grant: true }, '原机会补场 · 使用授权机会'],
  ['draining-no-grant', { phase: 'DRAINING' }, '当前未开放新的正式挑战'],
  ['no-slots', { slots: 0 }, '正式机会已用尽'],
  ['active', { active: true, sessionState: 'RUNNING' }, '恢复原局'],
] satisfies [string, FixtureOptions, string][]) await test(`F13-${suffix}`, '/tutorial/herd', options, () => undefined, async (p, requests) => {
  await visible(p, expected);
  const target = p.getByRole('link', { name: expected, exact: true });
  if (['playing', 'draining-grant', 'active'].includes(suffix)) assert.ok((await target.getAttribute('href'))?.startsWith('#/play/'));
  else assert.equal(await p.getByRole('link', { name: '正式挑战 · 使用 1 次机会' }).count(), 0);
  assert.equal(requests.filter(r => r.method !== 'GET').length, 0, 'tutorial cannot start or finish formal sessions');
});
for (const options of [{ frozen: true }, { expired: true }, { orderStatus: 'CLAIMED' }, { orderStatus: 'CANCELLED' }] satisfies FixtureOptions[]) await test(`F16-token-state-${Object.keys(options)[0]}-${Object.values(options)[0]}`, `/order/${ids.order}`, { phase: 'REDEEMING', ...options }, () => undefined, async p => {
  await visible(p, `订单 ${ids.order}`);
  assert.equal(await p.getByRole('img', { name: '领取凭证二维码' }).count(), 0);
  assert.equal(await p.getByRole('button', { name: '复制领取码' }).count(), 0);
});
await test('F16-camera-unavailable-and-invalid-image', '/claim', { identity: 'redeemer', phase: 'REDEEMING' }, () => undefined, async (p, requests) => {
  await p.evaluate(() => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); });
  await p.getByRole('button', { name: '开启相机扫描领取码' }).click(); await visible(p, '当前浏览器没有可用相机');
  await p.getByLabel('上传领取凭证二维码图片').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image bytes') });
  await visible(p, '图片无法解码');
  assert.equal(requests.filter(r => r.method === 'POST').length, 0);
});
let claimTries = 0;
await test('F16-confirm-unknown-query-duplicate', '/claim', { identity: 'redeemer', phase: 'REDEEMING' }, (r, f) => {
  if (r.path === '/api/admin/redemptions/lookup') return envelope('ClaimViewResponse', claimTries ? { ...f.claim, claim_action: 'ALREADY_CLAIMED', order: { ...f.claim.order, status: 'CLAIMED', claimed_at: new Date().toISOString(), claimed_by_display_name: '夹具核销员' } } : f.claim);
  if (r.path === '/api/admin/redemptions/redeem') { claimTries++; return failure('COMMIT_STATUS_UNKNOWN', 503, '夹具：核销结果未知'); }
  return undefined;
}, async (p, requests) => {
  await p.getByLabel('领取码 / 订单编号').fill('v'.repeat(43)); await p.getByRole('button', { name: '查询领取记录', exact: true }).click();
  await visible(p, '当前可以核销'); await p.getByRole('button', { name: '确认本人，核销此订单' }).click();
  await visible(p, '夹具：核销结果未知'); await p.getByRole('button', { name: '响应不明？查询原核销记录' }).click();
  await visible(p, '此订单已领取'); assert.equal(await p.getByRole('button', { name: '确认本人，核销此订单' }).isDisabled(), true);
  assert.equal(requests.filter(r => r.path === '/api/admin/redemptions/redeem').length, 1);
});
{
  const p = await browser.newPage(); p.setDefaultTimeout(3500);
  await p.route('**/repair-gift-image', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true; import("/tests/repair-state/image-harness.tsx");</script>' }));
  await p.route('**/assets/asset-manifest.v1.json', route => route.fulfill({ json: { assets: [{ asset_id: 'image-A', runtime_path: '/fixture-image-A.png' }, { asset_id: 'image-B', runtime_path: '/fixture-image-B.png' }] } }));
  const qr = qrcode(0, 'M'); qr.addData('fixture'); qr.make(); const raw = qr.createDataURL().split(',')[1]; if (!raw) throw new Error('Missing image fixture');
  let imageTries = 0;
  await p.route('**/fixture-image-A.png*', route => route.fulfill(++imageTries === 1 ? { status: 200, contentType: 'image/png', body: 'invalid PNG' } : { status: 200, contentType: 'image/gif', body: Buffer.from(raw, 'base64') }));
  await p.route('**/fixture-image-B.png*', async route => { await new Promise(resolve => setTimeout(resolve, 300)); await route.fulfill({ status: 404, body: 'missing B' }).catch(() => {}); });
  try {
    await p.goto('http://127.0.0.1:5175/repair-gift-image'); await visible(p, '实物图待配置');
    await p.evaluate('window.repairImage.select("missing")'); await visible(p, '礼品图片未在资源清单中登记');
    await p.evaluate('window.repairImage.select("image-A")'); await visible(p, '礼品图片加载失败');
    await p.getByRole('button', { name: '重试礼品图片' }).click(); await p.getByRole('img', { name: '夹具礼品图片' }).waitFor({ state: 'visible' });
    assert.equal(await p.getByRole('img', { name: '夹具礼品图片' }).evaluate((img: HTMLImageElement) => img.naturalWidth > 0), true);
    await p.evaluate('window.repairImage.select("image-B")'); await visible(p, '正在加载礼品图片');
    assert.equal(await p.getByRole('img', { name: '夹具礼品图片' }).count(), 0, 'asset key switch must immediately hide A');
    await visible(p, '礼品图片加载失败');
    results.push({ id: 'F14-unconfigured-missing-decode-retry-key-switch', pass: true });
  } catch (e) { results.push({ id: 'F14-unconfigured-missing-decode-retry-key-switch', pass: false, error: String(e) }); }
  await p.screenshot({ path: `${out}/F14-unconfigured-missing-decode-retry-key-switch.png` }); await p.close();
}
for (const lifecycle of ['decode', 'closed-pending', 'disabled-pending', 'unmounted-pending', 'disabled-running', 'permission-denied']) {
  const p = await browser.newPage(); p.setDefaultTimeout(3500);
  await p.addInitScript('globalThis.__name = target => target;');
  await p.route('**/repair-camera', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true; import("/tests/repair-state/camera-harness.tsx");</script>' }));
  try {
    await p.goto('http://127.0.0.1:5175/repair-camera');
    await p.getByRole('button', { name: '开启相机扫描领取码' }).waitFor();
    await p.evaluate((denied: boolean) => {
      const pending: ((s: MediaStream) => void)[] = [];
      const state = { pending, stopped: 0, calls: 0 };
      Object.assign(window, { repairMedia: state });
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => { state.calls++; return denied ? Promise.reject(new Error('NotAllowedError')) : new Promise<MediaStream>(resolve => pending.push(resolve)); } } });
    }, lifecycle === 'permission-denied');
    await p.getByRole('button', { name: '开启相机扫描领取码' }).click();
    if (lifecycle === 'permission-denied') { await visible(p, '无法开启相机或相机权限被拒绝'); }
    else {
      await p.waitForFunction('window.repairMedia.calls === 1');
      if (lifecycle === 'closed-pending') await p.getByRole('button', { name: '关闭相机' }).click();
      if (lifecycle === 'disabled-pending') await p.evaluate('window.repairCamera.disable(true)');
      if (lifecycle === 'unmounted-pending') await p.evaluate('window.repairCamera.unmount()');
      const qr = qrcode(0, 'M'); qr.addData('v'.repeat(43)); qr.make();
      const dataUrl = lifecycle === 'disabled-running' ? null : qr.createDataURL(6, 24);
      await p.evaluate(async (url: string | null) => {
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 320;
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('No test canvas');
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 320, 320);
        if (url) { const img = new Image(); img.src = url; await img.decode(); ctx.drawImage(img, 0, 0, 320, 320); }
        const media = canvas.captureStream(15);
        const state = Reflect.get(window, 'repairMedia') as { stopped: number; pending: ((s: MediaStream) => void)[] };
        for (const track of media.getTracks()) { const stop = track.stop.bind(track); track.stop = () => { state.stopped++; stop(); }; }
        state.pending[0]?.(media);
      }, dataUrl);
      if (lifecycle === 'decode') {
        await visible(p, '识别次数 1'); assert.equal(await p.evaluate('window.repairCamera.received[0]'), 'v'.repeat(43));
      } else {
        if (lifecycle === 'disabled-running') { await p.waitForTimeout(150); await p.evaluate('window.repairCamera.disable(true)'); }
        await p.waitForTimeout(150); await visible(p, '识别次数 0');
      }
      await p.waitForFunction('window.repairMedia.stopped === 1');
    }
    assert.ok(!p.url().includes('v'.repeat(43))); results.push({ id: `F16-controlled-camera-${lifecycle}`, pass: true });
  } catch (e) { results.push({ id: `F16-controlled-camera-${lifecycle}`, pass: false, error: String(e) }); }
  await p.screenshot({ path: `${out}/F16-controlled-camera-${lifecycle}.png` }); await p.close();
}
let runtimeMeReads = 0;
await test('F12-running-session-survives-identity-503', '/play/stack', {}, (r, f) => {
  if (r.path === '/api/me' && ++runtimeMeReads > 1) return failure('SERVER_BUSY', 503, '夹具：运行中身份失同步');
  if (r.path === '/api/sessions/start') return envelope('SessionResponse', { ...f.session, client_instance_id: r.body?.client_instance_id }, 201);
  return undefined;
}, async (p, requests) => {
  await p.getByRole('button', { name: '预检并预约 · 使用 1 次机会' }).click();
  await p.waitForFunction(() => Number(document.querySelector('.game-stage')?.getAttribute('data-game-tick')) > 0, undefined, { timeout: 10000 });
  const canvas = await p.locator('canvas').elementHandle(); assert.ok(canvas);
  await p.getByText('夹具：运行中身份失同步', { exact: false }).waitFor({ timeout: 13000 });
  const tick = Number(await p.locator('.game-stage').getAttribute('data-game-tick'));
  assert.equal(await p.evaluate(el => el === document.querySelector('canvas'), canvas), true, 'identity read failure must not remount renderer');
  await p.waitForTimeout(350);
  assert.ok(Number(await p.locator('.game-stage').getAttribute('data-game-tick')) > tick, 'original formal timeline continues');
  assert.equal(requests.filter(r => r.path === '/api/sessions/start').length, 1);
});
let staffMeReads = 0;
await test('F16-identity-recovery-retains-claim-key', '/claim', { identity: 'redeemer', phase: 'REDEEMING' }, (r, f) => {
  if (r.path === '/api/me' && ++staffMeReads === 2) return failure('SERVER_BUSY', 503, '夹具：核销员身份失同步');
  if (r.path === '/api/admin/redemptions/lookup') return envelope('ClaimViewResponse', f.claim);
  if (r.path === '/api/admin/redemptions/redeem') return failure('COMMIT_STATUS_UNKNOWN', 503, '夹具：核销提交结果未知');
  return undefined;
}, async (p, requests) => {
  await p.getByLabel('领取码 / 订单编号').fill(ids.order); await p.getByRole('button', { name: '查询领取记录', exact: true }).click();
  await visible(p, '当前可以核销'); await p.getByRole('button', { name: '确认本人，核销此订单' }).click(); await visible(p, '夹具：核销提交结果未知');
  await p.getByText('夹具：核销员身份失同步', { exact: false }).waitFor({ timeout: 12000 });
  assert.equal(await p.getByRole('button', { name: '确认本人，核销此订单' }).count(), 0);
  await p.getByRole('button', { name: '重新读取身份' }).click();
  await p.getByLabel('领取码 / 订单编号').fill(ids.order); await p.getByRole('button', { name: '查询领取记录', exact: true }).click(); await visible(p, '当前可以核销');
  await p.getByRole('button', { name: '确认本人，核销此订单' }).click(); await visible(p, '夹具：核销提交结果未知');
  const claims = requests.filter(r => r.path === '/api/admin/redemptions/redeem');
  assert.equal(claims.length, 2); assert.deepEqual(claims[0]?.body, claims[1]?.body);
});
await browser.close();
await writeFile(`${out}/results.json`, JSON.stringify({ environment: 'isolated Chromium, API fixtures only; no real business POST / physical camera / PostgreSQL', results }, null, 2));
console.log(JSON.stringify(results, null, 2)); if (results.some(r => !r.pass)) process.exitCode = 1;
