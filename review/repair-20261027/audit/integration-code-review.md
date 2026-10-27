# 集成代码只读审查 · 2026-10-27

审查范围：GamePage、TutorialScene、renderer、assets、keyboard、App身份门控、useResource/useMutation、admission、redemption、VoucherScanner 与 Claim。仅写audit产物，未改产品或根测试；未重跑尚在变更的最终版本全套。采用 architecture-and-design / core-typescript / react 的生命周期与异步状态审查，未因通用风格偏好要求重构。

## 具体发现

当前结案状态：下述CSRF缺陷已由UI代理修复，并由本代理保留旧RED后独立复验通过；本次指定范围没有剩余已确认开放代码缺陷。此前慢轮询饿死问题也已修复。以下保留发现与根因，避免丢失审查证据。

must-fix · state-and-data · `apps/web/src/App.tsx:20` — `/me` loader 在请求代次检查之前调用 `setCsrf(value.csrf_token)`。旧响应虽被useResource拒绝data，仍覆盖已接受身份的全局CSRF。应只从已接受的 identity snapshot 同步CSRF，保持load无副作用。

真实隔离浏览器复现：首次/me503；重试A延迟1100ms，70ms后重试B快速成功；页面保持current-B、stale-A隐藏；A迟到后下一次API请求的X-CSRF-Token变为A。`integration-repros/hook-evidence.json` 记录 `staleCsrf.reproduced=true` 和源码SHA；相应PNG保留。值均为明确无效fixture字符，所有API拦截，未发送真实业务POST。此问题已及时发总控，并按总控要求发UI代理。

修后独立复验：`node --import tsx output/repair-20261027/audit/integration-hook-repro.mts csrf-fixed` 退出0；`integration-repros/csrf-fixed/hook-evidence.json` 显示页面仍B、A隐藏，A迟到后下一API header仍为B，`staleCsrf.reproduced=false`。修复使用已接受snapshot的effect同步CSRF，瞬时读取失败保留既有run的CSRF，明确UNAUTHENTICATED才清空。没有覆盖原RED。

## 已在审查过程中修复的具体问题

`useResource` 原轮询每次递增request，只接受最新sequence；若响应持续慢于轮询周期，上一成功结果会被后继轮询作废，可一直loading。已向总控报告；UI代理添加inFlight门控，interval不重叠、explicit refresh仍生成新effect。只读实测其shared harness：200ms poll/350ms响应，1.1秒后显示A:3，而非永久loading，证明修后该条件已恢复。此项记录为已修复，不重复列开放缺陷。

## 逐条边界核查

|边界|当前代码核查|证据与限制|
|---|---|---|
|预览资源所有权|preloadAssets在失败时release已分配资源；GamePage预览未挂载则release；renderer接管后destroy统一release；destroy有幂等标志|未发现本轮新增的确定对象URL/解码图片泄漏。网络请求本身未abort，卸载后完成时再释放；不将可改善项误称已泄漏。|
|预览→运行|开始要求sceneReady；预检再次验证并解码同一资源；旧preview destroy，runtime renderer持有独立assets|15条准备目标通过；POST_RENDER作为首帧ready，准备tick0不推进正式runtime。最终v4资源替换尚待集成复拍。|
|失败/卸载/锁|bootstrap保留prepared直到交给renderer；提前return/catch的finally releaseAssets并释放锁；运行runtime在effect cleanup释放锁、renderer与音频|恢复已封存过程仍只重传原过程；没有改规则或另建碰撞。异常WebGL上下文/真实弱机未验，不凭源码宣称全部浏览器稳定。|
|练习重置|clear held input、release运行锁、runtime=null，当前renderer回render(tick0)，下次bootstrap再替换|前次实际3款重练目标通过；practice同步推进没有正式record写入竞态。|
|身份轮询故障|App始终保留当前play/practice GamePage；readyMe可变undefined，但key仅path；main runtime effect仅game；save/abandon使用r.storageKey|真实10秒轮询503的隔离目标通过：原canvas未卸载，原tick继续，无new start/finish。身份不同/新身份未确认时新开局与恢复按钮受门控。|
|按键释放与焦点|HeldDirections维护集合；keyup只释放本键；非方向键不覆盖方向；blur/hidden clear；表单、dialog、contenteditable隔离；主按钮原生click|14条输入目标（含8方向、组合、释放、Space/Enter/pointer）通过；后加repeat原生默认抑制代码需随最终版本归入总控最终回归，不拿已有结果追认未来字节。|
|准入能力|active_session优先恢复/查状态；角色、eligible、claims_frozen、封榜、复核、入口、release均门控；补场检查槽绑定/有效期并保留DRAINING|与服务端start检查含义一致。服务端仍负责动作时的权威准入；本地当前事件快照不是永久授权。|
|未知兑换幂等|event+participant scoped key；明确未建单错误仅指定白名单且nonretryable时结案；网络/COMMIT_STATUS_UNKNOWN保留原body/key；activeScope阻止旧结果导航进新主体|服务端内部REDEMPTION_CLOSED/PERSON_LIMIT经errors.ts映射为CLAIM_WINDOW_CLOSED/PERSON_LIMIT_REACHED，前端白名单使用公开码，未发现此处枚举错配。旧版未标主体pending只提示人工核对而不盲目重放。|
|异步对象身份|useResource identity binding对象隔离A→B→A，request generation防同代乱序；Order/Results额外核对返回id与路由id；路由key隔离本地mutation状态|F01目标已由UI代理覆盖。CSRF是本次发现的load副作用例外，不能以data绑定已修复推断副作用也被隔离。|
|扫码生命周期|generation区分相机/图片代次；stop取消rAF、停止全部track、清video.srcObject；卸载/disabled调用stop；迟到getUserMedia停止新返回track；图片finally撤销URL|未发现确定stream/rAF泄漏。真实手机相机权限与识别仍NOT_RUN。|
|扫码不隐式核销|readVoucher只解码43字符不透明码；onCode走lookup；Claim.lookup先清view；显式“确认本人，核销此订单”才调用redeem；durable保留核销原键|二维码无URL导航、无自造积分、扫描不直接交物。无真实claim证明来自源码；另按总控授权准备隔离真实HTTP+PG+浏览器流程。|
|礼品图片失败|键切换重挂GiftImage，404/onError与decode失败进入占位重试；旧decode只在isConnected时setState；重试保留真实礼品信息|未使用虚构图片兜底。真实网络/解码峰值未验。|

## 实际执行与未执行

- `node --import tsx output/repair-20261027/audit/integration-hook-repro.mts` 最终退出0：慢poll修后可见；旧CSRF仍复现。第一次手写Vite harness未成功挂载，定位为audit harness导入/空output等待问题；改用现有UI测试harness读取真实hook后才采用结果，不把首次等待超时当产品缺陷。
- 本次未执行最终全套、真实数据库/默认活动POST、购买、发布。最终v4与F09 CSS还在集成，旧的33行为+3布局结果只覆盖其记录版本。
- 模型仅保留总控请求 `gpt-6.1-sol/high` 的配置证据；独立服务器运行元数据不可见，不以自述证明。

## 后续真实领取验证

按总控另行明确授权，已在loopback sheep_test中新randomUUID活动运行真实HTTP+PostgreSQL+前端领取流程（不使用fixture业务响应），15项检查一次通过，完整报告为 `output/repair-20261027/real-claim/REAL_CLAIM_REPORT.md`。原审查范围和这些真实隔离结果均不证明物理手机、真人或现场门槛。
