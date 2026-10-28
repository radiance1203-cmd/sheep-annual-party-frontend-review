import bpy,json,time
from pathlib import Path
R=Path.cwd();D=R/'art-source/r3/stack-sample';O=R/'review/r3/stack-sample'
bpy.ops.wm.open_mainfile(filepath=str(D/'A_collar_v1.blend'));o=bpy.data.objects;s=bpy.context.scene
o['scarf_neck'].location.z-=.08;o['scarf_tail'].location.z-=.04;s['R3_sample_identity']='A_folded_loaf_collar_v2'
bpy.ops.wm.save_as_mainfile(filepath=str(D/'A_collar_v2.blend'))
for name in ['idle','contact']:
 if name=='contact':
  o['sheep_body_ctrl'].location.z-=.035;o['sheep_head_ctrl'].location.z-=.025
 s.render.filepath=str(O/('A_collar_v2_'+name+'_512.png'));bpy.ops.render.render(write_still=True)
print('CORRECTED_TWO_COLLAR_FRAMES_RENDERED')
