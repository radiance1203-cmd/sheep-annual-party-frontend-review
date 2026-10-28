import bpy,json
from pathlib import Path
from mathutils import Vector
R=Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(R/'art-source/r2/r2g/sheep_master_r2g.blend'))
rows=[]
for o in bpy.data.objects:
 if o.type=='EMPTY' or o.name.startswith(('sheep_leg','eye','R2d_face','R2g_weld','scarf','bell','ear')):
  rows.append(dict(name=o.name,type=o.type,parent=o.parent.name if o.parent else None,location=list(o.location),rotation=list(o.rotation_euler),scale=list(o.scale),visible=not o.hide_render,vertices=len(o.data.vertices) if o.type=='MESH' else None))
p=(R/'review/r3/stack-sample/scene-inspection.json');p.write_text(json.dumps(rows,indent=2))
print('INSPECTION',len(rows));print(json.dumps(rows,indent=2))
