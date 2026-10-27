from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
base=Path('output/repair-20261027/audit/art-runtime')
out=base/'grass-layer-green/crops';out.mkdir(parents=True,exist_ok=True)
names=['runner-grass-uncollected','runner-grass-outer-only','runner-grass-both']
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)
sheet=Image.new('RGB',(3*230+10,2*225+40),'#f5efdf');draw=ImageDraw.Draw(sheet)
draw.text((10,8),'Preserved RED / fixed layer order: 6x nearest-pixel crops; same core viewHash and position',fill='#33251a',font=font)
index=[]
for row,batch in enumerate(['v4-final','v4-runner-grass-front']):
 captures=json.loads((base/batch/'captures.json').read_text(encoding='utf-8'))['captures']
 for col,name in enumerate(names):
  c=next(c for c in captures if c['id']==name and c['viewport']=={'width':390,'height':844});g=next(g for g in c['metrics']['view']['grass']if g['grass_id']==1);rect=c['metrics']['canvas']['rect'];px=int(rect['left']+g['center']['x_u']/1000*rect['width']/360);py=int(rect['top']+g['center']['y_u']/1000*rect['height']/220);im=Image.open(c['path']).convert('RGB');crop=im.crop((px-12,py-12,px+12,py+12)).resize((144,144),Image.Resampling.NEAREST);kind='before-red'if row==0 else'after-front';path=out/f'{name}-{kind}-390-6x.png';crop.save(path);x=10+col*230;y=35+row*225;sheet.paste(crop,(x,y));draw.text((x,y+150),kind+' t'+str(c['tick']),fill='#33251a',font=font);draw.text((x,y+168),name.removeprefix('runner-grass-'),fill='#33251a',font=font);draw.text((x,y+186),'native RGB '+str(im.getpixel((px,py))),fill='#654d35',font=font);index.append({'crop':str(path),'source':c['path'],'id':name,'tick':c['tick'],'viewHash':c['viewHash'],'native_center_pixel':[px,py],'nativeRGB':im.getpixel((px,py)),'method':'24x24 native pixel crop, uniform6x nearest-neighbor enlargement only; original images retained'})
sheet.save(out/'golden239-240-241-before-after-6x.png');(out/'index.json').write_text(json.dumps(index,indent=2),encoding='utf-8');print(str(out/'golden239-240-241-before-after-6x.png'))
