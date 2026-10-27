# 2026-10-27 审查修复报告

> 本文保存主工程实施结束时的验证与门槛；之后的审查仓库同步见 [PROGRESS.md](../PROGRESS.md)。文中“未推送”描述当时状态，不是本次同步状态。原output/repair目录在本仓库映射至review/repair-20261027；未上传重复中间帧见SOURCE_SNAPSHOT。

本轮可执行代码修复、三款运行美术候选接入和本地集成验证已完成。**这不是项目整体或正式活动放行：三款正式美术、G5仍REVIEW，G6仍BLOCKED。**

## 基线与不变量

原工程HEAD `9d652fb3fef2ede55ebc462d46445cc855b98dd1` 与审查快照 `6e8e40c1c13ebbaa96c26548c4491d54d4e438da` 来自不同Git历史。按快照保存的原文件SHA比对144项，修复前差异0；F01–F18均仍存在或证据不足，先复现再修复。用户既有未提交修改保留，未重建应用、覆盖AGENTS、提交/强推或公开部署。

唯一 `packages/game-core`、规则、seed 1/1/47、碰撞、门线、积分与整场三次机会未改。规则原字节SHA为 `ce1dd5de9aca976c16331b27443569dc95f0ed176778c202f88a0da848949a83`；规范规则哈希仍 `9ecf6d1d4d88e94114fc6a14bb26263c38006c36caa3e268c7f2cf5427d78a40`。后台产品源码无变更，HTTP契约检查通过。证据见 `review/repair-20261027/frozen-proof.json`。

## 实际页面对照

打开 `review/repair-20261027/index.html`。四张对照在 `comparisons/{lobby,stack,runner,herd}.png`，三张状态总览在 `comparisons/*-states.png`；原生截图全部保留。

三款运行对照前后均390 CSS px/DPR1；输入前缀摘要与实际core tick完全相同（stack411、runner587、herd111），没有改数字凑图。大厅对照均CHECK_IN，但业务夹具数值不同，不能据其比较荣誉值。所有隔离视图均有明确标注，不能替代真实业务验证。已实际查看三款准备、教程和运行页，没有只拍大厅或封面。

## F01–F18逐项结果

表内证据相对 `review/repair-20261027/`，源文件相对项目；“本地PASS”不等于艺术签认、真机或现场PASS。

| 项目 | 结果 | 改动/证据 | 具体结论与限制 |
|---|---|---|---|
| F01 订单/结果资源错绑 | LOCAL_PASS | ui.tsx、App.tsx、ParticipantPages.tsx；ui/stage-a-summary.json；ui/resource-poll-summary.json；ui/csrf-summary.json | 跨id/404/503/ABA/错id；慢轮询不饥饿，过期读取不回写CSRF。 |
| F02 兑换pending恢复 | LOCAL_PASS | ParticipantPages.tsx、repair-state/redemption.ts；ui/stage-a-summary.json | 限定建单前终局拒绝清理；未知结果保留原键，event+participant隔离。无归属旧记录不跨身份自动重放。 |
| F03 真实准备/重练场景 | LOCAL_PASS | GamePage.tsx、renderer.ts；runtime/renderer-reuse-green/results.json；audit/after/v4-renderer-reuse-green/results.json | 三款tick0已解码首帧；无预约/finish；开始/恢复/重练复用canvas，回卷清呈现历史。 |
| F04 本款教程 | LOCAL_PASS_ART_REVIEW | App.tsx、TutorialScene.tsx、visual-repair.css；final-pages/；audit/after/AFTER_REPORT.md | 同清单真实场景与本地共享core教学；移除旧羊硬编码，修旧170px/60px容器样式。 |
| F05 叠层穿插 | TECHNICAL_PASS_ART_REVIEW | renderer.ts、v4羊母源/stack_*、hay_tray_thin；audit/art-runtime/stack-alpha1-clearance.json；audit/art-runtime/C_FINAL_REPORT.md | 19紧凑姿态、35.5高、44层距、净距最小3；1/4/8/20与各阶段真实core诊断。 |
| F06 角色还原 | REVIEW | art-source/v4/、三页v4角色图集；art/V4_HANDOFF.md；art/C1b-sheep-front-side.png | 已实际修原生头身/大绒团/角/短腿/犬耳并导273帧；棉绒质感及角色板最终相符程度未获真人美术签认。 |
| F07 犬/羊实际尺寸 | TECHNICAL_PASS_DEVICE_NOT_RUN | renderer.ts、v4羊/犬图集；art/v4-final-scale-envelopes.json；audit/art-runtime/C_FINAL_REPORT.md | 整类稳定sheep55/dog72、脚pivot不变；八向/行走/吠叫/入圈/拥挤已诊断，真机辨识未验。 |
| F08 牧场空间与材质 | REVIEW | art-source/v4/backdrop_*、v4三背景；art/V4_HANDOFF.md；comparisons/ | 已补叶簇、花草、暖光/谷仓和地面纹理，未烘动态物；与原型的景深/材质仍有差距，保持艺术REVIEW。 |
| F09 标题/页面构图 | LAYOUT_PASS_ART_REVIEW | visual-repair.css、renderer.ts；final-pages/；final-short/；comparisons/lobby.png | 使用提供的木牌SVG、紧凑卡片、自然等比世界和整页装饰；艺术字厚度及最终构图签认未完成。 |
| F10 跨栏/双层福草纹理 | TECHNICAL_PASS_DEVICE_NOT_RUN | renderer.ts、farm_side_v4、fitFrame；audit/art-runtime/C_FINAL_REPORT.md；audit/art-runtime/grass-layer-green/ | 窄栏/草叶/金芯真纹理且不扩大几何；剩余采集物后绘不被羊遮；239/240/241三态像素差分与实际crop通过。3px真机人因未验。 |
| F11 键盘与主动作 | LOCAL_PASS | keyboard.ts、GamePage.tsx；audit/after/v4-renderer-reuse-green/results.json | 按键集合、斜向/松键/失焦清理；Space/Enter/指针一次动作；菜单/表单/弹窗隔离。 |
| F12 身份加载与失败 | LOCAL_PASS | App.tsx、ui.tsx、GamePage.tsx；ui/stage-b-summary.json；ui/csrf-summary.json | 区分loading/401/503/ready；未知暂停新开与钱款操作，轮询失败不卸载现有原局。 |
| F13 统一正式准入 | LOCAL_PASS | repair-state/admission.ts、App.tsx、GamePage.tsx；ui/stage-b-summary.json | CHECK_IN/PLAYING/DRAINING补场、0槽、恢复原局保持服务端准入语义。 |
| F14 礼品图片状态 | LOCAL_PASS | ui.tsx；ui/stage-b-summary.json；ui/b-image-green/results.json | 未配置/未知key/加载/404/解码失败/重试/切key，迟到decode不重新插破图。 |
| F15 恢复入口触区 | LOCAL_PASS | App.tsx、visual-repair.css；ui/stage-b-summary.json | 恢复原局/状态/补场记录四宽实测至少48×48。 |
| F16 二维码与扫码核销 | LOCAL_REAL_HTTP_PG_PASS_DEVICE_NOT_RUN | ParticipantPages.tsx、AdminPage.tsx、VoucherScanner.tsx；real-claim/REAL_CLAIM_REPORT.md；ui/stage-b-summary.json | 实际HTTP+PG+前端上传真实订单QR查询/二次确认/重复核销15检查通过；相机受控fixture通过，物理相机未验。 |
| F17 服务端结果解释 | LOCAL_PASS | ParticipantPages.tsx、repair-state/result-presentation.ts；ui/stage-d-summary.json | 三款核验统计/中文原因；待核验、0分、作废、历史、未知状态及独立身份失败12浏览器目标通过。 |
| F18 证据覆盖与判定 | LOCAL_EVIDENCE_PASS_GATES_RETAINED | 新定向测试、状态/报告/对照图；docs/repair-20261027-report.md；planning/REPAIR_20261027_STATE.json | 保留有效RED/FAIL和脚本误判；隔离视图、真实PG、艺术/真机/真人分列，无整体或现场完成声明。 |

## 最终执行结果

- `npm run typecheck`、`npm run build`、`npm run contracts:check`、`npm run rules:check`退出0；`npm test`19文件、352/352通过（含真实PostgreSQL测试）。最后日志为 `final-*.txt`，不是沿用旧223/312结果。
- `python acceptance/verify_package.py`、资产注册完整性/旧版兼容检查通过；`npm run db:migrate`幂等完成，无新增业务迁移。
- A15、B29、D12浏览器目标分别通过；另补慢轮询、CSRF、迟到图片、同canvas与回卷目标。F03/F04/F11/F12受生命周期变更影响的33项目标最终重验通过。
- 三款真实页面四宽28组、短屏7组和运行页四宽已复拍。独立renderer的core派生诊断按游戏、阶段、方向、采集态组织，原621基础图保留；F10修改后仅runner64组定点重拍替换受影响证据，未靠截图数量宣称整体完成。详情 `audit/art-runtime/C_FINAL_REPORT.md`。
- 19个叠层动画alpha≥1最小相邻托盘净距3逻辑单位；薄托可见112×5.773，栏杆均在8/18/28×30 AABB内，草叶/芯最大像素中心半径约4.4625/1.3376，未扩大4.5/1.5规则圆。
- 独立loopback `sheep_test` 新UUID活动通过真实HTTP+PostgreSQL+真实前端QR上传查单、二次确认和同键重复核销15项检查。真实共享内核重放取得20分后才扣分建单，查询后仍RESERVED；最终一次扣分/一次CLAIMED/一件库存、无退款。服务时钟受控推进48秒，非真人45秒试玩。报告 `real-claim/REAL_CLAIM_REPORT.md`；秘密只在内存，临时HTTP/worker/browser/pool已关闭。
- 最终v4清单下，同一真实参与者通过实际GamePage依次叠高高/跨栏/赶羊，真实UI各一次操作→IndexedDB完整过程→页面自行finish→真实JobRunner/PG核验各20分，36/36检查通过。数据库恰好3局/3个BOUND槽/3笔唯一credit/总60，第四UI入口禁用且真实API返回409 NO_TICKET_SLOT。时钟受控加速，未伪造分数或直接插成绩；三张真实Results终态已实际开图。证据 `real-game-ui/cdc866b1-2c1e-485b-a012-2ec82db9f9cc/result.json`。
- 原开发活动仍CHECK_IN，sessions/point_ledger/redemptions/playtest_runs均0，4个邀请码仍ACTIVE。只刷新开发活动的资源绑定，未开启正式活动或消耗默认身份。
- 构建仍提示renderer分包1376.67kB（gzip360.97kB）；未把构建成功当成低端手机性能测试。

## 素材和未完成项

当前 `art-1.4.0-visual-repair` 清单SHA为 `49eba97a27668b9c39366157714714b9d1550054453134867bbbb7e1a05bd24c`。273角色帧、6新增道具、三张2倍背景和6个原生可编辑母源已交付；v1/v2/v3资源与三份历史清单原字节校验通过。制作来源/静态可变frame扩展已记录，未另写碰撞计分。提供的WebP主视觉/封面保留原字节。

具体未完成项：

1. F06角色棉绒、头身/卷角与角色板的最终相符程度；F08背景景深、材质和空间层次；F09艺术字厚度及整屏构图，仍须真实美术签认与可能的后续精修。三款都保持REVIEW，不虚构签认人或相似度分数。
2. iOS Safari、微信内置浏览器、低端Android、实际触摸/相机权限、声音、首载/内存，以及3px金芯与犬朝向的物理手机辨识未验。
3. 24名独立同事、六种顺序各4人、每款一次练习+三次测试，共216局的真实原始记录尚未采集；每款72局不能当72名独立样本。沿用PRD的中位数60–80、≤30占比≤15%、100占比≤5%、P90−P10≥25；跨款中位数差≤8和同人三款中位数极差中位数≤8均独立验收，保留不利样本。
4. 正式活动信息、真实礼品照片/库存/截止、工作人员交物演练、现场并发/Wi-Fi/蜂窝/断网恢复仍未验，G6继续BLOCKED。

## FAIL与证据有效性

有效缺陷RED包括跨订单/售罄、空准备页、输入日志、身份/准入/图片/触区/凭证、F17、慢轮询/CSRF、同canvas重建、runner回卷和金芯遮挡，均保留原结果。早期审查脚本async IndexedDB假等待、无store读取挂起、resize瞬态、截图先冻结后等待准备/双canvas过渡，以及未校准像素颜色阈值造成的失败分别保留并标明无效推断，未冒充产品FAIL或掩盖为新golden。真实三款UI补测另保留两次测试FAIL：第二页面上下文时钟未resume导致首帧等待，以及汇总SQL误用state列；均修测试后新UUID完整重跑36检查通过，未改产品或数据库契约。最终F10用同viewHash、同坐标的前后差分和实际原生crop确认239有外叶+芯、240只剩芯、241消失；不以此宣称真机人因通过。

## 运行与续接

本地入口 `http://127.0.0.1:5175/#/`，API `http://127.0.0.1:3100/`；主办 `#/admin`、核销 `#/claim`。服务未运行时在本目录 `npm run db:up`、`npm run dev`；私人开发身份仅见忽略的 `.local/development-accounts.json`，不写入报告或公开仓库。

续接先读本报告、`planning/REPAIR_20261027_STATE.json`、`docs/current-handoff.md`，继续当前checkout；不要从空模板重建。下一任务是美术签认/精修、真机验证和真实24人试玩，再检查正式配置与现场演练。旧无归属pending只保留并提示查本人订单/工作人员，不猜归属自动重放。
