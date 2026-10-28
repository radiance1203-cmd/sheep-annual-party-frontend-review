import bpy,hashlib,json,time
from pathlib import Path
R=Path.cwd();D=R/'art-source/r3/stack-sample';O=R/'review/r3/stack-sample';src=D/'A_folded_loaf.blend'
bpy.ops.wm.open_mainfile(filepath=str(src));o=bpy.data.objects;s=bpy.context.scene
for name in ['scarf_neck','scarf_tail']:
 q=o[name];q.location.y+=.15;q.location.z-=.055
for name in ['bell_clapper','bell_rim','bell_single']:
 q=o[name];q.location.y+=.27;q.location.z-=.10
s['R3_sample_identity']='A_folded_loaf_collar_v1';s['R3_limited_feasibility_only']=True
bpy.ops.wm.save_as_mainfile(filepath=str(D/'A_collar_v1.blend'))
rows=[]
for name in ['idle','contact']:
 if name=='contact':
  o['sheep_body_ctrl'].location.z-=.035;o['sheep_head_ctrl'].location.z-=.025
  for q in o:
   if q.name.startswith('sheep_leg_'):q.rotation_euler.x*=1.06
 s.render.filepath=str(O/('A_collar_v1_'+name+'_512.png'));start=time.time();bpy.ops.render.render(write_still=True);rows.append(dict(pose=name,path=Path(s.render.filepath).relative_to(R).as_posix(),seconds=round(time.time()-start,3)))
(O/'collar-review.json').write_text(json.dumps(dict(source='A_folded_loaf.blend',local_collar_only=True,source_identity_mesh_preserved=True,renders=rows,art_accepted=False),indent=2))
print('TWO_COLLAR_REVIEW_FRAMES_RENDERED')
