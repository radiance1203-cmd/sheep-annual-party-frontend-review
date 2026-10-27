"""Pack actual Blender renders into the frozen straight-alpha atlas contract."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json,hashlib,math,shutil,collections,wave,struct,random
BASE=Path(__file__).resolve().parent;ROOT=BASE.parent;PUB=ROOT/'apps/web/public/assets';PUB.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((BASE/'render_plan.json').read_text());VERSION='art-1.1.0'
REPORT={'version':VERSION,'checks':[],'errors':[],'atlases':[],'animation_frames':0}
def check(v,label):
 REPORT['checks'].append({'check':label,'status':'PASS' if v else 'FAIL'})
 if not v:REPORT['errors'].append(label)
def pack(key,asset_id,folder,cam,names=None,clips=None):
 char=clips is not None;page=1024 if key=='sheep_side' else 2048 if char else 512 if key=='shared' else 1024
 cols=page//136;atlas=Image.new('RGBA',(page,page));frames={};animations={};tiles=[]
 files=sorted((BASE/'renders'/key).glob('*.png'))
 if names is not None:files=[BASE/'renders'/key/(n+'.png') for n in names]
 for idx,file in enumerate(files):
  src=Image.open(file).convert('RGBA');check(src.size==(512,512),'source_512:'+file.name)
  crop=PLAN['crops'][cam];img=src.crop((crop[0],crop[1],crop[0]+256,crop[1]+256))
  dst=BASE/'frames'/key/file.name;dst.parent.mkdir(parents=True,exist_ok=True);img.save(dst)
  bbox=img.getbbox();check(bool(bbox),'nonempty:'+file.stem)
  if char:check(bool(bbox) and min(bbox[0],bbox[1],256-bbox[2],256-bbox[3])>=8,'safe_margin_8:'+file.stem)
  img=img.resize((128,128),Image.Resampling.LANCZOS)
  # Clamp hidden RGB to zero; alpha is straight (Pillow RGBA), no premultiplication.
  pixels=img.load()
  for y in range(128):
   for x in range(128):
    if pixels[x,y][3]==0:pixels[x,y]=(0,0,0,0)
  x=idx%cols*136+4;y=idx//cols*136+4;check(y+128+4<=page,'rect_within_page:'+file.stem)
  atlas.paste(img,(x,y))
  # Two copied edge pixels and two fully transparent separator pixels on each side.
  for k in [1,2]:
   atlas.paste(img.crop((0,0,1,128)),(x-k,y));atlas.paste(img.crop((127,0,128,128)),(x+127+k,y))
   atlas.paste(img.crop((0,0,128,1)),(x,y-k));atlas.paste(img.crop((0,127,128,128)),(x,y+127+k))
  pivot=[64,112] if cam=='side_v1' else [64,98]
  direction=next((i for i,(d,a) in enumerate(PLAN['directions']) if '__'+d+'__' in file.stem),None)
  frames[file.stem]={'rect':[x,y,128,128],'source_size':[128,128],'sprite_source_rect':[0,0,128,128],'trimmed':False,'rotated':False,'pivot_px':pivot,'direction':direction}
  tiles.append((file.stem,img))
 if char:
  dirs=['e'] if cam=='side_v1' else [d for d,a in PLAN['directions']]
  for clip,(n,fps,loop) in clips.items():
   for d in dirs:
    seq=[f'{key}__{clip}__{d}__f{i:03}' for i in range(n)];check(all(k in frames for k in seq),'animation_complete:'+key+':'+clip+'.'+d)
    animations[clip+'.'+d]={'frames':seq,'fps':fps,'loop':loop}
  check(len(frames)==sum(v[0] for v in clips.values())*len(dirs),'exact_frame_count:'+key);REPORT['animation_frames']+=len(frames)
 stem={'sheep_side':'sheep_side_v1','sheep_iso8':'sheep_iso8_v1','dog_iso8':'dog_iso8_v1','farm_side':'farm_side_v1','farm_iso':'farm_iso_v1','shared':'shared_v1'}[key]
 out=PUB/folder;out.mkdir(parents=True,exist_ok=True);png=out/(stem+'.png');atlas.save(png,optimize=True)
 meta={'schema_version':'sheep-atlas-1.0','asset_id':asset_id,'version':VERSION,'status':'rendered_candidate','image':png.name,'size_px':[page,page],'color_space':'srgb','alpha_mode':'straight','camera_id':cam,'source_frame_px':[256,256],'runtime_frame_px':[128,128],'extrusion_px':2,'padding_px':2,'frames':frames,'animations':animations,'source':'art-source/render_assets.py','production_art_accepted':False}
 (out/(stem+'.atlas.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 preview=Image.new('RGB',(7*168,math.ceil(len(tiles)/7)*164),'#f7eedb');draw=ImageDraw.Draw(preview)
 for i,(name,img) in enumerate(tiles):
  x=i%7*168;y=i//7*164;preview.paste(img,(x+20,y),img);draw.line((x+84,y+92,x+84,y+118),fill='#d95b43');draw.line((x+72,y+112,x+96,y+112),fill='#d95b43');draw.text((x+3,y+132),name.replace(key+'__',''),fill='#493b2d')
 preview.save(BASE/'previews'/(key+'_contact.png'))
 REPORT['atlases'].append({'asset_id':asset_id,'path':str(png.relative_to(ROOT)).replace('\\','/'),'frames':len(frames),'bytes':png.stat().st_size,'decoded_bytes':page*page*4,'sha256':hashlib.sha256(png.read_bytes()).hexdigest()})
 return tiles
all_tiles={}
for key,p in PLAN['plans'].items():all_tiles[key]=pack(key,{'sheep_side':'character.sheep.side','sheep_iso8':'character.sheep.iso8','dog_iso8':'character.dog.iso8'}[key],'characters',p['camera'],clips=p['clips'])
props=['hay_tray','fence_segment','hurdle','clover_outer','clover_core','grass_tile','dirt_tile','barn','gate_marker','flower','shadow_contact']
for key,cam,aid in [('farm_side','side_v1','environment.side'),('farm_iso','iso8_v1','environment.iso')]:pack(key,aid,'environment',cam,names=props)
pack('shared','effects.shared','effects','iso8_v1',names=['sparkle','dust','bark_wave','entry_ring','confetti'])
check(REPORT['animation_frames']==254,'total_254_actual_character_frames')
# Runtime UI is copied byte for byte from its editable baseline source.
(PUB/'ui').mkdir(exist_ok=True)
for file in (ROOT/'design/ui_kit').glob('*.svg'):shutil.copy2(file,PUB/'ui'/file.name)
shutil.copy2(ROOT/'design/ui_kit/button-states.json',PUB/'ui/button-states.json')
# Hero uses the very same editable sheep, not an unrelated generated character.
(PUB/'hero').mkdir(exist_ok=True)
hero_source=BASE/'renders/hero/lobby_sheep.png'
if hero_source.exists():Image.open(hero_source).save(PUB/'hero/lobby_sheep_v1.webp',lossless=True)
else:REPORT['errors'].append('hero_not_rendered')
# Original, optional synthesized cues; runtime mute always remains available.
rng=random.Random(701);audio=PUB/'audio';audio.mkdir(exist_ok=True)
for name,freq,duration in [('click',600,.07),('success',880,.22),('mistake',180,.18),('jump',460,.12),('enter',1046,.25),('bark',160,.18),('celebrate',784,.5)]:
 data=[];rate=22050
 for i in range(int(rate*duration)):
  t=i/rate;envelope=math.sin(math.pi*t/duration)**2*.13
  f=freq*(1+t/duration*.5) if name=='jump' else freq
  sample=math.sin(math.tau*f*t)
  if name=='bark':sample=.5*sample+.22*rng.uniform(-1,1)
  if name in ['success','enter','celebrate']:sample=(sample+math.sin(math.tau*f*1.25*t)+math.sin(math.tau*f*1.5*t))/3
  data.append(struct.pack('<h',int(envelope*sample*32767)))
 with wave.open(str(audio/(name+'.wav')),'wb') as w:w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes(b''.join(data))
preview_data=[]
for f in sorted((PUB/'characters').glob('*.atlas.json')):
 d=json.loads(f.read_text());d['image']='../../apps/web/public/assets/characters/'+d['image'];preview_data.append(d)
html='''<!doctype html><meta charset="utf-8"><title>Original farm atlas review</title>
<style>body{font:16px system-ui;background:#fff8e9;color:#493b2d;margin:24px}h1{font-size:26px}button,select{font:inherit;padding:12px;margin:8px;min-height:48px}section{display:flex;flex-wrap:wrap;gap:16px}article{background:#e7edcf;border:1px solid #abbd8e;border-radius:16px;padding:12px}canvas{display:block;width:256px;height:256px}label{display:block}p{max-width:900px}</style>
<h1>Shared sheep / dog production render review</h1><p>254 actual Blender character frames. Red cross = fixed ground pivot. Animation is presentation only. These previews do not constitute real-device or final visual acceptance.</p><button id="pause">Pause motion</button><div id="root"></div>
<script>const DATA=__DATA__;let paused=false;document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'Play motion':'Pause motion'};
for(const d of DATA){const h=document.createElement('h2');h.textContent=d.asset_id;root.append(h);const sec=document.createElement('section');root.append(sec);const dirs=[...new Set(Object.keys(d.animations).map(x=>x.split('.')[1]))];const im=new Image;im.src=d.image;for(const dir of dirs){const a=document.createElement('article');const label=document.createElement('label');label.textContent=dir.toUpperCase();a.append(label);const sel=document.createElement('select');for(const name of Object.keys(d.animations).filter(x=>x.endsWith('.'+dir))){const op=document.createElement('option');op.value=name;op.textContent=name;sel.append(op)}a.append(sel);const can=document.createElement('canvas');can.width=can.height=256;a.append(can);sec.append(a);const ctx=can.getContext('2d');let t=0,last=0;function draw(now){if(!paused)t+=now-last;last=now;const anim=d.animations[sel.value];const f=d.frames[anim.frames[Math.floor(t/1000*anim.fps)%anim.frames.length]];ctx.clearRect(0,0,256,256);const [x,y,w,h]=f.rect;ctx.drawImage(im,x,y,w,h,0,0,256,256);const [px,py]=f.pivot_px;ctx.strokeStyle='#d95b43';ctx.beginPath();ctx.moveTo(px*2-12,py*2);ctx.lineTo(px*2+12,py*2);ctx.moveTo(px*2,py*2-12);ctx.lineTo(px*2,py*2+12);ctx.stroke();requestAnimationFrame(draw)}im.addEventListener('load',()=>requestAnimationFrame(draw))}}
</script>'''.replace('__DATA__',json.dumps(preview_data))
(BASE/'previews/atlas_preview.html').write_text(html,encoding='utf-8')
REPORT['status']='PASS' if not REPORT['errors'] else 'FAIL'
(BASE/'atlas-validation.json').write_text(json.dumps(REPORT,indent=2)+'\n')
print(json.dumps({k:v for k,v in REPORT.items() if k!='checks'},indent=2))
if REPORT['errors']:raise SystemExit(1)
