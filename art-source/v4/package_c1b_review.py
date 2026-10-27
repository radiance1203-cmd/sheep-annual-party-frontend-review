from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
V=Path(__file__).resolve().parent;ROOT=V.parents[1];OUT=ROOT/'output/repair-20261027/art';FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
report={'status':'C1b_POINT_REVIEW_PENDING','production_art_accepted':False,'production_export_authorized':False,'checks':[],'actors':[]}
def check(ok,label):report['checks'].append({'check':label,'status':'PASS' if ok else 'FAIL'})
for actor in ['sheep','dog']:
    record=json.loads((V/f'source-review-{actor}-C1b.json').read_text())['actors'][0]
    check(sha(ROOT/record['source'])==record['source_sha256'],'unchanged_v2:'+actor)
    check(sha(ROOT/record['mother'])==record['mother_sha256'],'same_native_mother:'+actor)
    canvas=Image.new('RGB',(1140,700),'#f8f0de');draw=ImageDraw.Draw(canvas)
    draw.text((16,12),'C1b '+actor+'：上为定点修订，下为C1历史；同相机同灯光方案，两视图待开图',font=FONT,fill='#3f3327')
    samples=[]
    for i,label in enumerate(['front','side']):
        new=V/f'samples-C1b/{actor}_{label}_512.png';old=V/f'samples/{actor}_{label}_512.png'
        im=Image.open(new).convert('RGBA');im.load();check(im.size==(512,512),'rgba512:'+new.name)
        draw.text((25+i*560,44),label,font=FONT,fill='#3f3327')
        im=im.resize((300,300),Image.Resampling.LANCZOS);canvas.paste(im,(130+i*560,56),im)
        oldim=Image.open(old).convert('RGBA').resize((300,300),Image.Resampling.LANCZOS);canvas.paste(oldim,(130+i*560,380),oldim)
        samples.append({'path':new.relative_to(ROOT).as_posix(),'sha256':sha(new),'mother_sha256':record['mother_sha256']})
    draw.text((16,350),'C1b ↑ / C1 ↓；羊主团54、取消macro displace、可见短绒；犬原生三角耳+前折尖',font=FONT,fill='#3f3327')
    target=OUT/f'C1b-{actor}-front-side.png';canvas.save(target)
    record['samples_with_hash']=samples;report['actors'].append(record)
    history=V/f'history/C1/{actor}_master_v4.blend'
    old_record=json.loads((V/f'history/C1/source-review-{actor}.json').read_text())['actors'][0]
    check(sha(history)==old_record['mother_sha256'],'C1_native_archived:'+actor)
    for label in ['front','side']:
        # The original C1 render paths are intentionally unchanged.
        check((V/f'samples/{actor}_{label}_512.png').is_file(),'C1_samples_retained:'+actor+label)
report['technical_status']='PASS' if all(c['status']=='PASS' for c in report['checks']) else 'FAIL'
report['notes']=['Only front/side512 point samples rendered; full animation and fresh stack alpha envelope await authorization.','C1 prior source/art remain archived; no runtime manifest or product source changed.','Next full export uses candidate world sizes stack64 runner56 herd sheep55 dog72, with same-class scale and measured envelope.']
(OUT/'C1b-review-receipt.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':report['technical_status'],'checks':len(report['checks']),'review':report['status']}));raise SystemExit(0 if report['technical_status']=='PASS' else 1)
