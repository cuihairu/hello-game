# Property↔DB Mapping, the ORM Question, and BigWorld Design Philosophy

> Source: mistlane repo docs/entity-db-mapping-and-philosophy.md (commit fce3eb9, 2026-10-19)
> Evidence base: local KBEngine source at /home/cui/workspaces/kbengine/

> **Known gap**: Chapter 3 was originally titled "BigWorld Design Philosophy", but the local
> `BigWorld-Engine-14.4.1/` directory is empty (0 files), so the author reconstructed it from
> the KBEngine implementation and says so in the text. Divergences from official BigWorld
> material need separate verification.

---

# KBEngine Entity Property–Database Mapping and Engine Design Trade-offs

> Scope note: the local `/home/cui/workspaces/kbengine/BigWorld-Engine-14.4.1/` directory is empty; `.gitmodules:1-3` shows it is a submodule whose source was not checked out. This document therefore does not pass the KBEngine implementation off as line-by-line evidence for BigWorld 14.4.1. The mechanism conclusions below rest on the readable KBEngine source; BigWorld-specific differences are marked "unverified". Source citations use `file_path:line`.

## Chapter 1: Property-to-DB Storage Mapping

### 1.1 The mapping is driven by static Entity definitions, not guessed at runtime by reflection

The `.def` attributes `Flags`, `Persistent`, `Type`, `Index`, `DatabaseLength` and `Default` are parsed in `EntityDef::loadDefPropertys()`, turned into `PropertyDescription` objects, and then placed into the corresponding module descriptions according to the Base/Cell/Client flags; `ScriptDefModule::addPropertyDescription()` additionally stores persistent descriptions into the persistent property table. See `kbe/src/lib/entitydef/entitydef.cpp:1097-1297` and `kbe/src/lib/entitydef/scriptdef_module.cpp:588-616`.

At DB initialization, `EntityTables::load()` iterates over every `ScriptDefModule` in `EntityDef`, calls the backend's `createEntityTable()` and initializes the table with the module name; entities with no archivable properties get no entity table. The MySQL factory returns `EntityTableMysql`. See `kbe/src/lib/db_interface/entity_table.cpp:117-143` and `kbe/src/lib/db_mysql/db_interface_mysql.cpp:420-423`.

### 1.2 Table names, column names and actual types

Normal MySQL entity tables are named `tbl_<EntityModuleName>`; a table has at least the auto-increment primary key `id`. Ordinary property columns are named `sm_<propertyName>` (fixed prefix in `entity_table.h:37-44`, column-name assembly in `entity_table_mysql.cpp:938-941`). MySQL table initialization iterates persistent property descriptions; only persistent properties become DB entries. See `kbe/src/lib/db_mysql/entity_table_mysql.cpp:136-170` and `370-425`.

Common MySQL mappings are as follows (`DatabaseLength` is a schema length setting; it does not model the runtime variable length of a property value):

| Entity type | MySQL storage | Notes |
|---|---|---|
| `INT8/16/32/64` | `tinyint/smallint/int/bigint` | Signed integers; default values come from the definition, falling back to 0.|
| `UINT8/16/32/64` | the matching integer type with `unsigned` | Unsigned integers.|
| `FLOAT/DOUBLE` | `float/double` | Numbers are serialized by their scalar type and converted to SQL numerics.|
| `STRING/UNICODE` | `varchar(n)` | Defaults to 255 when `DatabaseLength` is unset; strings are escaped according to the connection encoding.|
| `BLOB`, `PYTHON`, `PY_DICT`, `PY_TUPLE`, `PY_LIST`, `ENTITYCALL` | `blob` | These are not relational columns queryable by their inner fields; `ENTITYCALL` is force-disabled for persistence at the definition layer.|
| `VECTOR2/3/4` | multiple scalar columns | Stored as per-component columns under the default float configuration, and as int under the `CLIENT_NO_FLOAT` compile switch.|
| `FIXED_DICT` | expanded into several columns within the same table | Only keys marked persistent are created; column-name prefixes combine into `sm_<dict>_<key>`, and nested dicts keep prefixing.|
| `ARRAY` | a separate child table | Not the whole array stuffed into a single BLOB column; each element is stored as a child-table record.|

For the base-type factory mapping see `kbe/src/lib/db_mysql/entity_table_mysql.cpp:505-759`; for the string length default see `:1819-1838`; the per-component sync and read/write implementation of vector columns is visible at `kbe/src/lib/db_mysql/entity_table_mysql.cpp:1037-1049` and `:1068-1092` (VECTOR3) as well as `:1120-1132` and `:1151-1175` (VECTOR4). Numeric SQL values are read from the MemoryStream according to the declared integer/float type; see `kbe/src/lib/db_mysql/entity_table_mysql.cpp:1665-1807`.

Although the `FIXED_DICT` factory branch constructs the item with a `BLOB` flag, its `initialize()` then creates sub-items for the persistent keys one by one, and column-name prefixes are concatenated recursively according to the parent dict key; the actual data is read from and written to those sub-items as separate columns. So the initial factory flag alone cannot tell you the shape of the column in the database — it is not necessarily a single blob column. See `kbe/src/lib/db_mysql/entity_table_mysql.cpp:721-724`, `:1384-1417` and `:1453-1497`.

The `ARRAY` `initialize()` builds an `EntityTableMysql` child table. The table name is assembled from the entity table and the property's nesting path, for example `tbl_Player_inventory`; for non-`FIXED_DICT` elements the column is named `sm_value`, the array child table carries `parentID`, and every record has its own `id`. The exact columns still depend on the element type and the nested definition. See `kbe/src/lib/db_mysql/entity_table_mysql.cpp:1218-1288`, `:1250-1276` and `:379-395`, plus `kbe/src/lib/db_interface/entity_table.h:37-44`. Array INSERT/UPDATE goes through `WriteEntityHelper`, which recurses into child tables; on update it finds old child records by the parent ID and reuses/adds/removes records. See `kbe/src/lib/db_mysql/write_entity_helper.h:60-89`, `:92-109` and `:195-280`.

Entity Components also use child tables: the table name is the parent entity table name plus the component property name, the component's persistent properties are expanded inside the child table, and the relation is linked by the parent ID. See `kbe/src/lib/db_mysql/entity_table_mysql.cpp:1507-1559` and `kbe/src/lib/db_mysql/sqlstatement.h:82-91`.

**Do not confuse inheritance with the "child tables" described above.** A `.def` `<Parent>` recursively loads the parent definition into the same `ScriptDefModule`; `EntityTables` builds tables by module name. So in this implementation, properties inherited from an Entity definition land in the child module's descriptions / the entity table of that module, and are not automatically mapped to an ORM-style parent-table join. The child tables that actually use `parentID` are the ARRAY/Component-style structures. See `kbe/src/lib/entitydef/entitydef.cpp:890-923`, `kbe/src/lib/db_interface/entity_table.cpp:117-143` and `kbe/src/lib/db_mysql/entity_table_mysql.cpp:379-395`. If BigWorld 14.4.1 has different rules for inherited tables: unverified.

### 1.3 Who generates the schema, and when

`DBUtil::initInterface()` initializes the database interface and its connection thread pool, then calls `EntityTables::load()` to build the in-memory mapping; when the environment check succeeds and the interface is not `pure`, it calls `EntityTables::syncToDB()`. This happens during DB interface initialization, not on every entity creation or first property write. See `kbe/src/lib/db_interface/db_interface.cpp:218-245`.

`EntityTables::syncToDB()` puts the KBE-table and entity-table sync tasks into the DB thread pool and waits for them; MySQL's `EntityTableMysql::syncToDB()` issues `CREATE TABLE IF NOT EXISTS tbl_... (id ..., PRIMARY KEY...)`, then syncs property columns and indexes. Missing columns are added via `ALTER TABLE ADD`; type/length changes can go through `MODIFY COLUMN`; the source also deletes entity tables / property columns that no longer exist in the definitions. See `kbe/src/lib/db_interface/entity_table.cpp:169-227`, `kbe/src/lib/db_mysql/entity_table_mysql.cpp:370-425`, `:51-107` and `:427-463`. This automatic sync is convenient, and it also means the migration risk of dropped fields / changed types must be reviewed before deployment.

### 1.4 From property change to DB write: dirtying is not an immediate flush

KBEngine's `setDirty()` is neither a SQL write nor a per-property dirty-bit map: it zeroes the five-word `persistentDigest_`; `isDirty()` checks for all zeros. The Base and Cell definitions are at `kbe/src/server/baseapp/entity.inl:107-131` and `kbe/src/server/cellapp/entity.inl:263-287`. The property-change callback calls `setDirty()` only when the property is marked persistent; on the Cell side it additionally requires the entity to be real and not in the initialization phase. See `kbe/src/server/baseapp/entity.cpp:96-104` and `kbe/src/server/cellapp/entity.cpp:658-666`.

The actual write-to-DB path is:

1. `Base Entity::writeToDB()` saves an optional Python callback; if there is a Cell entity it sends `reqWriteToDBFromBaseapp`, otherwise it does the Base-side consolidation directly. See `kbe/src/server/baseapp/entity.cpp:1141-1229`.
2. After receiving the request, Cell calls the Cell script `onWriteToDB()`; `backupCellData()` consolidates Cell state into Base, then sends `onCellWriteToDBCompleted` to Base. See `kbe/src/server/cellapp/cellapp.cpp:775-793` and `kbe/src/server/cellapp/entity.cpp:1192-1249`.
3. Base calls `addPersistentsDataToStream()`, serializing only persistent properties into the MemoryStream as property UID + type; persistent Cell properties are taken from the Cell mirror first, the rest from the Base namespace. See `kbe/src/server/baseapp/entity.cpp:398-509`. The serialized stream is then SHA1-hashed; if it matches `persistentDigest_` nothing is written, and if it changed the digest is updated and `DbmgrInterface::writeEntity` is sent. See `:1319-1387`.
4. `Dbmgr::writeEntity()` routes by DB interface into `Buffered_DBTasks` and creates a `DBTaskWriteEntity`; the DB thread calls `EntityTables::writeEntity()`, and finally the MySQL table implementation builds the INSERT/UPDATE. See `kbe/src/server/dbmgr/dbmgr.cpp:1044-1065`, `kbe/src/server/dbmgr/dbtasks.cpp:328-355`, `kbe/src/lib/db_interface/entity_table.cpp:295-302` and `kbe/src/lib/db_mysql/entity_table_mysql.cpp:778-817`. Once the DB task finishes, `presentMainThread()` sends success/failure back to Base; see `kbe/src/server/dbmgr/dbtasks.cpp:378-397`.

### 1.5 Scheduled, shutdown and cell switching: three semantics to keep apart

- **Scheduled DB archiving**: Base calls `Archiver::tick()` on every game tick; by `archivePeriod` it staggers the entities that have `shouldAutoArchive` enabled and already have a DB record, calling `writeToDB()`. They still go through the Cell→Base→Dbmgr path, and an unchanged digest skips the real write. See `kbe/src/server/baseapp/baseapp.cpp:558-583`, `kbe/src/server/baseapp/archiver.cpp:23-63` and `:66-85`.
- **Scheduled Cell→Base backup is not a DB flush**: `Backuper` calls `writeBackupData()` in batches by `backupPeriod`; its default implementation requests Cell state and loads changed Cell data back into Base. It does not invoke a DB task. See `kbe/src/server/baseapp/backuper.cpp:25-74`, `kbe/src/server/baseapp/entity.cpp:1091-1138` and `kbe/src/server/cellapp/entity.cpp:1129-1181`.
- **Switching/destroying a Cell**: when a Cell is destroyed or migrates out, `backupCellData()` can run first and then notify Base via `onLoseCell`; this guarantees state returns to Base, and is not the same as writing to the DB. See `kbe/src/server/cellapp/entity.cpp:204-221`. Only an explicit `writeToDB()` enters the persistence path.
- **Server shutdown**: the `Baseapp::finalise()` checked here does resource cleanup, cancels timers and calls the parent finalise, with no full `writeToDB()` loop. See `kbe/src/server/baseapp/baseapp.cpp:650-670`. So you cannot assume "shutdown auto-flushes"; whether the outer shutdown orchestration requests archiving earlier is unverified here, and a reliable shutdown should explicitly wait for persistence to finish.

### 1.6 What about caching something that is not persistent

Properties with `Persistent=false` do not enter `persistentPropertyDescr_` and are not written by the generic entity tables above; but they still live on the runtime object according to their `.def` Base/Cell flags, participate in the corresponding sync, and Cell data can still be backed up to Base periodically. That backup is in-process protection of the authoritative/mirrored state, not recoverable database persistence. Evidence: `kbe/src/lib/entitydef/scriptdef_module.cpp:603-614`, `kbe/src/server/baseapp/entity.cpp:398-509`, `kbe/src/server/cellapp/entity.cpp:1129-1181`.

If it is only a performance cache, keep it as a non-persistent runtime property; if it must survive a restart, declare it persistent, or implement an explicit storage/cache interface in the business code. The source provides a pure DB interface (for storage that bypasses the Entity schema) and DB task entry points, but how to use them depends on project code; do not treat `shouldAutoBackup` as a durability guarantee. The conditions under which a `pure` interface bypasses entity table sync are at `kbe/src/lib/db_interface/db_interface.cpp:241-245`, and the Entity `writeToDB` rejection of pure interfaces is at `kbe/src/server/baseapp/entity.cpp:1153-1165`.

### 1.7 How relations work across multiple DB tables

Array and component child tables have `id` and `parentID` in the schema; when inserting a child record, the DBID generated by the parent table is passed into the child context and then written as `parentID`. See `kbe/src/lib/db_mysql/entity_table_mysql.cpp:379-395`, `kbe/src/lib/db_mysql/write_entity_helper.h:75-89` and `kbe/src/lib/db_mysql/sqlstatement.h:82-91`. Reads query the main table first, then the child tables by the main row's ID; `ReadEntityHelper::queryChildDB()` reads the child table's `id,parentID` and organizes the data by parent ID. See `kbe/src/lib/db_mysql/read_entity_helper.h:123-149` and `:173-205`.

The persistent property stream of one entity type is mapped to `EntityTableItem` by property UID, and each type of item then handles scalar columns / nested structures; the entity DBID is the main table's primary key. `EntityTable::writeTable()` finds items by UID, see `kbe/src/lib/db_interface/entity_table.cpp:33-61`; the MySQL `writeTable()` reads `pid, child_pid` from the stream and generates SQL per item, see `kbe/src/lib/db_mysql/entity_table_mysql.cpp:778-817`. What the source shows is cross-table parent/child relations and serialized recursive tasks; do not assume every child table is constrained by a database foreign key (no FK creation code appears here).

### Implications for Mistlane

1. Make the entity contract the single source of truth for schema/serialization, but keep automatic schema changes and explicit migration review separate; deleting a field should not silently become destructive DDL in production.
2. Define "dirty flag", "state mirror/backup" and "durable flush" as three distinct API/guarantee levels; migrations, shutdown and scheduled jobs must state explicitly which one they wait for.
3. Collection/aggregate storage should explicitly define the parent key, ordering and update/delete semantics; do not just stuff complex types into unqueryable blobs, and do not default to a relational table for every array item.

## Chapter 2: Why Not a MyBatis-style ORM

### 2.1 Source-code conclusion: not "no mapping layer", but a dedicated mapper built into the engine

KBEngine has a layering like `EntityTables → EntityTableMysql/Redis → DBInterface`, with table items created from `ScriptDefModule` and `PropertyDescription`; the MySQL backend completes column mapping and SQL. See `kbe/src/lib/db_interface/entity_table.cpp:117-143`, `:295-302` and `kbe/src/lib/db_mysql/entity_table_mysql.cpp:136-170`. So the more accurate statement is: it does not adopt a general application ORM, but uses a dedicated mapper bound to the entity protocol, lifecycle and threading model.

### 2.2 Engine constraints and the cost of an ORM

1. **Large numbers of online entities are resident in high-frequency ticks, and creation/destruction can also be frequent.** An Entity on Base/Cell has its own script object, property descriptions, state and entity-container management; the engine also explicitly controls object memory, serialization and cross-component messaging. Bolting ORM identity maps, session lifecycles, proxies/lazy loading and similar mechanisms onto every runtime entity would grow the object graph and lifecycle-management costs. "Massive numbers / short lifetimes" here is a common target for this class of game server, not a fixed-quantity guarantee given by the source; MyBatis's `SqlSession`/mappers and Hibernate-style lazy-loading proxies are also not the same mechanism, so one cannot broadly claim every ORM has proxies.
2. **Property access is far more frequent than DB access.** Base/Cell property setters go through `PropertyDescription::onSetValue`, and the persistent property-change callback marks dirty; game logic reads and writes the Entity directly rather than going through SQL/sessions on every access. See `kbe/src/lib/entitydef/property.cpp:206-215`, `kbe/src/server/baseapp/entity.cpp:96-104` and `kbe/src/server/cellapp/entity.cpp:658-666`. Putting an ORM proxy/tracking layer on this hot path — even a small per-call indirection — multiplies across the large number of property accesses in a tick; this is a performance/architecture inference, not a benchmark conclusion from this source.
3. **The static contract already provides runtime metadata.** The `.def` types, flags, persistent, UID, defaults and lengths are loaded into `PropertyDescription` / `ScriptDefModule`, used directly for property wire serialization, DB table item generation and schema sync. See `kbe/src/lib/entitydef/entitydef.cpp:1097-1297`, `kbe/src/lib/entitydef/scriptdef_module.cpp:603-614` and `kbe/src/server/baseapp/entity.cpp:398-509`. Describing the same columns again with ORM annotations/XML creates a duplicate schema; unless the added tool fills a querying gap, most of that mapping configuration is redundant.
4. **State authority crosses Base/Cell/Dbmgr boundaries.** Cell is the consolidation point for spatial state before it is written to the DB; Base uniformly produces the persistence stream and hands the task to Dbmgr; after the DB thread's task finishes, it calls back to the main thread. See `kbe/src/server/baseapp/entity.cpp:1217-1229`, `:1289-1387`, `kbe/src/server/dbmgr/dbmgr.cpp:1044-1065` and `kbe/src/server/dbmgr/dbtasks.cpp:328-397`. If an ORM session/entity proxy were treated as a cross-process shared identity, you would have to define invalidation, ownership, concurrency and reconnection semantics; that conflicts with the model of "each process holds its own Entity/snapshot and migrates it by messages". The more workable boundary is to use an ORM only inside Dbmgr's persistence adapter, and it cannot replace the cross-process state protocol.
5. **DB access is moved out of the game's main logic thread.** Interface initialization configures the DB thread pool; `Dbmgr::writeEntity()` wraps single-entity `DBTaskWriteEntity` submissions into a queue, executes them in the background and calls back to the main thread. See `kbe/src/lib/db_interface/db_interface.cpp:218-245`, `kbe/src/server/dbmgr/dbmgr.cpp:1044-1065` and `kbe/src/server/dbmgr/dbtasks.cpp:328-397`. The current source demonstrates an async task queue and a multi-connection thread pool; **no ORM-style batched SQL flush was verified on this generic write path**, so one cannot state as fact that "the engine relies on batch writes and an ORM necessarily breaks batching". If Mistlane wants batch writes, it should design a batch API directly and evaluate transaction/ordering/callback semantics.

### 2.3 Why "more flexible" is not automatically more suitable

A MyBatis-style mapper's flexibility lies mainly in SQL, projections, joins, dynamic conditions and query-result mapping; the core need of the game-entity hot path is fixed-type property access, protocol serialization, Cell/Base mirroring and async snapshot writes. The engine's table items are looked up by property UID and handle ARRAY/FIXED_DICT/Component specially, rather than materializing arbitrary SQL results into online entities; see `kbe/src/lib/db_interface/entity_table.cpp:33-61` and `kbe/src/lib/db_mysql/entity_table_mysql.cpp:778-817`. This is workload-targeted restricted flexibility traded for performance and consistency, not an ORM being inflexible in general business development.

### 2.4 The other side: where an ORM really is better

- For admin consoles, operations tools, accounting/orders, reports and other non-tick-hot-path business, where CRUD/relational queries clearly outnumber high-frequency property access, an ORM can substantially reduce SQL boilerplate and provides mature transaction, migration and projection capabilities.
- Where the number of domain objects is bounded, lifecycles are delimited by requests/transactions, and objects do not migrate across Cell/Base, the cost of an ORM session/identity map is more controllable and yields a consistent query model.
- Where the schema evolves often and needs many query combinations, explicit migration + an ORM is usually more controllable than "auto-syncing tables from game entity definitions".
- A hybrid boundary is possible: online Entities keep the lightweight contract and async DB tasks; Dbmgr's account/back-office/report services can use an ORM in a separate module. The precondition is that the ORM holds no long-lived session over cross-process Entities and never blocks the game tick.

### Implications for Mistlane

1. There is no need to copy a traditional ORM, and one should not hand-write every query in the name of "no ORM"; layer by hot path/cold path, use an explicit schema mapper for core entity protocols, and an ORM on the management and reporting side.
2. The data-access abstraction must not swallow the execution boundary: game threads only build serializable commands, I/O completes on worker threads, and results return to the owning process via ID/callback/event.
3. For any new proxy/change-tracking mechanism, benchmark per-entity memory, property access and tick tail latency first; the local source has no benchmarks, so one cannot conclude from "ORMs are always slower".

## Chapter 3: Design Philosophy Reconstructed from the KBEngine Implementation

> This chapter addresses the readable KBEngine source. The responsibility boundaries of the same-named components in BigWorld 14.4.1, and the differences listed below: unverified.

### 3.1 Multi-process partitioning: isolating different authoritative states and loads

The local KBEngine code contains process directories such as `baseapp`, `baseappmgr`, `cellapp`, `cellappmgr`, `dbmgr` and `loginapp`; there is no process directory named `gateapp`. There is also no evidence for simply equating KBEngine's `loginapp` with BigWorld's `gateapp`. The Loginapp accepts login requests and processes account information, and once it receives the Baseapp address it returns login success to the client; see `kbe/src/server/loginapp/loginapp.cpp:877-921` and `:1303-1339`. Baseappmgr picks a Baseapp for an entity by load, see `kbe/src/server/baseappmgr/baseappmgr.cpp:279-318`; Cellappmgr likewise allocates Cellapps by process load/entity count and forwards space-creation requests, see `kbe/src/server/cellappmgr/cellappmgr.cpp:230-263` and `:310-382`. Dbmgr sends data tasks to a background thread pool, see `kbe/src/server/dbmgr/dbmgr.cpp:1044-1065`.

Benefits inferable from the implementation: Base sessions/long-term properties, Cell spatial simulation, DB I/O and access/login each have their own scheduling and failure boundaries; the number of Cellapps can grow independently, with the mgr distributing load. The costs are increased inter-process message protocols, component discovery/registration, state snapshot and recovery complexity; a single DB write also needs the multi-hop Cell→Base→Dbmgr handling plus async callbacks. What is described here is KBEngine's readable architecture; what exactly BigWorld's gateapp is responsible for: unverified.

### 3.2 Cell and Base properties: driven by spatial locality and ownership of authority

`.def` properties carry Base/Cell/Client flags; at parse time the descriptions are placed into different property sets according to those flags, and persistent is an independent dimension, not the same as "Base property". See `kbe/src/lib/entitydef/entitydef.cpp:1134-1168` and `:1277-1297`. Base keeps long-term entity/session context and a mirror of Cell data; Cell is responsible for real-time spatial state, and modifying a persistent Cell property goes through the dirty flag and can broadcast to nearby ghosts. See `kbe/src/server/baseapp/entity.cpp:398-414` and `kbe/src/server/cellapp/entity.cpp:658-708`.

The implied spatial-locality assumption is: an entity has a real owner on a given space/Cellapp, and the overwhelming majority of simulated interactions happen within the same local range; across Cellapps only the necessary ghost/state is replicated near boundaries, rather than all nodes sharing one globally mutable object. The Cell code explicitly broadcasts partial Cell properties to ghosts only when ghosts exist; see `kbe/src/server/cellapp/entity.cpp:684-708`. Splitting Base/Cell lets low-frequency long-term logic and high-frequency spatial simulation go to different resource pools, but cross-boundary interaction and migration pay copying, sync and consistency costs.

### 3.3 AOI built in: spatial triggers connect entity visibility directly to network replication

Cell's `Witness` installs `ViewTrigger`s on entity coordinate nodes by view radius; entering/leaving a trigger maintains view entity references, witness relationships and client pending state. See `kbe/src/server/cellapp/witness.cpp:277-353`, `:356-438` and `:441-470`. Witness attach sends entity enter-world/position-initialization messages to the client; see `:112-160`. So AOI is not just a business query of "who is nearby"; it directly decides which entities the client sees, when they enter/leave view, and the spatial replication load. Building it in reuses one set of coordinate indexing, triggering and lifecycle logic and keeps every gameplay feature from reimplementing it; the cost is that the engine's spatial model is coupled to AOI semantics, and non-traditional-3D-space business must adapt.

### 3.4 Strong assumptions baked into the distributed premise

Strong constraints/assumptions visible in the code include:

1. **A single explicit current owner and per-component addressing.** `componentID`, `entityID` and `dbid` are passed explicitly in DB messages, and the online-entity DB log records which process owns an entity; it is not several services directly modifying the same entity row at once. See `kbe/src/server/dbmgr/dbmgr.cpp:1047-1065` and `kbe/src/server/dbmgr/dbtasks.cpp:357-371`.
2. **Entity state can be packed and transported by contract.** Persistent properties are written into the MemoryStream by UID and type, and Cell data is likewise consolidated/backed up; process boundaries are serialization boundaries. See `kbe/src/server/baseapp/entity.cpp:398-509`, `:1319-1387` and `kbe/src/server/cellapp/entity.cpp:1129-1181`.
3. **Cellapps carry spatial-partitioning semantics, with the mgr managing placement.** A new space is assigned by Cellappmgr to an available Cellapp, which forwards the creation request; this is not arbitrary stateless microservices scaling on HTTP requests. See `kbe/src/server/cellappmgr/cellappmgr.cpp:230-263` and `:310-382`.
4. **Consistency comes more from message ordering, authority migration and snapshot constraints than from shared database transactions.** DB writes are independent async tasks, cell/base data is aggregated before writing, and the online-entity log is used to avoid duplicate checkout from multiple places. See `kbe/src/server/dbmgr/dbtasks.cpp:328-397` and `kbe/src/server/dbmgr/dbtasks.cpp:357-371`.

So "game servers are distributed" here does not mean flattening a monolith into stateless replicas; it defaults to entities and spaces having owners, network partitions requiring explicit migration/mirroring, and persistent state being the recovery source rather than a per-run read source. The risk of losing not-yet-flushed data on crash also exists, and the scheduled archive period defines the potential loss window; the source provides no exactly-once or cross-DB/game-process transaction guarantees.

### 3.5 What looks dated today and what still holds

**Implementation shapes worth re-evaluating:**

- Using dedicated mgr/central directories as the control plane that picks concrete processes integrates differently from cloud-platform service discovery, elastic scheduling and failure-domain/zone placement; you can keep the "route by entity/space owner" semantics and replace the control plane implementation.
- Entity definitions directly drive production schema, and columns/tables are automatically added, modified and deleted at startup (`kbe/src/lib/db_interface/entity_table.cpp:208-226`, `kbe/src/lib/db_mysql/entity_table_mysql.cpp:427-463`), with no explicit versioned migration/approval boundary; this especially needs redesign for online rolling upgrades.
- Strongly stateful processes, Python-object entities and single-owner migration are incompatible with the cloud-native default of "fully stateless services, any replica takes any request"; forcing statelessness moves spatial simulation into distributed shared state / high-frequency network sync, which is not necessarily simpler.
- KBEngine has no process named GateApp; how gateway duties should be split needs verification against the specific distribution, and original BigWorld is unverified here.

**What still holds today:**

- High-frequency simulation partitioned by space with local authority reduces shared writes and global sync; modern services still need sharded ownership / actor placement.
- AOI/interest management is part of the replication and bandwidth budget; incremental updates driven by spatial indexes and view boundaries remain effective.
- Decoupling database I/O from the game tick, explicit async callbacks, and skipping unchanged writes based on snapshot digests are still valid principles for lowering tail latency.
- A static schema helps serialization compatibility, with client protocol and DB mapping sharing one contract; the modern approach can be generated code/explicit migration, without falling back to hand-writing DTOs, SQL and network fields twice.

### Implications for Mistlane

1. Adopt the distinction "domain state has an owner; services are replaceable/restartable": cloud-native does not mean simulation state is ownerless; define an authoritative node, lease/migration and crash recovery for every entity/scene.
2. Treat AOI/visibility as a transport-layer resource-control mechanism: the business supplies interest policy, and the runtime owns spatial indexing, incremental diffing, throttling and client lifecycle.
3. Keep the value of Cell/Base-style responsibility isolation but do not copy the process names; deploy independently scalable workers based on actual CPU/network/persistence bottlenecks, and decouple the control plane from the game data plane.
4. Persistence flush periods, shutdown drain, migration confirmation and DB failure retry should form a testable protocol; do not mistake dirty flags, cached copies or process exit for a durable commit.

## Chapter 4: The Layered Conclusion — Engine Hot Path and Back-office Operations Are Two Different Storage Systems

The previous chapter answered "why doesn't the engine use a MyBatis-style ORM". But that question carries an inference that is easy to misread:
**"ORMs are bad"**. That is not the conclusion, and it must not become Mistlane's selection criterion.

The real dividing line is **read/write direction and access frequency**, not technical fashion.

### 4.1 The two scenarios have fundamentally different problems

| Dimension | Online entity hot path | Back office / operations / GM |
|---|---|---|
| Main operation | Read in-memory properties, rarely write the DB | CRUD against the DB |
| Access pattern | Single-entity read/write, high-frequency tick | Cross-entity queries, filtering, aggregation |
| Field source | Fixed statically by the contract | Often needs dynamic conditions and projections |
| Write requirements | Off the main thread, batched, rollback-capable | A single-row transaction suffices; low immediacy |
| Latency sensitivity | Microseconds; affects frame logic | Milliseconds to seconds; humans can wait |
| Consistency | In-memory state is authoritative, DB is a mirror | DB is authoritative; no in-memory state |

**The typical shape of web/CRUD is "many reads, few writes"**, so an ORM's lazy loading, session cache and change tracking become a benefit.
**The shape of online entities is "many in-memory reads, very few DB writes"**, and the same mechanisms become pure overhead — they insert a layer of indirection on your hottest path.

### 4.2 The engine's writes carry three constraints an ORM usually does not manage

1. **DB writes must be movable off the main thread**: a DB thread pool + batch commits, so writes never block frame logic
2. **Authority must be consolidated before writing**: Cell's spatial state is first collected back into Base, and Base then uniformly produces the persistence stream
   (KBEngine's `Cell backup → Base → DBTaskWriteEntity` path)
3. **A failed write must be able to fall back to in-memory state**: the DB is a mirror; a failed write must not pollute the authoritative state in memory

These three are why the engine ships its own dedicated mapper, and they are exactly what breaks most easily when a general ORM is introduced.

### 4.3 Mistlane's selection advice: layer it, do not pick a side

**Split into two layers explicitly, pick the right tool for each, and do not unify them for the sake of "consistency":**

| Layer | Recommendation | Why |
|---|---|---|
| Entity properties to DB (hot path) | Keep an engine-style dedicated mapper | The contract is the schema; writes can be moved off the main thread, batched and rolled back |
| Operations backend / GM / reports | **Use an ORM** (e.g. GORM, sqlx + codegen) | CRUD-heavy, varied queries, dynamic fields — an ORM is a pure win |
| Data analysis / offline statistics | Read the DB directly or go through a data warehouse | Fully isolated from the online path; needs neither an ORM nor a mapper |

**The test in one sentence**: **on this path, are you "reading in-memory properties" or "reading the database"?**
The former takes the dedicated mapper, the latter an ORM — no agonizing needed.

### 4.4 Two extremes to avoid

- **Hand-writing SQL in the back office for consistency with the engine**: reinventing the wheel, while losing type safety and migration capability
- **Putting an ORM on the hot path for uniformity**: inserting an indirection layer on the highest-frequency path and breaking the three write constraints above

Each end uses its own tool, and the middle is joined by **the contract file as the single source of truth**:
the contract can generate both the entity mapper's metadata and the back-office ORM's structs/table models, keeping the two definitions from drifting.
