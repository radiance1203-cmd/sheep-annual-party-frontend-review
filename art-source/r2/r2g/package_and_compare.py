from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2g';O=R/'output/r2-20261027/recovery-g';P=R/'apps/web/public/assets/candidates/r2/r2g'
P.mkdir(parents=True,exist_ok=True);O.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
report=json.loads((V/'sample-report.json').read_text());assert sha(R/report['source'])==report['source_sha256'];assert sha(R/report['mother'])==report['mother_sha256']
assert all(sha(R/q['path'])==q['sha256'] for q in report['outputs'])
crop=(128,32,384,288);im=Image.open(V/'sheep_stack_512.png').convert('RGBA').crop(crop);bb=im.getchannel('A').point(lambda a:255 if a else 0).getbbox()
height=(bb[3]-bb[1])/4;width=(bb[2]-bb[0])/4;assert height<=37
png=P/'sheep_stack_r2g.png';im.save(png,optimize=True)
meta={'schema_version':'atlas-1.0','asset_id':'r2g.sheep.stack.sample','image':png.name,'camera_id':'side_v1','size_px':[256,256],'frames':{'stack_sample':{'rect':[0,0,256,256],'pivot_px':[128,224],'source_size':[256,256],'sprite_source_rect':[0,0,256,256],'trimmed':False,'rotated':False}},'animations':{'stack_idle.e':{'frames':['stack_sample'],'fps':8,'loop':False}},'version':'R2g-two-static-views','status':'rendered_candidate','production_art_accepted':False,'missing_actions':'Only this static stack frame exists. No production replacement or silent fallback.'}
mp=P/'sheep_stack_r2g.atlas.json';mp.write_text(json.dumps(meta,indent=2)+'\n')
report.update({'asset':{'image':png.relative_to(R).as_posix(),'image_sha256':sha(png),'metadata':mp.relative_to(R).as_posix(),'metadata_sha256':sha(mp),'alpha1_bbox':list(bb),'runtime_frame_css_px':64,'alpha_height_world':height,'alpha_width_world':width,'pivot_px':[128,224],'source_crop':[128,32,256,256]},'production_replacement_allowed':False,'reference':{'path':'design/character_foundation_board.png','sha256':sha(R/'design/character_foundation_board.png')}})
manifest=P/'candidate-manifest.r2g.json';manifest.write_text(json.dumps(report,indent=2)+'\n');(O/'candidate-static-report.json').write_text(json.dumps(report,indent=2)+'\n')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
sheet=Image.new('RGB',(1120,760),'#f4ecdb');d=ImageDraw.Draw(sheet)
d.text((18,12),'Recovery G / 原相机与原光：F2 → G 既有mesh编辑对照（离线，非引擎截图）',font=font,fill='#443326')
for i,version in enumerate(['r2f2','r2g']):
    front=Image.open(R/f'art-source/r2/{version}/sheep_front_512.png').convert('RGBA').resize((300,300),Image.Resampling.LANCZOS);sheet.paste(front,(20+i*350,55),front);d.text((30+i*350,365),version+' 正面原近景机位',font=font,fill='#443326')
    sample=Image.open(R/f'art-source/r2/{version}/sheep_stack_512.png').convert('RGBA').crop(crop)
    sheet.paste(sample,(20+i*350,405),sample);q=sample.resize((64,64),Image.Resampling.LANCZOS);sheet.paste(q,(277+i*350,505),q)
    d.text((30+i*350,695),'正式side_v1：256 / 原生64帧',font=font,fill='#443326')
ref=Image.open(R/'design/character_foundation_board.png').convert('RGB');ref=ref.crop((25,30,475,490));ref.thumbnail((330,345));sheet.paste(ref,(765,62));d.text((765,425),'角色板局部（身份/材质参考）',font=font,fill='#443326')
for y in [640,596,552]:
    d.rounded_rectangle((800,y-1,912,y+5),radius=2,fill='#d6ad5b',outline='#a97c37');q=im.resize((64,64),Image.Resampling.LANCZOS);sheet.paste(q,(856-32,y-2-56),q)
d.text((760,675),f'G：112托宽 / 44层距',font=font,fill='#443326');d.text((760,710),f'alpha {height:g}高 / {width:g}宽，等比64帧',font=font,fill='#443326')
sheet.save(O/'f2-g-same-camera-native64.png')
checks={'status':'PASS','scope':'static source/hash/atlas/clearance only','mother_sha256':report['mother_sha256'],'manifest_sha256':sha(manifest),'image_sha256':sha(png),'alpha_height_world':height,'alpha_width_world':width,'source_f2_preserved':sha(R/report['source'])==report['source_sha256'],'current_manifest_sha256':sha(R/'apps/web/public/assets/asset-manifest.v1.json'),'production_art_accepted':False}
(O/'static-checks.json').write_text(json.dumps(checks,indent=2)+'\n');print(json.dumps(checks))
