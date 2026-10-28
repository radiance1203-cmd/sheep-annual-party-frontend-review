import type { Page } from 'playwright';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { z } from 'zod';
import { strict as assert } from 'node:assert';
import { RULES } from '@sheep/game-core';
import type { GameId } from '@sheep/game-core';
export const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
const pageAnchorSchema = z.object({ image: z.string(), sha256: z.string(), size_px: z.tuple([z.number(), z.number()]), anchor_fraction: z.number() });
const candidateSchema = z.object({ candidate_id: z.string(), scope: z.string(), sample_art_accepted: z.literal(false), production_art_accepted: z.literal(false), stack_sample: z.object({ visual_budget: z.string() }).optional(), page_backgrounds: z.object({ stack: pageAnchorSchema, runner: pageAnchorSchema, herd: pageAnchorSchema }).optional() });
export interface CandidateDetails {
  candidateId: string; scope: string; manifestSha256: string; sampleArtAccepted: false; productionArtAccepted: false; stackGeometryConstraint: string | undefined;
  pageAnchors: z.infer<typeof candidateSchema>['page_backgrounds'];
}
export async function candidateDetails(): Promise<CandidateDetails> {
  const bytes = await readFile('apps/web/public/assets/candidates/r3/manifest.json');
  const candidate = candidateSchema.parse(JSON.parse(bytes.toString('utf8')));
  return { candidateId: candidate.candidate_id, scope: candidate.scope, manifestSha256: sha(bytes), sampleArtAccepted: candidate.sample_art_accepted, productionArtAccepted: candidate.production_art_accepted, stackGeometryConstraint: candidate.stack_sample?.visual_budget, pageAnchors: candidate.page_backgrounds };
}
export async function fingerprints(): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  async function visit(path: string) {
    for (const file of await readdir(path, { withFileTypes: true })) {
      const full = `${path}/${file.name}`;
      if (file.isDirectory()) await visit(full);
      else hashes[full] = sha(await readFile(full));
    }
  }
  await visit('apps/web/src');
  await visit('packages/game-core/src');
  for (const path of ['apps/web/public/assets/asset-manifest.v1.json', 'apps/web/public/assets/candidates/r3/manifest.json', 'config/game_rules.v2.1.json']) {
    try { hashes[path] = sha(await readFile(path)); } catch { /* candidate need not yet exist */ }
  }
  return hashes;
}
export interface CaptureMetrics {
  rects: Record<string, { x: number; y: number; width: number; height: number; bottom: number; right: number }>;
  stage: DOMStringMap;
  canvas: { width: number; height: number; requestedDpr: string | undefined; effectiveDpr: string | undefined; worldWidth: string | undefined; worldHeight: string | undefined; attributes: DOMStringMap } | null;
  teaching: DOMStringMap;
  canvasCount: number;
  viewport: { width: number; height: number; requestedDpr: number };
  document: { width: number; height: number };
  scrollY: number;
  controls: { text: string; tag: string; disabled: boolean; x: number; y: number; width: number; height: number; right: number; bottom: number }[];
  pageScenery: { image: string; size: string; top: string; computedImage: string; computedSize: string; computedPosition: string; computedRepeat: string; pageX: number; pageY: number; pageWidth: number; pageHeight: number } | undefined;
}
export function assertCriticalControls(measurement: Pick<CaptureMetrics, 'controls' | 'viewport'>): void {
  assert(measurement.controls.some(control => control.tag === 'H1'), 'semantic title must exist');
  assert(measurement.controls.some(control => control.tag !== 'H1'), 'real controls must exist');
  for (const control of measurement.controls) {
    assert(control.x >= -.5 && control.y >= -.5 && control.right <= measurement.viewport.width + .5 && control.bottom <= measurement.viewport.height + .5, `visible critical title/control outside viewport: ${JSON.stringify(control)}`);
    if (control.tag !== 'H1') assert(control.width >= 48 && control.height >= 48, `critical control requires 48 CSSpx target: ${JSON.stringify(control)}`);
  }
}
export function assertDisjointRectangles(first: Pick<CaptureMetrics['rects'][string], 'x' | 'y' | 'right' | 'bottom'>, second: Pick<CaptureMetrics['rects'][string], 'x' | 'y' | 'right' | 'bottom'>): void {
  const overlapWidth = Math.min(first.right, second.right) - Math.max(first.x, second.x);
  const overlapHeight = Math.min(first.bottom, second.bottom) - Math.max(first.y, second.y);
  assert(overlapWidth <= .5 || overlapHeight <= .5, `interactive regions overlap in both axes: ${JSON.stringify({ first, second, overlapWidth, overlapHeight })}`);
}
export function assertPageAnchor({ measurement, candidate, game }: { measurement: Pick<CaptureMetrics, 'pageScenery' | 'rects' | 'canvas'>; candidate: CandidateDetails; game: GameId }): { scope: string; game: GameId; image: string; sourceAnchorFraction: number; actualWorldAnchorCssY: number; configuredImageAnchorCssY: number; errorCssPx: number } {
  const anchor = candidate.pageAnchors?.[game], scenery = measurement.pageScenery, canvas = measurement.rects.canvas;
  assert(anchor); assert(scenery); assert(canvas); assert(measurement.canvas);
  const [imageCssWidth, imageCssHeight] = scenery.size.split(/\s+/u).map(value => Number.parseFloat(value));
  assert(imageCssWidth && imageCssHeight && Number.isFinite(imageCssWidth) && Number.isFinite(imageCssHeight));
  const imageTop = Number.parseFloat(scenery.top); assert(Number.isFinite(imageTop));
  assert(Math.abs(imageCssWidth / imageCssHeight - anchor.size_px[0] / anchor.size_px[1]) < .00001, 'portrait scenery must retain its source ratio');
  const worldAnchor = game === 'stack' ? RULES.stack.initial_top_y_u / 1000 : game === 'runner' ? RULES.runner.ground_y_u / 1000 : RULES.herd.fence_y_u / 1000;
  const actualWorldAnchorCssY = canvas.y - scenery.pageY + worldAnchor / Number(measurement.canvas.worldHeight) * canvas.height;
  const configuredImageAnchorCssY = imageTop + anchor.anchor_fraction * imageCssHeight;
  const errorCssPx = configuredImageAnchorCssY - actualWorldAnchorCssY;
  assert(Math.abs(errorCssPx) <= 1, `configured page anchor must align with unchanged core world: ${game} ${errorCssPx}px`);
  return { scope: 'configured passive scenery alignment only; not prototype fidelity, visual acceptance, or a change to camera/input/world geometry', game, image: anchor.image, sourceAnchorFraction: anchor.anchor_fraction, actualWorldAnchorCssY, configuredImageAnchorCssY, errorCssPx };
}
export async function metrics(page: Page): Promise<CaptureMetrics> {
  return page.evaluate(() => {
    const rects: Record<string, { x: number; y: number; width: number; height: number; bottom: number; right: number }> = {};
    for (const selector of ['.hud', '.game-stage', '.game-controls', '.game-controls .primary', '.practice-toolbar', '.teaching-controls', '.tutorial-step', '.game-cumulative', '.game-feedback', 'canvas']) {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      if (box) rects[selector] = { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom, right: box.right };
    }
    const stage = document.querySelector<HTMLElement>('.game-stage');
    const canvas = document.querySelector('canvas');
    const page = document.querySelector<HTMLElement>('.game-page'), pageBox = page?.getBoundingClientRect();
    const scenery = page ? getComputedStyle(page, '::before') : undefined;
    const controls = [...document.querySelectorAll<HTMLElement>('.game-page button, .game-page a.button, .game-page summary, .game-page h1')].flatMap(element => {
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || box.width === 0 || box.height === 0) return [];
      return [{ text: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '', tag: element.tagName, disabled: element instanceof HTMLButtonElement ? element.disabled : element.getAttribute('aria-disabled') === 'true', x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }];
    });
    return { rects, stage: { ...stage?.dataset }, canvas: canvas ? { width: canvas.width, height: canvas.height, requestedDpr: canvas.dataset.requestedDpr, effectiveDpr: canvas.dataset.effectiveDpr, worldWidth: canvas.dataset.worldWidth, worldHeight: canvas.dataset.worldHeight, attributes: { ...canvas.dataset } } : null,
      teaching: { ...document.querySelector<HTMLElement>('.teaching-scene')?.dataset }, canvasCount: document.querySelectorAll('canvas').length,
      viewport: { width: innerWidth, height: innerHeight, requestedDpr: devicePixelRatio }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, scrollY, controls,
      pageScenery: page && pageBox && scenery ? { image: page.style.getPropertyValue('--r3-page-scenery-image'), size: page.style.getPropertyValue('--r3-page-scenery-size'), top: page.style.getPropertyValue('--r3-page-scenery-top'), computedImage: scenery.backgroundImage, computedSize: scenery.backgroundSize, computedPosition: scenery.backgroundPosition, computedRepeat: scenery.backgroundRepeat, pageX: pageBox.x, pageY: pageBox.y, pageWidth: pageBox.width, pageHeight: pageBox.height } : undefined };
  });
}
