import { z } from 'zod';
import { BUILD, RULES, sha256Utf8 } from '@sheep/game-core';
import type { GameId } from '@sheep/game-core';
export interface Atlas { image: string; size_px: [number, number]; scene_size_px?: [number, number] | undefined; decodedImage?: HTMLImageElement; objectUrl?: string; frames: Record<string, { rect: [number, number, number, number]; pivot_px: [number, number] }>; animations: Record<string, { frames: string[]; fps: number; loop: boolean }> }
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
export type AssetManifest = z.infer<typeof manifestSchema>;
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
  return manifest;
}
export async function preloadAssets(game: GameId, baseUrl = '/assets/', expectedHash?: string): Promise<Record<string, Atlas>> {
  const result: Record<string, Atlas> = {};
  try {
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
    return result;
  } catch (error) { releaseAssets(result); throw error; }
}
export function releaseAssets(atlases: Record<string, Atlas>): void {
  for (const atlas of Object.values(atlases)) { if (atlas.decodedImage) atlas.decodedImage.src = ''; if (atlas.objectUrl) URL.revokeObjectURL(atlas.objectUrl); }
}
