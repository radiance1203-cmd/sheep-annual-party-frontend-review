"""Independent scenery transport/atlas/compatibility checks; not aesthetic scoring."""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parent.parent;PUB=ROOT/'apps/web/public/assets';V=ROOT/'art-source/v3'
PREVIOUS='c94d522416e41bc9eddf937563bda44bf28d4e217c956bbb030980eba3ff35b7'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
checks=[];errors=[]
def check(ok,label):
    checks.append({'check':label,'status':'PASS' if ok else 'FAIL'})
    if not ok:errors.append(label)
current=PUB/'asset-manifest.v1.json';manifest=json.loads(current.read_text(encoding='utf-8'));byid={a['asset_id']:a for a in manifest['assets']}
archive=PUB/'releases'/PREVIOUS/'asset-manifest.v1.json';check(sha(archive)==PREVIOUS,'previous_manifest_original_bytes')
old=json.loads(archive.read_text(encoding='utf-8'))
for asset in old['assets']:
    check(byid[asset['asset_id']]==asset,'previous_record_unchanged:'+asset['asset_id'])
    if asset.get('path') and asset.get('sha256'):
        path=ROOT/asset['path'];check(path.exists() and sha(path)==asset['sha256'],'v2_and_supplied_bytes_unchanged:'+asset['asset_id'])
check(len(byid)==len(manifest['assets']),'unique_asset_ids')
required={
 'stack':['character.sheep.side','environment.side','effects.shared','environment.backdrop.stack'],
 'runner':['character.sheep.side','environment.side','effects.shared','environment.backdrop.runner'],
 'herd':['character.sheep.iso8','character.dog.iso8','environment.iso','effects.shared','environment.backdrop.herd']}
check(manifest['required_atlases_by_game']==required,'full_required_atlas_lists')
sizes={'stack':(720,960),'runner':(720,440),'herd':(720,840)};records=[]
for game,size in sizes.items():
    aid='environment.backdrop.'+game;asset=byid[aid];meta_asset=byid[aid+'.metadata'];image=Image.open(ROOT/asset['path']);meta=json.loads((ROOT/meta_asset['path']).read_text())
    check(sha(ROOT/asset['path'])==asset['sha256'] and sha(ROOT/meta_asset['path'])==meta_asset['sha256'],'runtime_hashes:'+game)
    check(image.size==size and image.mode=='RGBA' and image.getchannel('A').getextrema()==(255,255),'opaque_2x_rgba:'+game)
    check(meta['size_px']==list(size) and meta['scene_size_px']==[n//2 for n in size],'scene_ratio_2x:'+game)
    check(list(meta['frames'])==['backdrop_'+game] and meta['animations']=={},'single_static_frame:'+game)
    frame=meta['frames']['backdrop_'+game]
    check(frame['rect']==[0,0,*size] and frame['pivot_px']==[0,0] and not frame['trimmed'] and not frame['rotated'],'full_rect_origin_pivot:'+game)
    check(meta['image']==Path(asset['path']).name,'relative_png_name:'+game)
    for required_id in required[game]:check(required_id in byid and required_id+'.metadata' in byid,'required_page_and_metadata:'+game+':'+required_id)
    records.append({'game':game,'png_bytes':(ROOT/asset['path']).stat().st_size,'metadata_bytes':(ROOT/meta_asset['path']).stat().st_size,'additional_rgba_bytes':size[0]*size[1]*4})
source_report=json.loads((V/'production-render-report.json').read_text())
for record in source_report['records']:
    check(record['actions']==record['dynamic_objects']==record['actual_gate_hurdle_platform_objects']==0,'scenery_only_source_receipt:'+record['game'])
    check(sha(ROOT/record['mother'])==record['mother_sha256'],'source_receipt_matches_actual_mother:'+record['game'])
report={'status':'PASS' if not errors else 'FAIL','scope':'Actual PNG/hash/atlas/source/compatibility checks; integrated visual/device/onsite review remains separate','manifest_sha256':sha(current),'previous_manifest_sha256':PREVIOUS,'checks':checks,'errors':errors,'backgrounds':records,'game_texture_base_bytes_including_effects_and_backdrop':{'stack':9437184+2764800,'runner':9437184+1267200,'herd':38797312+2419200},'excludes_from_texture_total':['UI','framebuffer','browser decode copies']}
(V/'runtime-validation-v3.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
if errors:raise SystemExit(1)
