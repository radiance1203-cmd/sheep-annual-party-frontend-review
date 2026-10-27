# REPAIR-AUDIT baseline · 2026-10-27

只读审查对象为原工程；总控提供主仓库 HEAD `9d652fb`、独立前端审查提交 `6e8e40c1c13ebbaa96c26548c4491d54d4e438da`。本代理没有产品写入、依赖安装、Git 操作或真实 API 变更。允许的写入均在本 audit 目录。UI 代理同时负责 F01/F02，因此这两项不重复操作其测试或产品代码。

已读项目 AGENTS、完整修复任务书、HTML 报告、CODEX_WORKFLOW 和 OWNERSHIP；实际打开了四张原型与角色板像素，以及本次三款运行截图、active-session 大厅截图。采用 systematic-debugging 的先复现再定位方法、Playwright 页面核查和 verification-before-completion 的实际证据规则。

环境：Node 24.12.0；Pillow 12.1.0；Playwright Chromium 156.0.8078.4；Windows 桌面自动化、390×844 CSS px、DPR1、reducedMotion=reduce；不是手机实机。所有 `/api/**` 请求拦截为 schema fixture，非 GET 在浏览器内拒绝，未发送到真实服务器。运行页通过完整输入前缀恢复同一 game-core 的状态，没有伪造本地分数。正常凭证使用 `v` 重复43字符的明确无效 fixture token，不是生产令牌。

## 逐项状态（修复前捕获时点）

|项|当前审查状态|源码确认|实际浏览器/像素证据|限制和交接|
|---|---|---|---|---|
|F01|交 UI 代理修复/回归|baseline useResource 未按 identity 隔离 data；Order 路由 id 与旧 data 可混用|本代理未重复执行，避免冲突|以 UI 代理的延迟 B、404/503、快速切换结果及最终集成复测为准|
|F02|交 UI 代理修复/回归|baseline pending-redemption 全局键；POST throw 后未清理终局失败|本代理未重复执行|超时必须保留原键，不能用一律 catch 清除代替协议区分|
|F03|未修复，已复现|GamePage 初始正式 status 共用；renderer 仅 bootstrap 内创建|F03-prepare-stack/runner/herd：canvas=[]、tick=0，练习仍显示“成功即使用 1 次正式机会”|新准备场景须预加载解码并绘制首帧后启用开始；不推进 runtime，不占槽|
|F04|未修复，已复现|App 教程硬编码 lobby_sheep_v1.webp|F04-tutorial-stack/runner/herd：三款实际 img src 均旧 hero，无 renderer|教程状态驱动展示游戏对象，不能仅替换为另一张无操作示意封面|
|F05|未修复，像素与运行复现|renderer stack size80；固定44层距；hay_tray size140|F05-10-runtime-stack.png：8层状态托盘横穿下层头颈；asset-measurements.json 的 alpha128 不透明高60|需1/4/8/20层和 SWING/FALL/SETTLE/终局检查；本代理只核8层，不宣称全部动态已验|
|F06|待修复与正式签认|当前 v2 母源生成方式与整帧缩放|实际开角色板：大头圆身、粗卷角、大绒团；当前运行侧羊头高、腿露、细颗粒，与大厅封面有断层|四视图和320/390尺寸正式签认 NOT_RUN；不能将主观核图标记 production_art_accepted|
|F07|未修复，尺度确认|herd sheep47、dog48整帧显示|运行 herd 犬细小；alpha≥128 north dog15×31.5逻辑，390显示约15.58×32.73CSSpx；north sheep24.97×36.35逻辑|尚未完整八方向/全动作/拥挤复验；稳定按整类校准，不逐帧归一化|
|F08|待修复与视觉签认|farm_backdrop_v3 当前分支|三款运行截图对原型：大块平滑草地/蓝天、稀少景深与细节；herd 右上屋顶切边|保持真实门线及世界尺寸；视觉签认仍 REVIEW|
|F09|未修复，运行布局确认|CSS木纹文字标题；runner 360:220均匀FIT|runner 实拍 canvas约373.98×228.55CSSpx，动作区下有大片空白；大厅三卡纵向较高；标题细木纹条|本次仅390，四宽/短屏最终复测待做；底栏在 fullPage 中部不单独判遮挡|
|F10|未修复，源码与运行确认|runner Graphics 画障碍矩形、草圆点；未用 hurdle/clover 帧|F05-10-runtime-runner.png 的细栏条；sourceSnapshots 保留对应原实现|本次截图未含所有三宽和所有草状态，完整状态矩阵 NOT_RUN，不据单图宣称通过|
|F11|未修复，完整输入日志复现|keydown 任意键写 direction；keyup 一律 clear；按钮仅 pointerdown 和 Enter|F11-herd-key-log.json：Right后DOG_MOVE，Space BARK后停止；Right+Up仅(0,-1000)，松Up仍停止。F11-runner-focused-action.json：焦点Space无JUMP，Enter一次JUMP|用 pressed-key 集合；非方向键不写0；blur/hidden清空；主动作统一click，避免pointerdown+click重复|
|F12|未修复，503与慢响应复现|App 仅读 identity.data，未呈现 identity.error|F12-identity503/-loading：显示“绑定身份”，503实际错误未呈现|轮询失败保留旧数据时应提示过期/禁依赖CTA；401和恢复完整回归待UI代理|
|F13|未修复，阶段边界复现|教程仅判断 me|F13-CHECK_IN-normal、PLAYING-zero、DRAINING-normal 都仍 enabled href=#/play/herd；DRAINING-grant 同一文案|保留合法补场/恢复原局；不能只用phase===PLAYING|
|F14|未修复，HTTP404实际复现|AssetImage 无 img onError|F14-image404：配置 hero.lobby作为隔离图片键，404后complete=true naturalWidth=0，无重试|decode失败、key切换、恢复成功等最终回归尚未执行|
|F15|未修复，触区实测|Notice内inline a|F15-active-links.json：“恢复原局”“查看状态”均64×19CSSpx，低于项目48×48|四宽补场记录触区最终回归待做|
|F16|未修复，正常token与核销台复现|Order 仅code+复制；Claim 仅Field与lookup|F16-normal-token.png 有完整无效fixture token且无二维码；F16-staff-lookup.png 只有手输|扫码路径真实相机/硬件扫码和后端核销 NOT_RUN；凭证不应进入URL或日志|
|F17|未修复，服务端stats注入后实际复现|Results 未展示conclusion.stats，直接输出eligibility_reason|F17-result-stats：fixture服务端stats8层/4完美，但DOM无对应统计；显示VERIFIED|三款/待核验/0分/作废/历史替换全部最终回归待做；仅展示服务端已核验结论|
|F18|历史覆盖不足确认，本轮补充baseline|review capture.mts强制token=null；capture-games仅恢复运行态|本轮新增准备、教程、身份、阶段、故障图、active恢复、有token、键盘、结算证据|本轮不是18项已关闭；仍需每项修复后断言与复拍、人工签认、真机、真实后台和现场证据|

## 已执行命令与结论

- `node --import tsx output/repair-20261027/audit/baseline.mts`：首段捕获成功；工作人员查询按钮的测试定位误写“查找”导致30秒等待超时，退出1。没有产品问题归因于这个测试错误。
- 修正本 audit 脚本定位为实际“查询领取记录”，`$env:REMAINING='1'; node --import tsx output/repair-20261027/audit/baseline.mts`：退出0，补完工作人员台、结果、图故障、键盘和三款运行截图。
- `node --import tsx output/repair-20261027/audit/assert-baseline.mts`：退出0，20/20“旧缺陷存在”断言。它们不是产品通过断言；详情 baseline-assertions.json。
- `python output/repair-20261027/audit/measure-assets.py`：退出0，实际透明边界与参考尺寸、SHA写入 asset-measurements.json。未修改图像。

每个 F*.json 保存实际 DOM、viewport、canvas尺寸、路由/触区、图片状态、捕获请求与 pageerror；同名PNG为实际页面。baseline-summary.json因两段执行只汇总最后一段，完整证据索引以本目录全部 F*.json 及 baseline-assertions.json 为准。源码快照 hash 与定位在 baseline-assertions.json 的 sourceSnapshots；其中 baseline 来自独立 review checkout，live hash 只代表脚本执行时点，不能冒充后续并行修复后的内容。

未执行产品 typecheck/build/单元/真实 DB 套件：本代理职责为只读针对性浏览器核查，统一集成验证由总控执行，避免并行重复与共享数据库干扰。真实后台、正式入账/库存/核销、真人24人216局、相机扫码、物理手机、现场网络全部 NOT_RUN；视觉人工签认仍 REVIEW。

模型回执边界：总控请求配置为 `gpt-6.1-sol / high`；本代理没有可独立验证的服务器运行模型元数据，因此只记录 spawn 请求证据，不用自述冒充模型保证。
