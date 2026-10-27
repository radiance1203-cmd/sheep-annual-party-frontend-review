"""Edit delivered farm_master.blend into a richer, versioned set of layered props."""
import bpy, math, random, json, hashlib
from pathlib import Path
BASE=Path(__file__).resolve().parent;DEST=BASE/'v2';DEST.mkdir(exist_ok=True)
source=BASE/'farm_master.blend';bpy.ops.wm.open_mainfile(filepath=str(source))
COL=bpy.data.collections['ENV_FARM'];rng=random.Random(5012026)

def finish(ob,name,material,parent):
    ob.name=name;ob.data.materials.append(bpy.data.materials[material]);ob.parent=parent
    for c in list(ob.users_collection):c.objects.unlink(ob)
    COL.objects.link(ob)
    return ob
def box(name,loc,size,material,parent,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(ob,name,material,parent);m=ob.modifiers.new('Soft worn edges','BEVEL');m.width=bevel;m.segments=3;ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return ob
def ball(name,loc,size,material,parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=loc);ob=bpy.context.object;ob.scale=size
    finish(ob,name,material,parent)
    for p in ob.data.polygons:p.use_smooth=True
    return ob
def curve(name,points,radius,material,parent):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=2
    sp=data.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for p,co in zip(sp.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,data);COL.objects.link(ob);ob.data.materials.append(bpy.data.materials[material]);ob.parent=parent;return ob
def root(name):
    ob=bpy.data.objects.new(name+'_root',None);bpy.data.collections['RIGS'].objects.link(ob);return ob

# Procedural long grain and small tonal variation live in editable node materials.
for name,low,high,scale in [('wood',(.30,.11,.026),(.62,.32,.10),7),('hay',(.51,.24,.035),(.94,.68,.22),24),('grass',(.19,.34,.045),(.43,.62,.13),11),('soil',(.55,.31,.10),(.83,.59,.29),20)]:
    mat=bpy.data.materials[name];mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links
    shader=nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.9
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=3
    tex=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(1,1,13) if name=='wood' else (1,1,1)
    links.new(tex.outputs['Generated'],mapping.inputs[0]);links.new(mapping.outputs['Vector'],noise.inputs['Vector'])
    ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(*low,1);ramp.color_ramp.elements[1].color=(*high,1)
    links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs['Color'],shader.inputs['Base Color'])

tray=bpy.data.objects['hay_tray_root']
for i in range(58):
    x=rng.uniform(-.7,.7);y=rng.uniform(-.26,.26);z=rng.uniform(.08,.21)
    curve('hay_straw_%02d'%i,[(x-.1,y-.015,z),(x,y,z+.015),(x+.11,y+.025,z-.004)],.004,'hay',tray)
for x in [-.49,.49]:
    curve('tray_rope_%s'%x,[(x,-.31,.05),(x,-.325,.20),(x,0,.23),(x,.325,.20),(x,.31,.05)],.018,'wood',tray)

fence=bpy.data.objects['fence_segment_root']
for x in [-.65,.65]:
    box('fence_post_cap',(x,0,.93),(.15,.16,.06),'wood',fence,.025)
    for z in [.30,.64]:ball('fence_peg',(x,-.067,z),(.025,.012,.025),'bell',fence)
for z in [.30,.64]:
    for line in range(3):
        h=z-.04+line*.032
        curve('fence_grain',[(-.6,-.044,h),(0,-.046,h+.008),(.6,-.044,h-.005)],.003,'hay',fence)

hurdle=bpy.data.objects['hurdle_root']
for x in [-.48,.48]:
    ball('hurdle_peg',(x,-.083,.53),(.025,.014,.025),'bell',hurdle)
    box('hurdle_foot',(x,0,.045),(.28,.29,.09),'wood',hurdle,.025)

# Keep independent outer/core art centers aligned; face the collectible toward both cameras.
# This changes only prop appearance. No radius, map coordinate, or scoring value is authored here.
for name in ['clover_outer','clover_core']:
    ob=bpy.data.objects[name+'_root'];ob.rotation_euler.x=math.radians(68);ob.location=(0,.25,.20)

barn=bpy.data.objects['barn_root']
for x in [-.39,-.31,-.23,-.15,-.07,.01,.09,.17,.25,.33,.41]:
    box('barn_board',(x,-.388,.67),(.012,.014,.39),'wood',barn,.003)
for side in [-1,1]:
    box('barn_corner',(side*.435,0,.47),(.055,.8,.92),'wool',barn,.01)
    beam=box('barn_door_cross',(side*.11,-.433,.28),(.035,.025,.57),'wool',barn,.007);beam.rotation_euler.y=side*.36
for side in [-1,1]:
    beam=box('barn_gable_trim',(side*.22,-.47,1.02),(.58,.055,.045),'wool',barn,.012);beam.rotation_euler.y=side*.55
box('barn_gable_window',(0,-.408,.80),(.24,.025,.20),'hoof',barn,.01)
for z in [.70,.90]:box('barn_window_frame',(0,-.43,z),(.27,.035,.025),'wool',barn,.006)
for x in [-.13,.13]:box('barn_window_frame',(x,-.43,.80),(.025,.035,.22),'wool',barn,.006)
for side in [-1,1]:
    beam=box('barn_window_cross',(0,-.448,.80),(.018,.015,.28),'wool',barn,.003);beam.rotation_euler.y=side*.85

# Additional independent scenery may be assembled outside the playable geometric field.
bush=root('bush')
for i in range(9):
    x=rng.uniform(-.32,.32);y=rng.uniform(-.18,.18)
    ball('bush_leaf',(x,y,.14+rng.random()*.15),(.15,.13,.18),'grass',bush)
tree=root('tree')
box('tree_trunk',(0,0,.36),(.16,.16,.72),'wood',tree,.045)
for i in range(7):
    a=i*math.tau/7
    ball('tree_crown',(.25*math.cos(a),.20*math.sin(a),.78+(i%2)*.15),(.30,.27,.32),'grass',tree)
lantern=root('lantern')
ball('lantern_body',(0,0,.42),(.22,.18,.27),'scarf',lantern)
for z in [.16,.68]:box('lantern_gold_cap',(0,0,z),(.25,.22,.035),'bell',lantern,.012)
curve('lantern_cord',[(0,0,.70),(0,0,.87)],.009,'wood',lantern)
for i in range(4):curve('lantern_tassel',[(0,0,.15),((i-1.5)*.018,0,.02)],.012,'bell',lantern)

scene=bpy.context.scene;scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.view_settings.exposure=.25
for collection in ['CHAR_SHEEP','CHAR_DOG']:bpy.data.collections[collection].hide_render=True
COL.hide_render=False
for ob in COL.objects:ob.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=str(DEST/'farm_master_v2.blend'))
report={'status':'SOURCE_EDITED_RENDER_REVIEW_PENDING','source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'retained_props':['hay_tray','fence_segment','hurdle','clover_outer','clover_core','grass_tile','dirt_tile','barn','gate_marker','flower','shadow_contact'],'additional_props':['bush','tree','lantern'],'rule_geometry_changes':False,'master':'art-source/v2/farm_master_v2.blend'}
(DEST/'farm-source-diff.json').write_text(json.dumps(report,indent=2)+'\n')
print('FARM_V2_SOURCE_COMPLETE')
