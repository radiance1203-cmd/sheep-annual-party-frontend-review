"""Inspect saved editable Blender sources; no mutations."""
import bpy,json
from pathlib import Path
B=Path(__file__).resolve().parent;out=[]
for actor in ['sheep','dog','farm']:
 bpy.ops.wm.open_mainfile(filepath=str(B/(actor+'_master.blend')))
 d={'source':actor+'_master.blend','objects':len(bpy.data.objects),'collections':list(bpy.data.collections.keys()),'actions':len(bpy.data.actions),'materials':list(bpy.data.materials.keys()),'transparent':bpy.context.scene.render.film_transparent,'cameras':{}}
 for name in ['side_v1','iso8_v1']:
  c=bpy.data.objects[name];d['cameras'][name]={'location':list(c.location),'ortho_scale':c.data.ortho_scale,'type':c.data.type}
 d['root_motion_absent']=all(bpy.data.objects[n].animation_data is None for n in ['sheep_root','dog_root'])
 d['status']='PASS' if d['root_motion_absent'] and d['transparent'] and all(c in d['collections'] for c in ['CHAR_SHEEP','CHAR_DOG','ENV_FARM','RIGS','CAMERAS','LIGHTS']) and d['actions']>=(60 if actor=='sheep' else 78) else 'FAIL'
 out.append(d)
(B/'master-validation.json').write_text(json.dumps({'status':'PASS' if all(d['status']=='PASS' for d in out) else 'FAIL','sources':out},indent=2)+'\n')
print(json.dumps(out,indent=2))
if any(d['status']=='FAIL' for d in out):raise SystemExit(1)
