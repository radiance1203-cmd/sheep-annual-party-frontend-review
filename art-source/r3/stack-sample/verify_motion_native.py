import bpy,json,hashlib,struct
from pathlib import Path
from mathutils import Vector
R=Path.cwd();D=R/'art-source/r3/stack-sample';O=R/'review/r3/stack-sample';rep=json.loads((O/'motion-render-report.json').read_text());src=R/'art-source/r2/r2g/sheep_master_r2g.blend'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def geometry(n):
 h=hashlib.sha256()
 for v in bpy.data.objects[n].data.vertices:h.update(struct.pack('<3f',*v.co))
 return h.hexdigest()
names=['R2g_welded_existing_fleece','R2d_face_control_surface','R2e_horn_-1','R2e_horn_1'];bpy.ops.wm.open_mainfile(filepath=str(src));before={n:geometry(n) for n in names};lights={q.name:(list(q.location),list(q.rotation_euler),q.data.energy,list(q.data.color)) for q in bpy.data.objects if q.type=='LIGHT'};s=bpy.context.scene;cam=(list(s.camera.location),list(s.camera.rotation_euler),s.camera.data.ortho_scale)
master=R/rep['master'];bpy.ops.wm.open_mainfile(filepath=str(master));o=bpy.data.objects;s=bpy.context.scene
assert {n:geometry(n) for n in names}==before
assert {q.name:(list(q.location),list(q.rotation_euler),q.data.energy,list(q.data.color)) for q in bpy.data.objects if q.type=='LIGHT'}==lights
assert (list(s.camera.location),list(s.camera.rotation_euler),s.camera.data.ortho_scale)==cam
rows=[]
for clip in rep['clips']:
 for n,an in clip['bindings'].items():
  o[n].animation_data_create();o[n].animation_data.action=bpy.data.actions[an]
 for i in range(clip['n']):
  s.frame_set(i+1);bpy.context.view_layer.update();assert len({round(v,6) for v in o['sheep_root'].scale})==1
  rows.append(dict(action=clip['name'],index=i,uniform_root=True,body_uniform=len({round(v,6) for v in o['sheep_body_ctrl'].scale})==1))
 assert all(x['body_uniform'] for x in rows)
assert len(rows)==14
assert all(abs(r['foot_world_z'])<.000001 for r in rep['frames'])
assert sha(src)==rep['g4_mother_sha256']=='e6875118a2cca427b380bf40838d679ac9b742d80ab7fff2e117058cb058feff'
assert sha(master)==rep['master_sha256']
(O/'motion-native-verification.json').write_text(json.dumps(dict(status='NATIVE_SAMPLE_TECH_VERIFY_PASS',master_reopened=True,source_immutable=True,identity_mesh_hashes=before,camera_and_lights_equal=True,clips_rebound_and_evaluated=rows,all_frame_foot_world_z_zero=True,art_pass=False,geometry_status='BLOCKED_PROTOTYPE_WIDTH'),indent=2))
print('MOTION_NATIVE_VERIFY_PASS_14_FRAMES_FOUR_CLIPS_SOURCE_IMMUTABLE')
