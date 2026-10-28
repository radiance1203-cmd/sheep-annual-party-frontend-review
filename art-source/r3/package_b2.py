"""Package a separate whole-page candidate; keep all B1 images and source masters."""
from pathlib import Path
import hashlib
import json
import shutil
import struct
root = Path(__file__).resolve().parents[2]
directory = root/'apps/web/public/assets/candidates/r3'
source = root/'art-source/r3/backgrounds-b2'
archive = Path.home()/'output/imagegen/r3-20261028'
generated = Path.home()/'.codex/generated_images/01a17aab-47dd-7480-961e-abfdfa76e7eb'
source.mkdir(parents=True, exist_ok=True)
sha = lambda data: hashlib.sha256(data).hexdigest()
manifest = json.loads((directory/'manifest.json').read_text())
manifest['candidate_id'] = 'R3-B2-C-sample-a'
manifest['page_backgrounds'] = {}
inputs = {'stack': ('exec-98a2c0a9-083e-440b-80f0-4c12faf7904a.png', .82), 'runner': ('exec-8e8f2f4f-8bb0-4ec8-8c33-18e70b20db9e.png', .68), 'herd': ('exec-ca7c5fa2-3d6d-4e7c-81ea-506ebe3b4545.png', .27)}
for game, (filename, anchor) in inputs.items():
    data = (generated/filename).read_bytes()
    w,h = struct.unpack('>II',data[16:24])
    for dest in (directory/f'page-{game}-b2.png', source/f'page-{game}-b2.png', archive/f'page-{game}-b2.png'):
        if dest.exists(): assert dest.read_bytes() == data
        else: shutil.copy2(generated/filename,dest)
    manifest['page_backgrounds'][game] = {'image': f'page-{game}-b2.png', 'sha256': sha(data), 'size_px': [w,h], 'anchor_fraction': anchor, 'role':'pure non-interactive portrait page scenery; no canvas projection/input/actor changes'}
atlas_source = root/'review/r3/stack-sample/sheep_stack_A_sample.atlas.json'
atlas = json.loads(atlas_source.read_text())
atlas['image'] = 'stack-motion-a.png'
for frame in atlas['frames'].values(): frame['pivot_px'] = [88,130]
atlas['runtime_scope'] = 'four same-master feasibility clips; fixed common visual foot anchor; not production, missing dedicated miss/perfect'
data = (json.dumps(atlas,indent=2)+'\n').encode()
(directory/'stack-motion-a.atlas.json').write_bytes(data)
png = (atlas_source.parent/'sheep_stack_A_sample.atlas.png').read_bytes()
(directory/'stack-motion-a.png').write_bytes(png)
manifest['stack_sample'] = {'image':'stack-motion-a.png','image_sha256':sha(png),'metadata':'stack-motion-a.atlas.json','metadata_sha256':sha(data),'native_alpha_height':126,'uniform_world_scale':36/126,'visual_budget':'36 high sheep +2 clear +6 tray =44 layer; actual sheep width52 not prototype112; unresolved difference, not new golden'}
manifest['scope'] = 'R3 full-page non-interactive scenery, live UI and one unaccepted stack motion feasibility sample; runner/herd characters and all interactive props remain v4'
(directory/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
(source/'generation-receipt.json').write_text(json.dumps({'method':'built-in imagegen reference editing; lossless native PNG copies','references': ['design/prototypes/01_stack.png','design/prototypes/02_runner.png','design/prototypes/03_herd.png'],'generated_files':{g:f for g,(f,_) in inputs.items()},'page_backgrounds':manifest['page_backgrounds'],'candidate_manifest_sha256':sha((directory/'manifest.json').read_bytes()),'production_art_accepted':False,'sample_art_accepted':False},indent=2)+'\n',encoding='utf-8')
print(sha((directory/'manifest.json').read_bytes()))
