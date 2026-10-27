"""Build editable independent 3D scenery from farm_master_v2; no game geometry baked.
Blender -b --python art-source/build_backdrops_v3.py -- --preview
Blender -b --python art-source/build_backdrops_v3.py -- --production
"""
import bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector

B=Path(__file__).resolve().parent;V=B/'v3';V.mkdir(exist_ok=True)
SOURCE=B/'v2/farm_master_v2.blend';SEED=5012026
SIZES={'stack':(720,960),'runner':(720,440),'herd':(720,840)}
if any((B.parent/'apps/web/public/assets/environment'/f'backdrop_{game}_v3.png').exists() for game in SIZES):
    raise RuntimeError('v3 scenery is published and immutable; create a new version before rebuilding source/preview')
PREVIEW='--preview' in sys.argv
ONLY=next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--game=')),None)

def make_material(name,color,rough=.9,noise=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    shader=m.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(*color,1);shader.inputs['Roughness'].default_value=rough
    if noise:
        tex=m.node_tree.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=noise;tex.inputs['Detail'].default_value=3
        bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.25;bump.inputs['Distance'].default_value=.035
        m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],shader.inputs['Normal'])
    return m

def attach(ob,name,mat=None,parent=None):
    ob.name=name
    for old in list(ob.users_collection):old.objects.unlink(ob)
    SCENERY.objects.link(ob);ob.parent=parent;ob.hide_render=False
    if mat:ob.data.materials.append(mat)
    return ob
def sphere(name,loc,scale,mat,parent=None):
    data=bpy.data.objects['body_wool'].data.copy();data.materials.clear()
    ob=bpy.data.objects.new(name,data);ob.location=loc;ob.scale=scale
    attach(ob,name,mat,parent)
    for p in ob.data.polygons:p.use_smooth=True
    return ob
def box(name,loc,scale,mat,bevel=.06,parent=None):
    w,h,d=scale;verts=[(x*w,y*h,z*d) for x,y,z in [(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]]
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    ob=bpy.data.objects.new(name,data);ob.location=loc;attach(ob,name,mat,parent)
    mod=ob.modifiers.new('soft modeled edge','BEVEL');mod.width=bevel;mod.segments=3;ob.modifiers.new('weighted normals','WEIGHTED_NORMAL');return ob
def curve(name,points,radius,mat,parent=None):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=2
    spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,data);SCENERY.objects.link(ob);ob.parent=parent;ob.data.materials.append(mat);return ob
def clone_prop(kind,loc,scale=1,angle=0):
    src=bpy.data.objects[kind+'_root'];root=bpy.data.objects.new('scenery_'+kind,None);SCENERY.objects.link(root)
    root.location=loc;root.scale=(scale,)*3;root.rotation_euler.z=math.radians(angle)
    for child in src.children:
        ob=child.copy();ob.data=child.data.copy() if child.data else None;ob.parent=root;ob.hide_render=False;SCENERY.objects.link(ob)
    return root

def tree(loc,size=1):
    root=bpy.data.objects.new('scenery_tree_cluster',None);SCENERY.objects.link(root);root.location=loc;root.scale=(size,)*3
    trunk=box('tapered_honey_trunk',(0,0,.9),(.27,.28,1.8),M['wood'],.07,root)
    for side in [-1,1]:
        branch=box('tree_branch',(side*.18,0,1.4),(.18,.18,.8),M['wood'],.05,root);branch.rotation_euler.y=side*.6
    for i in range(17):
        theta=i*math.pi*(3-math.sqrt(5));r=.47*math.sqrt((i+.5)/17)
        sphere('soft_tree_crown',(r*math.cos(theta),r*math.sin(theta),1.85+.32*math.sin(i*1.8)),(.5+rng.random()*.13,.46+rng.random()*.13,.55+rng.random()*.16),M['leaf_'+str(i%3)],root)
    return root
def cloud(loc,size=1):
    root=bpy.data.objects.new('soft_volume_cloud',None);SCENERY.objects.link(root);root.location=loc;root.scale=(size,)*3
    for x,y,z in [(-.85,0,0),(-.48,0,.20),(0,.02,.38),(.48,0,.18),(.84,0,0),(-.30,-.15,.05),(.32,-.12,.03)]:
        sphere('cloud_lobe',(x,y,z),(.43+rng.random()*.04,.38,.36+rng.random()*.08),M['cloud'],root)
    return root
def hay_bale(loc,size=1):
    root=bpy.data.objects.new('decorative_hay_bale',None);SCENERY.objects.link(root);root.location=loc;root.scale=(size,)*3
    box('hay_cube',(0,0,.30),(.88,.68,.58),M['hay'],.11,root)
    for x in [-.27,.27]:
        curve('bale_rope',[(x,-.35,.06),(x,-.36,.56),(x,0,.60),(x,.36,.56),(x,.35,.06)],.016,M['wood'],root)
    for i in range(32):
        x=rng.uniform(-.42,.42);z=rng.uniform(.06,.55)
        curve('fine_bale_straw',[(x-.05,-.35,z),(x+.03,-.36,z+.02),(x+.11,-.35,z-.01)],.004,M['hay'],root)
    return root
def grass_clump(loc,size=1):
    root=bpy.data.objects.new('edge_grass_clump',None);SCENERY.objects.link(root);root.location=loc;root.scale=(size,)*3
    for i in range(7):
        a=i*math.tau/7;h=.17+rng.random()*.20
        leaf=sphere('rounded_grass_leaf',(.075*math.cos(a),.075*math.sin(a),h*.45),(.045,.055,h*.55),M['leaf_'+str(i%3)],root);leaf.rotation_euler=(.3*math.sin(a),.3*math.cos(a),a)
    return root
def flowers(loc,size=1):
    root=bpy.data.objects.new('edge_flower_patch',None);SCENERY.objects.link(root);root.location=loc;root.scale=(size,)*3
    for j in range(3):
        x=rng.uniform(-.18,.18);y=rng.uniform(-.16,.16);z=.12+j*.035
        for i in range(5):
            a=i*math.tau/5;sphere('petal',(x+.07*math.cos(a),y+.07*math.sin(a),z),(.058,.043,.035),M['petal' if j<2 else 'coral'],root)
        sphere('pollen',(x,y,z+.028),(.04,.04,.027),M['gold'],root)
    return root

report={'status':'PREVIEW_REVIEW_PENDING','source':'art-source/v2/farm_master_v2.blend','source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'seed':SEED,'scenes':[],'excluded':['moving characters','HUD/text','real hay tray/platform','actual hurdles and pickups','herd gate line/entry markers','physics or scoring geometry']}
for game,size in SIZES.items():
    if ONLY and ONLY!=game:continue
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE));rng=random.Random(SEED+list(SIZES).index(game))
    for name in ['CHAR_SHEEP','CHAR_DOG','ENV_FARM']:bpy.data.collections[name].hide_render=True
    SCENERY=bpy.data.collections.new('SCENERY_'+game.upper());bpy.context.scene.collection.children.link(SCENERY)
    M={name:bpy.data.materials[name] for name in ['wood','hay','grass','roof']}
    M.update({
      'leaf_0':make_material('leaf_light',(.31,.52,.08),noise=8),
      'leaf_1':make_material('leaf_mid',(.19,.40,.055),noise=9),
      'leaf_2':make_material('leaf_deep',(.11,.29,.035),noise=10),
      'cloud':make_material('warm_soft_cloud',(.95,.96,.91),1),
      'petal':make_material('ivory_flower',(.98,.94,.80),.85),
      'coral':make_material('coral_flower',(.85,.20,.07),.8),
      'gold':make_material('flower_gold',(.95,.59,.055),.7),
      'hill_far':make_material('distant_blue_green',(.28,.47,.22),1),
      'hill_near':make_material('sunlit_hill',(.35,.52,.12),1)
    })
    M['cloud'].node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.12
    M['roof'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.68,.105,.035,1)
    scene=bpy.context.scene;scene.render.resolution_x,scene.render.resolution_y=size;scene.render.resolution_percentage=100
    scene.render.film_transparent=False;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8'
    scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.view_settings.exposure=0
    scene.world.use_nodes=True;world=scene.world.node_tree.nodes.get('Background');world.inputs['Color'].default_value=(.8,.85,.75,1);world.inputs['Strength'].default_value=.4
    # Camera sees blue sky while surfaces receive soft neutral sky illumination.
    nodes=scene.world.node_tree.nodes;links=scene.world.node_tree.links
    sky=nodes.new('ShaderNodeBackground');sky.inputs['Color'].default_value=(.12,.58,1,1);sky.inputs['Strength'].default_value=.9
    path=nodes.new('ShaderNodeLightPath');mix=nodes.new('ShaderNodeMixShader');links.new(path.outputs['Is Camera Ray'],mix.inputs[0]);links.new(world.outputs[0],mix.inputs[1]);links.new(sky.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes.get('World Output').inputs['Surface'])
    for ob in bpy.data.collections['LIGHTS'].objects:ob.hide_render=True
    bpy.ops.object.light_add(type='SUN',location=(-10,-8,18));sun=bpy.context.object;attach(sun,'scenery_soft_sun');sun.rotation_euler=(Vector((0,5,0))-sun.location).to_track_quat('-Z','Y').to_euler();sun.data.energy=2.0;sun.data.angle=math.radians(12)
    bpy.ops.object.light_add(type='AREA',location=(-7,-6,12));key=bpy.context.object;attach(key,'scenery_warm_key');key.data.energy=900;key.data.shape='DISK';key.data.size=9;key.rotation_euler=(-key.location).to_track_quat('-Z','Y').to_euler();key.data.color=(1,.91,.77)
    bpy.ops.object.camera_add();cam=bpy.context.object;attach(cam,'scenery_camera');cam.data.type='ORTHO';scene.camera=cam
    if game!='herd':
        # Blender AUTO sensor fit uses the dominant image dimension: 12 is portrait
        # height for stack and landscape width for runner (runner height = 7.333).
        cam.location=(0,-12,6);target=Vector((0,3,4.6 if game=='stack' else 4.0));cam.data.ortho_scale=12
        cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
        box('finite_grass_pasture',(0,-11,-.12),(36,78,.22),M['grass'],.10)
        hill_factor=1 if game=='stack' else .40
        for i,(x,y,z,scale) in enumerate([(-10,26,.2,(8,6,1.1)),(1,29,.15,(10,5,1.35)),(12,27,.2,(8,6,1.4))]):sphere('distant_rolling_hill',(x,y if game=='stack' else y-2,z*hill_factor),(scale[0],scale[1] if game=='stack' else scale[1]*.6,scale[2]*hill_factor),M['hill_far'])
        for x,y,z,scale in [(-6,22,.1,(5,4,1.05)),(8,23,.1,(6,4,1.2))]:sphere('near_rolling_hill',(x,y,z*hill_factor),(scale[0],scale[1],scale[2]*hill_factor),M['hill_near'])
        cloud_list=[((-3.8,22,6.1),.78),((.2,29,7.0),.52),((3.4,24,6.6),.90)] if game=='stack' else [((-3,24,3.45),.8),((1.8,26,3.2),.65)]
        for loc,s in cloud_list:cloud(loc,s)
        clone_prop('barn',(3.65,14,0),2.65) if game=='stack' else clone_prop('barn',(4.8,16.7,0),1.75)
        trees=[((-4.7,15,0),1.1),((-7,20,0),1.5),((7,18,0),1.5),((-2.8,23,0),.95),((4.8,24,0),1.2)] if game=='stack' else [((-4.3,19,0),.78),((-2.8,24,0),.50),((5.3,25,0),.50)]
        for loc,s in trees:tree(loc,s)
        for x in [-6,-4.4,-2.8,2.8,4.4,6]:clone_prop('fence_segment',(x,10,0),1.15)
        for loc,s in [((-4.0,8,0),1.1),((-4.1,8,0.64),.85),((4.0,7.8,0),1.2),((4.9,8.2,0),.9)]:hay_bale(loc,s)
        for i in range(48):
            side=-1 if i%2 else 1;x=side*rng.uniform(3.1,5.3);y=rng.uniform(-1,14)
            grass_clump((x,y,0),rng.uniform(1.1,2.0))
            if i%3==0:flowers((x-side*.18,y-.1,.01),rng.uniform(1.2,1.8))
        for x,y in [(-4.15,2),(4.15,2)]:
            clone_prop('lantern',(x,y,3.0),1.1)
            box('edge_farm_post',(x+.3,y,1.8),(.16,.22,3.6),M['wood'],.045)
    else:
        # A top-down orthographic ground plane keeps the playable 2D field readable.
        # No gate, pen line, obstacle, or world-to-screen transform is authored here.
        cam.location=(0,0,18);cam.rotation_euler=(0,0,0);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=10.5
        box('flat_unwarped_grass',(0,0,-.10),(12,14,.18),M['grass'],.05)
        clone_prop('barn',(3.9,4.7,0),2.2,12)
        for loc,s in [((-4.35,4.5,0),1.25),((4.5,1.9,0),1.0),((-4.65,-2.8,0),1.15),((4.55,-4.7,0),1.1)]:tree(loc,s)
        for loc,s in [((-3.9,4.5,0),.95),((-3.0,4.8,0),.8),((4.4,-.1,0),.8),((-4.5,-.8,0),.9)]:hay_bale(loc,s)
        for i in range(38):
            side=-1 if i%2 else 1;x=side*rng.uniform(4.05,4.8);y=rng.uniform(-5.2,5.2)
            grass_clump((x,y,0),rng.uniform(.65,1.15))
            if i%2==0:flowers((x-side*.12,y,.01),rng.uniform(.8,1.3))
        for i in range(8):
            x=rng.uniform(-4.1,4.1);y=5.1 if i%2 else -5.1;flowers((x,y,.01),1)
    scene.render.filepath=str(V/(f'backdrop_{game}_v3.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(V/(f'backdrop_{game}_v3.blend')))
    if PREVIEW:
        scene.render.resolution_percentage=50;scene.cycles.samples=32
        scene.render.filepath=str(V/(f'preview_{game}_360.png'))
    bpy.ops.render.render(write_still=True)
    report['scenes'].append({'game':game,'source':f'art-source/v3/backdrop_{game}_v3.blend','production_px':list(size),'scene_size_px':[n//2 for n in size],'preview':f'art-source/v3/preview_{game}_360.png','projection':'orthographic top-down, no gate/field geometry' if game=='herd' else 'orthographic separate scenic farm, no gameplay geometry'})
(V/'backdrop-source-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('V3_BACKDROP_PREVIEW_COMPLETE' if PREVIEW else 'V3_BACKDROP_PRODUCTION_COMPLETE')
