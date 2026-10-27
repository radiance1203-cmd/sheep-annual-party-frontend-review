import { readFile, readdir, writeFile } from 'node:fs/promises';
const directory = new URL('./artifacts/page-states/', import.meta.url);
const report = JSON.parse(await readFile(new URL('page-states.json', directory), 'utf8'));
const catalog = JSON.parse(await readFile(new URL('page-state-catalog.json', directory), 'utf8'));
const runs = [report];
for (const folder of ['', 'history/']) for (const name of await readdir(new URL(folder || '.', directory))) {
  if (!name.endsWith('.json')) continue;
  const candidate = JSON.parse(await readFile(new URL(folder + name, directory), 'utf8'));
  if (Array.isArray(candidate.cases) && typeof candidate.generatedAt === 'string') runs.push(candidate);
}
runs.sort((a, b) => Date.parse(a.generatedAt) - Date.parse(b.generatedAt));
const latest = new Map();
for (const run of runs) for (const item of run.cases) latest.set(item.id, { ...item, runGeneratedAt: run.generatedAt });
const combined = catalog.map(item => latest.get(item.id) ?? { ...item, result: 'NOT_RUN', evidence: 'No completed browser result for this current case' });
const totals = { PASS: combined.filter(item => item.result === 'PASS').length, FAIL: combined.filter(item => item.result === 'FAIL').length, NOT_RUN: combined.filter(item => item.result === 'NOT_RUN').length };
const pages = [];
for (const page of [...Array.from({ length: 16 }, (_, i) => `U${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 7 }, (_, i) => `O${String(i + 1).padStart(2, '0')}`), 'S01', 'D01']) {
  const cases = combined.filter(test => test.page.split(',').includes(page));
  pages.push({ page, result: cases.length === 0 || cases.some(test => test.result === 'NOT_RUN') ? 'NOT_RUN' : cases.some(test => test.result === 'FAIL') ? 'FAIL' : 'PASS', evidence: 'browser view/navigation only; schema-checked API response fixtures', states: cases.map(test => ({ case: test.id, state: test.state, result: test.result, runGeneratedAt: test.runGeneratedAt })) });
}
const formerGaps = [
  { page: 'O03', requirement: '在页面写入/配置工作人员角色', result: 'NOT_RUN', reason: '当前唯一 HTTP 契约没有角色修改接口；不以隐藏按钮或夹具授权替代服务端权限。' },
  { page: 'O05', requirement: '采购单价和采购预算配置', result: 'NOT_RUN', reason: 'Gift/GiftCreateRequest/GiftUpdateRequest 没有采购单价字段，当前页面仅真实积分价格与库存。' },
  { page: 'O06', requirement: '已领取异常的逐单差额明细', result: 'NOT_RUN', reason: '现有订单 DTO 不含逐单差额明细；页面已有冻结/订单终态和真实流水导出，不虚构差额。' },
  { page: 'O07', requirement: '匿名试玩原始数据导出、保留期限配置', result: 'NOT_RUN', reason: '当前 export kind 仅 scores/ledger/redemptions/audit，没有匿名试玩或保留期限写入契约。' },
];
const prefixesByGap = [['T048-roles-'], ['T048-procurement-', 'T048-gift-'], ['T048-discrepancy-'], ['T048-retention-', 'T048-playtest-', 'T048-export-', 'T048-practice-']];
const completedGaps = []; const notRun = [];
formerGaps.forEach((gap, index) => {
  const cases = combined.filter(item => prefixesByGap[index].some(prefix => item.id.startsWith(prefix)));
  if (cases.length && cases.every(item => item.result === 'PASS')) completedGaps.push({ ...gap, result: 'PASS', reason: 'Frozen contract implemented; all new relevant browser view cases passed', cases: cases.map(item => item.id) });
  else notRun.push({ ...gap, reason: 'New contract is available; relevant current view cases still missing or failing', cases: cases.filter(item => item.result !== 'PASS').map(item => item.id) });
});
const extensions = combined.filter(item => item.id.startsWith('T048-'));
const coverage = { sourceReport: 'page-states.json plus immutable timestamped targeted reports; latest result per current catalog case', command: 'CASE_FILTER=T048- node --import tsx apps/web/tests/page-states.mts; node apps/web/tests/summarize-page-states.mjs', runStrategy: 'Reuse 145-case accepted baseline, then execute only new or affected cases; not a claim of one new 196-case full run', actualDevice: false, backendBusinessAcceptance: false, defaultInvitesReadOrUsed: false, realApiWrites: runs.reduce((count, run) => count + (run.realApiWrites ?? 0), 0), realEventUnchanged: runs.every(run => run.realEventUnchanged !== false), totals, extensionTotals: { PASS: extensions.filter(item => item.result === 'PASS').length, FAIL: extensions.filter(item => item.result === 'FAIL').length, NOT_RUN: extensions.filter(item => item.result === 'NOT_RUN').length }, pages, notRun, completedGaps, boundaries: ['夹具只证明前端视图、禁用理由、等待/错误/冻结/终态和路由；不证明库存事务、权限、核分、封榜、退款或核销业务成功。', '练习自然结束使用真实规则核与实际浏览器输入，自动驱动轨迹不是真人样本；没有正式start/finish或自动试玩录入请求。', '所有真实PG/HTTP业务链路结论由root独立证据证明；本汇总不替代。', '真人、真机、现场网络、最终视觉、完整业务事务及容量不在本专项结论内。'] };
await writeFile(new URL('page-state-coverage.json', directory), JSON.stringify(coverage, null, 2));
console.log(JSON.stringify({ totals, extensionTotals: coverage.extensionTotals, pagesCovered: pages.filter(page => page.result === 'PASS').length, remainingGaps: notRun.length }));
if (totals.FAIL || totals.NOT_RUN || notRun.length || pages.some(page => page.result !== 'PASS') || coverage.realApiWrites || !coverage.realEventUnchanged) process.exitCode = 1;
