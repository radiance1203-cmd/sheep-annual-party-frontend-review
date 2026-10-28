"""Four-action limited stack feasibility sample; run only after root v2 collar selection."""
import bpy,json,math,hashlib,time
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
R=Path.cwd();D=R/'art-source/r3/stack-sample';O=R/'review/r3/stack-sample';F=O/'frames';F.mkdir(exist_ok=True)
SRC=D/'A_collar_v2.blend';MOTHER=R/'art-source/r2/r2g/sheep_master_r2g.blend';MH=hashlib.sha256(MOTHER.read_bytes()).hexdigest();bpy.ops.wm.open_mainfile(filepath=str(SRC));o=bpy.data.objects;s=bpy.context.scene
bpy.context.view_layer.update()
bell_group=bpy.data.objects.new('R3_bell_ctrl',None);s.collection.objects.link(bell_group);bell_group.parent=o['sheep_head_ctrl'];bell_group.location=o['bell_single'].location.copy();bpy.context.view_layer.update()
for n in ['bell_single','bell_rim','bell_clapper']:
 q=o[n];world=q.matrix_world.copy();q.parent=bell_group;q.matrix_world=world
CTRL=['R3_bell_ctrl','sheep_root','sheep_body_ctrl','sheep_head_ctrl','scarf_neck','scarf_tail','bell_single','bell_rim','bell_clapper','ear_-1','ear_1','eye_-1','eye_1','eye_glint_-1','eye_glint_1']+[q.name for q in o if q.name.startswith('sheep_leg_')]
base={n:{'location':o[n].location.copy(),'rotation_euler':o[n].rotation_euler.copy(),'scale':o[n].scale.copy()} for n in CTRL}
for q in o:
 if q.animation_data:q.animation_data_clear()
# Anchor world ground at the existing neutral pose lowest rendered MESH point.
bpy.context.view_layer.update()
visible=[q for q in o if q.type=='MESH' and not q.hide_render and q.name.startswith(('R2g_welded','R2d_face','R2e_horn','leg_','hoof_'))]
# Actual sheep hierarchy membership excludes all unrelated scene objects.
def is_sheep(q):
 while q is not None:
  if q.name=='sheep_root':return True
  q=q.parent
 return False
visible=[q for q in o if q.type=='MESH' and not q.hide_render and is_sheep(q)]
def minimum_z():
 bpy.context.view_layer.update()
 return min((q.matrix_world@Vector(v)).z for q in visible for v in q.bound_box)
base_floor=minimum_z();base['sheep_root']['location'].z-=base_floor
# Same camera projects the immutable floor origin to a constant pivot.
anchor=world_to_camera_view(s,s.camera,Vector((0,0,0)));pivot=[anchor.x*512,(1-anchor.y)*512]
CLIPS=[dict(name='stack_idle',fps=8,loop=True,n=4),dict(name='stack_air',fps=6,loop=True,n=2),dict(name='stack_steady',fps=15,loop=False,n=4),dict(name='stack_celebrate',fps=12,loop=True,n=4)]
rows=[];action_records=[]
def reset():
 for n in CTRL:
  q=o[n]
  for attr,value in base[n].items():setattr(q,attr,value.copy())
def pose(name,i):
 reset();body=o['sheep_body_ctrl'];head=o['sheep_head_ctrl'];tail=o['scarf_tail'];phase=i/math.tau
 if name=='stack_idle':
  phase=i/4*math.tau;body.scale*=1+.008*math.sin(phase);head.rotation_euler.x+=.016*math.sin(phase)
  if i==2:
   for n in ['eye_-1','eye_1','eye_glint_-1','eye_glint_1']:o[n].scale.z*=.12
  tail.rotation_euler.x+=.07*math.sin(phase);o['R3_bell_ctrl'].rotation_euler.x+=.05*math.sin(phase)
 elif name=='stack_air':
  head.location.z+=.022 if i==0 else .01;head.rotation_euler.x+=.05 if i==0 else -.02
  for q in o:
   if q.name.startswith('sheep_leg_'):q.rotation_euler.x*=.82 if i==0 else .88
  tail.rotation_euler.x+=.18 if i==0 else .1
 elif name=='stack_steady':
  crouch=[.055,.025,-.015,0][i];head.location.z-=crouch;body.rotation_euler.x+=[.045,.02,-.012,0][i]
  for q in o:
   if q.name.startswith('sheep_leg_'):q.rotation_euler.x*=1+[.12,.05,-.025,0][i]
  tail.rotation_euler.x+=[-.22,.15,-.07,0][i]
  o['R3_bell_ctrl'].rotation_euler.x+=[-.10,.08,-.04,0][i]
 elif name=='stack_celebrate':
  phase=i/4*math.tau;head.rotation_euler.y+=.12*math.sin(phase);head.location.z+=.025*(1+math.sin(phase));body.rotation_euler.z+=.035*math.sin(phase)
  for n in ['ear_-1','ear_1']:o[n].rotation_euler.y+=.2*math.sin(phase)
  for q in o:
   if q.name.startswith('sheep_leg_') and q.location.y>0:q.rotation_euler.x*=.92+.06*math.sin(phase)
  tail.rotation_euler.x+=.18*math.sin(phase)
 # Fixed physical floor; use root translation only, never anisotropic whole-model scale.
 o['sheep_root'].location.z-=minimum_z()
 for n in CTRL:
  q=o[n]
  assert len({round(v,6) for v in o['sheep_root'].scale})==1
  for attr in ['location','rotation_euler','scale']:q.keyframe_insert(data_path=attr,frame=i+1,group=n)
for clip in CLIPS:
 for n in CTRL:
  if o[n].animation_data:o[n].animation_data_clear()
 for i in range(clip['n']):pose(clip['name'],i)
 bindings={}
 for n in CTRL:
  ad=o[n].animation_data
  if ad and ad.action:
   ad.action.name='R3_'+clip['name']+'__'+n;ad.action.use_fake_user=True;bindings[n]=ad.action.name
 action_records.append(dict(**clip,bindings=bindings))
 for i in range(clip['n']):
  s.frame_set(i+1);path=F/(clip['name']+f'_f{i:03d}_512.png');s.render.filepath=str(path);start=time.time();bpy.ops.render.render(write_still=True)
  rows.append(dict(action=clip['name'],index=i,path=path.relative_to(R).as_posix(),seconds=round(time.time()-start,3),foot_world_z=round(minimum_z(),7)))
# Bind neutral idle as saved opening state; all four actions remain editable in datablocks.
for record in action_records[:1]:
 for n,an in record['bindings'].items():o[n].animation_data_create();o[n].animation_data.action=bpy.data.actions[an]
s.frame_set(1);s.frame_start=1;s.frame_end=4;s.render.fps=24;s['R3_limited_sample']=True;s['R3_production_art_accepted']=False;s['R3_source_sha256']=MH;s['R3_clip_contract']=json.dumps(action_records)
master=D/'sheep_stack_A_motion_sample.blend';bpy.ops.wm.save_as_mainfile(filepath=str(master))
assert hashlib.sha256(MOTHER.read_bytes()).hexdigest()==MH
(O/'motion-render-report.json').write_text(json.dumps(dict(task='R3-C-SAMPLE',status='LIMITED_FEASIBILITY_CANDIDATE',source=SRC.relative_to(R).as_posix(),source_sha256=hashlib.sha256(SRC.read_bytes()).hexdigest(),g4_mother_sha256=MH,master=master.relative_to(R).as_posix(),master_sha256=hashlib.sha256(master.read_bytes()).hexdigest(),camera=s.camera.name,pivot_native512=pivot,physical_floor_z=0,scale_policy='uniform root only; contact uses local head/limb pose, no global squash',clips=action_records,frames=rows,missing=['dedicated stack_miss','separate perfect-specific animation; celebration first beat may be used as limited reaction','full three-game action production','prototype-width geometry acceptance'],sample_art_accepted=False,production_art_accepted=False),indent=2),encoding='utf-8')
print('R3_FOUR_ACTIONS_14_FRAMES_COMPLETE',flush=True)

