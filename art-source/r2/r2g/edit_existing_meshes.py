"""Recovery G: edit the actual F2 cages, weld existing roots, sculpt only concave seams.
Only two original views. Source F2, rule geometry, lights and production cameras stay immutable.
"""
import bpy,math,json,hashlib,time
from pathlib import Path
from mathutils import Vector,Quaternion
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2g';O=R/'output/r2-20261027/recovery-g'
V.mkdir(exist_ok=True);O.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def xyz(v):return [round(float(x),7) for x in v]
source=R/'art-source/r2/r2f2/sheep_master_r2f2.blend';oldhash=sha(source)
bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects;scene=bpy.context.scene
evidence={'source':source.relative_to(R).as_posix(),'source_sha256':oldhash,'operations':[]}
for q in o:
    if q.animation_data:q.animation_data_clear()
# 1. Actual 640-vertex face cage: round the lower cheek/chin down, reduce side width,
# and move the central muzzle surface forward. No whole-object anisotropic image scaling.
face=o['R2d_face_control_surface'];samples=[];count=0
for v in face.data.vertices:
    before=v.co.copy();x,y,z=before;front=max(0,min(1,(y-.45)/.29))
    lower=math.exp(-((z-.845)/.105)**2)
    v.co.x=x*(1-.052*front)
    v.co.z=z-.047*lower
    v.co.y=y+.026*math.exp(-(x/.19)**2-((z-.93)/.15)**2)*front
    if (v.co-before).length>.000001:
        count+=1
        if len(samples)<16 and v.index%19==0:samples.append({'vertex':v.index,'before':xyz(before),'after':xyz(v.co),'delta':xyz(v.co-before)})
face.data.update();evidence['operations'].append({'operation':'local existing face-cage vertex sculpt','vertices_moved':count,'total_vertices':len(face.data.vertices),'samples':samples})
for side in [-1,1]:
    eye=o['eye_'+str(side)];eye.location.x*=.97;eye.location.y+=.012
    glint=o['eye_glint_'+str(side)];glint.location.x*=.97;glint.location.y+=.012
    smile=o['R2d_smile_'+str(side)]
    for p in smile.data.splines[0].bezier_points:p.co.y+=.025;p.co.z-=.018
for v in o['R2d_heart_nose'].data.vertices:v.co.y+=.025;v.co.z-=.014
# 2. Existing horn cross-sections, same vertex count and turn count.
# Pull the final 56 existing rings into the front center and thicken their short inner coil.
for side in [-1,1]:
    horn=o['R2e_horn_'+str(side)];mesh=horn.data;M=24;N=len(mesh.vertices)//M-1;sections=[]
    for i in range(145,N+1):
        vertices=[mesh.vertices[i*M+j] for j in range(M)];center=sum((v.co.copy() for v in vertices),Vector())/M
        radius=sum((v.co-center).length for v in vertices)/M
        t=(i-145)/(N-145);blend=t*t*(3-2*t)
        target=Vector((side*.431,.665,1.095));newcenter=center.lerp(target,blend)
        targetradius=radius*(1-blend)+.035*blend
        if i>N-4:targetradius*=max(.12,(N-i+1)/5)**.6
        before=vertices[0].co.copy()
        for v in vertices:
            offset=v.co-center
            # A front/back flatter oval retains readable inner volume in the formal side view.
            offset*=targetradius/max(radius,.000001);offset.y*=.88
            v.co=newcenter+offset
        if i in [145,160,175,190,197,N]:sections.append({'ring':i,'before_center':xyz(center),'after_center':xyz(newcenter),'before_mean_radius':radius,'target_mean_radius':targetradius,'vertex':vertices[0].index,'before_vertex':xyz(before),'after_vertex':xyz(vertices[0].co)})
    mesh.update();evidence['operations'].append({'operation':'direct existing horn inner-section displacement / cross-section correction','side':side,'vertices_total_unchanged':len(mesh.vertices),'sections_edited':N-145+1,'turn_count_unchanged':True,'section_samples':sections})
# 3. Direct per-bundle center, normal and intersection edit. Explicit stagger pattern
# breaks the visible latitude seams; there is no random placement or new tuft generation.
bundles=sorted([q for q in o if q.name.startswith('R2f2_band') and q.type=='MESH'],key=lambda q:q.name)
zpattern=[-.046,.028,.055,-.022,.039,-.052,.013,.033,-.031,.017]
bodyrecords=[]
for q in bundles:
    row=int(q.name.split('band')[1][0]);index=int(q.name.split('bundle')[1][:2]);verts=q.data.vertices
    top=sum((verts[j].co.copy() for j in range(64)),Vector())/64;bottom=verts[-1].co.copy();normal=(top-bottom).normalized();center=bottom+normal*.025
    tangent=Vector((-normal.y,normal.x,0)).normalized();flow=normal.cross(tangent).normalized()
    if flow.z<0:flow=-flow
    dz=zpattern[(index+row*3)%len(zpattern)]
    offset=tangent*(.025*math.sin(index*1.7+row)) + Vector((0,0,dz)) + normal*(.008*math.cos(index*2.1+row))
    rotation=Quaternion(normal,math.radians([-19,11,24,-13,7,18,-22,15,4,-9][(index+row)%10]))
    stretch=1+[-.07,.04,.09,-.03,.055,-.06,.015][(index+2*row)%7]
    def edit(co):
        relative=co-center
        # Selectively alter the existing tangent-plane span, preserving radial depth.
        across=relative.dot(tangent);along=relative.dot(flow);depth=relative.dot(normal)
        shaped=tangent*(across*stretch)+flow*(along*(2-stretch))+normal*depth
        return center+offset+rotation@shaped
    ids=[0,192,512,832,len(verts)-1];samples=[]
    for v in verts:
        before=v.co.copy();v.co=edit(before)
        if v.index in ids:samples.append({'vertex':v.index,'before':xyz(before),'after':xyz(v.co)})
    q.data.update()
    # Move the existing bundle fiber roots with their exact cage transformation.
    fiber=next((f for f in o if f.type=='CURVE' and f.name.startswith(q.name+' flow fibers')),None)
    if fiber:
        for sp in fiber.data.splines:
            for p in sp.points:p.co=(*edit(Vector(p.co[:3])),1)
    bodyrecords.append({'object':q.name,'before_center':xyz(center),'after_center':xyz(center+offset),'before_normal':xyz(normal),'z_displacement':dz,'tangent_span_factor':stretch,'vertex_samples':samples})
evidence['operations'].append({'operation':'37 existing bundle local cage displacement / twist / span sculpt','bundles_edited':len(bundles),'new_bundles':0,'records':bodyrecords})
# Weld roots of edited copies plus the existing body volume, retaining all original cages hidden.
copies=[]
for original in [o['body_wool'],*bundles]:
    copy=original.copy();copy.data=original.data.copy();scene.collection.objects.link(copy);copy.parent=None;copy.matrix_world=original.matrix_world.copy();copy.hide_render=False
    for m in list(copy.modifiers):copy.modifiers.remove(m)
    copies.append(copy);original.hide_render=True
bpy.ops.object.select_all(action='DESELECT')
for q in copies:q.select_set(True)
bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();body=copies[0];body.name='R2g_welded_existing_fleece'
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
remesh=body.modifiers.new('R2g root-zone voxel weld','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.010;remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
body.parent=o['sheep_body_ctrl'];mesh=body.data
adj=[set() for _ in mesh.vertices]
for edge in mesh.edges:a,b=edge.vertices;adj[a].add(b);adj[b].add(a)
smoothed=set();displacements=[];firstsamples=[]
for iteration in range(7):
    mesh.update();positions=[v.co.copy() for v in mesh.vertices];updates=[]
    for v in mesh.vertices:
        neighbors=adj[v.index]
        if len(neighbors)<3:continue
        average=sum((positions[j] for j in neighbors),Vector())/len(neighbors);lap=average-positions[v.index]
        concavity=lap.dot(v.normal)
        # Convex bundle crests are preserved; only actual concave root seam vertices move.
        if concavity>.00028 and lap.length<.025:
            delta=lap*.48;updates.append((v.index,positions[v.index]+delta));smoothed.add(v.index);displacements.append(delta.length)
            if iteration==0 and len(firstsamples)<18:firstsamples.append({'vertex':v.index,'before':xyz(v.co),'after':xyz(v.co+delta),'concavity':concavity})
    for index,co in updates:mesh.vertices[index].co=co
mesh.update()
for p in mesh.polygons:p.use_smooth=True
evidence['operations'].append({'operation':'existing-root voxel weld + concavity-selected Laplacian seam sculpt','voxel_size':.010,'welded_vertices':len(mesh.vertices),'iterations':7,'unique_concave_seam_vertices_moved':len(smoothed),'max_single_step_displacement':max(displacements,default=0),'convex_crests_not_selected':True,'samples':firstsamples})
# Same light, exposure, color management and original formal camera as F2.
scene.render.engine='CYCLES';scene.cycles.samples=96;scene.cycles.use_denoising=True;scene.render.resolution_x=scene.render.resolution_y=512;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type='CUDA';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='CUDA'
    scene.cycles.device='GPU' if any(d.use and d.type=='CUDA' for d in prefs.devices) else 'CPU'
except Exception:scene.cycles.device='CPU'
root=o['sheep_root'];root.rotation_euler=(0,0,0);root.scale=(1,1,1);o['sheep_head_ctrl'].location=(0,0,0);o['sheep_head_ctrl'].rotation_euler=(0,0,0);scene.camera=o['side_v1']
dest=V/'sheep_master_r2g.blend';bpy.ops.wm.save_as_mainfile(filepath=str(dest))
cam=scene.camera.copy();cam.data=cam.data.copy();scene.collection.objects.link(cam);cam.name='R2g_review_close';cam.location=(0,-6,2.2);cam.rotation_euler=(Vector((0,0,.70))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.05;rows=[]
for label in ['front','stack']:
    if label=='front':scene.camera=cam;root.rotation_euler.z=math.pi
    else:
        scene.camera=o['side_v1'];root.rotation_euler.z=-math.pi/2;root.scale=(.93,)*3;o['sheep_body_ctrl'].location.z=-.012;o['sheep_head_ctrl'].location=(0,-.055,-.265);o['sheep_head_ctrl'].rotation_euler.z=-math.pi/3
        for j,q in enumerate(sorted([q for q in o if q.name.startswith('sheep_leg_')],key=lambda q:q.name)):q.rotation_euler.x=.70 if j%2 else -.70
    path=V/f'sheep_{label}_512.png';scene.render.filepath=str(path);start=time.time();bpy.ops.render.render(write_still=True);rows.append({'path':path.relative_to(R).as_posix(),'sha256':sha(path),'seconds':round(time.time()-start,3),'camera':scene.camera.name,'camera_location':list(scene.camera.location),'ortho_scale':scene.camera.data.ortho_scale,'exposure':scene.view_settings.exposure})
assert sha(source)==oldhash
evidence.update({'mother':dest.relative_to(R).as_posix(),'mother_sha256':sha(dest),'outputs':rows,'production_art_accepted':False,'art_signoff':None})
(V/'mesh-edit-evidence.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8');(O/'mesh-edit-evidence.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
report={'version':'R2g-direct-cage-and-seam-recovery','status':'REVIEW','production_art_accepted':False,'art_signoff':None,'source':source.relative_to(R).as_posix(),'source_sha256':oldhash,'mother':dest.relative_to(R).as_posix(),'mother_sha256':sha(dest),'outputs':rows,'scope':'two original static views only; formal camera/pivot/root unchanged; no production registration','evidence':'art-source/r2/r2g/mesh-edit-evidence.json'}
(V/'sample-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('R2G_TWO_FRAMES_COMPLETE',flush=True)
