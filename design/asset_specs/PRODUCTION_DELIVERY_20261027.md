# 实际制作交付 2026-10-27

本文是原始 `planned` 任务书的实际制作增补，不修改相机、方向、锚点、动画帧表或游戏物理契约。

- 原创羊、狗、牧场可编辑 Blender 母源现位于 `art-source/*_master.blend`；羊母源供两个相机共用。对象控制器动作分别保留侧视 idle6 和斜视 idle4，避免同名动作覆盖。
- 已实际渲染侧视38、羊八向104、犬八向112，共254角色帧；另有两视角各11场景帧、5个透明反馈素材、768透明大厅羊图、7个可静音原创合成提示音。源512、固定裁剪256、生产128，无逐帧裁边或缩放。
- 生产路径为 `apps/web/public/assets/`，运行清单 `/assets/asset-manifest.v1.json`。六页PNG/JSON已存在；`frames[key].rect` 继续使用数组 `[x,y,w,h]`，未改为对象。
- 图集机器预检现存于 `art-source/atlas-validation.json`；母源结构检查位于 `master-validation.json`。源命令、工具固定版本、下载校验、来源与重建说明见 `art-source/README.md`。
- 原有30件UI SVG新增12件状态变体；文字、数字和业务状态仍为组件。状态映射 `design/ui_kit/button-states.json`，运行副本 `/assets/ui/button-states.json`。
- 所有新素材标记 `rendered_candidate`，`production_art_accepted:false`；这不是占位SVG，但仍需总控/用户最终视觉判断及真实设备验收。原始11件placeholder保留用于灰盒兼容，不能用它们声称正式外观通过。

当前流程不会自行把T-012/T-050/T-051/T-067改DONE；请总控核验实际文件、预览和前端集成后按项目状态协议登记。真实手机/现场性能/真人难度/正式启用均没有在美术制作中通过。
