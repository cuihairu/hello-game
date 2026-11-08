# 源码分层分析 — hello-game

> 日期：2026-11-08 · 分析基于 HEAD `fe3615aa81208d2495b2a010fc5e767d126673df`。
> 英文原版：[source-layers](/analysis/source-layers)（本页为其中文对照版）。

## 范围与方法

本仓库主体是一个 VitePress 文档站。唯一的可执行/游戏服务器源码是 `orleans/` 下
vendored 的 Microsoft Orleans fork（版本 `10.0.0` dev，`orleans/Directory.Build.props:61`），
在 `.gitignore:8` 被忽略——`git ls-files orleans/` 返回 0 个跟踪文件。因此本分析同时覆盖
两者：被跟踪的文档层与 vendored 的运行时源码，按职责抽象分层，不按目录名划分。

排除的非源码：`node_modules/`、`docs/.vitepress/dist|cache`、`coverage/`、生成的 API
表面（`orleans/src/api/`，按 `orleans/AGENTS.md`「生成物，勿手改」）、构建产物
（`obj/`、`bin/`）。扫描体量：`orleans/src` 约 2,113 个 `.cs` 文件 / 约 35.5 万行，另有
`orleans/test`（约 57 个 >1000 行文件）与 `orleans/playground`。

## 术语表

| 术语 | 英文 | 定义 | 证据（file:line） |
|---|---|---|---|
| Grain | Grain | 基础 actor 类：稳定身份 + 行为 + 状态；编程模型的根 | `orleans/src/Orleans.Core.Abstractions/Core/Grain.cs:15` |
| Grain&lt;TGrainState&gt; | Stateful grain | 携带单个类型化状态对象、经存储提供者管理的 Grain | `orleans/src/Orleans.Core.Abstractions/Core/Grain.cs:185` |
| IGrain | Grain contract | 客户端拿到的每个 grain 引用的基础接口 | `orleans/src/Orleans.Core.Abstractions/Core/IGrain.cs:10` |
| GrainId | Grain identity | 集群范围内寻址 grain 的不可变身份结构体（类型 + 键） | `orleans/src/Orleans.Core.Abstractions/IDs/GrainId.cs:15` |
| Silo | Silo | 承载运行时的一个服务器进程（端点、目录、成员、catalog） | `orleans/src/Orleans.Runtime/Silo/Silo.cs:24` |
| Activation | Activation | silo 内 grain 的内存实例；放置与去活的单位 | `orleans/src/Orleans.Runtime/Catalog/ActivationData.cs:29` |
| Catalog | Catalog | 每 silo 一个的系统目标，持有 activation、请求分发与去活 | `orleans/src/Orleans.Runtime/Catalog/Catalog.cs:12` |
| ActivationCollector | Activation collector | 空闲 activation GC：分桶收集空闲 activation 并认领回收 | `orleans/src/Orleans.Runtime/Catalog/ActivationCollector.cs:22` |
| Grain directory | Grain directory | grain id → 归属 activation 的分布式映射，按 silo 环分片 | `orleans/src/Orleans.Runtime/GrainDirectory/LocalGrainDirectory.cs:20` |
| Directory partition | Directory partition | 单个 silo 持有的目录内存哈希分区 | `orleans/src/Orleans.Runtime/GrainDirectory/GrainDirectoryPartition.Interface.cs:8` |
| Membership manager | Membership manager | 存活协议状态机：探测、加入、嫌疑/死亡投票 | `orleans/src/Orleans.Runtime/MembershipService/MembershipTableManager.cs:22` |
| Message | Message | grain 调用的池化线上信封（寻址、头、体） | `orleans/src/Orleans.Core/Messaging/Message.cs:12` |
| Connection | Connection | silo 与客户端之间的 socket 双工管道 | `orleans/src/Orleans.Core/Networking/Connection.cs:18` |
| Serializer | Serializer | 跨类型编解码的线上序列化与深拷贝门面 | `orleans/src/Orleans.Serialization/Serializer.cs:18` |
| CodecProvider | Codec provider | DI 支撑的按类型 codec/拷贝器/激活器缓存 | `orleans/src/Orleans.Serialization/Serializers/CodecProvider.cs:23` |
| Serialization source generator | Source generator | 编译期生成 codec/invoker 的 Roslyn 增量生成器 | `orleans/src/Orleans.CodeGenerator/OrleansSourceGenerator.cs:15`（`:15` 处为 `OrleansSerializationSourceGenerator`） |
| JournaledGrain | Journaled grain | 基于日志一致性的事件溯源 grain 基类 | `orleans/src/Orleans.EventSourcing/JournaledGrain.cs:15` |
| DurableGrain | Durable grain | 状态由 journaled 持久集合组成的 grain 基类 | `orleans/src/Orleans.Journaling/DurableGrain.cs:8` |
| JournaledStateManager | Journaled state manager | 在状态机上追加/重放日志；写快照 | `orleans/src/Orleans.Journaling/JournaledStateManager.cs:11` |
| IJournalStorage | Journal storage SPI | 每个日志后端都要实现的追加/快照/重放契约 | `orleans/src/Orleans.Journaling/IJournalStorage.cs:8` |
| DurableDictionary | Durable dictionary | 日志复制的字典状态机（List/Queue/Set/Value 同族） | `orleans/src/Orleans.Journaling/DurableDictionary.cs:19` |
| JournaledJobShardManager | Job shard manager | 以日志持久化分片状态的持久任务调度器 | `orleans/src/Orleans.DurableJobs/JournaledJobShardManager.cs:20` |
| LocalDurableJobManager | Local job manager | 执行到期持久任务的 silo 系统目标 | `orleans/src/Orleans.DurableJobs/LocalDurableJobManager.cs:22` |
| GrainService | Grain service | 每 silo 长驻服务（如提醒），可像 grain 一样被调用 | `orleans/src/Orleans.Runtime/Services/GrainService.cs:13` |
| Reminder service | Reminder service | 在一致性环上分发提醒的 GrainService | `orleans/src/Orleans.Reminders/ReminderService/LocalReminderService.cs:19` |
| Pulling agent | Stream pulling agent | 轮询队列适配器并向消费者分发批次的系统目标 | `orleans/src/Orleans.Streaming/PersistentStreams/PersistentStreamPullingAgent.cs:22` |
| NATS adapter factory | NATS adapter factory | 把 NATS 挂为流提供者的队列适配器工厂 | `orleans/src/Orleans.Streaming.NATS/Providers/NatsAdapterFactory.cs:14` |
| Memory grain storage | Memory grain storage | 易失的按 grain 状态提供者（无持久化） | `orleans/src/Orleans.Persistence.Memory/Storage/MemoryStorage.cs:27` |
| TransactionQueue | Transaction queue | 事务型 grain 状态背后的准备/提交日志队列 | `orleans/src/Orleans.Transactions/State/TransactionQueue.cs:24` |
| Silo lifecycle | Silo lifecycle | 每个 silo 服务都参与的有序启动/停止阶段 | `orleans/src/Orleans.Runtime/Lifecycle/SiloLifecycleSubject.cs:15` |
| Grain lifecycle | Grain lifecycle | 每 activation 的步骤（存储加载、日志重放、定时器） | `orleans/src/Orleans.Core.Abstractions/Lifecycle/IGrainLifecycle.cs:16` |
| ClusterOptions | Cluster options | silo 与客户端共享的 ClusterId/ServiceId 模式 | `orleans/src/Orleans.Core/Configuration/Options/ClusterOptions.cs:9` |

## 分层

分层按职责抽象；一层可能横跨多个目录，目录名只用于定位实现，不用于定义边界。

### 第 1 层 — 文档内容层（被跟踪的仓库）

- 职责：git 实际跟踪的唯一内容——双语文档站（`docs/`、locale 镜像 `docs/zh/`、
  主题配置 `docs/.vitepress/config.mjs`），经 `package.json` 脚本与
  `vitest.config.mjs` 驱动的文档测试构建。
- 实现：markdown 内容，无运行时代码。`orleans/` 刻意不入库（`.gitignore:8`），
  本层即仓库已提交的「源码」。
- 配置输入：`package.json`（构建/部署脚本）、`pnpm-workspace.yaml` overrides。
- 生命周期：经 `.github/workflows/deploy-docs.yml` 静态构建/部署。

### 第 2 层 — 宿主与组装层

- 职责：把通用 .NET 宿主变成 silo 或客户端；接线 options、提供者与生命周期。
  实现在 `orleans/src/Orleans.Runtime/Hosting/`——`UseOrleans` 见
  `OrleansSiloGenericHostExtensions.cs:25`；客户端侧
  `orleans/src/Orleans.Core/Hosting/OrleansClientGenericHostExtensions.cs:27`
  （`UseOrleansClient`）。`Orleans.Server`/`Orleans.Client` 是仅 README 的元包。
- 配置模式在 Options 类：`ClusterOptions`
  （`Orleans.Core/Configuration/Options/ClusterOptions.cs:9`）、`SiloOptions`
  （`Orleans.Runtime/Silo/SiloOptions.cs:6`），以及每个提供者包各自的
  `*Options` 文件（如 `Orleans.Clustering.ZooKeeper/Options/ZooKeeperClusteringSiloOptions.cs:6`）。
- 无独立协议文件；本层只组装下层。

### 第 3 层 — 编程模型抽象层

- 职责：游戏服务器开发者直接面对的面——`Grain`
  （`Orleans.Core.Abstractions/Core/Grain.cs:15`）、`IGrain`（`Core/IGrain.cs:10`）、
  `GrainId`（`IDs/GrainId.cs:15`）、生命周期契约
  （`Lifecycle/ILifecycleParticipant.cs:11`、`Lifecycle/IGrainLifecycle.cs:16`）、
  提供者属性（`Providers/ProviderGrainAttributes.cs:14`、`StorageProviderAttribute`）。
- 配置模式：无（纯契约）；错误码命名空间常量在
  `Orleans.Core.Abstractions/Logging/ErrorCodes.cs`。
- 无独立协议文件；调用契约以接口声明，由代码生成器（第 9 层）变成协议。

### 第 4 层 — 消息与传输层

- 职责：在 silo/客户端之间搬运调用。`Message` 信封
  （`Orleans.Core/Messaging/Message.cs:12`）、`Connection` socket
  （`Orleans.Core/Networking/Connection.cs:18`）、网关列表提供者（客户端→silo 入口）
  按后端在第 8 层实现。
- 配置模式：`Orleans.Runtime/Configuration/` 与 `Orleans.Core/Networking/` 下的
  网络/端点 options。
- 协议在代码而非文件：头/体分帧在 `Orleans.Core/Messaging/` 实现，由第 5 层 codec
  序列化；没有 `.proto`/IDL——线上契约在编译期从 grain 接口生成。

### 第 5 层 — 线上序列化层

- 职责：跨进程与深拷贝序列化。门面 `Serializer`
  （`Orleans.Serialization/Serializer.cs:18`）、codec 注册表 `CodecProvider`
  （`Serializers/CodecProvider.cs:23`）、缓冲 `ArcBufferWriter`/`Reader`
  （`Buffers/ArcBufferWriter.cs:25`、`Buffers/Reader.cs:177`）、内建 codec
  （`Codecs/TupleCodec.cs:15`、`Codecs/ValueTupleCodec.cs:15`）、F# codec
  （`Orleans.Serialization.FSharp/FSharpCodecs.cs:21`）。
- 配置模式：无；codec 经 DI + 源生成注册发现。
- 协议文件：磁盘上没有；格式由生成的 codec（第 9 层）与
  `Orleans.Serialization/Codecs/` 的框架自有 codec 定义。

### 第 6 层 — 状态持久化层

- 职责：经 `IGrainStorage` 后面的存储提供者读写 grain 状态。内存默认
  （`Orleans.Persistence.Memory/Storage/MemoryStorage.cs:27`）、Redis
  （`Redis/Orleans.Persistence.Redis/Storage/RedisGrainStorage.cs:24`）、AdoNet
  关系后端（`AdoNet/Orleans.GrainDirectory.AdoNet/`），以及第 7 层的事件溯源/
  日志变体。
- 配置模式：grain 类上的 `StorageProviderAttribute`；各包自己的提供者 options
  （如 `Orleans.Persistence.Redis` 的 `RedisStorageOptions`）。
- 无独立协议文件；存储是本地 I/O 关注点，不是线上协议。

### 第 7 层 — 持久、日志与事务状态层

- 职责：在编程模型之上的日志一致性与事务支持。
  `JournaledGrain`（`Orleans.EventSourcing/JournaledGrain.cs:15`）、
  `DurableGrain`（`Orleans.Journaling/DurableGrain.cs:8`）、
  `JournaledStateManager`（`Orleans.Journaling/JournaledStateManager.cs:11`）、
  持久集合（`Orleans.Journaling/DurableDictionary.cs:19`）、持久任务调度器
  （`Orleans.DurableJobs/JournaledJobShardManager.cs:20` 与
  `LocalDurableJobManager.cs:22`）、事务队列
  （`Orleans.Transactions/State/TransactionQueue.cs:24`）。
- 配置模式：各特性自己的 options 类；日志/快照经
  `IJournalStorage`（`Orleans.Journaling/IJournalStorage.cs:8`）落到存储后端。
- 无独立协议文件；一致性协议在代码内（日志一致性与事务协议状态机）。

### 第 8 层 — 集群成员、目录与聚类提供者层

- 职责：跨 silo 的存活与放置。`MembershipTableManager`
  （`Orleans.Runtime/MembershipService/MembershipTableManager.cs:22`）在
  `IMembershipTable` 后端上驱动存活协议——Redis
  （`Redis/Orleans.Clustering.Redis/Storage/RedisMembershipTable.cs:15`）、ZooKeeper
  （`Orleans.Clustering.ZooKeeper/`）、Consul（`Orleans.Clustering.Consul/`）、AdoNet。
  grain 目录（`Orleans.Runtime/GrainDirectory/LocalGrainDirectory.cs:20`、分区
  `GrainDirectoryPartition.Interface.cs:8`）为 activation 路由；Redis 目录
  （`Redis/Orleans.GrainDirectory.Redis/RedisGrainDirectory.cs:20`）是可插拔后端。
- 配置模式：聚类提供者 options（如
  `Orleans.Clustering.ZooKeeper/Options/ZooKeeperClusteringSiloOptions.cs:6`）、
  网关列表提供者（`Redis/Orleans.Clustering.Redis/Providers/RedisGatewayListProvider.cs`）。
- 无独立协议文件；成员 gossip 与目录解析都是代码协议。

### 第 9 层 — 代码生成与工具层

- 职责：编译期生成序列化器、拷贝器、激活器、RPC 代理、invoker 与注册元数据。
  `OrleansSerializationSourceGenerator`
  （`Orleans.CodeGenerator/OrleansSourceGenerator.cs:15`）、共享基础设施
  （`Orleans.CodeGenerator.Shared/`）、分析器（`Orleans.Analyzers/`）、SDK targets
  （`Orleans.Sdk/`）、API 表面生成器（`orleans/src/api/`，按 `orleans/AGENTS.md` 生成）。
- 配置模式：`CodeGeneratorOptions`（`Orleans.CodeGenerator/CodeGeneratorOptions.cs`）。
- 协议文件：无入库——线上契约在编译期从 grain 接口*生成*；这就是第 3/4 层磁盘上
  没有 `.proto`/IDL 的原因。

## 拆分候选

被跟踪的文档内容与 vendored 运行时是这里的两个「源」；运行时是唯一存在 >1000 行
文件的地方（被跟踪树里最大的文件全是 markdown，见下）。由于 `orleans/` 未跟踪且
属 vendored，以下仅为建议——拆分属于上游 Orleans 项目，不属于本仓库。

| 候选 | 行数 | 理由 | 证据 |
|---|---|---|---|
| `docs/24-game-types-architecture/06-frameworks.md` | ~4008 | 百科式页面混杂引擎 survey、集成笔记与对比表；单页超 4k 行伤可维护性与 git diff 可读性 | `docs/24-game-types-architecture/06-frameworks.md` |
| `docs/zh/24-game-types-architecture/06-frameworks.md` | ~4004 | 上行的中文镜像；应同步拆分否则两版漂移 | `docs/zh/24-game-types-architecture/06-frameworks.md` |
| `docs/24-game-types-architecture/09-programming-patterns.md` | ~1641 | 模式页混杂语言级模式、框架惯用法与游戏专属模式 | `docs/24-game-types-architecture/09-programming-patterns.md` |
| `docs/zh/24-game-types-architecture/09-programming-patterns.md` | ~1636 | 中文镜像 | `docs/zh/24-game-types-architecture/09-programming-patterns.md` |

被跟踪 markdown 超 1000 行的就是上述四个；`docs/.vitepress/config.mjs`（4557 行）
是生成配置工件，刻意不拆。`orleans/` 约 57 个 >1000 行文件，但它是 vendored/未跟踪
（`.gitignore:8`），不在范围内。

## 备注

- 分析基于 HEAD `fe3615aa81208d2495b2a010fc5e767d126673df`；`orleans/` 是 vendored
  快照（版本 `10.0.0` dev，见 `orleans/Directory.Build.props:61`）。
- 本页已注册进 VitePress 侧边栏（EN「Game Backend Engine Source Analysis」组与
  ZH「游戏后端引擎源码解析」组）。
- 被跟踪树未发现分类异常：文档布局（industry/system/server/client/operation/design/
  numerical/glossary + zh 镜像）与内容一致；唯一异类是未跟踪的 `orleans/`
  vendored fork，属刻意行为且记录在 `.gitignore:8`。
