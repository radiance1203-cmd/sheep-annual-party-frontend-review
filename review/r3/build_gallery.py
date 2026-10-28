"""Evidence composition/annotation only. Never edits source screenshots or visual assets."""
from pathlib import Path
import hashlib, html, json, os
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[2]
out=root/'output/r3-20261028'; pages=out/'pages'; comparisons=out/'comparisons'; comparisons.mkdir(exist_ok=True)
font_paths=[Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts/msyh.ttc',Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
def font(size):
    for p in font_paths:
        if p.exists(): return ImageFont.truetype(str(p),size)
    return ImageFont.load_default()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=root/'apps/web/public/assets/candidates/r3/manifest.json'; mh=sha(manifest)
evidence=json.loads((pages/'results.json').read_text(encoding='utf-8'))
assert len(evidence['captures'])==27 and all(r['candidateManifestSha256']==mh for r in evidence['captures'])
core={r['game']:r for r in json.loads((out/'overlay-core.json').read_text(encoding='utf-8'))['rows']}
names={'stack':'羊羊叠高高','runner':'羊羊跨栏','herd':'赶羊入圈'}
refs={'stack':'01_stack.png','runner':'02_runner.png','herd':'03_herd.png'}
receipts=[]
def label(draw,xy,text,color=(15,40,42)):
    x,y=xy; box=draw.textbbox((x,y),text,font=font(21)); draw.rectangle((box[0]-4,box[1]-2,box[2]+4,box[3]+2),fill=(255,252,232,238)); draw.text((x,y),text,font=font(21),fill=color)
def overlay(game):
    path=pages/f'{game}-running-390.png'; record=json.loads(path.with_suffix('.json').read_text(encoding='utf-8'))
    assert sha(path)==core[game]['screenshot_sha256']
    image=Image.open(path).convert('RGBA'); d=ImageDraw.Draw(image)
    rect=record['before']['rects']['canvas']; viewport=record['before']['viewport']; ratio=image.width/viewport['width']; geometry=core[game]['geometry']; w,h=geometry['width'],geometry['height']
    def point(x,y): return ((rect['x']+x/w*rect['width'])*ratio,(rect['y']+y/h*rect['height'])*ratio)
    def line(a,b,color,width=3):d.line([point(*a),point(*b)],fill=color,width=width)
    d.rectangle([point(0,0),point(w,h)],outline='#008fa3',width=3)
    label(d,(point(0,0)[0]+6,point(0,0)[1]+6),f'完整世界 / 输入映射 {w:g} × {h:g}')
    state=core[game]['view']
    if game=='stack':
        camera=max(0,h*.42+8-state['top_support']['center']['y_u']/1000)
        for tray in [state['top_support'],*([state['moving_tray']]if state['moving_tray']else[])]:
            x=tray['center']['x_u']/1000; y=tray['center']['y_u']/1000+camera
            line((x-56,y),(x+56,y),'#ed4444',4)
            d.rectangle([point(x-26,y-38),point(x+26,y-2)],outline='#305eff',width=2)
            label(d,(point(x-56,y)[0],point(x-56,y)[1]+8),'托宽112；蓝框=造型预算，非碰撞',color=(120,20,20))
        x=332; y=state['top_support']['center']['y_u']/1000+camera
        line((x,y),(x,y-geometry['layer_height']),'#ed4444'); label(d,(point(x,y-44)[0]-110,point(x,y-44)[1]),'层距44')
    elif game=='runner':
        y=geometry['ground_y']; line((0,y),(w,y),'#ed4444',3)
        label(d,(point(5,y)[0],point(5,y)[1]+12),'真实地面 y180；栏宽8/18/28；草径9/3')
        for obstacle in state['obstacles']:
            b=obstacle['bounds']; x0=b['min_x_u']/1000; x1=b['max_x_u']/1000
            if x1<0 or x0>w:continue
            d.rectangle([point(x0,b['min_y_u']/1000),point(x1,b['max_y_u']/1000)],outline='#ed3333',width=3)
        for grass in state['grass']:
            x=grass['center']['x_u']/1000; y=grass['center']['y_u']/1000
            if x<0 or x>w:continue
            for radius,color in [(geometry['outer_radius'],'#fff17a'),(geometry['inner_radius'],'#ff8b00')]:d.ellipse([point(x-radius,y-radius),point(x+radius,y+radius)],outline=color,width=2)
    else:
        y=geometry['fence_y']; left,right=geometry['gate']; line((0,y),(left,y),'#ed4444',4);line((right,y),(w,y),'#ed4444',4)
        line((left,y),(right,y),'#ffcb21',5); label(d,(point(left,y)[0]-80,point(left,y)[1]-45),'真门 y76；x144..216')
        for actor in state['sheep']+[state['dog']]:
            radius=geometry['sheep_radius'] if 'sheep_id'in actor else geometry['dog_radius'];x=actor['center']['x_u']/1000;y=actor['center']['y_u']/1000
            d.ellipse([point(x-radius,y-radius),point(x+radius,y+radius)],outline='#f45a37',width=2)
    label(d,(18,image.height-35),f"core重放 tick {core[game]['tick']}；截屏后tick {core[game]['after_tick']}；非黄金图")
    destination=comparisons/f'{game}-geometry.png'; image.save(destination)
    return destination

for game in names:
    overlay_path=overlay(game)
    sheet=Image.new('RGB',(4*390,925),'#f5efd9'); draw=ImageDraw.Draw(sheet)
    paths=[root/'design/prototypes'/refs[game],out/'baseline'/f'{game}-running-390.png',pages/f'{game}-running-390.png',overlay_path]
    titles=['原型：等宽保留原比例','修复前：真实GamePage','当前B4：真实GamePage','真实玩法几何 / 当前页']
    for index,(p,title)in enumerate(zip(paths,titles)):
        image=Image.open(p).convert('RGB'); image.thumbnail((390,844),Image.Resampling.LANCZOS)
        sheet.paste(image,(index*390,52)); draw.text((index*390+8,10),title,font=font(19),fill='#57371c')
    draw.text((10,902),f'{names[game]} | {mh[:16]} | 原型是插画，保留纵横比；几何不从原型反求；艺术待签认',font=font(16),fill='#733519')
    destination=comparisons/f'{game}-comparison.png';sheet.save(destination)
    states=Image.new('RGB',(3*390,910),'#f5efd9');draw=ImageDraw.Draw(states)
    for index,(state,title)in enumerate([('prep','准备页'),('tutorial','教程'),('running','运行页')]):
        p=pages/f'{game}-{state}-390.png';image=Image.open(p).convert('RGB');image.thumbnail((390,844),Image.Resampling.LANCZOS);states.paste(image,(index*390,38));draw.text((index*390+8,6),f'{names[game]} / {title}',font=font(20),fill='#57371c')
    states.save(comparisons/f'{game}-states.png')
    receipts.append({'game':game,'reference_sha256':sha(paths[0]),'running_sha256':sha(paths[2]),'overlay_sha256':sha(overlay_path),'comparison_sha256':sha(destination),'candidate_manifest_sha256':mh,'core_before_tick':core[game]['tick'],'screenshot_after_tick':core[game]['after_tick'],'note':'annotation uses actual current world projection; objects move during native screenshot interval; displayed before-snapshot boxes are not enlarged collision regions; original illustration kept unwarped, not a new golden'})
overview=Image.new('RGB',(1170,910),'#f5efd9');draw=ImageDraw.Draw(overview)
for index,game in enumerate(names):
    image=Image.open(pages/f'{game}-running-390.png').convert('RGB');image.thumbnail((390,844),Image.Resampling.LANCZOS);overview.paste(image,(index*390,38));draw.text((index*390+10,6),names[game]+' / 候选未签认',font=font(18),fill='#673c25')
overview.save(comparisons/'overview.png')
(comparisons/'evidence.json').write_text(json.dumps({'candidate_manifest_sha256':mh,'source_screenshots_unchanged':True,'method':'native screenshots retained; analysis-only labels/composition; no imagegen redraw of evidence','production_art_accepted':False,'sample_art_accepted':False,'rows':receipts},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

parts=['<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>R3 整屏候选证据</title><style>body{margin:24px auto;max-width:1440px;padding:0 16px;font:16px/1.65 system-ui;color:#3b2e22;background:#faf6e9}img{max-width:100%;height:auto}article{padding:20px 0;border-top:1px solid #cdbb91}video{max-width:390px;width:100%;background:#111}a{color:#8e3522}strong{color:#a63625}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.grid img{width:100%}summary{cursor:pointer}</style><h1>R3 三款整屏候选 / 实际页面证据</h1>',f'<p>候选 <code>{mh}</code>。<strong>艺术PARTIAL；S3未签认，非生产美术。</strong>角色/规则/真机门槛分别记录。</p><p>此页是证据画廊，不是替代GamePage。截图来自真实页面＋独立GET业务夹具／唯一core，零真实业务写入。浏览器模拟不是真机。</p><p><a href="CAPTURE_STATUS.md">技术与录像索引</a> · <a href="final-integrity.json">同版本证据核验</a> · <a href="comparisons/evidence.json">原型／几何叠加来源</a></p>']
for game,name in names.items():
    parts.append(f'<article><h2>{name}</h2><p>三态390整屏；其余尺寸见原图。叠高52/112比例仍BLOCKED；跨栏/赶羊角色v4待换；环境动层和剩余动作未签认。</p><a href="comparisons/{game}-states.png"><img src="comparisons/{game}-states.png" alt="{name}准备教程运行三态"></a><details><summary>原型／修复前／当前／真实几何</summary><a href="comparisons/{game}-comparison.png"><img src="comparisons/{game}-comparison.png" alt="原型与实际几何"></a></details><h3>原速完整过程</h3><video controls preload="metadata" src="video/{game}-real-gamepage-fullspeed.webm"></video><p><a href="video/{game}-evidence.json">实际输入重放收据</a> · <a href="video/{game}-actual-practice-process.json">完整实际输入</a></p><details><summary>三态 × 三尺寸：原生27图中的本款9图</summary><div class="grid">')
    for width in [320,390,430]:
        for state in ['prep','tutorial','running']:parts.append(f'<figure><a href="pages/{game}-{state}-{width}.png"><img loading="lazy" src="pages/{game}-{state}-{width}.png" alt="{game} {state} {width}"></a><figcaption>{state} / {width} CSS px · <a href="pages/{game}-{state}-{width}.json">hash/tick/DPR</a></figcaption></figure>')
    parts.append('</div></details></article>')
parts.append('<p>原型与规则冲突、未完成项、阶段门以项目R3_VISUAL_STATUS与CURRENT为准。没有新golden或95%判定。</p></html>')
(out/'index.html').write_text(''.join(parts),encoding='utf-8')
print(json.dumps({'candidate':mh,'games':3,'comparison_images':10,'source_native_screenshots':27,'gallery':'output/r3-20261028/index.html'}))
