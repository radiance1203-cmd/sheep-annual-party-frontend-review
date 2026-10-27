import bpy,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[2];rows=[]
for name,path in [('R2a sheep','art-source/r2/sheep_master_r2a.blend'),('R2a dog','art-source/r2/dog_master_r2a.blend'),('R2c sheep','art-source/r2/r2c/sheep_master_r2c.blend')]:
    p=R/path;bpy.ops.wm.open_mainfile(filepath=str(p));o=bpy.data.objects;s=bpy.context.scene;actor='dog' if 'dog' in name else 'sheep';root=o[actor+'_root']
    assert max(abs(v) for v in root.location)<.00001
    for cam in ['side_v1','iso8_v1']:assert cam in o and o[cam].data.type=='ORTHO'
    actions=[a.name for a in bpy.data.actions if a.name.startswith('R2_walk_bark')]
    if actor=='dog':assert len(actions)>=9
    rows.append({'source':path,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'objects':len(o),'root':list(root.location),'side_camera':{'position':list(o['side_v1'].location),'ortho_scale':o['side_v1'].data.ortho_scale},'dog_composite_actions':actions,'status':'NATIVE_SOURCE_VERIFIED'})
(R/'output/r2-20261027/art/native-source-checks.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
print('R2_NATIVE_VERIFIED',len(rows),flush=True)
