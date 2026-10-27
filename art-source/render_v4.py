"""Render only approved v4 candidate actors, preserving all old animation keys.
No asset manifest registration. C1b sample permission permits production candidate export.
"""
import bpy,math,json,time,hashlib,sys,importlib.util
from pathlib import Path
B=Path(__file__).resolve().parent;V=B/'v4';OUT=V/'renders';PLAN=json.loads((B/'render_plan.json').read_text())
PLAN['plans']['sheep_side']['clips'].update({'stack_idle':[6,8,True],'stack_air':[2,6,True],'stack_steady':[3,15,False],'stack_celebrate':[8,12,True]})
spec=importlib.util.spec_from_file_location('mother_v4',B/'repair_masters_v4.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
actor_only=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--actor=')),None)
report={'status':'RENDERED_CANDIDATE_VISUAL_REVIEW_PENDING','production_art_accepted':False,'frames':[],'actors':[],'plan':PLAN,'source_script_sha256':hashlib.sha256((B/'repair_masters_v4.py').read_bytes()).hexdigest()}
for actor in ([actor_only] if actor_only else ['sheep','dog']):
    path=V/(actor+'_master_v4.blend');bpy.ops.wm.open_mainfile(filepath=str(path));scene=bpy.context.scene
    scene,devices=mod.setup(actor);root=bpy.data.objects[actor+'_root'];root.rotation_euler=(0,0,0)
    controllers=[root,bpy.data.objects[actor+'_body_ctrl'],*sorted([o for o in bpy.data.objects if o.name.startswith(actor+'_leg_')],key=lambda o:o.name)]
    if actor=='sheep':controllers.append(bpy.data.objects['sheep_head_ctrl'])
    else:controllers.append(bpy.data.objects['dog_tail'])
    # Bake v4 actions while retaining every original historical action datablock.
    for action in list(bpy.data.actions):
        if action.name.startswith('V4_'):bpy.data.actions.remove(action)
    for key,p in PLAN['plans'].items():
        if p['actor']!=actor:continue
        for clip,(n,fps,loop) in p['clips'].items():
            for o in controllers:o.animation_data_clear()
            for i in range(n):
                mod.pose_v4(actor,clip,i,n)
                for o in controllers:
                    for prop in ['location','rotation_euler','scale']:o.keyframe_insert(data_path=prop,frame=i+1)
            for o in controllers:
                action=o.animation_data.action;action.name='V4_'+key+'__'+clip+'__'+o.name;action.use_fake_user=True;o.animation_data_clear()
    mod.pose_v4(actor,'idle');root.rotation_euler=(0,0,0);scene.camera=bpy.data.objects['side_v1' if actor=='sheep' else 'iso8_v1']
    bpy.ops.wm.save_as_mainfile(filepath=str(path));mother_hash=hashlib.sha256(path.read_bytes()).hexdigest()
    report['actors'].append({'actor':actor,'mother':path.relative_to(B.parent).as_posix(),'sha256':mother_hash,'devices':devices,'actions':len(bpy.data.actions),'object_count':len(bpy.data.objects)})
    for key,p in PLAN['plans'].items():
        if p['actor']!=actor:continue
        scene.camera=bpy.data.objects[p['camera']]
        for direction,angle in ([PLAN['directions'][0]] if p['camera']=='side_v1' else PLAN['directions']):
            root.rotation_euler.z=math.radians(angle)
            for clip,(n,fps,loop) in p['clips'].items():
                for i in range(n):
                    mod.pose_v4(actor,clip,i,n);dest=OUT/key/(f'{key}__{clip}__{direction}__f{i:03}.png');dest.parent.mkdir(parents=True,exist_ok=True)
                    scene.render.filepath=str(dest);start=time.time();bpy.ops.render.render(write_still=True)
                    report['frames'].append({'path':dest.relative_to(B.parent).as_posix(),'mother_sha256':mother_hash,'seconds':round(time.time()-start,3)})
                    (V/('render-progress-'+actor+'.json')).write_text(json.dumps({'actor':actor,'done':len(report['frames']),'last':dest.name,'at':time.time()},indent=2)+'\n')
    print('V4_ACTOR_COMPLETE:'+actor,flush=True)
(V/('production-render-'+(actor_only or 'all')+'.json')).write_text(json.dumps(report,indent=2)+'\n')
(V/'render-plan-v4.json').write_text(json.dumps(PLAN,indent=2)+'\n')
print('V4_CHARACTER_RENDER_COMPLETE',flush=True)
