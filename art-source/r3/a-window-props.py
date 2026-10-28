"""Editable bounded SVG props, rasterized by the existing browser. No image repainting.
Texture coordinates are independent of the unchanged core AABBs/circles.
"""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[2]
dest = root / 'art-source/r3/a-window-props-20261028'
dest.mkdir(exist_ok=True)
defs = '''<defs>
<linearGradient id="wood" x2="0.15" y2="1"><stop stop-color="#d99651"/><stop offset=".22" stop-color="#bf743c"/><stop offset=".72" stop-color="#96522b"/><stop offset="1" stop-color="#63351d"/></linearGradient>
<linearGradient id="straw" x2="0" y2="1"><stop stop-color="#fff0a4"/><stop offset=".3" stop-color="#edc46b"/><stop offset="1" stop-color="#a3672e"/></linearGradient>
<linearGradient id="leaf" x2=".7" y2="1"><stop stop-color="#c4ed4c"/><stop offset=".45" stop-color="#70b523"/><stop offset="1" stop-color="#26762d"/></linearGradient>
<radialGradient id="gold" cx=".32" cy=".25"><stop stop-color="#fff8b6"/><stop offset=".4" stop-color="#ffd94d"/><stop offset=".82" stop-color="#e4a517"/><stop offset="1" stop-color="#a8650f"/></radialGradient>
</defs>'''
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512">{defs}']
frames = {}
def frame(name, x,y,w,h,body):
    parts.append(f'<svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="0 0 {w} {h}" overflow="hidden">{body}</svg>')
    frames[name]={'rect':[x,y,w,h],'pivot_px':[w/2,h/2]}
tray = '<rect x="1" y="1" width="894" height="46" rx="9" fill="url(#straw)" stroke="#a36b34" stroke-width="2"/>'
for y in [10,20,31,40]:
    tray += f'<path d="M6 {y} Q180 {y-6} 350 {y+1} T890 {y-2}" stroke="#fff0ac" stroke-width="2" fill="none"/>'
for x in range(24,892,48):
    tray += f'<path d="M{x} 2l-10 42m-2-37l28 31" stroke="#ad773a" stroke-width="1.4" fill="none"/>'
for x in [150,450,750]:
    tray += f'<path d="M{x} 1q-12 21 0 46m6-46q-10 21 0 46" stroke="#f8dea0" stroke-width="5" fill="none"/>'
frame('hay_tray_thin',0,0,896,48,tray)
for name,x,w in [('narrow',0,64),('medium',80,144),('wide',240,224)]:
    body=f'<rect x="1" y="1" width="{w-2}" height="238" rx="8" fill="url(#wood)" stroke="#62391f" stroke-width="2"/><path d="M8 5v227M{w-8} 5v227" stroke="#f0b970" stroke-width="3" opacity=".7"/>'
    for xx in range(15,w-10,14):
        body+=f'<path d="M{xx} 8q-7 28 1 52t-2 62t1 108" stroke="#5d351e" stroke-width="1.2" opacity=".48" fill="none"/>'
    body+=f'<rect x="3" y="36" width="{w-6}" height="49" rx="2" fill="#df5037"/><rect x="3" y="88" width="{w-6}" height="35" fill="#fff0d1"/><rect x="3" y="126" width="{w-6}" height="45" rx="2" fill="#cc402b"/>'
    for yy in [18,215]:
        body+=f'<circle cx="{w/2}" cy="{yy}" r="3.5" fill="#4f331d"/><circle cx="{w/2-1}" cy="{yy-1}" r="1.5" fill="#e2be78"/>'
    frame('hurdle_'+name,x,64,w,240,body)
leaf='<circle cx="72" cy="72" r="69.5" fill="#f8ffe0" opacity=".92"/>'
for angle in [0,72,144,216,288]:
    leaf+=f'<g transform="rotate({angle} 72 72)"><path d="M72 76C34 62 31 29 48 14C66 0 87 11 92 27C98 44 86 65 72 76Z" fill="url(#leaf)" stroke="#285d26" stroke-width="2.5"/><path d="M72 72L62 20" stroke="#d8f381" stroke-width="2" opacity=".8"/></g>'
frame('clover_outer_round',480,64,144,144,leaf)
frame('clover_core_round',640,64,48,48,'<circle cx="24" cy="24" r="23" fill="url(#gold)" stroke="#fff3a1" stroke-width="2"/><ellipse cx="18" cy="16" rx="9" ry="5" fill="#fffbd0" opacity=".75"/>')
parts.append('</svg>')
(dest/'props-materials-a.svg').write_text(''.join(parts),encoding='utf-8')
(dest/'props-materials-a.atlas.json').write_text(json.dumps({'image':'props-materials-a.png','size_px':[1024,512],'frames':frames,'animations':{},'source':'art-source/r3/a-window-props-20261028/props-materials-a.svg','scope':'bounded material/contrast sample; no change to tray112x6, hurdles8/18/28x30 or clover9/3; SVG source is editable, not a 3D master','sample_art_accepted':False,'production_art_accepted':False},indent=2)+'\n',encoding='utf-8')
print('BOUNDED_PROP_SVG_AUTHORED')
