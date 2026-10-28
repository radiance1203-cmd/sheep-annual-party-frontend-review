"""Root integration of the finite A sample; immutable B4 release already retained."""
from pathlib import Path
import hashlib,json,shutil

R=Path(__file__).resolve().parents[2]
D=R/'apps/web/public/assets/candidates/r3'
M=R/'review/r3/a-window-20261028/materials'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((D/'manifest.json').read_text(encoding='utf-8'))
assert manifest['candidate_id']=='R3-B4-C-sample-a'
def copy_atlas(source, target):
    png=M/(source+'_materials_A.png');meta=json.loads((M/(source+'_materials_A.atlas.json')).read_text(encoding='utf-8'))
    image=target+'.png';metadata=target+'.atlas.json';shutil.copyfile(png,D/image)
    meta['image']=image;(D/metadata).write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
    return {'image':image,'image_sha256':sha(D/image),'metadata':metadata,'metadata_sha256':sha(D/metadata),'coverage':list(meta['animations']),'finite_material_sample':True}
stack=copy_atlas('sheep_stack','stack-material-a')
manifest['stack_sample']={**manifest['stack_sample'],**stack}
manifest['character_samples']={key:copy_atlas(source,target) for key,source,target in [('sheep_side','sheep_side','sheep-side-material-a'),('sheep_iso8','sheep_iso8','sheep-iso8-material-a'),('dog_iso8','dog_iso8','dog-iso8-material-a')]}
P=R/'art-source/r3/a-window-props-20261028'
for name in ['props-materials-a.png','props-materials-a.atlas.json']:shutil.copyfile(P/name,D/name)
manifest['props_sample']={'image':'props-materials-a.png','image_sha256':sha(D/'props-materials-a.png'),'metadata':'props-materials-a.atlas.json','metadata_sha256':sha(D/'props-materials-a.atlas.json'),'scope':'editable SVG bounded material/contrast sample; not final 3D props'}
manifest['candidate_id']='R3-B5-A-finite-materials'
manifest['scope']='Finite A sample: unchanged world/FIT/input/geometry; three-page seam/layering; same-master stack14 material frames; sparse side/iso sheep/dog material keys, unproduced actions/directions remain v4; bounded SVG prop contrast sample. Art PARTIAL, not full animation or S3.'
manifest['sample_art_accepted']=False;manifest['production_art_accepted']=False
(D/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
h=sha(D/'manifest.json')
(R/'review/r3/a-window-20261028/candidate-binding.json').write_text(json.dumps({'candidate_id':manifest['candidate_id'],'sha256':h,'old_candidate':'68a94f88ab06e175255ee54a2d8ee0a8a666582dd4b3973bbcfd75adb871a5cb','production_manifest_sha256':sha(R/'apps/web/public/assets/asset-manifest.v1.json'),'rules_sha256':sha(R/'config/game_rules.v2.1.json'),'sample_art_accepted':False,'production_art_accepted':False,'rules_or_mapping_changed':False},indent=2)+'\n',encoding='utf-8')
print(h)
