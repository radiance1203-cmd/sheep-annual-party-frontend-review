// GENERATED; DO NOT EDIT. openapi-typescript 7.13.0; source sha256 76e3f54fcae9f308fc764981096cdb5b99e1864de643a725769847e52bbf6a2f
export interface paths {
    "/api/event": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 读取活动与新服务器时刻
         * @description 匿名只读公开活动状态。Cache-Control: no-store；不能缓存旧 server_now。正式活动身份和写操作均从认证会话确定 event。
         */
        get: operations["getEvent"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/rules/{rules_hash}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 按摘要获取不可变规则字节 */
        get: operations["getPublishedRules"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 个人码登录或原 nonce 恢复
         * @description 严格验证 JSON Content-Type 和 Origin；同邀请码+login_nonce 恢复原身份/未撤销会话，不新建额度。新 nonce 不能二领；Secure HttpOnly Cookie。角色来自数据库，不从请求设置。
         */
        post: operations["login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 撤销当前认证会话
         * @description 撤销立即生效，不能继续控制原局；不自动返槽。重复已撤销 token 返回 401，可在 UI 视为已退出。
         */
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 本人身份 三槽 当前局与 CSRF
         * @description 所有者查询；无控制 secret。每次 server_now 新采样。工作人员没有 PARTICIPANT 角色时 tickets=[]。
         */
        get: operations["getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/sessions/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 普通开局或指定原槽补场预约
         * @description 认证/归属/旧摘要查回先行。新普通场仅 PLAYING 且 created_at<challenge_closes_at；带 grant 场可 PLAYING 或 DRAINING，created_at<grant.admission_deadline。都需入口开启/未封榜/无另一未封存局。不能消费 grant 保留槽作为普通场。锁齐成功准入时采样 created_at；+3000ms 开赛、再+45000ms结束、开赛+60000ms截止。
         */
        post: operations["startSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 查询本人的局次当前状态
         * @description 根据当前服务端时间推导状态；即使跨阶段、截止或 VOIDED，授权所有者仍可只读查询。不能恢复未上传的中途输入。
         */
        get: operations["getSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/sessions/{id}/finish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 封存完整过程并受理重放
         * @description 完整受限 body 同步到达时先登记 UNCLASSIFIED，再异步认证/查库；202 必须日志和唯一任务已提交。认证/归属/摘要后先查既有封存；相同返回当前状态，异则 PROCESS_ALREADY_SEALED。首次 play_started_at<=received_at<=submit_deadline；highest_input_tick 与 end_tick 均不超过未来上限。无客户端分数入账。
         */
        post: operations["finishSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/sessions/{id}/abandon": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 原控制端主动放弃
         * @description 首次写核对当前 auth_session/client_instance/epoch/secret。预约中取消同样消耗槽、0分。有已封存或可能有效首次受理时返回该状态，不覆盖它。新写按统一锁序。
         */
        post: operations["abandonSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/leaderboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 有效总积分荣誉榜
         * @description 只含至少一份有效已核验贡献的参与者。总分同分并列 1/2/2/4，UID 只稳定展示；兑换不改荣誉分。
         */
        get: operations["getLeaderboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/gifts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 礼品与可用库存
         * @description 展示价/库存不是预留承诺；下单事务重新检查。
         */
        get: operations["getGifts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/redemptions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 本人订单历史
         * @description 包括 CANCELLED/CLAIMED，便于原单查回。
         */
        get: operations["listMyRedemptions"];
        put?: never;
        /**
         * 扣分并预留一件礼品
         * @description 既有幂等订单先查回。新单仅 REDEEMING 且锁齐时刻<claim_closes_at；资格/余额/库存/一人一件全在事务里。RESERVED+CLAIMED 占限额。
         */
        post: operations["createRedemption"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/redemptions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 本人凭证与当前核销记录
         * @description CLOSED/过截止/冻结后仍可查询。到期 RESERVED 由共享取消事务处理，不继续标记可领取；不能把 GET 直接当核销。
         */
        get: operations["getMyRedemption"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/redemptions/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 本人或主办方取消待领取订单
         * @description 参与者仅本人；主办方同 event 可审计取消。CANCELLED 查回；CLAIMED 返回 ORDER_ALREADY_CLAIMED 且不退款。RESERVED 原价退款与库存恢复同事务；CLOSED 仍可取消。
         */
        post: operations["cancelRedemption"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/event/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 主办方运行与封榜关口
         * @description 区分普通 HTTP 请求与可能改变贡献的入口阻塞；显示待核验/复核/授权/恢复关口。
         */
        get: operations["getAdminStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/event/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * 配置真实活动及领取截止
         * @description 业务摘要先查回，再检查 revision/阶段。领取截止未配不得开兑；开兑后仅审计延长。不能修改正在使用的玩法快照。
         */
        patch: operations["updateEventConfig"];
        trace?: never;
    };
    "/api/admin/event/release": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 绑定已校验的候选发布快照
         * @description 仅 CHECK_IN。服务端验证构建/规则/资源摘要及实际验收记录；规则冻结与榜单冻结不同。此接口不能替代真人或工程测试。
         */
        post: operations["bindRelease"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/event/entry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 暂停或恢复新开入口
         * @description 不改变任何已有局时间或挑战截止；入口开启不绕过阶段。练习入口亦按 CHECK_IN/PLAYING 与该 flag 限制。
         */
        post: operations["setEntrySwitch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/event/challenge-deadline": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * PLAYING 内审计延长普通准入
         * @description 只允许比现有普通截止更晚；已 DRAINING 不可重开。补场 grant 用自己的截止。
         */
        post: operations["extendChallengeDeadline"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/event/phase": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 推进活动阶段并在关口封榜
         * @description 只走 CHECK_IN→PLAYING→DRAINING→REDEEMING→CLOSED。DRAINING→REDEEMING 执行 07 完整屏障；event 排他锁下有潜在入口时立即回滚，不等它归零；最终 COMMIT 前同步重扫。已成功同键先查回当前活动。
         */
        post: operations["changePhase"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/event/recovery/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 审计完成进程事故恢复检查
         * @description 只解除经核实的 recovery_review_required；不能清除尚未确定的入口提交或跳过任务/复核，也不自动打开新入口。
         */
        post: operations["resolveRecoveryIncident"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/participants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 主办方名单及资格状态
         * @description 同 event；外部员工标识仅此受限管理响应。
         */
        get: operations["listParticipants"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/participants/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 导入名单及个人码哈希
         * @description 仅CHECK_IN批量新增；同external_ref不可再领额度。初始工作人员由安全CLI签发；后续ORGANIZER经staff-roles审计配置。邀请码不入日志/公开导出。
         */
        post: operations["importParticipants"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/participants/{id}/recover-identity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 同一人恢复登录并撤销旧控制权
         * @description 身份/三槽/订单保持原对象；旧会话与邀请码撤销，控制 epoch 提升。新码由调用方预先安全持有，服务端仅存哈希。新设备没有完整日志不能接续旧局。
         */
        post: operations["recoverIdentity"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 按人员和状态定位局次
         * @description 管理员只读必要过程摘要与当前状态，不下发控制 secret。
         */
        get: operations["listSessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 读取待复核与处置记录
         * @description 同 event；原槽补偿和更正都需明确对象。
         */
        get: operations["listReviews"];
        put?: never;
        /**
         * 冻结领取资格并开启成绩复核
         * @description 按 event→participant 锁，冻结新兑换和已 RESERVED 凭证。此前核验结果在结论前保留审计；不能直接设分。
         */
        post: operations["openReview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/reviews/{id}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 按真实重放结果解决复核或作废
         * @description 重跑限已封存过程；保留需已有有效服务端结果；作废全额冲正。冻结后更正从 event 排他锁开始并增 rank_revision；资格明确/无未决/余额>=0 才解除领取冻结。
         */
        post: operations["resolveReview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/sessions/{id}/compensate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 系统故障作废并授权原槽重赛
         * @description 仅未封榜 PLAYING/DRAINING。替换同一当前绑定，全额冲正并使旧任务失效，原槽变 RESERVED_FOR_MAKEUP。带 grant 的 start 两阶段可用；同键返回当前原 grant/尝试，不另给机会。
         */
        post: operations["compensateOriginalSlot"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/makeup-grants/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 审计取消未用补场授权
         * @description 取消不赠新槽；已消费授权不可撤回成另一份机会。到期/取消授权不阻塞封榜。
         */
        post: operations["cancelMakeupGrant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/event/emergency-stop": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 关闭入口并处置所选故障原局
         * @description 先持久化入口关闭和明确所选对象的处置任务，再按稳定顺序逐对象处理。每个成功替换给原槽 grant；未完成处置阻塞封榜。状态可恢复，不能调用未等待批处理却宣称全员已补偿。
         */
        post: operations["createEmergencyStop"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/operations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 查询紧急处置任务的当前结果
         * @description 幂等原操作读取；未决对象保留 REVIEW，不静默跳过。
         */
        get: operations["getAdminOperation"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/gifts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 管理礼品价与四类库存
         * @description total=available+reserved+claimed；包括停用礼品。
         */
        get: operations["listAdminGifts"];
        put?: never;
        /**
         * 配置真实礼品
         * @description 与活动关联，操作审计；不能以此直接补偿已领差额。
         */
        post: operations["createGift"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/gifts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * 更新后续报价 库存或停用
         * @description CAS revision+gift 锁；价格/名称只影响新订单，历史快照保留；总量>=reserved+claimed。
         */
        patch: operations["updateGift"];
        trace?: never;
    };
    "/api/admin/redemptions/lookup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 扫码或订单号查询领取必要信息
         * @description 只读 POST 防止凭证进 URL；同 event 身份核验最小字段。不做领取副作用。已领取即使后续截止/冻结也返回原记录。
         */
        post: operations["lookupClaim"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/redemptions/redeem": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 核销已预留礼品
         * @description 认证/权限/归属/旧摘要先查回当前单。CLAIMED/CANCELLED 直接显示原终态，不再按新领取截止检查。仅 RESERVED 才锁齐重查无冻结、REDEEMING/CLOSED、now<claim_closes_at。成功提交后才交实物；丢响应查原单。
         */
        post: operations["redeemOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 主办方导出活动对账 CSV
         * @description 仅同 event ORGANIZER。导出类型限制白名单；不含邀请码、认证 cookie、控制 secret、核销 token。对以 = + - @ 开头的表格文本做安全转义；导出动作审计。 参与/局次/库存使用明确列白名单；匿名试玩仅隔离开发event，稳定匿名编号不连接正式身份，含source_kind/verification_status与完整过程摘要。试玩credited_points列仅核验终态有值，pending/observation为空，observed_points另列；AUTOMATED绝不冒充真人。
         */
        get: operations["exportEventLedger"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/display": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 公开只读活动大屏
         * @description 仅公开活动信息、掩码荣誉榜与人数。不得包含个人ID、邀请码、控制信息、订单或核销凭证。
         */
        get: operations["getPublicDisplay"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 本人所有槽位尝试历史
         * @description 仅本人完整尝试历史，包含被原槽补场替代的VOIDED记录；offset/limit分页，不暴露其他人的控制凭证。
         */
        get: operations["listMySessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/redemptions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 主办方订单列表
         * @description 仅同活动ORGANIZER的订单管理分页查询；核销员使用领取查询接口，不获得全量订单。
         */
        get: operations["listAdminRedemptions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/participants/{id}/staff-roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * 审计配置工作人员授权
         * @description 保留目标原有PARTICIPANT位、身份和三槽。新增工作人员授权仅CHECK_IN；撤销任意阶段可用。禁止自改本人、防撤最后主办方。变更撤销目标所有旧认证/邀请码并提升control_epoch；新角色非空时仅存调用方预存替换码哈希，空角色纯staff停止登录。
         */
        patch: operations["updateStaffRoles"];
        trace?: never;
    };
    "/api/admin/event/operations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 采购预算与数据保留策略 */
        get: operations["getOperationsConfig"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * 配置预算与人工保留复核策略
         * @description 仅明确字段变更，使用event revision CAS/审计；不得变更游戏规则/分值或自动删除现有记录。
         */
        patch: operations["updateOperationsConfig"];
        trace?: never;
    };
    "/api/admin/redemptions/{id}/discrepancy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 查询已领取原单的积分短缺与处置记录
         * @description 仅CLAIMED原单的当前积分短缺=max(0,-真实钱包)，不是人民币债务，也不是全额冲正数额。保留原订单/库存/账本；人工备注不改变任何资金、积分、资格冻结。
         */
        get: operations["getOrderDiscrepancy"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/redemptions/{id}/exception-notes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 追加已领异常人工处置记录
         * @description 仅追加有操作者/时间的人工处置记录；ACKNOWLEDGED表示已记录处置，不表示已追回/补款/清零或解除冻结。
         */
        post: operations["appendOrderDiscrepancyNote"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/playtests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 隔离活动匿名试玩原始记录 */
        get: operations["listPlaytestRuns"];
        put?: never;
        /**
         * 记录独立试玩观察及可选完整核验过程
         * @description 只在隔离is_development活动由主办方记录实际观察；绝不自动造真人样本、不写正式身份/三槽/局/流水。PRACTICE仅trial=1，TEST为1/2/3；同batch/anon的分组与版本保持一致，唯一试次不可覆盖。无完整过程只记OBSERVATION_ONLY/verified_points=null；有过程经与正式局共用有限worker池/同game-core重放，固定seed，不信任observed_points。
         */
        post: operations["createPlaytestRun"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/playtests/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 查询原试玩记录与公共核验证结论 */
        get: operations["getPlaytestRun"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** Format: uuid */
        Uuid: string;
        /**
         * Format: date-time
         * @description UTC，精确毫秒；服务器生成。客户端墙钟无判定权。
         */
        UtcMillis: string;
        Sha256: string;
        /** @description 客户端在首次发送前持久化；一次业务始终复用同键。UUID 的连字符允许。 */
        IdempotencyKey: string;
        /** @description 安全随机 32 字节的无填充 base64url；仅哈希落库，日志脱敏。 */
        Secret: string;
        /** @description 安全随机 32 字节，首次请求前持久化，不以时间戳生成。 */
        ClientNonce: string;
        /** @enum {string} */
        GameId: "stack" | "runner" | "herd";
        /** @enum {string} */
        Phase: "CHECK_IN" | "PLAYING" | "DRAINING" | "REDEEMING" | "CLOSED";
        /** @enum {string} */
        Role: "PARTICIPANT" | "REDEEMER" | "ORGANIZER";
        /** @enum {string} */
        SessionState: "SCHEDULED" | "RUNNING" | "AWAITING_SUBMISSION" | "VERIFYING" | "SETTLED" | "REVIEW" | "ABANDONED" | "TIMED_OUT" | "VOIDED";
        SlotNo: number;
        InputTick: number;
        BuildBinding: {
            /** @constant */
            rule_version: "onsite-v2.1-candidate";
            rules_hash: components["schemas"]["Sha256"];
            simulator_version: string;
            client_version: string;
        };
        BlockerCounts: {
            scheduled: number;
            running: number;
            awaiting_submission: number;
            ingress_pending: number;
            verifying: number;
            review: number;
            unused_makeup_grants: number;
            recovery_review: number;
            pending_compensation: number;
        };
        ErrorDetails: {
            field_errors?: {
                path: string;
                message: string;
            }[];
            blockers?: components["schemas"]["BlockerCounts"];
            current_session_id?: components["schemas"]["Uuid"];
            current_event_revision?: number;
            action_required?: string;
        };
        /** @enum {string} */
        ErrorCode: "BAD_REQUEST" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "RATE_LIMITED" | "IDEMPOTENCY_CONFLICT" | "VALIDATION_FAILED" | "SERVER_BUSY" | "DATABASE_UNAVAILABLE" | "COMMIT_STATUS_UNKNOWN" | "PHASE_NOT_ALLOWED" | "ENTRY_PAUSED" | "ADMISSION_CLOSED" | "ACTIVE_SESSION_EXISTS" | "NO_TICKET_SLOT" | "MAKEUP_INVALID" | "RANK_FROZEN" | "VERSION_MISMATCH" | "RELEASE_NOT_READY" | "IDENTITY_INELIGIBLE" | "STALE_EVENT_REVISION" | "CONTROL_NOT_OWNER" | "CONTROL_REVOKED" | "SESSION_REPLACED" | "SESSION_TERMINAL" | "PROCESS_ALREADY_SEALED" | "BEFORE_PLAY_START" | "SUBMISSION_EXPIRED" | "FUTURE_TICK" | "INVALID_INPUT" | "INVALID_TERMINAL" | "RECEIPT_PENDING" | "SEAL_BLOCKED" | "RECOVERY_REVIEW_REQUIRED" | "INSUFFICIENT_POINTS" | "OUT_OF_STOCK" | "PERSON_LIMIT_REACHED" | "CLAIMS_FROZEN" | "CLAIM_WINDOW_CLOSED" | "ORDER_ALREADY_CLAIMED" | "OPEN_CONFIG_INVALID" | "INVITE_INVALID" | "INVITE_ALREADY_USED" | "REVIEW_ACTION_INVALID";
        ErrorEnvelope: {
            error: {
                code: components["schemas"]["ErrorCode"];
                message: string;
                retryable: boolean;
                details?: components["schemas"]["ErrorDetails"];
            };
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
        };
        /** @description 布尔值供 UI 提示；每个新副作用仍在事务内重查。claim_closes_at 未配置不得开兑。 */
        EventPublic: {
            event_id: components["schemas"]["Uuid"];
            name: string;
            phase: components["schemas"]["Phase"];
            accepting_new_sessions: boolean;
            challenge_closes_at: components["schemas"]["UtcMillis"] | null;
            claim_closes_at: components["schemas"]["UtcMillis"] | null;
            rank_frozen_at: components["schemas"]["UtcMillis"] | null;
            rank_revision: number;
            event_revision: number;
            release: components["schemas"]["ReleaseBinding"] | null;
            practice_allowed: boolean;
            ordinary_start_allowed: boolean;
            recovery_review_required: boolean;
        };
        ReleaseBinding: {
            build: components["schemas"]["BuildBinding"];
            asset_manifest_hash: components["schemas"]["Sha256"];
            asset_base_url: string;
            rules_url: string;
            published_at: components["schemas"]["UtcMillis"];
        };
        ParticipantPublic: {
            participant_id: components["schemas"]["Uuid"];
            display_uid: string;
            display_name: string;
            roles: components["schemas"]["Role"][];
            eligible: boolean;
            claims_frozen: boolean;
            honor_total: number;
            wallet_balance: number;
        };
        /** @description 服务端恰好返回槽 1/2/3；保留槽普通 start 不可消费；旧尝试留在历史。 */
        Ticket: {
            slot_no: components["schemas"]["SlotNo"];
            /** @enum {string} */
            state: "AVAILABLE" | "BOUND" | "RESERVED_FOR_MAKEUP" | "SPENT";
            binding_version: number;
            current_session_id: components["schemas"]["Uuid"] | null;
            current_contribution_points: number;
            makeup_grant: components["schemas"]["MakeupGrant"] | null;
        };
        /** @description V2.2 澄清：未封榜 PLAYING/DRAINING 均可消费；只占原槽，按独立授权截止。 */
        MakeupGrant: {
            makeup_grant_id: components["schemas"]["Uuid"];
            participant_id: components["schemas"]["Uuid"];
            original_slot_no: components["schemas"]["SlotNo"];
            replaced_session_id: components["schemas"]["Uuid"];
            ticket_binding_version: number;
            admission_deadline: components["schemas"]["UtcMillis"];
            /** @enum {string} */
            status: "ACTIVE" | "USED" | "CANCELLED" | "EXPIRED";
            used_session_id: components["schemas"]["Uuid"] | null;
            created_at: components["schemas"]["UtcMillis"];
            reason: string;
        };
        /** @description PARTICIPANT 账号恰好返回槽1/2/3；无参与者角色的工作人员按 StaffMe 返回。控制 secret 不返回。 */
        Me: {
            participant: components["schemas"]["ParticipantPublic"];
            tickets: components["schemas"]["Ticket"][];
            active_session: components["schemas"]["Session"] | null;
            csrf_token: string;
            auth_expires_at: components["schemas"]["UtcMillis"];
        };
        StaffMe: {
            participant: components["schemas"]["ParticipantPublic"];
            tickets: components["schemas"]["Ticket"][];
            active_session: null;
            csrf_token: string;
            auth_expires_at: components["schemas"]["UtcMillis"];
        };
        LoginRequest: {
            event_id: components["schemas"]["Uuid"];
            invite_token: components["schemas"]["Secret"];
            login_nonce: components["schemas"]["ClientNonce"];
        };
        StartRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            game_id: components["schemas"]["GameId"];
            client_instance_id: components["schemas"]["Uuid"];
            controller_secret: components["schemas"]["Secret"];
            build: components["schemas"]["BuildBinding"];
            makeup_grant_id?: components["schemas"]["Uuid"];
        };
        /** @description value 可省略；摘要与模拟前规范化为 null。 */
        DropInput: {
            tick: components["schemas"]["InputTick"];
            seq: number;
            /** @constant */
            type: "DROP";
            value?: null;
        };
        /** @description value 可省略；摘要与模拟前规范化为 null。 */
        JumpInput: {
            tick: components["schemas"]["InputTick"];
            seq: number;
            /** @constant */
            type: "JUMP";
            value?: null;
        };
        /** @description value 可省略；摘要与模拟前规范化为 null。 */
        BarkInput: {
            tick: components["schemas"]["InputTick"];
            seq: number;
            /** @constant */
            type: "BARK";
            value?: null;
        };
        DogMoveInput: {
            tick: components["schemas"]["InputTick"];
            seq: number;
            /** @constant */
            type: "DOG_MOVE";
            value: {
                x: number;
                y: number;
            };
        };
        GameInput: components["schemas"]["DropInput"] | components["schemas"]["JumpInput"] | components["schemas"]["BarkInput"] | components["schemas"]["DogMoveInput"];
        /** @description 仅诊断，不作为成绩或余额依据，不进入过程业务摘要。 */
        ClientSummary: {
            performance_points?: number;
            accepted_actions_count?: number;
            predicted_points?: number;
        };
        /** @description 首次写必须提供当前 controller_secret；已有同摘要查回可省略 secret。服务器校验游戏/type/结束原因对应关系、原始条数、去重后顺序/范围。完整 body 最多 262144 原始 UTF-8 字节。finish 没有新的幂等键，session_id+首次规范过程摘要唯一。 */
        FinishRequest: {
            game_id: components["schemas"]["GameId"];
            build: components["schemas"]["BuildBinding"];
            client_instance_id: components["schemas"]["Uuid"];
            controller_epoch: number;
            ticket_binding_version: number;
            controller_secret?: components["schemas"]["Secret"];
            end_tick: components["schemas"]["InputTick"];
            /** @enum {string} */
            end_reason: "THREE_MISSES" | "GOAL_REACHED" | "TIME_LIMIT";
            inputs: components["schemas"]["GameInput"][];
            client_summary?: components["schemas"]["ClientSummary"];
        };
        /** @description 首次放弃需 secret；原幂等业务查回不恢复写权限。有首次有效受理时返回受理中/已提交，不覆盖为放弃。 */
        AbandonRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            controller_epoch: number;
            client_instance_id: components["schemas"]["Uuid"];
            controller_secret?: components["schemas"]["Secret"];
            /** @enum {string} */
            reason: "USER_RETURN" | "USER_CANCEL";
        };
        StackStats: {
            success_layers: number;
            perfect_layers: number;
            misses: number;
        };
        RunnerStats: {
            safe_passed: number;
            collision_count: number;
            outer_collected: number;
            inner_collected: number;
        };
        HerdStats: {
            penned_count: number;
            final_goal_tick: components["schemas"]["InputTick"] | null;
            time_bonus_points: number;
        };
        StackConclusion: {
            /** @constant */
            game_id: "stack";
            end_tick: components["schemas"]["InputTick"];
            /** @enum {string} */
            end_reason: "THREE_MISSES" | "GOAL_REACHED" | "TIME_LIMIT";
            accepted_actions_count: number;
            stats: components["schemas"]["StackStats"];
            performance_points: number;
        };
        RunnerConclusion: {
            /** @constant */
            game_id: "runner";
            /** @constant */
            end_tick: 1350;
            /** @enum {string} */
            end_reason: "TIME_LIMIT";
            accepted_actions_count: number;
            stats: components["schemas"]["RunnerStats"];
            performance_points: number;
        };
        HerdConclusion: {
            /** @constant */
            game_id: "herd";
            end_tick: components["schemas"]["InputTick"];
            /** @enum {string} */
            end_reason: "GOAL_REACHED" | "TIME_LIMIT";
            accepted_actions_count: number;
            stats: components["schemas"]["HerdStats"];
            performance_points: number;
        };
        NaturalConclusion: components["schemas"]["StackConclusion"] | components["schemas"]["RunnerConclusion"] | components["schemas"]["HerdConclusion"];
        /** @description original_awarded_points 仅历史；当前到账/荣誉读取 current_contribution_points 和当前状态。VOIDED 不播放历史已到账。 */
        Settlement: {
            /** @enum {string} */
            validation: "VERIFIED" | "INVALID_PROCESS";
            /** @enum {string} */
            eligibility_reason: "VERIFIED" | "NO_ACCEPTED_ACTION" | "INVALID_PROCESS" | "VOIDED";
            eligible_currently: boolean;
            original_awarded_points: number;
            current_contribution_points: number;
            settled_at: components["schemas"]["UtcMillis"];
            conclusion: components["schemas"]["NaturalConclusion"] | null;
        };
        /** @description 状态按服务端时间推导；周期任务负责物化。can_attempt_control 只说明当前认证会话匹配，首次写仍要 secret/epoch。GET 不能恢复未上传输入。 */
        Session: {
            session_id: components["schemas"]["Uuid"];
            event_id: components["schemas"]["Uuid"];
            participant_id: components["schemas"]["Uuid"];
            slot_no: components["schemas"]["SlotNo"];
            game_id: components["schemas"]["GameId"];
            seed: number;
            session_nonce: components["schemas"]["ClientNonce"];
            build: components["schemas"]["BuildBinding"];
            controller_epoch: number;
            ticket_binding_version: number;
            client_instance_id: components["schemas"]["Uuid"];
            created_at: components["schemas"]["UtcMillis"];
            play_started_at: components["schemas"]["UtcMillis"];
            play_ends_at: components["schemas"]["UtcMillis"];
            submit_deadline: components["schemas"]["UtcMillis"];
            state: components["schemas"]["SessionState"];
            first_received_at: components["schemas"]["UtcMillis"] | null;
            process_digest: components["schemas"]["Sha256"] | null;
            settlement: components["schemas"]["Settlement"] | null;
            current_contribution_points: number;
            is_current_binding: boolean;
            has_unsealed_receipt: boolean;
            can_attempt_control: boolean;
            terminal_reason: string | null;
        };
        LeaderboardRow: {
            rank: number;
            display_uid: string;
            display_name: string;
            honor_total: number;
        };
        /** @description 窗口排名只 ORDER BY honor_total DESC，外层同分 display_uid。有效榜排除无有效参与成绩者。每页一个数据库快照；实时榜翻页可变化，冻结后 revision 变化需重取。 */
        Leaderboard: {
            rank_revision: number;
            is_frozen: boolean;
            total_entries: number;
            offset: number;
            limit: number;
            rows: components["schemas"]["LeaderboardRow"][];
            me: components["schemas"]["LeaderboardRow"] | null;
        };
        Gift: {
            gift_id: components["schemas"]["Uuid"];
            name: string;
            description: string;
            image_asset_key: string | null;
            price_points: number;
            active: boolean;
            available_count: number;
        };
        /** @description 采购单价仅管理端提供，null明确未配置；不会进入公开Gift响应，不影响积分价或历史订单。 */
        GiftAdmin: {
            gift_id: components["schemas"]["Uuid"];
            name: string;
            description: string;
            image_asset_key: string | null;
            price_points: number;
            active: boolean;
            available_count: number;
            total_count: number;
            reserved_count: number;
            claimed_count: number;
            revision: number;
            purchase_unit_cost_cents: number | null;
        };
        /** @description 仅本人/授权工作人员响应。voucher_token 非登录凭证，只对 RESERVED 本人凭证页提供；员工查询响应该字段为 null。核销仍需工作人员角色。截止使用当前已公布值，只可审计延长。 */
        Redemption: {
            redemption_id: components["schemas"]["Uuid"];
            event_id: components["schemas"]["Uuid"];
            participant_id: components["schemas"]["Uuid"];
            gift_id: components["schemas"]["Uuid"];
            gift_name_snapshot: string;
            price_points_snapshot: number;
            /** @enum {string} */
            status: "RESERVED" | "CLAIMED" | "CANCELLED";
            created_at: components["schemas"]["UtcMillis"];
            claim_closes_at: components["schemas"]["UtcMillis"];
            claims_frozen: boolean;
            claimed_at: components["schemas"]["UtcMillis"] | null;
            claimed_by_display_name: string | null;
            cancelled_at: components["schemas"]["UtcMillis"] | null;
            cancellation_reason: string | null;
            voucher_token: string | null;
        };
        RedemptionCreateRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            gift_id: components["schemas"]["Uuid"];
        };
        CancelRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            reason: string;
        };
        ClaimLookupRequest: {
            redemption_id: components["schemas"]["Uuid"];
        } | {
            voucher_token: components["schemas"]["Secret"];
        };
        ClaimRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            redemption_id: components["schemas"]["Uuid"];
        };
        /** @description 核对必要身份后再核销。ALREADY_CLAIMED 只能查原记录，不能再交实物。 */
        ClaimView: {
            order: components["schemas"]["Redemption"];
            participant_display_name: string;
            participant_display_uid: string;
            /** @enum {string} */
            claim_action: "CAN_CLAIM" | "ALREADY_CLAIMED" | "CANCELLED" | "FROZEN" | "EXPIRED" | "PHASE_BLOCKED";
        };
        AdminReason: string;
        PhaseRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_event_revision: number;
            target_phase: components["schemas"]["Phase"];
            reason: components["schemas"]["AdminReason"];
        };
        EntryRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_event_revision: number;
            accepting_new_sessions: boolean;
            reason: components["schemas"]["AdminReason"];
        };
        /** @description 仅明确提供的字段变更；挑战窗口只在首次 PLAYING 前配置。开兑后领取截止仅可延长，不可取消/缩短。不得借配置修改固定玩法参数。 */
        EventConfigRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_event_revision: number;
            name?: string;
            challenge_window_seconds?: number;
            claim_closes_at?: components["schemas"]["UtcMillis"] | null;
            reason: components["schemas"]["AdminReason"];
        };
        /** @description 仅尚处 PLAYING 时审计延长；进入 DRAINING 后不可借延长重开普通场。 */
        ChallengeDeadlineRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_event_revision: number;
            challenge_closes_at: components["schemas"]["UtcMillis"];
            reason: components["schemas"]["AdminReason"];
        };
        /** @description CHECK_IN 时绑定已由服务端加载/校验的构建、资源与真实验收记录；不能由前端布尔值宣称通过真人/运行验收。旧局版本仍保留。 */
        ReleaseRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_event_revision: number;
            build: components["schemas"]["BuildBinding"];
            asset_manifest_hash: components["schemas"]["Sha256"];
            readiness_record_id: components["schemas"]["Uuid"];
            reason: components["schemas"]["AdminReason"];
        };
        /** @description 核对受影响原局、补传和任务后审计解除恢复阻塞；不回填无法证明的 received_at。 */
        RecoveryResolveRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_event_revision: number;
            incident_id: components["schemas"]["Uuid"];
            resolution_note: components["schemas"]["AdminReason"];
        };
        AdminStatus: {
            event: components["schemas"]["EventPublic"];
            blockers: components["schemas"]["BlockerCounts"];
            reserved_orders: number;
            claimed_orders: number;
            expired_reserved_orders: number;
            worker_pending: number;
            worker_running: number;
            worker_pool_size: number;
            /** @constant */
            api_instance_count: 1;
        };
        /** @description 纯工作人员撤销所有授权可返回roles=[]且无有效认证；PARTICIPANT成员位和三槽不由staff-roles修改。 */
        ParticipantAdmin: {
            participant_id: components["schemas"]["Uuid"];
            display_uid: string;
            display_name: string;
            roles: components["schemas"]["Role"][];
            eligible: boolean;
            claims_frozen: boolean;
            honor_total: number;
            wallet_balance: number;
            external_ref: string;
            control_epoch: number;
            open_review_count: number;
            tickets: components["schemas"]["Ticket"][];
        };
        /** @description 原始随机码在调用方预先生成并安全保存；服务端只落哈希。此接口仅创建 PARTICIPANT，不从 CSV 提升管理员。 */
        RosterEntry: {
            external_ref: string;
            display_name: string;
            invite_token: components["schemas"]["Secret"];
        };
        /** @description CHECK_IN 下严格批量新增；重复 external_ref 不覆盖已有参与者，不重置三槽。整批验证失败不部分导入；既有身份变更单独审核。 */
        RosterImportRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            entries: components["schemas"]["RosterEntry"][];
            reason: components["schemas"]["AdminReason"];
        };
        RosterImportResult: {
            import_id: components["schemas"]["Uuid"];
            created_count: number;
            participant_ids: components["schemas"]["Uuid"][];
        };
        /** @description 调用方首次请求前持久化新随机码，响应不回显。撤销旧邀请码/认证会话，提高控制版本；不新增身份或三槽，不自动恢复旧输入或赠机会。 */
        IdentityRecoveryRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            replacement_invite_token: components["schemas"]["Secret"];
            reason: components["schemas"]["AdminReason"];
        };
        IdentityRecoveryResult: {
            recovery_id: components["schemas"]["Uuid"];
            participant: components["schemas"]["ParticipantAdmin"];
            revoked_auth_session_count: number;
        };
        Review: {
            review_id: components["schemas"]["Uuid"];
            session_id: components["schemas"]["Uuid"];
            participant_id: components["schemas"]["Uuid"];
            /** @enum {string} */
            kind: "INFRASTRUCTURE" | "ELIGIBILITY" | "SYSTEM_FAULT";
            /** @enum {string} */
            state: "OPEN" | "REPLAYING" | "RESOLVED";
            reason: string;
            resolution: ("REPLAY_VERIFIED" | "KEEP_VERIFIED_RESULT" | "INVALIDATED") | null;
            created_at: components["schemas"]["UtcMillis"];
            resolved_at: components["schemas"]["UtcMillis"] | null;
        };
        ReviewCreateRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            session_id: components["schemas"]["Uuid"];
            /** @enum {string} */
            kind: "ELIGIBILITY" | "SYSTEM_FAULT";
            reason: components["schemas"]["AdminReason"];
        };
        /** @description 不接受任意分数。RETRY_REPLAY 仅已封存的基础设施复核；KEEP 需已有有效服务端结果；INVALIDATE 全额冲正。冻结后不产生补场。 */
        ReviewResolveRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            /** @enum {string} */
            action: "RETRY_REPLAY" | "KEEP_VERIFIED_RESULT" | "INVALIDATE";
            reason: components["schemas"]["AdminReason"];
        };
        /** @description 未封榜 PLAYING/DRAINING 的确认系统故障；同事务旧局 VOIDED、全额冲正、绑定提升、原槽保留及单次 grant。有效首次受理未定时先返回 RECEIPT_PENDING。 */
        CompensateRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_ticket_binding_version: number;
            admission_deadline: components["schemas"]["UtcMillis"];
            reason: components["schemas"]["AdminReason"];
        };
        CompensationResult: {
            voided_session: components["schemas"]["Session"];
            grant: components["schemas"]["MakeupGrant"];
            ticket: components["schemas"]["Ticket"];
        };
        /** @description 仅未消费授权；取消后原故障槽标为已处置而非重新普通可用，避免绕过授权或反复返槽。 */
        GrantCancelRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            reason: components["schemas"]["AdminReason"];
        };
        /** @description 先关闭新入口；明确选中受影响且未封存的原局。逐对象持久处置并给原槽授权；已封存不自动批量作废。任务状态可查询，不冒称整批单事务成功。 */
        EmergencyStopRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_event_revision: number;
            session_ids: components["schemas"]["Uuid"][];
            admission_deadline: components["schemas"]["UtcMillis"];
            reason: components["schemas"]["AdminReason"];
        };
        EmergencyOperation: {
            operation_id: components["schemas"]["Uuid"];
            /** @enum {string} */
            state: "PENDING" | "RUNNING" | "DONE" | "REVIEW";
            requested_count: number;
            processed_count: number;
            pending_session_ids: components["schemas"]["Uuid"][];
            failed_session_ids: components["schemas"]["Uuid"][];
            created_at: components["schemas"]["UtcMillis"];
        };
        GiftCreateRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            name: string;
            description: string;
            image_asset_key: string | null;
            price_points: number;
            total_count: number;
            active: boolean;
            reason: components["schemas"]["AdminReason"];
            purchase_unit_cost_cents?: number | null;
        };
        /** @description 新价格只作用新订单；历史价/名称快照不改。库存下调不得低于预留+已领，不能删历史。 */
        GiftUpdateRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_revision: number;
            name?: string;
            description?: string;
            image_asset_key?: string | null;
            price_points?: number;
            total_count?: number;
            active?: boolean;
            reason: components["schemas"]["AdminReason"];
            purchase_unit_cost_cents?: number | null;
        };
        PageParticipant: {
            items: components["schemas"]["ParticipantAdmin"][];
            total: number;
            offset: number;
            limit: number;
        };
        PageSession: {
            items: components["schemas"]["Session"][];
            total: number;
            offset: number;
            limit: number;
        };
        PageReview: {
            items: components["schemas"]["Review"][];
            total: number;
            offset: number;
            limit: number;
        };
        PageOrder: {
            items: components["schemas"]["Redemption"][];
            total: number;
            offset: number;
            limit: number;
        };
        Ok: {
            /** @constant */
            ok: true;
        };
        EventPublicResponse: {
            data: components["schemas"]["EventPublic"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        AdminStatusResponse: {
            data: components["schemas"]["AdminStatus"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        MeResponse: {
            data: components["schemas"]["Me"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        StaffMeResponse: {
            data: components["schemas"]["StaffMe"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        SessionResponse: {
            data: components["schemas"]["Session"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        LeaderboardResponse: {
            data: components["schemas"]["Leaderboard"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        RedemptionResponse: {
            data: components["schemas"]["Redemption"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        ClaimViewResponse: {
            data: components["schemas"]["ClaimView"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        ParticipantAdminResponse: {
            data: components["schemas"]["ParticipantAdmin"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        RosterImportResultResponse: {
            data: components["schemas"]["RosterImportResult"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        IdentityRecoveryResultResponse: {
            data: components["schemas"]["IdentityRecoveryResult"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        ReviewResponse: {
            data: components["schemas"]["Review"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        CompensationResultResponse: {
            data: components["schemas"]["CompensationResult"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        MakeupGrantResponse: {
            data: components["schemas"]["MakeupGrant"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        EmergencyOperationResponse: {
            data: components["schemas"]["EmergencyOperation"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        GiftAdminResponse: {
            data: components["schemas"]["GiftAdmin"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        PageParticipantResponse: {
            data: components["schemas"]["PageParticipant"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        PageSessionResponse: {
            data: components["schemas"]["PageSession"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        PageReviewResponse: {
            data: components["schemas"]["PageReview"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        PageOrderResponse: {
            data: components["schemas"]["PageOrder"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        OkResponse: {
            data: components["schemas"]["Ok"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        IdentityResponse: {
            data: components["schemas"]["Me"] | components["schemas"]["StaffMe"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        GiftListResponse: {
            data: components["schemas"]["Gift"][];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        GiftAdminListResponse: {
            data: components["schemas"]["GiftAdmin"][];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        Display: {
            event: components["schemas"]["EventPublic"];
            leaderboard: components["schemas"]["Leaderboard"];
            participant_count: number;
        };
        DisplayResponse: {
            data: components["schemas"]["Display"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        /** @description 人民币分的非负十进制整数字符串；不得用浮点金额计算。 */
        MoneyCentsString: string;
        /** @description 保留目标原有PARTICIPANT位、身份和三槽。新增工作人员授权仅CHECK_IN；撤销任意阶段可用。禁止自改本人、防撤最后主办方。变更撤销目标所有旧认证/邀请码并提升control_epoch；新角色非空时仅存调用方预存替换码哈希，空角色纯staff停止登录。 */
        StaffRolesRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_control_epoch: number;
            staff_roles: ("ORGANIZER" | "REDEEMER")[];
            replacement_invite_token: components["schemas"]["Secret"];
            reason: components["schemas"]["AdminReason"];
        };
        StaffRolesResult: {
            participant: components["schemas"]["ParticipantAdmin"];
            revoked_auth_session_count: number;
            replacement_invite_issued: boolean;
        };
        StaffRolesResultResponse: {
            data: components["schemas"]["StaffRolesResult"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        /** @description 人工复核与处置策略，只保存期限/责任人/范围与到期提醒，不自动删除账本、审计、业务或试玩原始数据。 */
        RetentionPolicy: {
            review_after_days: number;
            review_due_at: components["schemas"]["UtcMillis"];
            responsible_person: string;
            scope: ("IDENTITY" | "GAME_LOGS" | "ORDERS_LEDGER" | "AUDIT" | "PLAYTESTS")[];
            notes: string;
            /** @constant */
            automatic_deletion: false;
        };
        /** @description 按全部礼品（含停用）Σ库存总量×当前采购单价估算，不代表已采购/已付款。null成本不当免费；已知部分超过上限可报true，不完整且尚未超过为null。物流包装另列。不混入积分账本。 */
        ProcurementSummary: {
            priced_stock_cost_cents: components["schemas"]["MoneyCentsString"];
            extra_cost_cents: components["schemas"]["MoneyCentsString"];
            known_total_cost_cents: components["schemas"]["MoneyCentsString"];
            reserved_stock_cost_cents: components["schemas"]["MoneyCentsString"];
            claimed_stock_cost_cents: components["schemas"]["MoneyCentsString"];
            budget_limit_cents: components["schemas"]["MoneyCentsString"] | null;
            unpriced_gift_count: number;
            unpriced_stock_count: number;
            is_complete: boolean;
            exceeds_budget: boolean | null;
        };
        OperationsConfig: {
            event_id: components["schemas"]["Uuid"];
            event_revision: number;
            procurement: components["schemas"]["ProcurementSummary"];
            retention_policy: components["schemas"]["RetentionPolicy"] | null;
            retention_review_due: boolean;
        };
        OperationsConfigResponse: {
            data: components["schemas"]["OperationsConfig"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        /** @description 仅明确字段变更，使用event revision CAS/审计；不得变更游戏规则/分值或自动删除现有记录。 */
        OperationsConfigRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            expected_event_revision: number;
            procurement_budget_cents?: components["schemas"]["MoneyCentsString"] | null;
            procurement_extra_cost_cents?: components["schemas"]["MoneyCentsString"];
            retention_policy?: components["schemas"]["RetentionPolicy"] | null;
            reason: components["schemas"]["AdminReason"];
        };
        DiscrepancyNote: {
            note_id: components["schemas"]["Uuid"];
            /** @enum {string} */
            state: "OPEN" | "ACKNOWLEDGED";
            note: string;
            created_by_display_name: string;
            created_at: components["schemas"]["UtcMillis"];
        };
        /** @description 仅CLAIMED原单的当前积分短缺=max(0,-真实钱包)，不是人民币债务，也不是全额冲正数额。保留原订单/库存/账本；人工备注不改变任何资金、积分、资格冻结。 */
        OrderDiscrepancy: {
            redemption_id: components["schemas"]["Uuid"];
            participant_id: components["schemas"]["Uuid"];
            original_price_points: number;
            honor_total: number;
            wallet_balance: number;
            shortfall_points: number;
            eligible: boolean;
            claims_frozen: boolean;
            open_review_ids: components["schemas"]["Uuid"][];
            reversed_session_ids: components["schemas"]["Uuid"][];
            notes: components["schemas"]["DiscrepancyNote"][];
        };
        OrderDiscrepancyResponse: {
            data: components["schemas"]["OrderDiscrepancy"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        /** @description 仅追加有操作者/时间的人工处置记录；ACKNOWLEDGED表示已记录处置，不表示已追回/补款/清零或解除冻结。 */
        DiscrepancyNoteRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            /** @enum {string} */
            state: "OPEN" | "ACKNOWLEDGED";
            note: string;
            reason: components["schemas"]["AdminReason"];
        };
        PlaytestProcess: {
            end_tick: components["schemas"]["InputTick"];
            /** @enum {string} */
            end_reason: "THREE_MISSES" | "GOAL_REACHED" | "TIME_LIMIT";
            inputs: components["schemas"]["GameInput"][];
        };
        /** @description 只在隔离is_development活动由主办方记录实际观察；绝不自动造真人样本、不写正式身份/三槽/局/流水。PRACTICE仅trial=1，TEST为1/2/3；同batch/anon的分组与版本保持一致，唯一试次不可覆盖。无完整过程只记OBSERVATION_ONLY/verified_points=null；有过程经与正式局共用有限worker池/同game-core重放，固定seed，不信任observed_points。 必须记录实际started_at/ended_at、入口/浏览器/网络和真实观察，不能用导入created_at或结束时刻反推开始。seed必须匹配冻结规则。无过程且确有已开始试次的放弃/超时/技术失败可明确final_zero_reason，必须observed_points=0、invalid_reason非空，作为有审计的FINAL_ZERO/OPERATOR_FINAL_ZERO保留主分母；不能冒充自然终局core验证，不能任意填正分。有process时final_zero_reason必须null。 */
        PlaytestRunCreateRequest: {
            idempotency_key: components["schemas"]["IdempotencyKey"];
            batch_id: string;
            anon_id: string;
            /** @enum {string} */
            skill_group: "novice" | "intermediate" | "experienced";
            /** @enum {string} */
            game_order: "stack-runner-herd" | "stack-herd-runner" | "runner-stack-herd" | "runner-herd-stack" | "herd-stack-runner" | "herd-runner-stack";
            game_id: components["schemas"]["GameId"];
            /** @enum {string} */
            run_kind: "PRACTICE" | "TEST";
            trial: number;
            /** @enum {string} */
            source_kind: "HUMAN_OBSERVED" | "AUTOMATED";
            device_id: string;
            network_label: string;
            build: components["schemas"]["BuildBinding"];
            ended_at: components["schemas"]["UtcMillis"];
            help_count: number;
            tutorial_replays: number;
            observed_points: number | null;
            invalid_reason: string | null;
            observations: string;
            process: components["schemas"]["PlaytestProcess"] | null;
            reason: components["schemas"]["AdminReason"];
            started_at: components["schemas"]["UtcMillis"];
            entry_label: string;
            browser_label: string;
            seed: number;
            interruption_reason: string | null;
            final_zero_reason: ("ABANDONED" | "TIMED_OUT" | "TECHNICAL_FAILURE") | null;
        };
        /** @description 试玩独立分数，不入正式余额/榜单；待核验分数null，非法过程核实后才0。AUTOMATED必须保留标签，不得混作真人。 规则核直接输出结论分拆/有效操作/各羊入圈tick，纯观察时核验字段null。FINAL_ZERO只表示主办方记录已开始试次的明确零分结案，score_source为OPERATOR_FINAL_ZERO，不是CORE_REPLAY。 */
        PlaytestRun: {
            record_id: components["schemas"]["Uuid"];
            batch_id: string;
            anon_id: string;
            /** @enum {string} */
            skill_group: "novice" | "intermediate" | "experienced";
            /** @enum {string} */
            game_order: "stack-runner-herd" | "stack-herd-runner" | "runner-stack-herd" | "runner-herd-stack" | "herd-stack-runner" | "herd-runner-stack";
            game_id: components["schemas"]["GameId"];
            /** @enum {string} */
            run_kind: "PRACTICE" | "TEST";
            trial: number;
            /** @enum {string} */
            source_kind: "HUMAN_OBSERVED" | "AUTOMATED";
            device_id: string;
            network_label: string;
            build: components["schemas"]["BuildBinding"];
            ended_at: components["schemas"]["UtcMillis"];
            help_count: number;
            tutorial_replays: number;
            observed_points: number | null;
            invalid_reason: string | null;
            observations: string;
            /** @enum {string} */
            verification_status: "OBSERVATION_ONLY" | "PENDING" | "VERIFYING" | "VERIFIED" | "INVALID" | "REVIEW" | "FINAL_ZERO";
            verified_points: number | null;
            process_digest: string | null;
            stats: {
                [key: string]: unknown;
            } | null;
            kernel_failure_reason: string | null;
            created_at: components["schemas"]["UtcMillis"];
            started_at: components["schemas"]["UtcMillis"];
            entry_label: string;
            browser_label: string;
            seed: number;
            interruption_reason: string | null;
            final_zero_reason: ("ABANDONED" | "TIMED_OUT" | "TECHNICAL_FAILURE") | null;
            game_position: number;
            declared_end_tick: components["schemas"]["InputTick"] | null;
            declared_end_reason: ("THREE_MISSES" | "GOAL_REACHED" | "TIME_LIMIT") | null;
            end_tick: components["schemas"]["InputTick"] | null;
            end_reason: ("THREE_MISSES" | "GOAL_REACHED" | "TIME_LIMIT") | null;
            accepted_actions_count: number | null;
            performance_points: number | null;
            participation_points: number | null;
            score_source: ("CORE_REPLAY" | "OPERATOR_FINAL_ZERO") | null;
            sheep_entry_ticks: {
                sheep_id: number;
                tick: components["schemas"]["InputTick"];
            }[] | null;
        };
        PlaytestRunResponse: {
            data: components["schemas"]["PlaytestRun"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
        PagePlaytest: {
            total: number;
            offset: number;
            limit: number;
            items: components["schemas"]["PlaytestRun"][];
        };
        PagePlaytestResponse: {
            data: components["schemas"]["PagePlaytest"];
            server_now: components["schemas"]["UtcMillis"];
            request_id: string;
            idempotent_replay?: boolean;
        };
    };
    responses: {
        /** @description 输入/schema/业务参数非法；没有产生新副作用。 */
        Error400: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description 会话缺失、过期或已撤销。 */
        Error401: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description 角色/对象归属/来源/控制权不足。 */
        Error403: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description 不存在或不向当前账号披露该对象。 */
        Error404: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description 幂等摘要、阶段、绑定、资源或并发状态冲突；详见 error.code。 */
        Error409: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description 原始请求体超过限制，不能泄漏入口阻塞登记。 */
        Error413: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description 输入过程或业务前提不满足。 */
        Error422: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description 请求受限；Retry-After 指示退避，不应重造业务键。 */
        Error429: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description 基础设施暂不可用或提交状态未明；按原键查回/重试。 */
        Error503: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
    };
    parameters: {
        /** @description 公开活动入口的事件标识；不作为鉴权。 */
        EventId: components["schemas"]["Uuid"];
        Id: components["schemas"]["Uuid"];
        RulesHash: components["schemas"]["Sha256"];
        /** @description 默认 0。 */
        Offset: number;
        /** @description 默认 100。 */
        Limit: number;
        ParticipantFilter: components["schemas"]["Uuid"];
        SessionStateFilter: components["schemas"]["SessionState"];
        /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
        CSRF: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getEvent: {
        parameters: {
            query: {
                /** @description 公开活动入口的事件标识；不作为鉴权。 */
                event_id: components["parameters"]["EventId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventPublicResponse"];
                };
            };
            400: components["responses"]["Error400"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getPublishedRules: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                rules_hash: components["parameters"]["RulesHash"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 已发布的唯一规范规则 JSON 字节，SHA-256 必须等于路径。允许 public immutable 缓存；该资源不含 server_now。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": Record<string, never>;
                };
            };
            404: components["responses"]["Error404"];
        };
    };
    login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    /** @description __Host-sheep_session=<opaque>; Path=/; Secure; HttpOnly; SameSite=Lax。仅 localhost 显式 dev 可用不同名称非 Secure cookie。 */
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IdentityResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    logout: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OkResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IdentityResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    startSession: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StartRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionResponse"];
                };
            };
            /** @description 首次业务已创建。 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    finishSession: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FinishRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionResponse"];
                };
            };
            /** @description 已持久受理，最终结果待核验。 */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    abandonSession: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AbandonRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getLeaderboard: {
        parameters: {
            query?: {
                /** @description 默认 0。 */
                offset?: components["parameters"]["Offset"];
                /** @description 默认 100。 */
                limit?: components["parameters"]["Limit"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LeaderboardResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getGifts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GiftListResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    listMyRedemptions: {
        parameters: {
            query?: {
                /** @description 默认 0。 */
                offset?: components["parameters"]["Offset"];
                /** @description 默认 100。 */
                limit?: components["parameters"]["Limit"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageOrderResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    createRedemption: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RedemptionCreateRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RedemptionResponse"];
                };
            };
            /** @description 首次业务已创建。 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RedemptionResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getMyRedemption: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RedemptionResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    cancelRedemption: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CancelRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RedemptionResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getAdminStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminStatusResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    updateEventConfig: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EventConfigRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventPublicResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    bindRelease: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReleaseRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventPublicResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    setEntrySwitch: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EntryRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventPublicResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    extendChallengeDeadline: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChallengeDeadlineRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventPublicResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    changePhase: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PhaseRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventPublicResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    resolveRecoveryIncident: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecoveryResolveRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EventPublicResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    listParticipants: {
        parameters: {
            query?: {
                /** @description 默认 0。 */
                offset?: components["parameters"]["Offset"];
                /** @description 默认 100。 */
                limit?: components["parameters"]["Limit"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageParticipantResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    importParticipants: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RosterImportRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RosterImportResultResponse"];
                };
            };
            /** @description 首次业务已创建。 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RosterImportResultResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    recoverIdentity: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IdentityRecoveryRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IdentityRecoveryResultResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    listSessions: {
        parameters: {
            query?: {
                /** @description 默认 0。 */
                offset?: components["parameters"]["Offset"];
                /** @description 默认 100。 */
                limit?: components["parameters"]["Limit"];
                participant_id?: components["parameters"]["ParticipantFilter"];
                state?: components["parameters"]["SessionStateFilter"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageSessionResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    listReviews: {
        parameters: {
            query?: {
                /** @description 默认 0。 */
                offset?: components["parameters"]["Offset"];
                /** @description 默认 100。 */
                limit?: components["parameters"]["Limit"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageReviewResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    openReview: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReviewCreateRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReviewResponse"];
                };
            };
            /** @description 首次业务已创建。 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReviewResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    resolveReview: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReviewResolveRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReviewResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    compensateOriginalSlot: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompensateRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompensationResultResponse"];
                };
            };
            /** @description 首次业务已创建。 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompensationResultResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    cancelMakeupGrant: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GrantCancelRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MakeupGrantResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    createEmergencyStop: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmergencyStopRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmergencyOperationResponse"];
                };
            };
            /** @description 已持久受理，最终结果待核验。 */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmergencyOperationResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getAdminOperation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EmergencyOperationResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    listAdminGifts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GiftAdminListResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    createGift: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GiftCreateRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GiftAdminResponse"];
                };
            };
            /** @description 首次业务已创建。 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GiftAdminResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    updateGift: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GiftUpdateRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GiftAdminResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    lookupClaim: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClaimLookupRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClaimViewResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    redeemOrder: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClaimRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClaimViewResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    exportEventLedger: {
        parameters: {
            query: {
                kind: "scores" | "ledger" | "redemptions" | "audit" | "participants" | "sessions" | "inventory" | "playtests";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description UTF-8 CSV；记录导出快照/修订号。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/csv": string;
                };
            };
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            503: components["responses"]["Error503"];
        };
    };
    getPublicDisplay: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 公开脱敏大屏数据 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisplayResponse"];
                };
            };
        };
    };
    listMySessions: {
        parameters: {
            query?: {
                /** @description 默认 0。 */
                offset?: components["parameters"]["Offset"];
                /** @description 默认 100。 */
                limit?: components["parameters"]["Limit"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageSessionResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    listAdminRedemptions: {
        parameters: {
            query?: {
                /** @description 默认 0。 */
                offset?: components["parameters"]["Offset"];
                /** @description 默认 100。 */
                limit?: components["parameters"]["Limit"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PageOrderResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    updateStaffRoles: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffRolesRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffRolesResultResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getOperationsConfig: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationsConfigResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    updateOperationsConfig: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OperationsConfigRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationsConfigResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getOrderDiscrepancy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderDiscrepancyResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    appendOrderDiscrepancyNote: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DiscrepancyNoteRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderDiscrepancyResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    listPlaytestRuns: {
        parameters: {
            query?: {
                batch_id?: string;
                offset?: number;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagePlaytestResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    createPlaytestRun: {
        parameters: {
            query?: never;
            header: {
                /** @description GET /me 或 login 返回；同时验证允许 Origin。 */
                "X-CSRF-Token": components["parameters"]["CSRF"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PlaytestRunCreateRequest"];
            };
        };
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlaytestRunResponse"];
                };
            };
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlaytestRunResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
    getPlaytestRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 当前对象状态；幂等查回不重做副作用。 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PlaytestRunResponse"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            409: components["responses"]["Error409"];
            413: components["responses"]["Error413"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            503: components["responses"]["Error503"];
        };
    };
}
