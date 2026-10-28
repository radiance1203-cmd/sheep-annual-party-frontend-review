from PIL import Image
from pathlib import Path
import json,hashlib
R=Path.cwd();O=R/'review/r3/stack-sample';m=json.loads((O/'sheep_stack_A_sample.atlas.json').read_text());r=json.loads((O/'motion-render-report.json').read_text());a=Image.open(O/m['image']).convert('RGBA');assert a.size==tuple(m['size_px']);assert len(m['frames'])==len(r['frames'])==14;assert len(m['animations'])==4
for row,frame in zip(r['frames'],m['frames'].values()):
 source=Image.open(R/row['path']).convert('RGBA');assert list(source.getchannel('A').getbbox())==frame['alpha_bbox_source'];x,y,w,h=frame['rect'];assert a.crop((x,y,x+w,y+h)).tobytes()==source.crop(m['common_trim']).tobytes();assert hashlib.sha256((R/row['path']).read_bytes()).hexdigest()==frame['source_sha256']
assert len({tuple(f['pivot_px']) for f in m['frames'].values()})==1
assert m['safe_visual_foot_anchor_source_px']==[256.0,260]
assert len(list(O.glob('*_512.png')))+len(list((O/'frames').glob('*_512.png')))==20
assert hashlib.sha256((R/'art-source/r2/r2g/sheep_master_r2g.blend').read_bytes()).hexdigest()=='e6875118a2cca427b380bf40838d679ac9b742d80ab7fff2e117058cb058feff'
result=dict(status='PACKAGING_VERIFY_PASS',native_frames=14,total_rendered_frames=20,clips=4,atlas_size=list(a.size),all_lossless_rects_equal=True,all_alpha_bounds_measured=True,all_source_hashes_equal=True,constant_pivot=True,source_immutable=True,sample_art_accepted=False,production_art_accepted=False,geometry_status='BLOCKED')
(O/'packaging-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
