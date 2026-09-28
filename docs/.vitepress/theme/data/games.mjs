// 知名游戏库 · 结构化数据
// 约定：
// - era 由 firstYear 推导（十位年代），筛选维度之一
// - tech 七项后端技术栏：server 服务器架构 / sync 同步模型 / matchmaking 匹配服务 /
//   transport 实时通信 / storage 数据存储与存档 / antiCheat 反作弊·服务端校验 / social UGC·排行榜·社交
//   没有公开资料的字段写「未公开」，不硬编；纯单机游戏如实写「不适用」
// - tags 只能用 TAG_LINKS 里登记的受控标签（数据契约测试校验）

// 玩法归类体系：定义 + 该类目的入库代表作
export const GENRES = [
  { name: 'FPS/TPS', desc: '第一/第三人称射击：以实时命中判定与低延迟同步为核心。', entries: ['Quake', '反恐精英', '守望先锋'] },
  { name: 'MOBA', desc: '多人在线竞技：小队对抗 + 局内成长 + 强服务端裁决。', entries: ['英雄联盟', 'Dota 2', '王者荣耀'] },
  { name: 'RTS', desc: '即时战略：大量单位并发操控与确定性模拟。', entries: ['星际争霸'] },
  { name: 'MMORPG', desc: '大型多人在线角色扮演：持久世界 + 社会系统 + 长线运营。', entries: ['MUD1', '魔兽世界', '最终幻想 XIV', '剑网 3'] },
  { name: 'ARPG', desc: '动作角色扮演：实时战斗 + 装备成长 + 掉落经济。', entries: ['暗黑破坏神 III', '原神', '艾尔登法环'] },
  { name: '开放世界', desc: '大地图无缝探索与非线性目标，常与在线服务结合。', entries: ['GTA Online', '原神', '艾尔登法环'] },
  { name: 'Roguelike', desc: '程序生成 + 永久死亡 + 局内成长，多为单机形态。', entries: ['哈迪斯'] },
  { name: '沙盒', desc: '给工具不给目标：玩家自造玩法与内容生态。', entries: ['我的世界', 'Roblox'] },
  { name: '派对/休闲', desc: '低门槛多人聚会玩法，短局高频重开。', entries: ['糖豆人'] },
  { name: '叙事', desc: '以故事与情感体验为核心，常含社交叙事。', entries: ['光·遇'] },
  { name: '竞速', desc: '载具竞速与对抗，讲究延迟补偿与排位积分。', entries: ['马里奥赛车 8 豪华版', 'QQ 飞车'] },
  { name: '体育', desc: '现实体育拟真对抗，长线卡牌化运营（UT 模式）。', entries: ['EA Sports FC（FIFA）'] },
  { name: '卡牌构筑', desc: '卡组构建 + 对局策略，回合制适合全服务端权威。', entries: ['炉石传说'] },
  { name: '生存建造', desc: '资源采集 + 建造 + 生存压力，多见持久世界服务器。', entries: ['饥荒：联机版', '我的世界'] }
]

// 受控技术标签 → 站内互链（索引入口：标签即知识点）
export const TAG_LINKS = {
  帧同步: '/24-game-types-architecture/04-network',
  状态同步: '/24-game-types-architecture/04-network',
  服务端权威: '/24-game-types-architecture/04-network',
  TCP: '/03-network/',
  UDP: '/03-network/',
  KCP: '/03-network/',
  分片分区: '/09-problem-domain/',
  副本实例: '/09-problem-domain/',
  跨服: '/19-capacity-scaling/',
  匹配服务: '/15-common-services/',
  排行榜: '/14-cache-middleware/',
  存档: '/13-data-database/',
  反作弊: '/24-game-types-architecture/18-security-compliance',
  UGC: '/24-game-types-architecture/16-scripting-hotfix',
  ECS: '/24-game-types-architecture/09-programming-patterns',
  云游戏: '/24-game-types-architecture/13-tech-ops'
}

export const ERAS = ['全部', '1970s', '1990s', '2000s', '2010s', '2020s']
export const PLATFORMS = ['全部', 'PC', '主机', '移动', '街机']
export const GENRE_NAMES = ['全部', ...GENRES.map(g => g.name)]

const eraOf = year => `${Math.floor(year / 10) * 10}s`

function game(name, firstYear, platforms, genres, tags, blurb, tech) {
  return {
    name,
    firstYear,
    era: eraOf(firstYear),
    platforms,
    genres,
    tags,
    blurb,
    tech: {
      server: tech.server,
      sync: tech.sync,
      matchmaking: tech.matchmaking,
      transport: tech.transport,
      storage: tech.storage,
      antiCheat: tech.antiCheat,
      social: tech.social
    }
  }
}

export const GAMES = [
  game('MUD1', 1978, ['PC'], ['MMORPG'], ['状态同步', '存档'],
    '文字网游的鼻祖：多人同时进入一个持久虚拟世界，网游的全部原型问题从这里开始。',
    {
      server: '单台大型机（DEC PDP-10）承载整个世界',
      sync: '文字命令/事件驱动，回合化的实时混合',
      matchmaking: '不适用（登录即进入同一世界）',
      transport: '终端拨号/校园网接入',
      storage: '世界与角色状态持久化在主机文件系统',
      antiCheat: '不适用（可信学术用户群）',
      social: '玩家对话与房间制社交的源头'
    }),
  game('Quake', 1996, ['PC'], ['FPS/TPS'], ['UDP', '服务端权威', '状态同步', 'UGC'],
    '客户端/服务端分离成为实时网游默认形态的起点；QuakeWorld 为延迟补偿重写网络代码。',
    {
      server: '专用服务器：逻辑与渲染分离，玩家只拿到画面数据',
      sync: '客户端预测 + 插值 + 时间戳同步（QuakeWorld 奠基）',
      matchmaking: '服务器列表浏览与手动加入（无自动匹配）',
      transport: 'UDP',
      storage: '本地存档为主，服务器保存积分与配置',
      antiCheat: '服务端权威命中判定（早期形态）',
      social: ' clans（战队）文化与 Mod/WAD 生态'
    }),
  game('反恐精英', 1999, ['PC'], ['FPS/TPS'], ['服务端权威', '匹配服务', '反作弊', '排行榜'],
    '从 Half-Life Mod 起家的竞技标杆；tick 服务器与竞技匹配体系随 CS:GO 成熟。',
    {
      server: '专用 tick 服务器（官方 + 社区服并存）',
      sync: '服务端权威命中判定（official server 打点回放验证）',
      matchmaking: '竞技模式按段位匹配（CS:GO 时代成熟）',
      transport: 'UDP',
      storage: '账号战绩在 Steam/Valve 后端',
      antiCheat: 'VAC 服务端扫描 + Overwatch 录像众审（存疑：机制细节随版本演进）',
      social: '段位天梯、社区服务器生态、创意工坊地图'
    }),
  game('守望先锋', 2016, ['PC', '主机'], ['FPS/TPS'], ['服务端权威', '状态同步', 'ECS', '匹配服务'],
    '服务端权威 FPS 的当代教科书，其 ECS 重构文章是游戏架构领域的公开名篇。',
    {
      server: '专用服务器，60Hz tick（存疑：不同模式参数有调整）',
      sync: '服务器权威 + 客户端预测/回退，技能命中全在服务端裁决',
      matchmaking: '按隐藏分与职责匹配',
      transport: 'UDP（自研协议栈）',
      storage: '账号/战绩云端化，细节未公开',
      antiCheat: '服务端权威 + 行为统计封禁（细节未公开）',
      social: '组队、公会（战队）、生涯档案'
    }),
  game('英雄联盟', 2009, ['PC'], ['MOBA'], ['服务端权威', '匹配服务', '排行榜', '反作弊'],
    '把 Elo/MMR 匹配做成大众话题的竞技游戏，运营超十年的长线服务样本。',
    {
      server: '单局专用服务器 + 平台服务（账号/商城/数据）拆分',
      sync: '服务端权威确定性模拟，客户端只做表现',
      matchmaking: 'Elo/MMR 匹配体系的大众化样本',
      transport: 'UDP（Riot 自研可靠层，细节未公开）',
      storage: '账号资产与战绩集中存储，细节未公开',
      antiCheat: '服务端权威 + Vanguard 反作弊（后期加入）',
      social: '好友、战队、段位天梯、观战系统'
    }),
  game('Dota 2', 2013, ['PC'], ['MOBA'], ['服务端权威', '匹配服务', 'UGC', '反作弊'],
    'Valve 的 MOBA 标杆：Source 引擎、创意工坊 UGC 与大型国际赛事体系。',
    {
      server: '单局专用服务器（Source/Source 2）+ Steam 平台服务',
      sync: '服务端权威，回放系统以服务器录制流为基础',
      matchmaking: '天梯分 + 行为分双轨匹配',
      transport: 'UDP（Source 网络层）',
      storage: 'Steam 后端：账号、饰品、战绩',
      antiCheat: 'VAC + 行为分 + 观赛延迟防透视',
      social: '创意工坊（地图/饰品 UGC）、观战、好友'
    }),
  game('王者荣耀', 2015, ['移动'], ['MOBA'], ['帧同步', 'KCP', '匹配服务', '分片分区'],
    '移动 MOBA 的国民级样本：弱网优化与机房分区部署公开分享较多。',
    {
      server: '全国多机房分区部署 + 单局进程（房间制）',
      sync: '帧同步（确定性锁帧），断线重连追帧',
      matchmaking: '段位 + 隐藏分匹配，开黑组队池',
      transport: 'UDP/KCP 类快速可靠协议优化弱网（公开分享提及，具体版本细节未公开）',
      storage: '账号与资产腾讯云上集中存储（细节未公开）',
      antiCheat: '服务端校验 + 行为检测（细节未公开）',
      social: '开黑组队、师徒、战队、赛事观赛'
    }),
  game('星际争霸', 1998, ['PC'], ['RTS'], ['帧同步', '匹配服务', '排行榜'],
    '确定性锁步同步的鼻祖级实现：同一份随机种子在每台机器上跑出同一场战争。',
    {
      server: '战网大厅 + 对战走玩家间联机（早期对战服务器角色有限）',
      sync: '确定性帧同步（lockstep）：只传操作指令，各端一致模拟',
      matchmaking: '战网天梯（早期 ladder）',
      transport: 'UDP（局域网/战网）',
      storage: '本地存档 + 战网战绩',
      antiCheat: '有限：地图作弊与断线处理为主，反外挂能力有限',
      social: '战网频道、天梯、录像回放'
    }),
  game('魔兽世界', 2004, ['PC'], ['MMORPG'], ['分片分区', '副本实例', '跨服', '状态同步', '存档'],
    'MMORPG 架构的教科书：「分区 + 副本实例」承接百万级在线，成为品类标配。',
    {
      server: '按 realm（分片）切分世界 + 副本实例化 + 跨服战场/远征',
      sync: '状态同步 + AoI（兴趣区域管理）',
      matchmaking: '战场排队、随机副本匹配器（LFG/LFR）',
      transport: 'TCP',
      storage: '角色数据分库分表（细节未公开），服务端权威存档',
      antiCheat: 'Warden 客户端扫描 + 服务端行为校验',
      social: '公会、好友、邮件、拍卖行（服务端经济）'
    }),
  game('最终幻想 XIV', 2013, ['PC', '主机'], ['MMORPG'], ['分片分区', '状态同步', '匹配服务', '存档'],
    '凭 2.0 重生逆袭的 MMORPG：数据中心制与副本匹配器是常态运营的样板。',
    {
      server: '数据中心 → 世界（分片）→ 副本实例，区域负载拆分',
      sync: '状态同步 + AoI，技能判定服务端裁决',
      matchmaking: '-duty finder 副本跨世界匹配',
      transport: 'TCP',
      storage: '角色与服务端权威存档（云存档体系，细节未公开）',
      antiCheat: '服务端行为校验（细节未公开）',
      social: '部队（公会）、跨世界好友、房产与市场板'
    }),
  game('剑网 3', 2009, ['PC'], ['MMORPG'], ['分片分区', '状态同步', '跨服'],
    '国产 MMORPG 长线运营代表：自研引擎与服务端支撑下的武侠持久世界。',
    {
      server: '区服分线 + 跨服战场/大型活动（公开分享有限）',
      sync: '状态同步为主，轻功等强动作场景做特殊优化（细节未公开）',
      matchmaking: '副本匹配与战场排队',
      transport: 'TCP（细节未公开）',
      storage: '角色数据服务端集中存储（细节未公开）',
      antiCheat: '服务端校验 + 反外挂系统（细节未公开）',
      social: '师门、帮会、师徒、交易行'
    }),
  game('暗黑破坏神 III', 2012, ['PC', '主机'], ['ARPG'], ['服务端权威', '存档', '排行榜'],
    '全服务端权威 ARPG 的激进修法：连单机都必须在线；上线日「错误 37」是容量课的经典案例。',
    {
      server: '全局在线服务（无离线模式），区域数据中心承载',
      sync: '服务端权威掉落与判定，客户端只做表现',
      matchmaking: '组队大厅与公开游戏匹配',
      transport: 'TCP',
      storage: '服务端权威存档（角色不可本地修改）',
      antiCheat: '服务端权威天然防改档 + Warden',
      social: '好友、赛季天梯、拍卖行（后关停——经济设计反例）'
    }),
  game('原神', 2020, ['PC', '主机', '移动'], ['ARPG', '开放世界'], ['存档', '服务端权威', '状态同步', '分片分区'],
    '跨平台开放世界的全球样本：手机/PC/主机进度一致，服务端权威存档与长线版本管线。',
    {
      server: '多区部署 + 世界分线；联机模式为最多 4 人的临时房间（细节未公开）',
      sync: '单机探索本地模拟 + 联机房间状态同步；关键裁决服务端权威',
      matchmaking: '联机等级门槛 + 好友/随机加入（无竞技匹配）',
      transport: 'TCP/UDP 混合（未公开）',
      storage: '服务端权威跨平台存档——多端一致性的核心',
      antiCheat: '客户端加固 + 服务端校验（细节未公开）',
      social: '好友、联机协作、深境螺旋排行（周期结算）'
    }),
  game('艾尔登法环', 2022, ['PC', '主机'], ['ARPG', '开放世界'], ['状态同步', 'UGC', '反作弊'],
    '异步社交的开放世界样本：留言/幻影把玩家痕迹做成世界的一部分，联机以合作为主。',
    {
      server: '联机以 P2P/中继为主（FromSoftware 系一贯做法，细节未公开）',
      sync: '小队合作状态同步 + 异步入侵/幻影机制',
      matchmaking: '等级/进度窗口匹配（密码/区域约束）',
      transport: 'P2P over UDP/中继（细节未公开）',
      storage: '本地存档为主 + 云存档（平台能力）',
      antiCheat: 'EAC + 服务端违规检测（PC 端）',
      social: '留言板（异步 UGC）、召唤协作、血迹与幻影'
    }),
  game('我的世界', 2009, ['PC', '主机', '移动'], ['沙盒', '生存建造'], ['UGC', '分片分区', '存档'],
    '沙盒的服务器生态奇迹：官方服务端 + 海量第三方服务器构成事实上的 UGC 平台。',
    {
      server: '官方服/自建服/第三方大服（分区+BungeeCord 类网关聚合）',
      sync: '区块化状态同步，tick 驱动世界推进',
      matchmaking: '无内建匹配：服务器列表 + 直接连接',
      transport: 'TCP（Java 版协议）',
      storage: '世界文件与玩家数据落盘（服务端）',
      antiCheat: '原版无内建反作弊，第三方大服自建校验插件体系',
      social: '第三方服务器的小游戏/排行/经济生态，Realms 官方订阅服'
    }),
  game('Roblox', 2006, ['PC', '主机', '移动'], ['沙盒'], ['UGC', '服务端权威', '存档', '匹配服务'],
    'UGC 游戏平台的形态天花板：玩家即开发者，平台负责托管、匹配与变现。',
    {
      server: '云端实例化房间：按负载自动开关游戏服务器',
      sync: '服务端权威模拟 + 客户端预测（Luau 脚本模型）',
      matchmaking: '按玩法/好友/推荐聚合的发现与匹配体系',
      transport: 'TCP/UDP 混合（未公开）',
      storage: '平台云存储（DataStore）托管创作者数据',
      antiCheat: '服务端权威 + Byfron 反作弊（PC）+ 内容审核体系',
      social: '好友、群组、创作者经济（Robux 分成）'
    }),
  game('光·遇', 2019, ['PC', '主机', '移动'], ['叙事'], ['状态同步', '匹配服务', '存档'],
    '社交叙事的东方样本：陌生人协作被做成美学，服务端支撑「遇见即同行」的轻交互。',
    {
      server: '分区在线世界 + 轻量房间（8 人上限场景，细节未公开）',
      sync: '动作/手势状态同步，弱对抗强共情',
      matchmaking: '场景内随机相遇 + 好友绑定',
      transport: 'TCP/UDP 混合（未公开）',
      storage: '账号云端存档，跨平台进度（细节未公开）',
      antiCheat: '低对抗性场景，校验为主（未公开）',
      social: '蜡烛社交、好友关系树、留言与合影'
    }),
  game('糖豆人', 2020, ['PC', '主机', '移动'], ['派对/休闲'], ['服务端权威', '匹配服务', '跨服'],
    '60 人同场的聚会竞技：海量短局匹配与服务端权威物理是工程看点。',
    {
      server: '单局专用服务器承载 60 人物理模拟（回合制赛制编排）',
      sync: '服务端权威物理 + 客户端表现补偿',
      matchmaking: '大堂聚合 + 快速满员匹配（跨平台联机）',
      transport: 'UDP（细节未公开）',
      storage: '赛季进度与商店云端化',
      antiCheat: '服务端权威限制作弊面（细节未公开）',
      social: '组队开黑、赛季通行证、创意关卡（后期 UGC 编辑器）'
    }),
  game('马里奥赛车 8 豪华版', 2017, ['主机'], ['竞速'], ['排行榜', '匹配服务'],
    '任天堂系竞速联机的代表：延迟补偿与道具公平性的平衡一直被社区研究（细节未公开多）。',
    {
      server: '全球联机走任天堂在线服务（房间制，拓扑细节未公开）',
      sync: '位置同步 + 道具服务端裁决（延迟补偿策略未公开，社区普遍观测为延迟容忍型）',
      matchmaking: '按 VR 分数近似匹配的全球房间',
      transport: 'P2P/NAT 穿透为主（存疑：任天堂未公开）',
      storage: '本地存档 + 在线成绩（云存档为付费订阅能力）',
      antiCheat: '服务端成绩合理性校验（未公开）',
      social: '好友房、全球房、周榜赛事'
    }),
  game('QQ 飞车', 2008, ['PC', '移动'], ['竞速'], ['匹配服务', '排行榜', 'KCP'],
    '国民竞速的长线运营样本：端手双端、段位天梯与赛季商业化体系。',
    {
      server: '房间制竞速服务器 + 大区部署（细节未公开）',
      sync: '位置同步 + 断线重连（端手游同场为特殊场景，细节未公开）',
      matchmaking: '段位匹配 + 休闲房',
      transport: 'TCP/UDP 混合（未公开）',
      storage: '账号资产腾讯体系集中存储（未公开）',
      antiCheat: 'TP 反外挂体系（细节未公开）',
      social: '车队、师徒、情侣系统、排行挑战'
    }),
  game('EA Sports FC（FIFA）', 1993, ['PC', '主机'], ['体育'], ['匹配服务', '服务端权威', '存档'],
    '年货体育的长线在线化样板：Ultimate Team 把卡牌经济做进体育拟真。',
    {
      server: '对战服务（1v1 走 P2P/专服混合，Ultimate Team 全服务端化）',
      sync: '1v1 delay-based 同步（社区长期讨论的「延迟手感」来源）；UT 市场交易全服务端裁决',
      matchmaking: '赛季分 + 匹配分数（Matchmaking rating）',
      transport: 'P2P over UDP（对战）/HTTPS 类接口（交易与账号）',
      storage: '俱乐部与 UT 资产全云端（服务端权威）',
      antiCheat: '服务端交易审计 + 转会市场价格监控',
      social: '好友对战、周赛、社区赛事体系'
    }),
  game('炉石传说', 2014, ['PC', '移动'], ['卡牌构筑'], ['服务端权威', '匹配服务', '排行榜'],
    '回合制全服务端权威的范本：客户端零信任，随机数都在服务器生成。',
    {
      server: '对局服务器 + 平台服务（商城/收藏/赛季）',
      sync: '回合制状态同步：服务端生成随机结果后下发',
      matchmaking: '天梯匹配 + 休闲池',
      transport: 'TCP/WebSocket 类长连接（未公开）',
      storage: '卡牌收藏与进度全服务端',
      antiCheat: '服务端权威天然防作弊面 + 行为检测',
      social: '好友对战、观战、竞技场'
    }),
  game('哈迪斯', 2020, ['PC', '主机'], ['Roguelike'], ['存档'],
    'Roguelike 多为单机形态的代表：后端栏基本留白本身就是分类学信息。',
    {
      server: '不适用（纯单机，无在线服务）',
      sync: '不适用（本地模拟）',
      matchmaking: '不适用',
      transport: '不适用',
      storage: '本地存档 + 平台云存档同步',
      antiCheat: '不适用（速度跑社区靠规则与录像自律）',
      social: '平台成就与排行榜（速度跑第三方榜单）'
    }),
  game('饥荒：联机版', 2016, ['PC', '主机'], ['生存建造'], ['分片分区', 'UGC', '存档'],
    '小团队持久世界服务器的代表：世界是运行在服务器上的一个持续演化的模拟。',
    {
      server: '专用服务器（官方托管或自建），世界持续运行',
      sync: '服务端权威世界模拟，客户端订阅状态',
      matchmaking: '房间列表 + 密码房（无竞技匹配）',
      transport: 'UDP（Klei 自研协议，细节未公开）',
      storage: '世界存档落盘于服务器，可回滚',
      antiCheat: '管理员权限体系 + 服务端校验（弱对抗场景）',
      social: 'Mod 生态（Steam 创意工坊）、好友同游'
    }),
  game('GTA Online', 2013, ['PC', '主机'], ['开放世界'], ['状态同步', '反作弊', '存档', 'UGC'],
    '开放世界在线服务的长跑冠军：30 人会话里的持久都市与内容管线。',
    {
      server: '会话制：30 人左右一个战局（P2P 为主 + 关键服务专用化，存疑：混合拓扑随版本演进）',
      sync: '会话内状态同步；经济与资产服务端记账',
      matchmaking: '按任务/活动聚合的战局匹配',
      transport: 'P2P/中继（细节未公开）',
      storage: 'Rockstar 云端角色与资产存档',
      antiCheat: '服务端资产校验 + PC 端 BattlEye（后期加入）',
      social: '帮会、好友战局、玩家自制差事（UGC 任务）'
    })
]
