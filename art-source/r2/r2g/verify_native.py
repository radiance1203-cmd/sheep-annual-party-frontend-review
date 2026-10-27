import bpy,json,hashlib,struct
from pathlib import Path
R=Path(__file__).resolve().parents[3];O=R/'output/r2-20261027/recovery-g';V=R/'art-source/r2/r2g'
def snapshot():
    o=bpy.data.objects;s=bpy.context.scene;cam=o['side_v1']
    return {'camera':{'location':list(cam.location),'rotation':list(cam.rotation_euler),'ortho_scale':cam.data.ortho_scale},'lights':{n:{'location':list(o[n].location),'energy':o[n].data.energy,'size':o[n].data.size,'color':list(o[n].data.color)} for n in ['key','fill','rim']},'color':{'view_transform':s.view_settings.view_transform,'look':s.view_settings.look,'exposure':s.view_settings.exposure},'world':{'strength':s.world.node_tree.nodes['Background'].inputs['Strength'].default_value,'color':list(s.world.node_tree.nodes['Background'].inputs['Color'].default_value)}}
bpy.ops.wm.open_mainfile(filepath=str(R/'art-source/r2/r2f2/sheep_master_r2f2.blend'));before=snapshot()
p=V/'sheep_master_r2g.blend';bpy.ops.wm.open_mainfile(filepath=str(p));after=snapshot();assert before==after
o=bpy.data.objects;assert len(o['R2d_face_control_surface'].data.vertices)==640
assert len(o['R2e_horn_-1'].data.vertices)==4824 and len(o['R2e_horn_1'].data.vertices)==4824
assert len(o['R2g_welded_existing_fleece'].data.vertices)==49650
oldbundles=[q for q in o if q.name.startswith('R2f2_band') and q.type=='MESH'];assert len(oldbundles)==37 and all(q.hide_render for q in oldbundles)
assert max(abs(v) for v in o['sheep_root'].location)<.00001
e=json.loads((V/'mesh-edit-evidence.json').read_text());assert e['operations'][0]['vertices_moved']==541;seams=next(q for q in e['operations'] if 'unique_concave_seam_vertices_moved' in q);assert seams['unique_concave_seam_vertices_moved']>0
out={'status':'SOURCE_VERIFIED','production_art_accepted':False,'same_light_color_and_formal_camera_as_f2':True,'snapshot':after,'face_control_vertex_count_unchanged':640,'horn_control_vertex_count_each_unchanged':4824,'old_37_bundle_cages_retained_hidden':True,'welded_vertices':49650,'actual_concave_vertices_sculpted':seams['unique_concave_seam_vertices_moved'],'mother_sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
if (V/'history/g1/sheep_master_r2g.blend').exists():
    def cage_hash(name,limit=None):
        values=bpy.data.objects[name].data.vertices
        return hashlib.sha256(b''.join(struct.pack('fff',*v.co) for v in list(values)[:limit])).hexdigest()
    g3=(V/'g2-g3-weight-evidence.json').exists();g4=(V/'g3-g4-curvature-evidence.json').exists();ring_limit=176 if g4 else 181 if g3 else 189
    protected={'face':cage_hash('R2d_face_control_surface'),'welded_body':cage_hash('R2g_welded_existing_fleece'),'left_horn_protected_prefix':cage_hash('R2e_horn_-1',ring_limit*24),'right_horn_protected_prefix':cage_hash('R2e_horn_1',ring_limit*24)}
    bpy.ops.wm.open_mainfile(filepath=str(V/'history/g1/sheep_master_r2g.blend'))
    oldprotected={'face':cage_hash('R2d_face_control_surface'),'welded_body':cage_hash('R2g_welded_existing_fleece'),'left_horn_protected_prefix':cage_hash('R2e_horn_-1',ring_limit*24),'right_horn_protected_prefix':cage_hash('R2e_horn_1',ring_limit*24)}
    assert protected==oldprotected
    tips=json.loads((V/'g1-g2-tip-evidence.json').read_text());assert len(tips['section_samples'])==24 and tips['end_radius']==.0003
    out['protected_cage_hashes_unchanged_from_g1']=protected;out['horn_protected_prefix_sections']=ring_limit;out['g1_source_sha256']=tips['source_g1_sha256'];out['g2_final_tip_radius']=.0003
    if g3:
        def fiber_data():
            curves=sorted([q for q in bpy.data.objects if q.name.startswith('R2f2_band') and q.type=='CURVE'],key=lambda q:q.name)
            return [[tuple(p.co) for p in sp.points] for q in curves for sp in q.data.splines]
        bpy.ops.wm.open_mainfile(filepath=str(V/'history/g2/sheep_master_r2g.blend'));oldfibers=fiber_data();g2body=cage_hash('R2g_welded_existing_fleece')
        bpy.ops.wm.open_mainfile(filepath=str(p));newfibers=fiber_data();assert len(oldfibers)==len(newfibers)==4440
        changed=sum(any(sum((a[k]-b[k])**2 for k in range(3))>.0000000001 for a,b in zip(old,new)) for old,new in zip(oldfibers,newfibers));assert changed==4440
        body=bpy.data.objects['R2g_welded_existing_fleece'];assert cage_hash('R2g_welded_existing_fleece')==g2body
        names=['r2g3_bundle_crest','r2g3_bundle_root','r2g3_shape_preserve','r2g3_fiber_length','r2g3_fiber_flow']
        for name in names:assert body.data.attributes[name].domain=='POINT' and len(body.data.attributes[name].data)==49650
        lengths=[q.value for q in body.data.attributes['r2g3_fiber_length'].data];assert min(lengths)>=.00699 and max(lengths)<=.01701
        out['g3_applied_weights']={'point_attributes':names,'attribute_entries_each':49650,'old_fibers':len(oldfibers),'new_fibers':len(newfibers),'fibers_with_changed_existing_points':changed,'length_range':[min(lengths),max(lengths)],'body_geometry_hash_same_as_g2':g2body}
        if g4:
            def protected_g3_state():
                objects=bpy.data.objects;meshes={q.name:cage_hash(q.name) for q in objects if q.type=='MESH' and q.name not in ['R2e_horn_-1','R2e_horn_1']}
                curves={q.name:hashlib.sha256(b''.join(struct.pack('ffff',*point.co) for sp in q.data.splines for point in sp.points)).hexdigest() for q in objects if q.type=='CURVE' and q.name.startswith('R2f2_band')}
                return meshes,curves
            current_protected=protected_g3_state();horn_actual={}
            for side in [-1,1]:
                vv=objects=bpy.data.objects['R2e_horn_'+str(side)].data.vertices;centers=[];radii=[]
                from mathutils import Vector
                for i in range(201):
                    center=sum((vv[i*24+j].co.copy() for j in range(24)),Vector())/24;centers.append(center);radii.append(max((vv[i*24+j].co-center).length for j in range(24)))
                ratios=[]
                for i in range(175,200):
                    a,b,c=centers[i-1:i+2];ab=b-a;bc=c-b;ac=c-a;cr=ab.length*bc.length*ac.length/max(1e-15,2*ab.cross(bc).length);ratios.append(radii[i]/cr)
                assert max(ratios)<.8
                horn_actual[str(side)]={'actual_max_section_over_discrete_curve_radius':max(ratios),'endpoints':[list(centers[175]),list(centers[200])]}
            bpy.ops.wm.open_mainfile(filepath=str(V/'history/g3/sheep_master_r2g.blend'));archived_protected=protected_g3_state();assert current_protected==archived_protected
            for side in [-1,1]:
                vv=bpy.data.objects['R2e_horn_'+str(side)].data.vertices
                for i,oldcenter in zip([175,200],horn_actual[str(side)]['endpoints']):
                    center=sum((vv[i*24+j].co.copy() for j in range(24)),Vector())/24;assert (center-Vector(oldcenter)).length<.000001
            proof=json.loads((V/'g3-g4-curvature-evidence.json').read_text());assert all(q['local_triangle_test']['actual_crossing_pairs']==0 and q['dense_sample_count']==1001 for q in proof['horns'])
            out['g4_scope_and_actual_curvature']={'all_nonhorn_meshes_byte_identical_to_g3':True,'existing_body_fiber_curves_byte_identical_to_g3':True,'verified_nonhorn_mesh_count':len(current_protected[0]),'verified_body_fiber_curve_count':len(current_protected[1]),'actual_reopened_horn_samples':horn_actual,'local_crossing_pairs':0,'dense_samples_per_side':1001,'center_endpoints_same_as_g3':True}
(O/'native-source-checks.json').write_text(json.dumps(out,indent=2)+'\n');print('R2G_NATIVE_SOURCE_VERIFIED',flush=True)
