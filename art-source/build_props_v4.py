"""Retain farm v2; add new thin tray/native-ratio hurdles/round pickups to v4.
--build-only saves native source. --render reopens it and renders only new props.
"""
import bpy,math,json,sys,hashlib,time
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
B=Path(__file__).resolve().parent;V=B/'v4';RULES=json.loads((B.parent/'config/game_rules.v2.1.json').read_text())
SOURCE=B/'v2/farm_master_v2.blend';DEST=V/'farm_master_v4.blend'
NEW=['hay_tray_thin','hurdle_narrow','hurdle_medium','hurdle_wide','clover_outer_round','clover_core_round']
def attach(ob,name,mat,parent):
    ob.name=name;ob.parent=parent
    for c in list(ob.users_collection):c.objects.unlink(ob)
    COL.objects.link(ob);ob.data.materials.append(bpy.data.materials[mat]);return ob
def box(name,loc,size,mat,parent,bevel=.018):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);attach(o,name,mat,parent)
    m=o.modifiers.new('soft prop edges','BEVEL');m.width=bevel;m.segments=4;o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
def ball(name,loc,size,mat,parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=loc);o=bpy.context.object;o.scale=size;attach(o,name,mat,parent)
    for p in o.data.polygons:p.use_smooth=True
    return o
def line(name,points,radius,mat,parent):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=radius;d.bevel_resolution=3;d.use_fill_caps=True
    s=d.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,d);COL.objects.link(o);o.parent=parent;o.data.materials.append(bpy.data.materials[mat]);return o
def root(name):
    o=bpy.data.objects.new(name+'_root',None);COL.objects.link(o);return o
if '--render' not in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE));COL=bpy.data.collections.new('V4_PROPS');bpy.context.scene.collection.children.link(COL)
    for c in ['CHAR_SHEEP','CHAR_DOG','ENV_FARM']:bpy.data.collections[c].hide_render=True
    tray=root('hay_tray_thin');box('thin_bound_straw_base',(0,0,0),(2,.22,.075),'hay',tray,.026)
    for x in [-.70,0,.70]:
        line('thin_rope_'+str(x),[(x,-.122,-.035),(x,-.123,.035),(x,0,.047),(x,.122,.035),(x,.122,-.035)],.005,'wood',tray)
    for i in range(22):
        z=-.027+i*.0025
        line('thin_fine_straw_%02d'%i,[(-.94,-.115,z),(-.35,-.118,z+.004),(.35,-.118,z-.003),(.94,-.115,z)],.0017,'hay',tray)
    for name,width in zip(NEW[1:4],RULES['runner']['obstacle_width_by_pass_stage_u']):
        r=root(name);w=width/RULES['runner']['obstacle_height_u'];post=min(.105,w*.32)
        if name=='hurdle_narrow':
            box('narrow_wood_post',(0,0,.5),(w,.12,1),'wood',r,.035)
            for z,mat in [(.78,'scarf'),(.65,'wool'),(.52,'scarf')]:box('narrow_marker_band',(0,-.068,z),(w*.84,.025,.11),mat,r,.012)
            ball('narrow_gold_peg',(0,-.087,.92),(.029,.012,.029),'bell',r)
        else:
            for x in [-w/2+post/2,w/2-post/2]:
                box(name+'_post',(x,0,.5),(post,.13,1),'wood',r,.025)
                ball(name+'_peg',(x,-.081,.78),(.028,.012,.028),'bell',r)
            box(name+'_bar',(0,0,.70),(w-post*.8,.095,.20),'wool',r,.025)
            for x in [-w*.20,w*.20]:box(name+'_red_band',(x,-.056,.70),(w*.18,.018,.19),'scarf',r,.009)
        grain_x=[-w*.30,-w*.10,w*.10,w*.30] if name=='hurdle_narrow' else [side*(w/2-post/2)+offset*post for side in [-1,1] for offset in [-.22,.22]]
        for i,x in enumerate(grain_x):
            line(name+'_grain_'+str(i),[(x,-.073,.08),(x+.002,-.075,.35),(x-.002,-.075,.55)],.002,'hay',r)
    # New independent round components share one exact geometric projected center.
    outer=root('clover_outer_round');core=root('clover_core_round')
    for i in range(4):
        a=math.pi/4+i*math.pi/2;leaf=ball('round_leaf_'+str(i),(.21*math.cos(a),0,.5+.21*math.sin(a)),(.22,.08,.245),'grass',outer);leaf.rotation_euler.y=-a
        line('round_leaf_vein_'+str(i),[(0,-.085,.5),(.20*math.cos(a),-.085,.5+.20*math.sin(a)),(.36*math.cos(a),-.06,.5+.36*math.sin(a))],.009,'hay',outer)
    ball('round_gold_core',(0,-.02,.5),(.145,.065,.145),'bell',core)
    ball('core_small_highlight',(-.035,-.081,.54),(.031,.006,.026),'wool',core)
    bpy.ops.object.camera_add(location=(0,-6,.5));cam=bpy.context.object;cam.name='prop_front_v4';cam.data.type='ORTHO';cam.data.ortho_scale=1.4;cam.rotation_euler=(Vector((0,0,.5))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene;scene.camera=cam;scene.render.film_transparent=True;scene.cycles.samples=48;scene.cycles.use_denoising=True
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST))
    (V/'prop-source-v4.json').write_text(json.dumps({'status':'NATIVE_CANDIDATE','source':SOURCE.relative_to(B.parent).as_posix(),'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'mother':DEST.relative_to(B.parent).as_posix(),'new_frames':NEW,'old_props_retained':True,'rules_modified':False},indent=2)+'\n')
if '--build-only' not in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(DEST));COL=bpy.data.collections['V4_PROPS'];scene=bpy.context.scene;cam=bpy.data.objects['prop_front_v4'];scene.camera=cam
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='CUDA';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='CUDA'
    scene.cycles.device='GPU';scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    records=[]
    for name in NEW:
        r=bpy.data.objects[name+'_root']
        for o in COL.objects:o.hide_render=o!=r and o.parent!=r
        if name=='hay_tray_thin':
            cam.location=(0,-6,0);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.25;scene.render.resolution_x=1024;scene.render.resolution_y=160;anchor=Vector((0,0,0))
        else:
            cam.location=(0,-6,.5);cam.rotation_euler=(Vector((0,0,.5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=1.4;scene.render.resolution_x=scene.render.resolution_y=512;anchor=Vector((0,0,.5)) if 'clover' in name else Vector((0,0,0))
        bpy.context.view_layer.update();projected=world_to_camera_view(scene,cam,anchor);dest=V/'renders/new_props'/(name+'.png');dest.parent.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(dest)
        bpy.ops.render.render(write_still=True)
        records.append({'frame':name,'raw':dest.relative_to(B.parent).as_posix(),'raw_pivot_px':[projected.x*scene.render.resolution_x,(1-projected.y)*scene.render.resolution_y]})
    (V/'prop-render-v4.json').write_text(json.dumps({'mother_sha256':hashlib.sha256(DEST.read_bytes()).hexdigest(),'records':records},indent=2)+'\n')
    print('V4_PROPS_RENDER_COMPLETE')
