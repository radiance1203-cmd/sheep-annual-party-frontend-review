# 图集装配与运行时资源约定

## 2026-10-27 art-1.4 实施增补

下面的首版计划保持为历史制作基线。当前实际发布清单是 `apps/web/public/assets/asset-manifest.v1.json`；v1/v2/v3 原字节与清单按 SHA 归档，不能根据下文的 `planned` 推断当前仍未交付。

- 角色仍是固定 128×128 RGBA 帧，本轮固定相机512源帧统一下采样，不逐帧裁切；原 38/104/112 个动画帧键、fps、pivot 均保留。羊侧页新增同一母源的 `stack_idle.e` 6、`stack_air.e` 2、`stack_steady.e` 3、`stack_celebrate.e` 8 帧，合计 57 帧。侧页为 1024×1280，八向页各 2048×2048。
- 仅新增的静态道具允许可变矩形：薄托 194×10/pivot[97,5]；三栏 64×240、144×240、224×240；外叶/芯 72×72、24×24。精确 rect、局部 pivot 和 alpha 边界以 v4 元数据及 `art-source/v4/prop-frame-mapping.json` 为准。原14环境帧保持原像素和契约。此扩展不允许角色逐帧裁剪或逐帧归一化。
- 道具保持原生宽高比，用 `fitFrame` 均匀缩放并尊重元数据 pivot；只呈现在 core 给出的实际 AABB/圆内。薄托可见宽112、高约5.773，三栏范围8/18/28×30，草圆半径4.5/1.5均冻结。图像透明边界不参与碰撞或积分。
- 层距44、角色脚锚点和世界坐标不变；紧凑叠层姿态整帧显示64，群羊55、犬72为整类稳定尺度。准备、开始、恢复与练习重置复用已解码的同一 renderer；回卷仅清呈现历史，不重置任何正式局时轴。
- 三背景为720×960/440/840的独立纯装饰页，逻辑360×480/220/420、pivot[0,0]。整页装饰延展不拉伸实际游戏世界，不烘焙真实门线、羊、托盘、跨栏或采集物。
- v4 均为 `rendered_candidate`，`production_art_accepted=false`。技术检查、实际页面复拍、真人视觉签认、真机与现场放行分列，不能互相替代。当前技术预算见 `art-source/v4/atlas-validation-v4.json`。

此文件是制作合同，不是已交付图集。正式 PNG／JSON 在 baseline manifest 中为 `planned` 且 `path:null`。SVG 是当前可编辑基底，不能凭存在 41 个 SVG 宣称正式图集已经完成。

## 1. 文件与帧命名

生产包建议：`assets/characters/sheep_side_v1.png` 与同名 `.atlas.json`；`sheep_iso8_v1`、`dog_iso8_v1` 类推。母源位于 `art-source/`。前端核准后复制到 `apps/web/public/assets/`。这些是未来目的地，当前现存路径在 baseline manifest 内逐项列出。

稳定资源 ID 使用小写点分词，如 `character.sheep.side`、`ui.button.primary`；文件名小写下划线。帧键遵循 `{actor}_{camera}__{clip}__{dir}__f{000}`，例如 `sheep_side__run__e__f000`、`dog_iso8__bark__nw__f003`。数字为零起始三位补零，方向取相机规范的八向小写后缀。

## 2. 贴图与边距

生产单帧 128×128 RGBA8，透明底，sRGB，straight alpha；来源为 256×256 固定裁剪帧统一下采样。首版 `trimmed:false`、`rotated:false`，禁止图集器自动旋转或逐帧重裁切。每边向外复制边缘像素 2 px，另留透明间隔 2 px；单帧槽位 136×136。frame rect 指内容 128×128，不含 extrusion 和 padding。

页内无独立文字，标签、分数、倒计时、连击和冷却数字由组件绘制。UI SVG 优先直接加载，不必栅格化；SVG 若内联多次，要为 gradient 和 title 等 ID 添加实例前缀，避免不同图标／按钮相互引用错误。

| 页面 | 目标帧数 | 页尺寸上限／建议 | 解码后基础内存 |
|---|---:|---|---:|
| 羊侧视 | 38 | 1024×1024（7×7 槽可容纳） | 4 MiB |
| 羊八向 | 104 | 2048×2048（15×15 槽） | 16 MiB |
| 狗八向 | 112 | 2048×2048（15×15 槽） | 16 MiB |
| 单一视角环境 | 按清单 | 2048×2048 以内 | 16 MiB |
| UI 备选栅格页 | 按需，优先 SVG | 1024×1024 以内 | 4 MiB |
| 特效页 | 按需 | 512×512 以内 | 1 MiB |

预算是实施目标，不是已测得的文件大小。目标：公共首屏资源压缩后≤1 MiB，单游戏增量≤4 MiB，当前游戏总传输≤8 MiB，当前活跃纹理基础内存≤64 MiB，不包含 framebuffer。赶羊角色+场景+UI+特效按上表约 53 MiB；禁用不需要的 mipmap，不同时保留三游戏大图集。游戏切换卸载不使用的角色／环境页，保留公共小资源。编码压缩、低端设备内存和首屏实测属于 T-051／T-066。

## 3. 图集 JSON 必需字段

每个正式 `.atlas.json` 必须有以下数据；此处值为结构示例，没有关联的现存 PNG：

```json
{
  "schema_version": "sheep-atlas-1.0",
  "asset_id": "character.sheep.side",
  "status": "production_after_acceptance",
  "image": "sheep_side_v1.png",
  "size_px": [1024, 1024],
  "color_space": "srgb",
  "alpha_mode": "straight",
  "camera_id": "side_v1",
  "source_frame_px": [256, 256],
  "runtime_frame_px": [128, 128],
  "extrusion_px": 2,
  "padding_px": 2,
  "frames": {
    "sheep_side__run__e__f000": {
      "rect": [4, 4, 128, 128],
      "source_size": [128, 128],
      "sprite_source_rect": [0, 0, 128, 128],
      "trimmed": false,
      "rotated": false,
      "pivot_px": [64, 112],
      "direction": 0
    }
  },
  "animations": {
    "run.e": {
      "frames": ["sheep_side__run__e__f000"],
      "fps": 12,
      "loop": true,
      "note": "示意列表；生产必须列齐 f000 至 f007"
    }
  }
}
```

生产文件不得保留示例的 `note` 或只有一帧的 run；帧数须完全匹配相机／动画表。`image` 按 atlas JSON 所在目录解析；图集键和 `asset_id` 不依赖构建后哈希文件名。URL 若由打包器修改，须由资源映射表注入，不让代码硬编码页内坐标。

渲染时以 ground／foot pivot 放置：`topLeft = projectedLogicalAnchor - pivot_px × displayScale`。源 SVG 占位 256 帧使用源 pivot，正式 128 帧使用减半 pivot，确保替换后地面点不跳。首次集成以 manifest 的 `canvas_px`、`pivot_px`、`camera_id` 为准，不以图片宽高猜测。

## 4. 物理尺寸单独绑定

碰撞和得分只读 `config/game_rules.v2.1.json`。图集 JSON 不存 physics hitbox；透明像素、可见毛球、动画伸缩、人物阴影、组件 CSS 尺寸均不得决定碰撞。栅栏、草垛和栏杆的前景艺术应在 debug overlay 下对齐该配置。跨栏福草外圈和金芯是两个独立视觉层，与规则两个半径同步；不能用大而发光的外观暗示额外判定范围。

## 5. 交付验证

逐页检查实际尺寸、rect 不越界且互不重叠、帧数／fps／方向／pivot 相符、透明边没有邻帧出血、动画起止无锚点跳动。生产检查把所有方向放在同一地面十字上播放；验证 30fps 与 60fps 显示不改变重放得分。导出源、图片、JSON、生成命令、渲染器版本、源码版本和 SHA256 一起归档。发现占位资源仍被引用时，T-051 不得标为完成。
