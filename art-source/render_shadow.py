"""Targeted rerender of the independent shadow from the saved editable farm."""
import bpy
from pathlib import Path
B=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(B/'farm_master.blend'))
for o in bpy.data.collections['ENV_FARM'].objects:o.hide_render=o.name!='contact_shadow_plane'
for c in ['CHAR_SHEEP','CHAR_DOG']:bpy.data.collections[c].hide_render=True
bpy.data.collections['ENV_FARM'].hide_render=False
s=bpy.context.scene
for camera,key in [('side_v1','farm_side'),('iso8_v1','farm_iso')]:
 s.camera=bpy.data.objects[camera];s.render.filepath=str(B/'renders'/key/'shadow_contact.png');bpy.ops.render.render(write_still=True)
