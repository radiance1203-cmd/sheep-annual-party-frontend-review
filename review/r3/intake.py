"""R3 intake evidence only. Does not edit runtime code/assets or invoke services."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import shutil
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'review/r3'
BACKUP = ROOT / '.local/r3-intake-20261028'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_new(path, value):
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def protected():
    files = [ROOT/'config/game_rules.v2.1.json', ROOT/'apps/web/public/assets/asset-manifest.v1.json', ROOT/'package.json', ROOT/'package-lock.json']
    for rel in ['packages/game-core', 'contracts', 'packages/contracts', 'apps/web/src']:
        files += [p for p in (ROOT/rel).rglob('*') if p.is_file() and 'node_modules' not in p.parts and 'dist' not in p.parts]
    return {p.relative_to(ROOT).as_posix():sha(p) for p in sorted(set(files))}

assert (ROOT/'00_README.txt').is_file()
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip() == '9d652fb3fef2ede55ebc462d46445cc855b98dd1'
assert not BACKUP.exists(), 'Checkpoint already exists; inspect it rather than overwrite.'
before = protected()
now = datetime.now(timezone.utc).isoformat()
BACKUP.mkdir(parents=True)
backups = []
for rel in ['planning/PROJECT_STATE.json', 'docs/implementation-log.md', 'docs/test-report.md', 'apps/web/public/assets/asset-manifest.v1.json', 'art-source/r2/r2g/sheep_master_r2g.blend']:
    src = ROOT/rel
    dst = BACKUP/rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    assert sha(src) == sha(dst)
    backups.append({'source':rel, 'backup':dst.relative_to(ROOT).as_posix(), 'sha256':sha(src), 'byte_equal':True})

refs = []
for game, rel, purpose, viewed in [
    ('lobby','design/prototypes/00_lobby.png','Shared lobby regression reference; intake pixels not opened',False),
    ('stack','design/prototypes/01_stack.png','Original whole-screen stacking art reference',True),
    ('runner','design/prototypes/02_runner.png','Original whole-screen running art reference',True),
    ('herd','design/prototypes/03_herd.png','Original whole-screen herding art reference',True),
    ('shared_character','design/character_foundation_board.png','Shared sheep identity; six views/poses; not sprite atlas',True),
]:
    p = ROOT/rel
    raw = p.read_bytes()
    assert raw[:8] == b'\x89PNG\r\n\x1a\n'
    refs.append({'game':game,'path':rel,'sha256':sha(p),'width':struct.unpack('>I',raw[16:20])[0],'height':struct.unpack('>I',raw[20:24])[0],'bytes':len(raw),'reference_version':'original_V2.2_delivery','purpose':purpose,'actual_pixels_opened_by_root':viewed,'actual_pixels_opened_by_independent_reviewer':viewed,'accepted_new_golden':False})
rules=json.loads((ROOT/'config/game_rules.v2.1.json').read_text(encoding='utf-8'))
geometry={
    'unit':'one reference pixel = 1000 U; geometry read from unique config, not derived from artwork',
    'seeds':rules['common']['official_logic_seed_by_game'],
    'stack':{'world':[rules['stack']['world_width_u']/1000,rules['stack']['reference_view_height_u']/1000],'tray_width':rules['stack']['tray_width_u']/1000,'layer_height':rules['stack']['layer_height_u']/1000},
    'runner':{'world':[rules['runner']['world_view_width_u']/1000,rules['runner']['world_view_height_u']/1000],'ground_y':rules['runner']['ground_y_u']/1000,'obstacle_widths':[v/1000 for v in rules['runner']['obstacle_width_by_pass_stage_u']],'grass_diameters':[rules['runner']['grass_outer_radius_u']/500,rules['runner']['grass_inner_radius_u']/500]},
    'herd':{'world':[rules['herd']['world_width_u']/1000,rules['herd']['world_height_u']/1000],'fence_y':rules['herd']['fence_y_u']/1000,'gate_open_x':[v/1000 for v in rules['herd']['gate_open_x_u']],'sheep_center_gate_x':[v/1000 for v in rules['herd']['gate_center_x_allowed_u']],'in_pen_center_y_max':rules['herd']['in_pen_center_y_max_u']/1000},
}
assert geometry['seeds']=={'stack':1,'runner':1,'herd':47}
assert geometry['stack']=={'world':[360,480],'tray_width':112,'layer_height':44}
assert geometry['runner']['obstacle_widths']==[8,18,28] and geometry['runner']['grass_diameters']==[9,3]
assert geometry['herd']['gate_open_x']==[144,216] and geometry['herd']['fence_y']==76
write_new(OUT/'R3_REFERENCE_MAP.json',{'version':'R3.0','recorded_at_utc':now,'status':'REFERENCE_INTAKE_ONLY','references':refs,'verified_geometry':geometry,'source_rule_sha256':sha(ROOT/'config/game_rules.v2.1.json'),'visual_layers':'review/r3/DIFFERENCES.md','geometry_overlays':[],'geometry_overlays_status':'NOT_RUN','new_candidates':[],'user_signoff':None})

entry={
    'updated_at_utc':now,
    'stage':'R3-A_PARTIAL_LOCAL_PROJECT_VISIBILITY_BLOCKED',
    'execution':'docs/R3_VISUAL_EXECUTION.txt',
    'status':'docs/R3_VISUAL_STATUS.md',
    'current':'review/r3/CURRENT.json',
    'project_directory_verified':True,
    'project_visible_in_app':True,
    'this_task_visible_in_project':None,
    'old_parallel_writers_verified_absent':False,
    'window_access':'second_normal_request_succeeded; no pending approval',
    'project_thread_api':'FAILED_MCP_MINUS_32000',
    'runtime_code_or_assets_changed':False,
    'sample_art_accepted':False,
    'production_art_accepted':False,
    'S3':'NOT_READY',
    'R3_B_to_E':'NOT_RUN',
    'new_technical_suites':'NOT_RUN',
    'github_r3':'NOT_ATTEMPTED',
    'physical_devices':'NOT_RUN',
    'human24_216':'NOT_RUN',
    'onsite':'NOT_RUN',
    'next':'Verify supported local project/task association and absence of old writers; then three full GamePage background/UI candidates. No continuation of G4-only priority.',
}
state_path=ROOT/'planning/PROJECT_STATE.json'
raw=state_path.read_bytes()
text=raw.decode('utf-8-sig')
original=json.loads(text)
assert 'r3_visual_repair' not in original
pos=text.rfind('}')
updated=text[:pos].rstrip()+',\n  "r3_visual_repair": '+json.dumps(entry,ensure_ascii=False,indent=2).replace('\n','\n  ')+'\n'+text[pos:]
parsed=json.loads(updated)
assert parsed.pop('r3_visual_repair')==entry and parsed==original
assert state_path.read_bytes()==raw, 'State changed concurrently; stop.'
state_path.write_bytes((b'\xef\xbb\xbf' if raw.startswith(b'\xef\xbb\xbf') else b'')+updated.encode('utf-8'))
note='\n\n## 2026-10-28 R3-A intake — PARTIAL / local task visibility BLOCKED\n\nR3 execution saved at docs/R3_VISUAL_EXECUTION.txt; current facts and exact blocker at docs/R3_VISUAL_STATUS.md and review/r3/CURRENT.json. Three local prototypes and character board actually opened by root and independent read-only reviewer; unique JSON geometry verified, no rules/presentation/runtime asset changes. Project/thread APIs failed; second normal read-only window approval succeeded after first timed out. App screenshot shows named project and old task, but not this R3 task; association and absence of old writers remain unverified. No pending window approval, no denial, no Git commit/push. R3-B/C/D/E, new functional suites, phones/24-person216/onsite NOT_RUN; sample_art_accepted=false, production_art_accepted=false. Existing counts are historical, not new R3 results. Next: verify the supported local project/task association, then three full GamePage background/UI candidates. Intake byte checks and backup record: review/r3/intake-verification.json.\n'
for rel in ['docs/implementation-log.md','docs/test-report.md']:
    with (ROOT/rel).open('a',encoding='utf-8',newline='\n') as stream:stream.write(note)
after=protected()
assert before==after, 'Protected files changed; inspect concurrent changes.'
for name in ['CURRENT.json','ACCEPTANCE_INDEX.json','R3_REFERENCE_MAP.json']:
    json.loads((OUT/name).read_text(encoding='utf-8'))
write_new(OUT/'intake-verification.json',{
    'recorded_at_utc':now,
    'command':'python review/r3/intake.py',
    'checks':{
        'source_head_matches':True,
        'reference_png_headers_and_hashes':True,
        'unique_config_geometry_assertions':True,
        'current_index_json_parses':True,
        'prior_project_state_semantics_preserved':True,
        'protected_hashes_before_after_equal':True,
        'protected_files':len(before),
        'selected_backup_bytes_equal':True,
    },
    'backup_scope':'selected source .blend, runtime manifest, and pre-R3 planning/log files only; not a full repository snapshot',
    'backup_blend_reopened_in_blender':False,
    'backups':backups,
    'execution_sha256':sha(ROOT/'docs/R3_VISUAL_EXECUTION.txt'),
    'runtime_manifest_sha256':sha(ROOT/'apps/web/public/assets/asset-manifest.v1.json'),
    'protected_files_sha256':before,
    'runtime_tests':'NOT_RUN; documentation/reference intake only',
    'git_mutations':False,
    'new_artwork':False,
    'project_task_association_verified':False,
})
print(json.dumps({'status':'INTAKE_RECORDED_PARTIAL_BLOCKED','protected_files':len(before),'backup_files':len(backups),'references':len(refs),'project_task_association_verified':False,'new_artwork':False}))
