"""Pack only repaired v2 character/farm renders, preserving every v1 runtime file."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,math
BASE=Path(__file__).resolve().parent;ROOT=BASE.parent;V=BASE/'v2';PUB=ROOT/'apps/web/public/assets'
PLAN=json.loads((BASE/'render_plan.json').read_text())
VERSION='art-1.2.0-visual-repair'
report={'status':'NOT_RUN','version':VERSION,'checks':[],'errors':[],'atlases':[],'animation_frames':0}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def check(ok,label):
 report['checks'].append({'check':label,'status':'PASS' if ok else 'FAIL'})
 if not ok:report['errors'].append(label)

def pack(key,aid,folder,cam,clips=None,props=None):
 page=1024 if key=='sheep_side' or props else 2048;cols=page//136
 atlas=Image.new('RGBA',(page,page));frames={};animations={};tiles=[]
 files=sorted((V/'renders'/key).glob('*.png')) if clips else [V/'renders'/key/(name+'.png') for name in props]
 for index,file in enumerate(files):
  if not file.exists():check(False,'source_exists:'+file.as_posix());continue
  src=Image.open(file).convert('RGBA');check(src.size==(512,512),'source_512:'+file.name)
  x0,y0,w,h=PLAN['crops'][cam];cropped=src.crop((x0,y0,x0+w,y0+h));bbox=cropped.getbbox()
  check(bool(bbox),'nonempty:'+file.stem)
  if clips:check(bool(bbox) and min(bbox[0],bbox[1],256-bbox[2],256-bbox[3])>=8,'margin_8:'+file.stem)
  frame_dir=V/'frames'/key;frame_dir.mkdir(parents=True,exist_ok=True);cropped.save(frame_dir/file.name)
  img=cropped.resize((128,128),Image.Resampling.LANCZOS)
  data=list(img.getdata());img.putdata([(r,g,b,a) if a else (0,0,0,0) for r,g,b,a in data])
  x=index%cols*136+4;y=index//cols*136+4;check(y+132<=page,'atlas_bounds:'+file.stem)
  atlas.paste(img,(x,y))
  for edge in [1,2]:
   atlas.paste(img.crop((0,0,1,128)),(x-edge,y));atlas.paste(img.crop((127,0,128,128)),(x+127+edge,y))
   atlas.paste(img.crop((0,0,128,1)),(x,y-edge));atlas.paste(img.crop((0,127,128,128)),(x,y+127+edge))
  direction=next((i for i,(d,a) in enumerate(PLAN['directions']) if '__'+d+'__' in file.stem),None)
  pivot=[64,112] if cam=='side_v1' else [64,98]
  frames[file.stem]={'rect':[x,y,128,128],'source_size':[128,128],'sprite_source_rect':[0,0,128,128],'trimmed':False,'rotated':False,'pivot_px':pivot,'direction':direction}
  tiles.append((file.stem,img))
 if clips:
  directions=['e'] if cam=='side_v1' else [d for d,a in PLAN['directions']]
  for clip,(count,fps,loop) in clips.items():
   for direction in directions:
    seq=[f'{key}__{clip}__{direction}__f{i:03}' for i in range(count)]
    check(all(name in frames for name in seq),'animation_complete:'+key+':'+clip+'.'+direction)
    animations[clip+'.'+direction]={'frames':seq,'fps':fps,'loop':loop}
  check(len(frames)==sum(v[0] for v in clips.values())*len(directions),'exact_count:'+key)
  report['animation_frames']+=len(frames)
 out=PUB/folder;out.mkdir(exist_ok=True);png=out/(key+'_v2.png');meta_file=out/(key+'_v2.atlas.json')
 atlas.save(png,optimize=True)
 meta={'schema_version':'sheep-atlas-1.0','asset_id':aid,'version':VERSION,'status':'rendered_candidate','image':png.name,'size_px':[page,page],'color_space':'srgb','alpha_mode':'straight','camera_id':cam,'source_frame_px':[256,256],'runtime_frame_px':[128,128],'extrusion_px':2,'padding_px':2,'frames':frames,'animations':animations,'source':'art-source/repair_masters_v2.py' if clips else 'art-source/repair_farm_v2.py','production_art_accepted':False}
 meta_file.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
 preview=Image.new('RGB',(7*168,max(1,math.ceil(len(tiles)/7))*166),'#f7eedb');draw=ImageDraw.Draw(preview)
 for index,(name,img) in enumerate(tiles):
  x=index%7*168;y=index//7*166;preview.paste(img,(x+20,y),img);draw.text((x+3,y+132),name.replace(key+'__',''),fill='#493b2d')
 (V/'previews').mkdir(exist_ok=True);preview.save(V/'previews'/(key+'_contact.png'))
 report['atlases'].append({'asset_id':aid,'image':png.relative_to(ROOT).as_posix(),'metadata':meta_file.relative_to(ROOT).as_posix(),'frames':len(frames),'bytes':png.stat().st_size,'decoded_bytes':page*page*4,'sha256':sha(png),'camera':cam,'pivot':pivot,'animations':animations})

for key,p in PLAN['plans'].items():pack(key,{'sheep_side':'character.sheep.side','sheep_iso8':'character.sheep.iso8','dog_iso8':'character.dog.iso8'}[key],'characters',p['camera'],clips=p['clips'])
props=['hay_tray','fence_segment','hurdle','clover_outer','clover_core','grass_tile','dirt_tile','barn','gate_marker','flower','shadow_contact','bush','tree','lantern']
for key,cam,aid in [('farm_side','side_v1','environment.side'),('farm_iso','iso8_v1','environment.iso')]:pack(key,aid,'environment',cam,props=props)
check(report['animation_frames']==254,'total_254')
report['status']='FAIL' if report['errors'] else 'TECHNICAL_PASS_VISUAL_REVIEW_PENDING'
(V/'atlas-validation-v2.json').write_text(json.dumps(report,indent=2)+'\n')
if report['errors']:print(json.dumps(report['errors']));raise SystemExit(1)

# Registration is the final step after every actual frame and packing check passed.
manifest_path=PUB/'asset-manifest.v1.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
by_id={a['asset_id']:a for a in manifest['assets']}
for item in report['atlases']:
 for aid,path in [(item['asset_id'],ROOT/item['image']),(item['asset_id']+'.metadata',ROOT/item['metadata'])]:
  old=by_id[aid];old.update({'path':path.relative_to(ROOT).as_posix(),'expected_future_path':'assets/'+path.relative_to(PUB).as_posix(),'runtime_path':'/assets/'+path.relative_to(PUB).as_posix(),'bytes':path.stat().st_size,'sha256':sha(path),'version':'2.0.0','source_id':'repaired_original_blender_20261027','production_art_accepted':False,'frame_count':item['frames'],'note':'Repaired original source; technical atlas checks passed; final game visual/device acceptance tracked separately'})
  if old['kind']=='atlas_image':old['animations']=item['animations']
for actor in ['sheep','dog','farm']:
 path=V/(actor+'_master_v2.blend');by_id['master.'+actor].update({'path':path.relative_to(ROOT).as_posix(),'expected_future_path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':sha(path),'version':'2.0.0','source_id':'repaired_original_blender_20261027','production_art_accepted':False,'note':'Original mother source repaired non-destructively; direction sample review permitted production export; final game/device review remains separate'})
manifest['art_version']=VERSION;manifest['runtime_budget_report']='art-source/v2/atlas-validation-v2.json'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
preview_data=[]
for item in report['atlases']:
 if not item['asset_id'].startswith('character.'):continue
 data=json.loads((ROOT/item['metadata']).read_text());data['image']='../../../'+item['image'];preview_data.append(data)
template=(BASE/'previews/atlas_preview.html').read_text(encoding='utf-8')
start=template.index('const DATA=')+len('const DATA=');end=template.index(';let paused',start)
template=template[:start]+json.dumps(preview_data)+template[end:]
template=template.replace('Original farm atlas review','Repaired v2 atlas motion review').replace('Shared sheep / dog production render review','Repaired v2 sheep / dog motion review')
(V/'previews/atlas_preview.html').write_text(template,encoding='utf-8')
print(json.dumps({'status':report['status'],'animation_frames':report['animation_frames'],'checks':len(report['checks']),'manifest_sha256':sha(manifest_path)},indent=2))
