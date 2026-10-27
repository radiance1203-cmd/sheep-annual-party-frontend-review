import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // Isolated route regression: only the identity response is a contract-shaped
  // organizer fixture. No login credentials, writes, or real order changes.
  await page.route('**/api/me', route => route.fulfill({ json: {
    data: { participant: { participant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', display_uid: 'ROUTE-TEST', display_name: '路由回归身份', roles: ['ORGANIZER'], eligible: true, claims_frozen: false, honor_total: 0, wallet_balance: 0 }, tickets: [], active_session: null, csrf_token: 'x'.repeat(43), auth_expires_at: '2030-01-01T00:00:00.000Z' }, server_now: new Date().toISOString(), request_id: 'isolated-route-regression',
  } }));
  await page.goto('http://127.0.0.1:5175/#/admin');
  await page.getByRole('heading', { name: '活动状态与封榜关口' }).waitFor();
  await page.evaluate(() => { location.hash = '/claim'; });
  await page.getByRole('heading', { name: '领取核销工作台' }).waitFor();
  await page.waitForTimeout(150);
  assert.equal(await page.getByLabel('领取码 / 订单编号').count(), 1, 'admin → claim must show the claim form, not the retained status tab');
  assert.equal(await page.getByRole('heading', { name: '活动状态与封榜关口' }).count(), 0);
  await page.evaluate(() => { location.hash = '/admin'; });
  await page.getByRole('heading', { name: '主办方控制台' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: '活动状态与封榜关口' }).count(), 1);
  const result = { route: 'admin → claim → admin', claimFormVisible: true, organizerDefaultRestored: true, mockedIdentityOnly: true, dataWrites: 0 };
  await mkdir(new URL('./artifacts/', import.meta.url), { recursive: true });
  await writeFile(new URL('./artifacts/admin-route-regression.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
