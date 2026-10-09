# 调研知识点总览

## Category

跨树入口。节点定位：把[权威书籍调研](/research/01-authoritative-books)、[引擎与中间件官方文档调研](/research/02-engine-middleware-docs)、[应用场景对照](/research/03-application-scenarios)三份调研收成可查的知识点——核心概念、书籍要点、文档要点、应用场景、常见坑误区。与 [expansion 台账](/24-game-types-architecture/expansion)的分工：那边记「改了什么、怎么记账」是进度账，本页记「调研说了什么、哪些能用、哪些是坑」是知识账。

## 一、核心概念

调研反复用到、也反复被验证的十二条口径。每条给一句话、来源与站内落点。

| 概念 | 一句话口径 | 来源 | 落点 |
| --- | --- | --- | --- |
| 覆盖判定口径 | 只认独立篇与专节，正文出现一次词不算覆盖 | [覆盖对照页](/system/genre-coverage)与两份调研共用 | [覆盖对照页](/system/genre-coverage) |
| 品类需求密度 | 缺口按「哪类游戏先要」排序，不按实现难度排 | [应用场景对照](/research/03-application-scenarios) | [应用场景对照](/research/03-application-scenarios) |
| 机制口径与接口签名分开 | 机制口径十年不变，接口签名随版本变——正文只记前者 | [官方文档调研](/research/02-engine-middleware-docs) | [官方文档调研](/research/02-engine-middleware-docs) |
| 客户端按引擎分、服务端按机制分 | 两类官方文档各走一条路，引擎专属 API 不收录 | [官方文档调研](/research/02-engine-middleware-docs) | 教程 [03 前端引擎与客户端](/24-game-types-architecture/03-frontend-engines) |
| 数据表化 | 定义与运行态分离，加内容不改代码 | Game Programming Patterns（Nystrom）与 TrinityCore 工程惯例 | [任务系统](/system/quest) |
| 服务端权威与客户端预测分工 | 关键状态只认服务端，客户端先动后校正 | Multiplayer Game Programming（Glazer、Shankar）、Photon 与 UE 官方文档 | [预测、补偿与纠正](/server/sync/05) |
| 帧预算归因 | 把帧时间按渲染指令归因，再谈优化 | Real-Time Rendering（Akenine-Möller 等） | 教程 [19 客户端架构与性能基础](/24-game-types-architecture/19-client-architecture) |
| 产消先于定价 | 经济系统先算产出与消耗，再算定价 | Game Mechanics: Advanced Game Design（Adams、Dormann） | [经济循环与产出消耗](/numerical/04) |
| 超时先于熔断 | 容错顺序是先给超时，再给熔断与退避 | Release It!（Nygard） | [Debug、故障定位与复盘](/operation/observability/04) |
| 客户端完整性不等于服务端权威 | 反作弊中间件拦注入改内存，判定仍落服务端 | Easy Anti-Cheat、BattlEye 官方说明 | [安全与反作弊](/server/security/01) |
| 确定性是帧同步生命线 | 同输入序列在任何机器上得到同状态 | Game Programming Gems 系列 | [确定性与数值一致性](/server/sync/06) |
| 惰性结算与服务器日 | 恢复与重置在读取时现算，边界按服务器时区 | 行业通行做法，无单一出处（来源未考） | [体力与次数门控](/system/stamina) |

## 二、权威书籍要点

15 本书、23 个主题的抽取结果，判定 20 已覆盖、3 部分。部分项在要点列如实标注。

| 书（作者，出版） | 要点 | 本仓落点 |
| --- | --- | --- |
| Game Programming Patterns（Robert Nystrom，自出版 2014） | 游戏主循环与时间推进；双缓冲、对象池、享元、原型、组件、事件队列；字节码与脚本虚拟机；数据导向设计与 ECS | 教程 [09 游戏编程模式](/24-game-types-architecture/09-programming-patterns)、[Tick 与时间推进](/server/sync/01)、[宿主运行时与脚本 VM 集成](/system/scripting/02)、[脚本语言与 ECS](/client/04) |
| Game Programming Gems 1–8（Charles River Media，2000–2007） | 同步、预测与网络抖动；确定性、回放与裁决；数学、物理与碰撞（部分，无专节） | [预测、补偿与纠正](/server/sync/05)、[确定性与数值一致性](/server/sync/06)、[回放、观战与裁决](/server/sync/07) |
| Game Engine Architecture（Jason Gregory，CRC Press 第 3 版 2018） | 引擎分层与模块边界；资源系统与工具链；动画、音频与表现子系统 | [客户端技术栈与引擎](/client/01)、[资源系统与工具链](/client/03)、教程 [21 音频与美术管线协作](/24-game-types-architecture/21-art-audio-pipeline) |
| Multiplayer Game Programming（Glazer、Shankar，Pearson 2016） | 延迟、预测、补偿与权威 | [预测、补偿与纠正](/server/sync/05)、[安全与反作弊](/server/security/01) |
| AI for Games（Ian Millington，CRC Press 第 3 版 2019） | 寻路、行为树与 NPC 决策（部分，只讲场景不讲机制） | [AI 在客户端与游戏系统中的应用场景](/client/05) |
| Game Mechanics: Advanced Game Design（Adams、Dormann，New Riders 2014） | 经济循环、资源产出与消耗；进度、解锁与节奏 | [经济循环与产出消耗](/numerical/04)、[成长曲线模型](/numerical/03)、[关卡难度与新手节奏](/numerical/07) |
| The Art of Game Design（Jesse Schell，CRC Press 第 2 版 2014） | 机制分解与体验设计方法 | [从玩法到架构的分析方法](/industry/methodology/03)、教程 [10 玩法系统设计](/24-game-types-architecture/10-gameplay-systems) |
| Real-Time Rendering（Akenine-Möller 等，CRC Press 第 4 版 2018） | 渲染管线与帧预算 | 教程 [19 客户端架构与性能基础](/24-game-types-architecture/19-client-architecture)、[WebGL 与三维渲染入门](/client/web/02) |
| Game Engine Black Book（Fabian Sanglard，独立出版 DOOM 卷 2017、Quake 卷 2019） | 经典引擎的整机拆解（部分，归历史线） | [游戏发展历史线](/history/)、教程 [01 游戏后端技术全景](/24-game-types-architecture/01-entry) |
| Designing Games（Tynan Sylvester，O'Reilly 2013） | 系统之间的相互作用与迭代 | [模型之间如何组合](/industry/models/08)、教程 [10 玩法系统设计](/24-game-types-architecture/10-gameplay-systems) |
| Free-to-Play（Will Luton，New Riders 2013） | 付费结构与商业模型 | [商业化数值示例模型](/numerical/06)、[发布、版本与商业模式](/industry/platforms/04) |
| 《腾讯游戏开发精粹》系列（腾讯游戏学堂，分卷出版） | 国内项目的网络、性能与数据实践 | 教程 [07 架构总览](/24-game-types-architecture/07-core-arch)、[13 运维与基础设施实战](/24-game-types-architecture/13-tech-ops) |
| Designing Data-Intensive Applications（Martin Kleppmann，O'Reilly 2017） | 事务、复制、分片与一致性 | [事务、一致性与分库分表](/database/03)、[数据同步、冷热分层与归档](/database/04) |
| Site Reliability Engineering（Beyer 等，O'Reilly 2016） | 容量、SLO 与故障应对 | [压测、容量规划与扩缩容](/operation/observability/05)、[稳定性治理的真正目标](/operation/observability/06) |
| Release It!（Michael T. Nygard，Pragmatic Bookshelf 第 2 版 2018） | 超时、熔断、退避与故障模式 | [Debug、故障定位与复盘](/operation/observability/04)、[一致性、恢复与重连](/server/services/05) |

书籍信息以出版方与作者官方站点为准，完整书目与逐主题判定见[权威书籍调研](/research/01-authoritative-books)。

## 三、官方文档要点

23 份官方文档、23 个主题，判定 21 已覆盖、2 部分。文档入口按各项目官方站点，完整清单见[官方文档调研](/research/02-engine-middleware-docs)。

| 文档 | 归属 | 要点 | 本仓落点 |
| --- | --- | --- | --- |
| Unity Manual | 引擎 | 客户端网络层结构与会话 | 教程 [03 前端引擎与客户端](/24-game-types-architecture/03-frontend-engines) |
| Netcode for GameObjects | 引擎多人 | 网络对象复制与客户端权威边界 | 教程 [03](/24-game-types-architecture/03-frontend-engines)、[同步模型](/server/sync/02) |
| Unity Addressables | 引擎资源 | 资源分组、依赖与热更 | [资源系统与工具链](/client/03) |
| Unreal Engine Documentation（Replication、GAS、专用服务器） | 引擎 | 权威服务器模型、预测纠偏、技能与效果 | 教程 [03](/24-game-types-architecture/03-frontend-engines)、[技能系统](/system/skill) |
| Godot Documentation（High-level multiplayer、RPC） | 引擎 | 场景同步与 RPC 边界 | 教程 [03](/24-game-types-architecture/03-frontend-engines)、[数据帧与协议契约](/networking/04) |
| Cocos Creator 手册 | 引擎 | 小游戏平台约束与登录链路 | 教程 [03](/24-game-types-architecture/03-frontend-engines)、[小游戏平台与浏览器环境](/client/web/05) |
| Mirror Documentation | 引擎联网 | 兴趣管理与传输层抽象 | [AOI：兴趣区域](/server/aoi)、[传输层与接入协议选择](/networking/03) |
| Photon Fusion Documentation | 引擎联网 | 预测、回滚与状态复制 | [预测、补偿与纠正](/server/sync/05) |
| skynet Wiki | 服务端框架 | 服务模型、定时器、内置库 | [Skynet：C 内核 + Lua Actor](/server/skynet) |
| Colyseus Documentation | 房间框架 | 房间生命周期、广播与状态同步 | [房间广播、弱网与国内网络环境](/networking/07)、[单局房间型游戏问题模型](/industry/models/02) |
| Nakama Documentation | 后端框架 | 账号、撮合、排行、存储、通知 | [账号、角色与基础系统](/system/services/01)、[排行榜](/system/leaderboard) |
| Agones Documentation | 承载编排 | 游戏服的扩缩容与就绪探针 | [扩容、缩容与动态加服](/server/capacity/02)、[协调层、跨服与控制平面](/server/services/03) |
| Redis Documentation | 中间件 | 有序集合、哈希、脚本原子性 | [Redis、排行榜与锁](/database/cache/01)、[排行榜](/system/leaderboard) |
| PostgreSQL Documentation | 数据库 | 事务、索引、分区 | [事务、一致性与分库分表](/database/03) |
| MySQL Reference Manual | 数据库 | 主从、回滚段与在线 DDL | [关系型与非关系型数据库](/database/02)、[配置表与数据驱动管线](/production/05) |
| Protocol Buffers Documentation | 契约 | 字段演进与向后兼容 | [数据帧与协议契约](/networking/04) |
| gRPC Documentation | 契约 | 服务间调用与流式接口 | [服务发现、路由与协作](/server/services/04) |
| Kubernetes Documentation | 承载编排 | 副本、探针、扩缩容语义 | [扩容、缩容与动态加服](/server/capacity/02) |
| Steamworks Documentation | 平台 | 大厅、成就、内购与云存档 | [平台与渠道生态](/industry/platforms/01)、[登录、支付、社交与广告 SDK](/industry/platforms/03) |
| OpenTelemetry Documentation | 可观测 | Trace、Metric、日志三态 | [日志、指标、Tracing 与 OTel](/operation/observability/01) |
| Easy Anti-Cheat / BattlEye 官方说明 | 安全 | 客户端完整性与注入检测 | [安全与反作弊](/server/security/01) |
| FMOD Studio Documentation | 音频中间件 | 音频资源、事件与混音总线（部分，只有管线专节） | 教程 [21 音频与美术管线协作](/24-game-types-architecture/21-art-audio-pipeline) |
| Wwise Documentation | 音频中间件 | 事件驱动的音频触发与项目结构（部分，同上） | 教程 [21](/24-game-types-architecture/21-art-audio-pipeline) |

## 四、应用场景

21 个品类按需求密度过一遍，14 个要补件、7 个不用补。完整品类表与组件清单见[应用场景对照](/research/03-application-scenarios)。

| 品类 | 调研判定的缺口 | 补齐落点 |
| --- | --- | --- |
| 棋牌对局 / 音乐节奏 / 格斗 / 竞速体育 / RTS / 自走棋 / UGC | 无 | 既有篇目 |
| 派对与房间轻竞技 | 语音 | [游戏内语音](/system/voice) |
| 三消与益智休闲 | 体力与次数门控 | [体力与次数门控](/system/stamina) |
| MOBA | 外观与皮肤 | [外观、皮肤与装扮](/system/cosmetics) |
| FPS / TPS 与战术射击 | 语音 | [游戏内语音](/system/voice) |
| 塔防 | 装备强化与升星、体力门控 | [装备强化与升星](/system/enhance)、[体力与次数门控](/system/stamina) |
| 卡牌与 CCG | 任务、成就、图鉴 | [任务系统](/system/quest)、[成就与图鉴](/system/achievement) |
| 回合制 RPG 与战棋 | 任务、成就 | [任务系统](/system/quest)、[成就与图鉴](/system/achievement) |
| ARPG 与刷宝副本 | 体力与次数门控 | [体力与次数门控](/system/stamina) |
| MMORPG 与大世界 | 任务、成就、游戏内公告 | [任务系统](/system/quest)、[成就与图鉴](/system/achievement)、[走马灯与公告](/system/marquee) |
| SLG 与 4X 赛季沙盘 | 家园领地权限、赛季通行证 | [家园、领地与建造权限](/system/territory)、[战令与赛季轨](/system/battle-pass) |
| 放置与挂机养成 | 签到与兑换码、赛季通行证 | [签到、福利与兑换码](/system/checkin)、[战令与赛季轨](/system/battle-pass) |
| 模拟经营与生活 / 生存建造与沙盒 | 家园领地权限 | [家园、领地与建造权限](/system/territory) |
| Roguelike 与 Roguelite | 图鉴与收藏 | [成就与图鉴](/system/achievement) |

被最多品类同时要求的三组：

- **任务与成就**：卡牌、回合制 RPG、MMORPG 三个大品类同时依赖，底层是同一套「定义表 + 事件推进 + 一次性发奖」，写一篇够三个品类用，见[任务系统](/system/quest)与[成就与图鉴](/system/achievement)。
- **体力与次数门控**：三消、塔防、ARPG 的节奏闸门，差别只在恢复速率与重置口径，主体是同一套按服务器日重置的幂等逻辑，见[体力与次数门控](/system/stamina)。
- **家园与领地**：SLG 是领地归属、模拟经营是家园存档、生存建造是反破坏，三者共用空间底座与权限位，见[家园、领地与建造权限](/system/territory)。

已覆盖主题的品类分布（同步与裁决、匹配与段位、AOI 与分片、支付与对账、抽卡保底）在三个维度里都判定已覆盖，两侧互证，见[覆盖差异表](/research/04-coverage-diff)。

## 五、常见坑误区

调研过程与后续成篇里反复出现的十个坑，每个给「错在哪」与「本仓对策」。

| 坑 | 错在哪 | 本仓对策 | 落点 |
| --- | --- | --- | --- |
| 按手头材料组织内容 | 手头有什么写什么，缺什么不知道 | 用外部清单（书目录、官方文档、品类组件表）当对照表，逐条对 | [权威书籍调研](/research/01-authoritative-books) |
| 按调研顺序补缺 | 先补到处能查到的引擎细节，把运营件留到最后 | 按品类需求密度排顺序，两个维度独立算出同一顺序 | [应用场景对照](/research/03-application-scenarios) |
| 词源营销 | 把通行词说成出自某论文，以讹传讹 | 三级来源口径：给出处 / 标「通行」/ 标「来源未考」，查不到不编 | [英文术语与词源](/glossary/10) |
| 把频控当框架责任 | 以为框架的下行口自带限流与屏蔽 | 频控、屏蔽、保序在业务层，框架只管送达 | [走马灯与公告](/system/marquee) |
| 把反作弊中间件当服务端权威 | 以为拦了注入就不用服务端判定 | 中间件拦客户端完整性，判定仍落服务端 | [安全与反作弊](/server/security/01) |
| 把引擎 API 写进正文 | 引擎改版后接口签名失真 | 正文只记机制口径，接口以官方文档最新版为准 | [官方文档调研](/research/02-engine-middleware-docs) |
| 概率不公示 | 客户端显示与服务端判定不一致，或暗调概率 | 服务端判定加公示，概率与保底规则写进展示 | [装备强化与升星](/system/enhance)、[掉落与概率设计](/numerical/05) |
| 体力可交易 | 可转移的预算就是二级货币，工作室套利入口 | 体力不可赠送、不可交易，限量赠送只给次数 | [体力与次数门控](/system/stamina) |
| 限时外观误删买断 | 租用与买断混在一处存储，到期误删 | 拥有与装备分离，`kind` 区分买断与租用 | [外观、皮肤与装扮](/system/cosmetics) |
| 强度混进外观 | 为卖皮肤顺手加属性，外观变成功利选择 | 外观定义表不允许数值列，与数值计算零耦合 | [外观、皮肤与装扮](/system/cosmetics) |

## Related

关系链：三份调研 → 差异汇总 → 知识点收拢 → 落点篇目。逐段回答「为什么需要下一个」：

- 三份调研各自成篇，先要有入口，见[调研总览](/research/)。
- 三个维度的判定并账之后差异才清楚，见[覆盖差异表](/research/04-coverage-diff)。
- 并账之后知识与坑才收得成一张表，本页承担这一层。
- 本页每条都落到具体篇目，落点的机制展开以各自节点为准，本页不重复。

上游：[调研总览](/research/)、[权威书籍调研](/research/01-authoritative-books)、[引擎与中间件官方文档调研](/research/02-engine-middleware-docs)、[应用场景对照](/research/03-application-scenarios)、[覆盖差异表](/research/04-coverage-diff)、[玩法品类与功能组件覆盖对照](/system/genre-coverage)。同层：[英文术语与词源](/glossary/10)（词条侧）、[expansion 台账](/24-game-types-architecture/expansion)（进度侧）。下游：system 树玩法系统各篇与 server、numerical、operation 等落点树。

## Reference

- 本页内容全部引自三份调研与覆盖对照页，不新增未核事实；判定日期 2026-10-08，缺口补齐 2026-10-09 至 2026-10-10。
- 来源标注三级口径：可查出处给书名/出版方/官方站点，行业通行做法标「通行」，无单一出处的标「来源未考」——与[英文术语与词源](/glossary/10)同一口径。
- 书目与文档的完整清单、出版信息与官方入口以对应调研篇目的 Reference 节为准。
- 术语对照：Coverage Audit（覆盖审计）、Genre Density（品类需求密度）、Knowledge Digest（知识点总览）。
