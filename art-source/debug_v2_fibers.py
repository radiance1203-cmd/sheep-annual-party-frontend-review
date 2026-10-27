import bpy,json
from pathlib import Path
from mathutils import Vector
B=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(B/'v2/sheep_master_v2.blend'))
bpy.context.view_layer.update()
out=[]
for name in ['body_wool','body_wool_tuft_00_00','forelock_00']:
 o=bpy.data.objects[name];p=o.particle_systems[0]
 e=o.evaluated_get(bpy.context.evaluated_depsgraph_get());ps=e.particle_systems[0]
 out.append({'name':name,'scale':list(o.scale),'setting_length':p.settings.hair_length,'hair_count':len(ps.particles),'first_lengths':[(v.hair_keys[-1].co-v.hair_keys[0].co).length for v in list(ps.particles)[:3]],'roughness1':p.settings.roughness_1,'roughness2':p.settings.roughness_2})
(B/'v2/fiber-debug.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
