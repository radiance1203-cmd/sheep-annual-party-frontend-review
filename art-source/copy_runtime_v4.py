"""Copy only new v4 runtime candidate files; never update a manifest or old bytes."""
from pathlib import Path
import json,hashlib,shutil,sys
B=Path(__file__).resolve().parent;ROOT=B.parent;V=B/'v4';PUB=ROOT/'apps/web/public/assets';data=json.loads((V/'manifest-update-records.json').read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
baseline=V/'runtime-baseline-before-copy.json'
if not baseline.exists():
    current=json.loads((PUB/'asset-manifest.v1.json').read_text(encoding='utf-8'))
    records=[{'asset_id':a['asset_id'],'path':a['path'],'sha256':a['sha256']} for a in current['assets'] if a.get('path') and a.get('sha256') and a['path'].startswith('apps/web/public/assets/')]
    baseline.write_text(json.dumps({'manifest_sha256':sha(PUB/'asset-manifest.v1.json'),'rules_sha256':sha(ROOT/'config/game_rules.v2.1.json'),'records':records},indent=2)+'\n')
copied=[]
for u in data['updates']:
    if not u['candidate_path']:continue
    src=ROOT/u['candidate_path'];dest=ROOT/u['record']['path'];relative=dest.resolve().relative_to(PUB.resolve())
    if '--characters-only' in sys.argv and relative.parts[0]!='characters':continue
    if '--props-only' in sys.argv and not relative.name.startswith('farm_side_v4'):continue
    if '--backgrounds-only' in sys.argv and not relative.name.startswith('backdrop_'):continue
    assert '_v4.' in dest.name
    assert sha(src)==u['record']['sha256']
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():
        if sha(dest)!=sha(src) and '--replace-unregistered' in sys.argv:
            active=json.loads((PUB/'asset-manifest.v1.json').read_text(encoding='utf-8'))
            assert not any(a.get('path')==u['record']['path'] for a in active['assets']),'Refuse modifying a registered file'
            shutil.copyfile(src,dest)
        assert sha(dest)==sha(src),'v4 path already differs: '+str(dest)
    else:shutil.copyfile(src,dest)
    assert sha(dest)==u['record']['sha256']
    copied.append({'asset_id':u['asset_id'],'path':u['record']['path'],'sha256':sha(dest),'bytes':dest.stat().st_size})
label='characters' if '--characters-only' in sys.argv else 'props' if '--props-only' in sys.argv else 'backgrounds' if '--backgrounds-only' in sys.argv else 'all'
(V/('runtime-copy-'+label+'.json')).write_text(json.dumps({'status':'COPIED_NEW_V4_ONLY','manifest_modified':False,'records':copied},indent=2)+'\n')
print(json.dumps({'status':'COPIED_NEW_V4_ONLY','files':len(copied),'group':label}))
