# 聚焦恢复阶段：内置图像参考输入诊断

本次为只读诊断，没有修改工具、依赖、安全配置或制作源。没有新增API调用、读取密钥或切换付费图像API。

## 已知调用与状态

此前两次调用同一内置 `image_gen.imagegen`，参数为 `prompt`、`referenced_image_paths` 和 `transparent_background=true`。目标是当前Blender正式stack静帧，另一张图为角色板：

1. Windows绝对路径使用正斜杠 `<WINDOWS_DRIVE>/…/art-source/r2/r2c/sheep_stack_512.png`。
2. Windows绝对路径使用反斜杠 `<WINDOWS_DRIVE>/…\art-source\r2\r2c\sheep_stack_512.png`。

两次在参数反序列化阶段均返回 `AbsolutePathBuf deserialized without a base path`。未进入可确认的生成过程，没有图片结果，不能记为生成成功或已做精修。该错误不是权限审核拒绝。

## 当前可见文档边界

- 工具公开参数支持 `referenced_image_paths`（本地路径）和 `num_last_images_to_include`（最近对话图片），二者互斥。
- 对所有目标均有本地路径的情况，工具要求使用 `referenced_image_paths`；最近图片输入只用于至少一个目标没有本地路径的情况。
- 当前schema没有 `base_path`、工作目录、挂载映射或URL输入参数；当前技能没有说明相对路径是本环境的受支持修复方法。
- 当前两份目标均有本地路径，不能为了避开路径解析条件而把它们伪装成无本地路径图片。未尝试 `file://`、猜测Linux挂载点或改工具内部。

可确认的是：公开参数没有提供可用基准目录，两个已存在的Windows绝对路径写法均未被入口解析接受。跨平台路径解释不匹配是一种可能原因，属于推断；未声称已经检查或定位工具内部实现。没有明确受支持的本地参数修复，因此本轮不盲目重复生成请求。

## 父任务可使用的固定输入

- 原型/身份材质：[角色板](https://raw.githubusercontent.com/radiance1203-cmd/sheep-annual-party-frontend-review/608e2a5bbe24e306a15019a73cf0cdb956ec5d56/review/r2-20261027/references/character_foundation_board.png)
- 当前正式相机：[F2透明静帧](https://raw.githubusercontent.com/radiance1203-cmd/sheep-annual-party-frontend-review/608e2a5bbe24e306a15019a73cf0cdb956ec5d56/art-source/r2/r2f2/sheep_stack_512.png)
- [原型/当前并排](https://raw.githubusercontent.com/radiance1203-cmd/sheep-annual-party-frontend-review/608e2a5bbe24e306a15019a73cf0cdb956ec5d56/review/r2-20261027/art/r2f2/prototype-formal-camera-comparison.png)

建议的母稿编辑范围：保留F2相机、紧凑屈腿姿态、足点和构图边界；按角色板校准短粗紧卷角、圆润桃色脸颊/口鼻、奶白自然分级毛团与细绒材质。只做同一静帧母稿，禁止增加道具、改变规则尺寸、生成整页UI或把母稿当作已完成3D动画。成功的参考编辑仍需回到可编辑母源和固定相机验证。

当前状态：本机图像参考编辑未执行成功；可由父任务在有明确受支持输入的云端工具中辅助母稿。现有Blender控制面/接缝修正继续，不因该入口失败而停止独立工作。

## 后续云端结果与本任务像素入口

父任务已通过云端内置imagegen成功编辑母稿，身份见同目录 `cloud-reference-register.json`。本任务按公开参数调用 `Library read` 的 `mode=image_file`，并再次显式指定 `include_images=true, include_text=false`；返回均为成功metadata及 `image_asset_pointer`，没有MCP image像素内容。元数据读取成功不能写成开图成功，caption也不能替代像素判断。没有重试Windows下载助手、猜测云端文件系统路径或改工具。

该入口当前阻塞的是**本执行者查看云母稿像素**，并非云端生成失败。父任务已经看到的外观/透明/姿态变化作为第三方来源记录，未由本任务重新实测。已提供所需补充：可返回像素的受支持图片附件或已授权审查仓库的固定图片链接。G3直接截面/权重操作继续以原角色板与现有可见样板为依据，不假称使用过尚未看到的云母稿细节。


补充精确返回：两次`library_file_id`读取的顶层content均为text `Action completed.`，structured结果含metadata/说明与`sediment://`形式的`image_asset_pointer`，没有`type=image`内容。第三次按返回的`file_id`读取，结果为“requested file reference is not currently visible”，未返回像素并停止该分支。这不是仅OCR精度问题，也不是工具不存在。没有证据表明云端PNG损坏或生成失败。

Git协调：父任务准备先发布该PNG，当前本轮不提交/推送；本地审查checkout干净、HEAD和只读ls-remote均为`608e2a5bbe24e306a15019a73cf0cdb956ec5d56`。收到固定HTTPS图片及提交后再读取像素、核对SHA和尺寸，随后在该新远程基线上整合新增候选/证据，避免并行修改main。


协调更新：父任务的云PNG create_blob触发额外确认，未完成，未创建tree/commit或更新ref。父任务已解除main等待，本轮仅同步已有G3/G4，不上传该PNG，不另换入口替代该确认。云母稿仍未被本执行者开图。
