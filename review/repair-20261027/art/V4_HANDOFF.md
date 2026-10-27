# v4 候选素材交接与冻结

本轮已实际完成：现有 v2 羊/犬/牧场另存修订为 v4；完整角色273帧（旧254帧+侧视stack_*19帧）；保留14旧道具，追加薄托、三栏、同心叶/芯6帧；现有v3三场景另存修订，输出2倍PNG和360小样。注册资源现已冻结，art不再写6个母源、14个runtime PNG/JSON或registry；当前manifest由root统一注册。

最终索引：`art-source/v4/manifest-update-records.json`，20项稳定ID更新；`atlas-validation-v4.json`记录实际校验与预算，`native-source-final-receipt.json`记录6母源可编辑结构和哈希。14个运行文件已复制至public新*_v4路径，旧v1/v2/v3文件和源字节未变。每个图集都保持`production_art_accepted=false`；F06、F08及全部最终视觉继续REVIEW。

## 实际实现

羊旧190密小粒保留隐藏，换54主云团+细绒、较大/下移脸、短腿及紧卷角；犬保留棕白/红项圈，宽头胸、三角半立前折耳，最终耳厚度.09、边缘bevel.04。旧actions保留，新增V4_可编辑动作；八方向独立渲染，同类稳定尺度。`render_v4.py`实际导出273个512 RGBA原图，固定裁剪/下采样后打包；没有调用旧破坏性生成器或图像API。

侧视页为1024×1280（5 MiB），57帧，保留旧38键/fps/pivot，追加`stack_idle.e`6、`stack_air.e`2、`stack_steady.e`3、`stack_celebrate.e`8。羊104帧和犬112帧八向页仍2048×2048。所有帧有安全边界、128×128、pivot侧视[64,112]/斜俯视[64,98]；不按帧重裁或归一化。完整接触表在本目录。

stack size64时19帧alpha1最大可见高35.5；相对pivot最高-34、最低+1.5。root脚位y-2时，下层最高y-36；上层薄托实际底约y-39.11，稳定叠层静态包络留约3.11间隙。这个计算不代替root实际检查1/4/8/20层及SWING/FALL/SETTLE/终局。

`prop-frame-mapping.json`给出精确rect/pivot/bbox。薄托最终tight rect[19,281,194,10]，pivot[97,5]；内像素不变，外2px extrusion，放入112×6按统一比例得到可见112×5.773。三栏frame64×240、144×240、224×240，分别对应8×30、18×30、28×30；保留1px左右内padding，全部可见像素留在规则AABB中。中/宽栏木纹已限制在立柱，未留下中空悬浮线。叶72×72/pivot36,36与芯24×24/pivot12,12同心，alpha1完整落入相应圆，root映射9×9/3×3。14原frame metadata与frame内像素均完全相同。

背景保持360×480/220/420和[0,0]，2x正式PNG分别720×960/440/840。R1/R2预览保存在`art-source/v4/history/background-r1`、`background-r2`。R3保留原场地、runner y180路面，细草材质和暖亮光线、边缘叶/花/草垛，stack两侧树冠围合，herd谷仓下移露出门窗、去掉中心圆片；场景母源不含动态羊犬、真实托盘、跨栏、拾取物或门线。root已允许作为技术候选导出，未作原型还原签认。

## 实际验证与限制

`python art-source/package_v4.py`退出0，1476项打包检查；`python art-source/copy_runtime_v4.py --replace-unregistered`复制/复核14个新运行文件，无manifest写入；Blender只读6源收据退出0；`python art-source/verify_v4.py`退出0，14842项文件、哈希、rect、旧动作契约、旧道具像素、旧资源字节、规则、母源与预算检查0错误。大量条目是逐帧/逐对rect完整性核查，不能折算为视觉分数或真人通过。

当前游戏纹理基础内存（不含framebuffer）：stack13,250,560 B；runner11,752,960 B；herd41,216,512 B。PNG+atlas JSON传输分别1,388,684 / 1,049,866 / 2,232,804 B，低于既定64MiB/8MiB目标。这是实际文件与解码维度的计算，不是手机内存性能测试。

母源修订/批渲染均使用Blender4.5.9 LTS，Cycles CUDA GTX1060 6GB；角色32样本、环境48样本+denoise。Pillow打包有未来版本getdata弃用提示，当前实际版本命令退出0；未安装新依赖。背景初轮build因逐实例操作器过慢中止，改为共享native mesh实例后完成；未覆盖任何旧源。

最终CSS候选图及`v4-final-scale-envelopes.json`按真实浏览器canvas度量派生，使用stack64/runner56/herd sheep55/dog72。它是资产尺度证据，不是真实运行截图；后续实际三款状态、完整遮挡、手机可辨识、动态时序与现场测试归root集成验收。所有真人、真机及现场未验状态保持原状。

本轮美术不改产品代码、规则/契约、根依赖/锁、Git索引、后台或当前manifest；F09木牌/标题布局由root本轮CSS/真实语义组件处理。完整游戏画面仍需root打开对照后逐项记录候选结论。
