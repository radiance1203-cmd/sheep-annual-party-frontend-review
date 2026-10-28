import bpy,json
from pathlib import Path
R=Path.cwd();out=[]
for p in ['art-source/r2/r2g/sheep_master_r2g.blend','art-source/r3/stack-sample/sheep_stack_A_motion_sample.blend','art-source/v4/dog_master_v4.blend']:
 bpy.ops.wm.open_mainfile(filepath=str(R/p));s=bpy.context.scene
 out.append(dict(source=p,camera=s.camera.name,render=[s.render.resolution_x,s.render.resolution_y,s.cycles.samples,s.view_settings.view_transform,s.view_settings.look,s.view_settings.exposure],materials=[dict(name=m.name,nodes=[dict(type=n.type,name=n.name) for n in m.node_tree.nodes]) for m in bpy.data.materials if m.node_tree],objects=[dict(name=o.name,type=o.type,hide=o.hide_render,materials=[m.name for m in o.data.materials] if hasattr(o.data,'materials') else [],particles=[dict(count=q.settings.count,len=q.settings.hair_length,mat=q.settings.material) for q in o.particle_systems]) for o in bpy.data.objects if o.type in ['MESH','CAMERA'] and not o.hide_render],actions=[a.name for a in bpy.data.actions],scene={k:str(s[k]) for k in s.keys()}))
(R/'review/r3/a-window-20261028/materials/source-inspection.json').write_text(json.dumps(out,indent=2))
