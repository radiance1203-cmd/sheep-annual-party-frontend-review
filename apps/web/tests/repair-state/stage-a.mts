import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fixtures, ids, envelope, failure, defaultReply } from '../page-state-fixtures';
import type { Reply } from '../page-state-fixtures';

const mode = process.argv[2] ?? 'green';
const out = `output/repair-20261027/ui/${mode}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: { id: string; pass: boolean; error?: string }[] = [];
const second = '11111111-1111-4111-8111-111111111111';
type RequestInfo = { path: string; method: string; body: Record<string, unknown> | null };
type F = ReturnType<typeof fixtures>;
async function test(id: string, hash: string, reply: (r: RequestInfo, f: F) => Reply | undefined, check: (p: Page, requests: RequestInfo[], f: F) => Promise<void>) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const f = fixtures({ phase: 'REDEEMING', balance: 100, sessionState: 'SETTLED' });
  const requests: RequestInfo[] = [];
  await page.route('**/api/**', async route => {
    const req = route.request();
    const r = { path: new URL(req.url()).pathname, method: req.method(), body: req.postDataJSON() as Record<string, unknown> | null };
    requests.push(r);
    const response = reply(r, f) ?? (r.method === 'GET' ? defaultReply(r.path, f, { phase: 'REDEEMING' }) : failure('NOT_FOUND', 404));
    if (response.abort) { await route.abort('failed'); return; }
    if (response.delay) await new Promise(resolve => setTimeout(resolve, response.delay));
    await route.fulfill({ status: response.status, json: response.body }).catch(() => {});
  });
  try {
    await page.goto(`http://127.0.0.1:5175/#${hash}`);
    await check(page, requests, f);
    results.push({ id, pass: true });
  } catch (e) { results.push({ id, pass: false, error: String(e) }); }
  await page.screenshot({ path: `${out}/${id}.png`, fullPage: true });
  await context.close();
}
const visible = (p: Page, text: string) => p.getByText(text, { exact: false }).first().waitFor({ timeout: 3000 });
const publicGifts = (f: F) => { const { gift_id, name, description, image_asset_key, price_points, active, available_count } = f.gift; const gift = { gift_id, name, description, image_asset_key, price_points, active, available_count }; return [gift, { ...gift, gift_id: second, name: '夹具B礼品' }]; };
await test('F01-order-delayed-B', `/order/${ids.order}`, (r, f) => r.path === `/api/redemptions/${second}` ? { ...envelope('RedemptionResponse', { ...f.order, redemption_id: second, gift_name_snapshot: '夹具B礼品' }), delay: 1000 } : undefined, async (p, requests) => {
  await visible(p, '夹具纪念礼品');
  await p.evaluate(id => { location.hash = `/order/${id}`; }, second);
  await p.waitForRequest(r => r.url().endsWith(`/redemptions/${second}`));
  assert.equal(await p.getByText('夹具纪念礼品', { exact: true }).count(), 0, 'route B must immediately hide order A');
  assert.equal(await p.getByRole('button', { name: '取消未领取订单并退回原价' }).count(), 0);
  await visible(p, '夹具B礼品');
  await p.getByRole('button', { name: '取消未领取订单并退回原价' }).click();
  await p.waitForTimeout(100);
  assert.equal(requests.filter(r => r.method === 'POST')[0]?.path, `/api/redemptions/${second}/cancel`);
});
await test('F01-result-delayed-B', `/result/${ids.session}`, (r, f) => r.path === `/api/sessions/${second}` ? { ...envelope('SessionResponse', { ...f.session, session_id: second, game_id: 'runner' }), delay: 1000 } : undefined, async p => {
  await visible(p, `局号 ${ids.session}`);
  await p.evaluate(id => { location.hash = `/result/${id}`; }, second);
  await p.waitForRequest(r => r.url().endsWith(`/sessions/${second}`));
  assert.equal(await p.getByText(`局号 ${ids.session}`, { exact: true }).count(), 0, 'route B must immediately hide result A');
  await visible(p, `局号 ${second}`);
});
await test('F02-out-of-stock-switch-B', '/gifts', (r, f) => {
  if (r.path === '/api/gifts') return envelope('GiftListResponse', publicGifts(f));
  if (r.path === '/api/redemptions' && r.method === 'POST') return r.body?.gift_id === ids.gift ? failure('OUT_OF_STOCK', 409, '夹具：已售罄') : envelope('RedemptionResponse', { ...f.order, gift_id: second }, 201);
  return undefined;
}, async (p, requests) => {
  const buttons = p.getByRole('button', { name: '确认扣除 20 分兑换' });
  await buttons.first().click(); await visible(p, '夹具：已售罄');
  await buttons.nth(1).click(); await p.waitForTimeout(250);
  const posts = requests.filter(r => r.path === '/api/redemptions' && r.method === 'POST');
  assert.equal(posts.length, 2, 'definitive stock rejection must allow gift B');
  assert.equal(posts[1]?.body?.gift_id, second);
  assert.notEqual(posts[0]?.body?.idempotency_key, posts[1]?.body?.idempotency_key);
});
for (const [kind, original, endpoint] of [['order', ids.order, 'redemptions'], ['result', ids.session, 'sessions']] as const) {
  for (const status of [404, 503]) await test(`F01-${kind}-B-${status}`, `/${kind}/${original}`, r => r.path === `/api/${endpoint}/${second}` ? { ...failure(status === 404 ? 'NOT_FOUND' : 'SERVER_BUSY', status, `夹具：B-${status}`), delay: 100 } : undefined, async p => {
    await visible(p, original);
    await p.evaluate(({ kind, id }) => { location.hash = `/${kind}/${id}`; }, { kind, id: second });
    await visible(p, `夹具：B-${status}`);
    assert.equal(await p.getByText(original, { exact: false }).count(), 0);
    assert.equal(await p.getByRole('button', { name: '取消未领取订单并退回原价' }).count(), 0);
    assert.equal(await p.getByRole('button', { name: '复制领取码' }).count(), 0);
  });
  let reads = 0;
  await test(`F01-${kind}-ABA`, `/${kind}/${original}`, (r, f) => {
    if (r.path === `/api/${endpoint}/${second}`) return { ...(kind === 'order' ? envelope('RedemptionResponse', { ...f.order, redemption_id: second, gift_name_snapshot: '迟到B礼品' }) : envelope('SessionResponse', { ...f.session, session_id: second, terminal_reason: '迟到B结果' })), delay: 700 };
    if (r.path === `/api/${endpoint}/${original}`) { reads++; return { ...(kind === 'order' ? envelope('RedemptionResponse', { ...f.order, gift_name_snapshot: reads === 1 ? '首次A礼品' : '当前A礼品' }) : envelope('SessionResponse', { ...f.session, game_id: reads === 1 ? 'stack' : 'runner' })), delay: reads === 1 ? 0 : 100 }; }
    return undefined;
  }, async p => {
    await visible(p, kind === 'order' ? '首次A礼品' : '羊羊叠高高 · 第');
    await p.evaluate(({ kind, id }) => { location.hash = `/${kind}/${id}`; }, { kind, id: second });
    await p.waitForRequest(r => r.url().endsWith(`/${endpoint}/${second}`));
    await p.evaluate(({ kind, id }) => { location.hash = `/${kind}/${id}`; }, { kind, id: original });
    await visible(p, kind === 'order' ? '当前A礼品' : '羊羊跨栏 · 第');
    await p.waitForTimeout(800);
    await visible(p, kind === 'order' ? '当前A礼品' : '羊羊跨栏 · 第');
    assert.equal(await p.getByText('迟到B', { exact: false }).count(), 0);
  });
}
let unknownAttempts = 0;
await test('F02-unknown-refresh-original-recovery', '/gifts', (r, f) => {
  if (r.path === '/api/gifts') return envelope('GiftListResponse', publicGifts(f));
  if (r.path === '/api/redemptions' && r.method === 'POST') return ++unknownAttempts === 1 ? failure('COMMIT_STATUS_UNKNOWN', 503, '夹具：提交结果未知') : envelope('RedemptionResponse', f.order, 201);
  return undefined;
}, async (p, requests) => {
  await p.getByRole('button', { name: '确认扣除 20 分兑换' }).first().click();
  await visible(p, '夹具：提交结果未知');
  await p.reload(); await visible(p, '原兑换请求结果未明');
  await p.getByRole('button', { name: '确认扣除 20 分兑换' }).nth(1).click();
  await visible(p, '另一个礼品请求结果未明');
  assert.equal(requests.filter(r => r.method === 'POST').length, 1);
  await p.getByRole('button', { name: '查回原订单 / 重试原请求' }).click();
  await visible(p, `订单 ${ids.order}`);
  const posts = requests.filter(r => r.method === 'POST');
  assert.equal(posts.length, 2); assert.deepEqual(posts[0]?.body, posts[1]?.body);
});
await test('F02-identity-event-isolation', '/gifts', (r, f) => {
  if (r.path === '/api/gifts') return envelope('GiftListResponse', publicGifts(f));
  if (r.path === '/api/redemptions' && r.method === 'POST') return failure('COMMIT_STATUS_UNKNOWN', 503, '夹具：提交结果未知');
  return undefined;
}, async (p, requests, f) => {
  const buy = () => p.getByRole('button', { name: '确认扣除 20 分兑换' });
  await buy().first().click(); await visible(p, '夹具：提交结果未知');
  f.me.participant.participant_id = second;
  await p.reload(); await buy().nth(1).click(); await visible(p, '夹具：提交结果未知');
  f.event.event_id = second;
  await p.reload(); await buy().first().click(); await visible(p, '夹具：提交结果未知');
  const posts = requests.filter(r => r.method === 'POST');
  assert.equal(posts.length, 3);
  assert.deepEqual(posts.map(r => r.body?.gift_id), [ids.gift, second, ids.gift]);
  assert.equal(new Set(posts.map(r => r.body?.idempotency_key)).size, 3);
  f.event.event_id = ids.event; f.me.participant.participant_id = ids.participant;
  await p.reload(); await visible(p, '原兑换请求结果未明');
  await p.getByRole('button', { name: '查回原订单 / 重试原请求' }).click();
  await visible(p, '夹具：提交结果未知');
  assert.deepEqual(requests.filter(r => r.method === 'POST')[3]?.body, posts[0]?.body);
});
let droppedAttempts = 0;
await test('F02-network-abort-original-key', '/gifts', (r, f) => r.path === '/api/redemptions' && r.method === 'POST' ? ++droppedAttempts === 1 ? { ...envelope('RedemptionResponse', f.order, 201), abort: true } : envelope('RedemptionResponse', f.order) : undefined, async (p, requests) => {
  await p.getByRole('button', { name: '确认扣除 20 分兑换' }).click();
  await visible(p, '原兑换请求结果未明'); await p.reload();
  await p.getByRole('button', { name: '查回原订单 / 重试原请求' }).click();
  await visible(p, `订单 ${ids.order}`);
  const posts = requests.filter(r => r.method === 'POST');
  assert.equal(posts.length, 2); assert.deepEqual(posts[0]?.body, posts[1]?.body);
});
for (const [kind, original, endpoint] of [['order', ids.order, 'redemptions'], ['result', ids.session, 'sessions']] as const) await test(`F01-${kind}-mismatched-response-id`, `/${kind}/${second}`, (r, f) => r.path === `/api/${endpoint}/${second}` ? kind === 'order' ? envelope('RedemptionResponse', f.order) : envelope('SessionResponse', f.session) : undefined, async p => {
  await p.waitForResponse(r => r.url().endsWith(`/${endpoint}/${second}`)); await p.waitForTimeout(100);
  assert.equal(await p.getByText(original, { exact: false }).count(), 0, 'a response for another id must never become this route object');
  assert.equal(await p.getByRole('button', { name: '取消未领取订单并退回原价' }).count(), 0);
  assert.equal(await p.getByRole('button', { name: '复制领取码' }).count(), 0);
});
// Exercise the shared hook without route remounts: overlapping reads and ABA
// must be guarded by request generation as well as resource identity.
{
  const page = await browser.newPage();
  await page.route('**/repair-resource', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true; import("/tests/repair-state/resource-harness.tsx");</script>' }));
  try {
    await page.goto('http://127.0.0.1:5175/repair-resource');
    await page.waitForFunction('window.repairResource?.requests.length === 1');
    // The fixture bridge is intentionally confined to this test-only harness.
    const bridge = async (code: string) => page.evaluate(code);
    await bridge('window.repairResource.requests[0].resolve("old A")');
    await visible(page, 'old A');
    await bridge('window.repairResource.refresh()');
    await page.waitForFunction('window.repairResource.requests.length === 2');
    await bridge('window.repairResource.refresh()');
    await page.waitForFunction('window.repairResource.requests.length === 3');
    await bridge('window.repairResource.requests[2].resolve("new A")');
    await visible(page, 'new A');
    await bridge('window.repairResource.requests[1].resolve("stale A")');
    await page.waitForTimeout(50); await visible(page, 'new A');
    await bridge('window.repairResource.select("B")');
    await page.waitForFunction('window.repairResource.requests.length === 4');
    await visible(page, 'loading');
    await bridge('window.repairResource.select("A")');
    await page.waitForFunction('window.repairResource.requests.length === 5');
    await visible(page, 'loading');
    await bridge('window.repairResource.requests[4].resolve("current A")');
    await visible(page, 'current A');
    await bridge('window.repairResource.requests[3].resolve("stale B")');
    await page.waitForTimeout(50); await visible(page, 'current A');
    results.push({ id: 'F01-hook-overlap-ABA', pass: true });
  } catch (e) { results.push({ id: 'F01-hook-overlap-ABA', pass: false, error: String(e) }); }
  await page.screenshot({ path: `${out}/F01-hook-overlap-ABA.png` });
  await page.close();
}
await browser.close();
await writeFile(`${out}/results.json`, JSON.stringify({ mode, environment: 'isolated Chromium + real App components + schema-checked API fixture; no real business POST, PostgreSQL, phone or field validation', results }, null, 2));
console.log(JSON.stringify(results, null, 2));
if (results.some(r => !r.pass)) process.exitCode = 1;
