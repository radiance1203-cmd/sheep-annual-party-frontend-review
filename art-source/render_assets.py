"""Original editable toy-farm source; Blender 4.5.9, no external assets.
blender -b --python art-source/render_assets.py -- --preview
blender -b --python art-source/render_assets.py -- --all
"""
import bpy, math, json, sys, random
from pathlib import Path
from mathutils import Vector

BASE=Path(__file__).resolve().parent
OUT=BASE/'renders'
random.seed(5012026)
ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
PREVIEW='--preview' in ARGS
SOURCE_ONLY='--source-only' in ARGS
PLAN={
 'sheep_side': {'actor':'sheep','camera':'side_v1','pivot':[64,112],'clips':{'idle':[6,8,True],'run':[8,12,True],'takeoff':[3,15,False],'air':[2,6,True],'land':[4,20,False],'steady':[3,15,False],'bump':[4,15,False],'celebrate':[8,12,True]}},
 'sheep_iso8': {'actor':'sheep','camera':'iso8_v1','pivot':[64,98],'clips':{'idle':[4,8,True],'walk':[6,12,True],'enter':[3,12,False]}},
 'dog_iso8': {'actor':'dog','camera':'iso8_v1','pivot':[64,98],'clips':{'idle':[4,8,True],'walk':[6,12,True],'bark':[4,12,False]}}
}
DIRS=[('e',-90),('se',-135),('s',180),('sw',135),('w',90),('nw',45),('n',0),('ne',-45)]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name!='Collection': bpy.data.collections.remove(c)
COL={}
for n in ['CHAR_SHEEP','CHAR_DOG','ENV_FARM','RIGS','CAMERAS','LIGHTS']:
 c=bpy.data.collections.new(n);bpy.context.scene.collection.children.link(c);COL[n]=c
def move(o,c):
 for old in list(o.users_collection):old.objects.unlink(o)
 COL[c].objects.link(o)
def mat(name,color,rough=.65,metal=0,bump=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if bump:
  n=m.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=95;n.inputs['Detail'].default_value=2
  b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.16;b.inputs['Distance'].default_value=.022
  m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
 return m
M={n:mat(n,c,r,me,b) for n,c,r,me,b in [
 ('wool',(.88,.83,.70),.92,0,True),('face',(.63,.43,.28),.65,0,False),('horn',(.49,.28,.12),.5,0,False),('hoof',(.12,.057,.027),.48,0,False),('scarf',(.70,.075,.035),.8,0,True),('bell',(.86,.46,.055),.28,.68,False),('eye',(.014,.008,.005),.15,0,False),('nose',(.64,.19,.09),.55,0,False),('dog_brown',(.40,.16,.055),.88,0,True),('dog_cream',(.85,.77,.61),.9,0,True),('wood',(.49,.255,.085),.8,0,True),('hay',(.75,.48,.12),.85,0,True),('grass',(.28,.45,.12),.9,0,True),('soil',(.67,.46,.20),.94,0,True),('roof',(.66,.22,.105),.8,0,False)]}
def empty(name,loc=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);COL['RIGS'].objects.link(o);o.location=loc;o.parent=parent;return o
def ball(name,loc,scale,material,c,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(M[material]);move(o,c)
 for p in o.data.polygons:p.use_smooth=True
 o.parent=parent;return o
def box(name,loc,scale,material,c,parent=None,bevel=.07):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(M[material]);move(o,c);o.parent=parent
 mod=o.modifiers.new('Soft editable edges','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def tube(name,pts,r,material,c,parent=None):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3;cu.resolution_u=16
 sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for p,co in zip(sp.bezier_points,pts):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,cu);COL[c].objects.link(o);o.data.materials.append(M[material]);o.parent=parent;return o
R={};B={};LEGS={};TAIL={}
def create_sheep():
 c='CHAR_SHEEP';root=empty('sheep_root');body=empty('sheep_body_ctrl',parent=root);R['sheep']=root;B['sheep']=body
 ball('body_wool',(0,-.06,.68),(.42,.55,.47),'wool',c,body)
 # Deterministic cloud tufts, large enough to read at 64 CSS px.
 for j in range(5):
  a=-math.pi/2+j*math.pi/4
  for k in range(9):
   t=k*2*math.pi/9+j*.29
   x=.37*math.cos(a)*math.cos(t);y=-.06+.48*math.cos(a)*math.sin(t);z=.68+.40*math.sin(a)
   s=.165+random.random()*.035;ball('body_wool_tuft_%02d_%02d'%(j,k),(x,y,z),(s,s*1.08,s),'wool',c,body)
 head=empty('sheep_head_ctrl',parent=body)
 ball('head_wool',(0,.36,1.05),(.37,.31,.35),'wool',c,head)
 ball('face',(0,.547,1.02),(.284,.205,.285),'face',c,head)
 for i in range(7):
  a=math.pi*i/6;ball('forelock_%02d'%i,(.285*math.cos(a),.57,1.12+.23*math.sin(a)),(.115,.12,.115),'wool',c,head)
 for s in [-1,1]:
  ball('ear_%s'%s,(s*.35,.40,1.05),(.15,.105,.075),'face',c,head)
  pts=[]
  for j in range(14):
   a=.20+j*math.pi*1.55/13;r=.16*(1-j*.025)
   pts.append((s*(.31+.035*math.sin(a)),.365+r*math.sin(a),1.16+r*math.cos(a)))
  tube('horn_curl_%s'%s,pts,.061,'horn',c,head)
  ball('eye_%s'%s,(s*.118,.731,1.08),(.038,.027,.048),'eye',c,head)
  ball('eye_glint_%s'%s,(s*.118-.009,.756,1.095),(.009,.006,.012),'wool',c,head)
 ball('nose',(0,.755,.993),(.038,.023,.025),'nose',c,head)
 for s in [-1,1]:tube('smile_%s'%s,[(0,.751,.975),(s*.025,.751,.948),(s*.055,.741,.97)],.007,'hoof',c,head)
 # Scarf is continuous geometry; the sole bell stays at the front in every direction.
 pts=[(.305*math.cos(i*math.tau/24),.33+.25*math.sin(i*math.tau/24),.80) for i in range(25)]
 tube('scarf_neck',pts,.061,'scarf',c,body)
 scarf=box('scarf_tail',(.13,.55,.66),(.11,.07,.23),'scarf',c,body,.035);scarf.rotation_euler.y=.25
 bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.088,radius2=.042,depth=.12,location=(0,.625,.69));o=bpy.context.object;o.name='bell_single';o.data.materials.append(M['bell']);move(o,c);o.parent=body
 tube('bell_rim',[(.086*math.cos(i*math.tau/24),.625+.086*math.sin(i*math.tau/24),.63) for i in range(25)],.012,'bell',c,body)
 ball('bell_clapper',(0,.625,.622),(.023,.023,.027),'hoof',c,body)
 LEGS['sheep']=[]
 for x in [-.255,.255]:
  for y in [-.32,.29]:
   leg=empty('sheep_leg_%s_%s'%(x,y),(x,y,.37),root);LEGS['sheep'].append(leg)
   ball('leg',(0,0,-.15),(.09,.095,.20),'face',c,leg);ball('hoof',(0,.005,-.295),(.103,.117,.08),'hoof',c,leg)
 TAIL['sheep']=ball('tail',(0,-.625,.70),(.17,.15,.17),'wool',c,body)
 return root
def create_dog():
 c='CHAR_DOG';root=empty('dog_root');body=empty('dog_body_ctrl',parent=root);R['dog']=root;B['dog']=body
 ball('dog_body',(0,-.1,.54),(.26,.48,.29),'dog_brown',c,body)
 ball('dog_chest',(0,.22,.57),(.28,.22,.33),'dog_cream',c,body)
 ball('dog_head',(0,.35,.91),(.245,.24,.25),'dog_brown',c,body)
 ball('dog_muzzle',(0,.56,.84),(.17,.19,.13),'dog_cream',c,body)
 ball('dog_nose',(0,.722,.88),(.065,.038,.047),'eye',c,body)
 ball('dog_blaze',(0,.548,1.01),(.07,.045,.16),'dog_cream',c,body)
 for s in [-1,1]:
  e=ball('dog_ear_%s'%s,(s*.21,.28,1.05),(.12,.13,.23),'hoof',c,body);e.rotation_euler.y=s*.40
  ball('dog_eye_%s'%s,(s*.13,.538,.98),(.031,.021,.039),'eye',c,body)
  ball('dog_glint_%s'%s,(s*.13-.008,.555,.99),(.007,.005,.009),'wool',c,body)
 tube('dog_collar',[(.245*math.cos(i*math.tau/24),.27+.16*math.sin(i*math.tau/24),.68) for i in range(25)],.04,'scarf',c,body)
 LEGS['dog']=[]
 for x in [-.18,.18]:
  for y in [-.36,.28]:
   leg=empty('dog_leg_%s_%s'%(x,y),(x,y,.40),root);LEGS['dog'].append(leg)
   ball('dog_leg',(0,0,-.16),(.065,.07,.20),'dog_brown',c,leg);ball('dog_paw',(0,.025,-.33),(.083,.11,.07),'dog_cream',c,leg)
 TAIL['dog']=ball('dog_tail',(0,-.62,.76),(.11,.25,.12),'dog_cream',c,body);TAIL['dog'].rotation_euler.x=-.7
 return root
def camera(name,loc,scale):
 bpy.ops.object.camera_add(location=loc);o=bpy.context.object;o.name=name;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=scale;move(o,'CAMERAS');return o
CAMS={'side_v1':camera('side_v1',(0,-8,1.4),4),'iso8_v1':camera('iso8_v1',(0,-6,6),32/7)}
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.cycles.device='GPU'
try:
 pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='CUDA';pref.get_devices()
 for d in pref.devices:d.use=d.type=='CUDA'
 if not any(d.use for d in pref.devices):scene.cycles.device='CPU'
except Exception:scene.cycles.device='CPU'
scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8';scene.render.image_settings.compression=70
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0;scene.view_settings.gamma=1
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.8,.75,.65,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35
for name,loc,power,size in [('key',(-3,-4,7),360,5),('fill',(4,-1,4),190,4),('rim',(0,4,5),160,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler();move(o,'LIGHTS')
create_sheep();create_dog()
def show(actor):
 COL['CHAR_SHEEP'].hide_render=actor!='sheep';COL['CHAR_DOG'].hide_render=actor!='dog';COL['ENV_FARM'].hide_render=True
def pose(actor,clip,i,n):
 body=B[actor];t=i/max(n,1);s=math.sin(t*math.tau);body.location=(0,0,0);body.scale=(1,1,1);body.rotation_euler=(0,0,0)
 for leg in LEGS[actor]:leg.rotation_euler=(0,0,0)
 if clip in ['walk','run']:
  body.location.z=.025*(1-math.cos(t*math.tau*2));body.rotation_euler.y=.035*s
  for j,leg in enumerate(LEGS[actor]):leg.rotation_euler.x=.55*math.sin(t*math.tau+(j in [0,3])*math.pi)
 elif clip=='idle':body.scale=(1+.012*s,1+.012*s,1-.010*s)
 elif clip in ['takeoff','land','steady']:
  q=math.sin((i+1)/(n+1)*math.pi);body.scale=(1+.08*q,1+.05*q,1-.12*q);body.location.z=-.025*q
 elif clip=='air':
  body.rotation_euler.x=.09*(1 if i==0 else -1)
  for j,leg in enumerate(LEGS[actor]):leg.rotation_euler.x=.7 if j%2 else -.55
 elif clip=='bump':body.rotation_euler.y=.15*math.sin((i+1)*math.pi*.7);body.rotation_euler.x=.08*s
 elif clip in ['celebrate','enter']:
  body.rotation_euler.y=.09*s;body.location.z=.06*(1-math.cos(t*math.tau))
  for leg in LEGS[actor]:leg.rotation_euler.x=.2*s
 elif clip=='bark':
  body.rotation_euler.x=-.12*math.sin((i+1)*math.pi/(n+1));body.scale=(1,1.04,1.025)
  for j,leg in enumerate(LEGS[actor]):leg.rotation_euler.x=-.15 if j%2 else 0
 if actor=='dog':TAIL[actor].rotation_euler.z=.3*s
def store_actions(actor):
 objs=[B[actor],*LEGS[actor],TAIL[actor]]
 clips=[(key,clip,v) for key,p in PLAN.items() if p['actor']==actor for clip,v in p['clips'].items()]
 for key,clip,(n,fps,loop) in clips:
  for o in objs:o.animation_data_clear()
  for i in range(n):
   pose(actor,clip,i,n)
   for o in objs:
    for prop in ['location','rotation_euler','scale']:o.keyframe_insert(data_path=prop,frame=i+1)
  for o in objs:
   a=o.animation_data.action;a.name=key+'__'+clip+'__'+o.name;a.use_fake_user=True
   o.animation_data_clear()
 pose(actor,'idle',0,4)
for actor in ['sheep','dog']:
 store_actions(actor);show(actor);scene.camera=CAMS['side_v1' if actor=='sheep' else 'iso8_v1'];bpy.ops.wm.save_as_mainfile(filepath=str(BASE/(actor+'_master.blend')))
(BASE/'render_plan.json').write_text(json.dumps({'version':'art-1.1.0','blender':'4.5.9','seed':5012026,'source_frame':[512,512],'crops':{'side_v1':[128,32,256,256],'iso8_v1':[128,60,256,256]},'plans':PLAN,'directions':DIRS},indent=2))
for key,p in PLAN.items():
 if SOURCE_ONLY:continue
 show(p['actor']);scene.camera=CAMS[p['camera']]
 dirs=[DIRS[0]] if p['camera']=='side_v1' else DIRS
 clips={'idle':p['clips']['idle']} if PREVIEW else p['clips']
 for direction,angle in dirs:
  R[p['actor']].rotation_euler.z=math.radians(angle)
  for clip,(n,fps,loop) in clips.items():
   for i in range(1 if PREVIEW else n):
    pose(p['actor'],clip,i,n);dest=OUT/key;dest.mkdir(parents=True,exist_ok=True)
    scene.render.filepath=str(dest/('%s__%s__%s__f%03d.png'%(key,clip,direction,i)));bpy.ops.render.render(write_still=True)
print('CHARACTER_RENDER_COMPLETE')
ENV={}
def prop(name):
 root=empty(name+'_root');ENV[name]=root;return root
r=prop('hay_tray');box('hay_tray',(0,0,.10),(1.5,.60,.20),'hay','ENV_FARM',r,.08)
for x in [-.5,0,.5]:tube('hay_binding',[(x,-.31,.04),(x,-.32,.19),(x,0,.23),(x,.32,.19),(x,.31,.04)],.016,'wood','ENV_FARM',r)
r=prop('fence_segment')
for x in [-.65,.65]:box('fence_post',(x,0,.46),(.13,.14,.92),'wood','ENV_FARM',r,.035)
for z in [.30,.64]:box('fence_rail',(0,.015,z),(1.4,.10,.13),'wood','ENV_FARM',r,.035)
r=prop('hurdle')
for x in [-.48,.48]:box('hurdle_post',(x,0,.34),(.14,.15,.68),'wood','ENV_FARM',r,.03)
box('hurdle_bar',(0,0,.53),(.90,.10,.17),'wool','ENV_FARM',r,.025)
for x in [-.30,0,.30]:box('hurdle_stripe',(x,-.058,.53),(.14,.016,.17),'scarf','ENV_FARM',r,.009)
r=prop('clover_outer')
for x,y in [(-.16,0),(.16,0),(0,.16),(0,-.16)]:ball('clover_leaf',(x,y,.28),(.20,.20,.07),'grass','ENV_FARM',r)
tube('clover_stalk',[(0,0,.1),(0,0,.28)],.024,'grass','ENV_FARM',r)
r=prop('clover_core');ball('clover_gold_core',(0,0,.28),(.10,.10,.10),'bell','ENV_FARM',r)
r=prop('grass_tile');box('grass_ground',(0,0,.025),(1.05,1.05,.05),'grass','ENV_FARM',r,.035)
for i in range(18):
 x=random.uniform(-.46,.46);y=random.uniform(-.46,.46)
 tube('grass_blade',[(x,y,.04),(x+.03,y,.15),(x+.05,y,.16)],.012,'grass','ENV_FARM',r)
r=prop('dirt_tile');box('dirt_ground',(0,0,.024),(1.05,1.05,.048),'soil','ENV_FARM',r,.04)
r=prop('barn');box('barn_body',(0,0,.45),(.85,.75,.9),'roof','ENV_FARM',r,.045)
box('barn_door',(0,-.392,.27),(.38,.025,.52),'hoof','ENV_FARM',r,.01)
for x in [-.23,.23]:box('barn_door_frame',(x,-.41,.28),(.045,.035,.55),'wool','ENV_FARM',r,.01)
for s in [-1,1]:
 o=box('barn_roof',(s*.235,0,1.0),(.61,.92,.08),'roof','ENV_FARM',r,.02);o.rotation_euler.y=s*.55
box('barn_lintel',(0,-.41,.56),(.5,.04,.05),'wool','ENV_FARM',r,.01)
r=prop('gate_marker')
pts=[(-.28,0,.012),(0,.34,.012),(.28,0,.012),(.12,0,.012),(.12,-.28,.012),(-.12,-.28,.012),(-.12,0,.012),(-.28,0,.012)]
tube('gate_arrow',pts,.032,'bell','ENV_FARM',r)
r=prop('flower')
for j in range(5):
 a=j*math.tau/5;ball('flower_petal',(.12*math.cos(a),.12*math.sin(a),.15),(.095,.065,.04),'wool','ENV_FARM',r)
ball('flower_center',(0,0,.18),(.07,.07,.04),'bell','ENV_FARM',r)
# Separate contact shadow: no shadow baked into any character frame.
r=prop('shadow_contact');bpy.ops.mesh.primitive_plane_add(size=1,location=(0,0,.004));o=bpy.context.object;o.name='contact_shadow_plane';o.scale=(.85,.65,1);o.parent=r;move(o,'ENV_FARM')
sm=bpy.data.materials.new('shadow_soft_alpha');sm.use_nodes=True;nodes=sm.node_tree.nodes;nodes.clear();links=sm.node_tree.links
tex=nodes.new('ShaderNodeTexCoord');sub=nodes.new('ShaderNodeVectorMath');sub.operation='SUBTRACT';sub.inputs[1].default_value=(.5,.5,0);links.new(tex.outputs['UV'],sub.inputs[0])
leng=nodes.new('ShaderNodeVectorMath');leng.operation='LENGTH';links.new(sub.outputs[0],leng.inputs[0]);ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.05;ramp.color_ramp.elements[0].color=(.27,.27,.27,1);ramp.color_ramp.elements[1].position=.5;ramp.color_ramp.elements[1].color=(0,0,0,1);links.new(leng.outputs['Value'],ramp.inputs[0])
tr=nodes.new('ShaderNodeBsdfTransparent');em=nodes.new('ShaderNodeEmission');em.inputs[0].default_value=(.13,.07,.025,1);mix=nodes.new('ShaderNodeMixShader');links.new(ramp.outputs[0],mix.inputs[0]);links.new(tr.outputs[0],mix.inputs[1]);links.new(em.outputs[0],mix.inputs[2]);out=nodes.new('ShaderNodeOutputMaterial');links.new(mix.outputs[0],out.inputs[0]);o.data.materials.append(sm)
def env_show(name):
 COL['CHAR_SHEEP'].hide_render=COL['CHAR_DOG'].hide_render=True;COL['ENV_FARM'].hide_render=False
 for key,root in ENV.items():
  for child in root.children:child.hide_render=key!=name
env_show('barn');scene.camera=CAMS['iso8_v1'];bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'farm_master.blend'))
for cam,key in [('side_v1','farm_side'),('iso8_v1','farm_iso')]:
 if SOURCE_ONLY:continue
 scene.camera=CAMS[cam]
 for name in ENV:
  env_show(name);dest=OUT/key;dest.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(dest/(name+'.png'));bpy.ops.render.render(write_still=True)
# Visible, text-free feedback geometry is optional presentation, never rule state.
for child in list(COL['ENV_FARM'].objects):child.hide_render=True
VFX={}
for name in ['sparkle','dust','bark_wave','entry_ring','confetti']:
 start=set(bpy.data.objects)
 if name=='sparkle':
  tube(name,[(-.24,0,.4),(0,0,.48),(.08,0,.72),(.16,0,.48),(.4,0,.4),(.16,0,.32),(.08,0,.08),(0,0,.32),(-.24,0,.4)],.024,'bell','ENV_FARM')
 elif name=='dust':
  for i in range(6):ball('dust_%s'%i,((i-2.5)*.13,0,.10+random.random()*.2),(.1,.065,.075),'soil','ENV_FARM')
 elif name=='bark_wave':
  for r in [.25,.42,.59]:tube('bark_wave',[(r*math.cos(a),0,.38+r*math.sin(a)) for a in [-.6,-.3,0,.3,.6]],.022,'bell','ENV_FARM')
 elif name=='entry_ring':tube('entry_ring',[(.5*math.cos(i*math.tau/32),.5*math.sin(i*math.tau/32),.03) for i in range(33)],.028,'bell','ENV_FARM')
 else:
  for i in range(7):
   o=box('confetti',(random.uniform(-.45,.45),0,random.uniform(.1,1.0)),(.08,.025,.13),'scarf' if i%2 else 'bell','ENV_FARM',bevel=.01);o.rotation_euler.y=random.random()*2
 VFX[name]=list(set(bpy.data.objects)-start)
 for o in VFX[name]:o.hide_render=True
scene.camera=CAMS['iso8_v1']
for name,objs in VFX.items():
 if SOURCE_ONLY:continue
 for o in objs:o.hide_render=False
 dest=OUT/'shared';dest.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(dest/(name+'.png'));bpy.ops.render.render(write_still=True)
 for o in objs:o.hide_render=True
env_show('barn');bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'farm_master.blend'))
print('SOURCE_COMPLETE' if SOURCE_ONLY else 'ALL_RENDER_COMPLETE')
