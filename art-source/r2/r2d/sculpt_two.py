"""R2d structural two-view study: control-surface face, arc-length horn, tiered fleece.
Reads C unchanged. No runtime registration, full atlas or new direction production.
"""
import bpy,math,json,hashlib,time,random
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2d';V.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=R/'art-source/r2/r2c/sheep_master_r2c.blend';sourcehash=sha(source)
bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects
for q in o:
    if q.animation_data:q.animation_data_clear()
    if q.name.startswith(('R2c_horn_','R2c_crown_','R2c_back_crown_')) or q.name in ['face','nose','smile_-1','smile_1','peach_cheek_-1','peach_cheek_1']:q.hide_render=True
# A short, broad cheek/chin profile, independently controlled rather than a scaled sphere.
rings=[(.735,.025,.025,.515),(.765,.16,.09,.53),(.80,.255,.145,.54),(.86,.315,.187,.54),(.94,.345,.22,.535),(1.025,.348,.225,.52),(1.10,.32,.21,.495),(1.17,.265,.17,.465),(1.225,.17,.12,.43),(1.25,.025,.025,.415)]
def profile(z):
    for a,b in zip(rings,rings[1:]):
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0]);return tuple(a[j]+(b[j]-a[j])*t for j in [1,2,3])
    return rings[0][1:] if z<rings[0][0] else rings[-1][1:]
def surface(x,z):
    rx,ry,cy=profile(z);return cy+ry*math.sqrt(max(0,1-(x/rx)**2))+.018*math.exp(-((abs(x)-.22)/.11)**2-((z-.90)/.09)**2)
verts=[];faces=[];M=64
for z,rx,ry,cy in rings:
    for j in range(M):
        a=j/M*math.tau;x=rx*math.cos(a);y=cy+ry*math.sin(a)
        y+=.022*math.exp(-((abs(x)-.22)/.10)**2-((z-.90)/.09)**2)*max(0,math.sin(a))
        verts.append((x,y,z))
for i in range(len(rings)-1):
    for j in range(M):faces.append((i*M+j,i*M+(j+1)%M,(i+1)*M+(j+1)%M,(i+1)*M+j))
faces.extend([tuple(range(M-1,-1,-1)),tuple((len(rings)-1)*M+j for j in range(M))])
mesh=bpy.data.meshes.new('R2d ten-ring cheek chin control cage');mesh.from_pydata(verts,[],faces);mesh.update()
face=bpy.data.objects.new('R2d_face_control_surface',mesh);bpy.context.scene.collection.objects.link(face);face.parent=o['sheep_head_ctrl']
for p in mesh.polygons:p.use_smooth=True
sub=face.modifiers.new('R2d editable cheek curvature','SUBSURF');sub.levels=2;sub.render_levels=2
attribute=mesh.color_attributes.new(name='R2d_skin_blush',type='FLOAT_COLOR',domain='CORNER')
for loop in mesh.loops:
    x,y,z=mesh.vertices[loop.vertex_index].co;_,_,cy=profile(z)
    blush=.58*math.exp(-((abs(x)-.235)/.075)**2-((z-.90)/.052)**2)*max(0,min(1,(y-cy)*8))
    base=(1,.76,.49);pink=(1,.32,.20);attribute.data[loop.index].color=tuple(base[k]*(1-blush)+pink[k]*blush for k in range(3))+(1,)
skin=bpy.data.materials.new('R2d peach cloth skin with integrated blush');skin.use_nodes=True;n=skin.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.7;p.inputs['Subsurface Weight'].default_value=.12
attr=n.new('ShaderNodeVertexColor');attr.layer_name='R2d_skin_blush';skin.node_tree.links.new(attr.outputs['Color'],p.inputs['Base Color']);face.data.materials.append(skin)
for side in [-1,1]:
    z=1.012;x=side*.148;o['eye_'+str(side)].location=(x,surface(x,z)+.014,z);o['eye_'+str(side)].scale=(.043,.027,.052)
    o['eye_glint_'+str(side)].location=(x-.009,surface(x,z)+.038,z+.017)
# Bevelled inverted heart nose has its own volume; mouth rests on the actual cheek surface.
outline=[(-.041,.012),(-.036,.029),(-.012,.031),(0,.022),(.012,.031),(.036,.029),(.041,.012),(.012,-.017),(0,-.024),(-.012,-.017)]
v=[];f=[];ny=surface(0,.934)+.012
for y in [ny,ny+.028]:
    for x,z in outline:v.append((x,y,.934+z))
L=len(outline);f=[tuple(range(L-1,-1,-1)),tuple(L+j for j in range(L))]+[(j,(j+1)%L,L+(j+1)%L,L+j) for j in range(L)]
me=bpy.data.meshes.new('R2d nose volume');me.from_pydata(v,[],f);me.update();q=bpy.data.objects.new('R2d_heart_nose',me);bpy.context.scene.collection.objects.link(q);q.parent=o['sheep_head_ctrl'];q.data.materials.append(bpy.data.materials['nose'])
be=q.modifiers.new('soft nose edge','BEVEL');be.width=.009;be.segments=4;q.modifiers.new('soft normals','WEIGHTED_NORMAL')
def curve(name,points,depth,material):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=depth;data.bevel_resolution=4;sp=data.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for p,co in zip(sp.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
    q=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(q);q.parent=o['sheep_head_ctrl'];data.materials.append(bpy.data.materials[material]);return q
for side in [-1,1]:
    pts=[]
    for x,z in [(0,.911),(side*.005,.886),(side*.030,.875),(side*.060,.891)]:pts.append((x,surface(x,z)+.012,z))
    curve('R2d_smile_'+str(side),pts,.007,'hoof')
# Horn cross-section follows arc length; a shrinking spiral ends in an exposed curl.
def make_horn(side):
    N=190;M=24;centers=[]
    for i in range(N+1):
        t=i/N;a=math.pi*.83+t*math.pi*2.23;r=.205*(1-.83*t)
        centers.append(Vector((side*(.43+r*math.cos(a)),.44+.065*t,1.105+r*math.sin(a))))
    lengths=[0.]
    for a,b in zip(centers,centers[1:]):lengths.append(lengths[-1]+(b-a).length)
    vv=[];ff=[]
    for i,c in enumerate(centers):
        t=i/N;tan=(centers[min(N,i+1)]-centers[max(0,i-1)]).normalized();normal=tan.cross(Vector((0,1,0))).normalized();bi=tan.cross(normal).normalized()
        arc=lengths[i]/lengths[-1];seam=(.5+.5*math.cos(arc*math.tau*10))**12
        radius=(.085*(1-t)**.45+.006)*(1-.16*seam)
        if i>N-10:radius*=max(.08,(N-i)/10)**.45
        for j in range(M):
            a=j/M*math.tau;oval=1+.05*math.cos(2*a);vv.append(c+radius*oval*(normal*math.cos(a)+bi*math.sin(a)))
    for i in range(N):
        for j in range(M):ff.append((i*M+j,i*M+(j+1)%M,(i+1)*M+(j+1)%M,(i+1)*M+j))
    ff.extend([tuple(range(M-1,-1,-1)),tuple(N*M+j for j in range(M))])
    me=bpy.data.meshes.new('R2d arc length horn control surface');me.from_pydata(vv,[],ff);me.update();q=bpy.data.objects.new('R2d_horn_'+str(side),me);bpy.context.scene.collection.objects.link(q);q.parent=o['sheep_head_ctrl'];me.materials.append(bpy.data.materials['horn'])
    for poly in me.polygons:poly.use_smooth=True
for side in [-1,1]:make_horn(side)
# Three structural scales: retained large body, hand-distributed crown/mid coils, fine directional fibers.
def tuft(name,loc,size):
    # An irregular lobed closed surface, not an ellipsoid primitive.
    vv=[];ff=[];U=32;W=18
    for k in range(W+1):
        theta=math.pi*k/W
        for j in range(U):
            a=j/U*math.tau;mod=1+.06*math.sin(3*a+theta*2)+.04*math.cos(5*a-theta*3)
            vv.append((size[0]*math.sin(theta)*math.cos(a)*mod,size[1]*math.sin(theta)*math.sin(a)*mod,size[2]*math.cos(theta)*mod))
    for k in range(W):
        for j in range(U):ff.append((k*U+j,k*U+(j+1)%U,(k+1)*U+(j+1)%U,(k+1)*U+j))
    me=bpy.data.meshes.new(name+'control');me.from_pydata(vv,[],ff);me.update();q=bpy.data.objects.new(name,me);bpy.context.scene.collection.objects.link(q);q.location=loc;q.parent=o['sheep_head_ctrl'];me.materials.append(bpy.data.materials['wool'])
    for p in me.polygons:p.use_smooth=True
    sub=q.modifiers.new('soft lobed continuity','SUBSURF');sub.levels=sub.render_levels=1
    return q
for i,(x,y,z,s) in enumerate([(-.27,.53,1.18,.115),(-.14,.57,1.235,.13),(.015,.57,1.26,.14),(.16,.54,1.22,.126),(.28,.48,1.16,.105),(-.32,.45,1.03,.105),(.32,.43,1.04,.11),(-.27,.20,1.25,.14),(0,.14,1.30,.15),(.24,.18,1.26,.14)]):tuft('R2d_crown_%02d'%i,(x,y,z),(s,s*.83,s*.93))
wool=bpy.data.materials['wool'];p=wool.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,.94,.80,1);p.inputs['Roughness'].default_value=.96;p.inputs['Sheen Weight'].default_value=.6
# A high-frequency anisotropic noise chain supplies cloth/fleece normals, rather than gray macro spots.
nodes=wool.node_tree.nodes;links=wool.node_tree.links;tc=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(85,85,240);links.new(tc.outputs['Generated'],mapping.inputs[0]);noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1;noise.inputs['Detail'].default_value=2;links.new(mapping.outputs['Vector'],noise.inputs['Vector']);bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.004;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=96;s.cycles.use_denoising=True;s.render.resolution_x=s.render.resolution_y=512;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.exposure=.5
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type='CUDA';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='CUDA'
    s.cycles.device='GPU' if any(d.use and d.type=='CUDA' for d in prefs.devices) else 'CPU'
except Exception:s.cycles.device='CPU'
root=o['sheep_root'];root.rotation_euler=(0,0,0);root.scale=(1,1,1);o['sheep_head_ctrl'].location=(0,0,0);o['sheep_head_ctrl'].rotation_euler=(0,0,0);s.camera=o['side_v1'];dest=V/'sheep_master_r2d.blend';bpy.ops.wm.save_as_mainfile(filepath=str(dest))
cam=s.camera.copy();cam.data=cam.data.copy();s.collection.objects.link(cam);cam.name='R2d_review_close';cam.location=(0,-6,2.2);cam.rotation_euler=(Vector((0,0,.70))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.05;rows=[]
for label in ['front','stack']:
    if label=='front':s.camera=cam;root.rotation_euler.z=math.pi
    else:
        s.camera=o['side_v1'];root.rotation_euler.z=-math.pi/2;root.scale=(.93,)*3;o['sheep_body_ctrl'].location.z=-.012;o['sheep_head_ctrl'].location=(0,-.055,-.265);o['sheep_head_ctrl'].rotation_euler.z=-math.pi/3
        for j,q in enumerate(sorted([q for q in o if q.name.startswith('sheep_leg_')],key=lambda q:q.name)):q.rotation_euler.x=.70 if j%2 else -.70
    path=V/f'sheep_{label}_512.png';s.render.filepath=str(path);t=time.time();bpy.ops.render.render(write_still=True);rows.append({'path':path.relative_to(R).as_posix(),'sha256':sha(path),'seconds':round(time.time()-t,3),'camera':s.camera.name})
assert sha(source)==sourcehash
(V/'sample-report.json').write_text(json.dumps({'version':'R2d-structural-two-frame','status':'REVIEW','production_art_accepted':False,'source':source.relative_to(R).as_posix(),'source_sha256':sourcehash,'mother':dest.relative_to(R).as_posix(),'mother_sha256':sha(dest),'outputs':rows,'structural_changes':['ten-ring subdivided cheek/chin cage with vertex blush','bevelled heart-nose mesh and surface-positioned mouth','arc-length horn taper/grooves','irregular multi-lobed crown control surfaces and directional fine material'],'unproduced':'All additional directions/actions; no production registration'},indent=2),encoding='utf-8')
print('R2D_STRUCTURAL_TWO_COMPLETE',flush=True)
