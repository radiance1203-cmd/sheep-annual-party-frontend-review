"""Read-only product/evidence audit; writes only this B3 review directory."""
from pathlib import Path
from hashlib import sha256
import json
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
EXPECTED = "4f0a870f96b8f40f8b2dd11ac4d4ef7f5b4b1c9d9203ecb03812008b057898ba"
EVIDENCE = "output/r3-20261028/B3-4f0a870f/"
SOURCE_BACKUP = ".local/r3-B3-4f0a870f-source/"

def digest(path):
    return sha256((ROOT / path).read_bytes()).hexdigest()

def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))

manifest_path = "apps/web/public/assets/candidates/r3/releases/" + EXPECTED + "/manifest.json"
manifest = read(manifest_path)
captures = read(EVIDENCE + "pages/results.json")["captures"]
checks = []
all_sources = {}
for c in captures:
    image_path = EVIDENCE + "pages/" + c["filename"]
    sidecar = image_path.replace(".png", ".json")
    sources_bad = []
    for p, recorded in c["hashes"].items():
        actual = digest(SOURCE_BACKUP + p)
        all_sources[p] = {"recorded_sha256": recorded, "actual_sha256": actual, "historical_snapshot_path": SOURCE_BACKUP + p}
        if recorded != actual:
            sources_bad.append(p)
    anchor = manifest["page_backgrounds"][c["game"]]
    anchor_path = "apps/web/public/assets/candidates/r3/" + anchor["image"]
    check = {
        "path": image_path,
        "sha256": digest(image_path),
        "sidecar_sha256": digest(sidecar),
        "game": c["game"], "state": c["state"],
        "viewport": c["before"]["viewport"],
        "candidate_binding_ok": c["candidateManifestSha256"] == EXPECTED and c["before"]["stage"].get("candidateManifest") == EXPECTED and c["after"]["stage"].get("candidateManifest") == EXPECTED,
        "png_binding_ok": digest(image_path) == c["screenshotSha256"],
        "sidecar_same_as_index": read(sidecar) == c,
        "source_binding_mismatches": sources_bad,
        "page_background_binding_ok": digest(anchor_path) == anchor["sha256"],
        "page_background_requested": any(a.endswith("/" + anchor["image"]) for a in c["requestedAssets"]),
        "configured_anchor_error_css_px": c["pageAnchor"]["errorCssPx"],
        "captured_at": c["capturedAt"],
        "tick_range": [c[phase]["stage"].get("gameTick", c[phase]["teaching"].get("teachingTick")) for phase in ("before", "after")],
        "tick_source": "teachingTick" if c["state"] == "tutorial" else "gameTick",
        "input_prefix_counts": {phase: len(c["actualInputPrefixes"][phase]) for phase in ("beforeScreenshot", "afterScreenshot")},
        "input_prefix_provenance": c["actualInputPrefixes"]["provenance"],
        "presentation_time_range": [c["before"]["stage"].get("presentationTime"), c["after"]["stage"].get("presentationTime")],
        "errors": c["errors"],
        "actual_pixels_opened_by_reviewer": True,
    }
    checks.append(check)

reference_paths = ["design/prototypes/01_stack.png", "design/prototypes/02_runner.png", "design/prototypes/03_herd.png", "design/character_foundation_board.png"]
first_three = [f"{EVIDENCE}first-three/{g}-running-390.png" for g in ("stack", "runner", "herd")]
checkpoint = read("review/r3/local-entry-checkpoint.json")
frozen_prefixes = ("packages/game-core/", "config/", "packages/contracts/")
frozen_exact = {"apps/web/public/assets/asset-manifest.v1.json", "package.json", "package-lock.json"}
immutable = [{"path": f["path"], "checkpoint_sha256": f["sha256"], "actual_sha256": digest(f["path"]), "unchanged": digest(f["path"]) == f["sha256"]} for f in checkpoint["files"] if f["path"].startswith(frozen_prefixes) or f["path"] in frozen_exact]
fail = [x["path"] for x in checks if not x["candidate_binding_ok"] or not x["png_binding_ok"] or not x["sidecar_same_as_index"] or x["source_binding_mismatches"] or not x["page_background_binding_ok"] or not x["page_background_requested"] or x["errors"]]
result = {
    "review": "Archived R3-B3 independent static pixel review; not current B4 evidence or user acceptance",
    "archived_evidence_directory": EVIDENCE,
    "historical_source_snapshot_directory": SOURCE_BACKUP,
    "historical_source_binding_scope": "Compare capture hashes to the verified B3 source snapshot; later current-workspace B4 changes are not old-version binding failures.",
    "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
    "expected_candidate_sha256": EXPECTED,
    "actual_candidate_sha256": digest(manifest_path),
    "capture_count": len(checks),
    "recorded_source_hashset_count": len({json.dumps(c["hashes"], sort_keys=True) for c in captures}),
    "binding_status": "PASS" if not fail and len(checks) == 27 and digest(manifest_path) == EXPECTED else "FAIL",
    "binding_failures": fail,
    "captures": checks,
    "references_actually_opened": [{"path": p, "sha256": digest(p), "actual_pixels_opened_by_reviewer": True} for p in reference_paths],
    "additional_first_three_actually_opened": [{"path": p, "sha256": digest(p), "actual_pixels_opened_by_reviewer": True} for p in first_three],
    "source_bindings": all_sources,
    "immutable_checkpoint_bindings": immutable,
    "product_writes": False,
    "browser_executed_by_reviewer": False,
    "git_or_dependency_operations": False,
    "model_configuration_evidence": "Parent reported inspection of .codex/config.toml model and agents defaults as gpt-6.1-sol / high; reviewer does not claim server-side runtime identity proof.",
    "sample_art_accepted": False,
    "production_art_accepted": False,
    "S3": "NOT_READY; explicit user gate",
}
(OUT / "pixel-review-receipt.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"binding_status": result["binding_status"], "capture_count": len(checks), "binding_failures": fail, "immutable_unchanged": all(x["unchanged"] for x in immutable)}, ensure_ascii=False))
