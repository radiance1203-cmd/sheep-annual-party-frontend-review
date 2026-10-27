"""G2: only the last twelve existing cross-sections per horn; G1 archived unchanged."""
import bpy,math,json,hashlib,time
from pathlib import Path
from mathutils import Vector,Quaternion
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2g';O=R/'output/r2-20261027/recovery-g';H=V/'history/g1'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def xyz(v):return [round(float(x),7) for x in v]
source=H/'sheep_master_r2g.blend';oldhash=sha(source);bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects;s=bpy.context.scene;sections=[]
for side in [-1,1]:
    mesh=o['R2e_horn_'+str(side)].data;M=24;N=len(mesh.vertices)//M-1;first=N-11
    centers=[sum((mesh.vertices[i*M+j].co.copy() for j in range(M)),Vector())/M for i in range(N+1)]
    radii=[sum((mesh.vertices[i*M+j].co-centers[i]).length for j in range(M))/M for i in range(N+1)]
    newcenters={}
    for i in range(first,N+1):
        t=(i-first)/(N-first);newcenters[i]=centers[i]+Vector((-side*.015*t*t,-.015*t*t,-.006*t*t))
    for i in range(first,N+1):
        t=(i-first)/(N-first);center=centers[i];newcenter=newcenters[i]
        target=max(.0003,radii[first]*max(0,math.cos(t*math.pi/2))**.80)
        oldnormal=(mesh.vertices[i*M].co-center).cross(mesh.vertices[i*M+6].co-center).normalized()
        tangent=(newcenters[min(N,i+1)]-newcenters.get(i-1,centers[i-1])).normalized()
        if oldnormal.dot(tangent)<0:oldnormal=-oldnormal
        rotate=Quaternion().slerp(oldnormal.rotation_difference(tangent),t)
        before=mesh.vertices[i*M].co.copy()
        for j in range(M):
            v=mesh.vertices[i*M+j];v.co=newcenter+(rotate@(v.co-center))*(target/max(radii[i],.000001))
        sections.append({'side':side,'ring':i,'before_center':xyz(center),'after_center':xyz(newcenter),'before_mean_radius':radii[i],'after_target_radius':target,'before_vertex0':xyz(before),'after_vertex0':xyz(mesh.vertices[i*M].co)})
    mesh.update()
root=o['sheep_root'];root.rotation_euler=(0,0,0);root.scale=(1,1,1);o['sheep_head_ctrl'].location=(0,0,0);o['sheep_head_ctrl'].rotation_euler=(0,0,0);s.camera=o['side_v1']
dest=V/'sheep_master_r2g.blend';bpy.ops.wm.save_as_mainfile(filepath=str(dest))
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type='CUDA';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='CUDA'
    s.cycles.device='GPU' if any(d.use and d.type=='CUDA' for d in prefs.devices) else 'CPU'
except Exception:s.cycles.device='CPU'
cam=s.camera.copy();cam.data=cam.data.copy();s.collection.objects.link(cam);cam.name='R2g_review_close';cam.location=(0,-6,2.2);cam.rotation_euler=(Vector((0,0,.70))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.05;rows=[]
for label in ['front','stack']:
    if label=='front':s.camera=cam;root.rotation_euler.z=math.pi
    else:
        s.camera=o['side_v1'];root.rotation_euler.z=-math.pi/2;root.scale=(.93,)*3;o['sheep_body_ctrl'].location.z=-.012;o['sheep_head_ctrl'].location=(0,-.055,-.265);o['sheep_head_ctrl'].rotation_euler.z=-math.pi/3
        for j,q in enumerate(sorted([q for q in o if q.name.startswith('sheep_leg_')],key=lambda q:q.name)):q.rotation_euler.x=.70 if j%2 else -.70
    path=V/f'sheep_{label}_512.png';s.render.filepath=str(path);t=time.time();bpy.ops.render.render(write_still=True);rows.append({'path':path.relative_to(R).as_posix(),'sha256':sha(path),'seconds':round(time.time()-t,3),'camera':s.camera.name,'camera_location':list(s.camera.location),'ortho_scale':s.camera.data.ortho_scale,'exposure':s.view_settings.exposure})
assert sha(source)==oldhash
record={'operation':'G2 direct last12 existing horn sections per side / no added rings or vertices','source_g1':source.relative_to(R).as_posix(),'source_g1_sha256':oldhash,'output_g2_mother_sha256':sha(dest),'end_radius':.0003,'section_samples':sections,'unchanged':'face, body, all other horn rings, lights, cameras, vertex counts'}
(V/'g1-g2-tip-evidence.json').write_text(json.dumps(record,indent=2),encoding='utf-8');(O/'g1-g2-tip-evidence.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
e=json.loads((H/'mesh-edit-evidence.json').read_text());e['operations'].append(record);e['mother_sha256']=sha(dest);e['outputs']=rows
(V/'mesh-edit-evidence.json').write_text(json.dumps(e,indent=2),encoding='utf-8');(O/'mesh-edit-evidence.json').write_text(json.dumps(e,indent=2),encoding='utf-8')
report=json.loads((H/'sample-report.json').read_text());report.update(version='R2g-g2-direct-tip-recovery',mother_sha256=sha(dest),outputs=rows,g1_source=source.relative_to(R).as_posix(),g1_source_sha256=oldhash,g1_g2_evidence='art-source/r2/r2g/g1-g2-tip-evidence.json')
(V/'sample-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('R2G_G2_TWO_FRAMES_COMPLETE',flush=True)
