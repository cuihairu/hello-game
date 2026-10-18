# 属性同步与契约持久化：BigWorld vs KBEngine

> 来源：mistlane 仓 docs/entity-sync-persistence.md（2026-10-19）
> 证据基础：本机源码 /home/cui/workspaces/kbengine/ 下的 BigWorld-Engine-14.4.1 与 KBEngine
>
> **性质：源码级调研结论，每条均标注了 文件路径:行号 或官方文档 URL。**
> Mistlane 仓 docs/entity-contract.md 已有 .def 契约提案，本文补全链路，不替代它。

---

# BigWorld 与 KBEngine：属性同步和契约数据保存

## 范围、证据与已有提案的关系

本文核实“契约 → 运行时属性 → 可见副本 → 二进制表示 → 数据库 → 契约演进”的链路，讨论设计理由与代价。**这是引擎行为研究，不表示 Mistlane 已实现这些能力。** 数据保存指实体属性持久化，不是把 `.def` 文件存入数据库。

[entity-contract.md](./entity-contract.md) 已覆盖 Mistlane 的 XML `.def` 提议、稳定 ID、生成物、受控 Lua 属性、嵌套增量、可见基线和数据版本迁移目标；其中 “Verified BigWorld and KBEngine behavior” 已核实两边的容器变更差异。本文保持该结论，新增两边实际的分发 flags、AOI、stream 编码、SQL 映射、写回/缓存和迁移入口对比。原提案的 sproto、home data、revision/ownership generation 不能倒推为两套引擎的现有机制。

核实日期：2026-10-19。版本边界：

- **BW 本机源码：未核实。** 任务指定的 `/home/cui/workspaces/kbengine/BigWorld-Engine-14.4.1/` 本次检查为空目录（无源文件），因此不能声称本轮读过 BigWorld 本机实现。原草稿保留的 **BW-S** 结论来自公开 BigWorld 2.0.1 源码镜像，提交 `481e69a837a9f6d63f298a4f24d423b6329226c6`；它不是本机源码，也不是仍在维护的官方发布站，部分服务端 `.cpp` 缺失。对这些代码结论只能视为该镜像的静态证据，不外推到本机 14.4.1。
- **BW-G**：Server Programming Guide / Server Operations Guide 的公开归档；编程指南首页标注 **BigWorld 2.1 (2012)**，不是 14.4.1。文档证据与 2.0.1 镜像证据分开标注，不宣称版本一致；该归档 URL 也不替代缺失的本机源码。
- **KB 本机源码**：`/home/cui/workspaces/kbengine`，分支 `master`，本次检出的提交 `c9ca49ed848f597f3fe66cee831638b7043a5c62`（相对 `origin/master` ahead 1，工作区干净）。正文与来源索引给出可复核的本机路径和行号；它不是其他分支、Nex 或商业衍生版。原草稿中的 KB 链接仍固定在旧提交 `7d379b9f943d2731b09c45398855f98efe74d046`，现以本机文件行号作为本次核对依据。
- **已核实**指所引本机 KB 源码路径可静态追踪，或所引指南明确说明；BigWorld 代码结论不属于本轮本机核实。未运行两套引擎及数据库集成测试。**设计分析**是推论，不冒充作者动机；缺少证据的说法明确标为**未核实**。

来源：[BW 源码镜像][bw-root]、[原厂编程指南版本页][bw-guide]、[KBEngine 源码][kb-root]。

**读取限制提示：**下文仍保留前稿中由 BW-S 镜像和 BW-G 归档支持的结论，不覆盖 `entity-contract.md` 已核实的容器回调结论；但本次未能按任务要求在指定本机目录复查 BigWorld 代码。任何只由 BW-S 支持、又未由指南确认的实现细节，均不应当作 14.4.1 的已证事实。

## 逐项对比表

表内来源代号指向文末固定源码或原厂文档；后续五节展开条件和例外。

| 环节/问题 | BigWorld | KBEngine | 来源 |
|---|---|---|---|
| 1. 契约入口 | `scripts/entities.xml`、`entity_defs/*.def`；`alias.xml` 定义类型别名 | `scripts/entities.xml`、`entity_defs/*.def`、`types.xml`；加载为 ScriptDefModule / PropertyDescription | BW-E；KB-E、KB-T |
| 1. 类型/默认值 | `<Type>`、`<Default>`；DataType 构建类型和值 | `<Type>`、`<Default>`；DataTypes 注册及类型工厂 | BW-D；KB-E、KB-P |
| 1. 分发 flags | XML `BASE`、`OWN_CLIENT`、`ALL_CLIENTS` 等映射为 `DATA_*` | XML 同名范围映射为 `ED_FLAG_*`，再形成 `ENTITY_BROADCAST_*` 掩码 | BW-F；KB-F |
| 1. 持久化/编辑 | `<Persistent>` 独立于分发；`<Editable>` 与 `EDITOR_ONLY` 不同 | `<Persistent>` 独立布尔值；通用 `editor` 标签未核实，`broadcast` 由范围掩码表达 | BW-F；KB-E、KB-F |
| 2. 变更触发 | Cell 权威属性赋值及受控容器变更触发传播；Base 有例外 | 实体属性赋值入口调用 `onDefDataChanged`，Base/Cell 分别分发 | BW-GP、BW-C；KB-M、KB-B、KB-C |
| 2. 自身/他人 | OWN 给拥有者；OTHER 给 AOI 观察者；ALL 为两者 | 对应 OWN/OTHER 掩码；OTHER 遍历 witnesses 并检查实际 view、距离级别 | BW-GP；KB-C |
| 2. Base 到客户端 | BW-G 明确 `BASE_AND_CLIENT` 只在创建时同步，后续须方法传递 | KB-S 的 Base `onDefDataChanged` 会向绑定客户端发送后续更新 | BW-GP；KB-B |
| 2. 增量/全量 | 初始可见数据；随后单属性、嵌套路径及 slice 变更 | 初始可见属性集合；随后变更属性的完整类型值；普通容器原地变更不能假定自动通知 | BW-C、BW-PC；KB-W、KB-C、KB-M |
| 2. AOI/过滤 | Cell/Witness 管兴趣范围，属性 flags、LOD 决定可发内容 | Cell ViewTrigger/Witness 管观察关系；分发再检查 view 和属性 DetailLevel | BW-W；KB-W、KB-C |
| 3. 字段映射 | `tbl_<Entity>`、`sm_` 字段及序列子表；DataType → PropertyMapping | `tbl_<Entity>`、`sm_` 字段；标量/字典映射和 ARRAY/组件子表 | BW-PM；KB-SQL |
| 3. DDL 生成 | `sync_db` 读取定义并生成/执行 CREATE/ALTER/DROP；可由配置启动子工具 | 非 pure 数据库初始化时 EntityTables 同步，生成/执行 DDL | BW-SYNC、BW-TS；KB-DBI、KB-SQL |
| 3. 写回时机 | 显式 `writeToDB`、自动 archive；secondary DB 可批量提交后归并 | 显式 `writeToDB`、周期 Archiver、带保存选项的销毁路径 | BW-DB、BW-CFG；KB-B、KB-A |
| 3. 缓存/flush | 活实体内存、同实体 DB 任务队列；可选 SQLite secondary DB | 活实体/Cell 数据、持久化摘要、同实体 DB 任务队列；不等于独立持久缓存 | BW-BUF、BW-CFG；KB-B、KB-Q |
| 4. 网络表示 | DataType + BinaryOStream；属性索引/路径编码，嵌套与 slice 有专门格式 | DataType + MemoryStream；`onUpdatePropertys`，实体标识及组件/属性 UID 或 uint8 别名 | BW-PC、BW-D；KB-C、KB-R、KB-AL |
| 4. “首字节” | BW-S 未找到把属性 flags 命名为 `UTYPE_` 的依据 | 外层消息 ID 是 uint16；属性别名可为 uint8；固定 `ENTITY_PROPERTY` 首字节未核实 | BW-F；KB-F、KB-N、KB-R |
| 5. 已存数据变化 | 工具对齐列/表；有新增默认值处理，复杂语义须项目迁移 | 初始化同步可加/改/删列并删旧表；复杂语义仍须项目迁移 | BW-SYNC、BW-PM；KB-SQL、KB-TABLES |
| 5. 网络兼容 | 双端依赖匹配定义/索引，不是自描述的 XML 消息 | UID/别名和 DataType 依赖匹配定义；定义摘要不是数据迁移 | BW-E、BW-PC；KB-AL、KB-H |

## 1. 契约定义：声明什么，谁解释

### BigWorld

实体清单注册类型；EntityDescription 解析 `.def` 的属性、父类/接口和方法，DataDescription 保存类型、flags、默认值等元数据。DataType 负责校验、默认值和序列化，不是由 Python 任意对象的成员列表直接推导网络/数据库结构。

```xml
<root>
  <Properties>
    <hp>
      <Type>UINT16</Type>
      <Default>100</Default>
      <Flags>ALL_CLIENTS</Flags>
      <Persistent>false</Persistent>
    </hp>
  </Properties>
</root>
```

XML 范围映射可在 BW-S 的 `s_entityDataFlagMappings` 直接核对：

- `BASE` → `DATA_BASE`；`BASE_AND_CLIENT` 再加 `DATA_OWN_CLIENT`。
- `CELL_PRIVATE` → 分发位为 0；`CELL_PUBLIC` → `DATA_GHOSTED`，允许其他 Cell 的 ghost 获取。
- `OWN_CLIENT` → `DATA_OWN_CLIENT`；`OTHER_CLIENTS` → `DATA_GHOSTED | DATA_OTHER_CLIENT`。
- `CELL_PUBLIC_AND_OWN`、`ALL_CLIENTS` 是上述位的组合；ALL 的客户端集合受 AOI 限制。
- `<Persistent>` 加入独立 `DATA_PERSISTENT`；默认构造不含此位。`<Editable>` 控制编辑器可编辑性；`EDITOR_ONLY` / `DATA_EDITOR_ONLY` 表示仅编辑器数据，不能混同。

默认值可来自类型/别名和属性声明；固定长度数组须按长度初始化。`databaseID` 是数据库身份，运行时 `id` 不适合作永久引用。

**关于任务中的 `UTYPE_`：未核实它是 BigWorld 属性 flags。** 本次 BW-S 的 DataDescription 使用 `DATA_*`，不是 `UTYPE_*`；不把 USER_TYPE（用户类型）、类型 ID、属性索引或 KBEngine 的 Utype 混为分发位。其他 BW 版本是否有该命名，未核实。

来源：BW-S [EntityDescription][bw-e]、[DataDescription 解析][bw-f]、[flags 定义][bw-fh]、[DataType][bw-d]；BW-G 的[属性声明与默认值][bw-gp]、[数据库身份][bw-db]。

### KBEngine

EntityDef 加载实体、类型、接口/父类和属性；`loadDefPropertys` 查找 `<Flags>`、`<Type>`，解析 `<Persistent>`、`<Default>`、`<Utype>`、`<DatabaseLength>`、`<Index>` 和 `<DetailLevel>`，构造 PropertyDescription，纳入执行侧和持久化描述集合。

上面的 hp 示例也符合这部分 KBEngine XML 结构，但不表示完整 `.def` 或 wire 兼容。KB-S 对属性缺少 Flags/Type 会报错；Persistent 缺省为 false，默认值交给具体 DataType 创建。`types.xml` 提供别名、ARRAY、FIXED_DICT 等组合类型。

- 分发常量是 `ED_FLAG_BASE`、`ED_FLAG_BASE_AND_CLIENT`、`ED_FLAG_CELL_PRIVATE`、`ED_FLAG_CELL_PUBLIC`、`ED_FLAG_OWN_CLIENT`、`ED_FLAG_OTHER_CLIENTS`、`ED_FLAG_ALL_CLIENTS`、`ED_FLAG_CELL_PUBLIC_AND_OWN`。
- `ENTITY_BROADCAST_CELL_FLAGS`、`ENTITY_BROADCAST_OWN_CLIENT_FLAGS`、`ENTITY_BROADCAST_OTHER_CLIENT_FLAGS` 是这些范围的派生掩码，**没有证据表明应写成 `<broadcast>true</broadcast>`**。
- persistent 是描述对象的布尔策略，不是要求业务把它 OR 入范围枚举。
- **通用 `editor` / `<Editor>` 属性标记未核实**：已检查的 `loadDefPropertys` 和 PropertyDescription 未见相应读取/成员；不能把 BigWorld 的 Editable 直接套入 KBEngine。本文不对其他分支作否定结论。
- Utype 是属性标识；KB-S 的 `ENTITY_PROPERTY_UID` 为 uint16。可显式指定或由引擎分配；它不携带 persistent/editor/broadcast 的布尔语义。

来源：KB-S [EntityDef 加载][kb-e]、[类型注册][kb-t]、[PropertyDescription][kb-p]、[flags 与 UID][kb-f]；[官方定义格式][kb-defdoc]。

## 2. 属性同步：从一次赋值到可见副本

### BigWorld

Cell 中权威属性改变后，引擎根据定义向 ghost、拥有者和观察者传播。OWN_CLIENT 只给拥有者；OTHER_CLIENTS 给观察该实体的客户端；ALL_CLIENTS 是两者集合，不是全服广播。Cell 的空间兴趣管理与 Witness 决定谁观察，属性 LOD 再减少远处可见细节。

BW-G 明确的例外是 **BASE_AND_CLIENT 仅创建客户端实体时初始化，Base 后续修改不自动推送，需要方法传递**。不能只看 flags 中有 DATA_OWN_CLIENT 就承诺所有赋值自动同步。

初次创建副本时需要可见属性的初始化数据，后续普通属性按变更发送；顶层替换发送该属性值，容器内部变更可表示为路径、单项和 slice 操作。BW-S 有 PropertyOwner、PropertyChange、SinglePropertyChange、SlicePropertyChange；BW-G 有 `set_<property>`、`setNested_<property>`、`setSlice_<property>` 回调。**保持原文已核实结论：BW 不仅支持顶层赋值。**

逻辑单位是属性变更事件，不是每次把整个实体全量重发；传输 bundle/packet 可承载多条消息，不应把一次属性写入等同一次 UDP 包。本文不承诺 2.0.1 的所有版本都合并同 tick 重复写；2.1 指南中的 SendLatestOnly/IsReliable 是版本化选项，不能据此宣称缺省只发送最终值。掉出 AOI 后再进入的具体缓存复用/事件补发策略，本次未逐条核实，不宣称一律完整重建。

来源：BW-G [分发、LOD、传播与带宽选项][bw-gp]、[客户端属性回调][bw-callback]、[Witness][bw-w]；BW-S [PropertyOwner][bw-po]、[PropertyChange 编码][bw-pc]。

### KBEngine

KB-S 的可追踪链路：

1. `entity_macro.h` 属性赋值分支检查定义/类型，调用 Entity 的 `onDefDataChanged`。
2. Base 初始化阶段跳过通知；持久化属性标脏；若为 BASE_AND_CLIENT 且绑定了客户端，则构造 `onUpdatePropertys` 下发。**这与前述 BW-G 的 Base 例外不同。**
3. Cell 只在 real entity 且非初始化阶段分发；按掩码更新 ghost、其他客户端和自身客户端。
4. OTHER 分支遍历 `witnesses_`；检查观察者、连接、`entityInView(id)`，再按属性 DetailLevel 距离过滤；OWN 分支单独发送。
5. 值由 `propertyDescription->getDataType()->addToStream` 编码。一次赋值通知的逻辑载荷是该属性的类型值；bundle 可以积累消息，不能假定每 tick 只保留最后一次赋值。

Witness 处理 `ENTER_CLIENT_PENDING` 时调用 `addPositionAndDirectionToStream` 和 `addClientDataToStream(..., true)`，先发初始化属性，再发 enter-world；退场有 leave-pending 路径。这里的“全量”是**该接收方被允许看到的属性集合**，不含私有字段或整份数据库记录。

**容器限制保持原结论**：普通 FixedDict 和 Sequence 的原地元素/slice 修改，在已检查路径中未见 owner entity 通知；不能假定自动产生网络增量。顶层重新赋值会走属性通知并编码该容器值。EntityComponent 有独立通知机制，不是任意深度容器路径增量的证明。保存时重新序列化可能读到修改后的容器，也不证明该修改已实时同步。

当前入口、基线和过滤路径已核实；跨断线恢复、所有 LOD 切换的补齐、混合客户端版本的完整恢复状态机**未核实**，不能补写为 Mistlane 提议中的 sequence-gap/rebaseline 协议。

来源：KB-S [赋值入口][kb-m]、[Base 分发][kb-b]、[Cell 分发][kb-c]、[Witness 初始化/退场][kb-w]、[FixedDict][kb-fd]、[Sequence][kb-seq]、[EntityComponent][kb-comp]。

## 3. 契约持久化：从定义到 SQL，再到写回

### BigWorld

加载的 EntityDescription/DataDescription 同时供数据库映射使用。持久化流通过 `ONLY_PERSISTENT_DATA` 筛选；base/client、cell/client 等数据域有固定遍历组织，不直接把 XML 或 Python 对象内存写入数据库。内置位置/方向等保存规则还需按引擎处理，不只枚举业务字段。

MySQL 后端的 PropertyMapping 按 DataType 生成列/子表映射：主表 `tbl_<Entity>`，数据库 ID 在 `id`；标量一般映射到主表列，向量分量和 FIXED_DICT 字段展开，ARRAY/TUPLE 使用子表及父记录关联。字符串/二进制/用户类型有专门映射，不应概括为“所有类型都是同一种 BLOB”。加载时由对应映射重建类型值；非持久化属性重新初始化。

`sync_db` 的 MySqlSynchronise / MySqlTableInitialiser 比较定义和实际结构，生成并执行 CREATE、ALTER、DROP，包括新增/删除/修改列。**已核实的是工具生成并执行 SQL，不是每次构建必定输出一份可审阅 `.sql` 文件**。`syncTablesToDefs` 启动选项可经 TableSynchroniser 拉起独立工具；生产可关闭自动结构修改，先维护数据库。

写入由 Base 的 `writeToDB` 管理，必要时收集 Cell 状态；显式写入是异步并有完成通知。自动 archive 按 `baseApp/archivePeriod` 调度，不是每次赋值立刻 UPDATE。销毁是否保存还取决于选项/生命周期策略，不能把任意 destroy 当成强制落盘。

缓存和 flush 要分三层：

- 活实体的内存值是在线状态；Base 保存路径取得要持久化的数据。
- MySQL 后台任务按同一实体身份缓冲/串行化，防止同实体任务乱序；队列不是持久日志，也不是业务可任意查询的缓存数据库。
- 启用 secondary DB 时，BaseApp 写本地 SQLite；自动 archive 可以按 `secondaryDB/maxCommitPeriod` 批量 commit，显式 writeToDB 触发 commit。随后由 `consolidate_dbs` 在关服/异常后启动恢复等流程归并到主库。**SQLite 已提交与主 MySQL 已更新是两个时刻**；归并前不能只备份主库并假定最新状态齐全。

未启用 secondary DB 时由 DBMgr/MySQL 后端执行写入；数据库提交/磁盘可靠性仍取决于数据库配置。网络送达、内存 backup、SQLite 提交、主库提交不能共用“已保存”这一含糊承诺。

来源：BW-S [持久化筛选][bw-e]、[PropertyMapping][bw-pm]、[DDL 同步][bw-sync]、[同步子工具启动][bw-ts]、[同实体队列][bw-buf]、[Base 保存接口][bw-base]；BW-G [数据库映射/写入/secondary DB][bw-db]、[archive/SQLite commit 配置][bw-cfg]、[归并及 sync_db 运维][bw-ops]。

### KBEngine

启动时 DBMgr 初始化 EntityDef；DBUtil 的数据库初始化加载 EntityTables，非 pure 数据库调用 `syncToDB`。EntityTableMysql 从持久化属性描述建立 TableItem：基础数值对应数值列，向量展开分量，FIXED_DICT 递归组织字段，ARRAY/EntityComponent 建子表。表/字段前缀分别为 `tbl_`、`sm_`，子表记录有父 ID。DatabaseLength/Index 影响适用类型的长度和索引；不是所有 DataType 都可无差别索引。

`sync_item_to_db` / `EntityTableMysql::syncToDB` 生成并执行 SQL，EntityTables 汇总子表同步；同样**未核实默认生成离线 SQL 脚本文件**。启动 DDL 的删除和类型变更风险在第 5 节说明。

运行时写回路径：

1. Base 显式 `writeToDB`，或 Archiver 按 `archivePeriod` 将已有数据库记录、允许自动保存的实体分散到各 tick；`destroy` 带写回选项也进入保存路径。
2. 有 Cell 时先请求 `reqWriteToDBFromBaseapp`，完成后进入 `onCellWriteToDBCompleted`；保存钩子包含 `onPreArchive` / `onWriteToDB`。
3. `addPersistentsDataToStream` 构造持久属性流；Base 比较完整持久流的 SHA1 摘要，相同则跳过此次实际 DB 写入。它不是网络路径增量，也不是每属性 SQL UPDATE 日志。
4. 变更流发往 DBMgr `writeEntity`，Buffered_DBTasks 以 DBID 或新实体运行时 ID 排队，DBTaskWriteEntity 调用 EntityTables / EntityTableMysql，解码为列值、执行 INSERT/UPDATE 和子表操作。
5. DB 任务返回结果后发回 `onWriteToDBCallback`，更新数据库身份并调用回调。不能将调用函数返回或把消息放进队列视为数据库成功。

缓存包括在线实体、Base 中的 Cell 数据、持久化摘要及排队任务。源码中摘要在提交 DB 任务前更新，且存在“摘要相同直接 return”的路径，**不能将该摘要称为最后已成功提交的 revision，也不能承诺每次 writeToDB 都触发数据库操作/回调**。失败重试、保存期间新变更及回调完整性需要专项验证。

本次未找到与 BW secondary SQLite → MySQL 归并对等的通用机制；**未核实 KBEngine 有独立的属性持久化缓存及可调用 flush API**。此处可核实的 flush 含义只是将选定内存快照送入异步 DB 任务并等待结果；MySQL 的事务、fsync、跨实体原子性/宕机持久性不由属性同步机制保证。

来源：KB-S [DBMgr 初始化/写入入口][kb-db]、[数据库初始化][kb-dbi]、[EntityTables][kb-tables]、[MySQL 字段与写入][kb-sql]、[Base 保存及摘要][kb-b]、[Archiver][kb-a]、[排队][kb-q]、[DBTaskWriteEntity][kb-task]。

## 4. 网络表示：类型值、属性标识与外层消息

### BigWorld

`DataType::addToStream` / `createFromStream` 与 DataDescription/EntityDescription 共同控制二进制读写；数值按声明宽度、容器按类型结构处理，接收方需要相同定义。初始化/持久化使用相应数据域筛选，不能把数据库流和面向观察者的流逐字节视为同格式。

BW-S 的 PropertyChange 编码区分简单顶层属性、扩展单项和 slice：低编号顶层属性可使用消息标识编码；复杂路径通过 BitWriter 写路径索引/继续位等信息，实际值仍由 DataType 编码。这里“增量”主要是只传变更字段/容器操作，不是普遍发送 `newValue - oldValue`。定义索引、路径、消息封装共同构成格式，不能抽象成统一的 `{name, JSON value}`。

来源：BW-S [DataType][bw-d]、[EntityDescription 流][bw-e]、[PropertyChange][bw-pc]、[读取器][bw-reader]。

### KBEngine，以及 `ENTITY_PROPERTY` 首字节说法

KB-S 的已核实表示分为三层：

```text
外层：message ID:uint16 + [可变长消息长度] + message body
普通属性更新 body：entityID + { componentPropertyID, propertyID, typedValue }...
优化属性更新 body：view 中的 entity alias:uint8 + 相同的属性记录...
属性 ID：开启且容量允许时为 uint8 alias；否则为 uint16 UID
普通顶层属性的 componentPropertyID 为 0；组件属性则标识其组件
```

`onUpdatePropertys` 和 `onUpdatePropertysOptimized` 是当前更新消息；Client Entity 读完实体标识后，循环读取组件/属性标识，查 PropertyDescription，再由 DataType 解码值。ARRAY、FIXED_DICT 由其类型序列化器编码；不从本条消息的某个固定类型字节推断全部结构。是否使用别名由 ScriptDefModule 分配结果决定，客户端与服务器必须一致。

**“KBEngine 用 ENTITY_PROPERTY 作为网络包首字节”未核实。** 在所检出的实现中，没有找到支持该固定标记的客户端属性包路径；外层先读 uint16 消息 ID，属性记录在别名模式下的第一个 uint8 又可能是组件标识 0，而不是属性类型枚举。`ENTITY_PROPERTY_UID` 是 uint16 typedef，也不是固定首字节。若该说法指旧版 SDK/自定义传输协议，需补充版本与实现，本文不猜测数值或语义。

来源：KB-S [Base 编码][kb-b]、[Cell 编码][kb-c]、[客户端读取][kb-r]、[UID 定义][kb-f]、[别名分配][kb-al]、[DataType][kb-d]；[官方消息封装][kb-netdoc]。

## 5. 版本兼容：结构同步不等于业务迁移

### BigWorld 的已存数据

`sync_db` 对比实体定义和数据库结构，可新增列、删除冗余列/表、修改类型与索引；BW-S 的 MySqlTableInitialiser 包含 ADD/DROP/MODIFY 及新增列默认值处理。运维指南说明仍有未归并 secondary DB 时不能运行 sync_db：旧 secondary 数据也受旧定义约束，不能只迁移主库。

不能承诺“新增属性一定让所有旧数据具有与新实体相同的默认值”。BW-S 的 PropertyMapping 明确记录一个反例：新增 ARRAY/TUPLE 时，已有数据库实体默认没有元素，新建实体则使用声明的数组默认值；ARRAY 内 FIXED_DICT 新字段使用子类型默认值。列默认值、缺省运行时值、已有记录回填是三个问题。

删除字段可能丢数据；重命名不能仅凭同类型自动识别为原字段；缩窄整数、改变字符串长度/编码、标量改结构等转换需要业务决定。**任意变更的无损自动转换、在线混合版本读写与自动回滚未核实**。DDL 可以成功，但数值单位、ID 意义和业务约束仍可能错误。

来源：BW-S [列/表同步与默认值][bw-sync]、[数组默认值例外][bw-pm]；BW-G [sync_db 与归并][bw-ops]。

### KBEngine 的已存数据

KB-S 非 pure 数据库的初始化会同步契约结构：

- 缺列时生成 ADD；已存在但类型/长度等不匹配时，经 duplicate-column 分支生成 MODIFY COLUMN。
- EntityTableMysql 遍历数据库列，删除当前 TableItem 不再识别的列；EntityTables 也清理不在映射中的实体表。因此删除/改名属性、移除持久化标记可能走到破坏性路径，不是默默保留历史列。
- 数值 TableItem 的 DDL 可含声明默认值；**并非所有类型都有同样的 SQL DEFAULT 规则**。仅修改 Default 也不能保证修改已有行；尤其 `sync_item_to_db` 的快速比较检查类型/flags/长度，未比较 default，匹配时会直接返回。

类型转换效果依赖 MySQL 的规则和配置，源码中的 MODIFY 不包含业务转换函数。改名、拆分合并字段、补旧数组元素、货币换单位及回滚仍需要项目迁移脚本和验证。`Utype` 稳定也不能阻止基于名称的 SQL 列变化。

网络侧使用共享定义、别名映射和定义摘要；DBMgr/客户端摘要检查帮助发现不匹配，**不能转换已经存储的数据**。两边“在线实体热重载后自动保持旧数据语义”“任意新旧客户端互通”均未核实；不要与已有 Mistlane 草案中的版本路由/迁移目标混淆。

来源：KB-S [初始化条件][kb-dbi]、[列同步/默认值比较][kb-sql]、[旧表清理][kb-tables]、[别名][kb-al]、[摘要握手][kb-h]。

### 为什么迁移复杂，以及建议的发布策略（设计分析）

同一属性同时具有**网络身份、运行时类型、数据库映射和业务含义**。改变其中一项可能影响客户端解码、在线对象、旧记录、备份及回滚程序；自动 DDL 只知道结构差异，不能推导“金币改分币应乘 100”或“删列其实是改名”。

BW 倾向提供独立结构同步工具，并处理 secondary DB 的归并前置条件；KB-S 把非 pure DB 的结构对齐放在初始化链路，开发方便，启动影响面也更大。两边均不能仅凭 `.def` 取代业务迁移设计。

建议项目发布时：先备份并验证恢复，冻结/排空旧写入，处理未完成持久化；在旧数据副本上审阅 DDL 和业务转换，再部署匹配契约/客户端。需要滚动发布时采用新增字段 → 双读/受控双写 → 回填校验 → 切读 → 延后删除；这是一项额外工程方案，不是两套引擎已核实的默认功能。破坏性变更的回滚须同时规划数据恢复，不能只换回旧 `.def`。

依据：上述两边的同步、默认值和旧表清理源码；已有 [Mistlane 持久化与兼容提案](./entity-contract.md#loading-and-persistence) 已要求显式迁移，本文不改变该选择。

## 六项设计理由与取舍（设计分析）

以下根据已列机制推导；除明确引用的指南陈述外，不声称查到了作者动机。

1. **声明式契约 vs 代码硬编码属性。** 同一类型模型服务校验、客户端描述/生成、分发与数据库映射，避免 Python/Lua、网络和 SQL 各维护一份结构。代价是解析器、描述符、生成工具、ID/摘要兼容成为基础设施；动态业务代码变更不再等于可任意改数据布局。少量纯本地临时变量无需写入契约；跨边界或需恢复的状态应显式声明。依据：BW-E/BW-D 与 KB-E/KB-P。

2. **持久化 vs 仅同步。** 两者是独立维度，不是互斥两类：可以“保存且同步”“保存但私有”“同步但不保存”“两者都不做”。金币需要可靠保存但通常仅本人可见；动画/临时战斗表现可同步而无需跨重启保存。分离减少 DB 写放大和隐私暴露，同时避免持久化选择意外改变可见性。非持久化也可能需要进程迁移/灾备传输；数据库恢复值则按默认规则重建。依据：BW-F/BW-E 与 KB-F/KB-B。

3. **增量 vs 全量快照。** 初见实体使用可见全量便于建立一致初态；后续单属性/嵌套增量节省带宽，尤其大容器单项变化。代价是追踪所有修改、维护顺序/基线、处理删除/替换和丢失恢复；全量替换实现简单，小容器可能更便宜。BW 有路径/slice；KB 的普通赋值以属性完整值为粒度，不等于完整实体快照。客户端同步与 DB 快照可采用不同粒度，支付/事件也不应依赖状态回调的次数。依据：BW-PC/BW-C 与 KB-C/KB-W。

4. **服务端权威 vs 客户端预测。** Base/real Cell 决定普通持久化/同步属性；客户端可本地预测移动和动画以降低输入延迟，但不能把金币、掉落、HP 的本地赋值变成可信写入。客户端应提交动作，服务端校验后更新权威值，展示层再校正预测。引擎对受控实体移动有专门路径，不代表任意属性可客户端写回；具体项目预测/回滚算法未核实。代价是校正跳变和业务验证成本，收益是共享状态与资产不依赖不可信副本。依据：BW-G 的 [Entity Control/Physics Correction][bw-w]；KB-C 和客户端 [本地位置/权威位置处理][kb-r]。

5. **AOI 放在哪层。** 空间兴趣关系应在服务端 Cell 的空间/Witness 层建立，属性分发层把它与 OWN/OTHER、权限和 DetailLevel 求交，然后在出口发送。不能先发所有数据让客户端过滤，因为带宽已经消耗、私密信息已经泄露；也不宜让 DataType 编码器或 DB 层计算空间可见性。代价是跨 Cell ghost、观察者加入/离开、基线及带宽调度必须协调；AOI 是候选集合，不自动等于阵营/隐身等业务授权。依据：BW-W/BW-F 与 KB-W/KB-C。

6. **契约迁移为何复杂。** 列、字段 ID、容器布局、默认值和业务含义不是同一维度；持久化数据比一个进程或客户端版本活得更久。BW 的工具化 DDL/secondary 归并和 KB 的启动 DDL 各解决结构对齐，均不证明业务无损、滚动互通或可逆。选择自动对齐可减少开发摩擦，选择显式迁移能审阅数据损失、转换和回滚，需付出部署编排成本。依据：第 5 节 BW-SYNC/BW-PM 与 KB-SQL/KB-TABLES。

## 来源索引与复核入口

代号用于上表和设计分析。BW-S 链接固定公开镜像提交，BW-G 为归档指南；均不是缺失的本机 BigWorld 14.4.1 源码。KB 条目同时列出本次检出的本机源码路径:行号（路径相对 `/home/cui/workspaces/kbengine`），这些行号是本次实读的依据。未核实事项集中在 BigWorld 本机实现、命名差异、部分恢复/预测流程、任意迁移保证和未运行的故障场景，不能作为功能承诺。

- **BW-E**：[ EntityDescription：加载、数据域和流 ][bw-e]。
- **BW-D**：[ DataType：类型与流接口 ][bw-d]。
- **BW-F**：[ DataDescription：XML flags/默认值解析；位定义见同目录 .hpp ][bw-f]。
- **BW-GP**：[ 2.1 指南：Properties ][bw-gp]。
- **BW-C**：[ 2.1 指南：Methods 中的客户端属性回调 ][bw-callback]。
- **BW-PC**：[ PropertyChange：路径和 slice 编码 ][bw-pc]。
- **BW-W**：[ 2.1 指南：Proxies and Players，Witness/控制/纠正 ][bw-w]。
- **BW-PM**：[ MySQL PropertyMapping：列/容器映射及数组默认值 ][bw-pm]。
- **BW-SYNC**：[ MySqlTableInitialiser：DDL 与默认值 ][bw-sync]。
- **BW-TS**：[ TableSynchroniser：启动 sync_db ][bw-ts]。
- **BW-DB**：[ 2.1 指南：The Database Layer ][bw-db]。
- **BW-CFG**：[ 运维指南：archive/secondaryDB 配置 ][bw-cfg]。
- **BW-BUF**：[ BufferedEntityTasks：同实体任务排序 ][bw-buf]。
- **KB-E**：[ EntityDef：契约加载 ][kb-e]；本机 `kbe/src/lib/entitydef/entitydef.cpp:933-934,1097-1297`。
- **KB-T**：[ DataTypes：类型注册 ][kb-t]；本机 `kbe/src/lib/entitydef/datatypes.cpp:94-188`。
- **KB-P**：[ PropertyDescription：类型值与持久化序列化 ][kb-p]；本机 `kbe/src/lib/entitydef/property.h:23-64,75-93,137-163`、`kbe/src/lib/entitydef/property.cpp:22-64,82-129`。
- **KB-F**：[ EntityDataFlags、广播范围和 UID ][kb-f]；本机 `kbe/src/lib/entitydef/common.h:16-55,79-84`、`kbe/src/lib/entitydef/entitydef.cpp:161-174,1018-1092`、`kbe/src/lib/entitydef/scriptdef_module.cpp:113-145`。
- **KB-M**：[ 实体属性赋值入口 ][kb-m]；本机 `kbe/src/lib/entitydef/entity_macro.h:790-820`。组件属性赋值回调入口见 `kbe/src/lib/entitydef/entity_component.cpp:414-488`。
- **KB-B**：[ Base：分发、写回、摘要与回调 ][kb-b]；本机 `kbe/src/server/baseapp/entity.cpp:96-160,398-505,1141-1210,1233-1305,1319-1384`。
- **KB-C**：[ Cell：real/ghost、AOI 和属性下发 ][kb-c]；本机 `kbe/src/server/cellapp/entity.cpp:658-892,1090-1113`。按 LOD 输出初始化属性见 `kbe/src/lib/entitydef/entity_macro.h:583-612`；客户端可见属性初始化见 `:614-655`。
- **KB-W**：[ Witness：view 状态及初始化 ][kb-w]；本机 `kbe/src/server/cellapp/witness.cpp:782-835`；view enter/leave 触发见 `kbe/src/server/cellapp/view_trigger.cpp:27-51`。
- **KB-CONTAINERS**：本机 `kbe/src/lib/entitydef/fixeddict.cpp:272-309`（FixedDict 元素操作仅校验并改内部 dict）；`kbe/src/lib/pyscript/sequence.cpp:18-30,252-285,295-382,395-445`（Sequence 元素/slice/拼接直接改容器）。这些路径未见 owner-entity `onDefDataChanged` 调用；这是对所列路径的静态检查，不代表所有容器包装及组件回调。
- **KB-SQL**：[ EntityTableMysql：DDL/字段/子表/写入 ][kb-sql]；本机 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:136-230,370-470,505-763,1212-1298,1302-1354`。
- **KB-TABLES**：[ EntityTables：加载、同步及清理旧表 ][kb-tables]；本机 `kbe/src/lib/db_interface/entity_table.cpp:117-143,169-235,296-320`。
- **KB-DBI**：[ DBUtil：非 pure 初始化调用 syncToDB ][kb-dbi]；本机 `kbe/src/lib/db_interface/db_interface.cpp:221-247`；MySQL 表工厂 `kbe/src/lib/db_mysql/db_interface_mysql.cpp:419-423`，drop 实现 `:426-451`。
- **KB-A**：[ 周期归档调度 ][kb-a]；本机 `kbe/src/server/baseapp/archiver.cpp:23-63,66-85`。
- **KB-Q**：[ 同实体 DB 任务队列 ][kb-q]；本机 `kbe/src/server/dbmgr/buffered_dbtasks.cpp:26-85,89-153`。
- **KB-R**：[ 客户端属性解析 ][kb-r]；本机 `kbe/src/lib/client_lib/entity.cpp:259-424`。
- **KB-AL**：[ 属性别名分配和容量限制 ][kb-al]；本机 `kbe/src/lib/entitydef/scriptdef_module.cpp:113-180`。
- **KB-N**：[ 官方消息封装格式 ][kb-netdoc]；本次未在本机源码中复核该文档；客户端更新解析及 Cell/Base 打包分别见 `kbe/src/lib/client_lib/entity.cpp:293-315`、`kbe/src/server/cellapp/entity.cpp:750-781`、`kbe/src/server/baseapp/entity.cpp:131-159`；消息声明 `kbe/src/lib/client_lib/client_interface.h:89-90`。
- **KB-H**：[ BaseApp：握手发送 EntityDef 摘要 ][kb-h]；本次未在本机源码中复核握手摘要路径，不能把摘要等同为数据迁移。
- **KB-DBTASK**：本机 DB 写线程和主线程回调 `kbe/src/server/dbmgr/dbtasks.cpp:328-397`；创建 Entity 表 `kbe/src/lib/db_mysql/db_interface_mysql.cpp:419-423`。
- **KB-ASSIGN**：本机 `<Flags>/<Persistent>/<Type>/<Default>/<Utype>` 读取和描述符创建 `kbe/src/lib/entitydef/entitydef.cpp:1097-1297`；序列化与反序列化委派 `kbe/src/lib/entitydef/property.cpp:82-129`。
- **KB-DATA**：本机值的 wire 编码通过 DataType `addToStream` 接口完成，`kbe/src/lib/entitydef/property.cpp:82-108`；具体类型实现见 `kbe/src/lib/entitydef/datatype.cpp`（各类型实现分布在文件内）。

[bw-root]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6
[kb-root]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046
[bw-guide]: https://howarduong.github.io/github.io/doc/html/server_programming_guide/index.html
[bw-e]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/entitydef/entity_description.cpp
[bw-f]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/entitydef/data_description.cpp
[bw-fh]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/entitydef/data_description.hpp
[bw-d]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/entitydef/data_type.hpp
[bw-pc]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/entitydef/property_change.cpp
[bw-reader]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/entitydef/property_change_reader.cpp
[bw-po]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/entitydef/property_owner.cpp
[bw-pm]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/dbmgr_mysql/mappings/property_mapping.cpp
[bw-sync]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/server/tools/sync_db/mysql_table_initialiser.cpp
[bw-ts]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/dbmgr_mysql/table_synchroniser.cpp
[bw-buf]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/lib/dbmgr_mysql/buffered_entity_tasks.cpp
[bw-base]: https://github.com/v2v3v4/BigWorld-Engine-2.0.1/blob/481e69a837a9f6d63f298a4f24d423b6329226c6/src/server/baseapp/base.hpp
[bw-gp]: https://howarduong.github.io/github.io/doc/html/server_programming_guide/ch05.html
[bw-callback]: https://howarduong.github.io/github.io/doc/html/server_programming_guide/ch06.html
[bw-db]: https://howarduong.github.io/github.io/doc/html/server_programming_guide/ch09.html
[bw-w]: https://howarduong.github.io/github.io/doc/html/server_programming_guide/ch12.html
[bw-cfg]: https://howarduong.github.io/github.io/doc/html/server_operations_guide/ch02.html
[bw-ops]: https://howarduong.github.io/github.io/doc/html/server_operations_guide/server_operations_guide.html
[kb-e]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/entitydef/entitydef.cpp
[kb-t]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/entitydef/datatypes.cpp
[kb-p]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/entitydef/property.cpp
[kb-f]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/entitydef/common.h
[kb-m]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/entitydef/entity_macro.h
[kb-b]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/server/baseapp/entity.cpp
[kb-c]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/server/cellapp/entity.cpp
[kb-w]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/server/cellapp/witness.cpp
[kb-fd]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/entitydef/fixeddict.cpp
[kb-seq]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/pyscript/sequence.cpp
[kb-comp]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/entitydef/entity_component.cpp
[kb-dbi]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/db_interface/db_interface.cpp
[kb-db]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/server/dbmgr/dbmgr.cpp
[kb-tables]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/db_interface/entity_table.cpp
[kb-sql]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/db_mysql/entity_table_mysql.cpp
[kb-a]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/server/baseapp/archiver.cpp
[kb-q]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/server/dbmgr/buffered_dbtasks.cpp
[kb-task]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/server/dbmgr/dbtasks.cpp
[kb-r]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/client_lib/entity.cpp
[kb-al]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/entitydef/scriptdef_module.cpp
[kb-d]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/lib/entitydef/datatype.cpp
[kb-h]: https://github.com/kbengine/kbengine/blob/7d379b9f943d2731b09c45398855f98efe74d046/kbe/src/server/baseapp/baseapp.cpp
[kb-defdoc]: https://kbengine.github.io/docs/programming/entitydef.html
[kb-netdoc]: https://kbengine.github.io/docs/programming/kbe_message_format.html
