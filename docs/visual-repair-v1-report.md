# visual-repair-v1 实际交付与验收

2026-10-27，基线 `9d652fb3fef2ede55ebc462d46445cc855b98dd1`。这是现有工程的增量修复，没有重建应用。当前本地入口仍为 http://127.0.0.1:5175/ 。本轮浏览器使用 Vite 开发服务，生产构建另行实际执行通过，未部署公网。

## 分范围结论

| 范围 | 实际结果 | 边界 |
|---|---|---|
| 大厅 | PASS（本地视觉/布局/状态） | 五种身份及阶段×四宽20组，首屏与整页；四张新插画、真实DOM数据、可访问标题、48px触区 |
| 羊羊叠高高 | 运行、布局、合法重放截图 PASS；正式美术 REVIEW | 固定完整托盘、原逻辑层高/碰撞；相机仅改变表现平移；角色仍为短卷毛候选材质 |
| 羊羊跨栏 | 运行、布局、合法重放截图 PASS；正式美术 REVIEW | 栏杆按真实AABB，草外圈/金芯独立，碰栏无生命值；不是用封面充关卡 |
| 赶羊入圈 | 运行、布局、合法重放截图 PASS；正式美术 REVIEW | 8羊1犬、真实门线、正交二维坐标、羊犬围栏共用脚点深度排序 |
| 结算/榜单/礼品/凭证 | PASS（本地视图） | 44组截图、56项定向视图回归；不作为新的真实兑奖业务验收 |
| G5 | REVIEW | 保留最终视觉与对应正式资产签认，manifest中仍为 rendered_candidate / production_art_accepted=false |
| G6 | BLOCKED | 真人难度、真机/微信/现场网络、正式配置和工作人员实际交物演练未完成 |

三款的最终美术没有借大厅通过而改为PASS。当前没有缺失的角色帧或场景背景；尚需复核的是角色细绒、侧视面部表达、犬的材质与既定原型之间的最终质感匹配。原型中的精细绒毛/环境密度仍与当前可编辑渲染存在差异；本报告不声称逐像素还原或虚构相似度。

## 实际对照与截图

- [大厅原型/修复前/修复后](../review/lobby-comparison.png)：原型和绑定正式样例对照；另列未绑定签到状态，避免把状态差异当布局缺陷。
- [叠高高对照](../review/stack-comparison.png)、[跨栏对照](../review/runner-comparison.png)、[赶羊对照](../review/herd-comparison.png)。原型是示意构图；修复后为真实GamePage恢复合法core前缀的隔离视图，无服务器写分。
- [三款实际动作帧](../review/motion-contact.png)：真实本地API读取及实际自动练习输入；包含下落/落地、起跳/空中/落地、外圈与金芯、犬移动/松手/吠叫。
- [叠高四宽](../review/layout-stack.png)、[跨栏四宽](../review/layout-runner.png)、[赶羊四宽](../review/layout-herd.png)。组合图仅等比排版，源截图保留原CSS视口。

最终大厅：`output/visual-repair-v1/lobby-delivery-r2/`；最终三款：`games-reviewed/`；共用页：`shared-final/`；真实练习动作：`motion-delivery/`。主视口390×844，补查320×740、360×800、430×932，DPR1、zoom1；十次切换另为DPR2。字体为系统Microsoft YaHei，实际字形由CDP核对；图片decode和build/asset/hash记录在各captures.json。规则构建标识保持 sheep-core-2.2.0 / sheep-web-2.2.0。

合法前缀来自共享game-core实际步进：stack tick407=8稳/4完美/0错/24分；runner tick583=6越/1外/1芯/1错/20分；herd tick107=4入/4外/24分。最后捕获使用固定浏览器时钟165ms推进到相邻帧，统计保持相同；未改产品时钟或添加调分接口。

## 修改清单

| 文件或目录 | 修改 |
|---|---|
| apps/web/src/App.tsx、LobbyIllustration.tsx | 新hero与独立玩法封面；真阶段/荣誉/剩余机会；昵称/机会明细放详情；插画失败提示与原URL重试 |
| visual-repair.css、styles.css、main.tsx | 限定作用域的奶油/木牌/红按钮；430容器、16px正文、24px关键数字、48px触区、自然滚动；紧凑游戏HUD以恢复场地可读面积 |
| game/assets.ts 及单测 | 按稳定asset_id加载；严格hash/decode；旧清单按期望hash归档读取；新背景必需列表、尺寸/单帧/pivot/场景比例校验 |
| game/renderer.ts、presentation.ts 及单测 | 独立三维装饰背景、同源角色动画、非循环动作末帧、深度排序、真实几何表现；不计算积分或碰撞 |
| ParticipantPages.tsx、ui.tsx、GamePage.tsx | 共用材质和SVG图标、长名换行、员工“机会”文案；游戏输入、时轴和交易条件保持 |
| apps/web/public/assets | 四张提供WebP字节接入；v2五组角色/场景图集；v3三组独立背景；旧v1/v2与按hash归档清单保留 |
| art-source、design/asset_specs | 从原母源修复的可编辑v2羊/犬/牧场、254角色帧、28环境帧；三份仅scenery的v3背景母源；制作/打包/校验脚本、失败样图与来源记录 |
| AGENTS.md、planning、docs | 仅局部衔接旧规范；盘点、所有权、决定、真实测试和续接记录 |

`config`、`rules`、`packages/game-core`、`packages/contracts`、`apps/server`、根依赖及锁文件相对基线无差异。没有新迁移，没有为了截图修改身份、机会、积分、榜单、库存或核销规则。

## 资产版本、来源与成本

唯一当前运行清单：`apps/web/public/assets/asset-manifest.v1.json`，art-1.3.0-visual-repair，SHA256 `bdf93f4c26c9ed6e108f5af5a718edd7997a86936da85404485a68e1eeb8d234`。历史清单仅用于不可变版本兼容，不是第二套当前运行清单。

四张WebP由补充包提供，源PNG与生成说明完整保留；本轮未声称重新生成或特定图像模型。下载111230字节，解码RGBA3248672字节。角色/场景从原有Blender母源修改，保留动画名、8方向、128px帧与原pivot，不运行旧生成器覆盖v1；美术随机与游戏RNG分离。角色生产254帧实际477.996秒。背景为原牧场源的独立scenery，未烘焙角色、真实托盘、障碍或赶羊门线。

三张背景PNG为720×960 /720×440 /720×840，合计1540914字节；新增RGBA约2.64/1.21/2.31MiB。叠高/跨栏/赶羊基础图集纹理约11.64/10.21/39.31MiB，包含原effects，不包含浏览器缓存/UI栅格化/framebuffer。真实手机内存和无线网络性能未验，不把文件预算当真机PASS。

## 实际验证

| 检查 | 结果与证据 |
|---|---|
| Typecheck / 根build / contracts / rules | PASS；build保留已有Phaser大chunk警告，不掩盖或关掉警告 |
| 规则核与前端单测 | 223/223 PASS（196core+27web），unit-v3.json；本轮未重跑未改动的100项后端PG测试，保留基线通过记录 |
| 同输入前后比较 | PASS；完整黄金输入、终局tick/结论/state hash与基线一致；Node/Chromium另27组PASS |
| 大厅与共用状态 | 20大厅/44共用截图；56项定向视图PASS，0真实写；fixture不冒充后端业务 |
| 游戏预检/预约/恢复/离页 | 19项定向视图PASS；覆盖资源失败不start、预检离页不start、原请求幂等、倒计时、恢复与迟到响应隔离 |
| 新背景缺失 | 三款真实资源断流时均0正式预约/0canvas、objectURL全部回收；asset-browser-v3/report.json |
| 历史版本 | 两旧hash×三款共6组真实HTTP/hash/decode PASS；不加载v3背景，不绕过旧hash |
| 四宽三款布局 | 12/12 PASS；最终触区可见、无横溢/小字/小触区，world均匀FIT |
| 真实练习切换 | 十次PASS；max canvas1，菜单Space隔离，预检后PNG请求0，页面错误0、API写0 |
| 实际运动 | 三款13代表帧已实际打开；松手后方向清空、吠叫冷却、离场canvas0；非真人操作 |
| 插画失败/恢复 | 四张断流及恢复4/4 PASS；不静默换成占位素材 |
| 大厅真实导航/后台布局 | 四宽最后一张卡片可完整滚动到导航上方、真实玩法路由/返回PASS；390/1280的主办与核销四种GET视图保持原布局（桌面1100px），0真实写 |
| PostgreSQL活动保护 | CHECK_IN、业务表计数与基线相同：sessions/point_ledger/redemptions/playtest_runs均0；四默认邀请仍ACTIVE。仅两次合法开发release绑定，event revision+2 |

机器明细见 `output/visual-repair-v1/integration-evidence.json` 与 `acceptance-results.json`。未因纯视觉修复重跑全量库存并发、故障恢复和真人统计；这些本轮NOT_RUN，历史证据保留。

## 保留的失败及边界

首轮角色样图的硬球横带、长腿、卷角遮挡/悬空和纤维长度误判均留历史，修复后才批量。草地图块接缝、相机只见少量塔层、控制区超视口、47.72px返回链接、新版必需列表整体遗漏、插画失败无提示均已定位并复测。v3首样的蓝边/云带/过大远景已定点修复。

构建曾因Windows ReadOnly归档被复制到dist而EPERM，改为内容hash guard后构建通过，历史字节不变。证据脚本曾有Windows非法报告名、默认GBK读UTF8、过早暂停React初始化的问题，均只修证据脚本并保留记录。最后并行截图出现一次大厅初始化超时及一次固定时钟早帧局部画布；未将这些失败图当通过证据。独立完整重拍20大厅/12游戏，165ms固定帧与实际自然时钟练习核对均正常；早帧异常的确切内部原因未确证，保留诊断，不修改产品时钟来掩盖。

## 具体未完成项与续接

1. 三款正式美术签认仍REVIEW：继续以已交付母源和实际对照图检查短绒质感、侧视表情、犬材质及原型细节密度；不可凭帧数/构建通过把candidate标正式完成。
2. 24人真实配对难度、真实手机/微信/现场网络与内存检查、真实活动/名单/礼品/截止/预算配置、工作人员核销交物演练仍NOT_RUN。现场启用保持BLOCKED。
3. Phaser大chunk提示仍存在；当前只是本地构建通过，未宣称真实无线网络加载性能达标。

无需另开聊天或重做后台。下一总控直接从PROJECT_STATE、此报告与planning/VISUAL_REPAIR_STATE.json续接；保持规则/业务冻结，保留当前素材版本和历史hash。若正式美术确认后需更新清单，先归档当前hash，再绑定符合门槛的活动版本；不重开旧期限，不增加正式机会。
