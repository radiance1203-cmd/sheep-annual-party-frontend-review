"""Render versioned repaired masters; never writes original v1 frames or sources."""
import bpy, math, json, ast, sys
from pathlib import Path
B=Path(__file__).resolve().parent;V=B/'v2';OUT=V/'renders'
PLAN=json.loads((B/'render_plan.json').read_text())
# Reuse the original pose definition verbatim, without executing its destructive generator.
tree=ast.parse((B/'render_assets.py').read_text())
function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='pose')
R={};BODIES={};LEGS={};TAIL={}
namespace={'math':math,'B':BODIES,'LEGS':LEGS,'TAIL':TAIL}
exec(compile(ast.Module(body=[function],type_ignores=[]),str(B/'render_assets.py')+':pose','exec'),namespace)
pose=namespace['pose'];ONLY_FARM='--farm-only' in sys.argv;SAMPLE_FARM='--sample-farm' in sys.argv
if not ONLY_FARM and not SAMPLE_FARM:
 for actor in ['sheep','dog']:
  bpy.ops.wm.open_mainfile(filepath=str(V/(actor+'_master_v2.blend')))
  scene=bpy.context.scene;scene.cycles.samples=32
  R[actor]=bpy.data.objects[actor+'_root'];BODIES[actor]=bpy.data.objects[actor+'_body_ctrl']
  LEGS[actor]=sorted([o for o in bpy.data.objects if o.name.startswith(actor+'_leg_')],key=lambda o:o.name)
  TAIL[actor]=bpy.data.objects['tail' if actor=='sheep' else 'dog_tail']
  for key,p in PLAN['plans'].items():
   if p['actor']!=actor:continue
   scene.camera=bpy.data.objects[p['camera']]
   dirs=[PLAN['directions'][0]] if p['camera']=='side_v1' else PLAN['directions']
   for direction,angle in dirs:
    R[actor].rotation_euler.z=math.radians(angle)
    for clip,(count,fps,loop) in p['clips'].items():
     for index in range(count):
      dest=OUT/key/(f'{key}__{clip}__{direction}__f{index:03}.png');dest.parent.mkdir(parents=True,exist_ok=True)
      if '--resume' in sys.argv and dest.exists():continue
      pose(actor,clip,index,count);scene.render.filepath=str(dest);bpy.ops.render.render(write_still=True)
  print('V2_CHARACTER_DONE:'+actor,flush=True)

bpy.ops.wm.open_mainfile(filepath=str(V/'farm_master_v2.blend'));scene=bpy.context.scene;scene.cycles.samples=32
props=['hay_tray','fence_segment','hurdle','clover_outer','clover_core','grass_tile','dirt_tile','barn','gate_marker','flower','shadow_contact','bush','tree','lantern']
col=bpy.data.collections['ENV_FARM']
for camera,key in [('side_v1','farm_side'),('iso8_v1','farm_iso')]:
 scene.camera=bpy.data.objects[camera]
 for name in props:
  if '--clover-only' in sys.argv and name not in ['clover_outer','clover_core']:continue
  if SAMPLE_FARM and name not in ['hay_tray','fence_segment','barn','tree','lantern']:continue
  root=bpy.data.objects[name+'_root']
  for ob in col.objects:ob.hide_render=ob.parent!=root
  dest=OUT/key/(name+'.png');dest.parent.mkdir(parents=True,exist_ok=True)
  if '--resume' in sys.argv and dest.exists():continue
  scene.render.filepath=str(dest);bpy.ops.render.render(write_still=True)
print('V2_RENDER_COMPLETE',flush=True)
