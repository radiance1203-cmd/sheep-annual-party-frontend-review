"""R2 limited editable mother experiment. Never writes v4/current runtime assets.
Run Blender -b --python art-source/r2/sample_mothers.py -- --actor sheep [--first]
Only this explicitly enumerated finite sample list is rendered.
"""
import bpy, math, json, hashlib, time, sys
from pathlib import Path
from mathutils import Vector

R=Path(__file__).resolve().parents[2]; V=R/'art-source/r2'; OUT=R/'output/r2-20261027/art'
V.mkdir(exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
ACTOR=next((sys.argv[i+1] for i,a in enumerate(sys.argv) if a=='--actor'),'sheep')
FIRST='--first' in sys.argv
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def mat(name,color,rough=.8,sub=.06):
    m=bpy.data.materials[name];p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    p.inputs['Subsurface Weight'].default_value=sub;m.diffuse_color=(*color,1)
    return m
def join_soft(names,name,parent):
    originals=[bpy.data.objects[n] for n in names]
    copies=[]
    for old in originals:
        cp=old.copy();cp.data=old.data.copy();bpy.context.scene.collection.objects.link(cp)
        cp.parent=None;cp.matrix_world=old.matrix_world.copy();cp.hide_render=False
        for m in list(cp.modifiers):cp.modifiers.remove(m)
        copies.append(cp);old.hide_render=True
    bpy.ops.object.select_all(action='DESELECT')
    for cp in copies:cp.select_set(True)
    bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();ob=copies[0];ob.name=name
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=ob.modifiers.new('R2 fused fleece volume','REMESH');mod.mode='VOXEL';mod.voxel_size=.021;mod.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    sm=ob.modifiers.new('R2 soft merged cloud joints','SMOOTH');sm.factor=.75;sm.iterations=5
    bpy.ops.object.modifier_apply(modifier=sm.name)
    sub=ob.modifiers.new('R2 continuous plush surface','SUBSURF');sub.levels=1;sub.render_levels=1
    ob.parent=parent
    # Retain fixed seed surface fuzz for a soft contour, no independent frame generation.
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.particle_system_add();s=ob.particle_systems[-1].settings
    ob.particle_systems[-1].seed=20261027;s.type='HAIR';s.count=9000;s.hair_length=.009;s.hair_step=2
    s.root_radius=.0011;s.tip_radius=.00015;s.radius_scale=.6;s.child_type='NONE'
    return ob
def horn(side):
    o=bpy.data.objects
    for ob in o:
        if ob.name.startswith(('horn_curl_'+str(side),'v4_horn_rounded_tip_'+str(side))):ob.hide_render=True
    verts=[];faces=[];N=100;M=16
    def center(t):
        a=2.5+t*5.9;r=.16*(1-.65*t)
        return Vector((side*(.435+.75*r*math.cos(a)),.32+.70*r*math.cos(a),1.135+r*math.sin(a)))
    for i in range(N+1):
        t=i/N;c=center(t);tangent=(center(min(1,t+.001))-center(max(0,t-.001))).normalized()
        normal=tangent.cross(Vector((0,1,0))).normalized();binormal=tangent.cross(normal).normalized()
        radius=(.087-.046*t)*(1-.055*(.5+.5*math.cos(t*math.tau*13)))
        for j in range(M):
            a=j/M*math.tau;verts.append(c+radius*(normal*math.cos(a)+binormal*math.sin(a)))
    for i in range(N):
        for j in range(M):faces.append((i*M+j,i*M+(j+1)%M,(i+1)*M+(j+1)%M,(i+1)*M+j))
    faces.extend([tuple(range(M-1,-1,-1)),tuple(N*M+j for j in range(M))])
    me=bpy.data.meshes.new('R2 segmented horn mesh');me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new('R2_horn_'+str(side),me);bpy.context.scene.collection.objects.link(ob);ob.parent=o['sheep_head_ctrl']
    ob.data.materials.append(bpy.data.materials['horn'])
    for p in me.polygons:p.use_smooth=True
def repair_sheep():
    o=bpy.data.objects
    mat('wool',(1,.965,.87),.98,.1);mat('face',(1,.79,.54),.76,.12);mat('horn',(.71,.39,.15),.54,.025)
    mat('scarf',(.87,.035,.016),.9,.03);mat('nose',(.91,.24,.12),.5,.04)
    body=join_soft(['body_wool']+[q.name for q in o if q.name.startswith('v4_body_plush_')],'R2_fused_body',o['sheep_body_ctrl'])
    body.scale.z=1.08;body.location.z-=.035
    fleece=join_soft(['head_wool']+[q.name for q in o if q.name.startswith(('v4_head_plush_','forelock_'))],'R2_fused_crown',o['sheep_head_ctrl'])
    for surface in [body,fleece]:
        tex=bpy.data.textures.new('R2 irregular plush contours',type='CLOUDS');tex.noise_scale=.058;tex.noise_depth=2
        d=surface.modifiers.new('R2 organic cloud microform','DISPLACE');d.texture=tex;d.strength=.009;d.mid_level=.5
    for q in o:
        if q.name.startswith('v4_ankle_fleece_'):q.hide_render=True
    # Fleece at ankles is compact, separating tiny feet from a single round body.
    for q in o:
        if q.name.startswith('hoof'):q.scale*=.86
        if q.name.startswith('leg') and q.type=='MESH':q.scale.z*=.72
    for s in [-1,1]:
        o['eye_'+str(s)].scale*=1.12
        o['peach_cheek_'+str(s)].scale=(.055,.009,.032)
        horn(s)
    # Main forelock keeps cloud shape; merged body removes hard detached bead seams.
    wool=bpy.data.materials['wool'];p=wool.node_tree.nodes.get('Principled BSDF');p.inputs['Sheen Weight'].default_value=.5
def repair_dog():
    o=bpy.data.objects
    mat('dog_brown',(.44,.145,.045),.92,.04);mat('dog_cream',(1,.95,.83),.94,.08)
    # Soften the inherited triangular cartilage while retaining the same controls.
    for s in [-1,1]:
        ear=o['dog_ear_'+str(s)]
        for m in ear.modifiers:
            if m.type=='BEVEL':m.width=.055;m.segments=5
        ear.rotation_euler.z=-s*.24
    # Explicit jaw/tongue layer, driven by the same finite walk+bark pose sequence.
    for name,loc,scale,material in [('R2_bark_jaw',(0,.635,.738),(.13,.12,.045),'hoof'),('R2_bark_tongue',(0,.706,.744),(.058,.045,.018),'nose')]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc);q=bpy.context.object;q.name=name;q.scale=scale;q.parent=o['dog_body_ctrl'];q.data.materials.append(bpy.data.materials[material])
        for p in q.data.polygons:p.use_smooth=True
def setup():
    sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=48;sc.cycles.use_denoising=True
    sc.render.resolution_x=sc.render.resolution_y=512;sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.film_transparent=True
    sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast';sc.view_settings.exposure=.65
    prefs=bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type='CUDA';prefs.get_devices()
        for d in prefs.devices:d.use=d.type=='CUDA'
        sc.cycles.device='GPU' if any(d.use and d.type=='CUDA' for d in prefs.devices) else 'CPU'
    except Exception:sc.cycles.device='CPU'
    # Shared upper-left key in all finite views; color values scene-linear, output sRGB.
    for name,loc,energy,size,color in [('key',(-3,-4,7),520,5,(1,.88,.72)),('fill',(4,-1,4),210,5,(.81,.9,1)),('rim',(0,4,5),270,4,(1,.95,.82))]:
        q=bpy.data.objects[name];q.location=loc;q.data.energy=energy;q.data.size=size;q.data.color=color;q.rotation_euler=(-q.location).to_track_quat('-Z','Y').to_euler()
    return sc
def pose(actor,clip,i,n):
    o=bpy.data.objects;body=o[actor+'_body_ctrl'];root=o[actor+'_root'];phase=i/n*math.tau
    body.location=(0,0,0);body.scale=(1,1,1);body.rotation_euler=(0,0,0);root.scale=(1,1,1)
    legs=sorted([q for q in o if q.name.startswith(actor+'_leg_')],key=lambda q:q.name)
    for q in legs:q.rotation_euler=(0,0,0)
    if actor=='sheep':o['sheep_head_ctrl'].location=(0,0,0);o['sheep_head_ctrl'].rotation_euler=(0,0,0)
    if clip=='stack_idle':
        root.scale=(.93,)*3;body.location.z=-.012;o['sheep_head_ctrl'].location=(0,-.055,-.265)
        # Head yaw brings the face toward camera without changing root/pivot or tray geometry.
        o['sheep_head_ctrl'].rotation_euler.z=-math.pi/4
        for j,q in enumerate(legs):q.rotation_euler.x=.70 if j%2 else -.70
    elif clip=='walk_bark':
        body.location.z=.014*(1-math.cos(phase*2));body.rotation_euler.y=.018*math.sin(phase)
        for j,q in enumerate(legs):q.rotation_euler.x=.48*math.sin(phase+(math.pi if j in [0,3] else 0))
        pulse=max(0,math.sin((i+.5)/n*math.pi));body.rotation_euler.x=-.065*pulse
        o['R2_bark_jaw'].location.z=.738-.047*pulse;o['R2_bark_tongue'].location.z=.744-.025*pulse
        o['dog_tail'].rotation_euler.z=.22*math.sin(phase);o['dog_muzzle'].rotation_euler.x=-.045*pulse
    else:
        body.scale=(1+.005*math.sin(phase),1+.005*math.sin(phase),1-.004*math.sin(phase))
def camera_record(sc):
    cam=sc.camera
    return {'name':cam.name,'location':list(cam.location),'rotation_euler':list(cam.rotation_euler),'orthographic_scale':cam.data.ortho_scale,'source':[512,512],'color_management':{'view':'AgX','look':sc.view_settings.look,'exposure':sc.view_settings.exposure,'output':'sRGB RGBA8'}}

source=R/f'art-source/v4/{ACTOR}_master_v4.blend';oldhash=sha(source)
bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects
for ob in o:
    if ob.animation_data:ob.animation_data_clear()
for name in ['CHAR_SHEEP','CHAR_DOG','ENV_FARM']:bpy.data.collections[name].hide_render=name!='CHAR_'+ACTOR.upper()
o[ACTOR+'_root'].location=(0,0,0);o[ACTOR+'_root'].rotation_euler=(0,0,0)
bpy.context.view_layer.update()
(repair_sheep if ACTOR=='sheep' else repair_dog)();sc=setup();pose(ACTOR,'idle',0,4)
dest=V/f'{ACTOR}_master_r2a.blend';sc.camera=o['side_v1' if ACTOR=='sheep' else 'iso8_v1']
if ACTOR=='dog':
    controls=[o['dog_body_ctrl'],o['dog_tail'],o['dog_muzzle'],o['R2_bark_jaw'],o['R2_bark_tongue']]+[q for q in o if q.name.startswith('dog_leg_')]
    for i in range(8):
        pose('dog','walk_bark',i,8)
        for q in controls:
            for prop in ['location','rotation_euler','scale']:q.keyframe_insert(data_path=prop,frame=i+1)
    for q in controls:
        action=q.animation_data.action;action.name='R2_walk_bark_se__'+q.name;action.use_fake_user=True;q.animation_data_clear()
    sc.render.fps=18;sc.frame_start=1;sc.frame_end=8;pose('dog','idle',0,4)
sc['R2_art_status']='REVIEW; limited sample, no production acceptance'
bpy.ops.wm.save_as_mainfile(filepath=str(dest));rows=[]
cam=o['side_v1' if ACTOR=='sheep' else 'iso8_v1'].copy();cam.data=cam.data.copy();sc.collection.objects.link(cam);cam.name='R2_review_close'
cam.location=(0,-6,2.2);cam.rotation_euler=(Vector((0,0,.70))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.05
samples=[('front',cam,180,'idle',0,4)]
if not FIRST:
    if ACTOR=='sheep':samples += [(label,cam,angle,'idle',0,4) for label,angle in [('side',-90),('back',0),('diagonal',-135)]]+ [('stack_idle_e',o['side_v1'],-90,'stack_idle',0,4),('iso_idle_se',o['iso8_v1'],-135,'idle',0,4),('side_idle_e',o['side_v1'],-90,'idle',0,4)]
    else:samples += [('walk_bark_se_f%03d'%i,o['iso8_v1'],-135,'walk_bark',i,8) for i in range(8)]
for label,cam,angle,clip,i,n in samples:
    pose(ACTOR,clip,i,n);o[ACTOR+'_root'].rotation_euler.z=math.radians(angle);sc.camera=cam
    file=V/'renders'/f'{ACTOR}_{label}_512.png';file.parent.mkdir(exist_ok=True);sc.render.filepath=str(file);t=time.time();bpy.ops.render.render(write_still=True)
    rows.append({'path':file.relative_to(R).as_posix(),'sha256':sha(file),'seconds':round(time.time()-t,3),'camera':camera_record(sc),'clip':clip,'phase':i/n,'root_motion':False})
assert sha(source)==oldhash
report={'version':'r2a-limited-source-experiment','status':'SOURCE_VERIFIED / REVIEW','production_art_accepted':False,'signed_by':None,'source':source.relative_to(R).as_posix(),'source_sha256':oldhash,'mother':dest.relative_to(R).as_posix(),'mother_sha256':sha(dest),'outputs':rows,'missing':'All unenumerated actions/directions are not produced. No production manifest change.'}
(V/f'{ACTOR}-sample-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('R2_SAMPLE_COMPLETE',ACTOR,len(rows),flush=True)
