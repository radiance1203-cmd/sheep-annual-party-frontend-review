import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fixtures, ids, failure, defaultReply } from '../page-state-fixtures';
import type { FixtureOptions } from '../page-state-fixtures';
import type { Schema } from '../../src/api';
const mode = process.argv[2] ?? 'red';
const out = `output/repair-20261027/ui/d-${mode}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: { id: string; pass: boolean; error?: string }[] = [];
type F = ReturnType<typeof fixtures>;
const cases: { id: string; options?: FixtureOptions; configure?: (f: F) => void; expected: string[]; forbidden?: string[]; unknown?: boolean; unknownState?: boolean; identityFailure?: boolean }[] = [
  { id: 'F17-stack-statistics', configure: f => {
    const conclusion: Schema<'StackConclusion'> = { game_id: 'stack', end_tick: 1000, end_reason: 'THREE_MISSES', accepted_actions_count: 12, stats: { success_layers: 8, perfect_layers: 4, misses: 3 }, performance_points: 32 };
    if (f.session.settlement) { f.session.settlement.conclusion = conclusion; f.session.settlement.original_awarded_points = 52; f.session.settlement.current_contribution_points = 52; } f.session.current_contribution_points = 52;
  }, expected: ['叠稳 8 层', '完美 4 次', '核验通过'], forbidden: ['结算原因：VERIFIED'] },
  { id: 'F17-runner-statistics', configure: f => {
    f.session.game_id = 'runner'; f.session.seed = 1;
    const conclusion: Schema<'RunnerConclusion'> = { game_id: 'runner', end_tick: 1350, end_reason: 'TIME_LIMIT', accepted_actions_count: 12, stats: { safe_passed: 10, collision_count: 2, outer_collected: 7, inner_collected: 4 }, performance_points: 41 };
    if (f.session.settlement) { f.session.settlement.conclusion = conclusion; f.session.settlement.original_awarded_points = 61; f.session.settlement.current_contribution_points = 61; } f.session.current_contribution_points = 61;
  }, expected: ['安全越栏 10 次', '外圈 7 份', '金芯 4 份', '核验通过'], forbidden: ['结算原因：VERIFIED'] },
  { id: 'F17-herd-statistics', configure: f => {
    f.session.game_id = 'herd'; f.session.seed = 47;
    const conclusion: Schema<'HerdConclusion'> = { game_id: 'herd', end_tick: 1350, end_reason: 'TIME_LIMIT', accepted_actions_count: 12, stats: { penned_count: 6, final_goal_tick: null, time_bonus_points: 0 }, performance_points: 36 };
    if (f.session.settlement) { f.session.settlement.conclusion = conclusion; f.session.settlement.original_awarded_points = 56; f.session.settlement.current_contribution_points = 56; } f.session.current_contribution_points = 56;
  }, expected: ['入圈 6 只', '时间奖励 0 分', '核验通过'], forbidden: ['结算原因：VERIFIED'] },
  { id: 'F17-no-effective-action', options: { eligibilityReason: 'NO_ACCEPTED_ACTION' }, expected: ['没有有效操作'], forbidden: ['挑战完成！', '结算原因：NO_ACCEPTED_ACTION'] },
  { id: 'F17-invalid-process', options: { eligibilityReason: 'INVALID_PROCESS' }, expected: ['过程核验未通过'], forbidden: ['挑战完成！', '结算原因：INVALID_PROCESS'] },
  { id: 'F17-voided', options: { sessionState: 'VOIDED' }, expected: ['原尝试已作废'], forbidden: ['挑战完成！', '结算原因：VOIDED'] },
  { id: 'F17-historical-replaced', options: { historical: true }, configure: f => { if (f.session.settlement) { f.session.settlement.eligible_currently = false; f.session.settlement.current_contribution_points = 0; f.session.current_contribution_points = 0; } }, expected: ['历史尝试已被替换'], forbidden: ['挑战完成！', '本局未形成有效参与'] },
  { id: 'F17-verifying-no-award', options: { sessionState: 'VERIFYING' }, expected: ['核验中', '核验前不预支积分'], forbidden: ['挑战完成！', '叠稳', '安全越栏', '时间奖励'] },
  { id: 'F17-review-no-award', options: { sessionState: 'REVIEW' }, expected: ['待复核'], forbidden: ['挑战完成！', '叠稳', '安全越栏', '时间奖励'] },
  { id: 'F17-independent-identity-503', expected: ['核验通过'], identityFailure: true },
  { id: 'F17-unknown-reason-inspectable', expected: ['未知结算原因'], forbidden: ['挑战完成！'], unknown: true },
  { id: 'F17-unknown-state-inspectable', expected: ['未知局次状态'], forbidden: ['挑战完成！', '叠稳', '安全越栏', '时间奖励'], unknownState: true },
];
for (const c of cases) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); page.setDefaultTimeout(3000); await page.clock.install();
  const options: FixtureOptions = { sessionState: 'SETTLED', ...c.options }; const f = fixtures(options); c.configure?.(f);
  let meReads = 0;
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    let response = defaultReply(path, f, options);
    if (path === '/api/me' && c.identityFailure && ++meReads >= 3) response = failure('SERVER_BUSY', 503, '夹具：独立结果页身份同步失败');
    if (path === `/api/sessions/${ids.session}` && (c.unknown || c.unknownState)) {
      // Deliberately forward-unknown transport payload: outside current schema,
      // and explicitly distinct from every schema-checked business fixture.
      const data = c.unknownState ? { ...f.session, state: 'FUTURE_STATE' } : { ...f.session, settlement: { ...f.session.settlement, eligibility_reason: 'FUTURE_REASON' } };
      response = { status: 200, body: { data, server_now: new Date().toISOString(), request_id: 'forward-unknown-fixture' } };
    }
    if (request.method() !== 'GET') throw new Error('Result test must remain read-only');
    await route.fulfill({ status: response.status, json: response.body }).catch(() => {});
  });
  try {
    await page.goto(`http://127.0.0.1:5175/#/result/${ids.session}`);
    await page.getByText(`局号 ${ids.session}`, { exact: true }).waitFor();
    if (c.identityFailure) {
      await page.getByText('全场荣誉 60', { exact: false }).waitFor();
      await page.clock.fastForward(3100);
      await page.getByText('夹具：独立结果页身份同步失败', { exact: false }).waitFor();
      const wallet = await page.getByText('全场荣誉', { exact: false }).innerText();
      assert.ok(wallet.includes('可用余额 —') && !wallet.includes('可用余额 60'), 'independent identity error cannot present stale balance as current');
    }
    for (const text of c.expected) await page.getByText(text, { exact: false }).first().waitFor();
    for (const text of c.forbidden ?? []) assert.equal(await page.getByText(text, { exact: false }).count(), 0, `must not show ${text}`);
    if (c.unknown) { await page.getByText('查看服务器记录', { exact: true }).click(); await page.getByText('FUTURE_REASON', { exact: false }).waitFor(); }
    if (c.unknownState) { await page.getByText('查看服务器记录', { exact: true }).click(); await page.getByText('FUTURE_STATE', { exact: false }).waitFor(); }
    if (['VERIFYING', 'REVIEW', 'VOIDED'].includes(options.sessionState ?? '') || options.eligibilityReason) assert.ok(!(await page.locator('.score-breakdown').innerText()).match(/\b20\b/u), 'pending/void/zero cannot show participation award');
    results.push({ id: c.id, pass: true });
  } catch (cause) { results.push({ id: c.id, pass: false, error: String(cause) }); }
  await page.screenshot({ path: `${out}/${c.id}.png`, fullPage: true }); await context.close();
}
await browser.close();
await writeFile(`${out}/results.json`, JSON.stringify({ environment: 'read-only real Results component, isolated schema-checked API fixture except one explicitly forward-unknown payload; no business POST, PostgreSQL or real phone', results }, null, 2));
console.log(JSON.stringify(results, null, 2)); if (results.some(r => !r.pass)) process.exitCode = 1;
