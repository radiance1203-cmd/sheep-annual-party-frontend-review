"""One retained-farm oblique scenery sample; core ground remains screen coordinates.
No gate, actor, obstacle, pickup or hit region is baked into the scenery.
"""
import bpy,math,json,hashlib,time
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2];V=R/'art-source/r2'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=R/'art-source/v4/backdrop_herd_v4.blend';old=sha(source)
bpy.ops.wm.open_mainfile(filepath=str(source));s=bpy.context.scene;cam=s.camera
# Maintain orthographic projected x/y extents for gameplay; only decoration has perspective.
cam.location=(0,-18,18);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=10.5
for ob in bpy.data.objects:
    if ob.parent is None and ob!=cam and ob.type not in ['LIGHT','CAMERA']:
        # Retain ground screen positions after tilting camera: ground y is elongated sqrt2.
        ob.location.y*=math.sqrt(2)
        # Ground plane enlarges with the oblique view; individual foliage retains real volume.
        if ob.name=='flat_unwarped_grass':ob.scale.y*=math.sqrt(2)
s.render.resolution_x=720;s.render.resolution_y=840;s.render.resolution_percentage=100
s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True
s.view_settings.exposure=.58;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=False
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type='CUDA';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='CUDA'
    s.cycles.device='GPU' if any(d.type=='CUDA' and d.use for d in prefs.devices) else 'CPU'
except Exception:s.cycles.device='CPU'
# Ground shading shares warm left light; separate foreground can be composited by runtime later.
for ob in bpy.data.objects:
    if ob.type=='LIGHT':ob.data.color=(1,.93,.82)
dest=V/'backdrop_herd_r2a.blend';bpy.ops.wm.save_as_mainfile(filepath=str(dest))
out=V/'renders/backdrop_herd_r2a.png';s.render.filepath=str(out);t=time.time();bpy.ops.render.render(write_still=True)
assert sha(source)==old
(V/'environment-sample-report.json').write_text(json.dumps({'status':'SOURCE_VERIFIED / REVIEW','production_art_accepted':False,'source':str(source.relative_to(R)),'source_sha256':old,'mother':str(dest.relative_to(R)),'mother_sha256':sha(dest),'output':str(out.relative_to(R)),'output_sha256':sha(out),'seconds':round(time.time()-t,3),'camera':{'location':list(cam.location),'rotation':list(cam.rotation_euler),'ortho_scale':cam.data.ortho_scale},'scope':'one herd background candidate; no interactive region; not approved projection change','known_gap':'More scene depth, layered foreground and geometric composition approval still required.'},indent=2),encoding='utf-8')
print('R2_ENVIRONMENT_SAMPLE_COMPLETE',flush=True)
