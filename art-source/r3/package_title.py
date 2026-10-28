from pathlib import Path
import hashlib
import json
import shutil
root = Path(__file__).resolve().parents[2]
src = Path('<USER_HOME>/.codex/generated_images/01a17aab-47dd-7480-961e-abfdfa76e7eb/exec-8d655327-1131-4c5a-b70d-f5a394f107ca.png')
runtime = root/'apps/web/public/assets/candidates/r3'
for dest in [runtime/'title-plaque-a.png', root/'art-source/r3/backgrounds-a/title-plaque-a.png', Path('<USER_HOME>/output/imagegen/r3-20261028/title-plaque-a.png')]:
    if dest.exists():
        assert dest.read_bytes() == src.read_bytes()
    else:
        shutil.copy2(src, dest)
p = runtime/'manifest.json'
manifest = json.loads(p.read_text())
manifest['ui'] = {'title': {'image': 'title-plaque-a.png', 'sha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'size_px': [2172,724], 'role': 'blank carved wood plaque; semantic titles remain HTML; no gameplay geometry'}}
p.write_text(json.dumps(manifest, indent=2)+'\n',encoding='utf-8')
print(hashlib.sha256(p.read_bytes()).hexdigest())
