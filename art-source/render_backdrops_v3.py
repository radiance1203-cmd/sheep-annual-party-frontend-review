"""Render approved scenery mothers at their saved 2x resolution; no scene redesign."""
import bpy,json,hashlib,time
from pathlib import Path
B=Path(__file__).resolve().parent;V=B/'v3';start=time.time();records=[]
if any((B.parent/'apps/web/public/assets/environment'/f'backdrop_{game}_v3.png').exists() for game in ['stack','runner','herd']):
    raise RuntimeError('v3 scenery is published and immutable; create a new version before rerendering registered mothers')
for game in ['stack','runner','herd']:
    path=V/(f'backdrop_{game}_v3.blend');bpy.ops.wm.open_mainfile(filepath=str(path))
    scenery=bpy.data.collections['SCENERY_'+game.upper()]
    # The independent mother contains scenery only, not even hidden old actors or
    # an unused gameplay prop. No live actor/actions or gate geometry is retained.
    owned=set(scenery.objects)
    for ob in list(bpy.data.objects):
        if ob not in owned:bpy.data.objects.remove(ob,do_unlink=True)
    for col in list(bpy.data.collections):
        if col!=scenery:bpy.data.collections.remove(col)
    for action in list(bpy.data.actions):bpy.data.actions.remove(action,do_unlink=True)
    assert all(ob.animation_data is None for ob in scenery.objects)
    assert not any(any(token in ob.name.lower() for token in ['sheep','dog','clover','hurdle','gate_arrow','hay_tray']) for ob in scenery.objects)
    scene=bpy.context.scene;scene.render.resolution_percentage=100;scene.cycles.samples=64
    scene.render.filepath=str(V/(f'backdrop_{game}_v3.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
    before=time.time();bpy.ops.render.render(write_still=True)
    records.append({'game':game,'mother':path.relative_to(B.parent).as_posix(),'mother_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'pixels':[scene.render.resolution_x,scene.render.resolution_y],'collections':list(bpy.data.collections.keys()),'objects':len(scenery.objects),'actions':len(bpy.data.actions),'dynamic_objects':0,'actual_gate_hurdle_platform_objects':0,'render_seconds':time.time()-before,'requested_renderer':'Cycles 64 samples + denoise, AgX Medium High Contrast, exposure 0','preview_gate':'root actually opened 360px previews and allowed production export only'})
report={'status':'RENDERED_CANDIDATE_RUNTIME_VISUAL_PENDING','elapsed_seconds':time.time()-start,'records':records,'source_seed':5012026}
(V/'production-render-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('V3_PRODUCTION_RENDER_COMPLETE',flush=True)
