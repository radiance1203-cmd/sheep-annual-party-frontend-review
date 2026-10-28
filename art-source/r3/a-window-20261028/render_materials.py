"""Finite A materials window. Preserves source geometry, cameras and animation datablocks."""
import bpy, math, json, hashlib, time,sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
R=Path.cwd();D=R/'art-source/r3/a-window-20261028';O=R/'review/r3/a-window-20261028/materials';FIRST='--first' in sys.argv;REFINE='--refine' in sys.argv
SHA=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
SOURCES={'stack':'art-source/r3/stack-sample/sheep_stack_A_motion_sample.blend','sheep':'art-source/r2/r2g/sheep_master_r2g.blend','dog':'art-source/v4/dog_master_v4.blend'}
rows=[];masters=[]
def shader(name,color,rough=.9,sheen=.4,sub=.06,texture=True,dog=False):
 m=bpy.data.materials[name];nt=m.node_tree;n=nt.nodes;p=n.get('Principled BSDF');m.diffuse_color=(*color,1)
 for link in list(p.inputs['Base Color'].links):nt.links.remove(link)
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.19;p.inputs['Sheen Weight'].default_value=sheen;p.inputs['Sheen Roughness'].default_value=.83;p.inputs['Subsurface Weight'].default_value=sub
 if texture:
  noise=n.new('ShaderNodeTexNoise');noise.name='A20261028 irregular microfibers';noise.inputs['Scale'].default_value=82 if dog else 63;noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.78
  bump=n.new('ShaderNodeBump');bump.name='A20261028 soft fiber normal';bump.inputs['Strength'].default_value=.5 if dog else .46;bump.inputs['Distance'].default_value=.017 if dog else .02;nt.links.new(noise.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs['Normal'],p.inputs['Normal'])
  ramp=n.new('ShaderNodeValToRGB');ramp.name='A20261028 warm fiber scatter';ramp.color_ramp.elements[0].position=.15;ramp.color_ramp.elements[0].color=tuple(v*.68 for v in color)+(1,);ramp.color_ramp.elements[1].position=.85;ramp.color_ramp.elements[1].color=(*color,1);nt.links.new(noise.outputs['Fac'],ramp.inputs[0]);nt.links.new(ramp.outputs[0],p.inputs['Base Color'])
 return m

def materials(actor):
 shader('wool',(1,.94,.79),.95,.30,.09)
 shader('face',(.86,.67,.43),.81,.15,.08,False)
 if 'R2d peach cloth skin with integrated blush' in bpy.data.materials:
  m=bpy.data.materials['R2d peach cloth skin with integrated blush'];p=m.node_tree.nodes.get('Principled BSDF');original=p.inputs['Base Color'].links[0].from_socket if p.inputs['Base Color'].links else None
  p.inputs['Roughness'].default_value=.82;p.inputs['Specular IOR Level'].default_value=.2;p.inputs['Subsurface Weight'].default_value=.07
  if original:
   mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.name='A20261028 beige cloth under integrated blush';mix.blend_type='MIX';mix.inputs[0].default_value=.34;mix.inputs[2].default_value=(.81,.61,.38,1);m.node_tree.links.new(original,mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
  noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=180;b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.2;b.inputs['Distance'].default_value=.003;m.node_tree.links.new(noise.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
 shader('horn',(.69,.36,.12),.52,.10,.03,False)
 shader('scarf',(.78,.022,.01),.86,.12,.02,False)
 m=bpy.data.materials['scarf'];n=m.node_tree.nodes;p=n.get('Principled BSDF');nt=m.node_tree
 tex=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(1,1,1)
 wave=n.new('ShaderNodeTexWave');wave.wave_type='BANDS';wave.bands_direction='DIAGONAL';wave.inputs['Scale'].default_value=145;wave.inputs['Distortion'].default_value=1.3;wave.inputs['Detail'].default_value=2
 nt.links.new(tex.outputs['Generated'],wave.inputs['Vector']);b=n.new('ShaderNodeBump');b.name='A20261028 woven red scarf';b.inputs['Strength'].default_value=.5;b.inputs['Distance'].default_value=.006;nt.links.new(wave.outputs['Color'],b.inputs['Height']);nt.links.new(b.outputs['Normal'],p.inputs['Normal'])
 if actor=='dog':
  shader('dog_brown',(.35,.105,.027),.9,.18,.045,True,True);shader('dog_cream',(.94,.87,.70),.94,.25,.06,True,True)

def setup():
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.use_denoising=True;s.render.resolution_x=s.render.resolution_y=512;s.render.resolution_percentage=100;s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
 prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='CUDA';prefs.get_devices()
 for d in prefs.devices:d.use=d.type=='CUDA'
 s.cycles.device='GPU' if any(d.use for d in prefs.devices) else 'CPU'
 return s,[dict(name=d.name,type=d.type,use=d.use) for d in prefs.devices]

def clear():
 for q in bpy.data.objects:
  if q.animation_data:q.animation_data_clear()

def bind(actor,plan,clip):
 clear();prefix='V4_'+plan+'__'+clip+'__'
 for a in bpy.data.actions:
  if a.name.startswith(prefix):
   q=bpy.data.objects.get(a.name[len(prefix):]);q.animation_data_create();q.animation_data.action=a

def render(actor,clip,direction,i,plan):
 s=bpy.context.scene;o=bpy.data.objects
 if actor=='stack':
  clear();record=next(v for v in json.loads(s['R3_clip_contract']) if v['name']==clip)
  for name,action in record['bindings'].items():o[name].animation_data_create();o[name].animation_data.action=bpy.data.actions[action]
 else:bind(actor,plan,clip)
 if actor!='stack':o[actor+'_root'].delta_rotation_euler=(0,0,0)
 s.frame_set(i+1);bpy.context.view_layer.update()
 if actor!='stack':
  root=o[actor+'_root'];root.delta_rotation_euler.z=math.radians({'e':-90,'n':0,'se':-135}[direction])-root.rotation_euler.z;s.camera=o['side_v1' if plan=='sheep_side' else 'iso8_v1']
 bpy.context.view_layer.update();dest=O/('first' if FIRST else 'frames')/(f'{plan}__{clip}__{direction}__f{i:03d}_512.png');dest.parent.mkdir(parents=True,exist_ok=True);s.render.filepath=str(dest)
 cam=s.camera;anchor=world_to_camera_view(s,cam,Vector((0,0,0)));t=time.time();bpy.ops.render.render(write_still=True)
 rows.append(dict(actor=actor,plan=plan,clip=clip,direction=direction,index=i,path=dest.relative_to(R).as_posix(),sha256=SHA(dest),seconds=round(time.time()-t,3),camera=dict(name=cam.name,location=list(cam.location),rotation=list(cam.rotation_euler),ortho_scale=cam.data.ortho_scale),floor_origin_native512=[anchor.x*512,(1-anchor.y)*512],direction_delta_rotation=list(o['sheep_root' if actor=='stack' else actor+'_root'].delta_rotation_euler),root_scale=list(o['sheep_root' if actor=='stack' else actor+'_root'].scale),body_scale=list(o['sheep_body_ctrl' if actor=='stack' else actor+'_body_ctrl'].scale)))
 (O/('first-progress.json' if FIRST else 'render-progress.json')).write_text(json.dumps(rows,indent=2))

for actor,source in SOURCES.items():
 path=R/source;before=SHA(path);bpy.ops.wm.open_mainfile(filepath=str(path));materials(actor);s,devices=setup()
 candidate=D/(actor+'_materials_A.blend');s['A20261028_materials_only']=True;s['A20261028_original_source']=source;s['A20261028_source_sha256']=before
 bpy.ops.wm.save_as_mainfile(filepath=str(candidate));masters.append(dict(actor=actor,source=source,source_sha256=before,master=candidate.relative_to(R).as_posix(),master_sha256=SHA(candidate),devices=devices,samples=s.cycles.samples))
 if actor=='stack':
  clips=json.loads(s['R3_clip_contract'])
  for c in (clips[:1] if FIRST else clips):
   for i in ([0] if FIRST else range(c['n'])):render(actor,c['name'],'e',i,'sheep_stack')
 elif actor=='sheep':
  for clip,indices in ([('idle',[0])] if FIRST else [('idle',[0]),('run',[0,2])]):
   for i in indices:render(actor,clip,'e',i,'sheep_side')
  for direction in ['n','se']:
   for clip,indices in ([('idle',[0])] if FIRST else [('idle',[0]),('walk',[0,2])]):
    for i in indices:render(actor,clip,direction,i,'sheep_iso8')
 else:
  for direction in ['n','se']:
   for clip,indices in ([('idle',[0])] if FIRST else [('idle',[0]),('walk',[0,2]),('bark',[1])]):
    for i in indices:render(actor,clip,direction,i,'dog_iso8')
 assert before==SHA(path)
(O/('first-report.json' if FIRST else 'render-report.json')).write_text(json.dumps(dict(status='LIMITED_MATERIAL_CANDIDATE_NOT_ACCEPTED',geometry_changes=False,camera_changes=False,animation_changes=False,particle_count_changes=False,masters=masters,frames=rows,explicit_remaining='All other animation keys and directions retain v4; this is not full coverage. Existing inherited scale curves unchanged; enumerate per-frame scale in report.',sample_art_accepted=False,production_art_accepted=False),indent=2))
print('A_MATERIALS_FINITE_COMPLETE',len(rows),flush=True)
