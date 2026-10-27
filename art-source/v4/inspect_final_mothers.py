"""Final native receipt, read-only. Does not resave any registered source."""
import bpy,json,hashlib
from pathlib import Path
V=Path(__file__).resolve().parent;ROOT=V.parents[1];OUT=ROOT/'output/repair-20261027/art';records=[]
names=['sheep_master_v4.blend','dog_master_v4.blend','farm_master_v4.blend']+[f'backdrop_{g}_v4.blend' for g in ['stack','runner','herd']]
for name in names:
    path=V/name;bpy.ops.wm.open_mainfile(filepath=str(path));scenery=name.startswith('backdrop_');types={}
    for ob in bpy.data.objects:types[ob.type]=types.get(ob.type,0)+1
    bad=[o.name for o in bpy.data.objects if any(t in o.name.lower() for t in ['sheep','dog','hurdle','clover','hay_tray','gate_marker'])] if scenery else []
    assert not bad,(name,bad)
    if scenery:assert len(bpy.data.actions)==0
    records.append({'mother':path.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'collections':list(bpy.data.collections.keys()),'objects':len(bpy.data.objects),'object_types':types,'actions':len(bpy.data.actions),'materials':len(bpy.data.materials),'native_meshes':len(bpy.data.meshes),'native_curves':len(bpy.data.curves),'scenery_only':scenery,'scenery_excluded_live_geometry':bad,'camera':bpy.context.scene.camera.name,'production_art_accepted':False})
result={'status':'NATIVE_EDITABLE_TECHNICAL_RECEIPT','blender':bpy.app.version_string,'read_only':True,'records':records,'production_art_accepted':False}
for p in [V/'native-source-final-receipt.json',OUT/'native-source-final-receipt.json']:p.write_text(json.dumps(result,indent=2)+'\n')
print('V4_FINAL_NATIVE_RECEIPT_COMPLETE')
