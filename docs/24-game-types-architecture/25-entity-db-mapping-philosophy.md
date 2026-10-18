# 属性↔DB 映射、ORM 之问与 BigWorld 设计哲学

> 来源：mistlane 仓 docs/entity-db-mapping-and-philosophy.md（commit fce3eb9，2026-10-19）
> 证据基础：本机 KBEngine 源码 /home/cui/workspaces/kbengine/

> **已知缺口**：第三章原题为「BigWorld 设计哲学」，但本机
> `BigWorld-Engine-14.4.1/` 目录为空（0 文件），作者据 KBEngine 实现反推并
> 在文中标注。与 BigWorld 官方资料的差异需另行核实。

---

# KBEngine 实体属性—数据库映射与引擎设计取舍

> 范围说明：本机 `/home/cui/workspaces/kbengine/BigWorld-Engine-14.4.1/` 目录为空；`.gitmodules:1-3` 表明它是子模块，但源码未检出。因此本文不把 KBEngine 实现冒称为 BigWorld 14.4.1 的逐行证据。以下机制结论以可读的 KBEngine 源码为准；BigWorld 专属差异标为“未核实”。源码引用使用 `文件路径:行号`。

## 第一章：属性与 DB 存储映射

### 1.1 映射由静态 Entity 定义驱动，不是运行时反射猜出来的

`.def` 属性的 `Flags`、`Persistent`、`Type`、`Index`、`DatabaseLength` 和 `Default` 在 `EntityDef::loadDefPropertys()` 中被解析，创建成 `PropertyDescription`，再按 Base/Cell/Client flags 放进相应模块描述；`ScriptDefModule::addPropertyDescription()` 把 persistent 描述另存入 persistent 属性表。见 `kbe/src/lib/entitydef/entitydef.cpp:1097-1297`、`kbe/src/lib/entitydef/scriptdef_module.cpp:588-616`。

DB 初始化时，`EntityTables::load()` 遍历 `EntityDef` 中的每个 `ScriptDefModule`，调用 backend 的 `createEntityTable()` 并用模块名初始化表；没有归档属性的实体不建实体表。MySQL 工厂返回 `EntityTableMysql`。见 `kbe/src/lib/db_interface/entity_table.cpp:117-143`、`kbe/src/lib/db_mysql/db_interface_mysql.cpp:420-423`。

### 1.2 表名、列名与实际类型

MySQL 的普通实体表名是 `tbl_<Entity模块名>`；表至少有自增主键 `id`。普通属性列命名为 `sm_<属性名>`（固定前缀在 `entity_table.h:37-44`，拼列名在 `entity_table_mysql.cpp:938-941`）。MySQL 表初始化遍历 persistent property descriptions；只有 persistent 属性才成为 DB 项。见 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:136-170`、`370-425`。

常见 MySQL 映射如下（`DatabaseLength` 是 schema 长度配置，不代表属性运行时值的变长模型）：

| Entity 类型 | MySQL 存储 | 说明 |
|---|---|---|
| `INT8/16/32/64` | `tinyint/smallint/int/bigint` | 有符号整数；默认值来自定义，缺省为 0。|
| `UINT8/16/32/64` | 对应整数类型 `unsigned` | 无符号整数。|
| `FLOAT/DOUBLE` | `float/double` | 数字按其标量类型序列化并转成 SQL 数值。|
| `STRING/UNICODE` | `varchar(n)` | `DatabaseLength` 未设时默认 255；字符串按连接编码转义。|
| `BLOB`、`PYTHON`、`PY_DICT`、`PY_TUPLE`、`PY_LIST`、`ENTITYCALL` | `blob` | 这些不是可直接按内部字段查询的关系列；`ENTITYCALL` 会被定义层强制取消 persistent。|
| `VECTOR2/3/4` | 多个标量列 | 默认 float 配置下按分量列存储；编译开关 `CLIENT_NO_FLOAT` 下为 int。|
| `FIXED_DICT` | 同一表内展开成多个列 | 只创建标记为 persistent 的 key；列名前缀组合成 `sm_<dict>_<key>`，嵌套字典继续加前缀。|
| `ARRAY` | 单独的子表 | 不是把整个数组塞进一列 BLOB；每个元素以子表记录保存。|

基础类型工厂映射见 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:505-759`；字符串长度默认值见 `:1819-1838`；向量列按分量同步和读写的实现可见 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:1037-1049`、`:1068-1092`（VECTOR3）及 `:1120-1132`、`:1151-1175`（VECTOR4）。数值 SQL 值从 MemoryStream 按声明的整数/浮点类型读出，见 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:1665-1807`。

`FIXED_DICT` 的工厂分支虽然以 `BLOB` 标志构造 item，但其 `initialize()` 随后逐个创建 persistent key 的子 item，且列名前缀根据父 dict key 递归拼接；实际数据由这些子 item 分列读写。因此不能仅凭工厂的初始标记推断数据库中是单个 blob 列。见 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:721-724`、`:1384-1417`、`:1453-1497`。

`ARRAY` 的 `initialize()` 建立 `EntityTableMysql` 子表。表名按实体表和属性嵌套路径拼成，例如 `tbl_Player_inventory`；非 `FIXED_DICT` 元素列名为 `sm_value`，数组子表带 `parentID`，每条记录自己的 `id`。准确列还取决于元素类型和嵌套定义。见 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:1218-1288`、`:1250-1276`、`:379-395`，以及 `kbe/src/lib/db_interface/entity_table.h:37-44`。数组的 INSERT/UPDATE 通过 `WriteEntityHelper` 递归处理子表；更新时按父 ID 找旧子记录、重用/增删记录。见 `kbe/src/lib/db_mysql/write_entity_helper.h:60-89`、`:92-109`、`:195-280`。

Entity Component 也采用子表：表名为父实体表名加 component 属性名，组件的 persistent 属性在子表中展开，关系由父 ID 关联。见 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:1507-1559`、`kbe/src/lib/db_mysql/sqlstatement.h:82-91`。

**继承关系不要和上述“子表”混为一谈。** `.def` 的 `<Parent>` 会把父定义递归加载到同一个 `ScriptDefModule`；`EntityTables` 则按模块名建表。所以从这段实现看，Entity 定义继承的属性进入子模块描述/该模块对应的实体表，而不是自动采用 ORM 式父表 join。真正使用 `parentID` 的子表是 ARRAY/Component 等结构。见 `kbe/src/lib/entitydef/entitydef.cpp:890-923`、`kbe/src/lib/db_interface/entity_table.cpp:117-143`、`kbe/src/lib/db_mysql/entity_table_mysql.cpp:379-395`。若 BigWorld 14.4.1 对继承表有不同规则：未核实。

### 1.3 谁生成 schema，何时生成

`DBUtil::initInterface()` 初始化数据库接口及连接线程池后，调用 `EntityTables::load()` 构造内存映射；环境检查成功且该接口不是 `pure` 时调用 `EntityTables::syncToDB()`。这发生在 DB interface 初始化阶段，而不是每次实体创建或首次属性写入时。见 `kbe/src/lib/db_interface/db_interface.cpp:218-245`。

`EntityTables::syncToDB()` 把 KBE 表和实体表的同步任务放入 DB thread pool 并等待完成；MySQL 的 `EntityTableMysql::syncToDB()` 创建 `CREATE TABLE IF NOT EXISTS tbl_... (id ..., PRIMARY KEY...)`，随后同步属性列和索引。缺失列通过 `ALTER TABLE ADD`，类型/长度变化可走 `MODIFY COLUMN`；源码还会删除定义中已不存在的实体表/属性列。见 `kbe/src/lib/db_interface/entity_table.cpp:169-227`、`kbe/src/lib/db_mysql/entity_table_mysql.cpp:370-425`、`:51-107`、`:427-463`。这套自动同步有便利性，也意味着部署前必须审查字段删除/改型的迁移风险。

### 1.4 属性变更到 DB 写入：标脏不是立即 flush

KBEngine 的 `setDirty()` 不是 SQL 写入，也不是逐属性 dirty-bit map：它把五个 word 的 `persistentDigest_` 清零；`isDirty()` 通过全零判断。Base 与 Cell 的定义分别见 `kbe/src/server/baseapp/entity.inl:107-131`、`kbe/src/server/cellapp/entity.inl:263-287`。属性变更回调只在属性被标记 persistent 时调用 `setDirty()`；Cell 侧还要求实体是 real 且不在初始化阶段。见 `kbe/src/server/baseapp/entity.cpp:96-104`、`kbe/src/server/cellapp/entity.cpp:658-666`。

真正的写库链路是：

1. `Base Entity::writeToDB()` 保存可选 Python callback；若有 Cell 实体，发送 `reqWriteToDBFromBaseapp`，否则直接做 Base 收束。见 `kbe/src/server/baseapp/entity.cpp:1141-1229`。
2. Cell 收到请求后调用 Cell 脚本 `onWriteToDB()`，`backupCellData()` 把 Cell 状态收束到 Base，再向 Base 发 `onCellWriteToDBCompleted`。见 `kbe/src/server/cellapp/cellapp.cpp:775-793`、`kbe/src/server/cellapp/entity.cpp:1192-1249`。
3. Base 调 `addPersistentsDataToStream()`，只把 persistent property 以 property UID + 类型序列化进 MemoryStream；Cell 持久属性优先取 Cell 镜像，其他从 Base namespace 取。见 `kbe/src/server/baseapp/entity.cpp:398-509`。随后对序列化流做 SHA1；与 `persistentDigest_` 相同就不写，变化则更新 digest 并发 `DbmgrInterface::writeEntity`。见 `:1319-1387`。
4. `Dbmgr::writeEntity()` 按 DB interface 路由到 `Buffered_DBTasks`，创建 `DBTaskWriteEntity`；DB 线程调用 `EntityTables::writeEntity()`，最后由 MySQL 表实现构造 INSERT/UPDATE。见 `kbe/src/server/dbmgr/dbmgr.cpp:1044-1065`、`kbe/src/server/dbmgr/dbtasks.cpp:328-355`、`kbe/src/lib/db_interface/entity_table.cpp:295-302`、`kbe/src/lib/db_mysql/entity_table_mysql.cpp:778-817`。DB task 完成后通过 `presentMainThread()` 把成功/失败回发 Base，见 `kbe/src/server/dbmgr/dbtasks.cpp:378-397`。

### 1.5 定时、关服、切换 Cell：三种语义要分清

- **定时 DB 归档**：Base 每个 game tick 调 `Archiver::tick()`；按 `archivePeriod` 将启用 `shouldAutoArchive` 且已有 DB 记录的实体分摊处理，调用 `writeToDB()`。随后仍经 Cell→Base→Dbmgr 的路径，而且 digest 相同会跳过真正写库。见 `kbe/src/server/baseapp/baseapp.cpp:558-583`、`kbe/src/server/baseapp/archiver.cpp:23-63`、`:66-85`。
- **定时 Cell→Base 备份不是 DB flush**：`Backuper` 按 `backupPeriod` 分批调 `writeBackupData()`；其默认实现是请求 Cell 状态，并将有变化的 Cell 数据装回 Base。它不调用 DB task。见 `kbe/src/server/baseapp/backuper.cpp:25-74`、`kbe/src/server/baseapp/entity.cpp:1091-1138`、`kbe/src/server/cellapp/entity.cpp:1129-1181`。
- **切换/销毁 Cell**：Cell 销毁/迁出时可先 `backupCellData()`，然后通知 Base `onLoseCell`；这保证状态回到 Base，不等于写 DB。见 `kbe/src/server/cellapp/entity.cpp:204-221`。显式 `writeToDB()` 才进入持久化路径。
- **关服**：本次检查到的 `Baseapp::finalise()` 做资源清理、取消 timer 并调用父类 finalise，没有全量 `writeToDB()` 循环。见 `kbe/src/server/baseapp/baseapp.cpp:650-670`。因此不能假设“关服自动 flush”；外层停服编排是否提前请求归档在此未核实，可靠停服应显式等待持久化完成。

### 1.6 非 persistent 但要缓存怎么办

`Persistent=false` 的属性不进入 `persistentPropertyDescr_`，不会由上述通用实体表写入；但它仍可按 `.def` 的 Base/Cell flags 存在运行时对象、参与相应同步，Cell 数据也可被周期性备份到 Base。该备份是进程内的权威态/镜像态保护，不是可恢复的数据库持久化。证据：`kbe/src/lib/entitydef/scriptdef_module.cpp:603-614`、`kbe/src/server/baseapp/entity.cpp:398-509`、`kbe/src/server/cellapp/entity.cpp:1129-1181`。

若只是性能缓存，保留为非 persistent 运行时属性；若必须跨重启恢复，就应将其声明为 persistent，或显式实现业务存储/缓存接口。源码提供纯 DB interface（用于不走 Entity schema 的存储）和 DB task 入口，但具体使用方式取决于项目代码；不要把 `shouldAutoBackup` 当作耐久化保证。`pure` 接口绕过实体表同步的条件见 `kbe/src/lib/db_interface/db_interface.cpp:241-245`，Entity `writeToDB` 对 pure interface 的拒绝见 `kbe/src/server/baseapp/entity.cpp:1153-1165`。

### 1.7 跨多个 DB 表如何关联

数组和组件子表在 schema 中有 `id` 与 `parentID`；INSERT 子记录时把父表生成的 DBID 传给子上下文，再把它作为 `parentID` 写入。见 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:379-395`、`kbe/src/lib/db_mysql/write_entity_helper.h:75-89`、`kbe/src/lib/db_mysql/sqlstatement.h:82-91`。读取时先查主表，再按主行 ID 查子表；`ReadEntityHelper::queryChildDB()`读取子表的 `id,parentID` 并按父 ID 组织数据。见 `kbe/src/lib/db_mysql/read_entity_helper.h:123-149`、`:173-205`。

同一实体类型的持久化属性流由 property UID 映射到 `EntityTableItem`，各类型 item 再处理标量列/嵌套结构；实体 DBID 是主表主键。`EntityTable::writeTable()`根据 UID 找 item，见 `kbe/src/lib/db_interface/entity_table.cpp:33-61`；MySQL `writeTable()`从流读 `pid, child_pid` 并按 item 生成 SQL，见 `kbe/src/lib/db_mysql/entity_table_mysql.cpp:778-817`。源码展示的是跨表父子关系和任务串行递归，不应假设每个子表都由数据库外键约束（这里未见创建 FK 的代码）。

### 对 Mistlane 的启示

1. 让实体契约成为 schema/序列化的单一事实来源，但把自动 schema 变更和显式迁移审查分开；删除字段不应静默变成线上破坏性 DDL。
2. 把“dirty 标记”“状态镜像/备份”“耐久化 flush”定义为三个不同 API/保证等级；迁移、关服和定时任务要明确等待哪一种完成。
3. 集合/聚合存储应明确定义父键、顺序、更新/删除语义；不要只把复杂类型塞进无查询能力的 blob，也不要默认将每个数组项做关系表。

## 第二章：为什么不是 MyBatis 式 ORM

### 2.1 源码结论：不是“没有映射层”，而是引擎自带专用映射器

KBEngine 有 `EntityTables → EntityTableMysql/Redis → DBInterface` 这样的分层，表项由 `ScriptDefModule` 和 `PropertyDescription` 创建；MySQL 后端完成列映射和 SQL。见 `kbe/src/lib/db_interface/entity_table.cpp:117-143`、`:295-302`、`kbe/src/lib/db_mysql/entity_table_mysql.cpp:136-170`。所以更准确的说法是：它没有采用通用应用 ORM，而使用与实体协议、生命周期和线程模型绑定的专用 mapper。

### 2.2 引擎约束与 ORM 的成本

1. **大量在线实体常驻于高频 tick，创建/销毁也可能频繁。** Entity 在 Base/Cell 有自己的脚本对象、属性描述、状态和实体容器管理；引擎还对对象内存、序列化和跨组件消息显式控制。若在每个运行时实体上再挂 ORM identity map、session 生命周期、代理/懒加载等机制，会扩大对象图与生命周期管理成本。此处“海量/短生命周期”是此类游戏服务器常见目标，不是源码给出的固定数量保证；MyBatis 的 `SqlSession`/mapper 与 Hibernate 风格懒加载代理也不是同一机制，不能笼统说所有 ORM 都有代理。
2. **属性访问远比 DB 访问频繁。** Base/Cell 的属性 setter 走 `PropertyDescription::onSetValue`，persistent 属性变更回调置 dirty；游戏逻辑按 Entity 直接读写，而非每次访问走 SQL/session。见 `kbe/src/lib/entitydef/property.cpp:206-215`、`kbe/src/server/baseapp/entity.cpp:96-104`、`kbe/src/server/cellapp/entity.cpp:658-666`。将 ORM 代理/跟踪层放到这个热路径上，即便只引入小额间接调用，也可能乘以 tick 中的大量属性访问；这属于性能/架构推论，不是本源码中的 benchmark 结论。
3. **静态契约已提供运行时元信息。** `.def` 的类型、flags、persistent、UID、默认值和长度被加载成 `PropertyDescription` / `ScriptDefModule`，直接用于属性 wire serialization、DB 表项生成和 schema sync。见 `kbe/src/lib/entitydef/entitydef.cpp:1097-1297`、`kbe/src/lib/entitydef/scriptdef_module.cpp:603-614`、`kbe/src/server/baseapp/entity.cpp:398-509`。再用 ORM annotations/XML 描述同一列会形成双份 schema；除非引入的是补足查询能力的工具，否则其映射配置多数冗余。
4. **状态权威跨 Base/Cell/Dbmgr 边界。** Cell 是空间态写库前的收束方，Base 统一生成持久化流并把任务投递 Dbmgr；DB 线程的任务完成后再回主线程回调。见 `kbe/src/server/baseapp/entity.cpp:1217-1229`、`:1289-1387`、`kbe/src/server/dbmgr/dbmgr.cpp:1044-1065`、`kbe/src/server/dbmgr/dbtasks.cpp:328-397`。若 ORM session/实体代理被当作跨进程共享身份，就必须定义失效、所有权、并发与重连语义；这会和“每个进程持有自己那份 Entity/快照，按消息迁移”的模型冲突。更可行的边界是 ORM 只在 Dbmgr 的持久化适配器内部使用，不能替代跨进程状态协议。
5. **DB 访问被移出游戏主逻辑线程。** interface 初始化配置 DB thread pool；`Dbmgr::writeEntity()`封装单实体 `DBTaskWriteEntity` 投递队列，后台执行后回主线程。见 `kbe/src/lib/db_interface/db_interface.cpp:218-245`、`kbe/src/server/dbmgr/dbmgr.cpp:1044-1065`、`kbe/src/server/dbmgr/dbtasks.cpp:328-397`。现有源码能证明异步任务队列和多连接线程池；**没有在这条通用写路径中核实到 ORM 风格的批量 SQL flush**，因此不能把“引擎靠批量写、ORM 必然破坏批量”说成事实。若 Mistlane 要做批量写，应直接设计批次 API，并评估事务/排序/回调语义。

### 2.3 为什么“更灵活”并不自动更合适

MyBatis 式 mapper 的灵活性主要在 SQL、投影、联表、动态条件及查询结果映射；游戏实体热路径的核心需求却是固定类型的属性访问、协议序列化、Cell/Base 镜像以及异步快照写库。引擎的表项按属性 UID 查找并专门处理 ARRAY/FIXED_DICT/Component，而不是把任意 SQL 结果直接 materialize 成在线实体，见 `kbe/src/lib/db_interface/entity_table.cpp:33-61`、`kbe/src/lib/db_mysql/entity_table_mysql.cpp:778-817`。这是一种针对 workload 的受限灵活性换性能和一致性，不是 ORM 在一般业务开发中不灵活。

### 2.4 反方：ORM 确实更好的地方

- 管理后台、运营工具、账务/订单、报表和非 tick 热路径业务，CRUD/关联查询明显多于高频属性访问时，ORM 可大幅减少 SQL 样板并提供成熟的事务、迁移和投影能力。
- 领域对象数量有限、生命周期由请求/事务界定、并不跨 Cell/Base 迁移时，ORM session/identity map 的成本更可控，也能带来一致的查询模型。
- schema 经常演进且需要多种查询组合时，显式 migration + ORM 通常比“从游戏实体定义自动同步表”更可控。
- 可采用混合边界：在线 Entity 继续保持轻量契约与异步 DB task；Dbmgr 的账号/后台/报表服务可以在独立模块使用 ORM。前提是 ORM 不持有跨进程 Entity 的长期 session，也不阻塞 game tick。

### 对 Mistlane 的启示

1. 不必复制传统 ORM，也不应为了“不要 ORM”而手写所有查询；按热路径/冷路径分层，核心实体协议用显式 schema mapper，管理与报表侧可用 ORM。
2. 数据访问抽象不能吞掉执行边界：游戏线程只构造可序列化命令，I/O 在工作线程完成，结果通过 ID/callback/event 回到 owning process。
3. 对任何新增代理/变更追踪机制先做 per-entity 内存、属性访问和 tick 尾延迟基准；本地源码没有 benchmark，不能凭“ORM 一定慢”下结论。

## 第三章：从 KBEngine 实现反推的设计哲学

> 本章针对可读的 KBEngine 源码。BigWorld 14.4.1 中同名组件的职责边界以及下列差异：未核实。

### 3.1 多进程切分：隔离不同权威态与负载

KBEngine 本机代码含 `baseapp`、`baseappmgr`、`cellapp`、`cellappmgr`、`dbmgr`、`loginapp` 等进程目录；没有叫 `gateapp` 的进程目录。也没有证据支持把 KBEngine `loginapp` 简单等同 BigWorld `gateapp`。Loginapp 接受登录请求并处理账号信息，最终收到 Baseapp 地址后向客户端返回登录成功；见 `kbe/src/server/loginapp/loginapp.cpp:877-921`、`:1303-1339`。Baseappmgr 按负载为实体选择 Baseapp，见 `kbe/src/server/baseappmgr/baseappmgr.cpp:279-318`；Cellappmgr 同样按进程负载/实体数分配 Cellapp 并转发建空间请求，见 `kbe/src/server/cellappmgr/cellappmgr.cpp:230-263`、`:310-382`。Dbmgr 则把数据任务送到后台线程池，见 `kbe/src/server/dbmgr/dbmgr.cpp:1044-1065`。

可从实现反推出的收益：Base 会话/长期属性、Cell 空间模拟、DB I/O 和接入/登录有各自调度与故障边界；Cellapp 数量可独立增加并由 mgr 做负载分配。代价是进程间消息协议、组件发现/注册、状态快照和恢复复杂度增加；一次写库也需要 Cell→Base→Dbmgr 和异步回调的多跳处理。这里描述的是 KBEngine 的可读架构，BigWorld gateapp 具体承担何职责：未核实。

### 3.2 Cell 与 Base 属性：由空间局部性和权威归属驱动

`.def` 属性分别带 Base/Cell/Client flags；解析时据 flags 把描述放入不同属性集合，persistent 是独立维度，不等于“Base 属性”。见 `kbe/src/lib/entitydef/entitydef.cpp:1134-1168`、`:1277-1297`。Base 保留长期实体/会话上下文与 Cell 数据镜像；Cell 对实时空间态负责，修改 persistent Cell property 时通过 dirty 标记并可向附近 ghost 广播。见 `kbe/src/server/baseapp/entity.cpp:398-414`、`kbe/src/server/cellapp/entity.cpp:658-708`。

隐含空间局部性假设是：实体在某一空间/Cellapp 上有 real owner，绝大多数模拟交互发生于同一局部范围；跨 Cellapp 只对边界附近复制必要 ghost/状态，而不是所有节点共享一个全局可变对象。Cell 代码明确在存在 ghost 时才向 ghost 广播部分 Cell 属性，见 `kbe/src/server/cellapp/entity.cpp:684-708`。拆成 Base/Cell 能把低频长期逻辑与高频空间模拟分配到不同资源池，但跨边界交互和迁移必须付出复制、同步与一致性成本。

### 3.3 AOI 内建：空间触发器直接连接实体可见性与网络复制

Cell 的 `Witness` 按 view radius 在实体坐标节点上安装 `ViewTrigger`；进入/离开触发器会维护 view entity 引用、witness 关系和客户端待处理状态。见 `kbe/src/server/cellapp/witness.cpp:277-353`、`:356-438`、`:441-470`。Witness attach 会发送实体进入世界/位置初始化消息给客户端，见 `:112-160`。因此 AOI 不只是业务查询“附近有哪些人”，它直接决定客户端看到哪些实体、何时进入/离开视野，以及空间复制负载。内建可复用同一套坐标索引、触发和生命周期逻辑，也避免每个玩法重复实现；代价是引擎的空间模型与 AOI 语义耦合，非传统 3D 空间业务需要适配。

### 3.4 分布式前提中的强假设

从代码可见的强约束/假设包括：

1. **明确的单一当前 owner 与按组件寻址。** `componentID`、`entityID`、`dbid` 在 DB 消息中显式传递，数据库实体 log 记录在线实体归属；不是多个服务同时直接修改同一份实体行。见 `kbe/src/server/dbmgr/dbmgr.cpp:1047-1065`、`kbe/src/server/dbmgr/dbtasks.cpp:357-371`。
2. **实体状态可按契约打包传输。** persistent 属性以 UID 和类型写入 MemoryStream，Cell 数据也专门收束/备份；进程边界是序列化边界。见 `kbe/src/server/baseapp/entity.cpp:398-509`、`:1319-1387`、`kbe/src/server/cellapp/entity.cpp:1129-1181`。
3. **Cellapp 具有空间分区语义，mgr 管理放置。** 新空间由 Cellappmgr 选一个可用 Cellapp 并转发创建请求；这不是任意微服务按 HTTP 请求无状态扩缩。见 `kbe/src/server/cellappmgr/cellappmgr.cpp:230-263`、`:310-382`。
4. **一致性更多由消息顺序、权威迁移和快照约束，而非共享数据库事务。** DB 写入是异步独立 task，cell/base 数据先汇总再写；在线实体 log 用于避免多处重复检出。见 `kbe/src/server/dbmgr/dbtasks.cpp:328-397`、`kbe/src/server/dbmgr/dbtasks.cpp:357-371`。

因此，“游戏服务器是分布式的”在这里不是把单体服务平铺成无状态副本，而是默认实体和空间有 owner、网络分区需要显式迁移/镜像、持久化状态是恢复源而不是每次运行时读源。崩溃时丢失尚未 flush 的数据风险也存在，定时归档周期决定了潜在丢失窗口；源码未提供 exactly-once 或跨 DB/游戏进程事务保证。

### 3.5 今天看起来过时的部分与仍然成立的部分

**需要重新评估的实现形式：**

- 以专用 mgr/中心目录为控制面并由其选择具体进程，和云平台服务发现、弹性调度、故障域/区域放置的集成方式不同；可以保留“按实体/空间 owner 路由”语义，替换控制面实现。
- Entity 定义直接驱动生产 schema，且启动时自动增加、修改、删除列/表（`kbe/src/lib/db_interface/entity_table.cpp:208-226`、`kbe/src/lib/db_mysql/entity_table_mysql.cpp:427-463`），缺少显式版本化 migration/审批边界；对在线滚动升级尤其需要重新设计。
- 强状态进程、Python 对象实体和单一主权迁移，和“服务全无状态、任意副本接请求”的云原生默认套路不兼容；强行无状态化会把空间模拟搬进分布式共享状态/高频网络同步，未必更简单。
- KBEngine 中没有 GateApp 这一进程名；网关职责如何拆分需按具体发行版验证，BigWorld 原版在此未核实。

**今天仍成立的核心：**

- 高频仿真按空间分区并保持局部权威，减少共享写和全局同步；现代服务也仍需分片所有权/actor placement。
- AOI/interest management 是复制和带宽预算的一部分，靠空间索引与视野边界做增量更新仍然有效。
- 数据库 I/O 与 game tick 解耦、显式异步回调、根据快照摘要跳过无变化写入，仍是降低尾延迟的有效原则。
- 静态 schema 帮助序列化兼容、客户端协议和 DB 映射使用同一契约；现代做法可以是生成代码/显式 migration，而不必退回重复手写 DTO、SQL 和网络字段。

### 对 Mistlane 的启示

1. 采用“领域状态有 owner，服务可替换/可重启”的区分：云原生不等于模拟状态无主；为每个实体/场景定义权威节点、租约/迁移和崩溃恢复。
2. 将 AOI/可见性作为传输层资源控制机制，业务提供兴趣策略，运行时负责空间索引、增量差异、节流和客户端生命周期。
3. 保留 Cell/Base 式责任隔离的价值，但不要照搬进程名；基于实际 CPU/网络/持久化瓶颈部署可独立扩缩的 worker，并将控制面和游戏数据面解耦。
4. 持久化刷新周期、停服 drain、迁移确认和 DB 失败重试要形成可测试的协议；不要把 dirty、缓存副本或进程退出误当作 durable commit。
