import bpy,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2g';bpy.ops.wm.open_mainfile(filepath=str(V/'history/g3/sheep_master_r2g.blend'))
v=bpy.data.objects['R2e_horn_1'].data.vertices;rows=[]
for i in range(165,201):
    c=sum((v[i*24+j].co.copy() for j in range(24)),Vector())/24;r=sum((v[i*24+j].co-c).length for j in range(24))/24;rows.append({'ring':i,'center':list(c),'radius':r})
(V/'g3-curve-inspection.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows))
