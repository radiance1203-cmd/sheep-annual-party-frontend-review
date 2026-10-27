# R2 集成只读复审（2026-10-27）

范围：当前 `renderer.ts`、`presenter-state.ts`、GamePage、TutorialScene，以及 R2 preview/capture/lifecycle/unit tests。只写本报告；没有改源码或 Git。只将 `samples-final` 作为当前采集结果，早期 samples 不作为通过依据。艺术目标、S3 签认、物理手机和现场不在此次技术复审通过范围。

## 发现

### P2：重练/恢复首个快照重新引用旧局 previous，准备页选了行走姿态

- 位置：`apps/web/src/game/renderer.ts:345` 的 `accept`、`:350` 的 `previous = current`、`:357` 的 `beginSession`。
- 根因：`beginSession` 清空 `previous` 并设 `beganSession=true`，随后 `render(initial)` 进入 `accept`。`accept` 在读取这个标志前将它设回 false，并在 tick 不同时无条件执行 `previous = current`，把旧局末态重新放回历史。`drawHerd` 将旧局位置与当前初始位置的差异判为移动；准备状态没有额外强制 idle。相同机制也可能从旧 runner 空中态推导新局 `pendingLanding`。
- 新的真实浏览器复现：已安装 Chromium、本机 `127.0.0.1:5175/tests/r2-preview.html?game=herd`。调用已有只读样板 `manualReplay`，仅传合法输入 `{tick:1,seq:1,type:'DOG_MOVE',value:{x:1000,y:0}}`；点真实“重播”按钮，再等待 200ms。
- 观测：重播前 tick=1、dog x=183.2、action=walk、facing=e；重播后 tick=0、mode=ready、dog x=180、action=walk、facing=n、frame=`dog_iso8__walk__n__f000`。准备页应重建 idle；该 walk 将一直保持到下一次 core step。
- 执行：临时只读 Node/Playwright 命令，退出码 0，没有后台请求或源文件写入。
- 建议：保存 `accept` 入口的首次快照标志；首个 session 快照直接重建 `current`，不要从旧 `current` 生成 `previous` 或 pendingLanding。重练测试增加 ready tick0 的羊犬 idle、旧特效/landing 不迁移断言，再核对恢复原局首态。
- 严重度边界：影响表现重建和 R2 准备状态合同，不会改变 core、积分或机会；不构成数据库/安全问题。建议交付前修复。

### P2 验证缺口：恢复大段追赶时，过期特效仍按“刚入队”计龄

- 位置：`GamePage.tsx:161`–`:164` 只短暂同步设置 recovering 后立即 running；`:210` 后按服务端原时轴追赶，`:217` 每 step 全量发送。`renderer.ts:358` 给全部追赶事件传当前 `displayTime`；`:284` 用 `displayTime - envelope.timeMs` 作为 1800ms TTL。
- 源码推断：已保存的 processedTick 前缀确实不重播，符合一部分恢复合同；但恢复后 processedTick 至服务器当前 tick 的长时间尾段，会在一个 timer 回调中被赋予同一个“现在”的表现时间。此时数秒前的事件并不会被 TTL 判为过期，而会一起呈现。没有证据表明它改变计分或推迟提交；本复审也没有向正式业务发恢复请求。
- 建议：将“重建到现在”与正常逐步呈现区分；保留有序事件记录与计数，按已确认事件的 core tick 相对于当前 core tick 计算装饰过期，或恢复追赶阶段仅重建当前动作并显式记录装饰省略。不要把墙钟或表现时钟送回 core。补一个 processedTick 明显落后当前时轴的恢复测试，而不仅是正常时钟 `runFor(100/250/1000)`。
- 严重度边界：这是源码确认的 TTL/恢复覆盖缺口，尚非本轮真实正式局复现；不应写成“已测得正式局恢复失败”。可由总控选择在本批修正或明确记录为未闭合的 R2 表现项。

## 未发现阻断问题的重点

- 首帧相机：`Scene.create` 内显式设置 viewport/zoom/center，避免此前尚未列入活动 scene 列表而漏配；resize 遍历 `phaser.scene.scenes`。buffer 仍按逻辑世界的统一比例适配，未引入第二套规则。`r2-capture.mts` 比较真实 Phaser `getWorldPoint` 与 CSS 变换，优于仅验证互逆数学公式。当前 `samples-final/results.json` 记载 errors=[]、writes=0；这是读取已有结果，不是此次新跑全部采集。
- 事件身份：按 session+epoch+tick+原数组索引，保留同 tick 同类型同对象事件。highestTick 不随 512 诊断窗口淘汰而倒退；旧 tick 批次被拒绝，当前 tick 的 seen 仍保留。同一 session 单调、每次发送完整 step 原数组的既有调用约束下，没有发现旧批次重新可播放的问题。重练通过 begin 清空新 epoch 状态。
- GamePage 每一个 core step 的完整 events 和该步 output.view 均发送；最终 React snapshot 不再承担中间事件的位置推断。恢复已存前缀的纯 core 重放没有传历史 events。
- 动作/步相：相位存于稳定 actor key，facing 不进入重置条件；位移推进 stride，世界坐标仍取 core.view。移动吠叫优先使用已制作的组合方向，其他方向保留行走并显式标记组合缺口。未以程序 PASS 认定动作艺术质量已合格。
- 正式提交：core 自然终局后设 presenter ended，封存原过程并保存，然后直接 `submit`；未等待表现动作完成或动画回调。表现层没有调用结算/计分/网络。此结论来自代码追踪；此次未新提交正式局。
- 教程：等待 decode 和 renderer.ready 后才启动一个 core tick 源；文字完成取真实事件；pause/hidden 不推进教学；无独立 4 秒完成计时，且没有 240 tick 强制复位。

## 测试覆盖解释

现有 lifecycle 的 100/250/1000ms `page.clock.runFor` 会运行期间定时器，能验证时钟推进和短间隔状态一致性，但并不等同于一次阻塞后补几十个 step 的恢复追赶。现有重播断言检查 tick、队列、effects 和 sprite identity，没有断言 ready 动作，所以没有覆盖上述已复现问题。现有 capture 比较实际相机、core prefix 和真实 viewport；实速录像与受控时钟测试分开，有明确证据边界。

总体：未发现规则/积分/正式提交阻断项；有 1 个已复现的 P2 重建姿态缺陷，另有 1 个恢复 TTL/覆盖缺口。技术复审不能替代三款母样/运动的 S3 艺术接受，production_art_accepted 继续 false。

## 总控修复后的追加复核（保留以上原始发现）

本次追加仅只读重新检查源码和新增断言，没有再次改源码，也没有把总控正在运行的最终 lifecycle 写成已通过。

- 首快照污染：当前 `accept` 在 `beganSession` 分支直接设置 `current=value`、`previous=undefined`、`pendingLanding=false` 后 return；隐式 tick 回卷分支也清空这三项。首快照不会再进入旧 `previous=current` 路径，修复与上述已复现根因直接对应。`beginSession` 的队列、epoch、表现时钟和 forceReset 清理仍保留。
- 过期装饰：`eventEffect` 当前用 `max(displayTime-envelope.timeMs, max(0,current.tick-event.tick)*1000/RULES.common.tick_hz)` 判断 1800ms TTL。追赶尾段即使统一入队时间，仍能按真实已确认 core tick 的时间差识别过期装饰；只读计算没有回流规则或业务。GAME_ENDED 保留显式庆祝尾段例外。源码层面已闭合本报告指出的 TTL 根因。
- 生命周期断言：新增 herd 重播后的全部 actor action=idle；新增追赶前 `beforeCatchupTick`，仅筛选本次追赶新增且 core 年龄超过 54 tick 的装饰，断言 `decorationOmitted=expired`。过滤边界避免把此前已及时播放的历史事件误判为应该过期；这个修正方向正确。诊断单独输出，保留可核查依据。

追加结论：两项发现均已获得针对根因的源码修复，未发现修复引入的规则、计分、事件身份或提交等待问题。最终运行状态以总控随后完成的 lifecycle 命令退出码及诊断为准；本追加不冒充新一次浏览器通过。艺术签认及真机边界不变。
