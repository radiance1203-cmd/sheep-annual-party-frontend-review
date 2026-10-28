# R3 独立审阅基线

审阅范围：共享 checkout，基线 `9d652fb3fef2ede55ebc462d46445cc855b98dd1`；仅 `review/r3/audit/` 可写。产品、规则、素材、主文档、Git 索引和依赖未由本审阅者改写。尚未运行浏览器，也未看到本轮候选 GamePage 截图。本文件不是 R3-B 或艺术通过记录。

本审阅者实际通过 `view_image` 打开了 `design/prototypes/01_stack.png`、`02_runner.png`、`03_herd.png` 和 `design/character_foundation_board.png` 的像素。下表是开图观察，不是分割测量或规则提取。

| 层 | 叠高 | 跨栏 | 赶羊 |
|---|---|---|---|
| UI/反馈 | 顶部厚木牌金字，奶油整条统计，红色大动作按钮；反馈贴近落点右侧 | 木牌下两行奶油统计，横向舞台，底部红按钮和小提示条 | 木牌/单行统计；摇杆、吠叫置底，不能压到门口 |
| 远景 | 蓝天白云占主要上半空间，两侧树冠及灯笼，右后红谷仓 | 谷仓偏右，树冠包围天光，围栏/红旗形成向远处的层次 | 左上果树、右上谷仓和灯笼，场地上方仍有可读空间 |
| 中景 | 草垛、横栏、右后谷仓，层级柔化 | 木栏后草垛，跑道前后草带分明 | 圈内草坪、木栏形成圈内外区别；原图门为中央透视构图 |
| 活动区 | 中轴塔清晰，短草托，向上留移动空间 | 羊侧视、脚点落在连续土跑道；原图障碍和草明显是说明性放大 | 犬在下、未入圈羊居中、已入圈羊在上；犬羊背向身份和门口清楚 |
| 前景 | 草花、草垛、近景木柱，虚化留出中轴 | 柔焦草花包边，不能与真实障碍或福草混同 | 木桶/箱/草垛在边缘，不能形成第二条实际可走的门 |
| 材质/光 | 暖光、奶油毛绒/米棕脸/厚卷角、织物围巾与金铃；阴影轻且贴地 | 同一角色身份、木纹/草土有细节，背景柔化，角色轮廓锐 | 同暖色、毛绒犬羊；近景草和远景木材密度不同，避免整片纯草 |

角色板明确的是圆脸、米白分级毛束、厚实卷角、红色织物围巾、金铃和棕蹄。同母源不同朝向需保留这些比例。它不是九种动作的图集，也不能证明当前母模已达到该外观。

## 已实查的配置与来源

参数唯一来源 `config/game_rules.v2.1.json`，SHA256 `ce1dd5de9aca976c16331b27443569dc95f0ed176778c202f88a0da848949a83`。seed 为 1/1/47。叠高世界 360×480、托宽112、层距44；跨栏世界360×220、ground_y180、栏宽8/18/28、外圈/金芯直径9/3；赶羊360×420、门线y76、入口x144..216、羊中心过门区间154..206、入圈中心y≤66。没有提出碰撞/计分/种子变化。

`presenter-state.ts:bufferLayout` 以统一比例 FIT，DPR 请求3采用2；`worldToClient` 含 buffer offset；`clientToWorld` 是逆变换。所有叠加图应使用截图时真实 canvas DOMRect、layout 和 GameView，不可用原型中的角色/门位置倒推规则。

| 叠加项 | 直接读取点 | 应画出的内容 |
|---|---|---|
| 世界可见区/输入区 | renderer diagnostics.layout + canvas DOMRect；presenter-state worldToClient | 四角、中心、实际 canvas 边界；DPR/requested/effective 分列 |
| 叠高 | GameView.top_support / placed_layers / moving_tray；renderer drawStack camera `max(0,480*.42+8-top_support.y/1000)` | 各托中心及112宽；相邻44高；移动托沿现有 renderer FALL进度显示位置；原 core 中心与呈现中心分色，不能把插值当第二套物理 |
| 跨栏 | GameView.obstacles[].bounds、sheep_foot、grass[].center；RULES body x74..102/top foot-36/bottom foot-2 | 精确障碍AABB、脚点/身体AABB、半径4.5/1.5两圆；ground y180。不得按美术贴图估计拾取半径 |
| 赶羊 | RULES.herd fence_y/gate/expanded_sheep_fence_aabbs；GameView dog/sheep centers | y76门线、x144/216门边、x154/206羊中心可过区、y66入圈阈值，犬/羊半径9/10及犬合法中心范围 |

## 候选隔离与同画布恢复审阅要求

建议的 `preloadAssets(game,base,hash,'r3')` 只能由 dev/loopback 的练习与教程显式调用；默认三参必须保持正式manifest路径。第四参是呈现选择，不可写入context、session、输入、重放或分数。正式页即使 URL 有候选标志，也必须使用正常资源。不要通过候选加载失败静默混回旧图后记录为新候选。

需要 root 实际执行并留证的关键回归：

1. 默认调用不请求任何 `candidates/r3` 路径；loopback/development + r3 才请求；production/nonloopback 拒绝或明确禁用。`localhost.evil` 不能通过主机白名单。
2. 三款教程、练习准备/运行继承相同候选hash；正式准备、正式开始、正式恢复不请求候选且没有候选UI样式。正式路径选择需显式受 practice 判断约束。
3. 准备完成到开始后 canvas 节点保持同一对象且始终只有一个；正式恢复原局同样；未重新预载、不重置原服务器开赛时间/seed/输入前缀。当前 GamePage 的 bootstrap 已复用 renderer，保留该行为。
4. 候选元数据/PNG hash不符、尺寸错、decode失败时清理 objectURL、只显示真实重试，不启动正式局；修复后重试仍只有一个canvas。
5. practice 重练/教程切换/路由返回释放renderer、纹理、监听器；旧事件不重播；暂停表现时钟停住，恢复不改变逻辑输入时轴。
6. 页面延展背景 `--game-scenery-image` 引用 objectURL，必须随renderer销毁/候选切换清理，防止已撤销URL或R3残留污染正式页。CSS动态数据/按钮应仍为真实DOM。
7. 三尺寸320×568、390×844、430×932，DPR1/2/3需验证FIT四角/中心映射、完整跳跃顶点和门口可见、主要触区≥48CSS px；DPR cap须如实记录。浏览器视口不算真机。

以上是待执行检查项，不是测试结果。当前没有本轮三款三态的艺术PASS，没有S3签认；sample_art_accepted=false、production_art_accepted=false；真机/真人/现场均NOT_RUN。

## 母源恢复与代理配置证据

实际命令：`.local/tools/blender-4.5.9-windows-x64/blender.exe --background --factory-startup --disable-autoexec --python review/r3/audit/verify_master_backup.py`，退出0，Blender 4.5.9 LTS分别重新打开当前G4母源与本轮checkpoint副本，字节hash同为 `e6875118a2cca427b380bf40838d679ac9b742d80ab7fff2e117058cb058feff`，开图前后不变。546对象、474 mesh数据、12材质、171 actions；没有FILE图片或缺失链接库。详见 `master-backup-reopen.json`。只证明此母源副本当前可重开及结构一致，不证明所有历史工件完整备份或视觉质量。

读取的 Codex 配置声明 `model=gpt-6.1-sol`、`model_reasoning_effort=high`、`review_model=gpt-6.1-sol`，`[agents]`默认模型/推理也为gpt-6.1-sol/high。用户目录custom agents及checkout `.agents`不存在。本次代理由root按显式模型/推理参数派发；配置证据不等于服务器实际执行模型的保证，未取得独立服务器执行收据。
