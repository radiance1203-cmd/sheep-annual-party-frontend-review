import bpy,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2f2';p=V/'sheep_master_r2f2.blend';bpy.ops.wm.open_mainfile(filepath=str(p));o=bpy.data.objects
bundles=[q for q in o if q.name.startswith('R2f2_band') and q.type=='MESH'];assert len(bundles)==37
fibers=[q for q in o if q.name.startswith('R2f2_band') and q.type=='CURVE'];assert sum(len(q.data.splines) for q in fibers)==4440
assert o['R2_fused_body'].hide_render and not o['body_wool'].hide_render
assert len(o['R2d_face_control_surface'].data.vertices)==640
assert sum(q.name.startswith('R2e_crown_') for q in o)==7
assert not any(n.type in ['TEX_NOISE','BUMP'] for n in bpy.data.materials['wool'].node_tree.nodes)
assert max(abs(v) for v in o['sheep_root'].location)<.00001
cam=o['side_v1'];assert abs(cam.data.ortho_scale-4)<.0001
out={'status':'SOURCE_VERIFIED','production_art_accepted':False,'mother_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'surface_bands':4,'medium_bundle_meshes':len(bundles),'bundle_flow_fibers':4440,'face':'D640 control cage retained','crown':'E7 eccentric cages retained','wool_noise_bump_nodes':0,'source_scope':'two static frames only; no animation production','root':list(o['sheep_root'].location),'side_camera':{'position':list(cam.location),'ortho_scale':cam.data.ortho_scale}}
(R/'output/r2-20261027/art/r2f2/structure-verification.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print('R2F2_STRUCTURE_VERIFIED',flush=True)
