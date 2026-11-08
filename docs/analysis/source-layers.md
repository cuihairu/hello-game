# Source Layer Analysis — hello-game

> Date: 2026-11-08 · Analyzed at HEAD `fe3615aa81208d2495b2a010fc5e767d126673df`.
> Chinese counterpart: [源码分层分析](/zh/analysis/source-layers).

## Scope and method

This repo is primarily a VitePress documentation site. Its only executable/game-server
source is a vendored fork of Microsoft Orleans under `orleans/` (version `10.0.0` dev,
`orleans/Directory.Build.props:61`), gitignored at `.gitignore:8` — `git ls-files orleans/`
returns 0 tracked files. The analysis therefore covers both: the tracked docs layer and the
vendored runtime source, abstracted by responsibility, not by directory name.

Excluded as non-source: `node_modules/`, `docs/.vitepress/dist|cache`, `coverage/`,
generated API surfaces (`orleans/src/api/`, per `orleans/AGENTS.md` "generated, do not edit
manually"), build outputs (`obj/`, `bin/`). Volume scanned: ~2,113 `.cs` files / ~355k lines
in `orleans/src`, plus `orleans/test` (~57 files >1000 lines) and `orleans/playground`.

## Glossary

| Term | English | Definition | Evidence (file:line) |
|---|---|---|---|
| Grain | Grain | Base actor class: stable identity + behavior + state; root of the programming model | `orleans/src/Orleans.Core.Abstractions/Core/Grain.cs:15` |
| Grain&lt;TGrainState&gt; | Stateful grain | Grain carrying one typed state object managed through storage providers | `orleans/src/Orleans.Core.Abstractions/Core/Grain.cs:185` |
| IGrain | Grain contract | Base interface of every grain reference returned by the client | `orleans/src/Orleans.Core.Abstractions/Core/IGrain.cs:10` |
| GrainId | Grain identity | Immutable identity struct (type + key) that addresses a grain cluster-wide | `orleans/src/Orleans.Core.Abstractions/IDs/GrainId.cs:15` |
| Silo | Silo | One server process hosting the runtime (endpoints, catalog, directory, membership) | `orleans/src/Orleans.Runtime/Silo/Silo.cs:24` |
| Activation | Activation | In-memory instance of a grain in a silo; unit of placement and deactivation | `orleans/src/Orleans.Runtime/Catalog/ActivationData.cs:29` |
| Catalog | Catalog | Per-silo system target owning activations, request dispatch, and deactivation | `orleans/src/Orleans.Runtime/Catalog/Catalog.cs:12` |
| ActivationCollector | Activation collector | Idle-activation GC: buckets idle activations and claims them for collection | `orleans/src/Orleans.Runtime/Catalog/ActivationCollector.cs:22` |
| Grain directory | Grain directory | Distributed map of grain id → owning activation, sharded over the silo ring | `orleans/src/Orleans.Runtime/GrainDirectory/LocalGrainDirectory.cs:20` |
| Directory partition | Directory partition | In-memory hash partition of the directory owned by one silo | `orleans/src/Orleans.Runtime/GrainDirectory/GrainDirectoryPartition.Interface.cs:8` |
| Membership manager | Membership manager | Liveness protocol state machine: probes, joins, suspect/dead votes | `orleans/src/Orleans.Runtime/MembershipService/MembershipTableManager.cs:22` |
| Message | Message | Pooled wire envelope for grain calls (addressing, headers, body) | `orleans/src/Orleans.Core/Messaging/Message.cs:12` |
| Connection | Connection | Socket-backed duplex pipe between silos and clients | `orleans/src/Orleans.Core/Networking/Connection.cs:18` |
| Serializer | Serializer | Facade for wire serialization and deep copies across type codecs | `orleans/src/Orleans.Serialization/Serializer.cs:18` |
| CodecProvider | Codec provider | DI-backed per-type cache of codecs, copiers, and activators | `orleans/src/Orleans.Serialization/Serializers/CodecProvider.cs:23` |
| Serialization source generator | Source generator | Roslyn incremental generator emitting codecs/invokers at compile time | `orleans/src/Orleans.CodeGenerator/OrleansSourceGenerator.cs:15` (`OrleansSerializationSourceGenerator` at :15) |
| JournaledGrain | Journaled grain | Event-sourced grain base built on log-consistency | `orleans/src/Orleans.EventSourcing/JournaledGrain.cs:15` |
| DurableGrain | Durable grain | Grain base whose state is composed of journaled durable collections | `orleans/src/Orleans.Journaling/DurableGrain.cs:8` |
| JournaledStateManager | Journaled state manager | Appends/replays journals over state machines; writes snapshots | `orleans/src/Orleans.Journaling/JournaledStateManager.cs:11` |
| IJournalStorage | Journal storage SPI | Append/snapshot/replay contract every journal backend implements | `orleans/src/Orleans.Journaling/IJournalStorage.cs:8` |
| DurableDictionary | Durable dictionary | Journal-replicated dictionary state machine (also List/Queue/Set/Value) | `orleans/src/Orleans.Journaling/DurableDictionary.cs:19` |
| JournaledJobShardManager | Job shard manager | Durable-job scheduler persisting shard state as journals | `orleans/src/Orleans.DurableJobs/JournaledJobShardManager.cs:20` |
| LocalDurableJobManager | Local job manager | Silo system target that executes due durable jobs | `orleans/src/Orleans.DurableJobs/LocalDurableJobManager.cs:22` |
| GrainService | Grain service | Long-running per-silo service (e.g. reminders) callable like a grain | `orleans/src/Orleans.Runtime/Services/GrainService.cs:13` |
| Reminder service | Reminder service | GrainService distributing reminders over the consistent ring | `orleans/src/Orleans.Reminders/ReminderService/LocalReminderService.cs:19` |
| Pulling agent | Stream pulling agent | SystemTarget polling queue adapters and dispatching batches to consumers | `orleans/src/Orleans.Streaming/PersistentStreams/PersistentStreamPullingAgent.cs:22` |
| NATS adapter factory | NATS adapter factory | Queue adapter factory mounting NATS as a stream provider | `orleans/src/Orleans.Streaming.NATS/Providers/NatsAdapterFactory.cs:14` |
| Memory grain storage | Memory grain storage | Volatile per-grain state provider (no persistence) | `orleans/src/Orleans.Persistence.Memory/Storage/MemoryStorage.cs:27` |
| TransactionQueue | Transaction queue | Prepare/commit logging queue behind transactional grain state | `orleans/src/Orleans.Transactions/State/TransactionQueue.cs:24` |
| Silo lifecycle | Silo lifecycle | Ordered startup/shutdown stages every silo service participates in | `orleans/src/Orleans.Runtime/Lifecycle/SiloLifecycleSubject.cs:15` |
| Grain lifecycle | Grain lifecycle | Per-activation steps (storage load, journal replay, timers) | `orleans/src/Orleans.Core.Abstractions/Lifecycle/IGrainLifecycle.cs:16` |
| ClusterOptions | Cluster options | ClusterId/ServiceId schema shared by silo and client | `orleans/src/Orleans.Core/Configuration/Options/ClusterOptions.cs:9` |

## Layers

Layers are abstracted by responsibility; a layer may span many directories, and directory
names were only used to locate implementations, not to define boundaries.

### Layer 1 — Documentation content layer (the tracked repo)

- Responsibility: the only content git actually tracks — a bilingual VitePress notes site
  (`docs/`, locale mirror `docs/zh/`, theme config `docs/.vitepress/config.mjs`), built via
  `package.json` scripts and `vitest.config.mjs`-driven doc tests.
- Implementation: markdown content; no runtime code. `orleans/` is deliberately untracked
  (`.gitignore:8`), so this layer is the repo's committed "source".
- Config input: `package.json` (build/deploy scripts), `pnpm-workspace.yaml` overrides.
- Lifecycle: static build/deploy via `.github/workflows/deploy-docs.yml`.

### Layer 2 — Hosting and composition layer

- Responsibility: turn a generic .NET host into a silo or client; wire options, providers,
  and lifecycles. Implemented in `orleans/src/Orleans.Runtime/Hosting/` —
  `UseOrleans` at `OrleansSiloGenericHostExtensions.cs:25` — and
  `orleans/src/Orleans.Core/Hosting/OrleansClientGenericHostExtensions.cs:27`
  (`UseOrleansClient`). `Orleans.Server` / `Orleans.Client` are README-only meta packages.
- Config schema lives in Options classes: `ClusterOptions`
  (`Orleans.Core/Configuration/Options/ClusterOptions.cs:9`), `SiloOptions`
  (`Orleans.Runtime/Silo/SiloOptions.cs:6`), plus per-feature `*Options` files in each
  provider package (e.g. `Orleans.Clustering.ZooKeeper/Options/ZooKeeperClusteringSiloOptions.cs:6`).
- No dedicated protocol files; this layer only composes lower layers.

### Layer 3 — Programming-model abstractions layer

- Responsibility: what a game-server developer writes against — `Grain`
  (`Orleans.Core.Abstractions/Core/Grain.cs:15`), `IGrain` (`Core/IGrain.cs:10`),
  `GrainId` (`IDs/GrainId.cs:15`), lifecycle contracts
  (`Lifecycle/ILifecycleParticipant.cs:11`, `Lifecycle/IGrainLifecycle.cs:16`), and
  provider attributes (`Providers/ProviderGrainAttributes.cs:14`, `StorageProviderAttribute`).
- Config schema: none (contracts only); error-code namespace constants at
  `Orleans.Core.Abstractions/Logging/ErrorCodes.cs`.
- No dedicated protocol files; invocation contracts are declared as interfaces and turned
  into protocol by the code generator (layer 9).

### Layer 4 — Messaging and transport layer

- Responsibility: move calls between silos/clients. `Message` envelope
  (`Orleans.Core/Messaging/Message.cs:12`), `Connection` sockets
  (`Orleans.Core/Networking/Connection.cs:18`), gateway list providers (client→silo entry)
  implemented per backend in layer 8.
- Config schema: networking/endpoints options under `Orleans.Runtime/Configuration/` and
  `Orleans.Core/Networking/`.
- Protocol lives in code, not files: header/body framing is implemented in
  `Orleans.Core/Messaging/` and serialized by layer 5 codecs; there is no `.proto`/IDL —
  the wire contract is generated from grain interfaces at compile time.

### Layer 5 — Wire serialization layer

- Responsibility: cross-process and deep-copy serialization. Facades `Serializer`
  (`Orleans.Serialization/Serializer.cs:18`), codec registry `CodecProvider`
  (`Serializers/CodecProvider.cs:23`), buffers `ArcBufferWriter`/`Reader`
  (`Buffers/ArcBufferWriter.cs:25`, `Buffers/Reader.cs:177`), built-in codecs
  (`Codecs/TupleCodec.cs:15`, `Codecs/ValueTupleCodec.cs:15`), F# codecs
  (`Orleans.Serialization.FSharp/FSharpCodecs.cs:21`).
- Config schema: none; codecs are discovered via DI + source-generated registration.
- Protocol files: none on disk; the format is defined by generated codecs (layer 9) plus
  framework-owned codecs in `Orleans.Serialization/Codecs/`.

### Layer 6 — State persistence layer

- Responsibility: grain state read/write through storage providers behind `IGrainStorage`.
  In-memory default (`Orleans.Persistence.Memory/Storage/MemoryStorage.cs:27`), Redis
  (`Redis/Orleans.Persistence.Redis/Storage/RedisGrainStorage.cs:24`), AdoNet relational
  backends (`AdoNet/Orleans.GrainDirectory.AdoNet/`), plus the event-sourced/journaling
  variants in layer 7.
- Config schema: `StorageProviderAttribute` on grain classes; provider options per package
  (e.g. `Orleans.Persistence.Redis` `RedisStorageOptions`).
- No dedicated protocol files; storage is a local I/O concern, not a wire protocol.

### Layer 7 — Durable, journaled, and transactional state layer

- Responsibility: log-consistency and transaction support on top of the programming model.
  `JournaledGrain` (`Orleans.EventSourcing/JournaledGrain.cs:15`), `DurableGrain`
  (`Orleans.Journaling/DurableGrain.cs:8`), `JournaledStateManager`
  (`Orleans.Journaling/JournaledStateManager.cs:11`), durable collections
  (`Orleans.Journaling/DurableDictionary.cs:19`), durable job scheduler
  (`Orleans.DurableJobs/JournaledJobShardManager.cs:20` and
  `LocalDurableJobManager.cs:22`), transaction queue
  (`Orleans.Transactions/State/TransactionQueue.cs:24`).
- Config schema: per-feature options classes; journals/snapshots go to the storage backend
  via `IJournalStorage` (`Orleans.Journaling/IJournalStorage.cs:8`).
- No dedicated protocol files; consistency protocols are in-code (log-consistency and
  transaction protocol state machines).

### Layer 8 — Cluster membership, directory, and clustering providers layer

- Responsibility: liveness and placement across silos. `MembershipTableManager`
  (`Orleans.Runtime/MembershipService/MembershipTableManager.cs:22`) drives the liveness
  protocol over an `IMembershipTable` backend — Redis
  (`Redis/Orleans.Clustering.Redis/Storage/RedisMembershipTable.cs:15`), ZooKeeper
  (`Orleans.Clustering.ZooKeeper/`), Consul (`Orleans.Clustering.Consul/`), AdoNet. The grain
  directory (`Orleans.Runtime/GrainDirectory/LocalGrainDirectory.cs:20`, partition
  `GrainDirectoryPartition.Interface.cs:8`) routes activations; Redis directory
  (`Redis/Orleans.GrainDirectory.Redis/RedisGrainDirectory.cs:20`) is the pluggable backend.
- Config schema: clustering provider options (e.g.
  `Orleans.Clustering.ZooKeeper/Options/ZooKeeperClusteringSiloOptions.cs:6`), gateway list
  providers (`Redis/Orleans.Clustering.Redis/Providers/RedisGatewayListProvider.cs`).
- No dedicated protocol files; membership gossip and directory resolution are code protocols.

### Layer 9 — Code generation and tooling layer

- Responsibility: compile-time generation of serializers, copiers, activators, RPC proxies,
  invokers, and registration metadata. `OrleansSerializationSourceGenerator`
  (`Orleans.CodeGenerator/OrleansSourceGenerator.cs:15`), shared infrastructure
  (`Orleans.CodeGenerator.Shared/`), analyzers (`Orleans.Analyzers/`), SDK targets
  (`Orleans.Sdk/`), and the API surface generator (`orleans/src/api/`, generated per
  `orleans/AGENTS.md`).
- Config schema: `CodeGeneratorOptions` (`Orleans.CodeGenerator/CodeGeneratorOptions.cs`).
- Protocol files: none checked in — the wire contract is *generated* from grain interfaces
  at compile time; this is why layer 3/4 have no `.proto`/IDL on disk.

## Split candidates

The tracked docs content and the vendored runtime are the two "sources" here; the runtime is
the only place >1000-line files live (the tracked tree's largest files are all markdown,
see below). Since `orleans/` is untracked and vendored, these are advisory only — splitting
them belongs to the upstream Orleans project, not this repo.

| Candidate | Lines | Reason | Evidence |
|---|---|---|---|
| `docs/24-game-types-architecture/06-frameworks.md` | ~4008 | Encyclopedia-style page that mixes engine survey, integration notes, and comparison tables; a single page over 4k lines hurts maintainability and git diff readability | `docs/24-game-types-architecture/06-frameworks.md` |
| `docs/zh/24-game-types-architecture/06-frameworks.md` | ~4004 | Chinese mirror of the above; should be split in lockstep or the two drift | `docs/zh/24-game-types-architecture/06-frameworks.md` |
| `docs/24-game-types-architecture/09-programming-patterns.md` | ~1641 | Patterns page mixing language-level patterns, framework idioms, and game-specific patterns | `docs/24-game-types-architecture/09-programming-patterns.md` |
| `docs/zh/24-game-types-architecture/09-programming-patterns.md` | ~1636 | Chinese mirror | `docs/zh/24-game-types-architecture/09-programming-patterns.md` |

Tracked markdown files >1000 lines are the four above; `docs/.vitepress/config.mjs` (4557
lines) is a generated-config artifact and is intentionally not split. `orleans/` contains
~57 files >1000 lines, but it is vendored/untracked (`.gitignore:8`) and is out of scope.

## Notes

- The analysis was done at HEAD `fe3615aa81208d2495b2a010fc5e767d126673df`; `orleans/` is a
  vendored snapshot (version `10.0.0` dev per `orleans/Directory.Build.props:61`).
- This page is registered in the VitePress sidebar (EN "Game Backend Engine Source Analysis"
  group and ZH "游戏后端引擎源码解析" group).
- No classification issues were found in the tracked tree: the docs layout (industry/system/
  server/client/operation/design/numerical/glossary + zh mirror) is consistent with the
  content it holds; the only oddity is the untracked `orleans/` vendored fork, which is
  deliberate and documented in `.gitignore:8`.
