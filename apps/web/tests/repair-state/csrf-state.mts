import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fixtures, ids, envelope, failure, defaultReply } from '../page-state-fixtures';
const mode = process.argv[2] ?? 'red'; const out = `output/repair-20261027/ui/csrf-${mode}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: { id: string; pass: boolean; error?: string; csrfProbe?: string }[] = [];
const a = 'A'.repeat(43); const b = 'B'.repeat(43);
for (const after of ['401', '503']) {
  const page = await browser.newPage(); page.setDefaultTimeout(3000);
  await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-27T00:00:01Z'));
  const f = fixtures(); let reads = 0; const probes: string[] = [];
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') probes.push(request.headers()['x-csrf-token'] ?? '');
    let response = defaultReply(path, f, {});
    if (path === '/api/me') {
      reads++;
      if (reads === 1) response = failure('SERVER_BUSY', 503, '夹具：首次身份读取失败');
      else if (reads === 2) { response = envelope('IdentityResponse', { ...f.me, csrf_token: a, participant: { ...f.me.participant, display_name: '迟到身份A' } }); await new Promise(resolve => setTimeout(resolve, 1100)); }
      else if (reads === 3) response = envelope('IdentityResponse', { ...f.me, csrf_token: b, participant: { ...f.me.participant, display_name: '当前身份B' } });
      else response = after === '401' ? failure('UNAUTHENTICATED', 401, '夹具：身份已过期') : failure('SERVER_BUSY', 503, '夹具：已接受身份暂时失同步');
    }
    if (request.method() !== 'GET') response = failure('SERVER_BUSY', 503, '夹具拦截探针，不执行任何业务写入');
    await route.fulfill({ status: response.status, json: response.body }).catch(() => {});
  });
  const probe = () => page.evaluate(async () => {
    const path = '/src/api.ts'; const { api } = await import(path) as typeof import('../../src/api');
    await api.POST('/api/admin/redemptions/lookup', { body: { voucher_token: 'v'.repeat(43) } });
  });
  try {
    await page.goto('http://127.0.0.1:5175/#/');
    const retry = page.getByRole('button', { name: '重新读取身份' }); await retry.click();
    await page.waitForTimeout(70); await retry.click();
    await page.getByText('身份与活动规则', { exact: true }).click(); await page.getByText('当前身份B', { exact: true }).waitFor();
    await page.waitForTimeout(1200); await probe();
    assert.equal(probes[0], b, 'late discarded identity A cannot overwrite accepted B CSRF header');
    assert.equal(await page.getByText('迟到身份A', { exact: true }).count(), 0);
    await page.clock.fastForward(10100);
    await page.getByText(after === '401' ? '当前未绑定身份或会话已过期' : '夹具：已接受身份暂时失同步', { exact: false }).waitFor();
    await probe();
    assert.equal(probes[1], after === '401' ? '' : b, after === '401' ? '401 must clear previous auth CSRF header' : '503 preserves accepted CSRF for original game log submission');
    await page.evaluate(id => { location.hash = `/order/${id}`; }, ids.order);
    await page.getByText(f.order.gift_name_snapshot, { exact: true }).waitFor();
    const cancel = page.getByRole('button', { name: '取消未领取订单并退回原价' });
    await assert.rejects(cancel.click({ timeout: 400 }), /Timeout/u, 'unconfirmed identity cannot activate order mutation');
    assert.equal(probes.length, 2, 'inert order must not emit cancellation request');
    results.push({ id: `accepted-csrf-and-${after}`, pass: true, csrfProbe: probes[1] });
  } catch (cause) { results.push({ id: `accepted-csrf-and-${after}`, pass: false, error: String(cause), csrfProbe: probes.at(-1) ?? '' }); }
  await page.screenshot({ path: `${out}/${after}.png`, fullPage: true }); await page.close();
}
await browser.close(); await writeFile(`${out}/results.json`, JSON.stringify({ environment: 'real App + API transport, all API intercepted as isolated fixture, invalid A/B tokens only; no actual business POST', results }, null, 2));
console.log(JSON.stringify(results, null, 2)); if (results.some(r => !r.pass)) process.exitCode = 1;
