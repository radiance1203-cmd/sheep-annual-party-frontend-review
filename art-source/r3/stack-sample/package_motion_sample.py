"""Lossless native-frame packing for isolated R3 motion sample; no raster repaint."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import math,json,hashlib
R=Path.cwd();O=R/'review/r3/stack-sample';report=json.loads((O/'motion-render-report.json').read_text());ims=[Image.open(R/r['path']).convert('RGBA') for r in report['frames']];bbs=[im.getchannel('A').getbbox() for im in ims]
x0=min(b[0] for b in bbs)-4;y0=min(b[1] for b in bbs)-4;x1=max(b[2] for b in bbs)+4;y1=max(b[3] for b in bbs)+4;cw=math.ceil((x1-x0)/4)*4;ch=math.ceil((y1-y0)/4)*4;common=[x0,y0,x0+cw,y0+ch];cols=5;rows=math.ceil(len(ims)/cols);pw=2**math.ceil(math.log2(cw*cols));ph=2**math.ceil(math.log2(ch*rows));atlas=Image.new('RGBA',(pw,ph));frames={};clips={};pv=report['pivot_native512'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
actual_top=min(b[1] for b in bbs);actual_bottom=max(b[3] for b in bbs);max_h=actual_bottom-actual_top;world_scale=40/max_h
board=Image.new('RGB',(5*220,rows*225+90),'#f6efdf');draw=ImageDraw.Draw(board);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
for i,(row,im,bbox) in enumerate(zip(report['frames'],ims,bbs)):
 name=f"{row['action']}__e__f{row['index']:03d}";x=i%cols*cw;y=i//cols*ch;crop=im.crop(common);atlas.paste(crop,(x,y));w=bbox[2]-bbox[0];h=bbox[3]-bbox[1]
 frames[name]=dict(rect=[x,y,cw,ch],source_size=[512,512],sprite_source_rect=[x0,y0,cw,ch],trimmed=True,rotated=False,pivot_px=[pv[0]-x0,pv[1]-y0],alpha_bbox_source=list(bbox),alpha_bbox_frame=[bbox[0]-x0,bbox[1]-y0,w,h],foot_plane_world_z=row['foot_world_z'],source_sha256=sha(R/row['path']),world_size_at_shared_fit40=[round(w*world_scale,4),round(h*world_scale,4)])
 bx=i%cols*220;by=i//cols*225;draw.text((bx+10,by+8),f"{row['action']} f{row['index']}",font=font,fill='#463123');show=crop.copy();show.thumbnail((196,155));board.paste(show,(bx+10,by+35),show);draw.text((bx+10,by+195),f"alpha{w}x{h} / z{row['foot_world_z']}",font=font,fill='#463123')
for clip in report['clips']:
 clips[clip['name']+'.e']=dict(frames=[n for n in frames if n.startswith(clip['name']+'__')],fps=clip['fps'],loop=clip['loop'])
atlas_path=O/'sheep_stack_A_sample.atlas.png';atlas.save(atlas_path);draw.text((10,rows*225+15),'LIMITED pipeline sample; geometry/art acceptance still blocked; fixed height40 fit.',font=font,fill='#a13527');board.save(O/'motion-contact-sheet.png')
meta=dict(schema_version='atlas-1.0',asset_id='r3.sheep.stack.A.feasibility',image=atlas_path.name,size_px=[pw,ph],camera_id='side_v1',source_frames_native=[512,512],common_trim=common,pivot_source_px=pv,frames=frames,animations=clips,shared_world_fit=dict(max_actor_height=40,source_union_alpha_height=max_h,source_union_alpha_width=max(b[2] for b in bbs)-min(b[0] for b in bbs),world_units_per_source_px=world_scale,layer44_tray112_conflict=True,prototype_width_accepted=False),production_art_accepted=False,sample_art_accepted=False,master=report['master'],master_sha256=report['master_sha256'],missing=report['missing'])
(O/'sheep_stack_A_sample.atlas.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
# Unscaled action playback GIF is review-only; fps metadata above remains authoritative.
seq=[];dur=[]
for clip in report['clips']:
 for r,im in zip(report['frames'],ims):
  if r['action']!=clip['name']:continue
  tile=Image.new('RGB',(360,250),'#f6efdf');dr=ImageDraw.Draw(tile);dr.text((10,10),clip['name'],font=font,fill='#463123');c=im.crop(common);tile.paste(c,(round(180-(pv[0]-x0)),round(200-(pv[1]-y0))),c);dr.line((90,201,270,201),fill='#b58640',width=3);seq.append(tile);dur.append(round(1000/clip['fps']))
seq[0].save(O/'motion-preview.gif',save_all=True,append_images=seq[1:],duration=dur,loop=0,disposal=2)
print(json.dumps(dict(frames=len(frames),atlas=[pw,ph],common_trim=common,pivot=pv,union_alpha_height=max_h,world_width_at40=round(meta['shared_world_fit']['source_union_alpha_width']*world_scale,3),atlas_sha256=sha(atlas_path)),indent=2))

