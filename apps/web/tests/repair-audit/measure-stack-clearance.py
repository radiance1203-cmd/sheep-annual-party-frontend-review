"""Read-only alpha1 geometry against frozen layer distance; no raster edits."""
from pathlib import Path
from PIL import Image
import json,hashlib
root=Path('.')
atlas_path=root/'apps/web/public/assets/characters/sheep_side_v4.atlas.json'
atlas=json.loads(atlas_path.read_text(encoding='utf-8'))
image=Image.open(atlas_path.parent/atlas['image']).convert('RGBA')
rules=json.loads((root/'config/game_rules.v2.1.json').read_text(encoding='utf-8'))
layer=rules['stack']['layer_height_u']/1000
rows=[]
for name,frame in atlas['frames'].items():
 if '__stack_' not in name:continue
 x,y,w,h=frame['rect']; alpha=image.crop((x,y,x+w,y+h)).getchannel('A');bbox=alpha.getbbox()
 if bbox is None:raise RuntimeError('Empty stack frame: '+name)
 scale=64/w
 if w!=h:raise RuntimeError('Stack whole-frame uniform scale convention changed')
 pivot=frame['pivot_px'];top=-2+(bbox[1]-pivot[1])*scale;bottom=-2+(bbox[3]-pivot[1])*scale
 # Same-layer tray occupies [-1,+5]. Its next upper neighbor is 44 units up.
 plate_top=-layer-1;plate_bottom=-layer+5
 overlap=max(0,min(bottom,plate_bottom)-max(top,plate_top))
 rows.append({'frame':name,'frame_rect':frame['rect'],'pivot':pivot,'alpha1_bbox':bbox,'whole_frame_display':64,'visible_height_u':(bbox[3]-bbox[1])*scale,'actor_y_offset_u':-2,'actor_visible_y_relative_layer_u':[top,bottom],'upper_neighbor_tray_y_u':[plate_top,plate_bottom],'vertical_overlap_u':overlap,'clearance_from_upper_tray_bottom_u':top-plate_bottom,'pass':overlap==0})
if not rows:raise RuntimeError('No dedicated stack poses found')
out=root/'output/repair-20261027/audit/art-runtime';out.mkdir(parents=True,exist_ok=True)
result={'scope':'Alpha>=1 conservative frame rectangle clearance to adjacent upper tray. Uniform whole-frame scale64, actor anchor y-2, thin tray region y-1..y+5, layer distance from frozen RULES. This is pixel geometry evidence, not mother-source signoff or full animation aesthetics.','rules_layer_distance_u':layer,'atlas_sha256':hashlib.sha256(atlas_path.read_bytes()).hexdigest(),'png_sha256':hashlib.sha256((atlas_path.parent/atlas['image']).read_bytes()).hexdigest(),'frames':rows,'pass':all(r['pass']for r in rows),'minimum_clearance_u':min(r['clearance_from_upper_tray_bottom_u']for r in rows)}
(out/'stack-alpha1-clearance.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'frames':len(rows),'pass':result['pass'],'minimum_clearance_u':result['minimum_clearance_u']},ensure_ascii=False))
if not result['pass']:raise SystemExit(1)
