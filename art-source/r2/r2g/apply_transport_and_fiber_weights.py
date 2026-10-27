"""G3: last20 section parallel transport and USED point-domain fleece flow/length weights.
Reads archived G2. No added mesh cage, fiber spline, view, animation or light change.
"""
import bpy,math,json,hashlib,time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2g';O=R/'output/r2-20261027/recovery-g';H=V/'history/g2'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def xyz(v):return [round(float(x),7) for x in v]
source=H/'sheep_master_r2g.blend';oldhash=sha(source);bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects;s=bpy.context.scene;hornrecords=[]
for side in [-1,1]:
    mesh=o['R2e_horn_'+str(side)].data;M=24;N=len(mesh.vertices)//M-1;first=N-19
    centers=[sum((mesh.vertices[i*M+j].co.copy() for j in range(M)),Vector())/M for i in range(N+1)]
    radii=[sum((mesh.vertices[i*M+j].co-centers[i]).length for j in range(M))/M for i in range(N+1)]
    # Smooth only the internal center tangent transition, preserving both boundary sections/end.
    newcenters=[q.copy() for q in centers]
    for iteration in range(3):
        previous=[q.copy() for q in newcenters]
        for i in range(first+2,N-1):newcenters[i]=previous[i]*.5+(previous[i-1]+previous[i+1])*.25
    prevtangent=(newcenters[first+1]-newcenters[first-1]).normalized();normal=(mesh.vertices[first*M].co-centers[first]).normalized();normal=(normal-prevtangent*normal.dot(prevtangent)).normalized();records=[]
    for i in range(first,N+1):
        tangent=(newcenters[min(N,i+1)]-newcenters[i-1]).normalized()
        if i>first:
            normal=prevtangent.rotation_difference(tangent)@normal;normal=(normal-tangent*normal.dot(tangent)).normalized()
        binormal=tangent.cross(normal).normalized();before=mesh.vertices[i*M].co.copy()
        for j in range(M):
            a=j/M*math.tau;mesh.vertices[i*M+j].co=newcenters[i]+radii[i]*(normal*math.cos(a)+binormal*math.sin(a))
        records.append({'ring':i,'before_center':xyz(centers[i]),'after_center':xyz(newcenters[i]),'radius_preserved':radii[i],'transport_tangent':xyz(tangent),'transport_normal':xyz(normal),'before_vertex0':xyz(before),'after_vertex0':xyz(mesh.vertices[i*M].co)})
        prevtangent=tangent
    mesh.update();hornrecords.append({'side':side,'first_ring':first,'last_ring':N,'vertex_count_unchanged':len(mesh.vertices),'sections':records})
body=o['R2g_welded_existing_fleece'];mesh=body.data;mesh.update();to_body=body.matrix_world.inverted();to_world=body.matrix_world
bundles=[q for q in o if q.name.startswith('R2f2_band') and q.type=='MESH'];peaks=KDTree(len(bundles))
for index,q in enumerate(bundles):
    peak=sum((q.data.vertices[j].co.copy() for j in range(64)),Vector())/64
    peaks.insert(to_body@(q.matrix_world@peak),index)
peaks.balance()
adj=[set() for _ in mesh.vertices]
for e in mesh.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
def attr(name,kind):
    return mesh.attributes.get(name) or mesh.attributes.new(name=name,type=kind,domain='POINT')
crest_attr=attr('r2g3_bundle_crest','FLOAT');root_attr=attr('r2g3_bundle_root','FLOAT');preserve_attr=attr('r2g3_shape_preserve','FLOAT');length_attr=attr('r2g3_fiber_length','FLOAT');flow_attr=attr('r2g3_fiber_flow','FLOAT_VECTOR')
weights=[];weight_samples=[]
for v in mesh.vertices:
    _,_,distance=peaks.find(v.co);crest=math.exp(-(distance/.10)**2)
    average=sum((mesh.vertices[j].co for j in adj[v.index]),Vector())/max(1,len(adj[v.index]));concavity=max(0,(average-v.co).dot(v.normal))
    root=max(0,min(1,.65*(1-crest)+.35*min(1,concavity/.002)))
    preserve=.25+.75*crest;length=.007+.010*crest
    # Downward shoulder/abdomen/haunch combing field with a weak circumferential curl.
    n=v.normal.normalized();down=Vector((0,0,-1));around=Vector((-n.y,n.x,0));flow=down+.22*around;flow-=n*flow.dot(n)
    if flow.length<.0001:flow=around if around.length>.0001 else Vector((1,0,0))
    flow.normalize();crest_attr.data[v.index].value=crest;root_attr.data[v.index].value=root;preserve_attr.data[v.index].value=preserve;length_attr.data[v.index].value=length;flow_attr.data[v.index].vector=flow
    weights.append((crest,root,preserve,length,flow))
    if v.index%3500==0:weight_samples.append({'vertex':v.index,'crest':crest,'root':root,'preserve':preserve,'length':length,'flow':xyz(flow)})
bvh=BVHTree.FromPolygons([v.co.copy() for v in mesh.vertices],[tuple(p.vertices) for p in mesh.polygons],all_triangles=False)
curves=sorted([q for q in o if q.name.startswith('R2f2_band') and q.type=='CURVE'],key=lambda q:q.name)
fiber_samples=[];changed=0;maxrootshift=0;total=0
for q in curves:
    world_matrix=q.matrix_world.copy();inverse=q.matrix_world.inverted()
    for spline_index,sp in enumerate(q.data.splines):
        total+=1;before=[world_matrix@Vector(p.co[:3]) for p in sp.points];root_local=to_body@before[0]
        nearest,normal,polygon_index,distance=bvh.find_nearest(root_local)
        if nearest is None:continue
        # Interpolate the actual stored POINT attributes at the nearest welded polygon.
        indices=list(mesh.polygons[polygon_index].vertices);iw=[1/max(.00001,(mesh.vertices[i].co-nearest).length) for i in indices];den=sum(iw)
        crest=sum(crest_attr.data[i].value*w for i,w in zip(indices,iw))/den;root=sum(root_attr.data[i].value*w for i,w in zip(indices,iw))/den;preserve=sum(preserve_attr.data[i].value*w for i,w in zip(indices,iw))/den;length=sum(length_attr.data[i].value*w for i,w in zip(indices,iw))/den
        flow=sum((flow_attr.data[i].vector*w for i,w in zip(indices,iw)),Vector())/den;flow-=normal*flow.dot(normal);flow.normalize()
        olddir=(to_body@before[-1])-root_local;olddir-=normal*olddir.dot(normal)
        if olddir.length>.000001:olddir.normalize()
        else:olddir=flow
        # Crest-preserve controls the actual bend/comb mixture, not merely a saved label.
        oldkeep=.25+.35*preserve;direction=(olddir*oldkeep+flow*(1-oldkeep)).normalized();bend=length*(.20+.45*root)*(1-.35*preserve)
        after=[]
        for j,p in enumerate(sp.points):
            t=j/(len(sp.points)-1);newlocal=nearest+normal*(.0008+bend*math.sin(t*math.pi*.85))+direction*(length*t)
            world=to_world@newlocal;p.co=(*(inverse@world),1);after.append(world)
        rootshift=(after[0]-before[0]).length;maxrootshift=max(maxrootshift,rootshift);changed+=1
        if len(fiber_samples)<24 and total%173==0:fiber_samples.append({'curve':q.name,'spline':spline_index,'nearest_polygon':polygon_index,'before_root':xyz(before[0]),'after_root':xyz(after[0]),'before_vector':xyz(before[-1]-before[0]),'after_vector':xyz(after[-1]-after[0]),'before_length':(before[-1]-before[0]).length,'applied_length_field':length,'weights':{'crest':crest,'root':root,'preserve':preserve},'applied_bend':bend,'sampled_flow':xyz(flow),'root_shift':rootshift})
assert total==4440 and changed==4440
operation={'operation':'G3 parallel transport + stored and USED fleece point attributes','source_g2':source.relative_to(R).as_posix(),'source_g2_sha256':oldhash,'horns':hornrecords,'body_vertices':len(mesh.vertices),'attributes':['r2g3_bundle_crest','r2g3_bundle_root','r2g3_shape_preserve','r2g3_fiber_length','r2g3_fiber_flow'],'weight_samples':weight_samples,'body_geometry_changed':False,'existing_fibers_before':total,'existing_fibers_after':total,'fibers_actually_remapped_and_weighted':changed,'max_root_remap_distance':maxrootshift,'fiber_before_after_samples':fiber_samples,'pixel_reference':'original local character board; cloud image identity registered by root but pixels not received/viewed'}
# Original camera/light/color from G2 preserved. Only original two static outputs rendered.
root=o['sheep_root'];root.rotation_euler=(0,0,0);root.scale=(1,1,1);o['sheep_head_ctrl'].location=(0,0,0);o['sheep_head_ctrl'].rotation_euler=(0,0,0);s.camera=o['side_v1'];dest=V/'sheep_master_r2g.blend';bpy.ops.wm.save_as_mainfile(filepath=str(dest))
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
    path=V/f'sheep_{label}_512.png';s.render.filepath=str(path);start=time.time();bpy.ops.render.render(write_still=True);rows.append({'path':path.relative_to(R).as_posix(),'sha256':sha(path),'seconds':round(time.time()-start,3),'camera':s.camera.name,'camera_location':list(s.camera.location),'ortho_scale':s.camera.data.ortho_scale,'exposure':s.view_settings.exposure})
assert sha(source)==oldhash
operation['output_g3_mother_sha256']=sha(dest);(V/'g2-g3-weight-evidence.json').write_text(json.dumps(operation,indent=2),encoding='utf-8');(O/'g2-g3-weight-evidence.json').write_text(json.dumps(operation,indent=2),encoding='utf-8')
e=json.loads((H/'mesh-edit-evidence.json').read_text());e['operations'].append(operation);e['mother_sha256']=sha(dest);e['outputs']=rows
(V/'mesh-edit-evidence.json').write_text(json.dumps(e,indent=2),encoding='utf-8');(O/'mesh-edit-evidence.json').write_text(json.dumps(e,indent=2),encoding='utf-8')
report=json.loads((H/'sample-report.json').read_text());report.update(version='R2g-g3-transport-and-applied-flow-weights',mother_sha256=sha(dest),outputs=rows,g2_source=source.relative_to(R).as_posix(),g2_source_sha256=oldhash,g2_g3_evidence='art-source/r2/r2g/g2-g3-weight-evidence.json')
(V/'sample-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('R2G_G3_TWO_FRAMES_COMPLETE',flush=True)
