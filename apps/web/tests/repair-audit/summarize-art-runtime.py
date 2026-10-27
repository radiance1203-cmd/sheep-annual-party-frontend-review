"""Deterministic contact sheets and conservative alpha geometry, no asset edits."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,math,hashlib,sys
root=Path('.')
base=root/'output/repair-20261027/audit/art-runtime'
batch=base/'v4-final'
out=base/sys.argv[1] if len(sys.argv)>1 else batch/'contact-sheets';out.mkdir(parents=True,exist_ok=True)
capture=json.loads((batch/'captures.json').read_text(encoding='utf-8'))
rows=capture['captures']
extra_path=base/'v4-bark-active/captures.json'
if extra_path.exists():rows+=json.loads(extra_path.read_text(encoding='utf-8'))['captures']
latest_runner=base/'v4-runner-grass-front/captures.json'
if latest_runner.exists():rows=[r for r in rows if r['game']!='runner']+json.loads(latest_runner.read_text(encoding='utf-8'))['captures']
font_path=Path('C:/Windows/Fonts/arial.ttf')
font=ImageFont.truetype(str(font_path),13) if font_path.exists() else ImageFont.load_default()
titlefont=ImageFont.truetype(str(font_path),18) if font_path.exists() else font
index=[]
def crop(item,box=None,geometry=False):
 path=item['geometryPath'] if geometry and item.get('geometryPath') else item['path'];im=Image.open(root/path).convert('RGB')
 c=item['metrics']['canvas']['rect'];world=item['metrics']['world'];sx=c['width']/world['width'];sy=c['height']/world['height']
 if box is None:box=(0,0,world['width'],world['height'])
 x,y,w,h=box;left=max(c['left'],c['left']+x*sx);top=max(c['top'],c['top']+y*sy);right=min(c['right'],c['left']+(x+w)*sx);bottom=min(c['bottom'],c['top']+(y+h)*sy)
 return im.crop((math.floor(left),math.floor(top),math.ceil(right),math.ceil(bottom)))
def sheet(name,items,width=180,height=260,cols=6,boxfn=None,geometry=False):
 if not items:return
 pad=10;heading=50;labelh=43;countrows=math.ceil(len(items)/cols)
 result=Image.new('RGB',(cols*(width+pad)+pad,heading+countrows*(height+labelh+pad)+pad),'#f6f0e3');draw=ImageDraw.Draw(result);draw.text((pad,10),name,fill='#33251a',font=titlefont);draw.text((pad,32),'Actual production renderer, synthetic core replay. Uniform thumbnail scaling; original frames retained.',fill='#654d35',font=font)
 used=[]
 for i,item in enumerate(items):
  part=crop(item,boxfn(item) if boxfn else None,geometry);scale=min(width/part.width,height/part.height);part=part.resize((max(1,round(part.width*scale)),max(1,round(part.height*scale))),Image.Resampling.NEAREST if scale>1 else Image.Resampling.LANCZOS);x=pad+(i%cols)*(width+pad);y=heading+(i//cols)*(height+labelh+pad)
  result.paste(part,(x+(width-part.width)//2,y));draw.text((x,y+height+3),item['id'][:30],fill='#221a15',font=font);draw.text((x,y+height+20),f"t{item['tick']}  view:{item['viewHash'][:10]}",fill='#654d35',font=font);used.append({'case':item['id'],'tick':item['tick'],'source':item['geometryPath'] if geometry and item.get('geometryPath') else item['path'],'viewHash':item['viewHash']})
 path=out/(name+'.png');result.save(path);index.append({'sheet':str(path),'cases':used,'note':'Contact layout only. No redrawing/retouching or change to game content.'})
v390=[r for r in rows if r['viewport']=={'width':390,'height':844}]
for layer in [1,4,8,20]:
 items=sorted([r for r in v390 if r['game']=='stack' and r['features'].get('targetLayer')==layer],key=lambda r:r['tick'])
 sheet(f'stack-{layer}-all-phase-every-tick-390',items,width=160,height=220,cols=8)
def stack_box(r):
 v=r['metrics']['view'];y=v['top_support']['center']['y_u']/1000;camera=max(0,480*.42+8-y);return(30,max(0,y+camera-92),300,160)
sheet('stack-1-4-8-20-plate-contacts-390',[r for r in v390 if r['id'] in ['stack-1-layers','stack-4-layers','stack-8-layers','stack-20-layers']],width=300,height=180,cols=4,boxfn=stack_box)
def prop_box(r):
 v=r['metrics']['view'];f=r['features']
 if 'obstacleWidth'in f:
  o=next(o for o in v['obstacles']if o['bounds']['max_x_u']-o['bounds']['min_x_u']==f['obstacleWidth']*1000 and 160000<=o['bounds']['min_x_u']<=280000);b=o['bounds'];return(b['min_x_u']/1000-12,b['min_y_u']/1000-10,f['obstacleWidth']+24,50)
 g=next(g for g in v['grass']if g['grass_id']==f['grassId']);return(g['center']['x_u']/1000-15,g['center']['y_u']/1000-15,30,30)
props=[r for r in v390 if 'obstacleWidth'in r['features'] or 'grassId'in r['features']]
sheet('runner-real-props-and-three-grass-states-390',props,width=220,height=220,cols=3,boxfn=prop_box)
sheet('runner-props-core-AABB-radius-overlay-390',props,width=220,height=220,cols=3,boxfn=prop_box,geometry=True)
def dog_box(r):
 p=r['metrics']['view']['dog']['center'];return(p['x_u']/1000-50,p['y_u']/1000-65,100,100)
sheet('herd-eight-directions-walk-dog-crops-390',[r for r in v390 if r['id'].startswith('herd-direction')and r['id'].endswith('-walk')],width=160,height=180,cols=4,boxfn=dog_box)
sheet('herd-eight-directions-bark-dog-crops-390',[r for r in v390 if r['id'].startswith('herd-direction')and r['id'].endswith('-bark')],width=160,height=180,cols=4,boxfn=dog_box)
sheet('herd-eight-directions-bark-active-frame-390',[r for r in v390 if r['id'].startswith('herd-direction')and r['id'].endswith('-bark-active')],width=160,height=180,cols=4,boxfn=dog_box)
sheet('herd-eight-sheep-crowd-entry-terminal-390',[r for r in v390 if r['id']in ['herd-eight-initial','herd-gate-most-crowded','herd-entry-1-before','herd-entry-1-after','herd-golden-terminal']],width=260,height=310,cols=5)
sheet('runner-jump-landing-collision-390',[r for r in v390 if r['id']in ['runner-takeoff','runner-air-apex','runner-landing','runner-collision-before','runner-collision-on']],width=260,height=180,cols=5)
(out/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')

rules=json.loads((root/'config/game_rules.v2.1.json').read_text(encoding='utf-8'))
atlas_path=root/'apps/web/public/assets/environment/farm_side_v4.atlas.json';atlas=json.loads(atlas_path.read_text(encoding='utf-8'));image=Image.open(atlas_path.parent/atlas['image']).convert('RGBA');measurements=[]
specs=[('hay_tray_thin',rules['stack']['tray_width_u']/1000,6,None),('hurdle_narrow',8,30,None),('hurdle_medium',18,30,None),('hurdle_wide',28,30,None),('clover_outer_round',9,9,4.5),('clover_core_round',3,3,1.5)]
for name,bw,bh,radius in specs:
 f=atlas['frames'][name];x,y,w,h=f['rect'];alpha=image.crop((x,y,x+w,y+h)).getchannel('A');bbox=alpha.getbbox();s=min(bw/w,bh/h);ox=(bw-w*s)/2;oy=(bh-h*s)/2
 visible=[ox+bbox[0]*s,oy+bbox[1]*s,ox+bbox[2]*s,oy+bbox[3]*s];inside_box=visible[0]>=-1e-9 and visible[1]>=-1e-9 and visible[2]<=bw+1e-9 and visible[3]<=bh+1e-9
 max_radius=None;inside_circle=None
 if radius is not None:
  maximum=0
  for py in range(h):
   for px in range(w):
    if alpha.getpixel((px,py))>=1:maximum=max(maximum,math.hypot((px+.5-w/2)*s,(py+.5-h/2)*s))
  max_radius=maximum;inside_circle=maximum<=radius+1e-9
 measurements.append({'frame':name,'source_rect':f['rect'],'pivot':f['pivot_px'],'target_box':[bw,bh],'uniform_scale':s,'whole_frame_display':[w*s,h*s],'alpha1_visible_bounds_in_box':visible,'alpha1_visible_size':[visible[2]-visible[0],visible[3]-visible[1]],'inside_frozen_box':inside_box,'authorized_radius':radius,'furthest_alpha1_pixel_center_radius':max_radius,'inside_authorized_circle_pixel_centers':inside_circle})
result={'scope':'Actual registered v4 cropped prop frames, production fitFrame uniform-fit arithmetic. Alpha>=1 box bounds and circular pixel-center containment; does not enlarge collider or pickup radius.','manifestHash':capture['manifestHash'],'atlasSHA256':hashlib.sha256(atlas_path.read_bytes()).hexdigest(),'pngSHA256':hashlib.sha256((atlas_path.parent/atlas['image']).read_bytes()).hexdigest(),'props':measurements,'pass':all(r['inside_frozen_box']and r['inside_authorized_circle_pixel_centers']is not False for r in measurements)}
(base/'v4-prop-alpha-geometry.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'contactSheets':len(index),'propGeometryPass':result['pass'],'props':measurements},ensure_ascii=False))
