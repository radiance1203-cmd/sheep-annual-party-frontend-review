# R3 三款整屏候选 · 2026-10-28

当前 R3-B4-C-sample-a，候选SHA256 `68a94f88ab06e175255ee54a2d8ee0a8a666582dd4b3973bbcfd75adb871a5cb`。
三款准备/教程/运行与320/390/430共27张实际页面，49条运行检查，三段原速自然终局录像已输出。
技术验证PASS；独立艺术九格PARTIAL／整体FAIL；S3 NOT_READY。候选仅本机开发显式query的练习/教程使用，正式清单未改。

- [当前状态](review/r3/CURRENT.json)、[完整报告](docs/r3-20261028-report.md)、[独立实际开图报告](review/r3/audit/B4/pixel-review.md)
- [三款整屏总览](review/r3/evidence/comparisons/overview.png)、[27图及sidecar](review/r3/evidence/pages/)、[原型与真实几何对照](review/r3/evidence/comparisons/)
- [原速录像与实际输入](review/r3/evidence/video/)、[可下载本地打开的画廊](review/r3/evidence/index.html)
- [资产/动作覆盖](review/r3/ASSET_MOTION_COVERAGE.json)、[公开副本与原始证据映射](review/r3/PUBLIC_SOURCE_BINDING.json)、[审查提示词](review/r3/REVIEW_PROMPT.txt)

叠高52/112比例与毛绒/围巾、跨栏/赶羊旧v4角色和道具、部分背景细缝及动作层仍未通过。不能因截图、录像或测试数量宣称整个项目完成。真机/微信、24人216局与现场NOT_RUN。
原主工程仍保留用户未提交工作；本仓库为安全前端导出，不包含后台、数据库/账号/员工/兑换数据或大型.blend。旧轮证据保留本地且公开列出hash，不能冒充本轮。

---
以下为历史进度与产出，旧计数不算本轮重跑。

## 2026-10-27 R2g 聚焦恢复阶段

仅继续同两视图的直接控制面/接缝雕刻；功能代码与608e2a5的33文件逐项一致。已交F2/G同光同机位、截面/顶点操作、原生64尺寸及真实renderer局部对照。G4目标区域角急折/穿面已修，内卷细化和开环仍有视觉代价，绒毛仍偏泡棉；生产艺术接受保持false，没有扩动作或进入S4。

[恢复阶段报告](docs/r2g-recovery-report.md) · [原型/F2/G对照](review/r2-20261027/recovery-g/) · [图像工具输入诊断与待补参考](review/r2-20261027/recovery-g/imagegen-diagnostic.md)

# R2 技术修复与有限美术样板 · 2026-10-27

当前增量：R01–R05、高清buffer、独立表现时钟、完整事件及持久sprite已在本机真实引擎验证。仍用原产品，未重建。**美术仍未达目标，S1/S2艺术范围未完成，S3未签认，production_art_accepted=false；未进入S4。**

- [本轮完整报告与几何差异](docs/r2-20261027-report.md)
- [真实320/390/430页面](review/r2-20261027/pages/results.json)
- [三宽/DPR与真实相机检查](review/r2-20261027/samples-final/results.json)
- [12秒叠高片段](review/r2-20261027/samples-final/stack-12s.mp4)、[12秒跨栏片段](review/r2-20261027/samples-final/runner-12s.mp4)、[15秒赶羊片段](review/r2-20261027/samples-final/herd-15s.mp4)
- [母样/原型差异与制作证据](review/r2-20261027/art/)、[R01–R05报告](review/r2-20261027/frontend/REPORT.md)、[本轮状态](review/r2-state.json)

片段使用现有v4资产和新presenter的真实core合法输入回放；新母样只按明示的局部动作/视图展示，不冒充完整新美术。物理手机/微信、24人216局和现场未验。后台、凭据/数据库、私人备份和大型原生.blend继续保留在主工程，不从审查快照缺项推断主工程缺失。

---
以下为保留的历史记录；旧测试计数不等于本轮重新执行。

# 本轮产出物索引

| 产出 | 仓库入口 |
|---|---|
| 当前进度、真实PASS及未完成门槛 | [PROGRESS.md](PROGRESS.md) |
| F01–F18修复、证据与限制 | [修复报告](docs/repair-20261027-report.md) / [findings.json](review/repair-20261027/findings.json) |
| 原审查任务书/固定6e8e40c报告 | [任务书](codex-repair-tasks-20261027.txt) / [原审查HTML源码](sheep-frontend-review-20261027.html) |
| 四页原型/修复前/当前对照 | [大厅](review/repair-20261027/comparisons/lobby.png) / [叠高高](review/repair-20261027/comparisons/stack.png) / [跨栏](review/repair-20261027/comparisons/runner.png) / [赶羊](review/repair-20261027/comparisons/herd.png) |
| 三款准备/教程/运行三态总览 | [叠高高](review/repair-20261027/comparisons/stack-states.png) / [跨栏](review/repair-20261027/comparisons/runner-states.png) / [赶羊](review/repair-20261027/comparisons/herd-states.png) |
| 四宽与短屏实际页面原图 | [final-pages](review/repair-20261027/final-pages/) / [final-short](review/repair-20261027/final-short/) |
| 当前运行原图 | [叠高高/赶羊](review/repair-20261027/final-running-reused/) / [跨栏最终层序](review/repair-20261027/final-running-runner-foreground/) |
| 规则派生逐tick、8向、拥挤、双层草证据 | [C诊断报告](review/repair-20261027/audit/art-runtime/C_FINAL_REPORT.md) / [联系表](review/repair-20261027/audit/art-runtime/v4-integrated-contacts/) |
| 金芯遮挡实际像素前后差分 | [三态放大图](review/repair-20261027/audit/art-runtime/grass-layer-green/crops/golden239-240-241-before-after-6x.png) |
| 当前完整角色/环境运行PNG与atlas | [characters](apps/web/public/assets/characters/) / [environment](apps/web/public/assets/environment/) / [当前清单](apps/web/public/assets/asset-manifest.v1.json) |
| 母源四视图、实际尺寸和制作收据 | [v4样张](art-source/v4/samples-C1b/) / [v4交接](review/repair-20261027/art/V4_HANDOFF.md) / [技术报告](art-source/v4/atlas-validation-v4.json) |
| 原型与角色板 | [visual-repair-v1/references](visual-repair-v1/references/) |
| 原完整工程真实业务验证报告 | [三款GamePage](review/repair-20261027/real-game-ui/REAL_GAME_UI_REPORT.md) / [QR核销](review/repair-20261027/real-claim/REAL_CLAIM_REPORT.md) |
| 上传完整性、安装/构建/测试与源SHA | [upload-verification](review/upload-verification.json) / [SOURCE_SNAPSHOT](SOURCE_SNAPSHOT.json) |

GitHub显示HTML时通常只看源码；视觉审查直接打开PNG或下载后用本地HTML画廊。没有实际图像读取能力时，相关美术判断应标NOT_RUN。原. blend母源留在主工程，源SHA/制作说明可查；不把它们的省略当作主工程缺失。未公开部署网站。
