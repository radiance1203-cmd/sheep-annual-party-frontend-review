"""G4: only existing horn rings175..200. C1 centerline, continuous taper, dense curvature and actual triangle tests.
No new rings, turns, body/face/fiber/material/light/camera edits. G3 archived separately.
"""
import bpy,math,json,hashlib,time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import intersect_ray_tri
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2g';O=R/'output/r2-20261027/recovery-g';H=V/'history/g3'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def xyz(v):return [round(float(x),8) for x in v]
source=H/'sheep_master_r2g.blend';oldhash=sha(source);bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects;s=bpy.context.scene;records=[]
def curve(p0,p1,p2,p3,t):
    u=1-t;point=p0*u**3+p1*(3*u*u*t)+p2*(3*u*t*t)+p3*t**3
    velocity=(p1-p0)*(3*u*u)+(p2-p1)*(6*u*t)+(p3-p2)*(3*t*t)
    accel=(p2-2*p1+p0)*(6*u)+(p3-2*p2+p1)*(6*t)
    radius=velocity.length**3/max(1e-15,velocity.cross(accel).length)
    return point,velocity.normalized(),radius
def taper(t,r0,derivative,power):
    u=t*t*(3-2*t)
    return .0003+(r0-.0003)*(1-u)**power+derivative*t*(1-t)**3
def old_curvature(cs,rs,first):
    rows=[]
    for i in range(first+1,len(cs)-1):
        a,b,c=cs[i-1:i+2];ab=b-a;bc=c-b;ac=c-a;radius=ab.length*bc.length*ac.length/max(1e-15,2*ab.cross(bc).length)
        rows.append({'ring':i,'curve_radius':radius,'section_radius':rs[i],'ratio':rs[i]/radius})
    return rows
def triangle_check(mesh,first_ring):
    coords=[v.co.copy() for v in mesh.vertices];triangles=[];rings=[]
    for polygon in mesh.polygons:
        ids=list(polygon.vertices)
        for j in range(1,len(ids)-1):
            tri=(ids[0],ids[j],ids[j+1]);triangles.append(tri);rings.append(min(tri)//24)
    tree=BVHTree.FromPolygons(coords,triangles,all_triangles=True,epsilon=0.0000001);pairs=tree.overlap(tree);checked=0;hits=[]
    for a,b in pairs:
        if a>=b or max(rings[a],rings[b])<first_ring:continue
        ia,ib=triangles[a],triangles[b]
        if set(ia)&set(ib):continue
        # Discard immediate longitudinal neighbors whose boundaries are intended to meet.
        if abs(rings[a]-rings[b])<2:continue
        checked+=1;ta=[coords[i] for i in ia];tb=[coords[i] for i in ib];found=False
        for start_tri,target_tri in [(ta,tb),(tb,ta)]:
            for j in range(3):
                start=start_tri[j];end=start_tri[(j+1)%3];direction=end-start;length=direction.length
                if length<1e-10:continue
                hit=intersect_ray_tri(*target_tri,direction.normalized(),start,True)
                if hit is not None:
                    distance=(hit-start).dot(direction.normalized())
                    if .0000001<distance<length-.0000001:found=True;break
            if found:break
        if found:hits.append({'triangle_a':a,'triangle_b':b,'ring_a':rings[a],'ring_b':rings[b]})
    return {'method':'BVH triangle candidates + bounded edge/triangle intersection; shared-vertex and immediate-neighbor boundaries excluded','nonadjacent_candidate_pairs_tested':checked,'actual_crossing_pairs':len(hits),'crossing_ring_pairs':sorted(set(tuple(sorted((q['ring_a'],q['ring_b']))) for q in hits)),'crossing_examples':hits[:12]}
for side in [-1,1]:
    mesh=o['R2e_horn_'+str(side)].data;M=24;N=len(mesh.vertices)//M-1;first=175
    centers=[sum((mesh.vertices[i*M+j].co.copy() for j in range(M)),Vector())/M for i in range(N+1)]
    radii=[sum((mesh.vertices[i*M+j].co-centers[i]).length for j in range(M))/M for i in range(N+1)]
    beforestats=old_curvature(centers,radii,first);baseline_crossings=triangle_check(mesh,first);p0=centers[first];p3=centers[N];incoming=(p0-centers[first-1]).normalized();chord=p3-p0;distance=chord.length;enddirection=chord.normalized();r0=radii[first];dr=(radii[first]-radii[first-1])*(N-first)
    # Finite search over local C1 handles/tapers. Endpoints stay exactly at their archived positions.
    options=[];rejected=[]
    for h0scale in [.8,1.,1.4,1.8,2.2,2.6,3.,3.5,4.]:
        for h1scale in [.10,.20,.40,.60,.80,1.,1.4,2.]:
            for power in [1.,1.5,2.,3.,4.,5.,6.,8.,12.]:
                p1=p0+incoming*(distance*h0scale);p2=p3-enddirection*(distance*h1scale);maximum=0;sampled=[]
                for j in range(1001):
                    t=j/1000;point,tangent,cr=curve(p0,p1,p2,p3,t);r=taper(t,r0,dr,power);ratio=r/cr;maximum=max(maximum,ratio)
                    if j%50==0:sampled.append({'t':t,'curve_radius':cr,'section_radius':r,'ratio':ratio})
                rejected.append({'max_ratio':maximum,'h0scale':h0scale,'h1scale':h1scale,'taper_power':power})
                if maximum<=.70:
                    displacement=sum((curve(p0,p1,p2,p3,(i-first)/(N-first))[0]-centers[i]).length for i in range(first,N+1))/(N-first+1)
                    options.append((displacement+.001*(power-1)+.0005*abs(h0scale-1),maximum,h0scale,h1scale,power,p1,p2,sampled))
    (V/('g4-search-side'+str(side)+'.json')).write_text(json.dumps({'candidate_count':len(rejected),'passing_count':len(options),'best_max_ratio_candidates':sorted(rejected,key=lambda q:q['max_ratio'])[:12]},indent=2))
    assert options,'No bounded local centerline/taper satisfies the requested radius safety envelope'
    _,maxratio,h0scale,h1scale,power,p1,p2,sampled=min(options,key=lambda q:(q[1],q[0]));newcenters=[];newradii=[];sectionrecords=[]
    prevtangent=incoming;basis=(mesh.vertices[first*M].co-p0).normalized();basis=(basis-incoming*basis.dot(incoming)).normalized()
    for i in range(first,N+1):
        t=(i-first)/(N-first);point,tangent,cr=curve(p0,p1,p2,p3,t);radius=taper(t,r0,dr,power)
        if i>first:basis=prevtangent.rotation_difference(tangent)@basis;basis=(basis-tangent*basis.dot(tangent)).normalized()
        binormal=tangent.cross(basis).normalized();before=mesh.vertices[i*M].co.copy()
        # Preserve the root cross-section exactly, including its original mild oval, for a seamless boundary.
        transition=min(1,(i-first)/6);transition=transition*transition*(3-2*transition)
        for j in range(M):
            if i==first:continue
            a=j/M*math.tau;target=radius*(basis*math.cos(a)+binormal*math.sin(a));oldoffset=(mesh.vertices[i*M+j].co-centers[i])*(radius/max(radii[i],.000001));mesh.vertices[i*M+j].co=point+oldoffset.lerp(target,transition)
        actualmax=max((mesh.vertices[i*M+j].co-point).length for j in range(M))
        sectionrecords.append({'ring':i,'before_center':xyz(centers[i]),'after_center':xyz(point),'before_radius':radii[i],'after_radius':radius,'after_max_radius':actualmax,'old_to_new_frame_transition':transition,'curve_radius':cr,'section_over_curve_radius':actualmax/cr,'before_vertex0':xyz(before),'after_vertex0':xyz(mesh.vertices[i*M].co)})
        newcenters.append(point);newradii.append(radius);prevtangent=tangent
    mesh.update();crossings=triangle_check(mesh,first)
    if crossings['actual_crossing_pairs']:
        failure={'status':'FAILED_NO_SAVE_NO_RENDER','side':side,'source_sha256':oldhash,'fixed_center_endpoint_distance':distance,'start_section_radius':r0,'selected_handle_scales':[h0scale,h1scale],'selected_taper_power':power,'dense_max_ratio':maxratio,'baseline_g3_triangle_test':baseline_crossings,'candidate_triangle_test':crossings,'candidate_sections':sectionrecords}
        (V/'g4-overlap-failure-evidence.json').write_text(json.dumps(failure,indent=2));(O/'g4-overlap-failure-evidence.json').write_text(json.dumps(failure,indent=2))
    assert crossings['actual_crossing_pairs']==0,'Actual local horn triangle crossings remain; do not render or publish'
    # Independently sample the final discrete centers, including the frozen174 / editable175 boundary.
    finalcenters=centers[:first]+newcenters;finalradii=radii[:first]+newradii;discrete=old_curvature(finalcenters,finalradii,first-1)
    assert max(q['ratio'] for q in discrete)<.80,'Discrete final ring geometry violates curvature envelope'
    records.append({'side':side,'edited_rings':[first,N],'existing_vertices_total':len(mesh.vertices),'centerline_endpoints_unchanged':True,'incoming_c1_tangent':xyz(incoming),'handle_scales':[h0scale,h1scale],'taper_power':power,'old_worst_ratio':max(q['ratio'] for q in beforestats),'new_dense_max_ratio':maxratio,'new_discrete_max_ratio':max(q['ratio'] for q in discrete),'dense_sample_count':1001,'dense_samples_every50':sampled,'final_discrete_samples':discrete,'section_before_after':sectionrecords,'local_triangle_test':crossings})
operation={'operation':'G4 C1 centerline and monotone section taper / existing rings175..200 only','source_g3':source.relative_to(R).as_posix(),'source_g3_sha256':oldhash,'horns':records,'unchanged':'all rings0..175 including boundary175, face, body, fibers, materials, light, camera, root, pivot, crop','production_art_accepted':False}
# No render occurs before all geometric assertions above pass.
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
operation['output_g4_mother_sha256']=sha(dest);(V/'g3-g4-curvature-evidence.json').write_text(json.dumps(operation,indent=2),encoding='utf-8');(O/'g3-g4-curvature-evidence.json').write_text(json.dumps(operation,indent=2),encoding='utf-8')
e=json.loads((H/'mesh-edit-evidence.json').read_text());e['operations'].append(operation);e['mother_sha256']=sha(dest);e['outputs']=rows
(V/'mesh-edit-evidence.json').write_text(json.dumps(e,indent=2),encoding='utf-8');(O/'mesh-edit-evidence.json').write_text(json.dumps(e,indent=2),encoding='utf-8')
report=json.loads((H/'sample-report.json').read_text());report.update(version='R2g-g4-c1-curvature-and-crossing-repair',mother_sha256=sha(dest),outputs=rows,g3_source=source.relative_to(R).as_posix(),g3_source_sha256=oldhash,g3_g4_evidence='art-source/r2/r2g/g3-g4-curvature-evidence.json')
(V/'sample-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('R2G_G4_TWO_FRAMES_COMPLETE',flush=True)
