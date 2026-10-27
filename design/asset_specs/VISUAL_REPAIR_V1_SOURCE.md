# visual-repair-v1 资源制作记录

本记录仅覆盖 VR-03 / VR-06。视觉样张审查、实际游戏画面、真人/真机/现场验收是分开的门槛。

## 版本与来源

唯一当前运行清单继续为 `apps/web/public/assets/asset-manifest.v1.json`。开始时原字节 SHA256 为 `1b14bf379058f814d7ddacdeba36aaab4919e22b76d7dc948926e22fac809c9c`；按该哈希保存在 `assets/releases/<hash>/asset-manifest.v1.json`。归档不可变由路径与内容哈希 guard 保证，复用既存文件必须完全匹配，不赋 Windows ReadOnly 属性：该属性会随 Vite 复制到 dist，导致第二次构建覆盖同路径报 EPERM。去除属性前后归档与当前 manifest 字节哈希均不变。全部 v1 PNG、JSON、WebP、母源和生成工具保留。

四张提供的 WebP 已逐张打开。它们是补充包提供的局部大厅 hero/入口封面，直接逐字节复制，不重新生成、重压缩或裁图。稳定 ID、源 PNG/运行 WebP 的真实 SHA256、尺寸和用途见 `art-source/visual-repair-v1-import.json`。四张合计 111230 下载字节、3248672 RGBA 解码字节；这些数字不是实机性能结论。

## 同源母源修复

`repair_masters_v2.py` 打开真实存在的 `sheep_master.blend`、`dog_master.blend`，对具名网格、曲线、材质和灯光作局部修改，另存到 `art-source/v2/`。不执行旧脚本的清场或初建场景部分。原有集合、root/身体/腿控制器、动作名、帧数、生产正交相机与裁剪/pivot 保持。

- 羊：旧 45 个大毛团缩小并重新分布，增加 145 个同源小卷毛；后脑增加小卷毛覆盖。面部改暖浅奶油，眼睛略放大，躯干缩短，缩短露出的腿。围巾和一只金铃保留。卷角从头侧连接并沿 3D 曲线卷到脸外缘。
- 毛面：可编辑云噪声位移、小尺度材质凹凸、实际短毛粒子共同产生表面。羊毛 Noise scale 18 / detail 3，Bump strength 0.55 / distance 0.025；每羊毛网格 1000 根、0.022 世界单位短毛，无插值子毛。美术随机 seed 5012026，完全独立于玩法随机数。
- 狗：保持既有身体与方向动作，深色长耳下移，胸前补短毛簇；可见尺度程序毛面加实际短毛。
- 一个失败实验曾错误地再按对象 scale 补偿粒子长度，导致放射长毛。实际 hair_keys 数据保存在 `v2/fiber-debug.json`，失败图单独保留；最终候选已撤销补偿并移除插值子毛。

`repair_farm_v2.py` 打开原 `farm_master.blend`，保留 11 个既有道具键，增加草丝、绳、木纹、木钉、农舍板缝和窗/门斜撑，增加 `bush`、`tree`、`lantern` 独立透明装饰。环境不是封面切片，不携带玩法碰撞数据，也不改变圈门/跑道/托盘的规则几何。

实际 128px 道具接触表发现原福草外圈在侧视几乎变成薄片，已让外圈/金芯一起转向镜头并保留二者艺术中心一致；仍是两个独立帧，原 pivot 与规则判定半径不变。副本环境页各 14 帧，使用 `bush`、`tree`、`lantern` 时由前端在规则场地外或装饰层组合，不能把美术尺寸当作碰撞边界。

样张采用独立近景审查相机；保存的母源生产相机仍为既有 side_v1 / iso8_v1，128px 帧 pivot 分别为 [64,112] / [64,98]。近景样张不是生产图集帧。

## 验证与限制

`art-source/v2/source-diff.json` 和 `farm-source-diff.json` 记录真实源哈希、对象/动作数与修改；`samples-r*` 保留迭代对照。实际开图发现的瑕疵由总控逐轮审查，不用样帧数量代替视觉判断。

只有样帧经总控审查后才能运行 `render_v2.py` 的完整角色导出。`package_v2.py` 只读 v2 渲染目录，写 v2 PNG/JSON，核对 254 帧、动作/方向/fps、透明安全边距、固定裁剪、无旋转裁边、图集边界与内存。所有检查通过后才更新当前 manifest 的稳定 ID；v1 资源与历史清单不改。

角色外形仍可能比角色板更偏短卷毛玩具；细绒和动作必须结合运行实际尺寸复看。技术图集通过不自动等于视觉通过、真机通过或 G5/G6 通过。

`samples-r1` 至 `samples-r6` 是历史迭代，`samples-failed-particle-compensation` 明确属于失败实验；`fiber-debug.json` 记录该失败原因的诊断。只有 `samples/` 是当前通过生产导出门槛的同版羊狗八张方向样图。`.blend1` 为本轮 Blender 自动备份，不进入运行/母源资源清单；v1 原母源与原工具保持。

## VR-07 独立 3D scenery 补充（art-1.3.0）

运行对照发现，canvas 椭圆云/渐层与零散小道具仍欠缺原型的环境层次，因此在现 `farm_master_v2` 上克隆/扩展可编辑农舍、云、远丘、树、草垛、花草与统一左上软光，制作三份独立 scenery 母源。已批准的 360px 预览继续到 2x PNG，未重做或覆盖 254 个角色帧与任何 v2 页，四张提供插画也保持原字节。

首样因地面近端不足出现下方蓝条、丘过高遮天；修复为地面延伸到画面外，天空保持净空，农舍/树移至侧后景。第二轮云簇相接成带，随后改为分离、不等大小/高度的云簇。Runner 横图的 Blender AUTO 正交尺寸实际按宽度计算，已修正后让农舍完整落在约 x300–350/y115–178，地平线约114、云约top25–55。Herd 保持正交俯视草地，中央留空，不画真实圈门线。失败预览在 `art-source/v3/history-r1`、`history-r2`，不作为当前背景。

`render_backdrops_v3.py` 将新母源清理成仅 `SCENERY_STACK/RUNNER/HERD` 集合，均无动作/动态对象，没有实际平台、栏杆、拾取物或 herd 门线；装饰围栏不表达游戏碰撞。最终 PNG 720×960、720×440、720×840，分别按 scene_size_px 360×480、360×220、360×420 等比显示。单帧 `backdrop_<game>` 使用全图 rect、原点 pivot [0,0]、`animations:{}`，不套用角色 128px 帧假设。

c94d522416e41bc9eddf937563bda44bf28d4e217c956bbb030980eba3ff35b7 清单原字节已按哈希归档、复用时用内容 guard，无 Windows ReadOnly 属性。新当前清单为 `art-1.3.0-visual-repair`，SHA256 `bdf93f4c26c9ed6e108f5af5a718edd7997a86936da85404485a68e1eeb8d234`，必需 atlas 名单含原角色/环境/effects 与各自 scenery 页。独立校验旧67条资源记录/文件完全不变。

三张 PNG 合计1540914字节；新增 RGBA 成本为 stack 2764800、runner 1267200、herd 2419200 字节。含原角色/环境/effects 后的纹理基础成本分别12201984、10704384、41216512字节，尚不含UI、framebuffer和浏览器解码副本；不冒充真机结果。源/渲染/哈希/成本与校验详见 `art-source/v3/production-render-report.json`、`backdrop-registration-validation.json`、`runtime-validation-v3.json`。背景样板只通过接入门槛，最终实际运行画面/动作/性能与G5/G6仍由总控验收。
