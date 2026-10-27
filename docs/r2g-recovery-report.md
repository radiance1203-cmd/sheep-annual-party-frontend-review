# R2g 聚焦恢复阶段：直接控制面、纤维权重与卷角穿面修复

本阶段接续已公开技术版本`608e2a5`，只处理F2同一正面近景和正式stack机位。当前有效候选为 **G4几何修复候选**，尚未达到参考级软绒艺术目标。`production_art_accepted=false`，签认人/时间null，S4未启动。没有新增功能修改、正式资源绑定、部署或业务操作。

## 已完成与实际开图结论

| 部位 | 实际操作 | 当前差距 |
|---|---|---|
| 口鼻 | G1直接移动现640点脸笼中的541点，修下颌和颊面；后续保留 | 下颌更圆；侧向嘴角、鼻翼到脸颊的曲面与参考神态仍不够细腻。 |
| 毛团 | 错层/扭转37束，体素焊为49650点，对10067个凹谷点做7轮选择性平滑 | 横排拼块接缝有所减弱；宏观体积仍偏泡棉，缺少参考的错落软绒团层级。 |
| 微绒 | G3建立5个POINT字段，BVH插值并实际重映射/梳理4440条现纤维，未增加数量 | 字段和实际点变化可验证，但正式64帧下差异很弱，不能据此称绒毛材质解决。 |
| 卷角 | G4只处理175–200既有环的C1中心线、连续收断面与175–180朝向过渡 | 内端暗缝和折角减轻；内卷变细、开环感仍明显，不等于参考厚实内卷。 |

总控已实际查看G4两张原始512图、F2/G/角色板同机位并排、390宽真实renderer截图。结论是**局部源几何缺陷得到明确修复，整体艺术差距尚未解决**；没有自评95%，没有把技术通过转为艺术接受。后续需要重新分配内卷实体空间与粗细，并按可见参考直接雕刻中团体积/交界和口鼻侧曲面；不是继续均匀加毛、加圈或全局曝光。

## G4根因、失败与恢复

G3第191环局部中心线曲率半径约0.00103、截面半径约0.03116，局部比约30.29。第一有限组合没有合格曲率解，退出1且未保存/重渲。第二组合解决曲率后，旧172/173环与新175–177环出现接缝穿面，仍退出1且未保存/重渲。

最终方案保留175/200中心端点和175环原顶点，在175–180由原截面朝向平滑过渡至新运输框架，实际编辑176–200。每侧1001点密集曲率采样最大比0.42495；独立重开按实际顶点最大截面测得最坏比0.42653。目标区域BVH非邻接候选和有界边/三角穿面检查：G3基线164对，最终0。此局部范围不冒充全模型拓扑验收或艺术质量。

重开检查确认472个非角mesh和37个身体纤维curve与G3字节一致。圈数/每角4824点、光、相机、曝光、root、pivot、crop不变。G1/G2/G3源和图片均保留history；G3源hash为`ccb371663a7375801b7531d34c963ff8f35bd82ea552ff41256cad39850f1b72`，可文件级恢复。

## 当前源、图片与hash

- 可编辑母源：`art-source/r2/r2g/sheep_master_r2g.blend`，SHA256 `e6875118a2cca427b380bf40838d679ac9b742d80ab7fff2e117058cb058feff`。
- 候选PNG：`apps/web/public/assets/candidates/r2/r2g/sheep_stack_r2g.png`，SHA256 `aff830064b3c1813d03e9fcd8432ff2009b37c18d4bfb4cfdbfd8166e139c757`。
- manifest：同目录`candidate-manifest.r2g.json`，SHA256 `43982e3e874fcfc93ae81bf5b2ade145ac018085cb7c139c8c815884561d62c4`。
- 对照：`review/r2-20261027/recovery-g/f2-g-same-camera-native64.png`，离线同机位/原生64图，不冒充引擎截图。
- 实际引擎：`review/r2-20261027/recovery-g/runtime/stack-r2g-{320,390,430}.png`；唯一core合法输入至tick150，固定表现500ms，仅stack_idle使用G4，其余动作/道具/背景仍为v4。它是静态局部合成，不是新动作/完整实速片段。G2/G3旧runtime分别保留runtime-g2/runtime-g3。

256帧pivot[128,224]、裁剪[128,32,256,256]；按64 CSS帧等比显示alpha高30.75、宽42.5，真实112托宽/44层距未变，无非等比压缩。大型原生源和原始渲染日志保留本地，公开范围按既有策略只含脚本、候选图、JSON证据、报告与来源hash。

## 本阶段实际验证

最终`fix_curvature_and_section_overlap.py`、两帧渲染、`package_and_compare.py`、`verify_native.py`均退出0；失败两组退出1的情况单独保留。实际命令/范围见`review/r2-20261027/recovery-g/art-report.md`，原始失败日志在`art-source/r2/r2g`。

总控`python .local/r2g-root-check.py`退出0：源/输出/manifest hash、单帧atlas、alpha净空、F2保留和正式manifest不变。`node --import tsx review/r2-20261027/recovery-g/runtime-capture.mts`退出0：320/390/430三宽真实renderer截图，0页面错误、0业务API，candidate hash均为上述G4。`function-freeze.json`核对33个功能入口与608e2a5一致。规则原字节和当前官方manifest hash不变。旧274项技术测试属于已公开技术阶段，不当成本轮新美术通过。

## 云端母稿像素：具体阻塞与来源

父任务云端内置imagegen已成功生成`sheep_reference_edit_r2.png`：Library `libfile_3407db15e99881918104ce7820e2092e`，文件`file_000000002e9c822fa4ce42d97e733f78`，父任务version0。Library metadata返回1254×1254、985561字节、artifact_type=image_gen、version_id=null。

本执行者的`Library read`工具存在。以Library身份两次`mode=image_file`读取（含显式images=true/text=false），顶层仅text `Action completed.`，结构化内容含metadata/说明与`sediment://`图片指针，没有`type=image`像素块。用返回file_id读取又提示该引用当前不可见，未返回像素并停止该分支。这不是仅OCR问题或生成失败。**本执行者没有看过云图、没有本机落地，G1–G4均未依caption猜图造型。** 父任务关于透明/更接近参考/姿态与尺度改变的观察单独登记为来源说明，不冒充本机实测。

本机原imagegen路径入口两种Windows绝对路径均在反序列化时报`AbsolutePathBuf deserialized without a base path`；公开schema没有base_path/workdir/URL修正入口。没有改工具、猜挂载、重试下载助手或改用付费API。精确记录见`imagegen-diagnostic.md`与`cloud-reference-register.json`。

待父任务把实际PNG发布至已授权审查仓库并提供固定提交HTTPS链接后，可用标准公开HTTPS读取实际像素，记录hash，再评估可转化的内卷体积、口鼻与毛团控制。该图始终仅是imagegen参考，不是Blender输出、生产帧、golden或S3签认。

## Git协调与未验项

父任务已解除协调等待：云端PNG的create_blob需要额外确认且未完成，未创建tree/commit或更新main。本轮不上传该PNG，也不通过其他入口替代其未完成确认。当前读取远程并重新fetch后仍为`608e2a5bbe24e306a15019a73cf0cdb956ec5d56`，审查checkout无并行本地修改。

本次在该基线上只同步G3/G4候选、制作脚本/源版本hash、两视图、三宽实际对照与恢复证据/报告，更新审查入口。仓库既有`.gitignore`明确排除`*.blend`、`*.blend1`和大原始日志；沿用现有快照策略，原生可编辑G3/G4母源仍保留本地并登记hash，不强行添加忽略文件、不改变存储策略。排除G1/G2历史图包、云端PNG、后台、凭据、真实业务数据与无关备份。不部署、不force，最终提交及远程核验以实际Git结果为准。

已完成同两视图有限源修复与本机静态复核；云图像素校准仍PENDING；Git独立同步已获准继续，不再等待该图。新完整动作、三款新场景、S3艺术接受、物理iOS/Android/微信、真人与现场均未完成或NOT_RUN。艺术门不因源几何修复或技术上传放行。


## 公开副本的元数据脱敏

预推送发现4张G3/G4原生PNG文本元数据含本地路径，仅在导出副本移除文本/EXIF块；RGBA像素及IDAT块逐字节不变，本地源未改。公开manifest的outputs hash按脱敏副本登记，并保留source_output_sha256；上文母源与本机源manifest hash仍表示本机原件。当前游戏候选PNG、atlas和真实renderer截图未改。原始/导出hash映射与公开manifest hash见[PUBLIC_SANITIZATION.json](../review/r2-20261027/recovery-g/PUBLIC_SANITIZATION.json)。云端PNG未包含。
