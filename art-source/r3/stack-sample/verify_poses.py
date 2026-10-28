import bpy,json,hashlib,struct
from pathlib import Path
R=Path.cwd();D=R/'art-source/r3/stack-sample';O=R/'review/r3/stack-sample';SRC=R/'art-source/r2/r2g/sheep_master_r2g.blend'
def digest_mesh(name):
 mesh=bpy.data.objects[name].data;h=hashlib.sha256()
 for v in mesh.vertices:h.update(struct.pack('<3f',*v.co))
 return h.hexdigest()
mesh_names=['R2g_welded_existing_fleece','R2d_face_control_surface','R2e_horn_-1','R2e_horn_1']
bpy.ops.wm.open_mainfile(filepath=str(SRC));baseline={n:digest_mesh(n) for n in mesh_names};s=bpy.context.scene
camera=(list(s.camera.location),list(s.camera.rotation_euler),s.camera.data.ortho_scale);lights={o.name: (list(o.location),list(o.rotation_euler),o.data.energy,list(o.data.color)) for o in bpy.data.objects if o.type=='LIGHT'};rows=[]
for name in ['A_folded_loaf','B_deep_crouch']:
 p=D/(name+'.blend');bpy.ops.wm.open_mainfile(filepath=str(p));s=bpy.context.scene
 assert all(digest_mesh(n)==v for n,v in baseline.items())
 assert (list(s.camera.location),list(s.camera.rotation_euler),s.camera.data.ortho_scale)==camera
 assert {o.name: (list(o.location),list(o.rotation_euler),o.data.energy,list(o.data.color)) for o in bpy.data.objects if o.type=='LIGHT'}==lights
 assert len(set(round(v,6) for v in bpy.data.objects['sheep_root'].scale))==1
 rows.append(dict(candidate=name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),reopen=True,mesh_hash_equal=True,lights_equal=True,camera_equal=True,uniform_root_scale=True))
assert hashlib.sha256(SRC.read_bytes()).hexdigest()=='e6875118a2cca427b380bf40838d679ac9b742d80ab7fff2e117058cb058feff'
(O/'pose-verification.json').write_text(json.dumps(dict(source_immutable=True,identity_mesh_hashes=baseline,candidates=rows,art_pass=False),indent=2))
print('POSE_VERIFY_PASS_SOURCE_MESH_CAMERA_LIGHT_UNIFORM_SCALE',flush=True)
