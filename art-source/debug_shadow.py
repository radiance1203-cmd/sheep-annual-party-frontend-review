import bpy
from pathlib import Path
B=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(B/'farm_master.blend'))
for o in bpy.data.collections['ENV_FARM'].objects:o.hide_render=o.name!='contact_shadow_plane'
for c in ['CHAR_SHEEP','CHAR_DOG']:bpy.data.collections[c].hide_render=True
bpy.data.collections['ENV_FARM'].hide_render=False
m=bpy.data.materials.new('DIAGNOSTIC_generated_coordinate');m.use_nodes=True;n=m.node_tree.nodes;n.clear();tex=n.new('ShaderNodeTexCoord');e=n.new('ShaderNodeEmission');out=n.new('ShaderNodeOutputMaterial');m.node_tree.links.new(tex.outputs['Generated'],e.inputs[0]);m.node_tree.links.new(e.outputs[0],out.inputs[0]);o=bpy.data.objects['contact_shadow_plane'];o.data.materials.clear();o.data.materials.append(m)
s=bpy.context.scene;s.camera=bpy.data.objects['iso8_v1'];s.view_settings.view_transform='Standard';s.view_settings.look='None';s.render.filepath=str(B/'previews/shadow_generated_diagnostic.png');bpy.ops.render.render(write_still=True)
