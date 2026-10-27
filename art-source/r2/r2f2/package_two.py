from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
R=Path(__file__).resolve().parents[3];V=R/'art-source/r2/r2f2';O=R/'output/r2-20261027/art/r2f2';P=R/'apps/web/public/assets/candidates/r2/r2f2'
O.mkdir(exist_ok=True);P.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
im=Image.open(V/'sheep_stack_512.png').convert('RGBA').crop((128,32,384,288));png=P/'sheep_stack_r2f2.png';im.save(png)
bb=im.getchannel('A').point(lambda a:255 if a else 0).getbbox();assert (bb[3]-bb[1])/4<=37
meta={'schema_version':'atlas-1.0','asset_id':'r2f2.sheep.stack.sample','image':png.name,'camera_id':'side_v1','size_px':[256,256],'frames':{'stack_sample':{'rect':[0,0,256,256],'pivot_px':[128,224],'source_size':[256,256],'sprite_source_rect':[0,0,256,256],'trimmed':False,'rotated':False}},'animations':{'stack_idle.e':{'frames':['stack_sample'],'fps':8,'loop':False}},'version':'R2f2-two-frame','status':'rendered_candidate','production_art_accepted':False,'missing_actions':'Only this static stack frame exists. No silent fallback or production replacement permitted.'}
mp=P/'sheep_stack_r2f2.atlas.json';mp.write_text(json.dumps(meta,indent=2)+'\n')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
sheet=Image.new('RGB',(1100,620),'#f4ecdb');d=ImageDraw.Draw(sheet)
d.text((20,12),'R2f2：正式 side_v1 机位 / 固定裁剪 / 非引擎截图 / 待审',font=font,fill='#443326')
for x,n in [(20,256),(330,128),(530,64)]:
    q=im.resize((n,n),Image.Resampling.LANCZOS);sheet.paste(q,(x,70),q);d.text((x,350),str(n)+' CSS px frame',font=font,fill='#443326')
front=Image.open(V/'sheep_front_512.png').convert('RGBA').resize((300,300),Image.Resampling.LANCZOS);sheet.paste(front,(760,50),front)
d.text((765,350),'正面近景（非正式相机）',font=font,fill='#443326')
for y in [570,526,482]:
    d.rounded_rectangle((85,y-1,197,y+5),radius=2,fill='#d6ad5b',outline='#a97c37')
    q=im.resize((64,64),Image.Resampling.LANCZOS);sheet.paste(q,(141-32,y-2-56),q)
d.text((260,460),'左：112托宽 / 44层距 / 64角色帧，全部等比',font=font,fill='#443326')
d.text((260,492),f'不透明高度{(bb[3]-bb[1])/4:g}、宽{(bb[2]-bb[0])/4:g}逻辑单位；不改几何',font=font,fill='#443326')
d.text((260,524),'参考胖羊/托盘占比冲突仍保留，不能宣称95%',font=font,fill='#443326')
sheet.save(O/'formal-camera-native-css.png')
report=json.loads((V/'sample-report.json').read_text());report.update({'asset':{'image':png.relative_to(R).as_posix(),'image_sha256':sha(png),'metadata':mp.relative_to(R).as_posix(),'metadata_sha256':sha(mp),'alpha1_bbox':bb,'runtime_frame_css_px':64,'alpha_height_world':(bb[3]-bb[1])/4,'alpha_width_world':(bb[2]-bb[0])/4,'pivot_px':[128,224],'source_crop':[128,32,256,256],'camera':{'location':[0,-8,1.4],'look_at':[0,0,0],'ortho_scale':4,'source_px':[512,512]}},'art_signoff':None,'production_replacement_allowed':False})
(P/'candidate-manifest.r2f2.json').write_text(json.dumps(report,indent=2)+'\n');(O/'sample-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'R2f2_alpha_height':(bb[3]-bb[1])/4,'fits_37':True,'manifest_sha256':sha(P/'candidate-manifest.r2f2.json'),'production_art_accepted':False}))
