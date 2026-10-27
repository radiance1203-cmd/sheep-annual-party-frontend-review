import bpy,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2e';p=V/'sheep_master_r2e.blend';bpy.ops.wm.open_mainfile(filepath=str(p));o=bpy.data.objects
assert sum(q.name.startswith('R2e_crown_') for q in o)==7
assert all(q.hide_render for q in o if q.name.startswith(('R2d_horn_','R2d_crown_')))
assert len(o['R2d_face_control_surface'].data.vertices)==640
curves=[q for q in o if q.name.startswith('R2e surface-flow fibers')];count=sum(len(q.data.splines) for q in curves);assert count==6650
assert not any(n.type in ['TEX_NOISE','BUMP'] for n in bpy.data.materials['wool'].node_tree.nodes)
assert max(abs(v) for v in o['sheep_root'].location)<.00001
cam=o['side_v1'];assert abs(cam.data.ortho_scale-4)<.0001
report={'status':'SOURCE_VERIFIED','production_art_accepted':False,'mother_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'face':'D ten-ring face preserved','crown_surfaces':7,'fiber_curve_objects':len(curves),'explicit_surface_flow_strands':count,'noise_bump_nodes':0,'warm_fill':{'energy':o['fill'].data.energy,'size':o['fill'].data.size},'world_strength':bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value,'root':list(o['sheep_root'].location),'side_camera':{'location':list(cam.location),'ortho_scale':cam.data.ortho_scale}}
(R/'output/r2-20261027/art/r2e/structure-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('R2E_STRUCTURE_VERIFIED',flush=True)
