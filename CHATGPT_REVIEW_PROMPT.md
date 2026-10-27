R2补充：请先实际查看 review/r2-20261027 的最新母样对照、pages 和 samples-final 片段，再读 docs/r2-20261027-report.md。不要用旧PASS、测试数量或自评95%代替本轮艺术接受。新母样未达最终质量，不得自动设golden。优先定位卷角/口鼻、绒毛层级材质、场景构图三类差距，并保留112/44、8/18/28、9/3和顶部真实门线。源码、参考和候选有明确版本/hash；原生母源本地保留，审查导出只附脚本/预览/hash。不要因此重建产品或认为主工程无后台。

请审查公开仓库 https://github.com/radiance1203-cmd/sheep-annual-party-frontend-review 当前main的前端和运行美术。先只审查，不重建、不发布、不改冻结玩法。

1. 先读README.md、PROGRESS.md、DELIVERABLES.md、REVIEW_GUIDE.md及SOURCE_SNAPSHOT.json，确认这是主项目的前端审查快照；后台实现/.blend/大量重复中间原帧有意省略，不能当主工程缺失。
2. 完整读原codex-repair-tasks-20261027.txt和6e8e40c历史审查HTML，再读docs/repair-20261027-report.md与review/repair-20261027/findings.json，逐项判断F01–F18当前是否修好或仍有残留，不盲信历史PASS。
3. 实际查看visual-repair-v1/references的四原型和角色板；review/repair-20261027/comparisons的四对照与三款准备/教程/运行三态；相关原生390/短屏图、v4母源样张和C诊断联系表。当前运行清单为art1.4，不能拿封面或旧review根目录图代替当前游戏画面。没有图像读取能力的项标NOT_RUN，不能凭文件名说已看图。
4. 追踪到组件/CSS/renderer/asset_id/frame/实际逻辑和显示尺寸；重点核查跨订单/未知兑换、准备和同canvas生命周期、身份失败/CSRF、按键松开/重练回卷、合法DRAINING补场、48px触区、QR只查单二次确认、真实服务端结果解释，以及叠层44净距/三栏宽/草双层/八方向遮挡。
5. 规则/seed1/1/47/整场3槽/碰撞/门线/积分冻结，唯一game-core共用，Phaser只表现。不能改世界比例或用假分数/假库存凑UI。源码与图像问题分开；F06/F08/F09及三款正式艺术仍REVIEW，G5 REVIEW/G6 BLOCKED。单测/fixture截图/原工程受控时钟业务测试不能代替真人、真机或正式签认。
6. 能运行时执行README的独立快照检查和复拍，明确报告你本次亲自执行的结果；原完整工程352测试/真实三款36检查/核销15检查只是有范围的已记录证据，不混成快照本次结果。

按严重程度输出问题表：页面/状态/图像区域、实际差异、当前文件行号、asset_id/frame、影响、最小修复与可证伪验收条件。另列已查通过、未检查、艺术签认/真人/真机仍缺项。不要虚构相似度或笼统宣布完成；最后给可直接交回Codex的剩余修复任务单。
