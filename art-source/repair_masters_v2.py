"""Non-destructive v2 edits of the delivered .blend masters, not a replacement generator.
Run Blender -b --python art-source/repair_masters_v2.py -- --samples
The existing collections, controllers, clips, cameras and source files are retained.
"""
import bpy, math, json, random, sys, hashlib
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parent
DEST = BASE / 'v2'
DEST.mkdir(exist_ok=True)
SAMPLES = '--samples' in sys.argv
ART_SEED = 5012026

def material(name, color, roughness, sheen=0, subsurface=0):
    mat = bpy.data.materials[name]
    mat.diffuse_color = (*color, 1)
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Sheen Weight'].default_value = sheen
    shader.inputs['Subsurface Weight'].default_value = subsurface
    shader.inputs['Subsurface Radius'].default_value = (.65, .35, .18)
    return mat

def sphere(name, loc, scale, material_name, parent, collection):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=loc)
    ob=bpy.context.object;ob.name=name;ob.scale=scale;ob.parent=parent
    ob.data.materials.append(bpy.data.materials[material_name])
    for poly in ob.data.polygons: poly.use_smooth=True
    for c in list(ob.users_collection): c.objects.unlink(ob)
    collection.objects.link(ob)
    return ob

def wool_fibers(ob):
    # Short actual editable hair keeps silhouette tactile; no camera-facing fur card.
    bpy.context.view_layer.objects.active=ob
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True)
    bpy.ops.object.particle_system_add()
    system=ob.particle_systems[-1];system.seed=ART_SEED % 10000
    settings=system.settings;settings.name='Fine wool / '+ob.name
    settings.type='HAIR';settings.count=1000;settings.hair_length=.022
    settings.hair_step=2;settings.child_type='NONE'
    settings.root_radius=.0005;settings.tip_radius=.00008;settings.radius_scale=.6
    settings.roughness_1=0;settings.roughness_2=0

def repair_sheep():
    objects=bpy.data.objects;collection=bpy.data.collections['CHAR_SHEEP']
    wool=material('wool',(.96,.93,.84),.93,.32,.045)
    shader=wool.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Specular IOR Level'].default_value=.22
    for node in wool.node_tree.nodes:
        if node.type=='TEX_NOISE': node.inputs['Scale'].default_value=18;node.inputs['Detail'].default_value=3
        if node.type=='BUMP': node.inputs['Strength'].default_value=.55;node.inputs['Distance'].default_value=.025
    material('face',(.98,.75,.48),.73,.06,.065)
    material('horn',(.72,.43,.19),.44,.0,.015)
    material('scarf',(.8,.048,.025),.92,.25,.015)
    material('hoof',(.19,.075,.028),.56)
    material('nose',(.8,.23,.12),.61,.0,.02)
    body=objects['body_wool'];body.scale=(.41,.405,.39);body.location.z=.62
    tuft_objects=sorted([o for o in collection.objects if o.name.startswith('body_wool_tuft')],key=lambda o:o.name)
    for index in range(145):
        tuft_objects.append(sphere('body_small_curl_%03d'%index,(0,0,0),(.1,.1,.1),'wool',objects['sheep_body_ctrl'],collection))
    rng=random.Random(ART_SEED)
    for index,ob in enumerate(tuft_objects):
        z=1-2*(index+.5)/len(tuft_objects);theta=index*math.pi*(3-math.sqrt(5))
        ring=math.sqrt(1-z*z)
        ob.location=(.39*ring*math.cos(theta),-.06+.365*ring*math.sin(theta),.62+.35*z)
        s=.075+rng.random()*.035;ob.scale=(s,s*(.90+rng.random()*.20),s*(.90+rng.random()*.20))
        # Fine, irregular lobe surface complements fibers and avoids smooth bead highlights.
        texture=bpy.data.textures.new('Wool lobe '+str(index),type='CLOUDS');texture.noise_scale=.24;texture.noise_depth=1
        modifier=ob.modifiers.new('Wool irregularity','DISPLACE');modifier.texture=texture;modifier.strength=.13;modifier.mid_level=.5
    for ob in collection.objects:
        if ob.name.startswith('body_wool_tuft'): pass
        elif ob.name=='tail': ob.location.y=-.52;ob.location.z=.66;ob.scale=(.14,.13,.14)
        elif ob.name.startswith('ear_'): ob.scale=(.13,.085,.075)
        elif ob.name.startswith('leg'):
            ob.location.z=-.20;ob.scale.z=.14
    # A wider open face and smaller brow curls recover the reference's head/body ratio.
    objects['face'].scale=(.315,.225,.295)
    objects['head_wool'].scale=(.39,.31,.36)
    for i in range(7):
        ob=objects['forelock_%02d'%i];angle=math.pi*i/6
        ob.location=(.303*math.cos(angle),.60,1.11+.25*math.sin(angle))
        ob.scale=(.106,.108,.112)
    for side in [-1,1]:
        eye=objects['eye_%s'%side];eye.location=(side*.128,.756,1.08);eye.scale=(.044,.029,.054)
        objects['eye_glint_%s'%side].location=(side*.128-.009,.781,1.095)
        # Curls are now visible from the front and diagonal, instead of edge-on loops.
        horn=objects['horn_curl_%s'%side]
        pts=horn.data.splines[0].bezier_points
        spiral=[(.30,.39,1.25),(.39,.40,1.34),(.49,.43,1.32),(.55,.47,1.24),(.54,.52,1.14),(.47,.59,1.10),(.39,.70,1.13),(.36,.73,1.20),(.39,.73,1.23),(.42,.71,1.20)]
        for j,pt in enumerate(pts):
            t=j/(len(pts)-1)*(len(spiral)-1);a=int(t);b=min(a+1,len(spiral)-1);mix=t-a
            x,y,z=[spiral[a][k]*(1-mix)+spiral[b][k]*mix for k in range(3)]
            pt.co=(side*x,y,z)
        horn.data.bevel_depth=.061
        # Shallow ring seams on horns remain geometry in the editable mother source.
        for j in range(1,len(pts)-1,2):
            center=pts[j].co;ring=sphere('horn_growth_%s_%02d'%(side,j),center,(.064,.064,.064),'horn',objects['sheep_head_ctrl'],collection)
            ring.scale*=.97
    # Same editable head, with a cloud of small rear tufts instead of a bald smooth cap.
    for index in range(80):
        z=1-2*(index+.5)/80;theta=index*math.pi*(3-math.sqrt(5));ring=math.sqrt(1-z*z)
        x=.32*ring*math.cos(theta);y=.36+.27*ring*math.sin(theta);height=1.05+.30*z
        if y>.48 and height<1.2: continue
        s=.068+rng.random()*.019
        sphere('head_rear_tuft_%02d'%index,(x,y,height),(s,s,s),'wool',objects['sheep_head_ctrl'],collection)
    for name in ['nose','smile_-1','smile_1']:
        ob=objects[name]
        if ob.type=='CURVE':
            for pt in ob.data.splines[0].bezier_points: pt.co.y+=.025
        else: ob.location.y+=.025
    # Warm cheek discs are actual source geometry, with a separate soft material.
    cheek=bpy.data.materials['face'].copy();cheek.name='peach_cheek'
    cheek.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(1,.43,.28,1)
    cheek.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.15
    for side in [-1,1]: sphere('peach_cheek_%s'%side,(side*.19,.718,.997),(.06,.012,.036),'peach_cheek',objects['sheep_head_ctrl'],collection)
    bell=objects['bell_single']
    bevel=bell.modifiers.new('Rounded bell lip','BEVEL');bevel.width=.009;bevel.segments=3
    for p in bell.data.polygons:p.use_smooth=True
    # Body/chest fibers only, not face/eyes/horns; tiny strands are not gameplay geometry.
    for ob in list(collection.objects):
        if ob.type=='MESH' and ob.data.materials and ob.data.materials[0].name=='wool': wool_fibers(ob)
    return {'compact_body_y':.405,'face_linear_rgb':[.98,.75,.48],'wool_hair_world_length':.022,'wool_hair_per_mesh':1000,'wool_children':0,'single_bell':True}

def repair_dog():
    material('dog_brown',(.47,.19,.07),.9,.18,.025)
    material('dog_cream',(.96,.89,.72),.93,.25,.04)
    # Retain recognizable dog shape and every original control; soften fur highlights.
    for name in ['dog_brown','dog_cream']:
        for node in bpy.data.materials[name].node_tree.nodes:
            if node.type=='TEX_NOISE':node.inputs['Scale'].default_value=25
            if node.type=='BUMP':node.inputs['Distance'].default_value=.018;node.inputs['Strength'].default_value=.4
    for side in [-1,1]:
        ear=bpy.data.objects['dog_ear_%s'%side];ear.location=(side*.225,.30,.94)
        ear.scale=(.115,.115,.28);ear.rotation_euler=(.1,side*.25,0)
    collection=bpy.data.collections['CHAR_DOG'];rng=random.Random(ART_SEED+1)
    for index in range(27):
        z=1-2*(index+.5)/27;theta=index*math.pi*(3-math.sqrt(5));r=math.sqrt(1-z*z)
        s=.055+rng.random()*.02
        sphere('dog_chest_fur_%02d'%index,(.245*r*math.cos(theta),.22+.18*r*math.sin(theta),.57+.28*z),(s,s,s),'dog_cream',bpy.data.objects['dog_body_ctrl'],collection)
    for ob in list(collection.objects):
        if ob.type=='MESH' and not any(key in ob.name for key in ['eye','glint','nose']):wool_fibers(ob)
    return {'controller_and_animation_retained':True,'fur_shader_scale':25,'additional_chest_tufts':27,'real_short_hair':True}

def setup_render():
    scene=bpy.context.scene
    scene.cycles.samples=48;scene.cycles.use_denoising=True
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.view_settings.exposure=.25
    scene.render.resolution_x=scene.render.resolution_y=512
    # Broad front-left key light, with gentle cream fill; the camera/coordinate contract stays fixed.
    for name,loc,power,size in [('key',(-3,-4,7),420,4),('fill',(4,-1,4),100,4),('rim',(0,4,5),190,3)]:
        light=bpy.data.objects[name];light.location=loc;light.data.energy=power;light.data.size=size
        light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
    return scene

report={'status':'SAMPLE_REVIEW_PENDING','method':'load original masters and edit named geometry/materials; v1 unchanged','seed':ART_SEED,'sources':[]}
for actor in (['dog'] if '--dog-two' in sys.argv else ['sheep'] if '--two' in sys.argv else ['sheep','dog']):
    source=BASE/(actor+'_master.blend');bpy.ops.wm.open_mainfile(filepath=str(source))
    before={'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'objects':len(bpy.data.objects),'actions':len(bpy.data.actions)}
    detail=repair_sheep() if actor=='sheep' else repair_dog()
    scene=setup_render()
    for key in ['CHAR_SHEEP','CHAR_DOG']:bpy.data.collections[key].hide_render=key!=('CHAR_'+actor.upper())
    bpy.data.collections['ENV_FARM'].hide_render=True
    scene.camera=bpy.data.objects['side_v1' if actor=='sheep' else 'iso8_v1']
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST/(actor+'_master_v2.blend')))
    record={'source':source.name,'before':before,'after':{'objects':len(bpy.data.objects),'actions':len(bpy.data.actions)},'edits':detail}
    if SAMPLES:
        sample_dir=DEST/'samples';sample_dir.mkdir(exist_ok=True)
        # Review samples deliberately use close crop. Production cameras remain unchanged in saved master.
        cam=scene.camera.copy();cam.data=scene.camera.data.copy();scene.collection.objects.link(cam)
        cam.name='review_close_camera';cam.location=(0,-6,2.2)
        target=Vector((0,0,.72));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.1;scene.camera=cam
        root=bpy.data.objects[actor+'_root']
        directions=[('side',-90),('back',0)] if '--remaining' in sys.argv else [('front',180),('diagonal',-135)] if '--two' in sys.argv or '--dog-two' in sys.argv else [('front',180),('side',-90),('back',0),('diagonal',-135)]
        for label,angle in directions:
            root.rotation_euler.z=math.radians(angle)
            scene.render.filepath=str(sample_dir/(actor+'_'+label+'_512.png'));bpy.ops.render.render(write_still=True)
        record['samples']=[str(p.relative_to(BASE.parent)).replace('\\','/') for p in sorted(sample_dir.glob(actor+'_*'))]
    report['sources'].append(record)
old_report=DEST/'source-diff.json'
if old_report.exists():
    existing=json.loads(old_report.read_text())
    names={r['source'] for r in report['sources']}
    report['sources'] += [r for r in existing['sources'] if r['source'] not in names]
old_report.write_text(json.dumps(report,indent=2)+'\n')
print('V2_SAMPLES_COMPLETE' if SAMPLES else 'V2_SOURCE_COMPLETE')
