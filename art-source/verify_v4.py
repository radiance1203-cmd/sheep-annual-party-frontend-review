"""Independent integrity/atlas/old-byte/budget verification, not visual signoff."""
from pathlib import Path
from PIL import Image
from datetime import datetime,timezone
import json,hashlib,math
ROOT=Path(__file__).resolve().parent.parent;V=ROOT/'art-source/v4';PUB=ROOT/'apps/web/public/assets';OUT=ROOT/'output/repair-20261027/art'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def bb(im):return im.getchannel('A').point(lambda a:255 if a else 0).getbbox()
registry=json.loads((V/'manifest-update-records.json').read_text(encoding='utf-8'));checks=[];errors=[];budgets={};atlas_reports=[];stack=[]
def check(ok,label):
    checks.append({'check':label,'status':'PASS' if ok else 'FAIL'})
    if not ok:errors.append(label)
check(len(registry['updates'])==20,'20_complete_registry_records')
by_id={u['asset_id']:u['record'] for u in registry['updates']}
for u in registry['updates']:
    r=u['record'];p=ROOT/r['path'];check(p.exists() and sha(p)==r['sha256'],'future_target_hash:'+u['asset_id']);check(p.stat().st_size==r['bytes'],'target_bytes:'+u['asset_id']);check(r['production_art_accepted'] is False,'acceptance_false:'+u['asset_id'])
    if u['candidate_path']:check(sha(ROOT/u['candidate_path'])==r['sha256'],'candidate_hash:'+u['asset_id'])
    else:check(r['expected_future_path']==r['path'],'native_expected_path:'+u['asset_id'])
for aid in ['character.sheep.side','character.sheep.iso8','character.dog.iso8','environment.side','environment.backdrop.stack','environment.backdrop.runner','environment.backdrop.herd']:
    image_r=by_id[aid];meta_r=by_id[aid+'.metadata'];meta=json.loads((ROOT/meta_r['path']).read_text());im=Image.open(ROOT/image_r['path']).convert('RGBA');im.load()
    check(list(im.size)==meta['size_px']==image_r['canvas_px'],'image_canvas_matches:'+aid);check(meta['camera_id']==image_r['camera_id']==meta_r['camera_id'],'camera_record_matches:'+aid)
    check(meta['production_art_accepted'] is False,'metadata_acceptance_false:'+aid);check(meta['asset_id']==aid,'metadata_id:'+aid)
    rects=[]
    for name,f in meta['frames'].items():
        x,y,w,h=f['rect'];check(x>=0 and y>=0 and x+w<=im.width and y+h<=im.height,'rect_bounds:'+name);check(f['source_size']==[w,h] and f['sprite_source_rect']==[0,0,w,h],'frame_local_size:'+name)
        frame=im.crop((x,y,x+w,y+h));bounds=bb(frame);check(bool(bounds),'frame_nonempty:'+name);rects.append((name,(x,y,x+w,y+h)))
        if '__stack_' in name:
            height=(bounds[3]-bounds[1])*.5;check(height<=37,'stack_height_le37:'+name);stack.append({'frame':name,'alpha1_bbox':bounds,'size64_visible_height':height,'top_relative_to_pivot':(bounds[1]-112)*.5,'bottom_relative_to_pivot':(bounds[3]-112)*.5})
    for i,(name,a) in enumerate(rects):
        for other,b in rects[i+1:]:check(a[2]<=b[0] or b[2]<=a[0] or a[3]<=b[1] or b[3]<=a[1],'no_rect_overlap:'+name+':'+other)
    for key,a in meta['animations'].items():check(all(f in meta['frames'] for f in a['frames']) and a['fps']>0,'animation_members:'+aid+':'+key)
    if aid.startswith('character.'):
        key={'character.sheep.side':'sheep_side','character.sheep.iso8':'sheep_iso8','character.dog.iso8':'dog_iso8'}[aid];old=json.loads((PUB/f'characters/{key}_v2.atlas.json').read_text())
        check(set(old['frames']).issubset(meta['frames']),'all_old_frame_keys:'+aid)
        for name,a in old['animations'].items():check(meta['animations'][name]==a,'old_animation_exact:'+aid+':'+name)
        for name,f in old['frames'].items():check(meta['frames'][name]['pivot_px']==f['pivot_px'] and meta['frames'][name]['direction']==f['direction'],'old_pivot_direction:'+name)
    if aid.startswith('environment.backdrop.'):
        check(im.getchannel('A').getextrema()==(255,255),'opaque_background:'+aid);check(meta['frames']['backdrop_'+aid.rsplit('.',1)[1]]['pivot_px']==[0,0],'background_zero_pivot:'+aid)
        check([n//2 for n in im.size]==meta['scene_size_px'],'background_2x_scene:'+aid)
    budgets[aid]={'decoded_bytes':im.width*im.height*4,'png_bytes':image_r['bytes'],'metadata_bytes':meta_r['bytes']};atlas_reports.append({'asset_id':aid,**budgets[aid],'frames':len(meta['frames']),'pixels':list(im.size)})
check(len(stack)==19,'19_actual_stack_frames')
check(sum(len(json.loads((ROOT/by_id[a+'.metadata']['path']).read_text())['frames']) for a in ['character.sheep.side','character.sheep.iso8','character.dog.iso8'])==273,'273_actual_character_frames')
old_meta=json.loads((PUB/'environment/farm_side_v2.atlas.json').read_text());new_meta=json.loads((PUB/'environment/farm_side_v4.atlas.json').read_text());old_im=Image.open(PUB/'environment/farm_side_v2.png').convert('RGBA');new_im=Image.open(PUB/'environment/farm_side_v4.png').convert('RGBA')
for name,f in old_meta['frames'].items():
    check(new_meta['frames'][name]==f,'old14_prop_metadata_exact:'+name);x,y,w,h=f['rect'];check(old_im.crop((x,y,x+w,y+h)).tobytes()==new_im.crop((x,y,x+w,y+h)).tobytes(),'old14_prop_pixels_exact:'+name)
props=json.loads((V/'prop-frame-mapping.json').read_text())
for p in props:
    name=p['frame'];f=new_meta['frames'][name];x,y,w,h=f['rect'];im=new_im.crop((x,y,x+w,y+h));bounds=bb(im);tw,th=p['uniform_target'];s=min(tw/w,th/h)
    check(s*(bounds[2]-bounds[0])<=tw+1e-6 and s*(bounds[3]-bounds[1])<=th+1e-6,'prop_uniform_inside_target:'+name)
    if name=='hay_tray_thin':check(abs(s*(bounds[2]-bounds[0])-112)<1e-6 and s*(bounds[3]-bounds[1])<=6,'thin_visible_width112_height_le6')
    if 'round' in name:
        cx,cy=f['pivot_px'];radius=w/2;actual=max(math.hypot(i%w+.5-cx,i//w+.5-cy) for i,a in enumerate(im.getchannel('A').getdata()) if a>0);check(actual<=radius,'round_all_alpha_in_rule_circle:'+name)
baseline=json.loads((V/'runtime-baseline-before-copy.json').read_text());check(sha(ROOT/'config/game_rules.v2.1.json')==baseline['rules_sha256'],'rules_bytes_unchanged');check(sha(PUB/'asset-manifest.v1.json')==baseline['manifest_sha256'],'current_manifest_not_modified_by_art')
for r in baseline['records']:check(sha(ROOT/r['path'])==r['sha256'],'old_runtime_bytes_unchanged:'+r['asset_id'])
old=json.loads((OUT.parent/'art-audit/asset-measurements.json').read_text(encoding='utf-8'))
for path,r in old['inputs'].items():
    if path.endswith('.blend'):check(sha(ROOT/path)==r['sha256'],'v2_v3_native_unchanged:'+path)
native=json.loads((V/'native-source-final-receipt.json').read_text());check(len(native['records'])==6,'6_native_sources_inspected')
for r in native['records']:check(sha(ROOT/r['mother'])==r['sha256'],'final_native_receipt_hash:'+r['mother'])
render=json.loads((V/'production-render-all.json').read_text());check(len(render['frames'])==273,'273_native_render_receipts')
for r in render['actors']:check(sha(ROOT/r['mother'])==r['sha256'],'character_source_render_hash:'+r['actor'])
active=json.loads((PUB/'asset-manifest.v1.json').read_text(encoding='utf-8'));active_by={a['asset_id']:a for a in active['assets']};active_by.update(by_id)
games={};required=active['required_atlases_by_game']
for game,ids in required.items():
    total_decoded=0;total_transfer=0
    for aid in ids:
        image_record=active_by[aid];meta_record=active_by[aid+'.metadata'];image=Image.open(ROOT/image_record['path']);total_decoded+=image.width*image.height*4;total_transfer+=image_record['bytes']+meta_record['bytes']
    games[game]={'texture_base_bytes':total_decoded,'atlas_transfer_bytes':total_transfer};check(total_decoded<=64*1024*1024,'texture_budget64MiB:'+game);check(total_transfer<=8*1024*1024,'atlas_transfer_budget8MiB:'+game)
result={'status':'TECHNICAL_PASS_VISUAL_REVIEW_PENDING' if not errors else 'FAIL','at_utc':datetime.now(timezone.utc).isoformat(),'production_art_accepted':False,'visual_status':'REVIEW','real_device':'NOT_RUN','human_signoff':False,'errors':errors,'checks':checks,'character_frames':273,'stack_frames':stack,'max_stack_size64_alpha1_height':max(r['size64_visible_height'] for r in stack),'props':props,'atlases':atlas_reports,'game_budgets':games,'rules_sha256':baseline['rules_sha256'],'manifest_sha256_before_root_registration':baseline['manifest_sha256'],'registry_sha256':sha(V/'manifest-update-records.json'),'registered_resource_write_freeze':True,'scope':'Actual file/hash/frame/pivot/budget/native-source integrity. Does not establish visual, motion, phone, human difficulty or onsite acceptance.'}
for p in [V/'atlas-validation-v4.json',OUT/'atlas-validation-v4.json']:p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':result['status'],'checks':len(checks),'errors':errors,'max_stack_height':result['max_stack_size64_alpha1_height'],'game_budgets':games},ensure_ascii=False));raise SystemExit(0 if not errors else 1)
