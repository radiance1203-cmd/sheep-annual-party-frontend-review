# 审查路径与证据边界

先读 [PROGRESS.md](PROGRESS.md)、[DELIVERABLES.md](DELIVERABLES.md)、SOURCE_SNAPSHOT.json，再对照F01–F18检查修复是否真正成立。原6e8e40c审查报告是历史基线，不等于当前18项仍全部存在，也不等于当前报告写PASS就可免查。

## 实际开图

- 目标始终是 visual-repair-v1/references 的四原型与character_foundation_board.png。
- 当前对照/三态：review/repair-20261027/comparisons。实际四宽/短屏页：final-pages、final-short；运行页：final-running-reused(叠高/赶羊)与final-running-runner-foreground(跨栏)。
- 当前角色/背景/道具来自asset-manifest的art1.4；atlas逻辑兼容键v1不等于实际加载v1。
- 母源迭代/小尺寸：art-source/v4/samples-C1b、review/repair-20261027/art；完整图集和contact都可查看。.blend与大量重复原帧有意未上传，SHA/遗漏索引和复拍工具已附。
- 逐tick叠层/八向/拥挤/有界道具：audit/art-runtime/C_FINAL_REPORT.md和v4-integrated-contacts；不要将旧runner被遮挡图当最终图，后绘修复另有RED/GREEN像素对照。

## 追到代码

App.tsx管理路由/身份/准入；ui.tsx管理资源与图片；repair-state包括准入/兑换/扫码/结果解释；GamePage.tsx负责唯一core时轴、输入、完整日志、同canvas准备/启用/恢复；renderer.ts/presentation.ts只做表现。48px触区、16px正文和自然FIT不能为像原型改碰撞/门线或非均匀拉伸世界。

## 验证结论分开

导出快照能独立重跑core/web typecheck/build/test/contracts/rules和fixture截图。原完整工程还真实执行三款GamePage36检查/QR核销15检查（服务与浏览器时钟受控）；本快照不含后台，不能重跑那两项，也不能据此宣布后台未实现。目录中失败证据有真实缺陷RED和测试工具误判，按各报告有效性说明阅读，不能把全部FAIL藏掉或全部算产品缺陷。

F06角色棉绒/头身、F08材质景深、F09艺术字/构图继续REVIEW；三款未获正式美术签认。物理相机、iOS/微信/Android触摸/内存、24独立人216局、正式配置与现场网络/交物未验。G5 REVIEW/G6 BLOCKED。

## 公开访问

本仓库公开，无需把登录cookie或token放进链接。连接器若只读UTF8文本，仍不能声称看过PNG；请在有图像能力的会话直接打开/下载PNG再审。HTML在GitHub多为源码，优先使用直接图片链接。任何历史私有访问说明仅适用于旧记录。
