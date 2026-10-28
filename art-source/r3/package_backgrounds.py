"""Lossless copy + metadata only; no repainting/cropping or registered release writes."""
from pathlib import Path
import hashlib
import json
import shutil
import struct

root = Path(__file__).resolve().parents[2]
generated = Path('<USER_HOME>/.codex/generated_images/01a17aab-47dd-7480-961e-abfdfa76e7eb')
archive = Path('<USER_HOME>/output/imagegen/r3-20261028')
source = root / 'art-source/r3/backgrounds-a'
runtime = root / 'apps/web/public/assets/candidates/r3'
for directory in (archive, source, runtime):
    directory.mkdir(parents=True, exist_ok=True)
files = {
    'stack': ('exec-ead54c43-4d86-428b-929d-45857ce76210.png', [360, 480]),
    'runner': ('exec-a6136a46-df3d-43e9-96ad-9d07677d4667.png', [360, 220]),
    'herd': ('exec-ab89ae6d-c7ae-46e5-a8da-ebc3c43295e0.png', [360, 420]),
}
digest = lambda data: hashlib.sha256(data).hexdigest()
manifest = {'candidate_id': 'R3-B-backgrounds-a', 'source_manifest_sha256': digest((root/'apps/web/public/assets/asset-manifest.v1.json').read_bytes()), 'backgrounds': {}, 'page_background': 'stack', 'scope': 'background/UI candidate; original v4 characters/props remain unless separately declared sample; no new golden', 'sample_art_accepted': False, 'production_art_accepted': False}
receipts = []
for game, (filename, world) in files.items():
    data = (generated/filename).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    w, h = struct.unpack('>II', data[16:24])
    assert w <= 2048 and h <= 2048 and abs(w/h-world[0]/world[1]) < .003
    for dest in (archive/f'{game}-background-a.png', source/f'{game}.png', runtime/f'{game}.png'):
        if dest.exists():
            assert dest.read_bytes() == data, 'Never overwrite a different candidate; make a new version'
        else:
            shutil.copy2(generated/filename, dest)
    atlas = {'image': f'{game}.png', 'size_px': [w,h], 'scene_size_px': world, 'frames': {f'backdrop_{game}': {'rect': [0,0,w,h], 'pivot_px': [0,0]}}, 'animations': {}}
    atlas_data = (json.dumps(atlas, indent=2)+'\n').encode('utf-8')
    (runtime/f'{game}.atlas.json').write_bytes(atlas_data)
    manifest['backgrounds'][game] = {'image': f'{game}.png', 'image_sha256': digest(data), 'metadata': f'{game}.atlas.json', 'metadata_sha256': digest(atlas_data), 'rgba_bytes': w*h*4}
    receipts.append({'game': game, 'source_generated_filename': filename, 'source_sha256': digest(data), 'pixels': [w,h], 'world': world, 'method': 'built-in imagegen reference edit; lossless copies, no processing/cropping', 'actual_pixels_opened': True, 'art_accepted': False})
manifest_data = (json.dumps(manifest, indent=2)+'\n').encode('utf-8')
(runtime/'manifest.json').write_bytes(manifest_data)
(source/'generation-receipt.json').write_text(json.dumps({'tool': 'built-in imagegen via ChatGPT subscription, no API credentials', 'receipts': receipts, 'candidate_manifest_sha256': digest(manifest_data), 'production_manifest_unchanged': manifest['source_manifest_sha256'] == '49eba97a27668b9c39366157714714b9d1550054453134867bbbb7e1a05bd24c'}, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'manifest_sha256':digest(manifest_data),'games':list(files),'max_native_rgba_bytes':max(r['rgba_bytes'] for r in manifest['backgrounds'].values()),'native_source_copies':str(source.relative_to(root))}))
