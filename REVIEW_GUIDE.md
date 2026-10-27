# 审查路径与证据边界

## 查看图像

- 目标：visual-repair-v1/references/ 中4张原型与character_foundation_board.png。
- 大厅插画原文件：visual-repair-v1/static-assets/，运行WebP在apps/web/public/assets/hero和covers。
- 当前页面与原型对照：review/*-comparison.png；四宽组合：review/layout-*.png；运动帧：review/motion-contact.png。
- 原生390截图：review/screenshots/，覆盖大厅五状态、三款合法规则前缀、结算/榜单/礼品/凭证/异常。每组captures.json记录CSS视口、DPR、zoom、字体和资源状态。
- 角色实际图集：apps/web/public/assets/characters/；分帧和动画在同名atlas.json。不要拿封面代替游戏角色图集。
- 正侧背斜母源预览/完整方向和动作接触表：art-source/v2/samples、previews。

## 追踪实现

| 关注点 | 文件 |
|---|---|
| 大厅与路由/状态 | apps/web/src/App.tsx |
| 插画失败与重试 | apps/web/src/LobbyIllustration.tsx |
| 材质/布局/字号/触区 | apps/web/src/visual-repair.css、styles.css |
| 公共页面 | apps/web/src/pages/ParticipantPages.tsx、ui.tsx |
| 生命周期/输入/原时轴 | apps/web/src/game/GamePage.tsx、timeline.ts、storage.ts |
| 图片与版本预检 | apps/web/src/game/assets.ts |
| Phaser表现和动画 | apps/web/src/game/renderer.ts、presentation.ts |
| 唯一规则内核 | packages/game-core/src |
| 唯一HTTP契约/生成类型 | packages/contracts/openapi.yaml、src/generated |
| 当前素材清单 | apps/web/public/assets/asset-manifest.v1.json |

规则保持onsite-v2.1-candidate，seed1/1/47，整场三次正式机会。对照图按原比例排版，原型像素不等于CSS像素。场景按360×480/220/420均匀FIT；不能为像原型改碰撞、门线或计分。

## 别混淆的结论

大厅和共用视图有本地PASS证据；三款运行/布局/规则回归通过，而正式美术仍REVIEW，G5 REVIEW、G6 BLOCKED。主项目的真实PG业务测试和本快照单元/视图测试分开，本仓库没有后台不能重新证明兑奖事务正确。真人/真机/现场数据未提供。

`.blend`和大批中间帧没有上传，不是主项目没有制作源。详见SOURCE_SNAPSHOT.json中excluded_native_sources的原文件摘要。没有真实图像读取能力的审查工具应明确列NOT_RUN，不能声称已看PNG。

## 私有仓库与ChatGPT

本仓库是private。请在目标ChatGPT会话确认能够读取仓库文件；仅贴链接不代表另一个会话已获得权限。若看不到，检查该GitHub连接账号及仓库权限，不必把仓库改公开。若连接器只能读源码，下载PNG后作为图片附件提供，再进行视觉判断。

官方文档也要求在实际使用连接的工作流验证已知仓库资源和权限：[Workspace connections / GitHub](https://learn.chatgpt.com/docs/enterprise/shared-connections)。这不保证不同会话自动共享当前连接。


图像读取边界：本次GitHub连接器的fetch不返回非UTF8二进制，文本读取通过也不等于看过PNG。目标ChatGPT若没有图像读取工具，请把四张对照图及角色板作为附件提供；素材已收录在本仓库，不应凭文件名给视觉PASS。
