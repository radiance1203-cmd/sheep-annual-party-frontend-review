# A 组有限材质样板交付

本批是可接入审查的局部材质候选，**艺术 PARTIAL / 参考材质未通过**；sample_art_accepted 与 production_art_accepted 均 false。不得称为八向完整动作生产或三款最终美术。

## 真实产出

- 31 张 512×512 原生透明 PNG 位于 `frames/`；四份 `{sheep_stack,sheep_side,sheep_iso8,dog_iso8}_materials_A.png` 与同名 `.atlas.json`。
- 叠高沿用既有 14 帧、4 动作；side 为 e/idle f0、e/run f0/f2；羊 iso 为 n/se 的 idle f0、walk f0/f2；犬为 n/se 的 idle f0、walk f0/f2、bark f1。
- 非 stack 动画只将上述有限姿态引用铺回原槽数与原 fps，保持旧总周期。bark 是单姿态材质样板，不是完整发力动作。未列方向与动作继续用旧 v4。
- `native-contact-sheet.png` 是实际512图原生比例裁区的中性底审查板，无修图。原图、首样及技术错误归档均保留；`first-technical-v0/` 的方向标签已证实错误，**不可接入**。

## 固定映射和真实测量

stack：common crop `[168,130,360,266]`（192×136），联合 alpha `[172,134,354,260]`，恰为182×126；安全足点 source `(256,260)`，crop `(88,130)`，未扩大52×36屏幕包络，托112/层44不动。原相机 `side_v1` 未改。

side/iso/dog：沿用 render_plan 的256原生crop并缩到128方格、旧pivot分别 `(64,112)/(64,98)/(64,98)`；所有实渲alpha均无crop溢出。每帧原生alpha、source floor projection、相机、root/body scale在 `render-report.json`。

材质操作只编辑shader与固定渲染设置，不改几何、相机、既有动作或毛数量/长度；方向使用 delta rotation 纠正绑定root动作的重评估覆盖，不改原action。新母源在 `art-source/r3/a-window-20261028/`，旧三母源SHA已重新核对不变。

注意旧动作自身包含scale：叠高idle f1/f3的body各轴为1.008/0.992，root固定0.93；犬bark f1的body为 `(1,1.03,1.02)`。遵照本批材质优先边界保留这些旧曲线，未暗中修动作。不得描述为本批已消除所有历史伸缩。

## 实际开图结论

首样实际打开后定位两件问题：绑定root动作覆盖方向（技术错误，已用delta rotation纠正）；过高sheen使围巾与犬毛泛白。唯一复修降低羊毛、围巾、犬的sheen，未增加采样或纤维。

现有可见改善是脸/角较暖、朱红围巾颜色、羊毛微表面和犬棕白身份。犬背仍是明显光滑的大体块；羊仍非原型团绒形，织物纹理在小尺寸下较弱。材质限制真实保留，不做额外参数迭代，不报参考PASS。

## 已实际运行

```
.local/tools/blender-4.5.9-windows-x64/blender.exe -b --python art-source/r3/a-window-20261028/inspect.py
.local/tools/blender-4.5.9-windows-x64/blender.exe -b --python art-source/r3/a-window-20261028/render_materials.py -- --first
.local/tools/blender-4.5.9-windows-x64/blender.exe -b --python art-source/r3/a-window-20261028/render_materials.py -- --first --refine
.local/tools/blender-4.5.9-windows-x64/blender.exe -b --python art-source/r3/a-window-20261028/render_materials.py
python art-source/r3/a-window-20261028/package_materials.py
```

Blender4.5.9 / GTX1060 6GB CUDA、CPU device禁用、64 samples；最终31帧渲染累计74.186秒，非整体壁钟时长。原生PNG hash、母源hash、四Atlas hash、脚点/相机及动作缺项均在 `render-report.json` 与 `verification.json`。

核验已实际执行：31原生尺寸/hash、四Atlas逐帧像素回读、固定crop无溢出、旧源hash保持、非stack有限引用的旧槽数与fps、n/se图hash确实不同。已实开最终原生审查板及完整stack atlas。

本分工未改runtime、manifest、规则、产品页面或Git。总控继续同版GamePage开图与独立复审后，才统一释放完整窗口。
