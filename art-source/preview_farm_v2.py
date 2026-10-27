"""Contact sheets from actual fixed-camera v2 farm source frames at 128px."""
from pathlib import Path
from PIL import Image, ImageDraw
V=Path(__file__).resolve().parent/'v2'
names=['hay_tray','fence_segment','hurdle','clover_outer','clover_core','grass_tile','dirt_tile','barn','gate_marker','flower','shadow_contact','bush','tree','lantern']
for key,y0 in [('farm_side',32),('farm_iso',60)]:
    out=Image.new('RGB',(1120,328),'#f7eedb');draw=ImageDraw.Draw(out)
    for i,name in enumerate(names):
        im=Image.open(V/'renders'/key/(name+'.png')).crop((128,y0,384,y0+256)).resize((128,128),Image.Resampling.LANCZOS)
        x=i%7*160;y=i//7*164;out.paste(im,(x+16,y),im);draw.text((x+4,y+136),name,fill='#493b2d')
    out.save(V/'previews'/(key+'_128.png'))
