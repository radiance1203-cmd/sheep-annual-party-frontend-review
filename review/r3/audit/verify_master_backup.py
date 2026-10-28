"""Read-only reopen of the preserved G4 master and this R3 checkpoint copy."""
import hashlib
import json
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "art-source/r2/r2g/sheep_master_r2g.blend"
BACKUP = ROOT / ".local/r3-worktree-20261028T002136Z/art-source/r2/r2g/sheep_master_r2g.blend"
REPORT = Path(__file__).with_name("master-backup-reopen.json")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inspect(path):
    bpy.ops.wm.open_mainfile(filepath=str(path), load_ui=False)
    images = [image for image in bpy.data.images if image.source == "FILE"]
    external_images = [image for image in images if not image.packed_file]
    missing_images = [image.name for image in external_images if not Path(bpy.path.abspath(image.filepath)).exists()]
    missing_libraries = [library.name for library in bpy.data.libraries if not Path(bpy.path.abspath(library.filepath)).exists()]
    return {
        "objects": len(bpy.data.objects),
        "meshes": len(bpy.data.meshes),
        "materials": len(bpy.data.materials),
        "actions": len(bpy.data.actions),
        "scenes": len(bpy.data.scenes),
        "sheep_root_exists": "sheep_root" in bpy.data.objects,
        "face_control_exists": "R2d_face_control_surface" in bpy.data.objects,
        "horns_exist": all(f"R2e_horn_{side}" in bpy.data.objects for side in [-1, 1]),
        "side_camera_exists": "side_v1" in bpy.data.objects,
        "file_images": len(images),
        "unpacked_file_images": len(external_images),
        "missing_image_names": missing_images,
        "missing_library_names": missing_libraries,
    }


before_source, before_backup = digest(SOURCE), digest(BACKUP)
assert before_source == before_backup, "Checkpoint master differs from current G4 master"
source_receipt, backup_receipt = inspect(SOURCE), inspect(BACKUP)
assert source_receipt == backup_receipt, "Reopened checkpoint structure differs"
assert source_receipt["sheep_root_exists"] and source_receipt["horns_exist"]
assert not backup_receipt["missing_image_names"] and not backup_receipt["missing_library_names"]
assert before_source == digest(SOURCE) and before_backup == digest(BACKUP), "Read-only check changed master bytes"
REPORT.write_text(json.dumps({
    "status": "PASS_REOPEN_ONLY",
    "blender_version": bpy.app.version_string,
    "source": str(SOURCE.relative_to(ROOT)),
    "backup": str(BACKUP.relative_to(ROOT)),
    "source_sha256": before_source,
    "backup_sha256": before_backup,
    "source_and_backup_byte_equal": True,
    "source_and_backup_unchanged_after_reopen": True,
    "receipt": backup_receipt,
    "writes": [str(REPORT.relative_to(ROOT))],
    "render_test": "NOT_RUN",
    "art_acceptance": "NOT_EVALUATED_BY_REOPEN",
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("R3_AUDIT_MASTER_BACKUP_REOPEN_PASS", flush=True)
