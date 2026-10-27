"""Build exact editable business-flow wireframes, not a running application."""
from pathlib import Path
from html import escape

OUT = Path(__file__).resolve().parent
BG = '#F3F1EA'
CREAM = '#FFF8E9'
INK = '#493B2D'
MUTED = '#766B5B'
LINE = '#DBD3C4'
RED = '#B83F2C'
GREEN = '#587C46'

def rect(x,y,w,h,fill=CREAM,r=16,stroke=None):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}"' if stroke else '')+'/>'

def text(x,y,s,size=17,fill=INK,weight=400,anchor='start'):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{anchor}">{escape(str(s))}</text>'

def line(x1,y1,x2,y2):
    return f'<path d="M{x1} {y1}H{x2}" stroke="{LINE}"/>' if y1==y2 else f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{LINE}"/>'

def button(x,y,w,label,fill=RED):
    return rect(x,y,w,52,fill,20)+text(x+w/2,y+33,label,18,'#FFFFFF',700,'middle')

def page(title,body,subtitle):
    return rect(0,0,390,844,'#F8F6F0',26,'#BDB4A4')+text(24,36,'9:41',14,INK,700)+text(366,36,'●  ▰',14,INK,400,'end')+text(22,82,'‹',30)+text(195,80,title,21,INK,700,'middle')+text(195,111,subtitle,13,MUTED,400,'middle')+body+line(18,778,372,778)+text(70,813,'游园会',15)+text(174,813,'荣誉榜',15)+text(282,813,'我的礼品',15)

def result():
    b=rect(20,137,350,200)+text(195,173,'已核验到账',17,GREEN,700,'middle')+text(195,239,'44',58,RED,700,'middle')+text(195,266,'本次获得积分',16,MUTED,400,'middle')+line(42,283,348,283)+text(48,315,'参与 20',18)+text(240,315,'表现 24',18)
    b+=rect(20,354,350,142)+text(42,389,'羊羊叠高高',20,INK,700)+text(42,421,'叠稳 8 层 · 其中完美 4 层',17)+text(42,456,'普通成功 +2，完美额外 +2',16,MUTED)
    b+=rect(20,513,350,102)+text(42,547,'荣誉累计',16)+text(225,547,'可用积分',16)+text(42,590,'178',30,INK,700)+text(225,590,'178',30,INK,700)
    b+=text(195,645,'整场 3 次机会已用完',17,MUTED,400,'middle')+button(20,665,350,'查看荣誉榜')+text(195,749,'兑奖开放后，可使用积分选择礼品',15,MUTED,400,'middle')
    return page('本局结算',b,'自然完成后核验确认，积分只到账一次')

def gifts():
    b=rect(20,137,350,113)+text(42,175,'兑换已开放',19,GREEN,700)+text(42,210,'可用积分 178',25,INK,700)+text(347,210,'限领 1 件',16,MUTED,400,'end')+text(42,237,'示例领取截止 21:30',14,MUTED)
    for idx,(name,price,stock,label,fill) in enumerate([('示例礼品 A',60,10,'可兑换',GREEN),('示例礼品 B',120,8,'可兑换',GREEN),('示例礼品 C',180,5,'积分不足','#8A8275')]):
        y=268+idx*138
        b+=rect(20,y,350,124)+rect(34,y+16,82,88,'#E8E4D7',12)
        b+=rect(55,y+44,40,34,'#D8AC4B',4)+rect(72,y+36,7,47,'#C87648',2)
        b+=text(132,y+35,name,19,INK,700)+text(132,y+66,f'{price} 积分',21,RED,700)+text(132,y+97,f'可用 {stock} 件',15,MUTED)
        b+=rect(270,y+64,86,48,fill,12)+text(313,y+95,label,14,'#FFFFFF',700,'middle')
    b+=text(195,713,'下单成功即扣分并预留库存',16,MUTED,400,'middle')+text(195,743,'领取时向工作人员出示凭证',16,MUTED,400,'middle')
    return page('兑换年会礼品',b,'消费积分不影响荣誉榜累计')

def claim():
    b=rect(20,137,350,125)+text(195,175,'待领取',23,GREEN,700,'middle')+text(195,208,'示例礼品 B · 已预留 1 件',18,INK,700,'middle')+text(195,240,'已使用 120 积分',16,MUTED,400,'middle')
    b+=rect(20,280,350,274)+rect(100,302,190,180,'#E8E4D7',12,'#C8BEAA')+text(195,376,'核销二维码区域',16,MUTED,400,'middle')+text(195,405,'线框示意不可核销',13,MUTED,400,'middle')+text(195,517,'示例领取截止 21:30',18,INK,700,'middle')
    b+=text(195,588,'请等工作人员确认核销成功后领取',16,INK,700,'middle')+text(195,620,'荣誉累计 178 · 可用积分 58',16,MUTED,400,'middle')
    b+=rect(20,649,350,52,CREAM,20,'#B9AD98')+text(195,682,'取消预留并退回 120 积分',17,INK,700,'middle')+text(195,738,'已领取后不可自行取消',15,MUTED,400,'middle')
    return page('我的领取凭证',b,'已预留；此刻尚未交付实物')

def write(name,w,h,body):
    s=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="Noto Sans CJK SC,Microsoft YaHei,sans-serif">'+body+'</svg>'
    (OUT/(name+'.svg')).write_text(s,encoding='utf-8')

def mobile():
    b=rect(0,0,1270,950,BG,0)+text(30,40,'共用业务页面线框',25,INK,700)+text(30,68,'结算 → 兑换 → 领取凭证。商品、数量与时间仅为布局演示。',16,MUTED)
    for x,fn in zip([30,440,850],[result,gifts,claim]):
        b+=f'<g transform="translate({x},88)">'+fn()+'</g>'
    write('shared_business_flow',1270,950,b)
    for name,fn in [('result',result),('gifts',gifts),('claim',claim)]: write(name,390,844,fn())

def admin():
    b=rect(0,0,1440,950,BG,0)+rect(0,0,220,950,INK,0)
    b+=text(26,56,'羊年游园会',24,CREAM,700)+text(26,88,'主办方控制台',15,'#D8CFBC')
    for i,label in enumerate(['活动概览','名单与身份','阶段与配置','复核与原槽补场','礼品库存','订单与审计','数据导出']):
        y=150+i*62
        if i==0:b+=rect(12,y-31,196,48,'#74634D',12)
        b+=text(28,y,label,18,CREAM)
    b+=text(26,908,'仅限授权工作人员',14,'#D8CFBC')
    b+=text(254,55,'活动概览',28,INK,700)+text(254,88,'状态线框示意；不代表实际活动已配置或通过验收。',16,MUTED)
    b+=rect(254,112,1154,122)+text(279,149,'当前阶段  DRAINING  收尾核验',24,INK,700)+text(279,184,'普通挑战入口已关闭；原在途局按原截止完成',17,MUTED)+text(279,212,'新开局开关：开启   ·   仅允许有效原槽授权按自身截止补场',16,MUTED)
    b+=button(1112,146,272,'封榜条件未齐','#8A8275')
    labels=['预约 / 运行 / 待上传','入口受理中','待核分任务','待人工复核','有效未用补场','恢复审查未完成']
    for i,label in enumerate(labels):
        x=254+(i%3)*390;y=254+(i//3)*110
        b+=rect(x,y,374,94)+text(x+22,y+31,label,17)+text(x+22,y+75,'0',32,GREEN,700)
    b+=text(254,493,'封榜条件',22,INK,700)
    b+=rect(254,510,720,230)
    for i,label in enumerate(['全部局次、完整提交、核分与复核已经明确','有效未用补场已用完、到期或审计取消','领取截止已配置，并且晚于当前服务端时间','发布版本与恢复检查通过；库存与价格已核对']):
        b+=text(277,548+i*49,'□  '+label,17)
    b+=rect(994,510,414,230)+text(1017,547,'原槽补场',21,INK,700)+text(1017,582,'仅向确认系统故障的指定人员授权',16,MUTED)+text(1017,614,'PLAYING / DRAINING 均可使用',16,MUTED)+text(1017,646,'旧局作废并冲正，不增加第四槽',16,MUTED)+text(1017,678,'普通开局不能使用授权保留槽',16,MUTED)+text(1017,710,'封榜后禁止新增和使用补场',16,RED,700)
    b+=text(254,785,'工作人员操作提示',22,INK,700)+rect(254,806,1154,94)
    b+=text(279,842,'封榜遇仍可能有效的入口受理时立即提示阻断；处理完成后再次尝试。',18)
    b+=text(279,878,'核销成功后才交实物；重复扫描先查看原领取记录。',18)
    write('organizer_console',1440,950,b)

if __name__=='__main__':
    mobile();admin()
    print('Created five editable SVG wireframes; raster previews use a separate renderer.')
