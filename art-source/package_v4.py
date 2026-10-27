"""Pack candidates beneath art-source/v4 only. Never modifies current manifest.
Runtime copying remains a separate explicit root-coordinated step.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,math,sys,copy
B=Path(__file__).resolve().parent;ROOT=B.parent;V=B/'v4';PUB=ROOT/'apps/web/public/assets';CAND=V/'runtime-candidates';OUT=ROOT/'output/repair-20261027/art'
CAND.mkdir(exist_ok=True);OUT.mkdir(exist_ok=True);VERSION='art-1.4.0-visual-repair'
FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',12)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def box(im,t=1):return im.getchannel('A').point(lambda a:255 if a>=t else 0).getbbox()
manifest=json.loads((PUB/'asset-manifest.v1.json').read_text(encoding='utf-8'));by_id={a['asset_id']:a for a in manifest['assets']};updates=[];reports=[];checks=[]
def check(ok,label):
    checks.append({'check':label,'status':'PASS' if ok else 'FAIL'})
    if not ok:raise RuntimeError(label)
def metadata_record(aid,path,kind,source,frames,animations=None,size=None,scene_size=None,camera_id=None):
    runtime='/assets/'+path.relative_to(CAND).as_posix();future=PUB/path.relative_to(CAND)
    record=copy.deepcopy(by_id[aid]);record.update(path=future.relative_to(ROOT).as_posix(),runtime_path=runtime,expected_future_path='assets/'+path.relative_to(CAND).as_posix(),bytes=path.stat().st_size,sha256=sha(path),version='4.0.0',source_id='repaired_native_v4_20261027',source_path=source,production_art_accepted=False,frame_count=frames,note='Native v4 rendered candidate; technical validation separate from human visual acceptance')
    if animations is not None:record['animations']=animations
    if size:record['canvas_px']=size
    if scene_size:record['scene_size_px']=scene_size
    if camera_id:record['camera_id']=camera_id
    updates.append({'asset_id':aid,'candidate_path':path.relative_to(ROOT).as_posix(),'record':record})
def add_master(aid,path):
    record=copy.deepcopy(by_id[aid]);record.update(path=path.relative_to(ROOT).as_posix(),expected_future_path=path.relative_to(ROOT).as_posix(),bytes=path.stat().st_size,sha256=sha(path),version='4.0.0',source_id='repaired_native_v4_20261027',source_path=path.relative_to(ROOT).as_posix(),production_art_accepted=False,note='Existing native v2/v3 repaired into separately versioned v4, original sources retained')
    if aid.startswith('master.backdrop.'):record['camera_id']='backdrop_'+aid.rsplit('.',1)[1]+'_v4'
    updates.append({'asset_id':aid,'candidate_path':None,'record':record})
def paste_tile(page,im,x,y):
    page.paste(im,(x,y));w,h=im.size
    for e in [1,2]:
        page.paste(im.crop((0,0,1,h)),(x-e,y));page.paste(im.crop((w-1,0,w,h)),(x+w-1+e,y));page.paste(im.crop((0,0,w,1)),(x,y-e));page.paste(im.crop((0,h-1,w,h)),(x,y+h-1+e))
def write_atlas(key,folder,meta,page,source):
    dest=CAND/folder;dest.mkdir(exist_ok=True);png=dest/(key+'_v4.png');mp=dest/(key+'_v4.atlas.json');page.save(png,optimize=True)
    meta.update(image=png.name,version=VERSION,status='rendered_candidate',production_art_accepted=False,source=source,size_px=list(page.size));mp.write_text(json.dumps(meta,indent=2)+'\n')
    for aid,path,kind in [(meta['asset_id'],png,'atlas_image'),(meta['asset_id']+'.metadata',mp,'atlas_metadata')]:metadata_record(aid,path,kind,source,len(meta['frames']),meta['animations'],list(page.size),meta.get('scene_size_px'),meta['camera_id'])
    reports.append({'asset_id':meta['asset_id'],'candidate':png.relative_to(ROOT).as_posix(),'size_px':list(page.size),'frames':len(meta['frames']),'decoded_bytes':page.width*page.height*4,'png_bytes':png.stat().st_size,'metadata_bytes':mp.stat().st_size,'sha256':sha(png)})

if '--props-only' not in sys.argv and '--backgrounds-only' not in sys.argv:
    plan=json.loads((V/'render-plan-v4.json').read_text())
    for key,p in plan['plans'].items():
        aid={'sheep_side':'character.sheep.side','sheep_iso8':'character.sheep.iso8','dog_iso8':'character.dog.iso8'}[key];old=json.loads((PUB/'characters'/(key+'_v2.atlas.json')).read_text());page=Image.new('RGBA',(1024,1280) if key=='sheep_side' else (2048,2048));frames={};animations={};tiles=[];measured=[]
        dirs=[plan['directions'][0]] if p['camera']=='side_v1' else plan['directions']
        for clip,(count,fps,loop) in p['clips'].items():
            for direction,angle in dirs:
                names=[]
                for i in range(count):
                    name=f'{key}__{clip}__{direction}__f{i:03}';file=V/'renders'/key/(name+'.png');check(file.exists(),'render_exists:'+name);im=Image.open(file).convert('RGBA');check(im.size==(512,512),'raw512:'+name)
                    x0,y0,w,h=plan['crops'][p['camera']];source=im.crop((x0,y0,x0+w,y0+h));im=source.resize((128,128),Image.Resampling.LANCZOS);bb=box(im);check(bool(bb),'nonempty:'+name)
                    check(min(bb[0],bb[1],128-bb[2],128-bb[3])>=4,'source_safe_margin8:'+name)
                    if clip.startswith('stack_'):check((bb[3]-bb[1])*.5<=37,'stack_alpha1_height_lte37:'+name)
                    fdir=V/'frames'/key;fdir.mkdir(parents=True,exist_ok=True);source.save(fdir/(name+'.png'))
                    ix=len(frames);x=ix%(page.width//136)*136+4;y=ix//(page.width//136)*136+4;check(y+132<=page.height,'page_bounds:'+name);paste_tile(page,im,x,y)
                    frames[name]={'rect':[x,y,128,128],'source_size':[128,128],'sprite_source_rect':[0,0,128,128],'trimmed':False,'rotated':False,'pivot_px':p['pivot'],'direction':next(j for j,(d,a) in enumerate(plan['directions']) if d==direction)}
                    names.append(name);tiles.append((name,im));measured.append({'frame':name,'alpha1_bbox':bb,'alpha128_bbox':box(im,128),'pivot_px':p['pivot'],'whole_frame_size_recommendation':64 if 'stack_' in clip else 56 if key=='sheep_side' else 55 if key=='sheep_iso8' else 72})
                animations[clip+'.'+direction]={'frames':names,'fps':fps,'loop':loop}
        check(set(old['frames']).issubset(frames),'all_old_keys:'+key)
        for anim,desc in old['animations'].items():check(animations[anim]==desc,'old_animation_contract:'+key+anim)
        meta=copy.deepcopy(old);meta.update(frames=frames,animations=animations)
        write_atlas(key,'characters',meta,page,'art-source/v4/'+p['actor']+'_master_v4.blend')
        rows=math.ceil(len(tiles)/7);contact=Image.new('RGB',(1176,rows*166),'#f8f0de');draw=ImageDraw.Draw(contact)
        for i,(name,im) in enumerate(tiles):
            x=i%7*168;y=i//7*166;contact.paste(im,(x+20,y),im);draw.text((x+2,y+130),name.replace(key+'__',''),font=FONT,fill='#40372b')
        contact.save(OUT/(key+'_v4_contact.png'));(V/(key+'-measurements.json')).write_text(json.dumps(measured,indent=2)+'\n')
    add_master('master.sheep',V/'sheep_master_v4.blend');add_master('master.dog',V/'dog_master_v4.blend')

if '--characters-only' not in sys.argv and '--backgrounds-only' not in sys.argv:
    meta=json.loads((PUB/'environment/farm_side_v2.atlas.json').read_text());page=Image.open(PUB/'environment/farm_side_v2.png').convert('RGBA');old_page=page.copy();old_frames=copy.deepcopy(meta['frames']);record=json.loads((V/'prop-render-v4.json').read_text());props=[]
    sizes={'hay_tray_thin':(224,12),'hurdle_narrow':(64,240),'hurdle_medium':(144,240),'hurdle_wide':(224,240),'clover_outer_round':(72,72),'clover_core_round':(24,24)}
    x=4;y=280
    for r in record['records']:
        name=r['frame'];raw=Image.open(ROOT/r['raw']).convert('RGBA');bb=box(raw);crop=raw.crop(bb);w,h=sizes[name];slotw=w;canvas=Image.new('RGBA',(w,h));pivot=r['raw_pivot_px']
        if 'clover' in name:
            cx,cy=pivot;data=raw.getchannel('A');points=[(i%raw.width,i//raw.width) for i,a in enumerate(data.getdata()) if a>0];rad=max(math.hypot(px+.5-cx,py+.5-cy) for px,py in points);scale=(w/2-3)/rad
        else:scale=min((w-2)/crop.width,(h-2)/crop.height)
        cw,ch=round(crop.width*scale),round(crop.height*scale);im=crop.resize((cw,ch),Image.Resampling.LANCZOS);left=round(w/2-(pivot[0]-bb[0])*scale) if 'clover' in name else (w-cw)//2;top=round(h/2-(pivot[1]-bb[1])*scale) if 'clover' in name else (h-ch)//2
        canvas.paste(im,(left,top));new_pivot=[round((pivot[0]-bb[0])*scale+left),round((pivot[1]-bb[1])*scale+top)]
        if name=='hay_tray_thin':new_pivot=[w//2,h//2]
        if 'clover' in name:new_pivot=[w//2,h//2]
        fx,fy=x,y
        if name=='hay_tray_thin':
            tight=box(canvas);canvas=canvas.crop(tight);fx+=tight[0];fy+=tight[1];new_pivot=[new_pivot[0]-tight[0],new_pivot[1]-tight[1]];w,h=canvas.size
        paste_tile(page,canvas,fx,fy);frame={'rect':[fx,fy,w,h],'source_size':[w,h],'sprite_source_rect':[0,0,w,h],'trimmed':False,'rotated':False,'pivot_px':new_pivot,'direction':None};meta['frames'][name]=frame
        b1=box(canvas);item={'frame':name,**frame,'alpha1_bbox':b1,'alpha128_bbox':box(canvas,128),'uniform_target':{'hay_tray_thin':[112,6],'hurdle_narrow':[8,30],'hurdle_medium':[18,30],'hurdle_wide':[28,30],'clover_outer_round':[9,9],'clover_core_round':[3,3]}[name]}
        if 'clover' in name:
            radius=w/2;dist=max(math.hypot(i%w+.5-new_pivot[0],i//w+.5-new_pivot[1]) for i,a in enumerate(canvas.getchannel('A').getdata()) if a>0);check(dist<=radius,'clover_all_alpha_in_circle:'+name);item['alpha1_max_radius_px']=dist
        props.append(item);x+=slotw+8
    for name,f in old_frames.items():
        check(meta['frames'][name]==f,'old_prop_frame_metadata_exact:'+name);rx,ry,rw,rh=f['rect'];check(page.crop((rx,ry,rx+rw,ry+rh)).tobytes()==old_page.crop((rx,ry,rx+rw,ry+rh)).tobytes(),'old_prop_pixels_exact:'+name)
    meta['variable_size_additional_frames']=list(sizes);write_atlas('farm_side','environment',meta,page,'art-source/v4/farm_master_v4.blend');add_master('master.farm',V/'farm_master_v4.blend');(V/'prop-frame-mapping.json').write_text(json.dumps(props,indent=2)+'\n')
    contact=Image.new('RGB',(1100,420),'#f8f0de');draw=ImageDraw.Draw(contact)
    for i,p in enumerate(props):
        rx,ry,rw,rh=p['rect'];im=page.crop((rx,ry,rx+rw,ry+rh));im.thumbnail((158,200));ox=i*180+8;contact.paste(im,(ox,35),im);draw.text((ox,250),p['frame'],font=FONT,fill='#40372b');draw.text((ox,275),'rect '+str([rw,rh]),font=FONT,fill='#40372b');draw.text((ox,300),'pivot '+str(p['pivot_px']),font=FONT,fill='#40372b');draw.text((ox,325),'a1 '+str(p['alpha1_bbox']),font=FONT,fill='#40372b')
    contact.save(OUT/'props_v4_native_frames.png')

if '--characters-only' not in sys.argv and '--props-only' not in sys.argv:
    for game,scene_size in [('stack',[360,480]),('runner',[360,220]),('herd',[360,420])]:
        src=V/f'backdrop_{game}_v4.png';im=Image.open(src).convert('RGBA');check(list(im.size)==[n*2 for n in scene_size],'backdrop_2x:'+game);dest=CAND/'environment';dest.mkdir(exist_ok=True);png=dest/src.name
        old=json.loads((PUB/f'environment/backdrop_{game}_v3.atlas.json').read_text());old.update(camera_id='backdrop_'+game+'_v4',source='art-source/v4/backdrop_'+game+'_v4.blend');write_atlas('backdrop_'+game,'environment',old,im,'art-source/v4/backdrop_'+game+'_v4.blend');add_master('master.backdrop.'+game,V/f'backdrop_{game}_v4.blend')

path=V/'manifest-update-records.json';previous=json.loads(path.read_text()) if path.exists() else {'updates':[]};merged={r['asset_id']:r for r in previous['updates']};merged.update({r['asset_id']:r for r in updates})
result={'art_version':VERSION,'production_art_accepted':False,'current_manifest_not_modified':True,'runtime_copy_authorized':False,'updates':list(merged.values()),'note':'Root applies records only after review, public-copy authorization, compatibility/archive and integrity checks.'};path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(V/('packing-'+('characters' if '--characters-only' in sys.argv else 'props' if '--props-only' in sys.argv else 'backgrounds' if '--backgrounds-only' in sys.argv else 'all')+'.json')).write_text(json.dumps({'status':'TECHNICAL_CANDIDATE','checks':checks,'atlases':reports},indent=2)+'\n')
print(json.dumps({'status':'TECHNICAL_CANDIDATE','checks':len(checks),'records_updated':len(updates),'candidate_only':True}))
