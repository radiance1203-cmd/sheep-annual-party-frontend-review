# 羊年年会游戏 · 前端与UI美术审查

公开的前端审查仓库，包含原有三款游戏、唯一规则核/HTTP契约、完整运行素材和实际视觉证据。当前已同步审查基线6e8e40c之后的修复；后台实现、凭据/数据库和大型.blend不在本快照。

## 最新更新

2026-10-28：三款准备页、教程和运行页接入连续牧场背景、木牌和统一控件；修复跨栏蓝顶带、场地裁切及赶羊重复立柱，短屏扩大完整游戏区。27组实际页面、三段原速录像已更新。**仍为候选：艺术PARTIAL／整体FAIL，S3未就绪，比例/材质和旧角色未通过。** [R3完整报告](docs/r3-20261028-report.md) · [最新产出](DELIVERABLES.md) · [进度](PROGRESS.md) · [完整历史](docs/releases/release-notes.md)。

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
