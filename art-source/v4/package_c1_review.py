"""Package static C1 review evidence, not an atlas or runtime registration."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
V=Path(__file__).resolve().parent;ROOT=V.parents[1];OUT=ROOT/'output/repair-20261027/art';OUT.mkdir(parents=True,exist_ok=True)
FRAMES=V/'review/frames128';FRAMES.mkdir(parents=True,exist_ok=True)
FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',14);SMALL=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',12)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def bb(im,t=1):return im.getchannel('A').point(lambda a:255 if a>=t else 0).getbbox()
def put(bg,im,xy):bg.paste(im,xy,im)
def text(bg,xy,t):ImageDraw.Draw(bg).text(xy,t,font=FONT,fill='#3f3327')
def base(w,h):return Image.new('RGB',(w,h),'#f8f0de')
report={'status':'C1_STATIC_REVIEW_PENDING','production_art_accepted':False,'real_device':'NOT_RUN',
        'source_script':'art-source/repair_masters_v4.py','source_script_sha256':sha(V.parent/'repair_masters_v4.py'),
        'render_reports':{},'frames':[],'css':[],'checks':[]}
for actor in ['sheep','dog']:
    rp=V/('source-review-'+actor+'.json');source=json.loads(rp.read_text());record=source['actors'][0]
    report['render_reports'][actor]=record
    assert sha(ROOT/record['source'])==record['source_sha256']
    assert sha(ROOT/record['mother'])==record['mother_sha256']
    sheet=base(1140,640);text(sheet,(16,12),'v4 '+actor+' 四视图512源等比例缩至260显示；同一母源，视觉待总控开图')
    for i,label in enumerate(['front','side','back','diagonal']):
        im=Image.open(V/f'samples/{actor}_{label}_512.png').convert('RGBA');im=im.resize((270,270),Image.Resampling.LANCZOS)
        put(sheet,im,(12+i*282,65));text(sheet,(25+i*282,42),label)
        old=Image.open(V.parent/f'v2/samples/{actor}_{label}_512.png').convert('RGBA').resize((240,240),Image.Resampling.LANCZOS)
        put(sheet,old,(26+i*282,370))
    text(sheet,(16,337),'上：v4；下：v2（保留相机、根与源坐标；新大绒团、粗角、短腿/犬头胸改善）')
    sheet.save(OUT/f'C1-{actor}-four-view-comparison.png')
    for p in sorted((V/'samples').glob(actor+'_*_512.png')):
        if 'production' not in p.name and 'stack_' not in p.name:continue
        iso=actor=='dog' or '_iso_' in p.name;crop=(128,60,384,316) if iso else (128,32,384,288)
        im=Image.open(p).convert('RGBA').crop(crop).resize((128,128),Image.Resampling.LANCZOS)
        dest=FRAMES/p.name.replace('_512','_128');im.save(dest)
        b1=bb(im);b128=bb(im,128);pivot=[64,98] if iso else [64,112]
        r={'frame':dest.name,'source_render':p.relative_to(ROOT).as_posix(),'source_render_sha256':sha(p),
           'mother_sha256':record['mother_sha256'],'crop':list(crop),'pivot':pivot,'alpha1_bbox':b1,'alpha128_bbox':b128,
           'alpha1_size':[b1[2]-b1[0],b1[3]-b1[1]],'alpha1_relative_to_pivot':[b1[0]-pivot[0],b1[1]-pivot[1],b1[2]-pivot[0],b1[3]-pivot[1]]}
        if 'stack_' in p.name:
            r['size64_alpha1_logical_height']=(b1[3]-b1[1])*.5
            assert r['size64_alpha1_logical_height']<=37,(p.name,r)
        report['frames'].append(r)

contact=base(1100,620);text(contact,(16,10),'C1正式相机128×128（不trim、不逐帧居中）：脚/地心pivot以十字标出')
for j,r in enumerate(report['frames']):
    x=16+(j%6)*180;y=48+(j//6)*180;im=Image.open(FRAMES/r['frame']).convert('RGBA');put(contact,im,(x+22,y))
    dr=ImageDraw.Draw(contact);px=x+22+r['pivot'][0];py=y+r['pivot'][1];dr.line((px-4,py,px+4,py),fill='#b3553e');dr.line((px,py-4,px,py+4),fill='#b3553e')
    label=r['frame'].replace('sheep_','S ').replace('dog_','D ').replace('production_','').replace('_128.png','')
    dr.text((x,y+132),label,font=SMALL,fill='#3f3327');dr.text((x,y+148),'a1:'+str(r['alpha1_bbox']),font=SMALL,fill='#3f3327')
contact.save(OUT/'C1-production-camera-128-contact.png')

metrics_path=ROOT/'output/repair-20261027/runtime/pre-C-canvas-metrics.json';metrics=json.loads(metrics_path.read_text())
report['css_metrics_snapshot']={'source':metrics_path.relative_to(ROOT).as_posix(),'sha256':sha(metrics_path),'metrics':metrics}
sheet=base(1140,620);text(sheet,(16,10),'C1实际CSS候选尺寸（1图像px=1CSSpx）；用B阶段真实canvas度量，最终layout变化须重算')
spec=[('stack','sheep_stack_idle_f000_128.png',64),('runner','sheep_production_idle_e_128.png',56),
      ('herd sheep','sheep_production_iso_idle_n_128.png',47),('herd dog','dog_production_idle_n_128.png',60)]
for row,viewport in enumerate([320,390]):
    for col,(game,frame,size) in enumerate(spec):
        g='herd' if game.startswith('herd') else game;m=next(v for v in metrics if v['viewportWidth']==viewport and v['game']==g)
        factor=m['cssWidth']/360*size/128;im=Image.open(FRAMES/frame).convert('RGBA');b=bb(im)
        n=round(128*factor);im=im.resize((n,n),Image.Resampling.LANCZOS);x=18+col*280;y=60+row*220
        text(sheet,(x,y),f'{viewport} / {game} / size{size}')
        put(sheet,im,(x+90,y+45));text(sheet,(x,y+145),f'可见a1 {(b[2]-b[0])*factor:.1f}×{(b[3]-b[1])*factor:.1f} CSS px')
        report['css'].append({'viewport':viewport,'actor':game,'frame':frame,'whole_frame_world_size':size,'canvas_css_width':m['cssWidth'],'canvas_css_height':m['cssHeight'],'alpha1_css_size':[(b[2]-b[0])*factor,(b[3]-b[1])*factor],'metrics_source':metrics_path.relative_to(ROOT).as_posix()})
text(sheet,(16,550),'叠层size64、跑羊56、群羊47、犬60是候选起点；全动作包络与门口拥挤待全图集后检查。')
text(sheet,(16,579),'这张图是按真实browser度量还原的素材小图，不是运行场景截图，也不是真机辨识性结论。')
sheet.save(OUT/'C1-current-320-390-css-candidates.png')
report['production_export_authorized']=False
(OUT/'C1-review-measurements.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':report['status'],'frames':len(report['frames']),'stack_max_sample_height':max(r.get('size64_alpha1_logical_height',0) for r in report['frames'])}))
