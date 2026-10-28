"""Verify published R3 evidence without changing historical capture receipts."""
from pathlib import Path
import hashlib, json, subprocess, struct

R = Path(__file__).resolve().parents[2]
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads((R / p).read_text('utf-8-sig'))
binding = read('review/r3/PUBLIC_SOURCE_BINDING.json')
scope = read('review/r3/UPLOAD_SCOPE.json')
rows = {r['path']: r for r in scope['selected']}
normalized = []

def check(path, expected):
    data = (R / path).read_bytes()
    if sha(data) == expected:
        return
    attr = subprocess.check_output(['git', '-C', str(R), 'check-attr', 'text', '--', path], text=True).strip().rsplit(': ', 1)[1]
    assert attr in ['set', 'auto'] and b'\0' not in data[:8000], path
    assert sha(data.replace(b'\r\n', b'\n')) == rows[path]['git_blob_sha256'], path
    normalized.append(path)

for path, row in binding['capture_source'].items():
    data = (R / binding.get('source_snapshot_prefix', '') / path).read_bytes()
    assert sha(data) in {row['export_worktree_sha256'], row['git_blob_sha256']}, path
    assert row['captured_original_sha256'] == row['export_worktree_sha256'], path

for row in scope['selected']:
    check(row['path'], row['exported_sha256'])

manifest_path = binding.get('candidate_manifest_path', 'apps/web/public/assets/candidates/r3/manifest.json')
manifest = read(manifest_path)
assert sha((R / manifest_path).read_bytes()) == binding['candidate_sha256']
assert manifest['sample_art_accepted'] is False and manifest['production_art_accepted'] is False
asset_count = 0
for entry in [*manifest['backgrounds'].values(), *manifest['page_backgrounds'].values(), manifest['ui']['title'], manifest['stack_sample'], manifest['fence']]:
    for name, digest in [('image', 'image_sha256' if 'image_sha256' in entry else 'sha256'), ('metadata', 'metadata_sha256')]:
        if name in entry and digest in entry:
            assert sha((R / binding.get('asset_directory', 'apps/web/public/assets/candidates/r3') / entry[name]).read_bytes()) == entry[digest]
            asset_count += 1

base = 'review/r3/evidence/'
captures = read(base + 'pages/results.json')['captures']
assert len(captures) == 27
keys = set()
for c in captures:
    p = base + 'pages/' + c['filename']; raw = (R / p).read_bytes()
    assert sha(raw) == c['screenshotSha256']
    assert read(p.replace('.png', '.json')) == c
    assert c['candidateManifestSha256'] == binding['candidate_sha256']
    assert c['hashes'] == captures[0]['hashes']
    assert all(c['hashes'][k] == v['captured_original_sha256'] for k, v in binding['capture_source'].items())
    v = c['before']['viewport']; assert struct.unpack('>II', raw[16:24]) == (v['width'] * v['requestedDpr'], v['height'] * v['requestedDpr'])
    keys.add((c['game'], c['state'], v['width']))
assert len(keys) == 27
final = read(base + 'final-integrity.json')
assert final['status'] == 'PASS' and final['runtime_records'] == 49
for video in final['videos']:
    game = video['game']
    assert sha((R / base / 'video' / (game + '-real-gamepage-fullspeed.webm')).read_bytes()) == video['videoSha256']
    source = rows[base + 'video/' + game + '-actual-practice-process.json']
    assert source['original_sha256'] == video['processSha256']

# Resolve links from the evidence gallery; it remains a downloadable static artifact.
import re
gallery = (R / base / 'index.html').read_text('utf-8')
for href in re.findall(r'(?:href|src)="([^"]+)"', gallery):
    if href.startswith(('http:', 'https:', '#', 'data:')):
        continue
    assert (R / base / href).exists(), href


latest=read('review/r3/a-window-20261028/PUBLIC_SOURCE_BINDING.json')
current=read('apps/web/public/assets/candidates/r3/manifest.json')
assert sha((R/'apps/web/public/assets/candidates/r3/manifest.json').read_bytes())==latest['candidate_sha256']
newbase=latest['evidence_directory'];newcaps=read(newbase+'pages/results.json')['captures'];assert len(newcaps)==27
for c in newcaps:
    p=R/newbase/'pages'/c['filename'];assert sha(p.read_bytes())==c['screenshotSha256'];assert read(p.relative_to(R).as_posix().replace('.png','.json'))==c
    assert c['candidateManifestSha256']==latest['candidate_sha256'];assert c['hashes']==newcaps[0]['hashes']
for path,row in latest['capture_source'].items():assert sha((R/path).read_bytes()) in (row['export_worktree_sha256'],row['git_blob_sha256'])
for entry in [*current['backgrounds'].values(),*current['page_backgrounds'].values(),current['ui']['title'],current['stack_sample'],current['fence'],current['props_sample'],*current['character_samples'].values()]:
    for name,digest in [('image','image_sha256' if 'image_sha256' in entry else 'sha256'),('metadata','metadata_sha256')]:
        if name in entry and digest in entry:assert sha((R/'apps/web/public/assets/candidates/r3'/entry[name]).read_bytes())==entry[digest]
run=read(newbase+'runtime/lifecycle.json');assert len(run['rows'])==49 and not run['errors'] and not run['mutations'] and run['failure'] is None
assert read('review/r3/a-window-20261028/resource-window-release.json')['status']=='RELEASED'
assert read('review/r3/a-window-20261028/independent-review-receipt.json')['provisional'] is False
for href in re.findall(r'(?:href|src)="([^"]+)"',(R/newbase/'index.html').read_text('utf-8')):
    if not href.startswith(('http:','https:','#','data:')):assert (R/newbase/href).exists(),href
print(json.dumps({'A_finite_status':'PASS bindings only','new_native_pngs':len(newcaps),'new_runtime_records':49,'new_full_videos':0,'historical_B4_videos':3,'S3':'NOT_READY','window':'RELEASED'}))

print(json.dumps({'status': 'PASS', 'scope': 'public export bindings, not new browser/art/device acceptance', 'selected_files': len(scope['selected']), 'capture_source_bindings': len(binding['capture_source']), 'native_pngs': len(captures), 'candidate_assets': asset_count, 'videos': len(final['videos']), 'git_lf_normalized_files': len(normalized), 'S3': 'NOT_READY', 'production_art_accepted': False}))
