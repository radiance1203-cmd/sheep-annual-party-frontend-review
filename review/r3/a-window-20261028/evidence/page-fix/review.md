# R3-A-PAGE 有限背景样板 — 2026-10-28

任务基线 HEAD `9d652fb3fef2ede55ebc462d46445cc855b98dd1`，共享原 checkout。仅写 `apps/web/src/r3-ui.css`、`apps/web/tests/r3-a-scenery.mts`，证据在本目录。未操作 Git 索引、安装依赖、资源图、素材母源、规则、GamePage 或 renderer。当前证据使用 B4 candidate manifest `68a94f88ab06e175255ee54a2d8ee0a8a666582dd4b3973bbcfd75adb871a5cb`。

## 原因与修复

RED 原生实拍确认：背景图和叠在它上面的渐变都使用同一个 size/top；390 跨栏准备/运行图为 399.546×844 CSS px、top -127.463px，二者一起在 y716.537px 结束，余下约127.46px直接露出纯底色。430跨栏教程结束 y794.821px，余下约137.18px。390叠高图结束 y748.342px；390赶羊 y839.864px 处可见末行细线。

现在 `::before` 只画原图，保留原来的等比 size/top；独立 mask 在原图末110 CSS px将透明度归零。页本底用低频明暗和色温渐变延续土路/草地，叠加轻微SVG湍流颗粒；只有颗粒重复，景物图不重复、不拉伸。没有新栅格图。

stage 新增被动背景层，位于真实 canvas 前序，仅柔化背景：跨栏草 y69/220 与栏 y150..180/220 走廊，叠高横扫区域，赶羊门附近。左右渐隐避免舞台边缘可见色块；canvas角色、托、草、障碍及真门处于其上。未改变 stage 几何、FIT、相机或输入代码。

## 实跑与开图

- `node --import tsx apps/web/tests/r3-a-scenery.mts --red`：15张 RED，exit0。
- 首次 GREEN：15张，几何检查通过，但开图发现 stage 淡化层左右矩形边缘；该轮未接受，保存在 `trial-1-edge-rejected/`。随后增加横向mask渐隐并降低淡化强度。
- `node --import tsx apps/web/tests/r3-a-scenery.mts`：最终15张 GREEN，exit0；三种viewport分别320×568、390×844、430×932；runner准备/教程/运行三态，stack/herd运行代表态。
- 最终15张均使用 `view_image` 原生开图。未发现原图片末端横缝或原有突然纯色断层；页尾改为带轻微颗粒与明暗变化的低细节地面接续。交互区域背景频率有可见降低。
- 15/15 与RED的全部采样 rects、controls、背景size/top逐字段相同；逻辑世界360×480、360×220、360×420保持；配置锚点误差最大0 CSS px；真实控件最小48×48 CSS px。
- 15/15 canvasCount=1、页面宽度=viewport宽度；0 pageerror，0 API写请求尝试。所有API只使用隔离GET fixtures。
- `node node_modules/typescript/bin/tsc -p tsconfig.json`：exit0，无输出。

`red/results.json`、`green/results.json`含原始metrics、截图sha、CSS sha、candidate、browser版本和前后live tick。`r3-ui.diff`是RED CSS与最终CSS的实际差分。`seam-pixel-readonly.json`只读PNG像素，采样原图结束处左右2 CSS px边缘，作为横缝辅助证据：runner390准备处相邻行RGB差峰值113.45833→1.5；runner430教程42.70833→1.70833；herd390 22.16667→1.41667。该指标不是美术验收。

## 限制与后续

本轮是背景接续与层次的局部样板。叠高羊托比例、跨栏草/栏真实小包络、赶羊圈内高度和角色材质身份仍有已知差距；不签九格艺术整体、sample、production或S3通过。不是物理真机、微信、真人难度或现场网络结果。

练习截图没有派发玩法操作；教程使用应用真实教学控制器。live tick并不完全相同，因此移动物体像素不能用于同tick碰撞证明。CSS被动层pointer-events:none，输入源代码未改；最终综合输入与三款三态27图仍由总控对同一最终候选复核。

未运行build：子任务写入范围不包含构建输出；总控负责整合后的build和完整矩阵。无需新背景补片即可完成本轮页尾修复，但原型级插画质量仍需独立美术验收。
