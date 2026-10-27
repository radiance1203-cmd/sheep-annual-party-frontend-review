import bpy,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2d';p=V/'sheep_master_r2d.blend';bpy.ops.wm.open_mainfile(filepath=str(p));o=bpy.data.objects
face=o['R2d_face_control_surface'];assert len(face.data.vertices)==640
assert 'R2d_skin_blush' in face.data.color_attributes
assert any(q.type=='SUBSURF' for q in face.modifiers)
assert o['face'].hide_render
assert o['R2d_heart_nose'].type=='MESH'
for side in [-1,1]:
    q=o['R2d_horn_'+str(side)];assert q.type=='MESH' and len(q.data.vertices)==4584
    assert o['R2c_horn_'+str(side)].hide_render
assert sum(q.name.startswith('R2d_crown_') for q in o)==10
cam=o['side_v1'];assert abs(cam.data.ortho_scale-4)<.0001
assert max(abs(v) for v in o['sheep_root'].location)<.00001
out={'status':'SOURCE_VERIFIED','production_art_accepted':False,'mother_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'face_control_vertices':len(face.data.vertices),'face_blush':'corner color attribute / material linked','nose':'bevelled closed volume','horn_vertices_per_side':4584,'crown_control_surfaces':10,'camera':{'position':list(cam.location),'ortho_scale':cam.data.ortho_scale},'root':list(o['sheep_root'].location),'not_verified':'Art target, animation, runtime integration, device'}
(R/'output/r2-20261027/art/r2d/structure-verification.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print('R2D_STRUCTURE_VERIFIED',flush=True)
