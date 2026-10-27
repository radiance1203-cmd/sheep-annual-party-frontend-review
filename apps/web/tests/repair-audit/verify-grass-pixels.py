"""Sample actual native screenshot pixels at frozen golden grass centers."""
from pathlib import Path
from PIL import Image
import sys,json,math,hashlib
base=Path('output/repair-20261027/audit/art-runtime')
batch=sys.argv[1];result_dir=base/sys.argv[2];result_dir.mkdir(parents=True,exist_ok=True)
captures=json.loads((base/batch/'captures.json').read_text(encoding='utf-8'))
differential=len(sys.argv)>3 and sys.argv[3]=='differential'
baseline=json.loads((base/'v4-final/captures.json').read_text(encoding='utf-8')) if differential else None
atlas_path=Path('apps/web/public/assets/environment/farm_side_v4.atlas.json');atlas=json.loads(atlas_path.read_text(encoding='utf-8'));frame=atlas['frames']['clover_core_round'];x,y,w,h=frame['rect'];image=Image.open(atlas_path.parent/atlas['image']).convert('RGBA');expected=image.getpixel((x+w//2,y+h//2))[:3]
rows=[]
for case in ['runner-grass-uncollected','runner-grass-outer-only','runner-grass-both']:
 c=next(c for c in captures['captures']if c['id']==case and c['viewport']=={'width':390,'height':844});v=c['metrics']['view'];g=next(g for g in v['grass']if g['grass_id']==1);rect=c['metrics']['canvas']['rect'];px=int(rect['left']+g['center']['x_u']/1000*rect['width']/360);py=int(rect['top']+g['center']['y_u']/1000*rect['height']/220);im=Image.open(c['path']).convert('RGB');rgb=im.getpixel((px,py));distance=math.sqrt(sum((a-b)**2 for a,b in zip(rgb,expected)));gold=distance<100 and rgb[2]<120 and rgb[0]>rgb[1]>rgb[2]+30;want=not g['inner_collected'];extra={};passed=gold==want
 if differential:
  old=next(old for old in baseline['captures']if old['id']==case and old['viewport']=={'width':390,'height':844});assert old['viewHash']==c['viewHash'];oldrgb=Image.open(old['path']).convert('RGB').getpixel((px,py));delta=[a-b for a,b in zip(rgb,oldrgb)];gold=rgb[2]<120 and rgb[0]>rgb[1]>rgb[2]+30;passed=(gold and oldrgb[2]-rgb[2]>=40) if want else (not gold and max(abs(d)for d in delta)<=1);extra={'baselinePNG':old['path'],'baselineRGB':oldrgb,'actualMinusBaselineRGB':delta,'method':'Same true core viewHash and same native pixel coordinate; remaining core must add gold chroma/decrease blue >=40 from opaque wool, collected core must leave original pixel unchanged. Source-center color distance is diagnostic only because texture filtering blends at fractional CSS coordinates.'}
 rows.append({'id':case,'tick':c['tick'],'sourcePNG':c['path'],'sourcePNG_SHA256':hashlib.sha256(Path(c['path']).read_bytes()).hexdigest(),'viewHash':c['viewHash'],'coreGrassCenter':g['center'],'outer_collected':g['outer_collected'],'inner_collected':g['inner_collected'],'canvasPixel':[px,py],'actualRGB':rgb,'registeredGoldCenterRGB':expected,'rgbDistanceToRegisteredGoldCenter':distance,'nativeGoldCenterVisible':gold,'expectedGoldCenterVisible':want,'pass':passed,**extra})
result={'scope':'Native DPR1 actual renderer screenshot pixel at each real core grass center. Differential mode compares unchanged core view and exact native pixel against preserved pre-fix image; not subjective visual similarity, physical-device legibility or final art signoff.','mode':'differential'if differential else'un calibrated source-center distance diagnostic','manifestHash':captures['manifestHash'],'cases':rows,'pass':all(r['pass']for r in rows)}
filename='pixel-differential-evidence.json'if differential else'pixel-evidence.json'
(result_dir/filename).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'pass':result['pass'],'cases':[{'id':r['id'],'rgb':r['actualRGB'],'goldVisible':r['nativeGoldCenterVisible'],'expected':r['expectedGoldCenterVisible']}for r in rows]}))
if not result['pass']:raise SystemExit(1)
