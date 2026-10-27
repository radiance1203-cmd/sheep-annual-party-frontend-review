# C 最终独立呈现层诊断 · art-1.4.0

当前清单SHA：`49eba97a27668b9c39366157714714b9d1550054453134867bbbb7e1a05bd24c`。所有本报告最终图均来自真实 `preloadAssets` / 生产 `renderer` 和共享core合法输入重放；没有编辑碰撞、门线、位置或统计，没有业务API请求。截图标题明确为独立诊断，不冒充GamePage或后台通过。

## 可确认结果

- **叠层邻接已消除穿头问题**：当前19个stack专用帧，alpha≥1保守包围盒可见高35–35.5逻辑单位；整类统一显示64、羊锚点y−2、相邻上层plate保守区间y−45..y−39，全部帧最小净距3。实际开图检查1/4/8/20层、相应SWING/FALL/SETTLE逐tick联系表和自然终局，未见原F05的头部/上背与上层托盘互穿。薄托实际alpha显示112×5.773195876逻辑单位，居于112×6目标框，未改44层距。
- **三种栏宽和草形状保留真实几何**：8/18/28×30障碍目标AABB内，alpha1可见分别7.75×28.5、17.75×29.375、27.75×29.625；统一fit比例0.125，无非均匀拉伸。草叶/金芯仍按4.5/1.5真实半径，源alpha像素中心最大半径4.46252/1.33756，目标框9×9/3×3不变。报告明确这是像素中心采样，不把抗锯齿像素面积边缘说成连续圆的严格证明。
- **金芯原先被羊遮住的问题已真实修复**：golden草1 tick239未取、240仅外圈已取、241两圈已取。原对象/原PNG证明前两态金芯在opaque羊后方；总控将草循环后绘。修后实际对象顺序在runner之后，239可见外圈与金芯，240只剩金芯，241消失；同core viewHash、同中心、同半径。原RED全部保留，修后runner五视口定向补拍取代原runner候选，没有重写golden状态。
- **八向和关键状态有真实呈现证据**：八条合法DOG_MOVE方向分别得到facing0–7；walk、BARK onset与active tick7均实际拍摄。黄金herd初始八羊、每只入圈前后、门口诊断窗口最大6只（tick78）、自然终局225均从原golden输入得出。实际开图中八向区别存在，场景完整，未见本轮standalone的右下1/4裁切。
- **同renderer回卷残留已修复**：只读审查发现旧lastBumpTick/lastLandingTick未随重练回退，真实runner碰栏166→新core0→10仍显示bump，目标RED。总控只清呈现历史，GREEN实际frame为run。准备/运行同canvas生命周期改动后，另对F03/F11/F12和三款教学的原33项行为目标重验33/33通过。

## 可直接审阅的图

- `v4-integrated-contacts/stack-1-4-8-20-plate-contacts-390.png`：四种高度的实际接触crop。
- `v4-integrated-contacts/stack-{1,4,8,20}-all-phase-every-tick-390.png`：逐tick原帧联系表，已逐张实际打开；每张均对应原生PNG和viewHash。
- `v4-integrated-contacts/runner-real-props-and-three-grass-states-390.png` 与 `runner-props-core-AABB-radius-overlay-390.png`：真实道具及core几何。
- `grass-layer-green/crops/golden239-240-241-before-after-6x.png`：原RED/新后绘三态同位置对照；仅24×24原生crop做6×nearest像素放大，已实际打开确认。各单crop和原PNG索引在同目录。
- `v4-integrated-contacts/herd-eight-directions-{walk,bark}-dog-crops-390.png`、`herd-eight-directions-bark-active-frame-390.png`、`herd-eight-sheep-crowd-entry-terminal-390.png`：八向、动作、拥挤与入圈。
- `v4-integrated-contacts/runner-jump-landing-collision-390.png`：真实起跳、空中、落地、碰撞。

所有原生图保留。联系表只裁剪/统一缩放排版，不重绘内容；放大使用nearest，无修图、锐化或替换状态。每张联系表index列出原PNG和viewHash。

## 分层修复的像素判据与保留的测试FAIL

原239/240/241中心RGB分别为 `(201,196,189)`、`(203,198,191)`、`(205,202,195)`；后绘后为 `(194,151,70)`、`(197,160,92)`、`(205,202,195)`。239/240加入金色且蓝分量分别下降119/99，241已取时完全不变。对象断言同时核对239有outer+core、240仅core、241无两者，以及真实drawIndex关系。

首次颜色脚本使用“与源贴图中心RGB `(171,120,4)` 距离<100”未校准判据，把修后240判失败。源纹理经WebGL线性过滤，且CSS坐标非整数、目标仅约3px，实际像素混合邻近alpha/底图，不能要求等于某个源texel。该FAIL原样保留于 `grass-layer-green/pixel-evidence.json`，未替换PNG或隐去结果。最终判据改为同viewHash、同实际坐标与保留旧PNG的差分，要求未取芯出现明确金色信号、已取芯不产生变化，并结合真实对象层序与人工开图。新判据对旧图仍RED、对新图GREEN，详见两目录 `pixel-differential-evidence.json`。不把RGB差分说成画风相似度或真机可辨率。

## 执行记录与范围

实际执行：`derive-art-states.mts`、`measure-stack-clearance.py`、`capture-art-runtime.mts v4-final`、`summarize-art-runtime.py` 均完成；基础621个case/viewport有core viewHash、decode、uniformFIT、48触区、16px文字、无横溢断言。320/390覆盖252状态，360/430/320×568覆盖39主状态。

随后实际执行8向BARK active补充16图；额外合法第二跳−2tick轨迹只用于“羊离开后仍未取金芯”诊断（不是满分golden或真人样本），先前原golden239/240/241未变。最后 `ART_CASES='^runner' capture-art-runtime.mts v4-runner-grass-front` 完成64个case/viewport，其图替代原621中的runner部分。最终可引用原生矩阵为stack434 + herd143（含BARK补充）+ runner64，所有都是独立呈现层证据；数量只作索引，不作为完成定义。

回卷目标：`verify-renderer-restart.mts renderer-reset-red` 退出1、`renderer-reset-green` 退出0。金芯对象目标：`verify-grass-render-objects.mts grass-layer-red` 退出1、`grass-layer-green` 退出0；金芯差分像素旧RED退出1、新GREEN退出0。受影响33项隔离行为复验：`output/repair-20261027/audit/after/v4-renderer-reuse-green/results.json`，实际退出0。Typecheck实际退出0。

基础621前向图是在两处呈现修复前拍摄：回卷修复不影响前向state，stack/herd仍适用；原runner被新的64定向图取代。未删除旧错误证据或将旧图更新为golden。独立harness每条轨迹只建一个renderer，所以不能用其完整场景推断GamePage旧重建路径没有问题；真实GamePage同canvas与最终页面复拍由总控另记。

## 仍不宣称通过

角色与场景已换当前v4，实际八向、稳定整类尺寸和几何约束可核查；本代理不代替用户正式签认母源、材质、构图或与指定角色板的最终一致性。尤其原生3px金芯的手机人眼可辨、真实手机/DPR/触摸、真人难度、现场网络和实物发放仍NOT_RUN/REVIEW。也不把standalone内48px按钮/16px正文结果冒充真正业务页面全部布局通过；总控的GamePage、教程、大厅四宽/短屏证据与本诊断互补。
