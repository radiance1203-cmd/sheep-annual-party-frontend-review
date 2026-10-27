"""Read C1 mothers for native editability receipts; no save/render."""
import bpy,json,hashlib,sys
from pathlib import Path
V=Path(__file__).resolve().parent;ROOT=V.parents[1];OUT=ROOT/'output/repair-20261027/art';OUT.mkdir(parents=True,exist_ok=True)
records=[]
for actor in ['sheep','dog']:
    path=V/(actor+'_master_v4.blend');bpy.ops.wm.open_mainfile(filepath=str(path));col=bpy.data.collections['CHAR_'+actor.upper()]
    names=['body_wool','face','head_wool','sheep_head_ctrl','sheep_body_ctrl','horn_curl_1','dog_body','dog_head','dog_chest','dog_body_ctrl','side_v1','iso8_v1']
    items=[]
    for name in names:
        ob=bpy.data.objects.get(name)
        if not ob:continue
        r={'name':name,'type':ob.type,'parent':ob.parent.name if ob.parent else None,'location':list(ob.location),'scale':list(ob.scale)}
        if ob.type=='MESH':r.update(vertices=len(ob.data.vertices),materials=[m.name for m in ob.data.materials])
        if ob.type=='CURVE':r.update(splines=len(ob.data.splines),bevel_depth=ob.data.bevel_depth,caps=ob.data.use_fill_caps,points=len(ob.data.splines[0].bezier_points))
        if ob.type=='CAMERA':r.update(ortho_scale=ob.data.ortho_scale)
        items.append(r)
    records.append({'actor':actor,'mother':path.relative_to(ROOT).as_posix(),'mother_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
       'objects':len(bpy.data.objects),'actions_retained':len(bpy.data.actions),'active_collection':col.name,
       'active_body_lobes':len([o for o in col.objects if o.name.startswith('v4_body_plush') and not o.hide_render]),
       'old_body_lobes_retained_hidden':len([o for o in col.objects if o.name.startswith(('body_wool_tuft','body_small_curl')) and o.hide_render]),
       'active_head_lobes':len([o for o in col.objects if o.name.startswith('v4_head_plush') and not o.hide_render]),
       'active_hair_systems':sum(len(o.particle_systems) for o in col.objects if not o.hide_render),
       'collections':[c.name for c in bpy.data.collections],'objects_examined':items,
       'stack_pose_source':'art-source/repair_masters_v4.py:pose_v4; controller/head/leg articulation + uniform root scale; new action baking waits production authorization'})
receipt={'status':'NATIVE_EDITABLE_C1_PENDING_REVIEW','blender':bpy.app.version_string,'production_art_accepted':False,'records':records}
label='C1b' if '--c1b' in sys.argv else 'C1'
for path in [V/(label+'-native-source-structure.json'),OUT/(label+'-native-source-structure.json')]:path.write_text(json.dumps(receipt,indent=2)+'\n')
print('C1_NATIVE_SOURCE_INSPECTION_COMPLETE')
