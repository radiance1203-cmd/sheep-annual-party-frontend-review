"""R3-C legal pose study; G4 source read only; two renders only."""
import bpy,json,hashlib,math,time
from pathlib import Path
from mathutils import Vector
R=Path.cwd();D=R/'art-source/r3/stack-sample';O=R/'review/r3/stack-sample';SRC=R/'art-source/r2/r2g/sheep_master_r2g.blend';SH=hashlib.sha256(SRC.read_bytes()).hexdigest()
assert SH=='e6875118a2cca427b380bf40838d679ac9b742d80ab7fff2e117058cb058feff'
rows=[]
for label in ['A_folded_loaf','B_deep_crouch']:
 bpy.ops.wm.open_mainfile(filepath=str(SRC));o=bpy.data.objects;s=bpy.context.scene
 for q in o:
  if q.animation_data:q.animation_data_clear()
 root=o['sheep_root'];root.rotation_euler=(0,0,-math.pi/2);root.scale=(.93,)*3
 body=o['sheep_body_ctrl'];head=o['sheep_head_ctrl'];head.location=(0,-.055,-.265);head.rotation_euler=(0,0,-math.pi/3)
 body.location.z=-.12 if label.startswith('A') else -.24
 if label.startswith('B'):
  head.location=(0,-.10,-.20);head.rotation_euler.x=math.radians(10)
 # Attach same editable scarf and bell to the turned neck, preserving their shape/material.
 # Correction lifts only the collar group locally to remain below the lowered head.
 for name in ['scarf_neck','scarf_tail','bell_clapper','bell_rim','bell_single']:
  q=o[name];q.parent=head;q.location.z+=.19
 for leg in sorted([q for q in o if q.name.startswith('sheep_leg_')],key=lambda q:q.name):
  front=leg.location.y>0;side=1 if leg.location.x>0 else -1
  leg.location.z=.20 if label.startswith('A') else .12
  leg.location.y=.18 if front else -.25
  leg.rotation_euler.x=(1.35 if front else -1.35) if label.startswith('A') else (1.62 if front else -1.62)
  leg.rotation_euler.y=side*(.18 if label.startswith('A') else .32)
 s.camera=o['side_v1'];s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.use_denoising=True
 s.render.resolution_x=s.render.resolution_y=512;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True
 prefs=bpy.context.preferences.addons['cycles'].preferences
 try:
  prefs.compute_device_type='CUDA';prefs.get_devices()
  for d in prefs.devices:d.use=d.type=='CUDA'
  s.cycles.device='GPU' if any(d.use and d.type=='CUDA' for d in prefs.devices) else 'CPU'
 except Exception:s.cycles.device='CPU'
 s['R3_source_sha256']=SH;s['R3_candidate']=label;s['R3_production_art_accepted']=False
 dest=D/(label+'.blend');bpy.ops.wm.save_as_mainfile(filepath=str(dest))
 path=O/(label+'_512.png');s.render.filepath=str(path);start=time.time();bpy.ops.render.render(write_still=True)
 rows.append(dict(label=label,blend=dest.relative_to(R).as_posix(),image=path.relative_to(R).as_posix(),seconds=round(time.time()-start,3),camera=s.camera.name,camera_location=list(s.camera.location),camera_rotation=list(s.camera.rotation_euler),ortho_scale=s.camera.data.ortho_scale,exposure=s.view_settings.exposure,root_scale=list(root.scale),body_location=list(body.location),head_location=list(head.location),head_rotation=list(head.rotation_euler),legal_pose='existing leg controllers rotated and tucked; existing body/head translated; existing collar group reparented; no anisotropic root scaling; original welded fleece unchanged'))
assert hashlib.sha256(SRC.read_bytes()).hexdigest()==SH
(O/'pose-study.json').write_text(json.dumps(dict(task='R3-C-SAMPLE',source=SRC.relative_to(R).as_posix(),source_sha256=SH,production_art_accepted=False,sample_art_accepted=False,renders=rows),indent=2),encoding='utf-8')
print('R3_TWO_LEGAL_POSES_RENDERED',flush=True)
