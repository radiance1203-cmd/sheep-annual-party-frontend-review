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

## 公开访问与图像审查

仓库现已按用户明确授权改为public。可直接使用仓库链接或raw文件链接读取，不需要GitHub登录或私有仓库授权。

当前GitHub连接器的fetch仍不返回非UTF8图片像素；这属于工具能力而非权限。若审查工具不能实际打开PNG，请使用具备图像读取能力的工具或把图像作为附件提供；不能只凭文件名给视觉PASS。原始PNG、对照图和母源预览均已在仓库中。
