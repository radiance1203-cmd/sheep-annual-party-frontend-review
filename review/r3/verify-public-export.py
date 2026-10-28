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
    data = (R / path).read_bytes()
    assert sha(data) in {row['export_worktree_sha256'], row['git_blob_sha256']}, path
    assert row['captured_original_sha256'] == row['export_worktree_sha256'], path

for row in scope['selected']:
    check(row['path'], row['exported_sha256'])

manifest_path = 'apps/web/public/assets/candidates/r3/manifest.json'
manifest = read(manifest_path)
assert sha((R / manifest_path).read_bytes()) == binding['candidate_sha256']
assert manifest['sample_art_accepted'] is False and manifest['production_art_accepted'] is False
asset_count = 0
for entry in [*manifest['backgrounds'].values(), *manifest['page_backgrounds'].values(), manifest['ui']['title'], manifest['stack_sample'], manifest['fence']]:
    for name, digest in [('image', 'image_sha256' if 'image_sha256' in entry else 'sha256'), ('metadata', 'metadata_sha256')]:
        if name in entry and digest in entry:
            assert sha((R / 'apps/web/public/assets/candidates/r3' / entry[name]).read_bytes()) == entry[digest]
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

print(json.dumps({'status': 'PASS', 'scope': 'public export bindings, not new browser/art/device acceptance', 'selected_files': len(scope['selected']), 'capture_source_bindings': len(binding['capture_source']), 'native_pngs': len(captures), 'candidate_assets': asset_count, 'videos': len(final['videos']), 'git_lf_normalized_files': len(normalized), 'S3': 'NOT_READY', 'production_art_accepted': False}))
