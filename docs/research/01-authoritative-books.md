# 权威书籍调研

## Category

research / 调研一。节点定位：把游戏开发领域公认的书籍当作主题清单来读，逐本抽出「这本书回答什么问题」，再把抽出来的主题对到本仓 `docs/` 的现有篇目上，判定已覆盖 / 部分 / 缺口。口径与 [玩法品类与功能组件覆盖对照](/system/genre-coverage) 一致：只认独立篇与专节，正文出现一次词不算覆盖。

## Definition

调研对象是公开出版、被反复引用的书，不是网上的教程与专栏。选书标准三条：有明确出版方或官方站点、内容成体系而不是零散技巧、主题能落到本仓某一棵树上。书名与出版信息以出版社与作者官方站点为准，主题抽取以书的目录结构为准。

## Problem

写知识库最容易犯的错是按手头材料组织内容：手头有什么写什么，缺什么不知道。书籍目录是外部给的一份对照表，它把二十年的工程问题分好了类，逐条对一遍，就能看出本仓哪一层是厚的、哪一层是空的。本次调研 15 本书，抽出 23 个主题，判定 20 个已覆盖、3 个部分、0 个新缺口；11 个功能组件缺口由功能组件维度单独给出，见[覆盖差异表](/research/04-coverage-diff)，两个维度不重复计数。

## 调研结果

| 书 | 出版 | 抽出的主题 | 本仓落点 | 判定 |
| --- | --- | --- | --- | --- |
| Game Programming Patterns（Robert Nystrom） | 自出版，官方站 gameprogrammingpatterns.com，2014 | 游戏主循环与时间推进 | 教程 [09 游戏编程模式](/24-game-types-architecture/09-programming-patterns) 第 8、9 节、[Tick 与时间推进](/server/sync/01) | 已覆盖 |
| 同上 | 同上 | 双缓冲、对象池、享元、原型、组件、事件队列 | 教程 09 第 7、18、2、4、13、14 节，[Component 模型详解](/24-game-types-architecture/06-frameworks) | 已覆盖（专节） |
| 同上 | 同上 | 字节码与脚本虚拟机 | 教程 09 第 10 节、[宿主运行时与脚本 VM 集成](/system/scripting/02) | 已覆盖 |
| 同上 | 同上 | 数据导向设计与 ECS | [脚本语言与 ECS](/client/04) | 已覆盖 |
| Game Programming Gems 系列（1–8 卷） | Charles River Media，2000–2007 | 同步、预测与网络抖动 | [预测、补偿与纠正](/server/sync/05)、[同步模型](/server/sync/02) | 已覆盖 |
| 同上 | 同上 | 确定性、回放与裁决 | [确定性与数值一致性](/server/sync/06)、[回放、观战与裁决](/server/sync/07) | 已覆盖 |
| 同上 | 同上 | 数学、物理与碰撞 | 教程 [07 架构总览](/24-game-types-architecture/07-core-arch) 带过，无专节 | 部分 |
| Game Engine Architecture（Jason Gregory） | CRC Press，第 3 版，2018 | 引擎分层与模块边界 | [客户端技术栈与引擎](/client/01)、[客户端内部分层](/client/web/06) | 已覆盖 |
| 同上 | 同上 | 资源系统与工具链 | [资源系统与工具链](/client/03) | 已覆盖 |
| 同上 | 同上 | 动画、音频与表现子系统 | 教程 [19 客户端架构与性能基础](/24-game-types-architecture/19-client-architecture) 动画状态机专节、[21 音频与美术管线协作](/24-game-types-architecture/21-art-audio-pipeline) | 已覆盖 |
| Multiplayer Game Programming（Glazer、Shankar） | Pearson，2016 | 延迟、预测、补偿与权威 | [预测、补偿与纠正](/server/sync/05)、[安全与反作弊](/server/security/01) | 已覆盖 |
| AI for Games（Ian Millington） | CRC Press，第 3 版，2019 | 寻路、行为树与 NPC 决策 | [AI 在客户端与游戏系统中的应用场景](/client/05) 只讲场景不讲机制 | 部分 |
| Game Mechanics: Advanced Game Design（Adams、Dormann） | New Riders，2014 | 经济循环、资源产出与消耗 | [经济循环与产出消耗](/numerical/04) | 已覆盖 |
| 同上 | 同上 | 进度、解锁与节奏 | [成长曲线模型](/numerical/03)、[关卡难度与新手节奏](/numerical/07) | 已覆盖 |
| The Art of Game Design（Jesse Schell） | CRC Press，第 2 版，2014 | 机制分解与体验设计方法 | [从玩法到架构的分析方法](/industry/methodology/03)、[玩法系统设计](/24-game-types-architecture/10-gameplay-systems) | 已覆盖 |
| Real-Time Rendering（Akenine-Möller 等） | CRC Press，第 4 版，2018 | 渲染管线与帧预算 | 教程 [19 客户端架构与性能基础](/24-game-types-architecture/19-client-architecture) 第 1 节、[WebGL 与三维渲染入门](/client/web/02) | 已覆盖 |
| Game Engine Black Book（Fabian Sanglard） | 独立出版，DOOM 卷 2017、Quake 卷 2019 | 经典引擎的整机拆解 | [游戏发展历史线](/history/) 节点、教程 [01 游戏后端技术全景](/24-game-types-architecture/01-entry) | 部分 |
| Designing Games（Tynan Sylvester） | O'Reilly，2013 | 系统之间的相互作用与迭代 | [模型之间如何组合](/industry/models/08)、教程 [10 玩法系统设计](/24-game-types-architecture/10-gameplay-systems) | 已覆盖 |
| Free-to-Play（Will Luton） | New Riders，2013 | 付费结构与商业模型 | [商业化数值示例模型](/numerical/06)、[发布、版本与商业模式](/industry/platforms/04) | 已覆盖 |
| 《腾讯游戏开发精粹》系列 | 腾讯游戏学堂，分卷出版 | 国内项目的网络、性能与数据实践 | 教程 [07 架构总览](/24-game-types-architecture/07-core-arch)、[13 运维与基础设施实战](/24-game-types-architecture/13-tech-ops) | 已覆盖 |
| Designing Data-Intensive Applications（Martin Kleppmann） | O'Reilly，2017 | 事务、复制、分片与一致性 | [事务、一致性与分库分表](/database/03)、[数据同步、冷热分层与归档](/database/04) | 已覆盖 |
| Site Reliability Engineering（Beyer 等，Google） | O'Reilly，2016 | 容量、SLO 与故障应对 | [压测、容量规划与扩缩容](/operation/observability/05)、[稳定性治理的真正目标](/operation/observability/06) | 已覆盖 |
| Release It!（Michael T. Nygard） | Pragmatic Bookshelf，第 2 版，2018 | 超时、熔断、退避与故障模式 | [Debug、故障定位与复盘](/operation/observability/04)、[一致性、恢复与重连](/server/services/05) | 已覆盖 |

**结论：23 个主题里 20 个已覆盖、3 个部分。已覆盖集中在架构、同步、数值、存储、运维五块，正好是本仓写得最厚的五棵树；3 个部分分别是数学与物理碰撞、AI 机制、经典引擎拆解，全在客户端与表现侧，与「后端是主场、客户端够用且成体系」的取舍一致，按部分处理、不补新篇。**

## 书里能直接拿来用的做法

- **任务与成就的数据表化**（TrinityCore 的工程惯例，与 Game Programming Patterns 的数据驱动一脉相承）：任务定义、达成条件、奖励各自成表，服务端只按事件推进进度。本仓缺的不是思想，是那层进度模型的写法，落点见[覆盖差异表](/research/04-coverage-diff)的缺口清单。
- **对象池与双缓冲的取舍**：教程 09 已经按「什么时候不该用」给出口径，本仓不再重复展开，新篇只在需要复用状态快照处回指。
- **帧时间怎么花掉的**：Real-Time Rendering 的帧预算账与教程 19 的「渲染指令归因」是同一套算法，客户端性能问题的排查顺序可直接沿用。
- **经济系统先算产消再算定价**：Game Mechanics 的资源流图与 [经济循环与产出消耗](/numerical/04) 同构，体力、签到、战令三篇补的就是这条循环上还开着的三个口子。
- **容错先给超时再给熔断**：Release It! 的顺序在本仓由 [Debug、故障定位与复盘](/operation/observability/04) 承接，新篇遇到外部依赖（语音 SDK、支付渠道）直接引它。

## Related

关系链：书目清单 → 主题抽取 → 逐篇对照 → 判定 → 缺口去向。逐段回答「为什么需要下一个」：

- 书目只给书名没有用，先要抽出可对照的主题，本页表格的「抽出的主题」列承担这一层。
- 主题抽出来才能对到篇目，判定结果与[覆盖差异表](/research/04-coverage-diff)共用同一套口径。
- 判定为部分的三项不补篇，理由写在结语：客户端侧按够用深度取舍，与[客户端、服务端、平台与运营的边界](/industry/methodology/05)一致。

上层：[调研总览](/research/)。同层：[引擎与中间件官方文档调研](/research/02-engine-middleware-docs)、[应用场景对照](/research/03-application-scenarios)、[覆盖差异表](/research/04-coverage-diff)。上游对照基准：[玩法品类与功能组件覆盖对照](/system/genre-coverage)。

## Reference

- 书籍信息以出版方与作者官方站点为准：gameprogrammingpatterns.com、CRC Press（A K Peters）、Pearson、O'Reilly、New Riders、Pragmatic Bookshelf、Charles River Media；中文实践书以腾讯游戏学堂公开页面为准。
- 《游戏编程精粹》按 1–8 卷系列整体引用，只取其主题分区（同步网络、数学物理、AI、性能），不逐卷断言篇目。
- 主题判定的检索口径：全库关键词与标题 grep，检索日期 2026-10-08；判定只针对本仓 `docs/` 下的 md。
- 术语对照：Game Programming Patterns（游戏编程模式）、Data-Oriented Design（数据导向设计）、Frame Budget（帧预算）。
