"""Finite sample atlas packaging. Native PNGs immutable, stack lossless; other actors existing 256->128 mapping."""
from PIL import Image,ImageDraw,ImageFont,ImageChops
from pathlib import Path
import json,math,hashlib
R=Path.cwd();O=R/'review/r3/a-window-20261028/materials';report=json.loads((O/'render-report.json').read_text());old=json.loads((R/'review/r3/stack-sample/sheep_stack_A_sample.atlas.json').read_text());SHA=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();results=[]
FONT=ImageFont.truetype('arial.ttf',14)
for plan in ['sheep_stack','sheep_side','sheep_iso8','dog_iso8']:
 rows=[r for r in report['frames'] if r['plan']==plan];stack=plan=='sheep_stack';common=[168,130,360,266] if stack else ([128,32,384,288] if plan=='sheep_side' else [128,60,384,316]);cw,ch=(192,136) if stack else (128,128);pivot=[88,130] if stack else ([64,112] if plan=='sheep_side' else [64,98]);cols=5 if stack else 4;aw=2**math.ceil(math.log2(cols*(cw+8)));ah=2**math.ceil(math.log2(math.ceil(len(rows)/cols)*(ch+8)));atlas=Image.new('RGBA',(aw,ah));frames={};animations={};bbs=[];source_bbs=[];verify=[]
 for k,row in enumerate(rows):
  src=Image.open(R/row['path']).convert('RGBA');assert src.size==(512,512);assert SHA(R/row['path'])==row['sha256'];bb=src.getchannel('A').getbbox();source_bbs.append(bb);crop=src.crop(common);lossless=stack
  if not stack:crop=crop.resize((128,128),Image.Resampling.LANCZOS)
  bbox=crop.getchannel('A').getbbox();bbs.append(bbox);x=(k%cols)*(cw+8)+4;y=(k//cols)*(ch+8)+4;atlas.paste(crop,(x,y));name=(row['clip'] if stack else plan+'__'+row['clip'])+'__'+row['direction']+f"__f{row['index']:03d}";key=row['clip']+'.'+row['direction']
  frames[name]=dict(rect=[x,y,cw,ch],source_size=[512,512] if stack else [128,128],sprite_source_rect=[common[0],common[1],cw,ch] if stack else [0,0,128,128],trimmed=stack,rotated=False,pivot_px=pivot,source_png=row['path'],source_sha256=row['sha256'],alpha_bbox_source=list(bb),alpha_bbox_frame=list(bbox),native_frame_index=row['index'])
  if key not in animations:animations[key]=dict(frames=[],fps=8 if row['clip']=='idle' else (6 if row['clip'] in ['run','walk'] else 12),loop=row['clip'] not in ['stack_steady','bark'],limited_sample=not stack)
  animations[key]['frames'].append(name)
  if stack:
   oc=old['animations'][key];animations[key].update(fps=oc['fps'],loop=oc['loop'],limited_sample=True)
  verify.append((name,crop))
 if not stack:
  legacy=json.loads((R/('apps/web/public/assets/characters/'+plan+'_v4.atlas.json')).read_text())
  for key,a in animations.items():
   olda=legacy['animations'][key];sample_refs=a['frames'].copy();n=len(olda['frames']);a['frames']=[sample_refs[min(len(sample_refs)-1,i*len(sample_refs)//n)] for i in range(n)];a['fps']=olda['fps'];a['loop']=olda['loop'];a['source_sample_refs']=sample_refs;a['legacy_slot_count']=n;a['legacy_cycle_ms']=n/olda['fps']*1000;a['limited_pose_only']=key.startswith('bark.');a['motion_coverage']='finite key poses held across original timing slots; not full original motion'
 dest=O/(plan+'_materials_A.png');atlas.save(dest);readback=Image.open(dest).convert('RGBA')
 for name,crop in verify:
  x,y,w,h=frames[name]['rect'];assert ImageChops.difference(readback.crop((x,y,x+w,y+h)),crop).getbbox() is None
 union=[min(b[0] for b in source_bbs),min(b[1] for b in source_bbs),max(b[2] for b in source_bbs),max(b[3] for b in source_bbs)];fit=[union[2]-union[0],union[3]-union[1]];outside=any(b[0]<common[0] or b[1]<common[1] or b[2]>common[2] or b[3]>common[3] for b in source_bbs)
 data=dict(schema_version='sheep-atlas-1.0',asset_id=plan+'.materials.A.finite',image=dest.name,size_px=[aw,ah],color_space='srgb',alpha_mode='straight',camera_id=rows[0]['camera']['name'],source_frame_px=[512,512],runtime_frame_px=[cw,ch],common_trim=common,pivot_px=pivot,frames=frames,animations=animations,source_union_alpha=union,source_union_size=fit,crop_overflow=outside,native_pngs_preserved=True,stack_pixels_lossless=stack,nonstack_resample='existing 256 crop to128 LANCZOS' if not stack else None,foot_note='same old safe foot source(256,260), crop pivot(88,130)' if stack else 'legacy render_plan pivot and crop retained; source floor projection recorded per frame in render-report.json',production_art_accepted=False,sample_art_accepted=False,coverage='Only listed animation keys and enumerated frame indices. Other actions/directions remain old v4; finite samples are not full animation production.',master=next(m for m in report['masters'] if m['actor']==('stack' if stack else ('dog' if plan=='dog_iso8' else 'sheep'))))
 (O/(plan+'_materials_A.atlas.json')).write_text(json.dumps(data,indent=2),encoding='utf-8');results.append(dict(plan=plan,frames=len(frames),size=[aw,ah],source_union_alpha=union,source_union_size=fit,crop_overflow=outside,atlas_sha256=SHA(dest),metadata_sha256=SHA(O/(plan+'_materials_A.atlas.json'))))
# Native sample pairs; no retouch. Transparent sprites composited over a neutral board for inspection only.
board=Image.new('RGB',(1200,760),'#f4ebd9');dr=ImageDraw.Draw(board)
for k,row in enumerate(report['frames']):
 if row['index']!=0 or row['clip'] not in ['stack_idle','idle']:continue
 # Select one stack/side plus two sheep/dog views: total6 native-scale crops.
 slot=sum(1 for v in report['frames'][:k] if v['index']==0 and v['clip'] in ['stack_idle','idle']);x=(slot%3)*400;y=(slot//3)*360;im=Image.open(R/row['path']).convert('RGBA');bb=im.getchannel('A').getbbox();crop=im.crop((bb[0]-8,bb[1]-8,bb[2]+8,bb[3]+8));board.paste(crop,(x+30,y+55),crop);dr.text((x+18,y+18),row['plan']+' / '+row['direction']+' / '+row['clip'],font=FONT,fill='#503729');dr.text((x+18,y+310),'Native512 crop; finite material sample',font=FONT,fill='#503729')
board.save(O/'native-contact-sheet.png');
summary=dict(art_status='PARTIAL / reference material not passed',frames=len(report['frames']),render_seconds=round(sum(r['seconds'] for r in report['frames']),3),verified_source_hashes=all(SHA(R/m['source'])==m['source_sha256'] for m in report['masters']),geometry_animation_camera_changes=False,particle_counts_unchanged=True,atlases=results,first_refinement='reduced sheen on wool/scarf/dog to remove washout; direction override technical correction uses delta rotation with unchanged existing actions',remaining=['Wool shape and individual fur bundles still differ from reference; material is not final plush quality.','Dog remains smooth large surfaces despite short existing fibers/normal texture; brown/cream identity improves only partly.','No new full8direction production.','Existing inherited scale curves retained unchanged as instructed; frame scale values are in render report.','All unlisted action/direction keys remain v4.'],sample_art_accepted=False,production_art_accepted=False)
(O/'verification.json').write_text(json.dumps(summary,indent=2),encoding='utf-8');print(json.dumps(summary,indent=2))
