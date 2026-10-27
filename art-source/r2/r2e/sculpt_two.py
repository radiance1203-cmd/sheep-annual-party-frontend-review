"""R2e same two views: eccentric tuft surfaces, convergent curl, explicit surface-flow fibers."""
import bpy,math,json,hashlib,time,random
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2e';V.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=R/'art-source/r2/r2d/sheep_master_r2d.blend';old=sha(source);bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects
for q in o:
    if q.animation_data:q.animation_data_clear()
    if q.name.startswith(('R2d_horn_','R2d_crown_')):q.hide_render=True
wool=bpy.data.materials['wool'];wool.use_nodes=True;nodes=wool.node_tree.nodes;links=wool.node_tree.links
# Material audit showed no AO/color link: gray was body relief and cool low fill, not a painted gray texture.
# Remove noise-derived normal shading; explicit curve fibers carry the microstructure.
for n in list(nodes):
    if n.type not in ['BSDF_PRINCIPLED','OUTPUT_MATERIAL']:nodes.remove(n)
p=nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,.955,.84,1);p.inputs['Roughness'].default_value=.96;p.inputs['Subsurface Weight'].default_value=.10;p.inputs['Sheen Weight'].default_value=.55
body=o['R2_fused_body']
for mod in list(body.modifiers):
    if mod.type in ['PARTICLE_SYSTEM','DISPLACE']:body.modifiers.remove(mod)
def horn(side):
    N=200;M=24;centers=[]
    for i in range(N+1):
        t=i/N;a=.75*math.pi+t*2.65*math.pi;r=.205*(1-t)**1.45+.008
        centers.append(Vector((side*(.43+r*math.cos(a)),.43+.18*t,1.10+r*math.sin(a))))
    lengths=[0.]
    for a,b in zip(centers,centers[1:]):lengths.append(lengths[-1]+(b-a).length)
    vv=[];ff=[]
    for i,c in enumerate(centers):
        t=i/N;tan=(centers[min(N,i+1)]-centers[max(0,i-1)]).normalized();n=tan.cross(Vector((0,1,0))).normalized();bi=tan.cross(n).normalized()
        arc=lengths[i]/lengths[-1];seam=(.5+.5*math.cos(arc*math.tau*10))**12;radius=(.081*(1-t)**.72+.004)*(1-.13*seam)
        if i>N-9:radius*=max(.05,(N-i)/9)**.5
        for j in range(M):
            a=j/M*math.tau;vv.append(c+radius*(n*math.cos(a)+bi*math.sin(a)))
    for i in range(N):
        for j in range(M):ff.append((i*M+j,i*M+(j+1)%M,(i+1)*M+(j+1)%M,(i+1)*M+j))
    ff.extend([tuple(range(M-1,-1,-1)),tuple(N*M+j for j in range(M))]);me=bpy.data.meshes.new('R2e convergent spiral control surface');me.from_pydata(vv,[],ff);me.update();q=bpy.data.objects.new('R2e_horn_'+str(side),me);bpy.context.scene.collection.objects.link(q);q.parent=o['sheep_head_ctrl'];me.materials.append(bpy.data.materials['horn'])
    for poly in me.polygons:poly.use_smooth=True
    return q
for side in [-1,1]:horn(side)
def tuft(i,loc,size,phase):
    vv=[];ff=[];U=40;W=24
    for k in range(W+1):
        theta=math.pi*k/W
        # Eccentric swirl axes, nonmatching lobe sizes, and a leaning peak avoid the top-three-spheres silhouette.
        twist=.9*math.sin(theta)+phase
        for j in range(U):
            a=j/U*math.tau;mod=1+.08*math.sin(3*a+twist)+.04*math.cos(5*a-1.5*theta+phase)
            cx=.13*math.sin(theta)*math.cos(theta+phase);cy=.10*math.sin(theta)*math.sin(theta+phase)
            vv.append((size[0]*(math.sin(theta)*math.cos(a)*mod+cx),size[1]*(math.sin(theta)*math.sin(a)*mod+cy),size[2]*math.cos(theta)*(1+.04*math.sin(a+phase))))
    for k in range(W):
        for j in range(U):ff.append((k*U+j,k*U+(j+1)%U,(k+1)*U+(j+1)%U,(k+1)*U+j))
    me=bpy.data.meshes.new('R2e eccentric swirl tuft cage');me.from_pydata(vv,[],ff);me.update();q=bpy.data.objects.new('R2e_crown_%02d'%i,me);bpy.context.scene.collection.objects.link(q);q.location=loc;q.parent=o['sheep_head_ctrl'];me.materials.append(wool)
    for poly in me.polygons:poly.use_smooth=True
    sub=q.modifiers.new('eccentric cloud continuity','SUBSURF');sub.levels=sub.render_levels=1
    return q
tufts=[]
for i,(loc,size,phase) in enumerate([
    ((-.29,.48,1.15),(.105,.11,.11),.2),((-.19,.53,1.23),(.12,.10,.113),1.1),
    ((-.05,.54,1.26),(.145,.115,.12),2.2),((.12,.50,1.23),(.115,.105,.10),3.1),
    ((.26,.43,1.15),(.10,.12,.104),4.3),((-.31,.34,1.025),(.105,.11,.13),5.2),
    ((.31,.32,1.045),(.10,.115,.115),6.0)]):tufts.append(tuft(i,loc,size,phase))
def fibers(surface,count,seed):
    # Each strand follows a consistent tangent around the form plus its outward normal.
    # The seeded sampling chooses surface coverage only; it does not randomize strand direction/colors.
    bpy.context.view_layer.update();ev=surface.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();rng=random.Random(seed)
    data=bpy.data.curves.new('R2e surface-flow fibers '+surface.name,'CURVE');data.dimensions='3D';data.resolution_u=1;data.bevel_depth=.00115;data.bevel_resolution=1;data.resolution_v=1
    for vertex in rng.sample(list(mesh.vertices),min(count,len(mesh.vertices))):
        point=vertex.co.copy();normal=vertex.normal.normalized();tangent=Vector((-point.y,point.x,.18));tangent-=normal*tangent.dot(normal)
        if tangent.length<.001:tangent=normal.cross(Vector((1,0,0)))
        tangent.normalize();length=.013 if surface==body else .009
        spline=data.splines.new('POLY');spline.points.add(3)
        for j,p in enumerate(spline.points):
            t=j/3;v=point+normal*(.001+length*.40*math.sin(t*math.pi*.8))+tangent*(length*t);p.co=(*v,1);p.radius=1-.88*t
    ev.to_mesh_clear();q=bpy.data.objects.new(data.name,data);bpy.context.scene.collection.objects.link(q);q.parent=surface;q.data.materials.append(wool)
    return q
strands=[];strands.append(fibers(body,3500,20261027))
for i,q in enumerate(tufts):strands.append(fibers(q,450,20261028+i))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=96;s.cycles.use_denoising=True;s.cycles.max_bounces=8;s.cycles.diffuse_bounces=5
if hasattr(s.cycles,'use_fast_gi'):s.cycles.use_fast_gi=False
world=s.world;world.use_nodes=True;bg=world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(1,.96,.86,1);bg.inputs['Strength'].default_value=.35
o['fill'].data.energy=430;o['fill'].data.size=7;o['fill'].data.color=(1,.94,.82)
o['key'].data.energy=480;o['key'].data.size=5.5;o['key'].data.color=(1,.92,.80)
s.render.resolution_x=s.render.resolution_y=512;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.exposure=.4
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type='CUDA';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='CUDA'
    s.cycles.device='GPU' if any(d.use and d.type=='CUDA' for d in prefs.devices) else 'CPU'
except Exception:s.cycles.device='CPU'
root=o['sheep_root'];root.rotation_euler=(0,0,0);root.scale=(1,1,1);o['sheep_head_ctrl'].location=(0,0,0);o['sheep_head_ctrl'].rotation_euler=(0,0,0);s.camera=o['side_v1'];dest=V/'sheep_master_r2e.blend';bpy.ops.wm.save_as_mainfile(filepath=str(dest))
cam=s.camera.copy();cam.data=cam.data.copy();s.collection.objects.link(cam);cam.name='R2e_review_close';cam.location=(0,-6,2.2);cam.rotation_euler=(Vector((0,0,.70))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.05;rows=[]
for label in ['front','stack']:
    if label=='front':s.camera=cam;root.rotation_euler.z=math.pi
    else:
        s.camera=o['side_v1'];root.rotation_euler.z=-math.pi/2;root.scale=(.93,)*3;o['sheep_body_ctrl'].location.z=-.012;o['sheep_head_ctrl'].location=(0,-.055,-.265);o['sheep_head_ctrl'].rotation_euler.z=-math.pi/3
        for j,q in enumerate(sorted([q for q in o if q.name.startswith('sheep_leg_')],key=lambda q:q.name)):q.rotation_euler.x=.70 if j%2 else -.70
    path=V/f'sheep_{label}_512.png';s.render.filepath=str(path);t=time.time();bpy.ops.render.render(write_still=True);rows.append({'path':path.relative_to(R).as_posix(),'sha256':sha(path),'seconds':round(time.time()-t,3),'camera':s.camera.name})
assert sha(source)==old
(V/'sample-report.json').write_text(json.dumps({'version':'R2e-structural-two-frame','status':'REVIEW','production_art_accepted':False,'source':source.relative_to(R).as_posix(),'source_sha256':old,'mother':dest.relative_to(R).as_posix(),'mother_sha256':sha(dest),'outputs':rows,'changes':['D control-surface face preserved','7 eccentric swirl crown surfaces','spiral radius converges to .008 with forward inner endpoint','explicit surface-tangent fibers, no noise normal/color texture','warm world/fill, diffuse bounce5, fastGI off'],'explicit_strands':sum(len(q.data.splines) for q in strands),'root_reported_imagegen_blocker':'Two calls failed Windows reference-path serialization; no generated image; no API fallback used.'},indent=2),encoding='utf-8');print('R2E_TWO_COMPLETE',flush=True)
