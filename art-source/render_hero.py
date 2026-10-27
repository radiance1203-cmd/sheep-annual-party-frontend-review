"""Render a transparent lobby hero from the exact shared sheep master."""
import bpy
from mathutils import Vector
from pathlib import Path
B=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(B/'sheep_master.blend'))
for c in bpy.data.collections:
 if c.name=='CHAR_SHEEP':c.hide_render=False
 if c.name in ['CHAR_DOG','ENV_FARM']:c.hide_render=True
bpy.data.objects['sheep_root'].rotation_euler.z=2.70
bpy.ops.object.camera_add(location=(3,-6,3));cam=bpy.context.object;cam.name='lobby_hero_camera';cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.2
s=bpy.context.scene;s.camera=cam;s.cycles.samples=64;s.render.resolution_x=s.render.resolution_y=768;s.render.filepath=str(B/'renders/hero/lobby_sheep.png');(B/'renders/hero').mkdir(parents=True,exist_ok=True)
bpy.ops.render.render(write_still=True)
