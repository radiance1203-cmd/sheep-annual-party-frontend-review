"""Repair retained v2 native mothers; v4 static review only until root approval.
Blender -b --python art-source/repair_masters_v4.py -- --actor sheep
No original generator, manifest write, original-source save, or API is used.
"""
import bpy,math,random,json,sys,hashlib,time
from pathlib import Path
from mathutils import Vector

BASE=Path(__file__).resolve().parent;V=BASE/'v4';V.mkdir(exist_ok=True)
ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
ACTOR=ARGS[ARGS.index('--actor')+1] if '--actor' in ARGS else None
C1B='--c1b' in ARGS
SEED=5012026

def material(name,color,rough=.88,sheen=.25,sub=.035):
    m=bpy.data.materials[name];m.diffuse_color=(*color,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Sheen Weight'].default_value=sheen
    p.inputs['Subsurface Weight'].default_value=sub;p.inputs['Specular IOR Level'].default_value=.23
    return m
def sphere(name,loc,scale,mat,parent,col):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc)
    ob=bpy.context.object;ob.name=name;ob.scale=scale;ob.parent=parent;ob.data.materials.append(bpy.data.materials[mat])
    for c in list(ob.users_collection):c.objects.unlink(ob)
    col.objects.link(ob)
    for p in ob.data.polygons:p.use_smooth=True
    return ob
def reset_source(actor):
    for ob in list(bpy.data.objects):
        if ob.animation_data:ob.animation_data_clear()
        for mod in list(ob.modifiers):
            if mod.type=='PARTICLE_SYSTEM':ob.modifiers.remove(mod)
    for col in ['CHAR_SHEEP','CHAR_DOG','ENV_FARM']:
        bpy.data.collections[col].hide_render=col!='CHAR_'+actor.upper()
    root=bpy.data.objects[actor+'_root'];root.location=(0,0,0);root.rotation_euler=(0,0,0);root.scale=(1,1,1)
    return root
def plush_surface(name):
    m=bpy.data.materials[name];nodes=m.node_tree.nodes
    for n in nodes:
        if n.type=='TEX_NOISE':n.inputs['Scale'].default_value=72;n.inputs['Detail'].default_value=2
        if n.type=='BUMP':n.inputs['Strength'].default_value=.21;n.inputs['Distance'].default_value=.008
def fiber(ob,count=650,length=.012):
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.select_all(action='DESELECT');ob.select_set(True)
    bpy.ops.object.particle_system_add();ps=ob.particle_systems[-1];ps.seed=SEED%10000
    s=ps.settings;s.name='v4 soft silhouette / '+ob.name;s.type='HAIR';s.count=count;s.hair_length=length
    s.hair_step=3;s.child_type='NONE';s.root_radius=.0018;s.tip_radius=.00020;s.radius_scale=.65
    s.roughness_1=.012;s.roughness_2=.006
def repair_sheep():
    o=bpy.data.objects;c=bpy.data.collections['CHAR_SHEEP'];rng=random.Random(SEED)
    material('wool',(.98,.94,.84),.97,.48,.11);plush_surface('wool')
    material('face',(1,.75,.45),.72,.04,.08);material('horn',(.76,.44,.19),.47,.04,.025)
    material('scarf',(.85,.045,.022),.94,.3,.025);material('hoof',(.20,.075,.025),.56,.02,.015)
    material('nose',(.86,.20,.09),.6,.03,.025)
    # Retain v2 geometry for edit history, but replace dense bead layout in v4 only.
    for ob in c.objects:
        if ob.name.startswith(('body_wool_tuft','body_small_curl','head_rear_tuft','horn_growth')):ob.hide_render=True
    body=o['body_wool'];body.location=(0,-.08,.57);body.scale=(.44,.405,.42)
    for i in range(54):
        z=max(-.98,min(.98,1-2*(i+.5)/54+rng.uniform(-.018,.018)))
        t=i*math.pi*(3-math.sqrt(5))+rng.uniform(-.26,.26);r=math.sqrt(1-z*z)
        s=.132+rng.random()*.038
        ob=sphere('v4_body_plush_%03d'%i,(.385*r*math.cos(t),-.08+.36*r*math.sin(t),.57+.355*z),
                  (s,s*(.94+rng.random()*.12),s*(.94+rng.random()*.12)),'wool',o['sheep_body_ctrl'],c)
        # Keep the macro cloud genuinely round; fine fibers supply irregularity.
        sub=ob.modifiers.new('Smooth cloud lobe','SUBSURF');sub.levels=1;sub.render_levels=1
        fiber(ob,1150,.017)
    head=o['head_wool'];head.location=(0,.30,.96);head.scale=(.39,.315,.34)
    o['face'].location=(0,.535,.94);o['face'].scale=(.34,.235,.31)
    # Back and crown use visibly larger tufts, a single coherent soft silhouette.
    for i in range(27):
        z=1-2*(i+.5)/27;t=i*math.pi*(3-math.sqrt(5));r=math.sqrt(1-z*z)
        x=.30*r*math.cos(t);y=.30+.24*r*math.sin(t);height=.96+.255*z
        if y>.40 and height<1.08:continue
        s=.115+rng.random()*.025
        ob=sphere('v4_head_plush_%03d'%i,(x,y,height),(s,s,s),'wool',o['sheep_head_ctrl'],c);fiber(ob,800,.015)
    for i in range(7):
        a=math.pi*i/6;ob=o['forelock_%02d'%i]
        ob.location=(.28*math.cos(a),.555,1.02+.18*math.sin(a));ob.scale=(.133,.125,.136);fiber(ob,850,.015)
    for side in [-1,1]:
        ear=o['ear_'+str(side)];ear.location=(side*.365,.32,.97);ear.scale=(.13,.09,.085)
        eye=o['eye_'+str(side)];eye.location=(side*.137,.758,.982);eye.scale=(.046,.030,.057)
        o['eye_glint_'+str(side)].location=(side*.137-.010,.784,.999)
        cheek=o['peach_cheek_'+str(side)];cheek.location=(side*.21,.744,.891);cheek.scale=(.068,.012,.041)
        h=o['horn_curl_'+str(side)];h.data.bevel_depth=.086;h.data.bevel_resolution=4;h.data.use_fill_caps=True
        h.data.splines.clear();sp=h.data.splines.new('BEZIER');sp.bezier_points.add(38);pts=sp.bezier_points
        for i,p in enumerate(pts):
            if i<3:
                p.co=[(side*.265,.275,1.105),(side*.32,.235,1.205),(side*.385,.215,1.250)][i]
            else:
                q=(i-3)/(len(pts)-4);t=2.50+q*6.1;r=.17*(1-.66*q)
                # Oblique curl plane remains readable from both front and side cameras.
                p.co=(side*(.465+r*.66*math.cos(t)),.32+r*.75*math.cos(t),1.175+r*math.sin(t))
            p.handle_left_type=p.handle_right_type='AUTO';p.radius=1-.50*i/(len(pts)-1)
        sphere('v4_horn_rounded_tip_'+str(side),pts[-1].co,(.043,.043,.043),'horn',o['sheep_head_ctrl'],c)
    o['nose'].location=(0,.792,.900);o['nose'].scale=(.043,.024,.029)
    for side in [-1,1]:
        pts=o['smile_'+str(side)].data.splines[0].bezier_points
        for p,co in zip(pts,[(0,.788,.880),(side*.029,.784,.854),(side*.062,.773,.879)]):p.co=co
    scarf=o['scarf_neck'];pts=scarf.data.splines[0].bezier_points
    for i,p in enumerate(pts):p.co=(.31*math.cos(i*math.tau/24),.30+.27*math.sin(i*math.tau/24),.72)
    o['scarf_tail'].location=(.13,.575,.585);o['scarf_tail'].scale=(1,1,.85)
    for name in ['bell_single','bell_rim','bell_clapper']:
        ob=o[name]
        if ob.type=='CURVE':
            for p in ob.data.splines[0].bezier_points:p.co.z-=.075;p.co.y+=.015
        else:ob.location.z-=.075;ob.location.y+=.015
    o['tail'].location=(0,-.52,.60);o['tail'].scale=(.165,.15,.16);fiber(o['tail'],700,.012)
    for ob in c.objects:
        if ob.name.startswith('leg'):ob.location.z=-.16;ob.scale.z=.12
        elif ob.name.startswith('hoof'):ob.location.z=-.255
    for ob in o:
        if ob.name.startswith('sheep_leg_'):ob.location.z=.33
    for side in [-1,1]:
        for y in [-.27,.24]:
            ob=sphere('v4_ankle_fleece_%s_%s'%(side,y),(side*.24,y,.235),(.16,.17,.17),'wool',o['sheep_body_ctrl'],c);fiber(ob,850,.016)
    # Lower the entire coherent facial assembly, including horn/eyes/forelock.
    for ob in o['sheep_head_ctrl'].children:ob.location.z-=.04
    # Curve coordinates are local to their zero-location head child, so the same offset applies.
    o['face'].scale=(.36,.25,.325);o['head_wool'].scale=(.405,.33,.35)
    return {'large_body_lobes':54,'body_small_lobes_hidden':190,'head_lobes':27,'horn_bevel':.086,'macro_displace_removed':True,'plush_fiber_length':.017,'head_lowered':.04,'retained_identity':['light face','red scarf','single gold bell'],'stack_pose':'same mother, compact controller preset, no bitmap squash'}
def repair_dog():
    o=bpy.data.objects;c=bpy.data.collections['CHAR_DOG'];rng=random.Random(SEED+1)
    material('dog_brown',(.54,.225,.075),.91,.29,.035);material('dog_cream',(.99,.93,.79),.94,.35,.05)
    for n in ['dog_brown','dog_cream']:plush_surface(n)
    o['dog_body'].location=(0,-.09,.52);o['dog_body'].scale=(.30,.43,.30)
    o['dog_chest'].location=(0,.23,.56);o['dog_chest'].scale=(.325,.24,.32)
    o['dog_head'].location=(0,.34,.87);o['dog_head'].scale=(.29,.255,.265)
    o['dog_muzzle'].location=(0,.565,.815);o['dog_muzzle'].scale=(.195,.18,.14)
    o['dog_nose'].location=(0,.722,.856);o['dog_nose'].scale=(.068,.038,.05)
    o['dog_blaze'].location=(0,.563,.972);o['dog_blaze'].scale=(.082,.046,.16)
    for side in [-1,1]:
        ear=o['dog_ear_'+str(side)]
        # A native triangular cartilage surface and a separate folded-forward tip.
        # This replaces the old long ellipsoid mesh while keeping object/control identity.
        mesh=bpy.data.meshes.new('v4_semipricked_folded_ear_'+str(side))
        vertices=[(-.13,.015,0),(.13,.015,0),(.073,-.012,.225),(-.073,-.012,.225),(0,.125,.145)]
        mesh.from_pydata(vertices,[],[(0,1,2,3),(3,2,4)]);mesh.update();ear.data=mesh
        ear.data.materials.append(bpy.data.materials['dog_brown']);ear.data.materials.append(bpy.data.materials['hoof'])
        ear.data.polygons[1].material_index=1
        for p in ear.data.polygons:p.use_smooth=True
        ear.location=(side*.245,.27,1.00);ear.scale=(1,1,1);ear.rotation_euler=(.02,side*.17,-side*.13)
        solid=ear.modifiers.new('Ear cartilage thickness','SOLIDIFY');solid.thickness=.09;solid.offset=0
        bevel=ear.modifiers.new('Soft triangular ear edges','BEVEL');bevel.width=.04;bevel.segments=5
        ear.modifiers.new('Ear weighted normals','WEIGHTED_NORMAL')
        eye=o['dog_eye_'+str(side)];eye.location=(side*.145,.56,.945);eye.scale=(.036,.023,.044)
        o['dog_glint_'+str(side)].location=(side*.145-.009,.581,.958)
    for ob in c.objects:
        if ob.name.startswith('dog_chest_fur'):ob.hide_render=True
    for i in range(16):
        z=1-2*(i+.5)/16;t=i*math.pi*(3-math.sqrt(5));r=math.sqrt(1-z*z);s=.079+rng.random()*.018
        ob=sphere('v4_dog_chest_plush_%02d'%i,(.27*r*math.cos(t),.23+.19*r*math.sin(t),.56+.245*z),(s,s,s),'dog_cream',o['dog_body_ctrl'],c);fiber(ob,250,.010)
    tail=o['dog_tail'];tail.location=(0,-.57,.76);tail.scale=(.135,.24,.15);tail.rotation_euler.x=-.55
    for n in ['dog_body','dog_head','dog_chest','dog_tail']:fiber(o[n],2200,.014)
    return {'wider_head_chest':True,'ear_mesh':'triangular half-pricked cartilage with forward/down fold at tip','ear_ellipsoid_removed':True,'existing_controls_actions_retained':True}
def pose_v4(actor,clip,i=0,n=4):
    o=bpy.data.objects;body=o[actor+'_body_ctrl'];root=o[actor+'_root'];t=i/max(n,1);s=math.sin(t*math.tau)
    body.location=(0,0,0);body.scale=(1,1,1);body.rotation_euler=(0,0,0);root.scale=(1,1,1)
    legs=sorted([q for q in o if q.name.startswith(actor+'_leg_')],key=lambda q:q.name)
    for leg in legs:leg.rotation_euler=(0,0,0)
    if actor=='sheep':o['sheep_head_ctrl'].location=(0,0,0);o['sheep_head_ctrl'].rotation_euler=(0,0,0)
    if clip.startswith('stack_'):
        # Uniform whole-mother scale and actual crouched articulation. No anisotropic raster resize.
        root.scale=(.93,.93,.93);body.location.z=-.012
        o['sheep_head_ctrl'].location=(0,-.055,-.265)
        for j,leg in enumerate(legs):leg.rotation_euler.x=.70 if j%2 else -.70
        if clip=='stack_steady':body.location.z-=.007*math.sin((i+1)/(n+1)*math.pi)
        if clip=='stack_air':o['sheep_head_ctrl'].rotation_euler.x=.018*(1 if i%2 else -1)
        if clip=='stack_celebrate':body.rotation_euler.z=.014*s
        return
    if clip in ['walk','run']:
        body.location.z=.018*(1-math.cos(t*math.tau*2));body.rotation_euler.y=.025*s
        for j,leg in enumerate(legs):leg.rotation_euler.x=.48*math.sin(t*math.tau+(j in [0,3])*math.pi)
    elif clip=='idle':body.scale=(1+.008*s,1+.008*s,1-.007*s)
    elif clip in ['takeoff','land','steady']:
        q=math.sin((i+1)/(n+1)*math.pi);body.scale=(1+.055*q,1+.04*q,1-.08*q);body.location.z=-.015*q
    elif clip=='air':
        body.rotation_euler.x=.06*(1 if i==0 else -1)
        for j,leg in enumerate(legs):leg.rotation_euler.x=.60 if j%2 else -.48
    elif clip=='bump':body.rotation_euler.y=.10*math.sin((i+1)*math.pi*.7)
    elif clip in ['celebrate','enter']:body.rotation_euler.y=.06*s;body.location.z=.035*(1-math.cos(t*math.tau))
    elif clip=='bark':body.rotation_euler.x=-.09*math.sin((i+1)*math.pi/(n+1));body.scale=(1,1.03,1.02)
    if actor=='dog':o['dog_tail'].rotation_euler.z=.25*s
def setup(actor):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
    scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.45
    prefs=bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type='CUDA';prefs.get_devices()
        for d in prefs.devices:d.use=d.type=='CUDA'
        if any(d.type=='CUDA' for d in prefs.devices):scene.cycles.device='GPU'
    except Exception:scene.cycles.device='CPU'
    for name,loc,energy,size in [('key',(-3,-4,7),430,5.5),('fill',(4,-1,4),165,5),('rim',(0,4,5),230,3.5)]:
        ob=bpy.data.objects[name];ob.location=loc;ob.data.energy=energy;ob.data.size=size;ob.rotation_euler=(-ob.location).to_track_quat('-Z','Y').to_euler()
    return scene,[{'name':d.name,'type':d.type,'use':d.use} for d in prefs.devices]
def render(scene,path):
    path.parent.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(path);start=time.time();bpy.ops.render.render(write_still=True)
    return {'path':path.relative_to(BASE.parent).as_posix(),'seconds':round(time.time()-start,3)}

if __name__=='__main__':
    report={'status':'C1_SAMPLES_REVIEW_PENDING','production_art_accepted':False,'seed':SEED,'actors':[]}
    for actor in ([ACTOR] if ACTOR else ['sheep','dog']):
        source=BASE/'v2'/(actor+'_master_v2.blend');source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
        bpy.ops.wm.open_mainfile(filepath=str(source));root=reset_source(actor)
        detail=repair_sheep() if actor=='sheep' else repair_dog();scene,devices=setup(actor);pose_v4(actor,'idle')
        scene.camera=bpy.data.objects['side_v1' if actor=='sheep' else 'iso8_v1']
        dest=V/(actor+'_master_v4.blend');bpy.ops.wm.save_as_mainfile(filepath=str(dest))
        record={'actor':actor,'source':source.relative_to(BASE.parent).as_posix(),'source_sha256':source_hash,'mother':dest.relative_to(BASE.parent).as_posix(),'mother_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'changes':detail,'renderer':scene.cycles.device,'devices':devices,'samples':[]}
        if '--source-only' not in ARGS:
            sample_dir=V/('samples-C1b' if C1B else 'samples')
            cam=scene.camera.copy();cam.data=scene.camera.data.copy();scene.collection.objects.link(cam);cam.name='v4_review_close_camera'
            cam.location=(0,-6,2.2);target=Vector((0,0,.70));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.05;scene.camera=cam
            for label,angle in ([('front',180),('side',-90)] if C1B else [('front',180),('side',-90),('back',0),('diagonal',-135)]):
                root.rotation_euler.z=math.radians(angle);record['samples'].append(render(scene,sample_dir/(actor+'_'+label+'_512.png')))
            if C1B:
                report['actors'].append(record)
                continue
            scene.camera=bpy.data.objects['side_v1' if actor=='sheep' else 'iso8_v1']
            for direction,angle in ([('e',-90)] if actor=='sheep' else [('n',0),('e',-90),('s',180),('se',-135)]):
                root.rotation_euler.z=math.radians(angle);pose_v4(actor,'idle');record['samples'].append(render(scene,V/'samples'/(actor+'_production_idle_'+direction+'_512.png')))
            if actor=='sheep':
                scene.camera=bpy.data.objects['iso8_v1']
                for direction,angle in [('n',0),('s',180),('se',-135)]:
                    root.rotation_euler.z=math.radians(angle);pose_v4(actor,'idle');record['samples'].append(render(scene,V/'samples'/(actor+'_production_iso_idle_'+direction+'_512.png')))
                scene.camera=bpy.data.objects['side_v1'];root.rotation_euler.z=math.radians(-90)
                for clip,i,n in [('stack_idle',0,6),('stack_steady',1,3),('stack_air',0,2),('stack_air',1,2),('stack_celebrate',2,8)]:
                    pose_v4(actor,clip,i,n);record['samples'].append(render(scene,V/'samples'/(actor+'_'+clip+'_f%03d_512.png'%i)))
        assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
        report['actors'].append(record)
    (V/('source-review-'+(ACTOR or 'all')+('-C1b' if C1B else '')+'.json')).write_text(json.dumps(report,indent=2)+'\n')
    print('V4_C1_SAMPLES_COMPLETE',flush=True)
