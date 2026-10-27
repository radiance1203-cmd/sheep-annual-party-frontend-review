from pathlib import Path
from PIL import Image
import json,hashlib
V=Path(__file__).resolve().parent;ROOT=V.parents[1];OUT=ROOT/'output/repair-20261027/art'
data=json.loads((OUT/'C1-review-measurements.json').read_text(encoding='utf-8'));receipt=json.loads((OUT/'C1-native-source-structure.json').read_text())
checks=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def check(ok,label):checks.append({'check':label,'status':'PASS' if ok else 'FAIL'})
for actor,record in data['render_reports'].items():
    check(sha(ROOT/record['source'])==record['source_sha256'],'v2_source_unchanged:'+actor)
    check(sha(ROOT/record['mother'])==record['mother_sha256'],'v4_mother_hash:'+actor)
    rr=next(r for r in receipt['records'] if r['actor']==actor)
    check(rr['mother_sha256']==record['mother_sha256'],'receipt_matches_samples_mother:'+actor)
    for sample in record['samples']:
        with Image.open(ROOT/sample['path']) as im:im.load();check(im.size==(512,512) and im.mode=='RGBA','raw_512_rgba:'+sample['path'])
for f in data['frames']:
    check(sha(ROOT/f['source_render'])==f['source_render_sha256'],'crop_source_hash:'+f['frame'])
    with Image.open(V/'review/frames128'/f['frame']) as im:im.load();check(im.size==(128,128) and im.mode=='RGBA','fixed_crop_128:'+f['frame'])
stack=[f for f in data['frames'] if 'stack_' in f['frame']]
check(len(stack)==5 and max(f['size64_alpha1_logical_height'] for f in stack)<=37,'5_stack_samples_height_lte37')
check(len(data['css'])==8 and len(data['css_metrics_snapshot']['metrics'])==6,'8_css_candidates_6_canvas_metrics')
for filename in ['C1-sheep-four-view-comparison.png','C1-dog-four-view-comparison.png','C1-production-camera-128-contact.png','C1-current-320-390-css-candidates.png']:
    with Image.open(OUT/filename) as im:im.load();check(im.width>0,'contact_decode:'+filename)
check(not data['production_art_accepted'] and not data['production_export_authorized'],'acceptance_and_export_not_claimed')
old=json.loads((ROOT/'output/repair-20261027/art-audit/asset-measurements.json').read_text(encoding='utf-8'))
for path,record in old['inputs'].items():
    if path.endswith('.blend'):check(sha(ROOT/path)==record['sha256'],'retained_mother_unchanged:'+path)
result={'status':'PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL','checks':checks,'production_art_accepted':False,
  'scope':'C1 sample integrity and measured static stack envelope; no full animation, visual approval or real-device claim.'}
(OUT/'C1-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':result['status'],'checks':len(checks)}));raise SystemExit(0 if result['status']=='PASS' else 1)
