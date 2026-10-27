import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(R/'art-source/v4/backdrop_herd_v4.blend'))
s=bpy.context.scene
out={'camera':{'name':s.camera.name,'location':list(s.camera.location),'rotation':list(s.camera.rotation_euler),'scale':s.camera.data.ortho_scale},'objects':[{'name':q.name,'location':list(q.matrix_world.translation),'dimensions':list(q.dimensions)} for q in bpy.data.objects if q.parent is None]}
(R/'art-source/r2/environment-inspection.json').write_text(json.dumps(out,indent=2))
