# REPAIR-C-VIS · actual-core renderer diagnostics

工具均在 `apps/web/tests/repair-audit/`，只读产品/规则/素材。当前准备阶段已执行：

```powershell
node --import tsx apps/web/tests/repair-audit/derive-art-states.mts
python apps/web/tests/repair-audit/measure-stack-clearance.py
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
```

真实输出：12条合法输入轨迹、252个core派生状态（39主状态）；typecheck退出0。stack20层自然终局tick954；1/4/8层落点47/210/412，相关SWING/FALL/SETTLE逐tick状态均保留；runner三栏宽8/18/28、起跳/落地/无跳碰撞及golden草1三态tick239/240/241；herd八方向实际DOG_MOVE+tick3 BARK、黄金每只入圈前后、初始八羊、最大门口诊断拥挤6只tick78与自然终局225。统计/位置/方向/门线/碰撞均来自共享core，没有编辑状态。每个case含view/state/prefix hash，每条轨迹含input/final-state hash。

`measure-stack-clearance.py` 对当前候选v4的19帧stack专用姿态alpha≥1实测，可见高35–35.5逻辑单位；whole-frame统一64、羊y-2、相邻上层plate区间y-45..y-39、层距44下，最小垂直净距3，无保守bbox交叠。输出记录实际atlas/PNG SHA；若C1b重渲染，则须对新字节重跑。此结论不是最终母源签认。

等待总控通知v4注册后执行：

```powershell
node --import tsx apps/web/tests/repair-audit/capture-art-runtime.mts v4-final
```

脚本会强制检查当前manifest的sheep.side指向v4。先跑320/390全部252状态，再跑360/430/320短屏39主状态；主状态另保存来自core/rules的调试几何图。通过真正preloadAssets做hash/元数据/图片decode验证，调用生产renderer。独立harness仅观测包装Phaser.Game构造器取得真实实例，并将每个合法core view顺序交给生产scene.update，以保留动作开始、落地/碰撞、图层遮挡历史；不改任何产品hook、规则或碰撞，也不调用业务API。浏览器重推得到的viewHash必须与Node派生值一致；检查uniformFIT、无横溢、48触区和16px文字。

截图显式写“独立呈现层诊断·非业务游戏页面”，不冒充GamePage、真实会话、后台入账、真人、真机或美术签认。GamePage准备/运行/教程与真正页面布局仍由总控最终截图补齐。原型参考、当前截图和最终人工签认分别保存，不能用这些diagnostic通过代替视觉结论。
