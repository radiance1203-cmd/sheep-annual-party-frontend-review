# 美术来源记录

## 2026-10-27 实际制作增补

`original_blender_20261027`：`art-source/render_assets.py`、`render_hero.py`、三份 `*_master.blend`，为本项目原创几何、曲线、材质节点、对象控制器动作、固定灯光与相机。使用 Blender 4.5.9 LTS 便携版从官方 download.blender.org 下载，ZIP 399051129 bytes，SHA256 `41da973b9bf95bb312cbeff4d1982feb13259b43c821686b9bafea4dfe5477cf` 与官方校验表一致。未引入外部模型、贴图库、字体或插件素材；Blender 是制作工具，其软件许可不等于对本项目资产另行指定开源许可。参考图仅用于目视风格核对，未切片或嵌入运行资产。

`original_synth_cues_20261027`：`art-source/package_assets.py` 使用标准库波形生成七项可静音提示音，无采样包、语音克隆、外部音频或订阅 API。声音仅作可选辅助，静音反馈由图形与实时文字提供。

UI 状态变体由 `art-source/build_ui_states.py` 基于原有原创 SVG 生成，继续使用 `original_svg_baseline` 来源，状态映射为 `design/ui_kit/button-states.json`。新增母源及运行文件在 manifest 中标记 `rendered_candidate` / `production_art_accepted:false`；真实设备、游戏联调和最终视觉接受不由文件存在自动推导。实际导出与检查见 `art-source/README.md`、`art-source/atlas-validation.json` 和 `docs/art-report.md`。下表为 2026-10-26 原始基底记录，保留历史来源区分。

本记录区分“风格参考”和“能用于游戏的资源”。没有外部开源素材下载、第三方字体嵌入或已有游戏资源拆包。当前 SVG 为本任务中直接用几何代码原创绘制的可编辑基础稿；不在此擅自给整个项目指定开源许可证。

| source_id | 真实路径 | 来源与用途 | 权利／状态说明 |
|---|---|---|---|
| user_style_reference | `design/reference_user.png` | 用户提供的第三方游戏／视频截图，软 3D 与牧场视觉参考 | 不视为原游戏 IP 或素材授权；不得提取角色、UI、Logo、截图文字或贴图 |
| project_prototypes | `design/prototypes/00_lobby.png`、`01_stack.png`、`02_runner.png`、`03_herd.png` | 本项目既有生成原型，页面构图与画风 | 概念参考；不是透明资源、可编辑母模型或已实现页面；原提示词见 `design/image_prompts.txt` |
| project_character_board | `design/character_foundation_board.png` | 以项目原型为参考生成的角色外观板 | 概念参考；下排不是精确八向；制作记录见 `design/CHARACTER_BOARD_PROVENANCE.txt` |
| original_svg_baseline | `design/source/build_svg_baseline.py` 及其 41 个 SVG 输出 | 本任务原创几何绘制，2026-10-26；未导入第三方图标、字体或位图 | UI 可作接入基底；角色／道具是占位，未达最终绒羊美术验收 |
| planned_original_master | 尚无文件，manifest `path:null` | 将由本项目可编辑母源生成生产图集 | 制作时记录作者／工具版本／源文件／生成参数；未交付，不预先宣称通过许可或美术验收 |

生成概念图没有自动变成尺寸精确的三视图，也没有自动提供母模型；SVG 占位也不表示最终角色画风已完成。T-067 负责保留实际来源、制作记录及任何新增外部内容的适用许可；如未来使用字体文件、音效包、贴图库，新增独立 source_id、版本和文件校验值后再接入，不复用本表的原创标记。

此记录不包含 root 另外制作的业务线框文件；它们的说明以各自目录为准。运行资源不应含用户截图或四张整屏原型，只能引用按本规范制作并通过验收的分层素材。
