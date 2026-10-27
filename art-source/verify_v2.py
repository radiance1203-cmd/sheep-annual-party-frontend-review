"""Independently validate published v2 metadata and immutable historical references."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parent.parent;PUB=ROOT/'apps/web/public/assets';V=ROOT/'art-source/v2'
BASE='1b14bf379058f814d7ddacdeba36aaab4919e22b76d7dc948926e22fac809c9c'
archive=PUB/'releases'/BASE/'asset-manifest.v1.json';current=PUB/'asset-manifest.v1.json'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
errors=[];checks=[]
def check(ok,label):
 checks.append({'check':label,'status':'PASS' if ok else 'FAIL'})
 if not ok:errors.append(label)
check(sha(archive)==BASE,'historical_manifest_exact_bytes')
old=json.loads(archive.read_text(encoding='utf-8'));new=json.loads(current.read_text(encoding='utf-8'));old_by_id={a['asset_id']:a for a in old['assets']}
for asset in old['assets']:
 if asset.get('path') and asset.get('sha256'):
  p=ROOT/asset['path'];check(p.exists() and sha(p)==asset['sha256'],'v1_reference_retained:'+asset['asset_id'])
total=0;memory={};download={}
for asset in new['assets']:
 if asset.get('runtime_path') and asset.get('sha256'):
  p=ROOT/asset['path'];check(p.exists() and sha(p)==asset['sha256'],'current_asset_hash:'+asset['asset_id'])
 if asset['kind']!='atlas_metadata' or '_v2.' not in asset.get('path',''):continue
 path=ROOT/asset['path'];metadata=json.loads(path.read_text());image=Image.open(path.parent/metadata['image'])
 check(image.mode=='RGBA' and list(image.size)==metadata['size_px'],'rgba_canvas:'+asset['asset_id'])
 check(metadata['runtime_frame_px']==[128,128] and metadata['extrusion_px']==2 and metadata['padding_px']==2,'frame_contract:'+asset['asset_id'])
 original=json.loads((ROOT/old_by_id[asset['asset_id']]['path']).read_text())
 check(metadata['animations']==original['animations'],'unchanged_animation_contract:'+asset['asset_id'])
 check(set(original['frames']).issubset(metadata['frames']),'retained_frame_keys:'+asset['asset_id'])
 for name,f in metadata['frames'].items():
  x,y,w,h=f['rect'];check(w==h==128 and not f['trimmed'] and not f['rotated'],'untrimmed_128:'+name)
  check(x>=4 and y>=4 and x+w+4<=image.width and y+h+4<=image.height,'frame_inside:'+name)
  if name in original['frames']:check(f['pivot_px']==original['frames'][name]['pivot_px'] and f['direction']==original['frames'][name]['direction'],'same_pivot_direction:'+name)
 if asset['asset_id'].startswith('character.'):total+=len(metadata['frames'])
 memory[metadata['asset_id']]=image.width*image.height*4;download[metadata['asset_id']]=(path.parent/metadata['image']).stat().st_size+path.stat().st_size
check(total==254,'254_actual_published_character_frames')
report={'status':'PASS' if not errors else 'FAIL','scope':'file/hash/atlas contract only; not visual/device/onsite approval','manifest_sha256':sha(current),'checks':checks,'errors':errors,'character_frames':total,'texture_base_bytes':memory,'atlas_download_bytes':download,'game_texture_base_bytes':{'stack':memory.get('character.sheep.side',0)+memory.get('environment.side',0)+512*512*4,'runner':memory.get('character.sheep.side',0)+memory.get('environment.side',0)+512*512*4,'herd':memory.get('character.sheep.iso8',0)+memory.get('character.dog.iso8',0)+memory.get('environment.iso',0)+512*512*4}}
(V/'runtime-validation-v2.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
if errors:raise SystemExit(1)
