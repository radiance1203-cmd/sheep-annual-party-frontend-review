import { z } from 'zod';
import { BUILD, RULES, sha256Utf8 } from '@sheep/game-core';
import type { GameId } from '@sheep/game-core';
import { r3CandidateRequested } from './r3-candidate';
export interface Atlas { image: string; size_px: [number, number]; scene_size_px?: [number, number] | undefined; decodedImage?: HTMLImageElement; objectUrl?: string; candidateManifestHash?: string; sceneryAnchorFraction?: number; frames: Record<string, { rect: [number, number, number, number]; pivot_px: [number, number] }>; animations: Record<string, { frames: string[]; fps: number; loop: boolean }> }
const dimensions = z.tuple([z.number().int().positive(), z.number().int().positive()]);
const schema = z.object({ image: z.string().regex(/^[\w.-]+\.png$/u), size_px: dimensions, scene_size_px: dimensions.optional(), frames: z.record(z.string(), z.object({ rect: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative(), z.number().int().positive(), z.number().int().positive()]), pivot_px: z.tuple([z.number(), z.number()]) })), animations: z.record(z.string(), z.object({ frames: z.array(z.string()).min(1), fps: z.number().positive(), loop: z.boolean() })) });
export function parseAtlas(raw: unknown): Atlas {
  const atlas = schema.parse(raw);
  if (!Object.keys(atlas.frames).length) throw new Error('角色图集没有帧。');
  for (const animation of Object.values(atlas.animations)) for (const frame of animation.frames) if (!atlas.frames[frame]) throw new Error('角色动画引用缺失帧。');
  return atlas;
}
export function assetFolder(name: string): string { return name.startsWith('farm') ? 'environment' : name === 'shared_v1' ? 'effects' : 'characters'; }
export function validateGameAtlas(name: string, atlas: Atlas, width: number, height: number, repairedProfile = false): void {
  if (atlas.size_px[0] !== width || atlas.size_px[1] !== height) throw new Error('实际图集尺寸与元数据不符，尚未使用机会。');
  for (const frame of Object.values(atlas.frames)) if (frame.rect[0] + frame.rect[2] > width || frame.rect[1] + frame.rect[3] > height) throw new Error('图集帧超出纹理范围。');
  if (name.startsWith('sheep') || name.startsWith('dog')) {
    const directions = name.includes('iso8') ? ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] : ['e'];
    const actions = name.startsWith('dog') ? ['idle', 'walk', 'bark'] : name.includes('side') ? ['idle', 'run', 'takeoff', 'air', 'land', 'steady', 'bump', 'celebrate'] : ['idle', 'walk', 'enter'];
    for (const direction of directions) for (const action of actions) if (!atlas.animations[`${action}.${direction}`]) throw new Error('必需角色动画缺失，尚未使用机会。');
  }
  if (repairedProfile && name === 'sheep_side_v1') {
    for (const action of ['idle', 'air', 'steady', 'celebrate']) if (!atlas.animations[`stack_${action}.e`]) throw new Error('新版角色缺少叠层专用姿态，尚未使用机会。');
  }
  if (repairedProfile && name === 'farm_side_v1') {
    for (const prop of ['hay_tray_thin', 'hurdle_narrow', 'hurdle_medium', 'hurdle_wide', 'clover_outer_round', 'clover_core_round']) if (!atlas.frames[prop]) throw new Error('新版场景缺少有界道具，尚未使用机会。');
  }
}
const requiredAtlases = z.array(z.string().min(1)).min(1);
const manifestSchema = z.object({ game_rule_version: z.string(), art_version: z.string().optional(), required_atlases_by_game: z.object({ stack: requiredAtlases, runner: requiredAtlases, herd: requiredAtlases }).optional(), assets: z.array(z.object({ asset_id: z.string().optional(), runtime_path: z.string().nullish(), sha256: z.string().nullish() }).passthrough()) });
function validateBackdrop(atlas: Atlas, game: GameId): void {
  const scene = game === 'stack' ? [RULES.stack.world_width_u / 1000, RULES.stack.reference_view_height_u / 1000] : game === 'runner' ? [RULES.runner.world_view_width_u / 1000, RULES.runner.world_view_height_u / 1000] : [RULES.herd.world_width_u / 1000, RULES.herd.world_height_u / 1000];
  const [width, height] = scene;
  if (width === undefined || height === undefined) throw new Error('背景场景规则尺寸缺失。');
  const frame = atlas.frames[`backdrop_${game}`];
  const expectedRect = [0, 0, width * 2, height * 2];
  if (!frame || Object.keys(atlas.frames).length !== 1 || frame.pivot_px.some(value => value !== 0) || frame.rect.some((value, index) => value !== expectedRect[index]) || atlas.size_px[0] !== width * 2 || atlas.size_px[1] !== height * 2 || atlas.scene_size_px?.[0] !== width || atlas.scene_size_px[1] !== height) throw new Error('牧场背景尺寸、锚点或场景比例不匹配，尚未使用机会。');
}
export type AssetManifest = z.infer<typeof manifestSchema> & { content_sha256: string };
export async function verifyManifest(baseUrl: string, expectedHash?: string): Promise<AssetManifest> {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/', window.location.origin);
  if (expectedHash && !/^[a-f0-9]{64}$/u.test(expectedHash)) throw new Error('正式资源清单摘要格式无效。');
  const response = await fetch(new URL('asset-manifest.v1.json', base), { cache: 'no-store' });
  if (!response.ok) throw new Error('正式资源清单无法获取，尚未使用机会。');
  let text = await response.text();
  if (expectedHash && await sha256Utf8(text) !== expectedHash) {
    const archived = await fetch(new URL(`releases/${expectedHash}/asset-manifest.v1.json`, base), { cache: 'no-store' });
    if (!archived.ok) throw new Error('已绑定版本的资源清单无法获取，尚未使用机会。');
    text = await archived.text();
    if (await sha256Utf8(text) !== expectedHash) throw new Error('正式资源清单摘要不匹配，尚未使用机会。');
  }
  const manifest = manifestSchema.parse(JSON.parse(text));
  if (manifest.game_rule_version !== BUILD.rule_version) throw new Error('资源清单规则版本不匹配。');
  return { ...manifest, content_sha256: await sha256Utf8(text) };
}
export async function preloadAssets(game: GameId, baseUrl = '/assets/', expectedHash?: string, candidate?: 'r3'): Promise<Record<string, Atlas>> {
  const result: Record<string, Atlas> = {};
  try {
    if (candidate && !r3CandidateRequested()) throw new Error('未启用本地候选预览，不能加载未签认素材。');
    const manifest = await verifyManifest(baseUrl, expectedHash);
    const version = manifest.art_version?.match(/^art-(\d+)\.(\d+)\.(\d+)(?:-|$)/u);
    const major = Number(version?.[1] ?? 0), minor = Number(version?.[2] ?? 0);
    const requiresBackdropProfile = major > 1 || major === 1 && minor >= 3 || manifest.assets.some(asset => asset.asset_id?.startsWith('environment.backdrop.'));
    if (requiresBackdropProfile && !manifest.required_atlases_by_game) throw new Error('新版牧场背景缺少必需图集列表，尚未使用机会。');
    const baseNames = game === 'herd' ? [['sheep_iso8_v1', 'character.sheep.iso8'], ['dog_iso8_v1', 'character.dog.iso8'], ['farm_iso_v1', 'environment.iso'], ['shared_v1', 'effects.shared']] as const : [['sheep_side_v1', 'character.sheep.side'], ['farm_side_v1', 'environment.side'], ['shared_v1', 'effects.shared']] as const;
    let names: readonly (readonly [string, string])[] = baseNames;
    const required = manifest.required_atlases_by_game?.[game];
    if (required) {
      const backdropId = `environment.backdrop.${game}`;
      if (new Set(required).size !== required.length || !baseNames.every(([, id]) => required.includes(id)) || !required.includes(backdropId)) throw new Error('必需图集列表未完整声明角色、场景或牧场背景，尚未使用机会。');
      const bindings = new Map<string, string>([...baseNames.map(([name, id]) => [id, name] as const), [backdropId, 'farm_backdrop_v3']]);
      names = required.map(id => {
        const name = bindings.get(id);
        if (!name) throw new Error('必需图集没有受支持的运行映射，尚未使用机会。');
        return [name, id] as const;
      });
    }
    const root = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/', window.location.origin);
    const resourceUrl = (path: string) => new URL(path.replace(/^\/assets\//u, ''), root);
    async function bytes(id: string): Promise<{ buffer: ArrayBuffer; url: URL }> {
      const entry = manifest.assets.find(asset => asset.asset_id === id);
      if (!entry?.sha256 || !entry.runtime_path) throw new Error('必需资源未在清单中声明摘要。');
      const url = resourceUrl(entry.runtime_path);
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('角色或场景资源未就绪，尚未使用机会。');
      const buffer = await response.arrayBuffer();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), byte => byte.toString(16).padStart(2, '0')).join('');
      if (digest !== entry.sha256) throw new Error('实际资源摘要与已绑定清单不符，尚未使用机会。');
      return { buffer, url };
    }
    for (const [name, id] of names) {
      const metadata = await bytes(`${id}.metadata`);
      const atlas = parseAtlas(JSON.parse(new TextDecoder().decode(metadata.buffer)));
      const imageBytes = await bytes(id);
      if (imageBytes.url.href !== new URL(atlas.image, metadata.url).href) throw new Error('图集图片与清单资源映射不一致。');
      const objectUrl = URL.createObjectURL(new Blob([imageBytes.buffer], { type: 'image/png' }));
      const image = new Image(); image.src = objectUrl;
      result[name] = { ...atlas, decodedImage: image, objectUrl };
      await image.decode();
      validateGameAtlas(name, atlas, image.naturalWidth, image.naturalHeight, major > 1 || major === 1 && minor >= 4);
      if (name === 'farm_backdrop_v3') validateBackdrop(atlas, game);
    }
    if (candidate === 'r3') await loadR3Backgrounds(game, manifest.content_sha256, result);
    return result;
  } catch (error) { releaseAssets(result); throw error; }
}
const r3ManifestHash = '8f30e374087a398da619ad0c62372490f6de19769602b410646202d21079c98d';
const r3BaseHash = '49eba97a27668b9c39366157714714b9d1550054453134867bbbb7e1a05bd24c';
const r3File = z.object({ image: z.string().regex(/^(stack|runner|herd)\.png$/u), image_sha256: z.string().regex(/^[a-f0-9]{64}$/u), metadata: z.string().regex(/^(stack|runner|herd)\.atlas\.json$/u), metadata_sha256: z.string().regex(/^[a-f0-9]{64}$/u) });
const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const r3Page = z.object({ image: z.string().regex(/^page-(stack|runner|herd)-b2\.png$/u), sha256: hash, size_px: dimensions, anchor_fraction: z.number().min(0).max(1) });
const r3MaterialFile = z.object({ image: z.string().regex(/^(?:stack|sheep-side|sheep-iso8|dog-iso8|props)-materials?-a\.png$/u), image_sha256: hash, metadata: z.string().regex(/^(?:stack|sheep-side|sheep-iso8|dog-iso8|props)-materials?-a\.atlas\.json$/u), metadata_sha256: hash });
const r3Schema = z.object({ candidate_id: z.literal('R3-B5-A-finite-materials'), source_manifest_sha256: z.literal(r3BaseHash), backgrounds: z.object({ stack: r3File, runner: r3File, herd: r3File }), page_backgrounds: z.object({ stack: r3Page, runner: r3Page, herd: r3Page }), fence: z.object({ image: z.literal('fence-panel-b3.png'), image_sha256: hash, metadata: z.literal('fence-panel-b4.atlas.json'), metadata_sha256: hash }), stack_sample: z.object({ image: z.literal('stack-material-a.png'), image_sha256: hash, metadata: z.literal('stack-material-a.atlas.json'), metadata_sha256: hash, native_alpha_height: z.literal(126) }), character_samples: z.object({ sheep_side: r3MaterialFile, sheep_iso8: r3MaterialFile, dog_iso8: r3MaterialFile }), props_sample: r3MaterialFile, ui: z.object({ title: z.object({ image: z.literal('title-plaque-a.png'), sha256: hash, size_px: dimensions }) }), sample_art_accepted: z.literal(false), production_art_accepted: z.literal(false) });
async function loadR3Backgrounds(game: GameId, sourceHash: string, result: Record<string, Atlas>): Promise<void> {
  if (sourceHash !== r3BaseHash) throw new Error('本地候选仅适用于登记的原资源基线，旧局不会换用候选。');
  const base = new URL('/assets/candidates/r3/', window.location.origin);
  const response = await fetch(new URL('manifest.json', base), { cache: 'no-store' });
  if (!response.ok) throw new Error('R3候选清单未就绪，可重试；未使用正式机会。');
  const text = await response.text();
  if (await sha256Utf8(text) !== r3ManifestHash) throw new Error('R3候选清单已改变，请核对新候选版本。');
  const manifest = r3Schema.parse(JSON.parse(text));
  async function verifiedBytes(file: string, expected: string): Promise<ArrayBuffer> {
    const response = await fetch(new URL(file, base), { cache: 'no-store' });
    if (!response.ok) throw new Error('R3候选资源无法读取，可重试。');
    const bytes = await response.arrayBuffer();
    const actual = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
    if (actual !== expected) throw new Error('R3候选资源摘要不符。');
    return bytes;
  }
  async function load(which: GameId): Promise<Atlas> {
    const entry = manifest.backgrounds[which];
    if (entry.image !== `${which}.png` || entry.metadata !== `${which}.atlas.json`) throw new Error('R3候选映射不匹配。');
    async function data(file: string, hash: string): Promise<ArrayBuffer> {
      const asset = await fetch(new URL(file, base), { cache: 'no-store' });
      if (!asset.ok) throw new Error('R3候选背景无法读取，可重试。');
      const bytes = await asset.arrayBuffer();
      const actual = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
      if (actual !== hash) throw new Error('R3候选资源摘要不符。');
      return bytes;
    }
    const atlas = parseAtlas(JSON.parse(new TextDecoder().decode(await data(entry.metadata, entry.metadata_sha256))));
    const world = which === 'stack' ? [RULES.stack.world_width_u / 1000, RULES.stack.reference_view_height_u / 1000] : which === 'runner' ? [RULES.runner.world_view_width_u / 1000, RULES.runner.world_view_height_u / 1000] : [RULES.herd.world_width_u / 1000, RULES.herd.world_height_u / 1000];
    const frame = atlas.frames[`backdrop_${which}`];
    if (atlas.image !== entry.image || !frame || Object.keys(atlas.frames).length !== 1 || atlas.scene_size_px?.some((value, index) => value !== world[index]) || !atlas.scene_size_px || frame.rect.some((value, index) => value !== [0, 0, ...atlas.size_px][index]) || frame.pivot_px.some(value => value !== 0) || atlas.size_px.some(value => value > 2048) || Math.abs(atlas.size_px[0] / atlas.size_px[1] - (world[0] ?? 1) / (world[1] ?? 1)) > .003) throw new Error('R3背景只允许同场地比例的非交互画面。');
    const objectUrl = URL.createObjectURL(new Blob([await data(entry.image, entry.image_sha256)], { type: 'image/png' }));
    const image = new Image(); image.src = objectUrl;
    try {
      await image.decode();
      validateGameAtlas('r3_background', atlas, image.naturalWidth, image.naturalHeight);
      return { ...atlas, decodedImage: image, objectUrl, candidateManifestHash: r3ManifestHash };
    } catch (cause) { image.src = ''; URL.revokeObjectURL(objectUrl); throw cause; }
  }
  const background = await load(game);
  if (result.farm_backdrop_v3) releaseAssets({ old: result.farm_backdrop_v3 });
  result.farm_backdrop_v3 = background;
  // Portrait extension for the wide runner does not modify its actual camera or input map.
  const page = manifest.page_backgrounds[game];
  if (page.image !== `page-${game}-b2.png`) throw new Error('R3整屏背景映射不符。');
  const pageUrl = URL.createObjectURL(new Blob([await verifiedBytes(page.image, page.sha256)], { type: 'image/png' }));
  const pageImage = new Image(); pageImage.src = pageUrl;
  result.r3_page_backdrop = { image: page.image, size_px: page.size_px, decodedImage: pageImage, objectUrl: pageUrl, frames: {}, animations: {}, sceneryAnchorFraction: page.anchor_fraction };
  await pageImage.decode();
  if (pageImage.naturalWidth !== page.size_px[0] || pageImage.naturalHeight !== page.size_px[1]) throw new Error('R3整屏背景尺寸不符。');
  if (game === 'stack') {
    const sample = manifest.stack_sample;
    const atlas = parseAtlas(JSON.parse(new TextDecoder().decode(await verifiedBytes(sample.metadata, sample.metadata_sha256))));
    if (atlas.image !== sample.image || ['idle', 'air', 'steady', 'celebrate'].some(action => !atlas.animations[`stack_${action}.e`])) throw new Error('R3叠高动态样板动作不完整。');
    const sampleUrl = URL.createObjectURL(new Blob([await verifiedBytes(sample.image, sample.image_sha256)], { type: 'image/png' }));
    const sampleImage = new Image(); sampleImage.src = sampleUrl;
    result.sheep_stack_candidate = { ...atlas, decodedImage: sampleImage, objectUrl: sampleUrl };
    await sampleImage.decode();
    validateGameAtlas('r3_stack_sample', atlas, sampleImage.naturalWidth, sampleImage.naturalHeight);
  }
  async function loadMaterial(name: string, entry: z.infer<typeof r3MaterialFile>): Promise<void> {
    const atlas = parseAtlas(JSON.parse(new TextDecoder().decode(await verifiedBytes(entry.metadata, entry.metadata_sha256))));
    if (atlas.image !== entry.image || atlas.size_px.some(value => value > 2048)) throw new Error('有限材质样板映射或预算不符。');
    const objectUrl = URL.createObjectURL(new Blob([await verifiedBytes(entry.image, entry.image_sha256)], { type: 'image/png' }));
    const decodedImage = new Image(); decodedImage.src = objectUrl;
    result[name] = { ...atlas, decodedImage, objectUrl };
    await decodedImage.decode();
    validateGameAtlas('r3_material_sample', atlas, decodedImage.naturalWidth, decodedImage.naturalHeight);
    if (name !== 'r3_props') {
      const pivot = name === 'r3_sheep_side' ? [64, 112] : [64, 98];
      if (Object.values(atlas.frames).some(frame => frame.rect[2] !== 128 || frame.rect[3] !== 128 || frame.pivot_px.some((value, index) => value !== pivot[index]))) throw new Error('有限角色样板必须保留原128帧与足点。');
    } else if (['hay_tray_thin', 'hurdle_narrow', 'hurdle_medium', 'hurdle_wide', 'clover_outer_round', 'clover_core_round'].some(frame => !atlas.frames[frame])) throw new Error('有界道具样板缺少帧。');
  }
  await loadMaterial('r3_props', manifest.props_sample);
  if (game === 'runner') await loadMaterial('r3_sheep_side', manifest.character_samples.sheep_side);
  if (game === 'herd') {
    await loadMaterial('r3_sheep_iso8', manifest.character_samples.sheep_iso8);
    await loadMaterial('r3_dog_iso8', manifest.character_samples.dog_iso8);
  }
  if (game === 'herd') {
    const fence = manifest.fence;
    const atlas = parseAtlas(JSON.parse(new TextDecoder().decode(await verifiedBytes(fence.metadata, fence.metadata_sha256))));
    if (atlas.image !== fence.image || ['r3_fence_post_left', 'r3_fence_post_right', 'r3_fence_rails'].some(frame => !atlas.frames[frame]) || Object.keys(atlas.frames).length !== 3) throw new Error('R3围栏材质映射不符。');
    const objectUrl = URL.createObjectURL(new Blob([await verifiedBytes(fence.image, fence.image_sha256)], { type: 'image/png' }));
    const decodedImage = new Image(); decodedImage.src = objectUrl;
    result.r3_fence = { ...atlas, decodedImage, objectUrl };
    await decodedImage.decode();
    validateGameAtlas('r3_fence', atlas, decodedImage.naturalWidth, decodedImage.naturalHeight);
  }
  const titleResponse = await fetch(new URL(manifest.ui.title.image, base), { cache: 'no-store' });
  if (!titleResponse.ok) throw new Error('R3标题底板无法读取，可重试。');
  const titleBytes = await titleResponse.arrayBuffer();
  const titleHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', titleBytes)), value => value.toString(16).padStart(2, '0')).join('');
  if (titleHash !== manifest.ui.title.sha256) throw new Error('R3标题底板摘要不符。');
  const titleUrl = URL.createObjectURL(new Blob([titleBytes], { type: 'image/png' }));
  const titleImage = new Image(); titleImage.src = titleUrl;
  const [titleWidth, titleHeight] = manifest.ui.title.size_px;
  result.r3_ui_title = { image: manifest.ui.title.image, size_px: [titleWidth, titleHeight], decodedImage: titleImage, objectUrl: titleUrl, frames: {}, animations: {} };
  await titleImage.decode();
  if (titleImage.naturalWidth !== titleWidth || titleImage.naturalHeight !== titleHeight) throw new Error('R3标题底板尺寸不符。');
}
export function releaseAssets(atlases: Record<string, Atlas>): void {
  for (const atlas of Object.values(atlases)) { if (atlas.decodedImage) atlas.decodedImage.src = ''; if (atlas.objectUrl) URL.revokeObjectURL(atlas.objectUrl); }
}
