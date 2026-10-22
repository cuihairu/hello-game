# MMO 服务端引擎七维对比

> 来源：mistlane 仓 docs/mmo-engine-survey.md（commit f7b238f，2026-10-19）
> 维度 A-G：契约定义 / 属性同步 / 属性→DB 映射 / 进程拓扑 / 无缝地图 / 跨服 / 玩家实体

> **已知缺口**：BigWorld 一列标注为「未核实」——本机
> `/home/cui/workspaces/kbengine/BigWorld-Engine-14.4.1/` 目录为空（0 个文件），
> 该引擎只能依据公开资料补充，本文未据此推断。同仓 24 章的 BigWorld 内容来自
> 官方文档（来源代号 BW-*），可交叉参考。
> 拿不到源码的引擎一律标注「资料不足」，未编造架构细节。

---

# MMO / 分布式游戏服务端引擎能力横向调研

> 调研日期：2026-10-19。目标是比较实体契约、复制、持久化、进程划分、地图扩展和跨服，而非单纯比较网络库。
> **口径**：源码可见时优先按本机源码；官方资料只支撑该资料明确描述的功能。公开宣传、资料目录或产品存在本身不证明某项架构能力。`未核实` 表示目前未找到能支撑结论的一手证据，不代表产品一定没有该功能。

## 一页对比（A–G × 6 个方案）

| 维度 | BigWorld | KBEngine | Darkstar / Reddwarf | Nakama（Go，近年开源方案） | Unreal Dedicated Server | 腾讯公开商业资料样本 |
|---|---|---|---|---|---|---|
| **A 契约定义** | **未核实**：指定本机目录为空；此处不从同类引擎推断。 | XML `.def`/`types.xml`，类型、Flags、Persistent、默认值；实体注册有 `hasBase/hasCell/hasClient`；支持组件/接口式定义，实体类继承语义**未核实**。[K1][K2] | Java API 以 ManagedObject / ManagedReference 等对象模型为核心；字段 schema、类型约束和继承映射**未核实**。[D1] | 没有可直接对照 `.def` 的通用 MMO Entity schema；Authoritative Match 的状态/序列化由游戏运行时代码定义。继承/字段 flags **未核实**。[N1] | `UCLASS`/`USTRUCT`/`UPROPERTY` 等反射契约；C++ 类可继承，但 Dedicated Server 不提供统一 MMO 属性 schema/DB schema 生成。[U1][U2] | 腾讯游戏学堂公开有“游戏支撑系统”课程，但不是可审计的引擎 schema 文档；A **资料不足，仅按公开信息**。[T1] |
| **B 属性同步** | **未核实**：缺本机源码/可访问的一手技术细节。 | 按 EntityDef flags 决定 Base/Cell/自身客户端/其他客户端可见；Cell 的 Witness/View 做视野过滤；初始化发送快照，后续按属性/位置变更增量打包；具体属性发送由更新调用触发，位置更新可按配置编码。[K1][K3][K4] | 有 Session/Channel 消息原语；是否提供通用实体属性复制、AOI、全量/增量策略**未核实**。[D1] | Authoritative Match 以固定 tick 运行服务器逻辑，服务器验证并向相关 peer 广播消息；没有通用属性 replicator/AOI 承诺，接收者由 Match 逻辑决定。[N1] | Actor/Component 属性复制，服务端权威；复制频率、条件与相关性可配置，Replication Graph 用于大规模 actor 管理；不是默认 MMO 世界级 AOI 方案。[U1][U2][U3] | **未核实**；公开课程列表不含足够细节。[T1] |
| **C 属性→DB** | **未核实**。 | `Persistent=true` 的字段进入实体持久字段集合；DBMgr/EntityTables 按实体模块创建/同步实体表及字段，MySQL 一类后端每实体定义映射表；实体写入作为 DB task 执行并回调 BaseApp。跨表事务/跨表属性映射**未核实**，不要等同于任意 ORM。[K1][K5][K6] | 有 DataManager/ManagedObject 持久化概念；事务/对象持久化可由公开 API/仓库确认；自动字段到关系表的映射及 MMO 角色跨表规则**未核实**。[D1] | Storage Engine 面向 collection/key/JSON value 对象，写操作可批量事务；不是 Entity 属性自动映射关系表。业务字段写回由服务端代码/Storage API 决定。[N2] | 引擎不提供通用玩家属性→数据库自动映射；保存/加载由项目代码及外部后端负责。具体频率、表结构完全项目自定。[U1] | **未核实**；课程公开页不能推导持久化表模型。[T1] |
| **D 进程拓扑** | **未核实**。BigWorld 指定源码目录 `/home/cui/workspaces/kbengine/BigWorld-Engine-14.4.1/` 当前为空。 | 多组件多进程：LoginApp、BaseApp、BaseAppMgr、CellApp、CellAppMgr、DBMgr、Machine 等；Base/Cell 分工，管理进程跟踪并分配工作；使用引擎内部 Network Bundle/组件接口进行进程间消息。[K7][K8] | Java server middleware；公开 Reddwarf 源码包含 `sgs-server`、`sgs-server-api`、`sgs-server-dist`、`sgs-boot` 等模块；具体可配置节点/组件拓扑不作为该引擎单一固定的 MMO 分层，节点扩展细节**部分未核实**。[D1] | 可多节点部署/扩展的游戏后端；匹配、Match runtime 与持久化等逻辑由 Nakama 服务提供。固定进程角色数量、玩家状态的节点放置细节**未核实**。[N3] | 一个 headless dedicated server 进程承载一局/一个运行 World 是官方基础模型；集群、匹配、跨实例路由通常需项目后端/托管编排。Epic 文档没有提供 MMO 级固定进程角色拓扑。[U4] | 腾讯游戏学堂页面只证明公开课程/分享存在，不能确认运行时拓扑；**资料不足，仅按公开信息**。[T1] |
| **E 无缝地图** | **未核实**。 | 有 Space/Cell/AOI 与跨 CellApp 的分布式空间相关机制；本次确认到 Space 内实体/坐标节点和 CellApp Witness，但未建立“任意大地图跨进程无缝迁移”的完整证据链。场景/space 跳转与真正连续分片应区分；跨边界策略**未核实**。[K4][K9] | **未核实**；项目/样例是否支持 seamless world 未由已核实 API 资料证明。[D1] | 不定位为无缝大世界实体引擎。其权威 Match 是比赛/房间状态边界；地图分块、跨块权威迁移**未核实/不在已核实功能范围**。[N1] | World Partition 将一个持久 Level 按网格分区，按 streaming source 加载/卸载内容；这是世界内容流送，不等于多个专用服务器间迁移实体/模拟权。[U5] | **未核实**；公开材料不足以区分资源流送、场景切换和服务端空间分片。[T1] |
| **F 跨服** | **未核实**。 | 可用 Base/Cell 迁移、实体调用/服务端脚本和应用层服务组织跨服玩法；本机仓库没有足够材料确认“跨服战场标准产品流程”、多服匹配或数据归属策略。玩家迁移实现细节**未核实**。[K7][K10] | Session/Channel/Task 等中间件抽象可用；跨世界服匹配、玩家实体跨节点迁移、数据服/源服权威规则**未核实**。[D1] | 官方 Matchmaker 将活动玩家按 ticket 条件匹配；Match completion/跨服玩家迁移策略由应用/编排层实现。跨 realm 角色实体迁移不是所核实的内建保证。[N1][N3] | OSS/Online Subsystem 提供 session/lobby 等网络游戏基础能力，不构成 MMO 跨服战场/角色实体迁移方案。地图 travel 与不同服务器进程间的角色所有权转移不可混为一谈；项目自研部分**未核实**。[U4][U6] | **未核实**；未找到公开材料足以说明跨服玩法实现。[T1] |
| **G 玩家实体** | **未核实**。 | Player 与 NPC 均以 EntityDef 模型描述，但玩家常用 Proxy 特化客户端连接能力；具备 Base 与 Cell 两侧实体/状态分工。断线/重连后的完整恢复语义不能只从 Proxy/DB 写入推断，**未核实**。[K1][K8][K10] | 管理对象不应直接等同于游戏里的 Player/NPC Entity；连接由 ClientSession 表示，业务对象/恢复流程可由服务实现。玩家/NPC 同类、Base+Cell 拆分和重连语义**未核实**。[D1] | 账号/User、Session 与 Authoritative Match participant 是不同概念；没有通用 Player/NPC Entity 类或 Base+Cell 拆分保证。断线后 match participant 生命周期由游戏逻辑决定；持久账户数据与实时实体恢复不同。[N1][N2] | Pawn/Actor 可作为玩家与 NPC 的 gameplay 对象，PlayerController 表示玩家控制/连接一侧；是否同类完全由项目类层次决定。玩家断线重连、持久角色恢复及多进程拆分由项目实现。[U1][U4] | **未核实**；公开课程页不足以判断实体模型或掉线恢复。[T1] |

## 逐引擎说明与来源

以下“完整度”是**本次六/七维可复核程度**，不是产品能力评分。源码路径按调研机绝对路径记录，代码可能随分支/版本变化。

### 1. BigWorld — 资料不足

**完整度：不足。** 用户给定路径 `/home/cui/workspaces/kbengine/BigWorld-Engine-14.4.1/` 存在但为空目录（2026-10-19 本机检查）。因此 A–G 都不能引用本机 `file:line`，也没有把 KBEngine 或网上二手文章里的 Base/Cell 拓扑倒灌成 BigWorld 结论。公开文档入口尝试 `https://docs.bigworldtech.com/`，本次抓取未成功；在找到可复核版本的 BigWorld server documentation / SDK 源码前，各维度均**未核实**。

可继续核查的入口：[BigWorld Engine docs（本次不可访问/未核实）](https://docs.bigworldtech.com/)。目录版本名本身不能作为任何架构结论的来源。

### 2. KBEngine — 资料完整度：部分（A–E、G 有代码证据；F 部分） {#2-kbengine--资料完整度部分a–e-g-有代码证据f-部分}

**A 契约**：`entity_defs/*.def` 声明属性的 `<Type>`、`<Flags>`、`<Persistent>`、默认值及 Base/Cell/Client 方法；`entities.xml` 决定实体有无 Base、Cell、Client。实体定义初始化代码建立 flags 映射，属性描述记录 flags/persistent/type。示例格式见本仓库现有的 KBEngine 定义文档和本机模板文件；当前模板 `Account.def` 是空属性示例，不能拿它证明字段集合。[K1][K2]

**B 同步**：`Proxy::initClientBasePropertys()` 初次向客户端发 Base client data；`Witness::update()` 在玩家客户端存在时对 view entity 批量构造更新 bundle，实体进入视野时先发属性/位置快照；`Entity::` 属性更新路径按可见性 flags 和 view/detail level 发给 Witness，数据以属性 UID/alias + 序列化值编码。自身与其他客户端的范围由 flags 区分；Cell 的 `Witness`/View 是 AOI 过滤入口。证据支持“初始快照+后续增量/逐属性变化”，不表示任意字段每帧全量。[K3][K4]

**C 持久化**：`EntityTableMysql::initialize()` 从 `getPersistentPropertyDescriptions()` 选择字段，按实体类型建映射项；`EntityTables::load()` 遍历实体脚本模块初始化 EntityTable，`syncToDB()` 同步表结构；`DBTaskWriteEntity` 把序列化数据交给 EntityTables 写入并回传结果。可证实有属性集合驱动的单实体类型表/字段同步；跨实体多表原子事务、属性拆表规则、可靠定时自动保存不能由这些代码断言。`ENTITYCALL` 持久化会被关闭。[K5][K6]

**D 拓扑**：本机源码有独立 `loginapp`、`baseappmgr`、`baseapp`、`cellappmgr`、`cellapp`、`dbmgr` 等 server 模块；BaseApp 监听外部 client interface，CellApp 通过 internal interface；Dbmgr 初始化 EntityDef 和 global/base/cell data。组件间使用引擎 Network/Bundle、消息接口和内部地址，而非一条单体服务器循环。[K7][K8]

**E 地图**：`SpaceMemory` 管理实体、空间坐标节点和进入/离开世界；CellApp 有 Space/坐标结构与 Witness 更新。现有证据不足以把“多个 CellApp 上空间/ghost 复制”简化为玩家跨块无感迁移；也不足以给出切图延迟/是否客户端 loading 的通用答案。[K4][K9]

**F 跨服**：源码显示可由服务端组件/EntityCall/迁移 API 编排实体和客户端控制权，但这次没有完整追踪公开仓库的跨服战场/跨服匹配/玩家迁服业务链及持久数据归属。故不可声称是内建跨服方案；整体**部分/未核实**。[K7][K10]

**G 玩家与 NPC**：相同 EntityDef 机制定义游戏实体，Proxy 为具备客户端连接语义的类型；Base 与 Cell 各持实体侧状态，并通过 client/witness 关联。`giveClientTo()` 可将客户端控制权换绑到另一个 Proxy（源码只证明该 API 路径，不能据此推断断线自动重连、跨进程迁移完整性）。[K1][K3][K10]

本机证据索引：

- [K1] `/home/cui/workspaces/kbengine/kbe/src/lib/entitydef/entitydef.cpp:152-180`（实体定义路径与 flags）；`/home/cui/workspaces/kbengine/kbe/src/lib/entitydef/property.cpp:22-64`（属性描述、persistent 与 flags）；类型/实体定义范例 `/home/cui/workspaces/kbengine/docs/study/05-entitydef-and-entity-definition.md:58-82`（本机随源码文档）。
- [K2] `/home/cui/workspaces/kbengine/kbe/res/sdk_templates/server/python_assets/scripts/entities.xml:1-10`（hasClient/hasCell/hasBase 注册形式）；`.../entity_defs/Account.def:1-14`（该分发模板目前为空）。
- [K3] `/home/cui/workspaces/kbengine/kbe/src/server/baseapp/proxy.cpp:99-171`（自身 Base/Cell client 属性初始化）；`/home/cui/workspaces/kbengine/kbe/src/server/cellapp/witness.cpp:135-160,736-821`（视野初始化、初始属性快照、进入视野）。
- [K4] `/home/cui/workspaces/kbengine/kbe/src/server/cellapp/entity.cpp:720-792`（Witness 范围、detail level、属性 UID/alias 增量编码）；`/home/cui/workspaces/kbengine/kbe/src/server/cellapp/witness.cpp:955-1030`（位置/方向更新按变化位打包，更新 bundle 发客户端）。
- [K5] `/home/cui/workspaces/kbengine/kbe/src/lib/db_mysql/entity_table_mysql.cpp:136-211`（持久属性形成表映射项；Cell entity 位置/方向特殊持久字段）；`/home/cui/workspaces/kbengine/kbe/src/lib/db_interface/entity_table.cpp:117-143,169-234`（逐实体模块加载表、DB 表同步）。
- [K6] `/home/cui/workspaces/kbengine/kbe/src/server/dbmgr/dbtasks.cpp:328-396`（DB task 写 Entity/回调）；`/home/cui/workspaces/kbengine/kbe/src/server/dbmgr/dbmgr.cpp:267-327`（Dbmgr 加载实体定义并初始化 DB）；`/home/cui/workspaces/kbengine/kbe/src/lib/entitydef/property.cpp:47-51`（ENTITYCALL 不持久化）。
- [K7] `/home/cui/workspaces/kbengine/kbe/src/server/baseapp/main.cpp:58-64`（BaseApp 外部/内部接口启动）；`/home/cui/workspaces/kbengine/kbe/src/server/cellapp/main.cpp:58-62`（CellApp 内部接口启动）；`/home/cui/workspaces/kbengine/kbe/src/server/loginapp/main.cpp:58-63`（LoginApp）；目录 `/home/cui/workspaces/kbengine/kbe/src/server/{baseapp,baseappmgr,cellapp,cellappmgr,dbmgr,loginapp}`。
- [K8] `/home/cui/workspaces/kbengine/kbe/src/server/dbmgr/dbmgr.cpp:294-304`（全局/Base/Cell app data）；`/home/cui/workspaces/kbengine/kbe/src/server/baseappmgr/baseappmgr.cpp:14-17,61-75` 和 `/home/cui/workspaces/kbengine/kbe/src/server/cellappmgr/cellappmgr.cpp:14-18,58-70`（组件接口）。
- [K9] `/home/cui/workspaces/kbengine/kbe/src/server/cellapp/spacememory.cpp:362-415`（实体加入/离开 Space 与坐标节点）；`/home/cui/workspaces/kbengine/kbe/src/server/cellapp/space.cpp:31-54`（Cell Space 类型）。
- [K10] `/home/cui/workspaces/kbengine/kbe/src/server/baseapp/proxy.cpp:311-433`（客户端转交、Witness 解绑/重绑）；跨服战场/数据主权结论本次**未核实**。

### 3. Darkstar / Reddwarf — 资料完整度：不足（有公开历史源码，未完成逐实现审计）

Project Darkstar 后续以 Reddwarf Server 名称发布；公开 GitHub 仓库 README 说明其来源及 SGS API/server 模块。由此可以将其定位为较早期 Java game-server middleware，但不能把它描述成现代完整 MMO entity replication engine。公开 API 有 ManagedObject/ManagedReference、DataManager、ClientSession/Channel 与 TaskManager 等抽象，能确认管理对象/数据服务/任务模型，但本报告没有逐文件确认 DB 适配器、节点拓扑配置或客户端复制策略。A、B、E、F、G **未核实**；C 只确认对象持久化/事务方向，关系表映射未核实；D 仅确认源码有 server/boot/API 等模块，部署节点细节不足。[D1]

- [D1] [Reddwarf / formerly Project Darkstar 源码仓库](https://github.com/reddwarf-nextgen/reddwarf)（README 提及旧项目 Darkstar 与 Java.net SVN 源树；源码目录含 `sgs-server-api`、`sgs-server`、`sgs-boot`）；API 源码：[ManagedObject](https://github.com/reddwarf-nextgen/reddwarf/blob/sgs-server/sgs-server-api/src/main/java/com/sun/sgs/app/ManagedObject.java)、[DataManager](https://github.com/reddwarf-nextgen/reddwarf/blob/sgs-server/sgs-server-api/src/main/java/com/sun/sgs/app/DataManager.java)、[ClientSession](https://github.com/reddwarf-nextgen/reddwarf/blob/sgs-server/sgs-server-api/src/main/java/com/sun/sgs/app/ClientSession.java)、[Channel](https://github.com/reddwarf-nextgen/reddwarf/blob/sgs-server/sgs-server-api/src/main/java/com/sun/sgs/app/Channel.java)、[TaskManager](https://github.com/reddwarf-nextgen/reddwarf/blob/sgs-server/sgs-server-api/src/main/java/com/sun/sgs/app/TaskManager.java)。旧官网 `https://www.projectdarkstar.com/` 本次无法访问。未将未访问到的旧 API 文档当作结论依据。

### 4. Nakama（Go）— 资料完整度：部分（匹配/权威 match/storage 清晰，MMO 世界语义不适用）

Nakama 是开源游戏后端/多人游戏服务框架，不是“Go 版 BigWorld”。

- **A/B/G**：Authoritative Match 定义由服务端 runtime handler 编写，服务器验证输入，在固定 tick 内更新状态并向 relevant peers 广播；它不自动生成每个游戏对象的声明式 schema，也没有已核实的通用 Player/NPC 属性 replicator。Session、用户账号、match participant 与持久化对象是不同层次。[N1]
- **C**：Storage 以 collection + key + JSON object 存储，包含所有权/权限模型；官方文档推荐内建 Storage API，而非通过自建表实现引擎式实体映射。一次多对象写入支持 transaction；这不是自动保存游戏 Entity 字段。[N2]
- **D/F**：服务可部署扩展；Matchmaker 根据在线用户 ticket 的匹配条件组成 match，Match 生命周期/结算由业务逻辑决定。其 Match API 可用于匹配，但角色跨服迁移和跨 match 状态转移应另行设计。[N1][N3]
- **E**：所核实官方页面描述 match/room 实时对局，没有说明跨节点连续空间切分或 seamless entity handoff，因此标为未核实；不能把 match 当作世界分块。

来源：[N1] [Authoritative Multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/)（服务器权威、固定 tick、match handler、输入校验与广播）；[N2] [Storage Collections](https://heroiclabs.com/docs/nakama/concepts/storage/collections/)（collection/key/JSON、权限、事务写）；[N3] [Matchmaker](https://heroiclabs.com/docs/nakama/concepts/multiplayer/matchmaker/)（在线 ticket pool 与周期性匹配）；[Architecture Overview](https://heroiclabs.com/docs/nakama/getting-started/architecture/)（部署架构入口）。

### 5. Unreal Dedicated Server — 资料完整度：部分（网络/地图文档强，后端与跨服由项目决定）

Unreal 的 Dedicated Server 是 headless、server-authoritative 的游戏进程模式，并非完整 MMO 后端产品。Epic 官方 dedicated server 指南把它描述为无本地玩家、负责权威游戏状态和客户端信息的 server；服务器实例部署、账号/角色 DB 与 MMO 匹配层需区分。[U1]

- **A/B**：Actor/Component 与反射属性声明是客户端与服务端的游戏对象契约；属性复制通过 replicated property 机制，Actor relevancy/owner、条件、频率与 Replication Graph 控制网络负载。该机制同步的是网络 Actor 状态，不等同于持久化 schema。[U2][U3]
- **C**：没有通用 Entity property-to-DB 层；保存实现留给项目代码/后端。DB schema 和写回策略未由 Dedicated Server 功能决定。
- **D/F/G**：基础玩法是 client-server authoritative host；产品形态可按实例水平部署，Epic 基础指南没有规定跨服 world service 拓扑。`PlayerController`/`Pawn`/`PlayerState` 等对象分工可以映射游戏语义，但同一 Actor 类可供 AI/玩家控制，是否共用由游戏实现。断线重连与角色恢复不是自动由 replication 等同保证的能力。[U1][U4]
- **E**：World Partition 按 runtime grid 将单一 persistent Level 划成可流送 cells，依据 streaming source 加载/卸载内容。官方文档讲的是世界数据管理与客户端/运行时 stream；并未证明 server shard 间的动态空间迁移。[U5]

来源：[U1] Epic [Setting Up Dedicated Servers](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-dedicated-servers-in-unreal-engine)；[U2] [Networking and Multiplayer](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-and-multiplayer-in-unreal-engine)；[U3] [Replicating Actor Properties](https://dev.epicgames.com/documentation/en-us/unreal-engine/replicating-actor-properties-in-unreal-engine) 和 [Replication Graph](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine)；[U4] [Sessions Interface](https://dev.epicgames.com/documentation/en-us/unreal-engine/online-subsystem-session-interface-in-unreal-engine)；[U5] [World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine)。

### 6. 腾讯公开商业资料样本（不是已证实的实体引擎）— 资料完整度：不足

为满足国内商业公开资料覆盖，纳入腾讯游戏学堂“游戏支撑系统”公开课程条目作为**公开资料样本**。该来源证明有腾讯游戏相关公开课程，不足以确认课程内容与某个商业 MMO 引擎对应，更不足以给出声明格式、复制、DB 映射、进程拓扑、地图分片、跨服和玩家恢复细节。因此 A–G 均记**资料不足，仅按公开信息 / 未核实**，不对腾讯内部引擎或某款游戏架构做归因。

- [T1] [腾讯游戏学堂：课程详情 10250「游戏支撑系统」](https://gameinstitute.qq.com/course/detail/10250)。课程列表页面标题/分类可见，但本次未取得可核实的架构细节。可用作后续查找公开演讲的入口，而非本比较中的技术事实来源。

## 横向观察

### 可观察到的共识

1. **实时模拟的权威端与数据保存责任要区分**：KBEngine 将 Base/Cell 与 DBMgr 解耦；UE Dedicated Server 的 server-authoritative 语义也不自带业务 DB；Nakama 则显式把 match 状态逻辑与 Storage API 区分。借鉴重点是定义状态 owner、保存触发和 ACK，不是照搬组件名称。[K7][K6][U1][N1][N2]
2. **网络同步需要兴趣/接收者过滤**：KBEngine Witness/View + flags，UE relevancy/Replication Graph，Nakama match handler 的 relevant peer 广播各自解决不同粒度的订阅。全量广播通常不是大型场景的默认策略；具体 AOI 结构并非通用标准。[K3][K4][U2][U3][N1]
3. **“地图分块”有多种语义**：资源/Actor streaming、玩法 Scene/Match 分房、服务端模拟权分片是不同问题。UE World Partition 证据支持前者，Nakama Match 支持房间式对局；都不能未经额外实现称为 BigWorld 式服务端无缝空间迁移。[U5][N1]
4. **声明式实体模型利于生成同步/序列化元信息，但带来 schema 约束**：KBEngine 的 `.def` 同时描述类型、同步 flags、持久字段；UE 反射/复制描述偏网络对象模型；Nakama Match 则用代码自定义状态。越自动化，越需版本迁移与兼容管理。

### 主要流派差异与取舍

| 流派 | 代表 | 收益 | 成本/边界 |
|---|---|---|---|
| **引擎级实体运行时 + 多角色进程** | KBEngine；BigWorld 此次因资料缺失不能作事实对比 | Entity schema、复制、空间、保存可以形成统一约定；按职责进程扩容 | 组件间 RPC/迁移/故障恢复复杂，schema 深度绑定框架；BigWorld 具体取舍未核实 |
| **事务/对象式服务器中间件** | Darkstar/Reddwarf | 对象生命周期、事务/持久化 API 有中间件级抽象 | 不等于现成 MMO AOI、无缝地图或跨服实体引擎；历史源码维护状态和今天的生产适用性需单独评估 |
| **权威 match / 游戏后端平台** | Nakama | 适合房间、匹配、实时对局、账号与元数据后端；业务逻辑入口清晰 | 游戏状态结构和实体同步多由业务代码定义；与 persistent world 分片不是同一层 |
| **游戏引擎内置联网** | Unreal Dedicated Server | 游戏对象、复制和内容工具链一体，适合实例服/项目自定义后端 | Dedicated Server 本身不解决运营型 MMO 的数据归属、跨服、在线迁移和角色 DB；World Partition 不能替代 server shard |
| **商业厂商自研（公开资料稀疏）** | 腾讯公开课程样本 | 可从公开分享学习具体项目工程经验 | 外部无法审计完整代码和边界；公开材料不足时只能记“未核实”，不可由产品/公司名推导架构 |

## 对 Mistlane 的启示

Mistlane 当前文档把目标中的 `gameServer / crossServer / data / coordinator` 划分为服务责任，而非已实现的 MMO runtime；当前代码主要有通用网络转发、Lua 执行、路由与准入，完整 Avatar/Scene/存档链仍未实现。[M1][M2]

### 可直接借鉴（作为设计约束，不等于立即实现）

1. **先定权威和数据所有权，再实现迁移**：明确每个 Avatar 同时只能有一个可写 owner；定义 home data 与临时跨区模拟服的读写边界、迁移快照、generation/ACK、失败补偿。这个方向与 Mistlane 现有的单写者/归属目标一致。[M1][M2]
2. **属性声明拆成独立正交策略**：至少区分网络同步 audience/AOI、持久化、客户端可写、更新频率/精度。不要把“客户端可见”自动推导为“可保存”或“客户端可修改”。KBEngine flags+Persistent 是可参考的模型，但其 flags 枚举不必原样复制。[K1][K3][K5]
3. **增量同步与进入视野快照采用不同路径**：进入 AOI 时先给稳定的实体初始化快照，之后按变化编码；给广播设置明确接收者集合、节流和字节上限。先在 Mistlane 的实体/场景契约成熟后做小规模验证，不要先做任意世界分片。[K3][K4][M2]
4. **持久化 schema/写回可审计**：持久字段白名单、序列化版本、dirty tracking、异步批量写、幂等 key、错误/超时回调及耐久确认分开定义。实体状态落库与交易/邮件等强一致事务记录不可混成一个自动 ORM。[K5][K6][N2]
5. **跨服先按实例/战场匹配落地**：Nakama 型 ticket/match 与 Mistlane 已有的 crossServer 房间归属/拒绝超额等模型接近；可以验证匹配、容量和入场边界，但匹配成功不等同于玩家实体完成迁移。[N3][M2]
6. **对外部适配器保持接口边界**：参考 UE 生态作为可能的客户端/实例服务，而不把 Unreal Actor 网络复制当作 Mistlane 服务端属性/DB 契约；地图资源加载也不代替服务端模拟 owner handoff。[U2][U5]

### 不宜直接照搬

- **不直接照搬 BigWorld Base/Cell 进程拆分**：此调研未取得 BigWorld 本机源码或足够一手资料，且 Mistlane 的 Base/Cell 等价职责并未定义/实现。只有负载剖析和 ownership/迁移协议成熟后再讨论空间进程拆分。
- **不把 UE World Partition 当成分布式模拟**：它管理 Actor/Level 数据加载，官方资料不证明多专用服共享连续世界状态。[U5]
- **不把 Nakama Match 的生命周期等同持久角色实体**：Match 是对局/状态机 API；玩家角色长生命周期、跨 match 归属、重连恢复应由 Mistlane 的 Avatar/data 合约另行定义。[N1][N2]
- **不照搬 KBEngine 的隐式保存假设**：当前证据能确认 persistent 描述与 DB 写 task，却不足以推出任意属性改动必然及时落库。Mistlane 应显式定义 dirty、save 请求、提交/确认、崩溃窗口与恢复规则。[K5][K6]
- **不从厂商分享标题外推内部架构**：腾讯样本仅证明公开课程资料存在；在取得具体演讲正文/录屏并核对原文前，七个维度继续保持未核实。[T1]

### Mistlane 证据

- [M1] 本仓库 `docs/architecture.md:3-25,58-80,100-112`：目标责任拓扑与当前运行实现边界。
- [M2] 本仓库 `docs/player-scene-model.md:5-35,48-64,92-104`：Session/Avatar/home data、迁移约束、现有实现状态和无缝分片边界；`docs/cross-server.md:28-63`：目前跨服路由、房间准入与未实现状态迁移。

## 参考来源清单

本报告中的源码证据以 [KBEngine 小节](#2-kbengine--资料完整度部分a–e-g-有代码证据f-部分) 的 K1–K10 为准；其余可访问官方/项目链接：

1. BigWorld docs 入口（本次抓取失败，非已核实内容）：<https://docs.bigworldtech.com/>。
2. Reddwarf 源码（README 说明 formerly Project Darkstar）：<https://github.com/reddwarf-nextgen/reddwarf>。
3. Nakama 官方文档：<https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/>、<https://heroiclabs.com/docs/nakama/concepts/multiplayer/matchmaker/>、<https://heroiclabs.com/docs/nakama/concepts/storage/collections/>。
4. Epic 官方文档：<https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-dedicated-servers-in-unreal-engine>、<https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-and-multiplayer-in-unreal-engine>、<https://dev.epicgames.com/documentation/en-us/unreal-engine/replicating-actor-properties-in-unreal-engine>、<https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine>、<https://dev.epicgames.com/documentation/en-us/unreal-engine/online-subsystem-session-interface-in-unreal-engine>、<https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine>。
5. 腾讯游戏学堂公开课程条目：<https://gameinstitute.qq.com/course/detail/10250>（仅作为公开信息入口，未用来推断引擎内部设计）。
