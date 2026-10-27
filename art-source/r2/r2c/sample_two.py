"""Two-frame R2c sculpt experiment only; R2a remains immutable."""
import bpy,math,json,time,hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2c';V.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=R/'art-source/r2/sheep_master_r2a.blend';old=sha(source)
bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects
# Remove the merged helmet and restore a reduced back-of-head volume.
o['R2_fused_crown'].hide_render=True
head=o['head_wool'];head.hide_render=False;head.location=(0,.285,.96);head.scale=(.36,.285,.305)
for q in o:
    if q.name.startswith(('R2_horn_','v4_head_plush_','forelock_')):q.hide_render=True
face=o['face'];face.location=(0,.535,.925);face.scale=(.382,.265,.355)
for side in [-1,1]:
    eye=o['eye_'+str(side)];eye.location=(side*.145,.784,.977);eye.scale=(.050,.029,.061)
    glint=o['eye_glint_'+str(side)];glint.location=(side*.145-.010,.809,.997)
    cheek=o['peach_cheek_'+str(side)];cheek.location=(side*.238,.754,.886);cheek.scale=(.061,.010,.034)
o['nose'].location=(0,.817,.902);o['nose'].scale=(.046,.025,.031)
for side in [-1,1]:
    for p,co in zip(o['smile_'+str(side)].data.splines[0].bezier_points,[(0,.807,.877),(side*.03,.802,.855),(side*.063,.789,.877)]):p.co=co
def puff(name,loc,size):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc);q=bpy.context.object;q.name=name;q.scale=size;q.parent=o['sheep_head_ctrl'];q.data.materials.append(bpy.data.materials['wool'])
    for p in q.data.polygons:p.use_smooth=True
    return q
# Crown frame is behind the face and thinner; asymmetric cloud masses leave brow open.
for i,(x,y,z,s) in enumerate([(-.275,.56,1.18,.105),(-.15,.61,1.225,.112),(-.015,.63,1.255,.118),(.12,.61,1.235,.11),(.255,.56,1.18,.101),(-.33,.49,1.06,.093),(.33,.49,1.06,.09)]):
    puff('R2c_crown_%02d'%i,(x,y,z),(s,s*.90,s*.94))
for i,(x,y,z,s) in enumerate([(-.22,.20,1.23,.12),(0,.16,1.27,.13),(.22,.20,1.23,.12),(0,.04,1.12,.13)]):puff('R2c_back_crown_%02d'%i,(x,y,z),(s,s,s))
def horn(side):
    N=140;M=20;verts=[];faces=[]
    def center(t):
        a=math.pi+t*2.35*math.pi;r=.195*(1-.82*t)
        return Vector((side*(.45+r*math.cos(a)),.49+.012*math.sin(a),1.075+r*math.sin(a)))
    for i in range(N+1):
        t=i/N;c=center(t);tan=(center(min(1,t+.001))-center(max(0,t-.001))).normalized();n=tan.cross(Vector((0,1,0))).normalized();bi=tan.cross(n).normalized()
        radius=(.09-.047*t)*(1-.07*(.5+.5*math.cos(t*math.tau*11)))
        for j in range(M):a=j/M*math.tau;verts.append(c+radius*(n*math.cos(a)+bi*math.sin(a)))
    for i in range(N):
        for j in range(M):faces.append((i*M+j,i*M+(j+1)%M,(i+1)*M+(j+1)%M,(i+1)*M+j))
    faces.extend([tuple(range(M-1,-1,-1)),tuple(N*M+j for j in range(M))])
    me=bpy.data.meshes.new('R2c spiral mesh');me.from_pydata(verts,[],faces);me.update();q=bpy.data.objects.new('R2c_horn_'+str(side),me);bpy.context.scene.collection.objects.link(q);q.parent=o['sheep_head_ctrl'];me.materials.append(bpy.data.materials['horn'])
    for p in me.polygons:p.use_smooth=True
for side in [-1,1]:horn(side)
# Warm peach remains materially separate from cream fleece.
p=bpy.data.materials['face'].node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,.73,.43,1);p.inputs['Subsurface Weight'].default_value=.13
p=bpy.data.materials['horn'].node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.65,.32,.105,1);p.inputs['Roughness'].default_value=.46
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.use_denoising=True;s.render.resolution_x=s.render.resolution_y=512;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True
s.view_settings.exposure=.55
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type='CUDA';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='CUDA'
    s.cycles.device='GPU' if any(d.type=='CUDA' and d.use for d in prefs.devices) else 'CPU'
except Exception:s.cycles.device='CPU'
root=o['sheep_root'];root.rotation_euler=(0,0,0);root.scale=(1,1,1);o['sheep_head_ctrl'].location=(0,0,0);o['sheep_head_ctrl'].rotation_euler=(0,0,0)
s.camera=o['side_v1'];dest=V/'sheep_master_r2c.blend';bpy.ops.wm.save_as_mainfile(filepath=str(dest))
cam=s.camera.copy();cam.data=cam.data.copy();s.collection.objects.link(cam);cam.name='R2c_review_close';cam.location=(0,-6,2.2);cam.rotation_euler=(Vector((0,0,.70))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.05
rows=[]
for label in ['front','stack']:
    if label=='front':s.camera=cam;root.rotation_euler.z=math.pi
    else:
        s.camera=o['side_v1'];root.rotation_euler.z=-math.pi/2;root.scale=(.93,)*3;o['sheep_body_ctrl'].location.z=-.012;o['sheep_head_ctrl'].location=(0,-.055,-.265);o['sheep_head_ctrl'].rotation_euler.z=-math.pi/3
        for j,q in enumerate(sorted([q for q in o if q.name.startswith('sheep_leg_')],key=lambda q:q.name)):q.rotation_euler.x=.70 if j%2 else -.70
    path=V/f'sheep_{label}_512.png';s.render.filepath=str(path);t=time.time();bpy.ops.render.render(write_still=True);rows.append({'path':path.relative_to(R).as_posix(),'sha256':sha(path),'seconds':round(time.time()-t,3),'camera':s.camera.name,'root':list(root.rotation_euler),'head_yaw':o['sheep_head_ctrl'].rotation_euler.z})
assert sha(source)==old
(V/'sample-report.json').write_text(json.dumps({'version':'R2c-two-frame','status':'REVIEW','production_art_accepted':False,'source_sha256':old,'source':str(source.relative_to(R)),'mother':str(dest.relative_to(R)),'mother_sha256':sha(dest),'outputs':rows,'missing':'All other frames intentionally not generated; no production manifest change'},indent=2),encoding='utf-8')
print('R2C_TWO_FRAMES_COMPLETE',flush=True)
