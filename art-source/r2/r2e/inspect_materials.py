import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[3];bpy.ops.wm.open_mainfile(filepath=str(R/'art-source/r2/r2d/sheep_master_r2d.blend'))
out={}
for name in ['wool','horn']:
    m=bpy.data.materials[name]
    out[name]={'nodes':[{'name':n.name,'type':n.type} for n in m.node_tree.nodes],'links':[{'from':l.from_node.name+'.'+l.from_socket.name,'to':l.to_node.name+'.'+l.to_socket.name} for l in m.node_tree.links]}
out['world']={'color':list(bpy.context.scene.world.color),'nodes':[{'name':n.name,'type':n.type} for n in bpy.context.scene.world.node_tree.nodes] if bpy.context.scene.world.use_nodes else []}
(R/'art-source/r2/r2e/material-inspection.json').write_text(json.dumps(out,indent=2))
