# v4 — final rendered candidate and retained C1 history

Current handoff: `273` character frames, `20` side environment frames (14 original + 6 additions), three 2x scenery pages, six editable native mothers, and 20 manifest update records are delivered. `atlas-validation-v4.json` is the independent technical receipt; `manifest-update-records.json` is for root-only registration. Registered source/PNG/atlas/registry files are now frozen. All art remains `REVIEW`, `production_art_accepted=false`; technical export is not human visual/device/onsite signoff.

See `../../output/repair-20261027/art/V4_HANDOFF.md` for actual implementation, final mapping, measured envelope, budgets, historical failures and remaining scope. The final side atlas has 57 frames, 1024×1280; iso sheep 104 and dog 112 retain their original keys/fps/pivots. The 19 stack frames reach maximum alpha1 height 35.5 logical at size 64. Thin frame is tight 194×10 / pivot [97,5], uniformly visible 112×5.773. Root candidate sizes: stack 64, runner 56, herd sheep 55, dog 72. Final source and resource hashes are in the registry/native receipt.

Production commands actually executed: `render_v4.py`; `build_props_v4.py`; `build_backdrops_v4.py --build-only/--preview/--render`; `package_v4.py`; `copy_runtime_v4.py`; `v4/inspect_final_mothers.py`; `verify_v4.py`. No old resource or source was overwritten, no dependency was installed, and art did not mutate the active manifest. Root owns publication and integrated running-page validation.

The C1 notes below are retained historical review context. C1/C1b sources are archived under `history/`; their sample receipts identify those archived hashes and must not be mistaken for the final source hash after V4 action baking. The current mothers and full render receipts are authoritative for this candidate.

## Historical C1 review

Status: `C1_STATIC_REVIEW_PENDING`, `production_art_accepted=false`. Root must actually open the four-view comparison, fixed-production-camera samples and 320/390 CSS candidate sheet before full atlas export. No runtime manifest registration has occurred.

`../repair_masters_v4.py` loads existing `../v2/{sheep,dog}_master_v2.blend`, edits named geometry/materials/controllers, saves new native v4 mothers, then renders static review PNGs. It never executes the v1 generator. Original collections, cameras, roots and actions remain editable. 190 old sheep body beads and old fine head tufts are retained hidden; 62 large body lobes, larger head lobes, lower ankle fleece and short fibers define the new silhouette. Horns use a capped, tapered oblique curl so front and side remain readable. The dog has wider head/chest, shorter ears and more readable cream volume.

`pose_v4` in the new script defines normal and added `stack_idle`, `stack_air`, `stack_steady`, `stack_celebrate` controller poses. The compact stack preset is the same native sheep, with head/leg articulation and a uniform .93 root scale, never a stretched bitmap. Current five critical static samples reach alpha≥1 height 73 px in the fixed128 frame, or 36.5 logical units at whole-frame size64. Full action envelope has not been measured or approved yet. New action baking waits full-export authorization; retained v2 actions remain historical editable actions.

Actual render: Blender 4.5.9 LTS `8bf95cbd38d1`; Cycles CUDA GPU, NVIDIA GeForce GTX1060 6GB, 32 samples + denoising, AgX Medium High Contrast, exposure .45. CPU and OptiX devices were not selected. There are no external generated images, credentials, texture downloads or image API calls.

Scripts:

```powershell
& '.local/tools/blender-4.5.9-windows-x64/blender.exe' -b --python art-source/repair_masters_v4.py -- --actor sheep
& '.local/tools/blender-4.5.9-windows-x64/blender.exe' -b --python art-source/repair_masters_v4.py -- --actor dog
& '.local/tools/blender-4.5.9-windows-x64/blender.exe' -b --python art-source/v4/inspect_c1_mothers.py
python art-source/v4/package_c1_review.py
python art-source/v4/verify_c1.py
```

`samples/` contains 512 RGBA raw renders. `review/frames128/` uses the unchanged camera crops and pivots; no trim or per-frame recenter. `source-review-*.json` and `C1-native-source-structure.json` record exact source/mother hashes, renderer, sample paths, editable mesh/curve/controller metadata. No `.blend` was copied to the output evidence directory.

Human review material: `../../output/repair-20261027/art/C1-*`. CSS candidate sheet records a snapshot/hash of the actual browser canvas metric file, and is an analytically scaled asset sheet rather than a screenshot. It currently uses 320 scene width about303.984 CSS px and 390 width about373.984 CSS px. Suggested initial whole-frame sizes are stack64, runner56, herd sheep47, dog60. These are review candidates; crowd/gate overlap, full actions and fresh running-page screenshots still need integration review. True-device readability remains NOT_RUN.

First round failed horn tips and overly exposed legs were actually opened; representative failed views remain under `output/repair-20261027/art/round1`. Subsequent native geometry repairs fixed the observed open horn ends and covered upper legs. Residual plush/silhouette quality is still for visual review, not certified by technical pixel checks.

After root sample permission: preserve38 existing side keys,104 sheep iso frames,112 dog frames; append stack_* actions on the side page. New prop frame naming is frozen as `hay_tray_thin` and `hurdle_narrow/medium/wide`, with same-centered `clover_outer/core`. Prop/background/native-farm construction has not started in C1. Keep old files, use only new v4 resources, and do not register the current manifest from art scripts.
