"""Editable baseline button states, no text, fonts or external resources."""
from pathlib import Path
import json,re
B=Path(__file__).resolve().parent;UI=B.parent/'design/ui_kit';states={}
for family in ['primary','secondary','round']:
 src=(UI/f'ui_button_{family}.svg').read_text(encoding='utf-8')
 states[family]={'normal':f'ui_button_{family}.svg'}
 for state in ['pressed','focus','disabled','loading']:
  name=f'ui_button_{family}_{state}';s=src
  # Distinct defs/title ids also permit mixed normal and state instances.
  ids=re.findall(r'\bid="([^"]+)"',s)
  for ident in sorted(ids,key=len,reverse=True):s=s.replace(ident,ident+'_'+state)
  s=s.replace('&quot;ui.button.'+family+'&quot;','&quot;ui.button.'+family+'.'+state+'&quot;')
  if state=='pressed':s=s.replace('<g id="surface_', '<g transform="translate(0 3)" id="surface_').replace('opacity=".18"','opacity=".08"')
  if state=='disabled':
   for before,after in [('#D95B43','#C4B5A1'),('#BA3827','#A7937C'),('#F0A074','#CDBCA4')]:s=s.replace(before,after)
  if state=='focus':
   w=320 if family!='round' else 96;h=88 if family=='primary' else 80 if family=='secondary' else 96
   s=s.replace('</svg>',f'<g id="focus_outline"><rect x="2" y="2" width="{w-4}" height="{h-4}" rx="{(h-4)/2}" fill="none" stroke="#493B2D" stroke-width="3" stroke-dasharray="7 4"/></g></svg>')
  if state=='loading':s=s.replace('</svg>','<g id="loading_dots" fill="#493B2D"><circle cx="24" cy="34" r="3"/><circle cx="34" cy="34" r="3"/><circle cx="44" cy="34" r="3"/></g></svg>')
  (UI/(name+'.svg')).write_text(s,encoding='utf-8');states[family][state]=name+'.svg'
(UI/'button-states.json').write_text(json.dumps({'version':'1.1.0','states':states,'labels':'Live DOM text; loading label should remain readable, aria-busy on control','disabled':'Use actual disabled semantics and readable reason, not opacity alone','target_min_css_px':[48,48],'inline_svg_ids':'Prefix every instance, including state assets','focus':'Also apply a real DOM :focus-visible ring'},indent=2)+'\n')
print('UI_STATE_SOURCES_CREATED',sum(len(x) for x in states.values()))
