"""Root-only publication of the reviewed native candidates; no rules or approval change."""
from pathlib import Path
import copy
import hashlib
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'apps/web/public/assets'
CURRENT = PUB / 'asset-manifest.v1.json'
PREVIOUS = 'bdf93f4c26c9ed6e108f5af5a718edd7997a86936da85404485a68e1eeb8d234'
REPORT = ROOT / 'art-source/v4/registration-validation-v4.json'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_records(manifest):
    checked = 0
    for record in manifest['assets']:
        if record.get('sha256') and record.get('path'):
            path = ROOT / record['path']
            assert path.is_file() and digest(path) == record['sha256'], record['asset_id']
            checked += 1
    return checked


if '--check' in sys.argv:
    receipt = json.loads(REPORT.read_text(encoding='utf-8'))
    assert digest(CURRENT) == receipt['manifest_sha256']
    manifest = json.loads(CURRENT.read_text(encoding='utf-8'))
    checked = check_records(manifest)
    for item in receipt['historical_manifests']:
        archived = PUB / 'releases' / item / 'asset-manifest.v1.json'
        assert digest(archived) == item
        check_records(json.loads(archived.read_text(encoding='utf-8')))
    print(json.dumps({'status': 'TECHNICAL_PASS', 'asset_records_checked': checked, 'production_art_accepted': False}))
    sys.exit(0)

assert digest(CURRENT) == PREVIOUS, 'Unexpected active manifest: inspect before replacing'
before = json.loads(CURRENT.read_text(encoding='utf-8'))
old_count = check_records(before)
registry = json.loads((ROOT / 'art-source/v4/manifest-update-records.json').read_text(encoding='utf-8'))
updates = registry['updates']
required = {'character.sheep.side', 'character.sheep.iso8', 'character.dog.iso8', 'environment.side'}
required |= {f'environment.backdrop.{game}' for game in ['stack', 'runner', 'herd']}
assert required <= {item['asset_id'] for item in updates}, 'Wait for complete character/prop/scenery registry'
assert registry['production_art_accepted'] is False
after = copy.deepcopy(before)
for update in updates:
    record = update['record']
    assert update['asset_id'] == record['asset_id']
    assert record['status'] == 'rendered_candidate' and record['production_art_accepted'] is False
    target = ROOT / record['path']
    if update.get('candidate_path') and not target.exists():
        source = ROOT / update['candidate_path']
        assert source.is_file() and digest(source) == record['sha256']
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    assert target.is_file() and digest(target) == record['sha256'], record['asset_id']
    matches = [i for i, asset in enumerate(after['assets']) if asset['asset_id'] == record['asset_id']]
    assert len(matches) == 1, record['asset_id']
    after['assets'][matches[0]] = record

archive = PUB / 'releases' / PREVIOUS / 'asset-manifest.v1.json'
if not archive.exists():
    archive.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(CURRENT, archive)
assert digest(archive) == PREVIOUS
after['art_version'] = 'art-1.4.0-visual-repair'
after['historical_manifest'] = {'sha256': PREVIOUS, 'runtime_path': f'/assets/releases/{PREVIOUS}/asset-manifest.v1.json', 'immutable': True}
after['production_art_accepted'] = False
after['runtime_budget_report'] = 'art-source/v4/atlas-validation-v4.json'
assert (ROOT / after['runtime_budget_report']).is_file()
counts = after['counts']
counts['rendered_candidate'] = sum(asset['status'] == 'rendered_candidate' for asset in after['assets'])
character_ids = {'character.sheep.side', 'character.sheep.iso8', 'character.dog.iso8'}
counts['delivered_production_animation_frames'] = sum(a['frame_count'] for a in after['assets'] if a['asset_id'] in character_ids)
assert counts['delivered_production_animation_frames'] == 273
counts['delivered_3d_master_files'] = sum(asset.get('kind') == 'blend_source' for asset in after['assets'])
counts['delivered_production_atlases'] = sum(asset.get('kind') == 'atlas_image' for asset in after['assets'])
changed_ids = {item['asset_id'] for item in updates}
for asset in before['assets']:
    if asset['asset_id'] not in changed_ids:
        assert next(a for a in after['assets'] if a['asset_id'] == asset['asset_id']) == asset
    if asset.get('sha256') and asset.get('path'):
        assert digest(ROOT / asset['path']) == asset['sha256'], 'A prior release resource was overwritten'
assert after['game_rule_version'] == before['game_rule_version']
assert after['required_atlases_by_game'] == before['required_atlases_by_game']
checked = check_records(after)
CURRENT.write_text(json.dumps(after, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
historical = sorted(p.parent.name for p in (PUB / 'releases').glob('*/asset-manifest.v1.json'))
receipt = {'status': 'TECHNICAL_PASS_VISUAL_REVIEW_PENDING', 'previous_manifest_sha256': PREVIOUS, 'manifest_sha256': digest(CURRENT), 'art_version': after['art_version'], 'production_art_accepted': False, 'previous_records_checked': old_count, 'current_records_checked': checked, 'changed_asset_ids': sorted(changed_ids), 'historical_manifests': historical, 'unchanged_rules': True, 'gate_G5': 'REVIEW', 'gate_G6': 'BLOCKED'}
REPORT.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(json.dumps(receipt, indent=2))
