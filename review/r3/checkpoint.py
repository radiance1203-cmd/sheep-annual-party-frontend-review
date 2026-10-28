"""Preserve the existing worktree before local R3 candidate authoring. No Git writes."""
from pathlib import Path
import datetime
import hashlib
import json
import shutil
import subprocess

root = Path(__file__).resolve().parents[2]
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup = root / '.local' / ('r3-worktree-' + stamp)
backup.mkdir(parents=True, exist_ok=False)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
paths = subprocess.check_output(['git', 'ls-files', '-c', '-o', '--exclude-standard', '-z'], cwd=root).decode('utf-8').split('\0')
selected = sorted({p for p in paths if p and (p.startswith(('apps/web/src/', 'packages/game-core/', 'packages/contracts/', 'apps/server/src/', 'config/')) or p in ['package.json', 'package-lock.json', 'AGENTS.md', 'apps/web/public/assets/asset-manifest.v1.json', 'docs/R3_VISUAL_STATUS.md', 'planning/PROJECT_STATE.json', 'review/r3/CURRENT.json', 'art-source/r2/r2g/sheep_master_r2g.blend'])})
rows = []
for name in selected:
    p = root / name
    if not p.is_file():
        continue
    target = backup / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, target)
    assert sha(p) == sha(target)
    rows.append({'path': name, 'sha256': sha(p), 'bytes': p.stat().st_size})
receipt = {'recorded_at_utc': stamp, 'source_head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(), 'files': rows, 'backup_scope': 'source/config/manifest/G4 master + selected state, not all historical renders', 'backup_local_directory': str(backup.relative_to(root)).replace('\\', '/'), 'project_id': '6ed4c556-6be5-4ae6-819d-ee2ca2f7189b', 'local_thread_id': '01a17aab-47dd-7480-961e-abfdfa76e7eb', 'thread_title': '实现羊年年会游戏平台', 'association_evidence': 'Codex list_projects + list_threads: exact cwd/projectId/local active thread; current environment visualization thread id matches', 'parallel_writer_evidence': 'collaboration.list_agents returned only /root; same-project list_threads has only this active Codex task', 'entry_blocker_resolved': True, 'roles': {'root': ['assets.ts', 'renderer.ts', 'r3-candidate.ts', 'new art-source/r3/', 'new candidates/r3/', 'review/r3/', 'integration/state/Git'], 'R3-UI': ['GamePage.tsx', 'TutorialScene.tsx', 'App.tsx tutorial markup only', 'new r3-ui.css', 'main.tsx CSS import only'], 'R3-AUDIT': ['review/r3/audit/ only; product read-only']}, 'sample_art_accepted': False, 'production_art_accepted': False}
(root / 'review/r3/local-entry-checkpoint.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'files_backed_up': len(rows), 'backup': receipt['backup_local_directory'], 'entry_blocker_resolved': True}))
