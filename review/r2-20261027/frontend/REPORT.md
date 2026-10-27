# R2 前端 R01–R05 本轮结果

范围：同一主工程 `9d652fb` 的未提交工作树增量。备份由总控建立于 `.local/r2-backup-20261027`。没有 Git 索引操作、依赖安装、规则/后台/数据库修改或公开发布。

## 实际修改

- `apps/web/src/App.tsx`：仅 Tutorial 组件，移除独立 4 秒文字计时；完成状态由场景真实事件确认。
- `apps/web/src/game/TutorialScene.tsx`：统一可暂停/重播的本地教学回放；等待解码后开动；暂停/隐藏时不推进教程；指令紧贴场景；暂停、重播、继续练习入口均为真实组件。
- `apps/web/src/game/tutorial-model.ts`：仅生成合法输入，所有模拟依赖唯一 game-core。stack/runner 使用规则中的既有 golden 输入时刻；herd 使用 acceptance 中 centroid_behind_55_bark 输入策略，先演示 60 tick 移动再吠叫。没有修改位置、分数、碰撞或成功状态。默认在教学目标事件确认后停下；`{stopOnComplete:false}` 可继续到真实自然终局供运动样板复用。
- `apps/web/src/game/GamePage.tsx`：开始/重练后单次对齐游戏页并用 preventScroll 聚焦；每一次 step 的完整有序事件传给 presenter；session/epoch/恢复/暂停状态接入；累计统计独立于 2.2 秒短反馈；正式隐藏仍沿原时轴推进 core。
- `apps/web/src/visual-repair.css`：仅表现布局；短屏完整世界统一 FIT，在不裁切/改变投影情况下同时展示 HUD、场地和触区。短屏教程减少外层重复页眉，避免控制被固定底栏覆盖。
- 新测试：`tutorial-model.test.ts`、`tests/r2-tutorial-runtime.mts`、`tests/r2-tutorial-evidence.mts`。

## 真实验证

| 命令 | 退出码 | 本轮结果 |
|---|---:|---|
| `node node_modules/vitest/vitest.mjs run apps/web/src/game/tutorial-model.test.ts` 初始红测 | 1 | 3 项按预期失败：独立文字时钟、240 tick 重置、缺独立累计区 |
| 同命令最终版 `--reporter=dot` | 0 | 9/9，通过三款真实事件目标、输入规范、连续 tick 和继续至自然终局 |
| `node node_modules/typescript/bin/tsc -p tsconfig.json` | 0 | 全工程类型检查通过 |
| `node --import tsx apps/web/tests/r2-tutorial-runtime.mts before` | 0 | 复现并记录旧状态，非通过证明；9 组记录 |
| 同命令 `after` | 1 | 测试运行期间本代理编辑源文件触发 HMR，herd 暂停回放被重新挂载；保留失败证据，未标通过 |
| 同命令 `after-r2` | 0 | 9 组暂停、重练记录通过 |
| 同命令 `after-r3` | 0 | 12 组，补充真实采集/入圈事件及控制区遮挡验证 |
| 同命令 `final` | 0 | 12 组最终记录；额外真实点击三款操作按钮确认 accepted_actions>0，实际点击继续练习链接与重播 |
| `node --import tsx apps/web/tests/r2-tutorial-evidence.mts` | 0 | 完整合法输入、原始有序事件及 hash 输出 |

浏览器运行使用已安装 Chromium 与 `PLAYWRIGHT_BROWSERS_PATH=<USER_HOME>/AppData/Local/ms-playwright`。初始沙盒本机网络受限，已由正常 require_escalated 审批运行浏览器；没有更改网络/权限配置。全部 API 非 GET 请求被拦截，最终断言写请求数为 0；不是后台/正式局业务验收。

## 短屏证据

真实 Chromium 320×568：旧 stack 开始后 HUD y=-181、场地 y=-109；旧 herd HUD y=-155、场地 y=-83，重练同样失屏。最终三款 HUD y=71，场地 y=125.3..323.3；stack/runner 触区 y=396.3..448.7，herd 72×72 触区 y=396.3..468.3。教程控制 y=410.7..458.7，固定导航从 y=488 开始。暂停 4.5 秒后文字与教程 tick 保持，继续、重播和练习跳转可用。

截图/结果：`final/`。实际开图检查了 herd 运行和暂停教程；这些是 viewport 模拟，物理手机仍 NOT_RUN。

## 真实教学事件和运动样板输入

| 游戏 | 教学目标完成 tick | 完整合法回放自然终局 | 输入数 |
|---|---:|---:|---:|
| stack | 49（DROP_ACCEPTED、LAYER_LANDED） | 966 | 20 |
| runner | 241（JUMP_ACCEPTED、OBSTACLE_PASSED、GRASS_OUTER、GRASS_INNER） | 1350 | 20 |
| herd | 101（DOG_MOVED、BARK_TRIGGERED、SHEEP_PENNED） | 432 | 435 |

`legal-replay-index.json` 与 `*-legal-replay.json` 保存每段输入、所有原始事件、自然终局、canonical JSON hash。它们是合成合法教学控制器，不是真人难度样本，也没有真实积分。

## 剩余边界

代码/本机浏览器教学与短屏定向验证 RUNTIME_VERIFIED；物理 iOS/Android/微信、真人/现场 NOT_RUN。视觉还原、动作艺术质量由总控样板与 S3 签认记录处理；本分工没有艺术签认，不修改 production_art_accepted。F01/F02 身份绑定/兑换恢复代码未改，完整相关回归由总控统一执行。总控仍需汇总三视口、实速片段、候选素材版本和最终 frozen hash 对比。
