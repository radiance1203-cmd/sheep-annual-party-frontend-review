"""Publish approved 2x scenery pages without changing any existing asset bytes."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parent.parent;V=ROOT/'art-source/v3';PUB=ROOT/'apps/web/public/assets'
PREVIOUS='c94d522416e41bc9eddf937563bda44bf28d4e217c956bbb030980eba3ff35b7'
CURRENT=PUB/'asset-manifest.v1.json';VERSION='art-1.3.0-visual-repair'
SIZES={'stack':(720,960),'runner':(720,440),'herd':(720,840)}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
assert sha(CURRENT)==PREVIOUS,'Current bytes changed; stop before publishing a different baseline'
previous=json.loads(CURRENT.read_text(encoding='utf-8'))
checks=[]
def check(ok,label):
    checks.append({'check':label,'status':'PASS' if ok else 'FAIL'})
    assert ok,label
for old in previous['assets']:
    if old.get('path') and old.get('sha256'):
        path=ROOT/old['path'];check(path.exists() and sha(path)==old['sha256'],'preexisting_hash:'+old['asset_id'])

manifest=json.loads(CURRENT.read_text(encoding='utf-8'));records=[]
for game,size in SIZES.items():
    source=V/(f'backdrop_{game}_v3.png');image=Image.open(source)
    check(image.size==size and image.mode=='RGBA','actual_2x_rgba:'+game)
    check(image.getchannel('A').getextrema()==(255,255),'fully_opaque_scenery:'+game)
    folder=PUB/'environment';folder.mkdir(exist_ok=True);dest=folder/source.name
    if dest.exists():check(sha(dest)==sha(source),'versioned_target_matches:'+game)
    else:shutil.copyfile(source,dest)
    w,h=size;scene=[w//2,h//2];aid='environment.backdrop.'+game
    metadata={'schema_version':'sheep-atlas-1.0','asset_id':aid,'version':VERSION,'status':'rendered_candidate','image':dest.name,'size_px':[w,h],'scene_size_px':scene,'color_space':'srgb','alpha_mode':'straight','camera_id':'backdrop_'+game+'_v3','source_frame_px':[w,h],'runtime_frame_px':[w,h],'extrusion_px':0,'padding_px':0,'frames':{'backdrop_'+game:{'rect':[0,0,w,h],'source_size':[w,h],'sprite_source_rect':[0,0,w,h],'trimmed':False,'rotated':False,'pivot_px':[0,0],'direction':None}},'animations':{},'source':'art-source/v3/backdrop_'+game+'_v3.blend','production_art_accepted':False,'purpose':'Independent static scenery only; no moving actors, HUD, live platform/hurdles/pickups, or herd gate line'}
    meta=folder/(f'backdrop_{game}_v3.atlas.json');meta.write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
    mother=V/(f'backdrop_{game}_v3.blend')
    for asset_id,path,kind in [(aid,dest,'atlas_image'),(aid+'.metadata',meta,'atlas_metadata'),('master.backdrop.'+game,mother,'blend_source')]:
        record={'asset_id':asset_id,'status':'rendered_candidate','path':path.relative_to(ROOT).as_posix(),'expected_future_path':path.relative_to(ROOT).as_posix() if kind=='blend_source' else 'assets/'+path.relative_to(PUB).as_posix(),'kind':kind,'camera_id':'backdrop_'+game+'_v3','shared_games':[game],'source_id':'original_blender_scenery_20261027','source_path':mother.relative_to(ROOT).as_posix(),'production_art_accepted':False,'spec_ref':'design/asset_specs/VISUAL_REPAIR_V1_SOURCE.md','note':'Root opened 360px scenery preview and allowed production export; final integrated visual review remains separate','bytes':path.stat().st_size,'sha256':sha(path),'version':'3.0.0','license_note':'Original project Blender geometry/materials; no external media incorporated'}
        if kind!='blend_source':record.update(runtime_path='/assets/'+path.relative_to(PUB).as_posix(),canvas_px=[w,h],scene_size_px=scene,frame_count=1,pivot_px=[0,0],animations={})
        manifest['assets'].append(record)
    records.append({'game':game,'asset_id':aid,'pixels':[w,h],'scene_size_px':scene,'png_bytes':dest.stat().st_size,'metadata_bytes':meta.stat().st_size,'rgba_bytes':w*h*4,'sha256':sha(dest),'mother_sha256':sha(mother),'path':dest.relative_to(ROOT).as_posix()})

archive=PUB/'releases'/PREVIOUS/'asset-manifest.v1.json'
if not archive.exists():
    archive.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(CURRENT,archive)
check(sha(archive)==PREVIOUS,'previous_manifest_exact_content_guard')
manifest['art_version']=VERSION
manifest['historical_manifest']={'sha256':PREVIOUS,'runtime_path':'/assets/releases/'+PREVIOUS+'/asset-manifest.v1.json','immutable':True}
manifest['required_atlases_by_game']={
 'stack':['character.sheep.side','environment.side','effects.shared','environment.backdrop.stack'],
 'runner':['character.sheep.side','environment.side','effects.shared','environment.backdrop.runner'],
 'herd':['character.sheep.iso8','character.dog.iso8','environment.iso','effects.shared','environment.backdrop.herd']}
manifest['counts']['rendered_candidate']=sum(a['status']=='rendered_candidate' for a in manifest['assets'])
manifest['counts']['delivered_3d_master_files']=sum(a['kind']=='blend_source' for a in manifest['assets'])
manifest['counts']['delivered_production_atlases']=sum(a['kind']=='atlas_image' for a in manifest['assets'])
manifest['counts']['delivered_scenery_backgrounds']=3
for old in previous['assets']:
    check(next(a for a in manifest['assets'] if a['asset_id']==old['asset_id'])==old,'existing_record_unchanged:'+old['asset_id'])
CURRENT.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
report={'status':'TECHNICAL_PASS_INTEGRATED_VISUAL_PENDING','version':VERSION,'previous_manifest_sha256':PREVIOUS,'manifest_sha256':sha(CURRENT),'checks':checks,'backgrounds':records,'additional_rgba_bytes_by_game':{r['game']:r['rgba_bytes'] for r in records},'total_png_bytes':sum(r['png_bytes'] for r in records),'required_atlases_by_game':manifest['required_atlases_by_game'],'visual_scope':'Separate 3D scenery only; original v2 atlases and four supplied static illustrations byte-identical'}
(V/'backdrop-registration-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
