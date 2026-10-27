from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[3];O=R/'output/r2-20261027/art/r2f2';font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
page=Image.new('RGB',(1180,760),'#f4ecdb');d=ImageDraw.Draw(page)
d.text((20,12),'原型与 R2f2 正式机位单帧：离线参考对照，非引擎截图 / 未签认',font=font,fill='#443326')
ref=Image.open(R/'design/prototypes/01_stack.png').convert('RGB');q=ref.copy();q.thumbnail((345,620));page.paste(q,(15,70));d.text((20,710),'原型全图（缩略）',font=font,fill='#443326')
q=ref.crop((330,340,620,555));q.thumbnail((340,310));page.paste(q,(395,80));d.text((395,330),'原型局部（仅比较身份/材质）',font=font,fill='#443326')
sample=Image.open(R/'apps/web/public/assets/candidates/r2/r2f2/sheep_stack_r2f2.png').convert('RGBA');page.paste(sample,(830,80),sample);d.text((810,360),'R2f2 正式 side_v1 / 256帧',font=font,fill='#443326')
for i,version in enumerate(['r2e','r2f','r2f2']):
    im=Image.open(R/f'art-source/r2/{version}/sheep_front_512.png').convert('RGBA').resize((235,235),Image.Resampling.LANCZOS);x=390+i*250;page.paste(im,(x,420),im);d.text((x+20,680),version+' 实际近景',font=font,fill='#443326')
d.text((395,720),'F圆牌失败、F2拼块差距均保留；不以单帧替代动作完成或95%目标',font=font,fill='#443326')
page.save(O/'prototype-formal-camera-comparison.png');print('R2F2_REFERENCE_COMPARISON_WRITTEN')
