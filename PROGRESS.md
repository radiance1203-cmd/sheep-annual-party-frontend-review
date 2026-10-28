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

# 审查修复进度 · 2026-10-27

本仓库已同步原审查提交 `6e8e40c` 之后的前端修复与art-1.4.0候选资源。主工程基础HEAD仍为9d652fb，实际包含保留的用户工作区修改；来源与原文件SHA见 [SOURCE_SNAPSHOT.json](SOURCE_SNAPSHOT.json)。这里是可构建的前端审查快照，不是后台缺失的新项目。

## 已落地

- 订单/结果切换按资源身份绑定，避免旧订单和新操作错绑；明确售罄可改选，未知兑换保原幂等键，按参与者/活动隔离。
- 三款准备页先画已解码tick0；开始、恢复和重练复用同canvas，失败可重试；教程使用本款真实资源和共享core教学。修复键盘斜向/松键/吠叫、焦点Space/Enter和重练姿态残留。
- 区分身份加载、401与503，旧响应不写回CSRF；图片加载失败可重试，关键恢复触区达48px。
- 正常凭证显示不透明QR；相机/上传和手输共用查单，明确二次确认才核销。结果解释服务端核验统计与中文原因，历史/作废/未知状态不冒充当前成功。
- 同母源v4角色273帧，6个新增道具、三张独立2倍背景；叠层专用姿态/薄托不穿头，窄栏与双层福草保持真实几何，剩余金芯后绘不被羊遮住。原版资源和历史清单保留。

完整 [F01–F18逐项结果与限制](docs/repair-20261027-report.md) / [结构化状态](review/repair-20261027/findings.json) / [产出物索引](DELIVERABLES.md)。

## 证据和范围

| 范围 | 真实执行记录 | 说明 |
|---|---|---|
| 原完整主工程 | 19文件352单测通过，typecheck/build/contracts/rules通过 | 含本地PostgreSQL；是主工程记录，不冒充本快照重跑 |
| 三款真实页面正式闭环 | [36项通过](review/repair-20261027/real-game-ui/REAL_GAME_UI_REPORT.md) | 同一参与者DROP/JUMP/BARK各1；真实HTTP/PG/worker各20分、三槽60分、第四次409；受控时钟 |
| 真实QR兑奖联通 | [15项通过](review/repair-20261027/real-claim/REAL_CLAIM_REPORT.md) | 真实QR上传查单/明确确认/重复核销唯一；不是物理相机 |
| 定向视图与呈现 | A15/B29/D12、受影响33项、布局/逐tick/八向/拥挤诊断 | [诊断报告](review/repair-20261027/audit/art-runtime/C_FINAL_REPORT.md)；原始FAIL及测试误判分别保留 |
| 此次审查快照重跑 | [review/upload-verification.json](review/upload-verification.json) | 本次独立快照252项通过，typecheck/build/contracts/rules通过；28页面+12运行复拍，0业务写入；不将主工程352算成快照测试数 |

当前清单SHA `49eba97a27668b9c39366157714714b9d1550054453134867bbbb7e1a05bd24c`；规则版本、seed1/1/47、碰撞、门线、积分与整场3槽未改，仍仅用唯一game-core。

## 仍未完成 / 不放行

- F06：羊的棉绒、头身/卷角与角色板；F08：牧场景深/材质/层次；F09：标题字形与整屏构图，仍需真实美术签认或精修。三款均REVIEW，production_art_accepted=false。
- iOS/微信/Android物理手机、相机权限/触摸/内存、3px金芯和犬朝向可辨性仍NOT_RUN。
- 24名独立同事、六种顺序、216局真实试玩及PRD配对/分层统计未采集；自动化20分样例不是真人难度数据。
- 正式活动/真实礼品配置、现场网络/并发/交物演练未验。G5 REVIEW、G6 BLOCKED。

## 上传边界

同步前端源码、唯一规则核/契约、完整运行资产、参考、母源预览/来源哈希、关键原生截图/全动作联系表和结构化证据。未上传后台实现、任何凭据/数据库、.blend及批量中间渲染。大量重复原帧留本地主工程；[上传范围](review/repair-20261027/UPLOAD_SCOPE.json)和SOURCE_SNAPSHOT逐项列明遗漏。联系表不是重绘页面，缺少的原帧可用复拍脚本重生，不应推断为主项目未制作。
