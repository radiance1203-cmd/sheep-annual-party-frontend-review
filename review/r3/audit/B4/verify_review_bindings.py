"""B4 read-only product/capture audit. Output is confined to this directory."""
from pathlib import Path
from hashlib import sha256
import json
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
EXPECTED = "68a94f88ab06e175255ee54a2d8ee0a8a666582dd4b3973bbcfd75adb871a5cb"
EVIDENCE = "output/r3-20261028/"
SOURCE_PREFIX = ""
MANIFEST_PATH = "apps/web/public/assets/candidates/r3/manifest.json"

def digest(path):
    return sha256((ROOT / path).read_bytes()).hexdigest()

def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))

manifest = read(MANIFEST_PATH)
captures = read(EVIDENCE + "pages/results.json")["captures"]
checks, all_sources = [], {}
for c in captures:
    path = EVIDENCE + "pages/" + c["filename"]
    sidecar = path.replace(".png", ".json")
    sources_bad = []
    for p, recorded in c["hashes"].items():
        actual = digest(SOURCE_PREFIX + p)
        all_sources[p] = {"recorded_sha256": recorded, "actual_sha256": actual, "evidence_path": SOURCE_PREFIX + p}
        if actual != recorded:
            sources_bad.append(p)
    page_bg = manifest["page_backgrounds"][c["game"]]
    bg_path = "apps/web/public/assets/candidates/r3/" + page_bg["image"]
    checks.append({
        "path": path, "sha256": digest(path), "sidecar_sha256": digest(sidecar),
        "game": c["game"], "state": c["state"], "viewport": c["before"]["viewport"],
        "candidate_binding_ok": c["candidateManifestSha256"] == EXPECTED and all(c[phase]["stage"].get("candidateManifest") == EXPECTED for phase in ("before", "after")),
        "png_binding_ok": digest(path) == c["screenshotSha256"],
        "sidecar_same_as_index": read(sidecar) == c,
        "source_binding_mismatches": sources_bad,
        "page_background_binding_ok": digest(bg_path) == page_bg["sha256"],
        "page_background_requested": any(a.endswith("/" + page_bg["image"]) for a in c["requestedAssets"]),
        "configured_anchor_error_css_px": c["pageAnchor"]["errorCssPx"],
        "captured_at": c["capturedAt"],
        "tick_range": [c[phase]["stage"].get("gameTick", c[phase]["teaching"].get("teachingTick")) for phase in ("before", "after")],
        "tick_source": "teachingTick" if c["state"] == "tutorial" else "gameTick",
        "input_prefix_counts": {phase: len(c["actualInputPrefixes"][phase]) for phase in ("beforeScreenshot", "afterScreenshot")},
        "input_prefix_provenance": c["actualInputPrefixes"]["provenance"],
        "presentation_time_range": [c[phase]["stage"].get("presentationTime") for phase in ("before", "after")],
        "canvas_css_rect": c["before"]["rects"]["canvas"],
        "recorded_control_semantic_names": [control["text"] for control in c["before"]["controls"]],
        "page_background_position": c["before"]["pageScenery"],
        "errors": c["errors"],
        "actual_pixels_opened_by_reviewer_this_B4_stage": True,
    })

manifest_assets = []
sections = [*manifest["backgrounds"].values(), *manifest["page_backgrounds"].values(), manifest["ui"]["title"], manifest["stack_sample"], manifest["fence"]]
for entry in sections:
    for file_key, hash_key in (("image", "image_sha256" if "image_sha256" in entry else "sha256"), ("metadata", "metadata_sha256")):
        if file_key in entry and hash_key in entry:
            path = "apps/web/public/assets/candidates/r3/" + entry[file_key]
            manifest_assets.append({"path": path, "recorded_sha256": entry[hash_key], "actual_sha256": digest(path), "matches": digest(path) == entry[hash_key]})

checkpoint = read("review/r3/local-entry-checkpoint.json")
fixed_prefixes = ("packages/game-core/", "config/", "packages/contracts/")
fixed_exact = {"apps/web/public/assets/asset-manifest.v1.json", "package.json", "package-lock.json"}
immutable = [{"path": f["path"], "checkpoint_sha256": f["sha256"], "actual_sha256": digest(f["path"]), "unchanged": digest(f["path"]) == f["sha256"]} for f in checkpoint["files"] if f["path"].startswith(fixed_prefixes) or f["path"] in fixed_exact]
references = ["design/prototypes/01_stack.png", "design/prototypes/02_runner.png", "design/prototypes/03_herd.png", "design/character_foundation_board.png"]
fail = [x["path"] for x in checks if not all(x[k] for k in ("candidate_binding_ok", "png_binding_ok", "sidecar_same_as_index", "page_background_binding_ok", "page_background_requested")) or x["source_binding_mismatches"] or x["errors"]]
result = {
    "review": "R3-B4 independent actual static pixels; not user or production acceptance",
    "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
    "evidence_directory": EVIDENCE, "source_prefix": SOURCE_PREFIX,
    "expected_candidate_sha256": EXPECTED, "actual_candidate_sha256": digest(MANIFEST_PATH),
    "capture_count": len(checks), "recorded_source_hashset_count": len({json.dumps(c["hashes"], sort_keys=True) for c in captures}),
    "binding_status": "PASS" if not fail and len(checks) == 27 and digest(MANIFEST_PATH) == EXPECTED and all(a["matches"] for a in manifest_assets) else "FAIL",
    "binding_failures": fail, "captures": checks, "source_bindings": all_sources,
    "manifest_asset_bindings": manifest_assets, "immutable_checkpoint_bindings": immutable,
    "references_previously_actually_opened_in_this_same_conversation": [{"path": p, "sha256": digest(p), "pixels_opened": True, "stage": "B3 reference intake; originals reused as permitted; not regenerated or accepted new golden"} for p in references],
    "product_writes": False, "browser_executed_by_reviewer": False, "git_or_dependency_operations": False,
    "model_configuration_evidence": "Parent inspected user Codex model and agents defaults as gpt-6.1-sol / high; reviewer does not claim server-side runtime identity proof.",
    "art_status": "PARTIAL_ALL_NINE; overall art acceptance FAIL",
    "sample_art_accepted": False, "production_art_accepted": False, "S3": "NOT_READY; explicit user gate",
}
(OUT / "pixel-review-receipt.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"binding_status": result["binding_status"], "capture_count": len(checks), "source_hashsets": result["recorded_source_hashset_count"], "binding_failures": fail, "manifest_assets_match": all(a["matches"] for a in manifest_assets), "immutable_unchanged": all(x["unchanged"] for x in immutable)}, ensure_ascii=False))
