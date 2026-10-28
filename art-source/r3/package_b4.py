"""Native-PNG atlas windows only: shared posts remove duplicated panel joins."""
from pathlib import Path
import json
import hashlib
root=Path(__file__).resolve().parents[2]
d=root/'apps/web/public/assets/candidates/r3'
frames={'r3_fence_post_left':[30,120,234,650],'r3_fence_post_right':[1508,120,236,650],'r3_fence_rails':[264,249,1244,462]}
atlas={'image':'fence-panel-b3.png','size_px':[1774,887],'frames':{name:{'rect':rect,'pivot_px':[rect[2]/2,rect[3]]}for name,rect in frames.items()},'animations':{},'note':'same untouched native PNG; atlas windows exclude transparent margin and reuse one post per join; no repaint/rescale of native pixels'}
data=(json.dumps(atlas,indent=2)+'\n').encode('utf-8');(d/'fence-panel-b4.atlas.json').write_bytes(data)
p=d/'manifest.json';m=json.loads(p.read_text(encoding='utf-8'));m['candidate_id']='R3-B4-C-sample-a';m['fence']['metadata']='fence-panel-b4.atlas.json';m['fence']['metadata_sha256']=hashlib.sha256(data).hexdigest();m['fence']['role']='native raster material windows with shared individual posts/rails, clipped to unchanged blocked core segments; candidate, not final 3D source'
p.write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
(root/'art-source/r3/fence-b3/b4-atlas-window-receipt.json').write_text(json.dumps({'source_native_sha256':hashlib.sha256((d/'fence-panel-b3.png').read_bytes()).hexdigest(),'frames':frames,'source_pixels_modified':False,'candidate_manifest_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sample_art_accepted':False,'production_art_accepted':False},indent=2)+'\n',encoding='utf-8')
print(hashlib.sha256(p.read_bytes()).hexdigest())
