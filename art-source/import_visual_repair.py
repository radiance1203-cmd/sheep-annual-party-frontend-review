"""Import supplied lobby art without regenerating or changing source bytes."""
from pathlib import Path
import hashlib, json, shutil
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'apps/web/public/assets'
MANIFEST = PUB / 'asset-manifest.v1.json'
BASE_HASH = '1b14bf379058f814d7ddacdeba36aaab4919e22b76d7dc948926e22fac809c9c'
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

archive = PUB / 'releases' / BASE_HASH / 'asset-manifest.v1.json'
if not archive.exists():
    assert digest(MANIFEST) == BASE_HASH, 'Unexpected baseline; do not archive changed bytes'
    archive.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(MANIFEST, archive)
# Immutability is content-addressed: reuse requires an exact hash; do not copy a
# Windows ReadOnly attribute into Vite's dist and prevent repeat builds.
assert digest(archive) == BASE_HASH
manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
imports = json.loads((ROOT / 'visual-repair-v1/04_ASSET_INTEGRATION.json').read_text(encoding='utf-8'))
records = []
for asset in imports['assets']:
    source = ROOT / 'visual-repair-v1' / asset['source_path']
    runtime = ROOT / 'visual-repair-v1' / asset['runtime_path']
    assert digest(source) == asset['source_sha256']
    assert digest(runtime) == asset['runtime_sha256']
    name = asset['supplement_asset_id'].replace('_static', '') + '_v2.webp'
    dest = PUB / ('hero' if asset['suggested_runtime_key'] == 'hero.lobby' else 'covers') / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        assert digest(dest) == digest(runtime), 'Versioned runtime asset already differs'
    else:
        shutil.copyfile(runtime, dest)
    assert list(Image.open(dest).size) == asset['runtime_pixels']
    record = {
        'asset_id': asset['suggested_runtime_key'], 'status': 'rendered_candidate',
        'path': dest.relative_to(ROOT).as_posix(),
        'expected_future_path': 'assets/' + dest.relative_to(PUB).as_posix(),
        'runtime_path': '/assets/' + dest.relative_to(PUB).as_posix(),
        'kind': 'hero_image', 'camera_id': None, 'shared_games': ['stack', 'runner', 'herd'],
        'source_id': 'visual_repair_supplied_imagegen_20261027',
        'source_path': source.relative_to(ROOT).as_posix(),
        'source_sha256': digest(source), 'source_pixels': asset['source_pixels'],
        'bytes': dest.stat().st_size, 'sha256': digest(dest),
        'canvas_px': asset['runtime_pixels'], 'decoded_rgba_bytes': Image.open(dest).width * Image.open(dest).height * 4,
        'version': '2.0.0', 'production_art_accepted': False,
        'license_note': 'Supplied project-owned built-in imagegen illustration; original supplement retained',
        'purpose': asset['purpose'], 'gameplay_asset': False,
        'object_fit': 'contain', 'crop_policy': 'none; preserve all critical subjects',
        'note': 'Supplied WebP copied byte for byte; visually opened; application/device acceptance tracked separately'
    }
    index = next((i for i, old in enumerate(manifest['assets']) if old['asset_id'] == record['asset_id']), None)
    if index is None:
        manifest['assets'].append(record)
    else:
        manifest['assets'][index] = record
    records.append(record)
manifest['art_version'] = 'art-1.2.0-visual-repair'
manifest['counts']['rendered_candidate'] = sum(a['status'] == 'rendered_candidate' for a in manifest['assets'])
manifest['historical_manifest'] = {'sha256': BASE_HASH, 'runtime_path': '/assets/releases/' + BASE_HASH + '/asset-manifest.v1.json', 'immutable': True}
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
report = {'scope': 'VR-03', 'status': 'STATIC_IMPORT_VERIFIED_APP_REVIEW_PENDING', 'archive_sha256': digest(archive), 'current_manifest_sha256': digest(MANIFEST), 'runtime_bytes': sum(a['bytes'] for a in records), 'decoded_rgba_bytes': sum(a['decoded_rgba_bytes'] for a in records), 'assets': records}
(ROOT / 'art-source/visual-repair-v1-import.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k != 'assets'}, indent=2))
