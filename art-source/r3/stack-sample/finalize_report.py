from pathlib import Path
import json,hashlib
R=Path.cwd();O=R/'review/r3/stack-sample';r=json.loads((O/'motion-render-report.json').read_text());m=json.loads((O/'sheep_stack_A_sample.atlas.json').read_text());missing=['dedicated stack_miss animation NOT_DONE','separate perfect-specific animation NOT_DONE; celebration first beat only limited feasibility reaction','anatomical sheep-tail motion NOT_DONE','ear motion implemented in celebration only; idle ear flutter NOT_DONE','full three-game action production NOT_DONE','prototype-width geometry acceptance BLOCKED']
r['missing']=missing;m['missing']=missing
for p,data in [(O/'motion-render-report.json',r),(O/'sheep_stack_A_sample.atlas.json',m)]:p.write_text(json.dumps(data,indent=2),encoding='utf-8')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
text=f'''# R3-C limited stack motion sample — PARTIAL

Task `R3-C-SAMPLE`, shared checkout baseline `9d652fb3fef2ede55ebc462d46445cc855b98dd1`.
Write ownership: only new `art-source/r3/stack-sample/` and `review/r3/stack-sample/`. No product source, runtime asset, manifest, dependency or Git mutations.

Read-only G4 mother: `art-source/r2/r2g/sheep_master_r2g.blend`, SHA256 `e6875118a2cca427b380bf40838d679ac9b742d80ab7fff2e117058cb058feff`. Original prototype, character board and G4 stack pixels actually opened. Both pose candidates and v2 collar frames actually opened; root selected A only for a limited pipeline proof, not accepted visual golden.

## Produced candidate

- Editable master: `{r['master']}`; SHA256 `{r['master_sha256']}`. All four per-controller actions saved, source identities preserved; Blender4.5.9.
- Native PNGs: `frames/`, fourteen512 RGBA files. Study2 + collarv1two + collarv2two + motion14 =20rendered frames total.
- Atlas: `sheep_stack_A_sample.atlas.png`1024x512; SHA256 `{sha(O/'sheep_stack_A_sample.atlas.png')}`. Lossless common trim, no resizing; source512frames kept. JSON carries perframe alpha bounds, common rect, fixed pivots, source hashes and fps.
- Review: `pose-comparison-board.png`, `motion-contact-sheet.png`, `motion-preview.gif`. GIF is asset-action playback only, not gameplay timing, core-event or browser acceptance evidence.

## Geometry and anchor ledger

A alpha166x116: h44 =>w62.966; w112 =>h78.265. B149x137: h44 =>w47.854; w112 =>h102.980. Legal leg folds and body/head placement still fail to fill112-width within44-height. No whole-model nonuniform scale or flattened sheep.

Dynamic union actualalpha182x126; fixed uniform maxheight40 =>unionwidth57.778; maxheight44=>63.556. Same scale across allframes. This is a pipeline feasibility fit, not solving prototype width or accepting a smaller sheep as a newgolden.

Common trim `[168,130,360,266]`; cell192x136. Immutable object-space worldfloor origin projects to native`[256,256.000153]`, trim`[88,126.000153]`. Oblique camera depth produces actualalpha bottomy257..260. A constant safe visual foot anchor is native`[256,260]`, trim`[88,130]`, separately included for screen-tray composition. Do not independently fit or pivot eachframe. No baked ground shadow, tray, rootdrop translation or gameplay timing in theseassets; root owns those. All sampled visiblemesh lower bounding plane worldz is normalized0 using root translation, while root and body remain uniformscale.

40-high character plus6-high tray would be46 if assigned disjoint extents; cannot literally claim both fit44 without an explicit consistent overlap/height allocation. No game-core, traywidth, layerstep or projection changed by thissubtask.

## Clip coverage

| Clip | Frames/fps | Coverage |
|---|---|---|
| stack_idle.e |4/8 loop| Gentle uniformbody breath, headmotion, eye blink f2; scarf/bell secondary |
| stack_air.e |2/6 loop| Existing legs extend slightly; head/scarf trail; worlddrop remains consumer-owned |
| stack_steady.e |4/15 one-shot| Contact headduck/limbfold, localbody lean, rebound and neutralsettle; no wholebody squash |
| stack_celebrate.e |4/12 loop| Head/ear/foreleg/body sway and scarf secondary |

Dedicated miss NOT_DONE. Separate perfect action NOT_DONE; celebration firstbeat is only a possible limited reaction. Anatomical tail NOT_DONE; idle earflutter NOT_DONE. Straight tubular scarf, face/body, horn/wool and prototypeproportion still differ from reference. No artistic PASS.

## Actual verification

All commands exited0:

- `blender --background --python art-source/r3/stack-sample/render_pose_study.py` —2poses.
- `python art-source/r3/stack-sample/compare_pose_study.py` —alpha metrics and board.
- `blender --background --python art-source/r3/stack-sample/verify_poses.py` —both savedposes reopened, G4 mesh/camera/light/source unchanged, uniformroot.
- `blender --background --python art-source/r3/stack-sample/repair_collar_review.py` —2v1reviewframes.
- `blender --background --python art-source/r3/stack-sample/correct_collar_height.py` —2v2reviewframes.
- `blender --background --python art-source/r3/stack-sample/render_motion_sample.py` —14motionframes and neweditablemaster.
- `python art-source/r3/stack-sample/package_motion_sample.py` —losslessatlas, metadata, contactsheet, GIF.
- `python art-source/r3/stack-sample/annotate_foot_anchor.py` —constantvisualfoot alongside objectspacepivot.
- `blender --background --python art-source/r3/stack-sample/verify_motion_native.py` —master reopened, allfourclipbindings re-evaluated over14frames; face/horn/fleece coordinate hashes, camera/light preserved; uniformroot/body; allfootworldz0; G4 sourcehash unchanged.

The executable actually used is projectlocal `.local/tools/blender-4.5.9-windows-x64/blender.exe`. No renderer reinstall or API/credential use. Native14frame contact sheet, blink and contact frame pixels opened. Runtimebrowsercapture remains rootowned and NOT_RUN by thissubtask.

Status: limitedpipeline candidate delivered; geometry/art PARTIAL / prototypewidth BLOCKED. `sample_art_accepted=false`; `production_art_accepted=false`; S3 human gate retained. No batchproduction, formal manifest, realdevice or现场 claims.
'''
(O/'README.md').write_text(text,encoding='utf-8');print(r['master_sha256'])
