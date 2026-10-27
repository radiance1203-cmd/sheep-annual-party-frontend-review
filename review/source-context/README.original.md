# 羊年年会现场游戏平台

一次活动、三款游戏、整场共用三个计分槽。规则保持 `onsite-v2.1-candidate`，正式种子为 1 / 1 / 47。浏览器和核分线程使用同一个 TypeScript 规则核；正式成绩、礼品库存、兑换和核销保存在 PostgreSQL。

本地入口：**http://127.0.0.1:5175/**。API 仅监听 **127.0.0.1:3100**，数据库仅监听 **127.0.0.1:55432**。这里的开发身份、礼品与库存都明确标为演示数据。尚未授权或部署到公网。

## 最新更新

2026-10-27 visual-repair-v1：大厅接入提供的主视觉与三张封面；三款接入同源修复角色、独立三维牧场背景及统一UI，保留冻结规则/真实业务。当前素材为可运行视觉候选版；大厅/共用视图与本轮223项core/web单测通过，三款正式美术仍REVIEW，现场仍BLOCKED。实际对照、修改清单、测试边界与未完成项见 [本轮报告](docs/visual-repair-v1-report.md)。

2026-10-27：三款游戏、身份三槽计分、榜单、主办复核补场、真实库存/退款/核销及大屏已接通；补齐工作人员授权、采购预算、已领异常说明、独立试玩和八类导出。312项测试、构建及真实浏览器链路通过。完整记录见 [发布记录](docs/releases/release-notes.md)。

## 直接运行当前工作区

Docker Desktop 保持运行，在本目录执行：

```powershell
npm run db:up
npm run dev
```

用浏览器打开上述本地入口。终端 `Ctrl+C` 通过本地 IPC 等待 API 受理、线程和数据库安全停止，再关闭 Web；数据库可另执行 `npm run db:stop`。API 有 PostgreSQL 专用单实例锁，不能再启动第二份 API。

当前演练历史保留在库内。需要一套全新演示时，先停止 `npm run dev`，然后：

```powershell
npm run demo:new
npm run dev
```

该命令只允许回环地址 `_dev` 数据库，创建新开发活动、保留旧活动全部历史，不重置原人的三槽；新活动在 CHECK_IN 开放练习，正式计分由开发主办方进入 PLAYING 后开始。运行中的 API 会阻止此命令修改活动配置。

## 开发账号

私有文件 `.local/development-accounts.json` 包含当前开发主办方、核销员与两位参与者的个人随机码。仅在本机读取，勿放进截图、报告、仓库或大屏。登录页输入对应 `invite_token`；个人码一次绑定，正常刷新复用同一身份。

工作人员恢复身份应在后台核对对象后操作：仍回到原身份、原三个槽，并撤销旧会话和控制权。邀请码不能换一个新请求反复领取账户。需要单独开发工作人员账号可用后台 CLI，见 [操作手册](docs/backend-operations.md)。

## 在新机器/新数据库初始化

已验证工具链：Windows Node **24.12.0**、npm **11.6.2**、Python **3.12**、Docker Compose；依赖版本由根锁文件冻结，不混用 WSL 的 node_modules。

```powershell
npm ci
npm run setup:local
npm run db:up
npm run db:migrate
npm run db:seed
npm run test:setup
npm run dev
```

要在新机器复跑浏览器或素材验证，另执行 `python -m pip install -r requirements-dev.txt` 与 `npx playwright install chromium`。Python 验证从已锁定的 Node Playwright 查找浏览器，不依赖原开发机用户名路径；应用启动本身不需要 Python 浏览器工具。

`setup:local` 只在不存在时生成独立随机秘密，保留已有 `.env.local`。首次 seed 默认关闭入口；主办方可在开发控制台开启练习、配置演示领取截止、依次进入 PLAYING。已有私有账号文件或活动时 seed 会拒绝，不覆盖秘密或重置历史。后续直接使用 `demo:new`。

## 验证命令与证据

```powershell
npm run typecheck
npm run build
npm test
npm run contracts:check
npm run rules:check
python acceptance/verify_package.py
python -m unittest discover -s acceptance -p test_playtest_statistics.py
```

浏览器检查需先运行本地 Web/API，并保持开发练习入口开放；首次机器可执行 `npx playwright install chromium` 安装免费测试浏览器，再运行 `npm run test:e2e`。不把浏览器视口模拟记作真机。

逐页视图专项使用 `node --import tsx apps/web/tests/page-states.mts`，结果见 `docs/evidence/page-state-coverage.json`。最新结果为145基线加51项新增/受影响定向，共196项；响应夹具只验证视图，不写真实业务。新增管理真实链路可用 `node --env-file=.env.local --import tsx acceptance/admin_supplement_flow.mjs` 复跑，会创建并保留新的独立测试数据库，不动当前开发活动和邀请码。

实际浏览器正式计分与兑奖脚本会改变**指定的隔离开发活动**阶段和三槽，见 `acceptance/browser_live_flow.py`、`browser_redemption_flow.py`、`browser_sealed_retry.py`、`browser_visibility.py`、`browser_lost_prefix.py`；私有测试身份/浏览器缓存仅在 `.local/`。这些专项脚本保留本轮私有夹具路径，复跑前需准备对应的独立开发身份和阶段；通用回归使用上述 npm test / test:e2e。不要指向真实活动执行。

详见 [测试报告](docs/test-report.md)、[运行与容量证据](docs/runtime-validation.md)、[独立复核](docs/independent-review.md)、[项目状态](planning/PROJECT_STATE.json)。原始数学证据保留于 acceptance，三款 TypeScript 实现另有独立 Python 差分及 Chromium/Node 状态摘要对照。

源码、可编辑素材和公开测试证据的交付摘要见 `docs/delivery-manifest.json`，可执行 `node scripts/delivery-manifest.mjs --check` 核对。摘要按 Git 文本换行规范化计算，二进制按原字节计算；不含依赖、构建产物、私有码或数据库备份。原 `MANIFEST_SHA256.txt` 保留为输入资料包归档记录。

## 素材和正式启用

交付包含原创可编辑 Blender 羊/犬/牧场母源、254角色帧、场景/VFX图集、SVG UI及原创提示音。生产流程和预览见 [美术报告](docs/art-report.md) 与 [制作源说明](art-source/README.md)。运行资产状态仍如实保留 `rendered_candidate`，概念参考和灰盒占位没有冒充动画图集。代码依赖与素材来源分别记录在 [第三方许可](docs/THIRD_PARTY_NOTICES.md) 和素材来源登记中。

**正式现场启用尚未通过。** 24人配对难度、实际手机/微信、现场网络、真实名单/礼品/截止、工作人员演练保持 NOT_RUN；最终视觉签认与对应正式资产验收为 REVIEW。见 [启用关口](docs/release-gate.md)。不得把本地合成身份、黄金日志或开发礼品当作正式验收。

## 2026-10-27 审查修复候选

F01–F18修复与证据见 [修复报告](docs/repair-20261027-report.md)，实际原型/修复前/修复后及准备/教程/运行对照见 [本地画廊](output/repair-20261027/index.html)。三款真实GamePage正式提交与三槽限制、QR核销已在隔离真实HTTP/PostgreSQL验证；规则和唯一game-core未改。当前美术art-1.4.0仍为rendered_candidate，G5 REVIEW/G6 BLOCKED，不代表真人/真机/正式活动验收完成。
