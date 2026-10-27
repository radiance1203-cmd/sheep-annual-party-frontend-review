# REPAIR-AUDIT · F03/F04/F11 修复后目标验证

本代理只修改 `output/repair-20261027/audit/**`。没有改产品、根测试、依赖、Git、项目文档或 UI 代理脚本。所有结果均为隔离 schema fixture + 实际浏览器组件/共享 game-core，不代表真实后台、手机或现场验收。

## 有效结果

|目标|实际证据|结果与边界|
|---|---|---|
|F03 三款准备与重练|`green-candidate-valid/` 每款5个目标|15/15通过：练习与正式均实际 canvas；读取当前 manifest 必需资源；成功decode正尺寸；按住decode结束前禁开始；真实准备tick0稳定；不发start/finish；图片404报错可重试；重练回tick0可见场景。|
|F04 三款教学行为|`green-candidate-valid/` 每款1个目标|3/3通过：本款当前manifest角色/场景；无旧hero请求；canvas真实动态变化；无session请求。初次开图发现旧CSS固定170高/60px继承导致巨字与重叠，已反馈总控修复。行为通过没有掩盖该视觉问题。|
|F04 教学布局|`tutorial-layout-fixed-viewport/` 每款1项，内部5视口|3/3通过，共15个独立viewport页面：320×740、360×800、390×844、430×932、320×568；无横向溢出；canvas在wrapper内；wrapper按教学全内容自然撑高；后文不叠canvas/控制；教学正文与按钮16px。已实际打开修复后stack320、runner390、herd短屏等PNG核查。|
|F11 输入|`green-candidate-valid/` 14个目标|14/14通过：Right+Space保持右移；Right+Up斜向；松Up保留Right，松最后方向停止；相反方向抵消、释放保留另一键；重复keydown保持方向；八向逐一验证；blur/hidden清空；dialog与表单输入隔离；三款focused Space/Enter/pointer均恰好记录一次主动作。|
|F12运行态身份故障集成|`green-candidate-valid/F12-running-me-poll503-preserves-runtime.json`|1/1通过：等待真实10秒身份轮询返回fixture503，原canvas标记仍在，原正式日志tick继续，无新start或finish。|

共33项行为目标与3项布局目标通过。分别执行，不将重复的诊断或F11重跑计入新增覆盖数量。`f11-green-valid/` 的13/13是先前独立确认，不额外计数。

## 实际命令

```powershell
$env:CASES='F11'
node --import tsx output/repair-20261027/audit/after/target-regression.mts f11-green-valid
# exit 0，13/13

$env:CASES=''
node --import tsx output/repair-20261027/audit/after/target-regression.mts green-candidate-valid
# exit 0，33/33（随后实际开图发现教学布局问题并追加目标）

$env:CASES='F04.*layout'
node --import tsx output/repair-20261027/audit/after/target-regression.mts tutorial-layout-red
# exit 1，0/3；真实旧固定高度与巨大字体问题

node --import tsx output/repair-20261027/audit/after/target-regression.mts tutorial-layout-fixed-viewport
# exit 0，3/3；15个独立viewport页面

node --import tsx output/repair-20261027/audit/after/update-ledger.mts
```

## 保留的测试自身问题

不删除错误运行，也不把它们变成产品缺陷：最早 F11 async IndexedDB waitForFunction 在target30时返回observed25，导致提前断言。独立 `clock-debug/evidence.json` 读取真实导出的 `clock.now(performance.now())`、原会话start、日志tick，确认时轴同步和控制正常。等待器改成Node侧有界轮询，并必须断言已达到目标tick。`f11-green-check*` 与相关诊断FAIL不能用于产品失败结论。

`green-candidate/` 因新增audit finalRecord导出对尚无存储的准备页等待未完成而中止，修复audit初始化后才得到上述33/33。教学CSS首次修后 `tutorial-layout-green/` 在resize150ms读到Phaser旧居中margin，随后截图已稳定；最终改为每个视口独立页面，排除动态resize瞬态。详细有效性见 `execution-ledger.json`。这些修复均只在audit脚本，没有加产品test hook。

## 不涵盖的门槛

F05–F10正式美术仍须按指定原型/角色板、母源、动作/关键帧和真实手机尺寸签认。教学复用当前资源并可运行，不代表当前角色、场景和叠层穿插已美术通过。当前操作尺寸、真实后台事务、真手机扫码、24人216局、现场网络等各自按总控矩阵继续，未由这些fixture证明。

33项行为结果记录各自启动时manifest SHA、BUILD、实际请求、decode、canvas、输入日志、事件和截图；`execution-ledger.json`另保存生成当时产品源码SHA，明确不是追认每个历史run的源码hash。总控后续F09/CSS变化需要据其影响范围复验。

模型只记录总控spawn请求 `gpt-6.1-sol/high`；本代理未取得独立服务器模型元数据，不以自述作模型保证。
