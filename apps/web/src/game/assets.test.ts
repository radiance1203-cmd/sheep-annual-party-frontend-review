import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUILD, sha256Utf8 } from '@sheep/game-core';
import { preloadAssets, releaseAssets, verifyManifest } from './assets';

afterEach(() => { vi.unstubAllGlobals(); });
const origin = 'https://farm.example';
const json = (assets: unknown[] = []) => JSON.stringify({ game_rule_version: BUILD.rule_version, assets });
function browser(): void { vi.stubGlobal('window', { location: { origin } }); }

describe('bound manifest compatibility', () => {
  it('loads only the immutable snapshot matching the bound SHA when current art changes', async () => {
    browser();
    const old = json(); const hash = await sha256Utf8(old);
    const requests: string[] = [];
    vi.stubGlobal('fetch', async (url: URL) => { requests.push(url.href); return new Response(requests.length === 1 ? json([{ asset_id: 'new' }]) : old); });
    await expect(verifyManifest('/assets/', hash)).resolves.toMatchObject({ assets: [] });
    expect(requests).toEqual([`${origin}/assets/asset-manifest.v1.json`, `${origin}/assets/releases/${hash}/asset-manifest.v1.json`]);
  });
  it('rejects an altered historical snapshot', async () => {
    browser(); const hash = await sha256Utf8(json());
    vi.stubGlobal('fetch', async () => new Response(json([{ asset_id: 'altered' }])));
    await expect(verifyManifest('/assets/', hash)).rejects.toThrow('摘要不匹配');
  });
});

describe('stable atlas assets', () => {
  it('uses manifest metadata paths and keeps the validated decoded object URL for the renderer', async () => {
    browser();
    const png = new Uint8Array([1, 2, 3]);
    const digest = async (value: Uint8Array<ArrayBuffer>) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', value)), b => b.toString(16).padStart(2, '0')).join('');
    const actions = ['idle', 'run', 'takeoff', 'air', 'land', 'steady', 'bump', 'celebrate'];
    const atlas = JSON.stringify({ image: 'sheep_side_v2.png', size_px: [8, 8], frames: { frame: { rect: [0, 0, 8, 8], pivot_px: [4, 8] } }, animations: Object.fromEntries(actions.map(action => [`${action}.e`, { frames: ['frame'], fps: 12, loop: true }])) });
    const metadata = new TextEncoder().encode(atlas);
    const assets = ['character.sheep.side', 'environment.side', 'effects.shared'].flatMap(id => [
      { asset_id: `${id}.metadata`, runtime_path: `/assets/test/${id}_v2.atlas.json`, sha256: '' },
      { asset_id: id, runtime_path: '/assets/test/sheep_side_v2.png', sha256: '' },
    ]);
    for (const entry of assets) entry.sha256 = await digest(entry.asset_id.endsWith('.metadata') ? metadata : png);
    const requests: string[] = [];
    vi.stubGlobal('fetch', async (url: URL | string) => { const path = String(url); requests.push(path); return new Response(path.endsWith('asset-manifest.v1.json') ? json(assets) : path.endsWith('.json') ? metadata : png); });
    vi.stubGlobal('Image', class { src = ''; naturalWidth = 8; naturalHeight = 8; async decode() {} });
    const result = await preloadAssets('stack');
    expect(Object.keys(result)).toEqual(['sheep_side_v1', 'farm_side_v1', 'shared_v1']);
    expect(requests.filter(path => path.endsWith('.atlas.json')).every(path => path.includes('_v2.atlas.json'))).toBe(true);
    expect(result.sheep_side_v1?.objectUrl).toMatch(/^blob:/u);
    releaseAssets(result);
  });
});

async function backdropBrowser(mode: 'valid' | 'missing' | 'wrong-size' | 'undeclared' | 'unprofiled' | 'new-empty'): Promise<void> {
  browser();
  const png = new Uint8Array([1, 2, 3]);
  const pngHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', png)), b => b.toString(16).padStart(2, '0')).join('');
  const files = new Map<string, string | Uint8Array<ArrayBuffer>>();
  const assets: { asset_id: string; runtime_path: string; sha256: string }[] = [];
  const size = mode === 'wrong-size' ? [720, 840] : [720, 960];
  const ids = ['character.sheep.side', 'environment.side', 'effects.shared'];
  for (const id of [...ids, ...(mode === 'missing' || mode === 'new-empty' ? [] : ['environment.backdrop.stack'])]) {
    const backdrop = id === 'environment.backdrop.stack';
    const image = backdrop ? 'backdrop_stack_v3.png' : 'base_v2.png';
    const metadataPath = `/assets/test/${id}.atlas.json`;
    const metadata = JSON.stringify({ image, size_px: backdrop ? size : [8, 8], ...(backdrop ? { scene_size_px: [360, 480] } : {}), frames: backdrop ? { backdrop_stack: { rect: [0, 0, ...size], pivot_px: [0, 0] } } : { base: { rect: [0, 0, 8, 8], pivot_px: [4, 8] } }, animations: backdrop ? {} : Object.fromEntries(['idle', 'run', 'takeoff', 'air', 'land', 'steady', 'bump', 'celebrate'].map(action => [`${action}.e`, { frames: ['base'], fps: 12, loop: true }])) });
    assets.push({ asset_id: `${id}.metadata`, runtime_path: metadataPath, sha256: await sha256Utf8(metadata) }, { asset_id: id, runtime_path: `/assets/test/${image}`, sha256: pngHash });
    files.set(metadataPath, metadata); files.set(`/assets/test/${image}`, png);
  }
  const required = { stack: [...ids, ...(mode === 'undeclared' ? [] : ['environment.backdrop.stack'])], runner: [...ids, 'environment.backdrop.runner'], herd: ['character.sheep.iso8', 'character.dog.iso8', 'environment.iso', 'effects.shared', 'environment.backdrop.herd'] };
  files.set('/assets/asset-manifest.v1.json', JSON.stringify({ game_rule_version: BUILD.rule_version, assets, ...(mode === 'new-empty' ? { art_version: 'art-1.3.0-visual-repair' } : {}), ...(mode === 'unprofiled' || mode === 'new-empty' ? {} : { required_atlases_by_game: required }) }));
  vi.stubGlobal('fetch', async (url: URL | string) => { const file = files.get(new URL(String(url)).pathname); return new Response(file ?? 'not found', { status: file === undefined ? 404 : 200 }); });
  let images = 0;
  vi.stubGlobal('Image', class { src = ''; naturalWidth: number; naturalHeight: number; constructor() { const backdrop = images++ === 3; this.naturalWidth = backdrop ? size[0] ?? 0 : 8; this.naturalHeight = backdrop ? size[1] ?? 0 : 8; } async decode() {} });
}

describe('declared scene backdrops', () => {
  it('preloads a required backdrop under the renderer key with its scene dimensions', async () => {
    await backdropBrowser('valid');
    const result = await preloadAssets('stack');
    expect(result.farm_backdrop_v3).toMatchObject({ size_px: [720, 960], scene_size_px: [360, 480] });
    releaseAssets(result);
  });
  it('rejects a missing required backdrop instead of falling back to procedural scenery', async () => {
    await backdropBrowser('missing');
    await expect(preloadAssets('stack')).rejects.toThrow();
  });
  it('rejects backdrop pixels whose ratio does not match the fixed scene', async () => {
    await backdropBrowser('wrong-size');
    await expect(preloadAssets('stack')).rejects.toThrow();
  });
  it('rejects a new required list that omits its scene backdrop', async () => {
    await backdropBrowser('undeclared');
    await expect(preloadAssets('stack')).rejects.toThrow();
  });
  it('rejects backdrop entries when the complete required profile field is missing', async () => {
    await backdropBrowser('unprofiled');
    await expect(preloadAssets('stack')).rejects.toThrow('必需图集');
  });
  it('rejects art 1.3.0 when both backdrop entries and the complete required profile are missing', async () => {
    await backdropBrowser('new-empty');
    await expect(preloadAssets('stack')).rejects.toThrow('必需图集');
  });
});

