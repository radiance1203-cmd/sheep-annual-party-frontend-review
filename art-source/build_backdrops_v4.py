"""Deepen retained v3 scenery into independent v4, no live actors or gate/obstacles.
--build-only saves new native mothers; --preview renders three scene-sized reviews.
"""
import bpy,math,random,json,hashlib,sys,time
from pathlib import Path
from mathutils import Vector
B=Path(__file__).resolve().parent;V=B/'v4';SIZES={'stack':(720,960),'runner':(720,440),'herd':(720,840)};SEED=5012026
ONLY=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--game=')),None)
def mat(name,color,noise=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.92;p.inputs['Sheen Weight'].default_value=.13
    if noise:
        n=m.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=noise;n.inputs['Detail'].default_value=3
        b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.13;b.inputs['Distance'].default_value=.018;m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
    return m
def move(ob,name,material,parent=None):
    ob.name=name;ob.parent=parent
    for c in list(ob.users_collection):c.objects.unlink(ob)
    COL.objects.link(ob);ob.data.materials.append(material);return ob
def ball(name,loc,size,material,parent=None):
    # Linked native mesh instances avoid thousands of context-dependent operators.
    if material.name not in SPHERES:
        mesh=UNIT.copy();mesh.materials.clear();mesh.materials.append(material);SPHERES[material.name]=mesh
    o=bpy.data.objects.new(name,SPHERES[material.name]);o.location=loc;o.scale=size;o.parent=parent;COL.objects.link(o)
    return o
def box(name,loc,size,material,bevel=.03,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);move(o,name,material,parent)
    m=o.modifiers.new('soft crafted edge','BEVEL');m.width=bevel;m.segments=3;o.modifiers.new('weighted normals','WEIGHTED_NORMAL');return o
def sprig(loc,scale=1):
    x,y,z=loc
    for i in range(5):
        a=i*math.tau/5+.3;h=(.18+rng.random()*.15)*scale
        o=ball('v4_soft_grass_leaf',(x+.045*scale*math.cos(a),y+.045*scale*math.sin(a),z+h*.45),(.038*scale,.055*scale,h*.55),LEAF[i%3]);o.rotation_euler=(.22*math.sin(a),.22*math.cos(a),a)
def flowers(loc,scale=1):
    x,y,z=loc;center=Vector((x,y,z+.085*scale))
    choice=rng.random();petal=PETAL if choice<.65 else CORAL if choice<.83 else YELLOW
    tilt=0 if game=='herd' else math.radians(60)
    for i in range(5):
        a=i*math.tau/5;v=.055*scale*math.sin(a)
        o=ball('v4_daisy_petal',center+Vector((.055*scale*math.cos(a),v*math.cos(tilt),v*math.sin(tilt))),(.050*scale,.033*scale,.023*scale),petal);o.rotation_euler.x=tilt
    ball('v4_daisy_gold',center+Vector((0,-.021*scale*math.sin(tilt),.021*scale*math.cos(tilt))),(.031*scale,.031*scale,.020*scale),GOLD)
def leafy_crown(center,size):
    # A few broad cloud masses plus small pointed velvet leaves create depth.
    for j in range(85):
        z=1-2*(j+.5)/85;t=j*math.pi*(3-math.sqrt(5));r=math.sqrt(1-z*z)
        v=Vector((r*math.cos(t),r*math.sin(t),z));s=size*rng.uniform(.065,.11)
        o=ball('v4_tree_leaf',Vector(center)+v*size,(s*.8,s*.55,s*1.8),LEAF[j%3]);o.rotation_euler=(rng.random()*.6,rng.random()*1.1,t)
def configure(scene):
    scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.view_settings.exposure=.48
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='CUDA';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='CUDA'
    scene.cycles.device='GPU';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=False
def ground_at_screen(scene,px,py,w,h,z=.018):
    cam=scene.camera;ratio=w/h;scale=cam.data.ortho_scale
    vw=scale if w>=h else scale*ratio;vh=scale/ratio if w>=h else scale
    origin=cam.matrix_world@Vector(((px/w-.5)*vw,(.5-py/h)*vh,0));direction=cam.matrix_world.to_quaternion()@Vector((0,0,-1));return origin+direction*((z-origin.z)/direction.z)
records=[]
for gi,(game,size) in enumerate(SIZES.items()):
    if ONLY and ONLY!=game:continue
    path=V/f'backdrop_{game}_v4.blend';source=B/f'v3/backdrop_{game}_v3.blend'
    if '--preview' not in sys.argv and '--render' not in sys.argv:
        source_hash=hashlib.sha256(source.read_bytes()).hexdigest();bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;COL=bpy.data.collections['SCENERY_'+game.upper()];rng=random.Random(SEED+gi+400)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10);unit_object=bpy.context.object;UNIT=unit_object.data.copy();bpy.data.objects.remove(unit_object,do_unlink=True);SPHERES={}
        for p in UNIT.polygons:p.use_smooth=True
        LEAF=[mat('v4_leaf_sunlit',(.39,.61,.095),12),mat('v4_leaf_mid',(.25,.48,.055),13),mat('v4_leaf_shadow',(.135,.34,.033),14)]
        PETAL=mat('v4_ivory_petals',(1,.95,.80));CORAL=mat('v4_coral_petals',(.96,.22,.065));YELLOW=mat('v4_yellow_petals',(1,.68,.10));GOLD=mat('v4_flower_gold',(.97,.57,.055));SOIL=mat('v4_warm_dirt',(.76,.47,.20),30)
        # Replace plastic tree appearance by layered, tactile leaf silhouettes.
        tree_roots=[o for o in COL.objects if o.name.startswith('scenery_tree_cluster') and o.type=='EMPTY']
        if game=='stack':
            left=min((o for o in tree_roots if o.location.x<0),key=lambda o:abs(o.location.x+4.7))
            right=min((o for o in tree_roots if o.location.x>0),key=lambda o:abs(o.location.x-7))
            left.location=(-5.4,14,0);left.scale=(1.85,)*3
            right.location=(5.8,15,0);right.scale=(1.80,)*3
        bpy.context.view_layer.update()
        crowns=[o for o in COL.objects if o.name.startswith('soft_tree_crown')]
        for j,o in enumerate(crowns):
            o.data.materials.clear();o.data.materials.append(LEAF[j%3])
            center=o.matrix_world.translation.copy();scale=max(o.dimensions)*.56
            o.scale*=.84
            leafy_crown(center,scale)
        for name in ['leaf_light','leaf_mid','leaf_deep']:
            if name in bpy.data.materials:
                p=bpy.data.materials[name].node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.98;p.inputs['Sheen Weight'].default_value=.2
        if game!='herd':
            # Additional mid/foreground detail hugs the edges of the playable picture.
            for i in range(100 if game=='stack' else 70):
                side=-1 if i%2 else 1;x=side*rng.uniform(3.10,5.0);y=rng.uniform(-.5,12)
                sprig((x,y,.012),rng.uniform(.7,1.6))
                if i%3==0:flowers((x-side*.12,y-.08,.025),rng.uniform(.8,1.35))
            # A few warm hay stacks, with low relief rope/grain, are far decoration.
            for x,y,s in [(-4.2,10,1.0),(4.25,11,.9),(-4.6,11,1.15)]:
                box('v4_distant_hay',(x,y,.29*s),(.85*s,.65*s,.58*s),bpy.data.materials['hay'],.10)
                for dx in [-.24,.24]:box('v4_hay_tie',(x+dx*s,y-.335*s,.30*s),(.024*s,.018*s,.56*s),bpy.data.materials['wood'],.009)
            for side in [-1,1]:
                for y,scale in [(0,3.2),(2.3,2.7),(5.0,2.2)]:
                    sprig((side*4.20,y,.015),scale)
                    flowers((side*3.95,y+.25,.04),2.1 if game=='stack' else 1.5)
                for i in range(12):flowers((side*rng.uniform(3.10,4.1),rng.uniform(8,16),.025),rng.uniform(.9,1.6))
            if game=='runner':
                # Decorative track lies precisely below the existing y=180 core ground.
                bpy.context.view_layer.update();verts=[ground_at_screen(scene,x,y,360,220) for x,y in [(0,180),(360,180),(360,220),(0,220)]]
                mesh=bpy.data.meshes.new('v4_runner_dirt_mesh');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update();o=bpy.data.objects.new('v4_decorative_dirt_lane_y180',mesh);COL.objects.link(o);o.data.materials.append(SOIL)
                for i in range(65):
                    px=rng.uniform(0,360);py=rng.uniform(182,220);p=ground_at_screen(scene,px,py,360,220,z=.022)
                    ball('v4_dirt_fine_pebble',p,(.018,.025,.006),GOLD if i%5==0 else SOIL)
            # Lightly articulated high clouds, no fake tower/actors in central sky.
            for o in COL.objects:
                if o.name.startswith('cloud_lobe'):
                    o.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.18
        else:
            barn=next((o for o in COL.objects if o.name=='scenery_barn'),None)
            if barn:
                barn.location=(3.52,4.18,0);barn.scale=(1.45,)*3;barn.rotation_euler.x=-.67
            for i in range(105):
                side=-1 if i%2 else 1;x=side*rng.uniform(3.95,4.6);y=rng.uniform(-5.1,5.1)
                sprig((x,y,.015),rng.uniform(.6,1.0))
                if i%3==0:flowers((x-side*.10,y,.025),rng.uniform(.75,1.10))
            for side in [-1,1]:
                for y in [-4.6,-2,1.3,3.4]:
                    sprig((side*4.18,y,.02),1.9);flowers((side*3.98,y+.18,.025),1.7)
            # Sparse actual petals, never flat round decals on the live field.
            for i in range(12):flowers((rng.uniform(-3.7,3.7),rng.uniform(-4.6,4.6),.018),.33)
        # Final R3 accents are authored by screen footprint at the two outer edges.
        # They never enter stack72..288 or runner hurdle150..180 / road180..220.
        bpy.context.view_layer.update()
        sw,sh=size[0]//2,size[1]//2
        for side in [-1,1]:
            for i in range(32):
                px=rng.uniform(6,30);px=px if side<0 else 360-px
                py=rng.uniform(306,474) if game=='stack' else rng.uniform(125,145) if game=='runner' else rng.uniform(22,410)
                p=ground_at_screen(scene,px,py,sw,sh)
                flowers(p,.78 if game=='stack' else .96 if game=='runner' else .72)
                if i%3==0:sprig(p,.9 if game!='herd' else .7)
            if game!='runner':
                p=ground_at_screen(scene,14 if side<0 else 346,461 if game=='stack' else 402,sw,sh)
                box('v4_corner_decorative_hay',p+Vector((0,0,.16)),(.52,.40,.32),bpy.data.materials['hay'],.06)
                for dx in [-.15,.15]:box('v4_corner_hay_tie',p+Vector((dx,-.208,.16)),(.022,.012,.30),bpy.data.materials['wood'],.006)
        for node in scene.world.node_tree.nodes:
            if node.type=='BACKGROUND':
                color=node.inputs['Color'].default_value
                if color[2]>color[0]*1.5:node.inputs['Color'].default_value=(.18,.64,1,1);node.inputs['Strength'].default_value=1.0
                else:node.inputs['Color'].default_value=(.95,.92,.80,1);node.inputs['Strength'].default_value=.45
        for light in [o for o in COL.objects if o.type=='LIGHT']:
            if light.data.type=='SUN':light.data.color=(1,.955,.86)
            elif light.data.type=='AREA':light.data.color=(1,.92,.79)
        # Fine world-space low-contrast grass grain, not round geometry patches.
        grass=bpy.data.materials.get('grass')
        if grass:
            nodes=grass.node_tree.nodes;links=grass.node_tree.links;shader=nodes.get('Principled BSDF')
            previous=shader.inputs['Base Color'].links[0].from_socket if shader.inputs['Base Color'].links else None
            geometry=nodes.new('ShaderNodeNewGeometry');noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=24;noise.inputs['Detail'].default_value=2
            links.new(geometry.outputs['Position'],noise.inputs['Vector']);ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.25,.40,.06,1);ramp.color_ramp.elements[1].color=(.38,.55,.10,1);links.new(noise.outputs['Fac'],ramp.inputs[0])
            if previous:
                mix=nodes.new('ShaderNodeMixRGB');mix.inputs[0].default_value=.34;links.new(previous,mix.inputs[1]);links.new(ramp.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],shader.inputs['Base Color'])
            else:links.new(ramp.outputs[0],shader.inputs['Base Color'])
            bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.08;bump.inputs['Distance'].default_value=.008;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs[0],shader.inputs['Normal'])
        configure(scene);scene.render.resolution_x,scene.render.resolution_y=size;scene.render.resolution_percentage=100
        bpy.ops.wm.save_as_mainfile(filepath=str(path));assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
        records.append({'game':game,'source':source.relative_to(B.parent).as_posix(),'source_sha256':source_hash,'mother':path.relative_to(B.parent).as_posix(),'mother_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'scene_size_px':[size[0]//2,size[1]//2],'no_live_actors_hurdles_pickups_gate':True})
    else:
        bpy.ops.wm.open_mainfile(filepath=str(path));scene=bpy.context.scene;configure(scene)
        scene.render.resolution_percentage=50 if '--preview' in sys.argv else 100
        dest=V/(f'preview_{game}_360.png' if '--preview' in sys.argv else f'backdrop_{game}_v4.png');scene.render.filepath=str(dest);start=time.time();bpy.ops.render.render(write_still=True)
        records.append({'game':game,'mother_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'render':dest.relative_to(B.parent).as_posix(),'seconds':time.time()-start,'production_art_accepted':False})
    print('V4_BACKDROP_READY:'+game,flush=True)
(V/('backdrop-preview-report.json' if '--preview' in sys.argv else 'backdrop-production-report.json' if '--render' in sys.argv else 'backdrop-source-report-v4.json')).write_text(json.dumps({'status':'CANDIDATE_VISUAL_REVIEW_PENDING','production_art_accepted':False,'records':records},indent=2)+'\n')
