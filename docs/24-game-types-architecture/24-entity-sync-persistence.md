# Attribute Sync and Contract Persistence: BigWorld vs KBEngine

> Source: mistlane repo docs/entity-sync-persistence.md (2026-10-19)
> Evidence base: local source under /home/cui/workspaces/kbengine/ — BigWorld-Engine-14.4.1 and KBEngine
>
> **Nature: source-code-level research conclusions; every item is annotated with file path:line number or official documentation URL.**
> The mistlane repo docs/entity-contract.md already has a .def contract proposal; this document completes the chain and does not replace it.

---

# BigWorld and KBEngine: Attribute Sync and Contract Data Persistence

## Scope, Evidence, and Relationship to Existing Proposals

This document verifies the chain "contract → runtime attributes → visible copies → binary representation → database → contract evolution," and discusses design rationale and costs. **This is engine-behavior research and does not mean Mistlane has implemented these capabilities.** Data persistence here means entity attribute persistence, not storing `.def` files in a database.

[entity-contract.md](24-entity-sync-persistence.md) already covers Mistlane's XML `.def` proposal, stable IDs, generated artifacts, controlled Lua attributes, nested deltas, visibility baselines, and data version migration goals; its "Verified BigWorld and KBEngine behavior" section has already confirmed container-change differences between the two. This document keeps that conclusion and adds the two engines' actual distribution flags, AOI, stream encoding, SQL mapping, writeback/caching, and migration entry points for comparison. The original proposal's sproto, home data, and revision/ownership generation cannot be reverse-engineered into existing mechanisms of the two engines.

Verification date: 2026-10-19. Version boundaries:

- **BW local source: unverified.** The task-specified `/home/cui/workspaces/kbengine/BigWorld-Engine-14.4.1/` was an empty directory on this check (no source files), so no claim is made here that the local BigWorld implementation was read this round. The **BW-S** conclusions retained from the original draft come from a public BigWorld 2.0.1 source mirror, commit `481e69a837a9f6d63f298a4f24d423b6329226c6`; it is not local source, nor a still-maintained official release site, and some server-side `.cpp` files are missing. Code conclusions on those files can only be treated as static evidence of that mirror and must not be extrapolated to local 14.4.1.
- **BW-G**: the public archive of the Server Programming Guide / Server Operations Guide; the programming guide's front page is marked **BigWorld 2.1 (2012)**, not 14.4.1. Documentation evidence and 2.0.1 mirror evidence are labeled separately, with no claim of version parity; the archive URL also does not replace the missing local source.
- **KB local source**: `/home/cui/workspaces/kbengine`, branch `master`, checked-out commit `c9ca49ed848f597f3fe66cee831638b7043a5c62` (1 commit ahead of `origin/master`, clean working tree). The body and source index give locally reviewable paths and line numbers; it is not another branch, Nex, or a commercial derivative. The KB links in the original draft are still pinned to the older commit `7d379b9f943d2731b09c45398855f98efe74d046`; local file line numbers are the verification basis this round.
- **Verified** means the cited local KB source path can be statically traced, or the cited guide states it explicitly; BigWorld code conclusions are not part of this round's local verification. Neither engine nor database integration tests were run. **Design analysis** is inference and does not pretend to be author intent; statements lacking evidence are explicitly marked **unverified**.

Sources: [BW source mirror][bw-root], [vendor programming guide version page][bw-guide], [KBEngine source][kb-root].

**Reading limitation notice:** the text below still retains the earlier draft's conclusions supported by the BW-S mirror and BW-G archive, and does not overturn the container-callback conclusions already verified in `entity-contract.md`; however, this round did not re-check BigWorld code in the specified local directory as the task required. Any implementation detail supported only by BW-S and not confirmed by the guide should not be treated as established fact about 14.4.1.

## Item-by-Item Comparison Table

The source codes in the table point to the pinned source code or vendor documentation at the end of the document; the following five sections expand on conditions and exceptions.

| Link / Question | BigWorld | KBEngine | Source |
|---|---|---|---|
| 1. Contract entry | `scripts/entities.xml`, `entity_defs/*.def`; `alias.xml` defines type aliases | `scripts/entities.xml`, `entity_defs/*.def`, `types.xml`; loaded as ScriptDefModule / PropertyDescription | BW-E; KB-E, KB-T |
| 1. Types / defaults | `<Type>`, `<Default>`; DataType builds types and values | `<Type>`, `<Default>`; DataTypes registration and type factory | BW-D; KB-E, KB-P |
| 1. Distribution flags | XML `BASE`, `OWN_CLIENT`, `ALL_CLIENTS`, etc. map to `DATA_*` | XML names map to `ED_FLAG_*` ranges, which then form `ENTITY_BROADCAST_*` masks | BW-F; KB-F |
| 1. Persistence / editing | `<Persistent>` is independent of distribution; `<Editable>` is distinct from `EDITOR_ONLY` | `<Persistent>` is an independent boolean; generic `editor` tag is unverified, and `broadcast` is expressed by range masks | BW-F; KB-E, KB-F |
| 2. Change trigger | Cell authoritative attribute assignment and controlled container mutation trigger propagation; Base has exceptions | The entity attribute assignment entry calls `onDefDataChanged`, dispatched separately by Base/Cell | BW-GP, BW-C; KB-M, KB-B, KB-C |
| 2. Own / others | OWN goes to the owner; OTHER goes to AOI observers; ALL is the union of both | Corresponding OWN/OTHER masks; OTHER iterates witnesses and checks the actual view and distance level | BW-GP; KB-C |
| 2. Base to client | BW-G states `BASE_AND_CLIENT` only syncs at creation; later changes must be passed by method | KB-S Base `onDefDataChanged` sends follow-up updates to the bound client | BW-GP; KB-B |
| 2. Delta / full | Initial visible data, then per-attribute, nested-path, and slice changes | Initial visible attribute set, then full typed values for changed attributes; in-place mutations of ordinary containers cannot be assumed to auto-notify | BW-C, BW-PC; KB-W, KB-C, KB-M |
| 2. AOI / filtering | Cell/Witness manages the interest range; attribute flags and LOD decide what can be sent | Cell ViewTrigger/Witness manages observation relations; distribution re-checks view and attribute DetailLevel | BW-W; KB-W, KB-C |
| 3. Field mapping | `tbl_<Entity>`, `sm_` fields and sequence subtables; DataType → PropertyMapping | `tbl_<Entity>`, `sm_` fields; scalar/dict mapping and ARRAY/component subtables | BW-PM; KB-SQL |
| 3. DDL generation | `sync_db` reads definitions and generates/executes CREATE/ALTER/DROP; a config option can launch the subtool | EntityTables sync during database initialization for non-pure databases, generating/executing DDL | BW-SYNC, BW-TS; KB-DBI, KB-SQL |
| 3. Writeback timing | Explicit `writeToDB`, automatic archive; a secondary DB can commit in batches then consolidate | Explicit `writeToDB`, periodic Archiver, destroy path with save options | BW-DB, BW-CFG; KB-B, KB-A |
| 3. Cache / flush | Live entity memory and a per-entity DB task queue; optional SQLite secondary DB | Live entity / Cell data, persistence digest, per-entity DB task queue; not equivalent to a standalone persistent cache | BW-BUF, BW-CFG; KB-B, KB-Q |
| 4. Network representation | DataType + BinaryOStream; attribute index/path encoding, with special formats for nested and slice | DataType + MemoryStream; `onUpdatePropertys`, entity identifier plus component/attribute UID or uint8 alias | BW-PC, BW-D; KB-C, KB-R, KB-AL |
| 4. "First byte" | BW-S found no basis for naming attribute flags `UTYPE_` | Outer message ID is uint16; attribute alias can be uint8; a fixed `ENTITY_PROPERTY` first byte is unverified | BW-F; KB-F, KB-N, KB-R |
| 5. Changing stored data | The tool aligns columns/tables; added defaults are handled, but complex semantics need project migration | Initialization sync can add/modify/delete columns and drop old tables; complex semantics still need project migration | BW-SYNC, BW-PM; KB-SQL, KB-TABLES |
| 5. Network compatibility | Both sides depend on matching definitions/indices, not self-describing XML messages | UID/alias and DataType depend on matching definitions; definition digest is not data migration | BW-E, BW-PC; KB-AL, KB-H |

## 1. Contract Definition: What Is Declared, Who Interprets It

### BigWorld

The entity manifest registers types; EntityDescription parses the `.def` attributes, parent classes/interfaces, and methods, while DataDescription stores metadata such as types, flags, and defaults. DataType is responsible for validation, defaults, and serialization; the network/database structure is not derived directly from a member list of an arbitrary Python object.

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

The XML range mapping can be checked directly in BW-S's `s_entityDataFlagMappings`:

- `BASE` → `DATA_BASE`; `BASE_AND_CLIENT` adds `DATA_OWN_CLIENT`.
- `CELL_PRIVATE` → distribution bit is 0; `CELL_PUBLIC` → `DATA_GHOSTED`, allowing ghosts in other Cells to fetch it.
- `OWN_CLIENT` → `DATA_OWN_CLIENT`; `OTHER_CLIENTS` → `DATA_GHOSTED | DATA_OTHER_CLIENT`.
- `CELL_PUBLIC_AND_OWN` and `ALL_CLIENTS` are combinations of the above bits; the client set for ALL is bounded by AOI.
- `<Persistent>` adds an independent `DATA_PERSISTENT`; the default construction does not include this bit. `<Editable>` controls editability in the editor; `EDITOR_ONLY` / `DATA_EDITOR_ONLY` means editor-only data and must not be conflated with it.

Defaults may come from type/alias and attribute declarations; fixed-length arrays must be initialized to their length. `databaseID` is the database identity, while the runtime `id` is not suitable as a permanent reference.

**On the `UTYPE_` in the task: it is unverified as a BigWorld attribute flag.** This round's BW-S DataDescription uses `DATA_*`, not `UTYPE_*`; do not conflate USER_TYPE (user type), type ID, attribute index, or KBEngine's Utype with distribution bits. Whether other BW versions use that naming is unverified.

Sources: BW-S [EntityDescription][bw-e], [DataDescription parsing][bw-f], [flag definitions][bw-fh], [DataType][bw-d]; BW-G [attribute declaration and defaults][bw-gp], [database identity][bw-db].

### KBEngine

EntityDef loads entities, types, interfaces/parent classes, and attributes; `loadDefPropertys` looks up `<Flags>` and `<Type>`, parses `<Persistent>`, `<Default>`, `<Utype>`, `<DatabaseLength>`, `<Index>`, and `<DetailLevel>`, constructs PropertyDescription, and adds it to the runtime and persistence descriptor sets.

The hp example above also conforms to this part of the KBEngine XML structure, but that does not mean full `.def` or wire compatibility. KB-S raises an error when an attribute lacks Flags/Type; Persistent defaults to false, and defaults are handed to the specific DataType to create. `types.xml` provides composite types such as aliases, ARRAY, and FIXED_DICT.

- Distribution constants are `ED_FLAG_BASE`, `ED_FLAG_BASE_AND_CLIENT`, `ED_FLAG_CELL_PRIVATE`, `ED_FLAG_CELL_PUBLIC`, `ED_FLAG_OWN_CLIENT`, `ED_FLAG_OTHER_CLIENTS`, `ED_FLAG_ALL_CLIENTS`, `ED_FLAG_CELL_PUBLIC_AND_OWN`.
- `ENTITY_BROADCAST_CELL_FLAGS`, `ENTITY_BROADCAST_OWN_CLIENT_FLAGS`, `ENTITY_BROADCAST_OTHER_CLIENT_FLAGS` are masks derived from these ranges; **there is no evidence that they should be written as `<broadcast>true</broadcast>`**.
- persistent is a boolean policy on the descriptor object, not a requirement for business code to OR it into a range enum.
- **The generic `editor` / `<Editor>` attribute marker is unverified**: the checked `loadDefPropertys` and PropertyDescription show no corresponding read/member; BigWorld's Editable cannot be directly applied to KBEngine. This document does not draw negative conclusions about other branches.
- Utype is an attribute identifier; KB-S's `ENTITY_PROPERTY_UID` is uint16. It can be specified explicitly or assigned by the engine, and it carries no boolean semantics of persistent/editor/broadcast.

Sources: KB-S [EntityDef loading][kb-e], [type registration][kb-t], [PropertyDescription][kb-p], [flags and UID][kb-f]; [official definition format][kb-defdoc].

## 2. Attribute Sync: From One Assignment to a Visible Copy

### BigWorld

After an authoritative attribute changes in a Cell, the engine propagates to ghosts, the owner, and observers according to the definition. OWN_CLIENT goes only to the owner; OTHER_CLIENTS goes to clients observing that entity; ALL_CLIENTS is the union of the two, not a whole-server broadcast. Cell spatial interest management and Witness decide who observes, and attribute LOD further reduces visible detail at a distance.

BW-G states an explicit exception: **BASE_AND_CLIENT only initializes when a client entity is created; later Base modifications are not pushed automatically and require method passing**. Do not promise that every assignment auto-syncs just because DATA_OWN_CLIENT appears in the flags.

Creating a copy initially needs initialization data for visible attributes; afterwards ordinary attributes are sent as changes; a top-level replacement sends that attribute value, while internal container changes can be expressed as path, single-item, and slice operations. BW-S has PropertyOwner, PropertyChange, SinglePropertyChange, SlicePropertyChange; BW-G has `set_<property>`, `setNested_<property>`, `setSlice_<property>` callbacks. **The already-verified conclusion stands: BW supports more than top-level assignment.**

The logical unit is an attribute change event, not a full re-send of the whole entity each time; a transport bundle/packet can carry multiple messages, so one attribute write should not be equated with one UDP packet. This document does not claim all 2.0.1 versions merge duplicate writes in the same tick; SendLatestOnly/IsReliable in the 2.1 guide are versioned options, and one cannot claim the default sends only the final value on that basis. The specific cache-reuse/event-backfill strategy after leaving and re-entering AOI was not verified item by item this round, and no claim is made that it always performs a full rebuild.

Sources: BW-G [distribution, LOD, propagation, and bandwidth options][bw-gp], [client attribute callbacks][bw-callback], [Witness][bw-w]; BW-S [PropertyOwner][bw-po], [PropertyChange encoding][bw-pc].

### KBEngine

KB-S traceable chain:

1. The attribute assignment branch in `entity_macro.h` checks the definition/type and calls the Entity's `onDefDataChanged`.
2. The Base initialization phase skips notification; persistent attributes are marked dirty; if it is BASE_AND_CLIENT and a client is bound, it constructs `onUpdatePropertys` for downstream delivery. **This differs from the earlier BW-G Base exception.**
3. Cell only distributes for a real entity and outside the initialization phase; it updates ghosts, other clients, and the own client by mask.
4. The OTHER branch iterates `witnesses_`; it checks observer, connection, and `entityInView(id)`, then filters by attribute DetailLevel distance; the OWN branch sends separately.
5. The value is encoded by `propertyDescription->getDataType()->addToStream`. The logical payload of one assignment notification is the typed value of that attribute; a bundle can accumulate messages, so one cannot assume each tick keeps only the last assignment.

When Witness handles `ENTER_CLIENT_PENDING` it calls `addPositionAndDirectionToStream` and `addClientDataToStream(..., true)`, sending initialization attributes first and then enter-world; leaving has a leave-pending path. "Full" here means **the set of attributes this recipient is allowed to see**, and does not include private fields or the entire database record.

**The container limitation keeps the original conclusion**: in-place element/slice mutations of ordinary FixedDict and Sequence show no owner-entity notification in the paths checked; do not assume they automatically produce network deltas. A top-level reassignment does go through attribute notification and encodes that container value. EntityComponent has a separate notification mechanism, which is not proof of container path deltas at arbitrary depth. Re-serialization on save may read the mutated container, which also does not prove the mutation was synced in real time.

Current entry points, baselines, and filtering paths are verified; recovery across disconnects, backfill for all LOD switches, and the complete recovery state machine for mixed client versions are **unverified**, and must not be written in as the sequence-gap/rebaseline protocol in the Mistlane proposal.

Sources: KB-S [assignment entry][kb-m], [Base dispatch][kb-b], [Cell dispatch][kb-c], [Witness init/leave][kb-w], [FixedDict][kb-fd], [Sequence][kb-seq], [EntityComponent][kb-comp].

## 3. Contract Persistence: From Definition to SQL to Writeback {#loading-and-persistence}

### BigWorld

The loaded EntityDescription/DataDescription also serves database mapping. The persistence stream is filtered through `ONLY_PERSISTENT_DATA`; data domains such as base/client and cell/client have a fixed traversal organization, and the XML or Python object memory is not written directly to the database. Built-in save rules for position/direction and the like must still be handled per engine, not just by enumerating business fields.

The MySQL backend's PropertyMapping generates column/subtable mappings per DataType: main table `tbl_<Entity>` with the database ID in `id`; scalars generally map to main-table columns, vector components and FIXED_DICT fields are expanded, and ARRAY/TUPLE use subtables linked to the parent record. String/binary/user types have dedicated mappings and should not be generalized as "all types are the same BLOB." On load the corresponding mapping rebuilds typed values; non-persistent attributes are re-initialized.

`sync_db`'s MySqlSynchronise / MySqlTableInitialiser compares definitions with the actual structure and generates and executes CREATE, ALTER, DROP, including adding/deleting/modifying columns. **What is verified is that the tool generates and executes SQL, not that every build necessarily emits a reviewable `.sql` file**. The `syncTablesToDefs` startup option can launch the standalone tool via TableSynchroniser; production can turn off automatic structure modification and maintain the database first.

Writes are managed by Base's `writeToDB`, collecting Cell state when needed; explicit writes are asynchronous with a completion notification. Automatic archive is scheduled by `baseApp/archivePeriod`, not an immediate UPDATE on every assignment. Whether destruction saves also depends on options/lifecycle policy, and any destroy must not be treated as a forced flush.

Cache and flush must be split into three layers:

- Live entity memory values are the online state; the Base save path obtains the data to be persisted.
- MySQL background tasks buffer/serialize per entity identity to prevent out-of-order tasks for the same entity; the queue is not a persistent log, nor a cache database that business code can query arbitrarily.
- With the secondary DB enabled, BaseApp writes to local SQLite; automatic archive can commit in batches by `secondaryDB/maxCommitPeriod`, and explicit writeToDB triggers a commit. Then `consolidate_dbs` runs recovery flows after shutdown/failure and consolidates into the main database. **A committed SQLite state and an updated main MySQL are two different moments**; before consolidation one must not back up only the main database and assume the latest state is complete.

When the secondary DB is not enabled, DBMgr/the MySQL backend performs the write; database commit/disk reliability still depends on the database configuration. Network delivery, in-memory backup, SQLite commit, and main-database commit must not all share the vague promise of "saved."

Sources: BW-S [persistence filtering][bw-e], [PropertyMapping][bw-pm], [DDL sync][bw-sync], [sync subtool launch][bw-ts], [per-entity queue][bw-buf], [Base save interface][bw-base]; BW-G [database mapping/writes/secondary DB][bw-db], [archive/SQLite commit config][bw-cfg], [consolidation and sync_db operations][bw-ops].

### KBEngine

At startup DBMgr initializes EntityDef; DBUtil's database initialization loads EntityTables, and non-pure databases call `syncToDB`. EntityTableMysql builds TableItems from persistent attribute descriptors: base numerics map to numeric columns, vectors expand into components, FIXED_DICT recursively organizes fields, and ARRAY/EntityComponent create subtables. Table/field prefixes are `tbl_` and `sm_` respectively, and subtable records carry a parent ID. DatabaseLength/Index affect length and indexing of applicable types; not all DataTypes can be indexed indiscriminately.

`sync_item_to_db` / `EntityTableMysql::syncToDB` generates and executes SQL, with EntityTables aggregating subtable sync; likewise, **it is unverified that an offline SQL script file is generated by default**. The deletion and type-change risks of startup DDL are covered in Section 5.

Runtime writeback path:

1. Base explicit `writeToDB`, or the Archiver spreads entities that have a database record and allow auto-save across ticks by `archivePeriod`; `destroy` with a writeback option also enters the save path.
2. When a Cell exists, it first requests `reqWriteToDBFromBaseapp`, and on completion enters `onCellWriteToDBCompleted`; the save hooks include `onPreArchive` / `onWriteToDB`.
3. `addPersistentsDataToStream` builds the persistent attribute stream; Base compares the SHA1 digest of the full persistent stream and skips the actual DB write if identical. It is not a network-path delta, nor a per-attribute SQL UPDATE log.
4. The change stream is sent to DBMgr `writeEntity`; Buffered_DBTasks queue by DBID or the new entity's runtime ID, and DBTaskWriteEntity calls EntityTables / EntityTableMysql, decoding into column values, executing INSERT/UPDATE and subtable operations.
5. After the DB task returns a result, it sends back `onWriteToDBCallback`, updating the database identity and invoking the callback. A called function returning or a message entering the queue must not be treated as database success.

The cache includes online entities, Cell data in Base, the persistence digest, and queued tasks. In the source the digest is updated before submitting the DB task, and there is a "return directly if the digest matches" path, so **that digest cannot be called the last successfully committed revision, and one cannot promise every writeToDB triggers a database operation/callback**. Failure retry, new changes during save, and callback completeness need dedicated verification.

This round found no general mechanism equivalent to BW's secondary SQLite → MySQL consolidation; **it is unverified that KBEngine has a standalone attribute persistence cache with a callable flush API**. The verifiable meaning of flush here is only sending a chosen memory snapshot into an asynchronous DB task and waiting for the result; MySQL transactions, fsync, cross-entity atomicity, and crash durability are not guaranteed by the attribute sync mechanism.

Sources: KB-S [DBMgr init/write entry][kb-db], [database initialization][kb-dbi], [EntityTables][kb-tables], [MySQL fields and writes][kb-sql], [Base save and digest][kb-b], [Archiver][kb-a], [queueing][kb-q], [DBTaskWriteEntity][kb-task].

## 4. Network Representation: Typed Values, Attribute Identifiers, and Outer Messages

### BigWorld

`DataType::addToStream` / `createFromStream` work together with DataDescription/EntityDescription to control binary read/write; numerics use their declared width and containers their typed structure, and the receiver needs the same definitions. Initialization/persistence use the corresponding data-domain filters, and the database stream must not be treated as byte-for-byte the same format as the observer-facing stream.

BW-S's PropertyChange encoding distinguishes simple top-level attributes, extended single items, and slices: low-numbered top-level attributes can use message-identifier encoding; complex paths write path indices/continuation bits and the like through BitWriter, while the actual value is still encoded by DataType. "Delta" here mainly means only sending changed fields/container operations, not universally sending `newValue - oldValue`. Definition indices, paths, and message wrapping together constitute the format and cannot be abstracted into a uniform `{name, JSON value}`.

Sources: BW-S [DataType][bw-d], [EntityDescription stream][bw-e], [PropertyChange][bw-pc], [reader][bw-reader].

### KBEngine, and the `ENTITY_PROPERTY` First-Byte Claim

KB-S's verified representation splits into three layers:

```text
外层：message ID:uint16 + [可变长消息长度] + message body
普通属性更新 body：entityID + { componentPropertyID, propertyID, typedValue }...
优化属性更新 body：view 中的 entity alias:uint8 + 相同的属性记录...
属性 ID：开启且容量允许时为 uint8 alias；否则为 uint16 UID
普通顶层属性的 componentPropertyID 为 0；组件属性则标识其组件
```

`onUpdatePropertys` and `onUpdatePropertysOptimized` are the current update messages; after Client Entity reads the entity identifier it loops reading component/attribute identifiers, looks up PropertyDescription, and then decodes the value with DataType. ARRAY and FIXED_DICT are encoded by their type serializers; do not infer the whole structure from some fixed type byte in this message. Whether an alias is used is decided by the ScriptDefModule assignment result, and client and server must agree.

**"KBEngine uses ENTITY_PROPERTY as the first byte of the network packet" is unverified.** In the checked-out implementation no client attribute packet path was found that supports that fixed marker; the outer layer reads a uint16 message ID first, and the first uint8 of an attribute record in alias mode may be the component identifier 0 rather than an attribute type enum. `ENTITY_PROPERTY_UID` is a uint16 typedef and is also not a fixed first byte. If the claim refers to an older SDK or a custom transport protocol, the version and implementation need to be supplied; this document does not guess values or semantics.

Sources: KB-S [Base encoding][kb-b], [Cell encoding][kb-c], [client read][kb-r], [UID definitions][kb-f], [alias assignment][kb-al], [DataType][kb-d]; [official message encapsulation][kb-netdoc].

## 5. Version Compatibility: Structure Sync Is Not Business Migration

### BigWorld's Stored Data

`sync_db` compares entity definitions with database structure and can add columns, delete redundant columns/tables, and modify types and indices; BW-S's MySqlTableInitialiser includes ADD/DROP/MODIFY and handling for new-column defaults. The operations guide states that sync_db must not run while unconsolidated secondary DBs exist: old secondary data is also bound by old definitions, so migrating only the main database is not enough.

Do not promise that "adding an attribute always gives every old record the same default value as the new entity." BW-S's PropertyMapping explicitly records a counterexample: when adding an ARRAY/TUPLE, existing database entities have no elements by default, while newly created entities use the declared array default; new fields of a FIXED_DICT inside an ARRAY use the subtype default. Column defaults, missing runtime values, and backfilling existing records are three separate problems.

Deleting a field may lose data; renaming cannot be recognized as the original field just because the type is the same; conversions such as narrowing an integer, changing string length/encoding, or turning a scalar into a structure need business decisions. **Lossless automatic conversion of arbitrary changes, online mixed-version read/write, and automatic rollback are unverified.** DDL can succeed while numeric units, ID meaning, and business constraints are still wrong.

Sources: BW-S [column/table sync and defaults][bw-sync], [array default exceptions][bw-pm]; BW-G [sync_db and consolidation][bw-ops].

### KBEngine's Stored Data

KB-S non-pure database initialization syncs the contract structure:

- Missing columns generate ADD; when one exists but type/length etc. do not match, the duplicate-column branch generates MODIFY COLUMN.
- EntityTableMysql iterates database columns and deletes columns the current TableItem no longer recognizes; EntityTables also cleans up entity tables not in the mapping. So deleting/renaming an attribute or removing a persistence marker can take a destructive path rather than quietly preserving historical columns.
- The DDL of numeric TableItems can include declared defaults; **not every type has the same SQL DEFAULT rule**. Changing only Default does not guarantee existing rows are modified; in particular `sync_item_to_db`'s fast comparison checks type/flags/length but not default, and returns directly when they match.

Type conversion effects depend on MySQL's rules and configuration, and the MODIFY in the source carries no business conversion functions. Renaming, splitting/merging fields, backfilling old array elements, currency unit changes, and rollbacks still need project migration scripts and verification. A stable `Utype` also does not prevent name-based SQL column changes.

The network side uses shared definitions, alias mapping, and definition digests; DBMgr/client digest checks help detect mismatches but **cannot convert already-stored data**. Neither "online entities automatically keep old data semantics after a hot reload" nor "arbitrary old/new clients interoperate" is verified on either side; do not confuse this with the version routing/migration goals in the existing Mistlane draft.

Sources: KB-S [initialization conditions][kb-dbi], [column sync/default comparison][kb-sql], [old table cleanup][kb-tables], [aliases][kb-al], [digest handshake][kb-h].

### Why Migration Is Complex, and a Recommended Release Strategy (Design Analysis)

The same attribute carries **network identity, runtime type, database mapping, and business meaning** at once. Changing any one can affect client decoding, online objects, old records, backups, and rollback procedures; automatic DDL only knows structural differences and cannot infer "changing gold to fen should multiply by 100" or "a dropped column is really a rename."

BW tends to provide a standalone structure-sync tool and handles the consolidation preconditions of secondary DBs; KB-S places non-pure DB structure alignment on the initialization chain, which is convenient for development but has a wider startup blast radius. Neither side can replace business migration design with just the `.def`.

Suggested project release steps: back up and verify restore first, freeze/drain old writes, and handle unfinished persistence; review the DDL and business conversions on a copy of the old data, then deploy the matching contract/client. For rolling releases use add-field → dual read/controlled dual write → backfill verification → switch reads → delayed deletion; this is an extra engineering plan, not a verified default feature of either engine. Rollback of a destructive change must plan data recovery at the same time and cannot just revert to the old `.def`.

Basis: the sync, default, and old-table-cleanup source of both sides above; the existing [Mistlane persistence and compatibility proposal](24-entity-sync-persistence.md#loading-and-persistence) already requires explicit migration, and this document does not change that choice.

## Six Design Rationales and Trade-offs (Design Analysis)

The following is derived from the mechanisms listed above; beyond the guide statements explicitly cited, no claim is made to have found author intent.

1. **Declarative contracts vs code-hardcoded attributes.** One type model serves validation, client description/code generation, distribution, and database mapping, avoiding separate structure copies across Python/Lua, network, and SQL. The cost is that parsers, descriptors, generators, and ID/digest compatibility become infrastructure; dynamic business-code changes no longer mean the data layout can be changed at will. A few purely local temporary variables need not enter the contract; state that crosses boundaries or must be restored should be declared explicitly. Basis: BW-E/BW-D and KB-E/KB-P.

2. **Persistence vs sync-only.** These are independent dimensions, not mutually exclusive classes: you can "save and sync," "save but private," "sync but not save," or "do neither." Gold needs reliable saving but is usually visible only to its owner; animation or transient combat presentation can sync without surviving a restart. Separating them reduces DB write amplification and privacy exposure, while preventing a persistence choice from accidentally changing visibility. Non-persistent state may also need process migration/disaster-recovery transfer; database-restored values are then rebuilt by default rules. Basis: BW-F/BW-E and KB-F/KB-B.

3. **Delta vs full snapshot.** First sight of an entity benefits from a full visible snapshot to establish a consistent initial state; subsequent per-attribute/nested deltas save bandwidth, especially single changes inside large containers. The cost is tracking every modification, maintaining order/baselines, and handling deletion/replacement and loss recovery; full replacement is simpler to implement and may be cheaper for small containers. BW has path/slice; KB's ordinary assignment is at the granularity of the attribute's full value, not a whole-entity snapshot. Client sync and DB snapshots can use different granularities, and payments/events should not depend on the number of state callbacks. Basis: BW-PC/BW-C and KB-C/KB-W.

4. **Server authority vs client prediction.** Base/real Cell decides ordinary persistent/sync attributes; the client may predict movement and animation locally to lower input latency, but local assignments of gold, drops, or HP must not become trusted writes. The client should submit actions, the server validates and updates the authoritative value, and the presentation layer then corrects the prediction. The engine has a dedicated path for controlled entity movement, which does not mean arbitrary attributes can be written back from the client; specific project prediction/rollback algorithms are unverified. The cost is correction snaps and business validation overhead; the benefit is that shared state and assets do not depend on an untrusted replica. Basis: BW-G [Entity Control/Physics Correction][bw-w]; KB-C and client [local/authoritative position handling][kb-r].

5. **Which layer AOI lives in.** Spatial interest relations should be established at the server Cell's spatial/Witness layer; the attribute distribution layer intersects that with OWN/OTHER, permissions, and DetailLevel, then sends at the egress. You cannot send everything first and let the client filter, because bandwidth is already consumed and private information is already leaked; nor should the DataType encoder or the DB layer compute spatial visibility. The cost is that cross-Cell ghosts, observer join/leave, baselines, and bandwidth scheduling all need coordination; AOI is a candidate set and does not automatically equal business authorization such as faction/stealth. Basis: BW-W/BW-F and KB-W/KB-C.

6. **Why contract migration is complex.** Columns, field IDs, container layout, defaults, and business meaning are not the same dimension; persisted data outlives any one process or client version. BW's toolified DDL/secondary consolidation and KB's startup DDL each solve structure alignment, but neither proves business losslessness, rolling interoperability, or reversibility. Choosing automatic alignment reduces development friction; choosing explicit migration lets you review data loss, conversions, and rollbacks at the cost of deployment orchestration. Basis: Section 5's BW-SYNC/BW-PM and KB-SQL/KB-TABLES.

## Source Index and Review Entry Points

The codes are used in the table above and in the design analysis. BW-S links are pinned to a public mirror commit, and BW-G is an archived guide; neither is the missing local BigWorld 14.4.1 source. KB entries also list the local source path:line numbers checked out this round (paths relative to `/home/cui/workspaces/kbengine`), and these line numbers are the basis for this round's actual reads. Unverified items concentrate on the BigWorld local implementation, naming differences, some recovery/prediction flows, arbitrary migration guarantees, and failure scenarios that were not run, and none of them can serve as feature promises.

- **BW-E**: [ EntityDescription: loading, data domains, and streams ][bw-e].
- **BW-D**: [ DataType: types and stream interfaces ][bw-d].
- **BW-F**: [ DataDescription: XML flags/defaults parsing; bit definitions in the same directory's .hpp ][bw-f].
- **BW-GP**: [ 2.1 guide: Properties ][bw-gp].
- **BW-C**: [ 2.1 guide: client attribute callbacks in Methods ][bw-callback].
- **BW-PC**: [ PropertyChange: path and slice encoding ][bw-pc].
- **BW-W**: [ 2.1 guide: Proxies and Players, Witness/control/correction ][bw-w].
- **BW-PM**: [ MySQL PropertyMapping: column/container mapping and array defaults ][bw-pm].
- **BW-SYNC**: [ MySqlTableInitialiser: DDL and defaults ][bw-sync].
- **BW-TS**: [ TableSynchroniser: launching sync_db ][bw-ts].
- **BW-DB**: [ 2.1 guide: The Database Layer ][bw-db].
- **BW-CFG**: [ operations guide: archive/secondaryDB config ][bw-cfg].
- **BW-BUF**: [ BufferedEntityTasks: ordering tasks per entity ][bw-buf].
- **KB-E**: [ EntityDef: contract loading ][kb-e]; local `kbe/src/lib/entitydef/entitydef.cpp:933-934,1097-1297`.
- **KB-T**: [ DataTypes: type registration ][kb-t]; local `kbe/src/lib/entitydef/datatypes.cpp:94-188`.
- **KB-P**: [ PropertyDescription: typed values and persistence serialization ][kb-p]; local `kbe/src/lib/entitydef/property.h:23-64,75-93,137-163`, `kbe/src/lib/entitydef/property.cpp:22-64,82-129`.
- **KB-F**: [ EntityDataFlags, broadcast ranges, and UID ][kb-f]; local `kbe/src/lib/entitydef/common.h:16-55,79-84`, `kbe/src/lib/entitydef/entitydef.cpp:161-174,1018-1092`, `kbe/src/lib/entitydef/scriptdef_module.cpp:113-145`.
- **KB-M**: [ entity attribute assignment entry ][kb-m]; local `kbe/src/lib/entitydef/entity_macro.h:790-820`. The component attribute assignment callback entry is at `kbe/src/lib/entitydef/entity_component.cpp:414-488`.
- **KB-B**: [ Base: dispatch, writeback, digest, and callbacks ][kb-b]; local `kbe/src/server/baseapp/entity.cpp:96-160,398-505,1141-1210,1233-1305,1319-1384`.
- **KB-C**: [ Cell: real/ghost, AOI, and attribute delivery ][kb-c]; local `kbe/src/server/cellapp/entity.cpp:658-892,1090-1113`. Initializing attributes out by LOD is at `kbe/src/lib/entitydef/entity_macro.h:583-612`; client-visible attribute initialization at `:614-655`.
- **KB-W**: [ Witness: view state and initialization ][kb-w]; local `kbe/src/server/cellapp/witness.cpp:782-835`; view enter/leave triggers at `kbe/src/server/cellapp/view_trigger.cpp:27-51`.
- **KB-CONTAINERS**: local `kbe/src/lib/entitydef/fixeddict.cpp:272-309` (FixedDict element operations only validate and mutate the internal dict); `kbe/src/lib/pyscript/sequence.cpp:18-30,252-285,295-382,395-445` (Sequence element/slice/concatenation mutates the container directly). No owner-entity `onDefDataChanged` call was seen on these paths; this is a static check of the listed paths and does not represent all container wrappers and component callbacks.
- **KB-SQL**: [ EntityTableMysql: DDL/fields/subtables/writes ][kb-sql]; local `kbe/src/lib/db_mysql/entity_table_mysql.cpp:136-230,370-470,505-763,1212-1298,1302-1354`.
- **KB-TABLES**: [ EntityTables: loading, sync, and old table cleanup ][kb-tables]; local `kbe/src/lib/db_interface/entity_table.cpp:117-143,169-235,296-320`.
- **KB-DBI**: [ DBUtil: non-pure initialization calls syncToDB ][kb-dbi]; local `kbe/src/lib/db_interface/db_interface.cpp:221-247`; MySQL table factory `kbe/src/lib/db_mysql/db_interface_mysql.cpp:419-423`, drop implementation `:426-451`.
- **KB-A**: [ periodic archive scheduling ][kb-a]; local `kbe/src/server/baseapp/archiver.cpp:23-63,66-85`.
- **KB-Q**: [ per-entity DB task queue ][kb-q]; local `kbe/src/server/dbmgr/buffered_dbtasks.cpp:26-85,89-153`.
- **KB-R**: [ client attribute parsing ][kb-r]; local `kbe/src/lib/client_lib/entity.cpp:259-424`.
- **KB-AL**: [ attribute alias assignment and capacity limits ][kb-al]; local `kbe/src/lib/entitydef/scriptdef_module.cpp:113-180`.
- **KB-N**: [ official message encapsulation format ][kb-netdoc]; this document was not re-checked against local source this round; client update parsing and Cell/Base packing are at `kbe/src/lib/client_lib/entity.cpp:293-315`, `kbe/src/server/cellapp/entity.cpp:750-781`, `kbe/src/server/baseapp/entity.cpp:131-159` respectively; message declarations at `kbe/src/lib/client_lib/client_interface.h:89-90`.
- **KB-H**: [ BaseApp: handshake sends EntityDef digest ][kb-h]; the handshake digest path was not re-checked against local source this round, and a digest must not be equated with data migration.
- **KB-DBTASK**: local DB write thread and main-thread callback `kbe/src/server/dbmgr/dbtasks.cpp:328-397`; creating Entity tables `kbe/src/lib/db_mysql/db_interface_mysql.cpp:419-423`.
- **KB-ASSIGN**: local `<Flags>/<Persistent>/<Type>/<Default>/<Utype>` reads and descriptor creation `kbe/src/lib/entitydef/entitydef.cpp:1097-1297`; serialization and deserialization delegation `kbe/src/lib/entitydef/property.cpp:82-129`.
- **KB-DATA**: local wire encoding of values is done through the DataType `addToStream` interface, `kbe/src/lib/entitydef/property.cpp:82-108`; concrete type implementations are in `kbe/src/lib/entitydef/datatype.cpp` (each type's implementation is distributed within the file).

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
