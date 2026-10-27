"""Package only R2 finite source samples. Incomplete by design, never production-ready."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,math
R=Path(__file__).resolve().parents[2];V=R/'art-source/r2';O=R/'output/r2-20261027/art';PUB=R/'apps/web/public/assets/candidates/r2'
PUB.mkdir(parents=True,exist_ok=True);O.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',15)
groups=[('sheep_side_r2a','side_v1',(128,32,256,256),(128,224),[
    ('sheep_stack_idle_e_512.png','stack_idle.e',0),('sheep_side_idle_e_512.png','idle.e',0)]),
    ('sheep_iso_r2a','iso8_v1',(128,60,256,256),(128,196),[('sheep_iso_idle_se_512.png','idle.se',0)]),
    ('dog_iso_r2a','iso8_v1',(128,60,256,256),(128,196),[(f'dog_walk_bark_se_f{i:03}_512.png','walk_bark.se',i) for i in range(8)])]
records=[];native=[]
for key,cam,crop,pivot,files in groups:
    page=Image.new('RGBA',(1024,math.ceil(len(files)/4)*256));frames={};animations={};measures=[]
    for i,(file,action,phase) in enumerate(files):
        image=Image.open(V/'renders'/file).convert('RGBA');x,y,w,h=crop;im=image.crop((x,y,x+w,y+h))
        name=f'{key}__{action.replace(".","__")}__f{phase:03}';xx=i%4*256;yy=i//4*256;page.paste(im,(xx,yy))
        frames[name]={'rect':[xx,yy,256,256],'source_size':[256,256],'sprite_source_rect':[0,0,256,256],'trimmed':False,'rotated':False,'pivot_px':list(pivot),'direction':1 if action.endswith('.se') else 0}
        animations.setdefault(action,{'frames':[],'fps':18 if 'walk_bark' in action else 8,'loop':'walk_bark' in action})['frames'].append(name)
        bb=im.getchannel('A').point(lambda x:255 if x>0 else 0).getbbox();measures.append({'frame':name,'alpha_bbox':bb,'stack64_height':(bb[3]-bb[1])/4 if 'stack' in action else None})
        native.append((name,im,pivot,64 if 'stack' in action else 72 if key.startswith('dog') else 55 if cam=='iso8_v1' else 56))
    png=PUB/f'{key}.png';page.save(png,optimize=True)
    meta={'schema_version':'atlas-1.0','asset_id':key,'image':png.name,'size_px':list(page.size),'camera_id':cam,'version':'r2a-limited','status':'rendered_candidate','production_art_accepted':False,'frames':frames,'animations':animations,'missing_actions':'All unlisted actions and directions are deliberately NOT_PRODUCED; this atlas is forbidden as a production replacement.'}
    mp=PUB/f'{key}.atlas.json';mp.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
    records.append({'asset_id':key,'image':png.relative_to(R).as_posix(),'sha256':sha(png),'metadata':mp.relative_to(R).as_posix(),'metadata_sha256':sha(mp),'frames':len(files),'rgba8_bytes':page.width*page.height*4,'measurements':measures})
if (V/'renders/backdrop_herd_r2a.png').exists():
    im=Image.open(V/'renders/backdrop_herd_r2a.png').convert('RGBA');p=PUB/'backdrop_herd_r2a.png';im.save(p,optimize=True)
    records.append({'asset_id':'backdrop_herd_r2a','image':p.relative_to(R).as_posix(),'sha256':sha(p),'scene_size_px':[360,420],'canvas_px':list(im.size),'rgba8_bytes':im.width*im.height*4,'interactive_objects_baked':False})
contact=Image.new('RGB',(1120,350*math.ceil(len(native)/3)), '#f3ecdc');draw=ImageDraw.Draw(contact)
for i,(name,im,pivot,size) in enumerate(native):
    x=i%3*370;y=i//3*350;draw.text((x+8,y+4),name.replace('_r2a',''),font=font,fill='#3c3026')
    contact.paste(im,(x+4,y+30),im);small=im.resize((128,128),Image.Resampling.LANCZOS);contact.paste(small,(x+250,y+30),small)
    final=im.resize((size,size),Image.Resampling.LANCZOS);contact.paste(final,(x+280,y+180),final)
    draw.text((x+12,y+295),'256 / 128 / runtime '+str(size)+' CSS px',font=font,fill='#3c3026')
contact.save(O/'native-size-comparison.png')
views=Image.new('RGB',(1024,650),'#f3ecdc');draw=ImageDraw.Draw(views)
for i,label in enumerate(['front','side','back','diagonal']):
    im=Image.open(V/f'renders/sheep_{label}_512.png').convert('RGBA').resize((256,256),Image.Resampling.LANCZOS);views.paste(im,(i*256,20),im);draw.text((i*256+12,285),label,font=font,fill='#3c3026')
ref=Image.open(R/'design/character_foundation_board.png').convert('RGB');ref.thumbnail((900,310));views.paste(ref,((1024-ref.width)//2,330));views.save(O/'sheep-four-view-reference.png')
report={'candidate_version':'r2a-limited','status':'SOURCE_VERIFIED / REVIEW','production_art_accepted':False,'art_signoff':None,'production_replacement_allowed':False,'assets':records,'source_reports':['art-source/r2/sheep-sample-report.json','art-source/r2/dog-sample-report.json','art-source/r2/environment-sample-report.json'],'references':[{'path':p,'sha256':sha(R/p)} for p in ['design/character_foundation_board.png','design/prototypes/01_stack.png','design/prototypes/02_runner.png','design/prototypes/03_herd.png']],'missing':['sheep walk/run/jump/land/contact animations','remaining dog directions and stationary bark','stack and runner scene rework','all environment loops and full foreground/background layers','true engine S2 capture and human art acceptance']}
(PUB/'candidate-manifest.r2a.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');(O/'candidate-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'candidate_assets':len(records),'limited_frames':sum(q.get('frames',0) for q in records),'production_art_accepted':False,'manifest_sha256':sha(PUB/'candidate-manifest.r2a.json')},ensure_ascii=False))
