"""Two-frame R2f body study: four explicit surface bands of oriented spiral fleece bundles."""
import bpy,math,json,hashlib,time
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2f';V.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=R/'art-source/r2/r2e/sheep_master_r2e.blend';old=sha(source);bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects
for q in o:
    if q.animation_data:q.animation_data_clear()
    if q.name=='R2_fused_body' or q.name.startswith('R2e surface-flow fibers R2_fused_body'):q.hide_render=True
base=o['body_wool'];base.hide_render=False;base.location=(0,-.08,.55);base.scale=(.43,.39,.43)
for m in list(base.modifiers):
    if m.type=='PARTICLE_SYSTEM':base.modifiers.remove(m)
wool=bpy.data.materials['wool'];bundles=[]
def bundle(row,index,count,z,rx,ry,sx,sy,offset):
    theta=(index+offset)/count*math.tau
    center=Vector((rx*math.cos(theta),-.08+ry*math.sin(theta),z))
    # Normal of the actual elliptic body, with a weak downward rake at the lower bands.
    normal=Vector((math.cos(theta)/.43,math.sin(theta)/.39,(z-.55)/(.43*.43))).normalized()
    across=Vector((-math.sin(theta),math.cos(theta),0)).normalized();flow=normal.cross(across).normalized()
    if flow.z<0:flow=-flow
    phase=theta+.75*row;U=64;W=16;vv=[];ff=[]
    def point(r,a):
        # The ridge follows an eccentric spiral over a convex cap; this is not a scaled sphere.
        edge=1+.07*math.sin(3*a+phase)+.035*math.cos(5*a-phase)
        xx=sx*r*math.cos(a)*edge+sx*.10*r*(1-r)*math.cos(phase)
        yy=sy*r*math.sin(a)*edge
        delta=math.atan2(math.sin(a-(phase+math.tau*1.05*r)),math.cos(a-(phase+math.tau*1.05*r)))
        ridge=.018*math.exp(-(delta/.34)**2)*math.sin(r*math.pi)
        hh=.063*max(0,1-r*r)**.70+ridge
        return center+across*xx+flow*yy+normal*hh
    for k in range(W+1):
        r=k/W
        for j in range(U):vv.append(point(r,j/U*math.tau))
    for k in range(W):
        for j in range(U):ff.append((k*U+j,k*U+(j+1)%U,(k+1)*U+(j+1)%U,(k+1)*U+j))
    # Close the root under the body surface so all lighting comes from actual thickness.
    bottom=len(vv);vv.append(center-normal*.025)
    for j in range(U):ff.append((W*U+j,W*U+(j+1)%U,bottom))
    me=bpy.data.meshes.new('R2f spiral bundle control surface');me.from_pydata(vv,[],ff);me.update();q=bpy.data.objects.new('R2f_band%d_bundle%02d'%(row,index),me);bpy.context.scene.collection.objects.link(q);q.parent=o['sheep_body_ctrl'];me.materials.append(wool)
    for p in me.polygons:p.use_smooth=True
    # 120 deterministic short fibers per bundle, curving along the same polar flow field.
    curve=bpy.data.curves.new(q.name+' flow fibers','CURVE');curve.dimensions='3D';curve.bevel_depth=.001;curve.bevel_resolution=1
    for aindex in range(120):
        r=.12+.82*((aindex*.61803398875)%1);a=(aindex*.38196601125%1)*math.tau
        start=point(r,a);tangent=(across*(-math.sin(a))+flow*math.cos(a)).normalized();sp=curve.splines.new('POLY');sp.points.add(3)
        for j,p in enumerate(sp.points):
            t=j/3;v=start+tangent*.011*t+normal*(.001+.003*math.sin(t*math.pi*.8));p.co=(*v,1);p.radius=1-.87*t
    ob=bpy.data.objects.new(curve.name,curve);bpy.context.scene.collection.objects.link(ob);ob.parent=o['sheep_body_ctrl'];curve.materials.append(wool)
    return q
# Four staggered body-surface zones; no independent random placement or colors.
bands=[(.80,.33,.31,9,.135,.115,.10),(.62,.415,.375,10,.145,.13,.55),(.42,.405,.36,10,.145,.125,.03),(.255,.29,.255,8,.13,.11,.52)]
for row,(z,rx,ry,n,sx,sy,offset) in enumerate(bands):
    for index in range(n):bundles.append(bundle(row,index,n,z,rx,ry,sx,sy,offset))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=96;s.cycles.use_denoising=True;s.render.resolution_x=s.render.resolution_y=512;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type='CUDA';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='CUDA'
    s.cycles.device='GPU' if any(d.use and d.type=='CUDA' for d in prefs.devices) else 'CPU'
except Exception:s.cycles.device='CPU'
root=o['sheep_root'];root.rotation_euler=(0,0,0);root.scale=(1,1,1);o['sheep_head_ctrl'].location=(0,0,0);o['sheep_head_ctrl'].rotation_euler=(0,0,0);s.camera=o['side_v1'];dest=V/'sheep_master_r2f.blend';bpy.ops.wm.save_as_mainfile(filepath=str(dest))
cam=s.camera.copy();cam.data=cam.data.copy();s.collection.objects.link(cam);cam.name='R2f_review_close';cam.location=(0,-6,2.2);cam.rotation_euler=(Vector((0,0,.70))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.05;rows=[]
for label in ['front','stack']:
    if label=='front':s.camera=cam;root.rotation_euler.z=math.pi
    else:
        s.camera=o['side_v1'];root.rotation_euler.z=-math.pi/2;root.scale=(.93,)*3;o['sheep_body_ctrl'].location.z=-.012;o['sheep_head_ctrl'].location=(0,-.055,-.265);o['sheep_head_ctrl'].rotation_euler.z=-math.pi/3
        for j,q in enumerate(sorted([q for q in o if q.name.startswith('sheep_leg_')],key=lambda q:q.name)):q.rotation_euler.x=.70 if j%2 else -.70
    path=V/f'sheep_{label}_512.png';s.render.filepath=str(path);t=time.time();bpy.ops.render.render(write_still=True);rows.append({'path':path.relative_to(R).as_posix(),'sha256':sha(path),'seconds':round(time.time()-t,3),'camera':s.camera.name})
assert sha(source)==old
(V/'sample-report.json').write_text(json.dumps({'version':'R2f-surface-band-two-frame','status':'REVIEW','production_art_accepted':False,'source':source.relative_to(R).as_posix(),'source_sha256':old,'mother':dest.relative_to(R).as_posix(),'mother_sha256':sha(dest),'outputs':rows,'body_bands':4,'oriented_spiral_bundles':len(bundles),'bundle_fibers':len(bundles)*120,'preserved':'E face/horns/crown/warm light; fixed root and formal camera','unproduced':'Any extra view or action'},indent=2),encoding='utf-8');print('R2F_TWO_COMPLETE',flush=True)
