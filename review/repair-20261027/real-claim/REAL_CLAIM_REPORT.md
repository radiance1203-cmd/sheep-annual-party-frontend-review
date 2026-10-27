# F16 隔离真实 HTTP / PostgreSQL / 前端领取验证

执行命令：

```powershell
node --env-file-if-exists=.env.local --import tsx output/repair-20261027/real-claim/real-claim.mts
```

实际退出0，15项检查通过。活动 `761aeb2a-49b8-4503-8fe2-ff4e77c6e594` 的 `result.json` 是本次证据；同目录仅保存参与者/工作人员已核销终态截图，已实际开图核对，无活领取码或QR。

隔离条件均已实际核对：TEST_DATABASE_URL是127.0.0.1的sheep_test，运行时current_database同名；新randomUUID活动由seedDevelopment创建，账号均为开发虚构名称；fresh auth/voucher keyring仅内存；临时HTTP监听127.0.0.1:49854（请求port0）；没有调用3100、原开发活动、默认邀请码或公开服务器。未改产品、core、规则或依赖。测试新活动数据保留供审计，无清空/reset。

实际链路：真实HTTP登录 → 主办API转PLAYING → runner start201（3秒预约/45秒时限）→ 服务时钟显式偏移+48000ms → tick1一次有效JUMP的完整1350tick日志finish202 → 真实JobRunner/ReplayPool调用共享core核验，SETTLED且参与分20、accepted_actions=1 → 主办API配置领取截止、DRAINING、完整封榜至REDEEMING → 真实参与者前端礼品兑换201、订单RESERVED并生成QR → QR字节仅在内存转交工作人员前端文件上传 → 实际jsQR解码，真实lookup200 → 确认前数据库仍RESERVED，且无redeem请求 → 工作人员点击“确认本人”后真实claim200 → 重放UI原持久幂等键的claim再次200。

数据库终态：订单1、CLAIMED1、REDEMPTION_DEBIT唯一1笔/−20、SESSION_CREDIT唯一1笔/+20、退款0、gift_claimed=1、gift_reserved=0。参与者终态接口voucher_token=null，页面无voucher容器。扫描与查询没有隐式核销；实际核销只发生于明确二次确认。

浏览器API桥只使用route.fetch获取隔离真实服务器响应，再将原response转交浏览器；不构造业务JSON/status，不注入分数或余额。API状态/路径记录均无body。邀请码、cookie、controller secret、CSRF、voucher_token、QR图字节只留内存，不写JSON、日志、trace或截图。服务日志为silent；最后实际关闭浏览器、临时HTTP、连接池和重放worker。

边界：服务时钟受控前移，不是实际等待48秒；正式日志由真实共享规则重放得分，未直接插入成绩。扫码采用真实QR图片上传/解码，不是物理手机摄像头；未证明相机权限、手机镜头识别、现场网络、真人难度、实物交付或并发压力。该结果可以关闭本条隔离主工程联通验收，不能代替这些现场门槛。此次使用冻结的旧资源清单SHA `bdf93f4c26c9ed6e108f5af5a718edd7997a86936da85404485a68e1eeb8d234`；随后v4集成按总控影响范围继续验证。
