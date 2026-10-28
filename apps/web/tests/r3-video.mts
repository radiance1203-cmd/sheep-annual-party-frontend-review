import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { createContext, createState, normalizeInputs, step } from '@sheep/game-core';
import type { GameInput, GameId, RawInput } from '@sheep/game-core';
import { fixtures, defaultReply } from './page-state-fixtures';
import { createTeachingReplay } from '../src/game/tutorial-model';
import { candidateDetails, fingerprints, metrics, sha } from './r3-support.mjs';

const output = 'output/r3-20261028/video';
const base = process.env.R3_BASE_URL ?? 'http://127.0.0.1:5175/';
const inputSchema = z.object({ tick: z.number().int(), seq: z.number().int(), type: z.enum(['DROP', 'JUMP', 'BARK', 'DOG_MOVE']), value: z.union([z.null(), z.object({ x: z.number(), y: z.number() })]).optional() });
const processSchema = z.object({ game_id: z.enum(['stack', 'runner', 'herd']), seed: z.number(), end_tick: z.number().int(), end_reason: z.string(), started_at: z.string(), ended_at: z.string(), inputs: z.array(inputSchema) });
const browser = await chromium.launch({ headless: true });
const rows: object[] = [], mutations: string[] = [], errors: string[] = [];
const onlyGame = process.argv.find(arg => arg.startsWith('--game='))?.slice('--game='.length);
const candidate = await candidateDetails();
const frozenHashes = await fingerprints();
assert.equal(candidate.manifestSha256, frozenHashes['apps/web/public/assets/candidates/r3/manifest.json']);
const games: readonly GameId[] = onlyGame === 'stack' || onlyGame === 'runner' || onlyGame === 'herd' ? [onlyGame] : ['stack', 'runner', 'herd'];
await mkdir(output, { recursive: true });
let failure: string | null = null;
try {
  for (const game of games) {
    const hashes = await fingerprints();
    assert.deepEqual(hashes, frozenHashes, 'all three videos must share the same frozen source/candidate version');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, recordVideo: { dir: `${output}/raw`, size: { width: 390, height: 844 } }, acceptDownloads: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const fixture = fixtures({ phase: 'CHECK_IN' });
    await page.route('**/api/**', async route => {
      if (route.request().method() !== 'GET') { mutations.push(route.request().url()); await route.abort(); return; }
      const reply = defaultReply(new URL(route.request().url()).pathname, fixture, {});
      await route.fulfill({ status: reply.status, json: reply.body });
    });
    await page.goto(`${base}?artCandidate=r3#/practice/${game}`);
    const start = page.getByRole('button', { name: '开始不计分练习', exact: true }); await start.waitFor();
    await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.action-stack .primary')?.disabled);
    assert.equal(await page.locator('.game-page[data-art-candidate="r3"]').count(), 1);
    const before = await metrics(page), startedWall = Date.now(); await start.click();
    await page.waitForFunction(() => Number(document.querySelector<HTMLElement>('.game-stage')?.dataset.gameTick) > 0);
    const plan = createTeachingReplay(game, { stopOnComplete: false }); while (plan.advance()) { /* derive legal intent schedule only; no access to live state */ }
    // Establish a genuine browser pointer capture. Thereafter scheduled pointer
    // movements use the same public DOM handler. Downloaded inputs remain the
    // authoritative record of what the actual practice runtime consumed.
    if (game === 'herd') {
      const box = await page.locator('.joystick').boundingBox(); assert(box);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    }
    await page.evaluate(({ game, inputs }) => {
      const remaining = [...inputs];
      const driver = window.setInterval(() => {
        const stage = document.querySelector<HTMLElement>('.game-stage');
        if (!stage || document.querySelector('.game-page')?.getAttribute('data-play-state') === 'ended') { clearInterval(driver); return; }
        const tick = Number(stage.dataset.gameTick);
        while (remaining.length && (remaining[0]?.tick ?? Infinity) <= tick + 1) {
          const input = remaining.shift(); if (!input) continue;
          if (input.type === 'DOG_MOVE' && input.value) {
            const joystick = document.querySelector<HTMLElement>('.joystick'); if (!joystick) continue;
            const box = joystick.getBoundingClientRect();
            joystick.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: box.x + box.width / 2 + input.value.x / 1000 * box.width / 2, clientY: box.y + box.height / 2 + input.value.y / 1000 * box.height / 2 }));
          } else {
            const selector = game === 'herd' ? '.game-controls .bark' : '.game-controls .gameplay-action';
            const button = document.querySelector<HTMLButtonElement>(selector); if (button && !button.disabled) button.click();
          }
        }
      }, 4);
    }, { game, inputs: plan.inputs });
    const samples: object[] = [];
    // Native recording continues for at least 45 seconds; these waits do not
    // change Date/performance/core clocks and retain the unedited full-speed file.
    for (let checkpoint = 0; checkpoint < 9; checkpoint++) {
      await page.waitForTimeout(5000); const m = await metrics(page); samples.push({ elapsedWallMs: Date.now() - startedWall, metrics: m });
      if (checkpoint === 0 || checkpoint === 4 || checkpoint === 8) await page.screenshot({ path: `${output}/${game}-${checkpoint + 1}.png`, fullPage: false });
    }
    await page.getByRole('heading', { name: '练习完成', exact: true }).waitFor({ timeout: 5000 });
    if (game === 'herd') await page.mouse.up();
    const terminalBefore = await metrics(page); await page.waitForTimeout(400); const terminalAfter = await metrics(page);
    assert.equal(terminalAfter.stage.gameTick, terminalBefore.stage.gameTick, 'terminal core must stay fixed');
    assert(Number(terminalAfter.stage.presentationTime) > Number(terminalBefore.stage.presentationTime), 'terminal presentation must continue');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '下载本局完整练习过程（不含分数）', exact: true }).click();
    const download = await downloadPromise, processPath = `${output}/${game}-actual-practice-process.json`; await download.saveAs(processPath);
    const process = processSchema.parse(JSON.parse(await readFile(processPath, 'utf8')));
    assert.equal(process.game_id, game); assert.equal(process.seed, createContext(game).seed);
    const inputs: RawInput[] = process.inputs.map((input): RawInput => {
      if (input.type === 'DOG_MOVE') { assert(input.value); return { tick: input.tick, seq: input.seq, type: 'DOG_MOVE', value: input.value }; }
      return { tick: input.tick, seq: input.seq, type: input.type, value: null };
    });
    const normalized = normalizeInputs(game, inputs, process.end_tick); assert(normalized.ok);
    const core = createContext(game); let state = createState(core), cursor = 0; const events = [];
    for (let tick = 1; tick <= process.end_tick; tick++) {
      const batch: GameInput[] = [];
      while (normalized.inputs[cursor]?.tick === tick) { const input = normalized.inputs[cursor++]; if (input) batch.push(input); }
      assert.equal(state.conclusion, null, 'actual input log cannot extend past natural end');
      const result = step(core, state, { tick, inputs: batch }); state = result.state; events.push(...result.events);
    }
    assert(state.conclusion); assert.equal(state.conclusion.end_tick, process.end_tick); assert.equal(state.conclusion.end_reason, process.end_reason); assert(state.accepted_actions_count > 0);
    const video = page.video(); assert(video); await page.close(); await context.close();
    const videoPath = `${output}/${game}-real-gamepage-fullspeed.webm`; await video.saveAs(videoPath);
    assert.deepEqual(await fingerprints(), hashes, 'source/candidate changed during native video; repeat with stable source');
    const row = { game, candidate, videoPath, videoSha256: sha(await readFile(videoPath)), processPath, processSha256: sha(await readFile(processPath)), hashes, before, samples, terminalBefore, terminalAfter,
      actualConclusion: state.conclusion, events, elapsedWallMs: Date.now() - startedWall, actionPlanScope: 'synthetic legal teaching controller intent through existing GamePage DOM controls, normal wall clock; actual consumed input prefix is downloaded and replay-validated',
      scope: 'uncut native Playwright video of real App/GamePage at original speed; isolated schema GET API; no session or score mutation; not physical device/performance/human evidence' };
    rows.push(row); await writeFile(`${output}/${game}-evidence.json`, JSON.stringify(row, null, 2)); console.log(JSON.stringify({ game, endTick: process.end_tick, elapsedWallMs: Date.now() - startedWall, actualInputs: inputs.length, events: events.length }));
  }
  assert.equal(mutations.length, 0); assert.equal(errors.length, 0, errors.join('\n'));
} catch (error) { failure = error instanceof Error ? error.stack ?? error.message : String(error); process.exitCode = 1; }
finally { await browser.close(); await writeFile(`${output}/results${onlyGame ? `-${onlyGame}` : ''}.json`, JSON.stringify({ rows, mutations, errors, failure }, null, 2)); }
console.log(JSON.stringify({ games: rows.length, mutations: mutations.length, errors: errors.length, failure }));
