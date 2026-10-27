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
