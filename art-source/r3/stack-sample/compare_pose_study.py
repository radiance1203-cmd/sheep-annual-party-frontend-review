from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,hashlib
R=Path.cwd();O=R/'review/r3/stack-sample';rows=[]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
board=Image.new('RGB',(1120,600),'#f6efdf');d=ImageDraw.Draw(board)
samples=[('Prototype',Image.open(R/'design/prototypes/01_stack.png').convert('RGBA').crop((368,355,584,513))),('G4 baseline',Image.open(R/'art-source/r2/r2g/sheep_stack_512.png').convert('RGBA'))]
for label in ['A_folded_loaf','B_deep_crouch']:
 p=O/(label+'_512.png');im=Image.open(p).convert('RGBA');bbox=im.getchannel('A').getbbox();w=bbox[2]-bbox[0];h=bbox[3]-bbox[1];width44=44*w/h
 row=dict(label=label,image=p.relative_to(R).as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),size=[512,512],alpha_bbox_xyxy_exclusive=list(bbox),alpha_bbox_wh=[w,h],max_world_width_at_44_high=round(width44,3),world_height_at_112_wide=round(112*h/w,3),width_over_tray=round(width44/112,4),trim_pivot_bottom_center=[round((256-bbox[0])/w,6),1.0],foot_canvas_px=[(bbox[0]+bbox[2])/2,bbox[3]],legal_max_fails_112=True)
 rows.append(row);samples.append((label,im))
for i,(label,im) in enumerate(samples):
 x=20+i*275;d.text((x,15),label,fill='#463123',font=font)
 if label!='Prototype':im=im.crop(im.getchannel('A').getbbox())
 equal=im.resize((round(im.width*150/im.height),150),Image.Resampling.LANCZOS);board.paste(equal,(x+15,65),equal)
 d.text((x,226),'Equal subject height: 150px',fill='#463123',font=small)
 if label.startswith(('A_','B_')):
  r=next(r for r in rows if r['label']==label);d.text((x,255),f"alpha: {r['alpha_bbox_wh']} px",fill='#463123',font=small);d.text((x,276),f"at h44: w{r['max_world_width_at_44_high']}",fill='#a13527',font=small);d.text((x,297),f"at w112: h{r['world_height_at_112_wide']}",fill='#a13527',font=small)
  # True world pixels: no post-resize after dimensions; 112-wide tray, 44-high legal slot.
  tx=x+55;ty=440;d.rectangle((tx,ty-44,tx+112,ty),outline='#d49c4e',width=1);d.rectangle((tx,ty+1,tx+112,ty+8),fill='#ac7e3b')
  actual=im.resize((round(r['max_world_width_at_44_high']),44),Image.Resampling.LANCZOS);board.paste(actual,(tx+(112-actual.width)//2,ty-44),actual)
  d.text((x,465),'Actual 1 world-unit = 1 pixel',fill='#463123',font=small);d.text((x,486),'Tray112 / layer44 / uniform fit',fill='#463123',font=small)
d.text((20,550),'Legal pose study only. Camera/light fixed; G4 mesh identity kept. Both still conflict with 112 x 44.',fill='#a13527',font=font)
board.save(O/'pose-comparison-board.png')
(O/'pose-measurements.json').write_text(json.dumps(dict(layer44=44,tray112=112,measurement='native512 full alpha>0 bounds; exclusive xyxy; uniformly scaled to h44',candidates=rows,sample_art_accepted=False,production_art_accepted=False),indent=2),encoding='utf-8')
print(json.dumps(rows,indent=2))
