"""Static supplement integrity only. This does not test the user's app."""
from pathlib import Path
import hashlib
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))

def main():
    for p in ROOT.rglob('*.json'):
        json.loads(p.read_text(encoding='utf-8'))
    assets = read('04_ASSET_INTEGRATION.json')['assets']
    assert len(assets) == 4
    assert len({a['supplement_asset_id'] for a in assets}) == 4
    for a in assets:
        for kind in ('source','runtime'):
            p = ROOT / a[kind+'_path']
            assert p.is_file(), p
            assert p.stat().st_size == a[kind+'_bytes'], p
            assert hashlib.sha256(p.read_bytes()).hexdigest() == a[kind+'_sha256'], p
        assert a['object_fit'] == 'contain'
        assert a['gameplay_asset'] is False
        assert a['ready_in_user_app'] is False
        sw,sh = a['source_pixels']; rw,rh = a['runtime_pixels']
        assert sw*rh == sh*rw
        assert rw <= sw and rh <= sh
    cases = read('05_CAPTURE_CASES.json')['cases']
    valid_phases = {'CHECK_IN','PLAYING','DRAINING','REDEEMING','CLOSED'}
    assert len({c['id'] for c in cases}) == len(cases)
    for c in cases:
        assert set(c['event_phases']) <= valid_phases
        assert c['status'] == 'NOT_RUN' and c['evidence'] == []
        if c['reference'].startswith('references/'):
            assert (ROOT / c['reference']).is_file()
    ac = read('06_VISUAL_ACCEPTANCE.json')['cases']
    aids = {a['id'] for a in ac}
    assert len(aids) == len(ac)
    assert all(a['status'] == 'NOT_RUN' and a['evidence'] == [] for a in ac)
    tasks = read('07_EXECUTION_TASKS.json')['tasks']
    task_map = {t['id']:t for t in tasks}
    assert len(task_map) == len(tasks)
    covered = set()
    visited = set(); active = set()
    def visit(tid):
        if tid in visited: return
        assert tid not in active, 'dependency cycle'
        assert tid in task_map, tid
        active.add(tid)
        for dep in task_map[tid]['depends_on']: visit(dep)
        active.remove(tid); visited.add(tid)
    for t in tasks:
        assert t['status'] == 'TODO' and t['evidence'] == []
        assert set(t['acceptance']) <= aids
        covered.update(t['acceptance']); visit(t['id'])
    assert covered == aids
    assert 'VA-05' not in task_map['VR-03']['acceptance']
    assert 'VA-05' in task_map['VR-05']['acceptance']
    for p in ROOT.rglob('*.svg'): ET.parse(p)
    assert (ROOT / 'layout/lobby_390.png').is_file()
    refs = [p for p in (ROOT/'references').glob('*.png')]
    assert len(refs) == 5
    prompts = read('11_STATIC_ASSET_PROMPTS.json')['jobs']
    assert {j['asset_id'] for j in prompts} == {a['supplement_asset_id'] for a in assets}
    for j in prompts:
        for ref in j['reference_files']: assert (ROOT / ref).is_file()
    result = {'scope':'Static supplement files only; no user-app tests', 'status':'PASS',
              'reference_images':len(refs),'static_art_sources':len(assets),'runtime_webp_images':len(assets),
              'runtime_total_bytes':sum(a['runtime_bytes'] for a in assets),
              'capture_case_groups':len(cases),'acceptance_cases':len(ac),'repair_tasks':len(tasks),
              'tasks_acyclic':True,'acceptance_coverage_complete':True,
              'app_integration_tested':False,'gameplay_art_created_this_turn':False,
              'actual_device_tested':False,'human_playtest_performed':False}
    (ROOT/'evidence/package_verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
