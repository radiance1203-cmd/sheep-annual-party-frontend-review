> 2026-10-28 R4 P0继续返工：羊/叠高v27、犬v24，艺术未签认。[有限证据](R4_REVIEW.md)。

# 羊年年会游戏 · 前端与UI美术审查

公开的前端审查仓库，包含原有三款游戏、唯一规则核/HTTP契约、完整运行素材和实际视觉证据。当前已同步审查基线6e8e40c之后的修复；后台实现、凭据/数据库和大型.blend不在本快照。

## 最新更新

2026-10-28：新增离线角色母型的量化、原生形体和三款静态页面对照。当前艺术未通过，继续团坐、羽尾及额冠/角/布料返工；玩法和显示比例保持，未进入完整动画生产。见[本轮进度](docs/r4-native-shape-report.md)、[当前绑定](docs/r4-live-handoff.md)。

2026-10-28：本地候选新增三款背景接续、有限角色暖脸/红围巾与有界道具样板，可查看原型/B4/新结果；仍有光滑犬背、团块羊毛、比例与页尾等差异。技术验证通过、有限样板PARTIAL、整体艺术FAIL、S3未就绪。[本批报告](docs/r3-a-window-20261028-report.md) · [最新产物](DELIVERABLES.md) · [历史](docs/releases/release-notes.md)。正式玩法/资源未改，未部署。

## 本地检查

Node >=24.12 <25、npm11；core差分测试另需Python3标准库。

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run contracts:check
npm run rules:check
```

本快照测试只含core/web；完整主工程352测试和真实数据库验证是[明确标注的历史证据](PROGRESS.md)，不算本快照重跑。此次导出实际检查见 [upload-verification.json](review/upload-verification.json)。

`npm run dev`在127.0.0.1:5175启动前端，业务API仍代理到3100。本仓库没有后台，未连接原后台时的连接错误不代表后台没实现，也不能以假API替代业务验收。规则/seed/碰撞/计分仍只来自packages/game-core。

## 隔离复拍

启动前端并准备Playwright Chromium后执行：

```bash
npm run review:lobby
npm run review:games
```

可设置REVIEW_ORIGIN切换空闲端口，例如http://127.0.0.1:5176。两个工具只在独立浏览器拦截API，用真实组件/合法core前缀复拍；输出到忽略的output/repair-20261027，不写真实机会/积分/库存。更完整的逐tick/八向诊断工具在apps/web/tests/repair-audit，先derive-art-states再capture-art-runtime；它是独立renderer诊断，不冒充业务页面。

源文件映射、排除范围、未上传的重复中间帧及原生母源SHA见 [SOURCE_SNAPSHOT.json](SOURCE_SNAPSHOT.json)。提供的旧版对照仍保留在review根目录，**当前以review/repair-20261027和art1.4为准**。不要运行旧素材生成器覆盖已登记资源。GitHub页面可读不保证某个ChatGPT连接器能解码PNG；无法实际看图时必须说明并标NOT_RUN。
