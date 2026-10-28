"""B3 static pen material candidate. Lossless PNG; never touches registered resources."""
from pathlib import Path
import json
import hashlib
import shutil
import struct
root = Path(__file__).resolve().parents[2]
target = root/'apps/web/public/assets/candidates/r3'
source = root/'art-source/r3/fence-b3'
source.mkdir(parents=True,exist_ok=True)
generated = Path.home()/'.codex/generated_images/01a17aab-47dd-7480-961e-abfdfa76e7eb/exec-59ac0526-ae17-4fd6-a1c9-09aba7076a04.png'
archive = Path.home()/'output/imagegen/r3-20261028/fence-panel-b3.png'
local = source/'fence-panel-b3.png'
png = local.read_bytes() if local.exists() else generated.read_bytes()
sha = lambda data: hashlib.sha256(data).hexdigest()
for dest in [target/'fence-panel-b3.png',local,archive]:
    if dest.exists(): assert dest.read_bytes() == png
    else: dest.write_bytes(png)
w,h = struct.unpack('>II',png[16:24])
atlas = {'image':'fence-panel-b3.png','size_px':[w,h],'frames':{'r3_fence_panel':{'rect':[0,0,w,h],'pivot_px':[w/2,h]}},'animations':{}}
data = (json.dumps(atlas,indent=2)+'\n').encode('utf-8')
(target/'fence-panel-b3.atlas.json').write_bytes(data)
p = target/'manifest.json'; manifest=json.loads(p.read_text(encoding='utf-8'))
manifest['candidate_id']='R3-B3-C-sample-a'
manifest['page_backgrounds']['herd']['anchor_fraction']=.30
manifest['fence']={'image':'fence-panel-b3.png','image_sha256':sha(png),'metadata':'fence-panel-b3.atlas.json','metadata_sha256':sha(data),'role':'static raster material sample, core-segment-bounded panels, no replacement of native 3D masters or collision geometry'}
manifest['scope']='R3 continuous full-page scenery/live UI; one legal same-master stack motion sample; bounded static fence material sample; runner/herd characters and remaining interactive props still v4 pending replacement'
p.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
(source/'generation-receipt.json').write_text(json.dumps({'tool':'built-in imagegen reference editing','reference':'design/prototypes/03_herd.png','generated_filename':generated.name,'source_sha256':sha(png),'pixels':[w,h],'method':'lossless copies only','role':manifest['fence']['role'],'production_art_accepted':False,'sample_art_accepted':False,'candidate_manifest_sha256':sha(p.read_bytes())},indent=2)+'\n',encoding='utf-8')
print(sha(p.read_bytes()))
