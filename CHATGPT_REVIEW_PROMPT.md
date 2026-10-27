请审查私有仓库 https://github.com/radiance1203-cmd/sheep-annual-party-frontend-review 的前端代码和UI美术视觉效果。先只审查并输出具体问题，不重建应用、不发布、不改冻结规则。

1. 先读README.md、REVIEW_GUIDE.md、SOURCE_SNAPSHOT.json，确认这只是主工程的前端审查快照，不把未上传的后台或.blend判成主工程缺失。
2. 必须实际查看visual-repair-v1/references/四张原型和角色板，以及review/的四张*-comparison.png、layout-*.png、motion-contact.png、screenshots/原生图。若无法读取私有仓库或无法查看PNG像素，明确说明缺少什么访问/图像能力，相关判断保持NOT_RUN，不能凭文件名声称已看图。
3. 分开审大厅、羊羊叠高高、羊羊跨栏、赶羊入圈、结算/榜单/礼品/凭证。重点检查是否还原原型的构图、细绒/浅脸/卷角/红围巾单铃、软3D牧场层次、木牌/奶油卡片/红按钮、角色比例和动态图集一致性。三款正式美术仍REVIEW，不因既有报告或大厅通过而放行。
4. 将每个视觉问题追到实际组件/CSS/renderer/asset_id/atlas frame；审查布局/字体/48px触区/状态真实/图像裁切/八方向/遮挡排序/动作锚点/加载失败与旧版本兼容。若能运行则按README做typecheck/build/test与隔离复拍，不把fixture当真实API闭环或真人真机。
5. 游戏规则、seed、整场三次机会、碰撞、门线和计分冻结；Phaser只表现，packages/game-core为唯一内核。不能为像参考图而另写规则、拉伸世界、移动实际门线或画假数据。

输出：按严重程度列问题表（页面/截图区域、实际差异、代码文件和行号、asset_id或frame、影响、最小修复建议），另列已通过、未检查和仍需正式美术签认的项。明确区分你本次亲自检查的证据与仓库历史测试记录，不给虚构相似度。最后提供一份可直接交回Codex实施的修复任务清单。
