共用业务界面线框

shared_business_flow.svg/png：结算、礼品、待领取凭证的连续流程。
result.svg/png、gifts.svg/png、claim.svg/png：三张可分别查看的手机界面。
organizer_console.svg/png：主办方控制台及封榜关口。
build_wireframes.py：可编辑源的生成器，无应用依赖。

这些是精确文字/数字的布局补充，不是已运行页面，也不是最终美术稿。角色与场景质感以design/prototypes和character_foundation_board为准。示例商品、库存、截止均不构成实际配置。

示例分数路径：本局叠塔8层4完美，表现24，加参与20得44；另外两局合计134，累计178。尚未兑换时余额178；预留120分礼品B后余额58，荣誉仍178。凭证示意不可扫描核销。

状态实现须覆盖docs/PRD.md全表，特别核验中、无资格、售罄、冻结、取消、已领取、截止和CLOSED旧单领取；不能只做这些正常示意状态。
