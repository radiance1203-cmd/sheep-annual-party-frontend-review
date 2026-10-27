from pathlib import Path
from PIL import Image
import json,hashlib
R=Path(__file__).resolve().parents[2];P=R/'apps/web/public/assets/candidates/r2';V=R/'art-source/r2';checks=[]
def check(ok,label):
    checks.append({'check':label,'status':'PASS' if ok else 'FAIL'})
    if not ok:raise AssertionError(label)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((P/'candidate-manifest.r2a.json').read_text(encoding='utf-8'))
check(manifest['production_art_accepted'] is False,'production_art_accepted remains false')
check(manifest['art_signoff'] is None,'art signoff remains null')
check(manifest['production_replacement_allowed'] is False,'partial atlas cannot replace full runtime')
for name in ['sheep','dog']:
    report=json.loads((V/f'{name}-sample-report.json').read_text())
    check(sha(R/report['source'])==report['source_sha256'],name+' immutable v4 source')
    check(sha(R/report['mother'])==report['mother_sha256'],name+' candidate editable source hash')
    check(all(q['root_motion'] is False for q in report['outputs']),name+' offline clips have no root motion')
for row in manifest['assets']:
    path=R/row['image'];check(sha(path)==row['sha256'],row['asset_id']+' image hash')
    im=Image.open(path);check(im.mode=='RGBA',row['asset_id']+' RGBA')
    if 'metadata' not in row:continue
    path=R/row['metadata'];check(sha(path)==row['metadata_sha256'],row['asset_id']+' metadata hash')
    data=json.loads(path.read_text());check(len(data['frames'])==row['frames'],row['asset_id']+' count')
    for frame,f in data['frames'].items():
        x,y,w,h=f['rect'];check(0<=x and 0<=y and x+w<=im.width and y+h<=im.height,frame+' page bounds')
        check(0<=f['pivot_px'][0]<=w and 0<=f['pivot_px'][1]<=h,frame+' pivot')
        bb=im.crop((x,y,x+w,y+h)).getchannel('A').getbbox();check(bb is not None,frame+' nonempty')
        check(min(bb[0],bb[1],w-bb[2],h-bb[3])>=8,frame+' transparent safe margin')
        if 'stack_idle' in frame:check((bb[3]-bb[1])/4<=37,frame+' stack64 fits frozen44 layer with tray clearance')
(R/'output/r2-20261027/art/technical-checks.json').write_text(json.dumps({'scope':'limited offline source and atlas checks; no runtime or art acceptance','checks':checks},indent=2),encoding='utf-8')
print('PASS',len(checks),'limited source/atlas checks')
