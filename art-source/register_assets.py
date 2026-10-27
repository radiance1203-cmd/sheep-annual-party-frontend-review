"""Register delivered files without claiming human/device visual acceptance."""
from pathlib import Path
import json,hashlib,collections
from PIL import Image
B=Path(__file__).resolve().parent;R=B.parent;P=R/'apps/web/public/assets';mp=R/'design/asset-manifest.baseline.json';m=json.loads(mp.read_text(encoding='utf-8'))
paths={'master.sheep':'art-source/sheep_master.blend','master.dog':'art-source/dog_master.blend','master.farm':'art-source/farm_master.blend','hero.lobby':'apps/web/public/assets/hero/lobby_sheep_v1.webp','audio.shared':'apps/web/public/assets/audio/audio-manifest.json'}
for aid,folder,stem in [('character.sheep.side','characters','sheep_side_v1'),('character.sheep.iso8','characters','sheep_iso8_v1'),('character.dog.iso8','characters','dog_iso8_v1'),('environment.side','environment','farm_side_v1'),('environment.iso','environment','farm_iso_v1'),('effects.shared','effects','shared_v1')]:
 paths[aid]=f'apps/web/public/assets/{folder}/{stem}.png';paths[aid+'.metadata']=f'apps/web/public/assets/{folder}/{stem}.atlas.json'
audio={'version':'1.1.0','source':'art-source/package_assets.py','license_note':'Original procedural synthesized optional cues; no samples, no external source','files':[]}
for f in (P/'audio').glob('*.wav'):audio['files'].append({'path':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(P/'audio/audio-manifest.json').write_text(json.dumps(audio,indent=2)+'\n')
for a in m['assets']:
 if a['asset_id'] in paths:
  path=paths[a['asset_id']];f=R/path
  if not f.is_file():raise RuntimeError('Missing actual file '+path)
  a.update(path=path,status='rendered_candidate',bytes=f.stat().st_size,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),source_id='original_blender_20261027',version='1.1.0',production_art_accepted=False,license_note='Original project geometry/materials/animation and synthesis; Blender 4.5.9 GPL software is a tool, no third-party assets incorporated',note='Actual rendered original asset; final visual and real-device acceptance pending')
  if a['asset_id'].endswith('.metadata'):
   d=json.loads(f.read_text());a.update(canvas_px=d['size_px'],frame_count=len(d['frames']),pivot_px=[64,112] if d['camera_id']=='side_v1' else [64,98])
  elif f.suffix in ['.png','.webp']:
   a['canvas_px']=list(Image.open(f).size)
   meta=f.with_suffix('.atlas.json')
   if meta.is_file():
    d=json.loads(meta.read_text());a.update(frame_count=len(d['frames']),pivot_px=[64,112] if d['camera_id']=='side_v1' else [64,98],animations=d['animations'])
  if a['asset_id']=='audio.shared':a['source_id']='original_synth_cues_20261027'
  if path.startswith('apps/web/public/'):a['runtime_path']='/'+path[len('apps/web/public/'):]
 elif a['status']=='ready_ui_baseline':a['runtime_path']='/assets/ui/'+Path(a['path']).name
counts=collections.Counter(a['status'] for a in m['assets']);m['counts'].update(counts);m['counts']['planned']=counts['planned'];m['counts'].update(delivered_3d_master_files=3,delivered_production_animation_frames=254,delivered_production_atlases=6,delivered_button_state_variants=12)
m['art_version']='art-1.1.0';m['status_definitions']['rendered_candidate']='Actual original editable/rendered files with automated atlas checks; human visual and real-device acceptance pending'
m['runtime_budget_report']='art-source/atlas-validation.json';m['ui_state_manifest']='design/ui_kit/button-states.json'
m['runtime_ui_state_manifest']='/assets/ui/button-states.json'
mp.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');(P/'asset-manifest.v1.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('REGISTERED',dict(counts))
