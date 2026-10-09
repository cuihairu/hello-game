# 引擎与中间件官方文档调研

## Category

research / 调研二。节点定位：把成熟引擎与中间件的官方文档当作能力清单，逐项列出「这份文档解决什么问题」，再对到本仓 `docs/` 的现有篇目上。选入标准与[权威书籍调研](/research/01-authoritative-books)一致：公开维护、被大量项目使用、主题能落进某一棵树；个人项目与一次性教程不入表。

## Definition

引擎文档回答客户端怎么长、怎么联网、怎么管资源，中间件文档回答服务端某个件的契约长什么样。两类文档对本仓的用法不同：引擎文档用于校验「客户端那半边我们讲错了没有」，中间件文档用于校验「我们描述的接口是不是人家真有的」。

## Problem

本仓后端按机制展开，客户端按够用深度取舍，这个分工在写的时候是判断，写完需要外部证据来复核。官方文档是唯一不会过时的证据来源：引擎改版会动接口，但「权威服务器模型」「房间生命周期」「有序集合」这些机制口径十年没变。本次调研 23 份官方文档，抽出 23 个主题，判定 21 个已覆盖、2 个部分、0 个新缺口。

## 调研结果

| 官方文档 | 归属 | 抽出的主题 | 本仓落点 | 判定 |
| --- | --- | --- | --- | --- |
| Unity Manual | 引擎 | 客户端网络层结构与会话 | 教程 [03 前端引擎与客户端](/24-game-types-architecture/03-frontend-engines) 第 2 节 | 已覆盖 |
| Netcode for GameObjects | 引擎多人 | 网络对象复制与客户端权威边界 | 教程 03 第 2 节、[同步模型](/server/sync/02) | 已覆盖 |
| Unity Addressables | 引擎资源 | 资源分组、依赖与热更 | [资源系统与工具链](/client/03) 资源分层与构建热更两节 | 已覆盖 |
| Unreal Engine Documentation（Replication、Gameplay Ability System、专用服务器） | 引擎 | 权威服务器模型、预测纠偏、技能与效果 | 教程 03 第 4 节 4.1 与 4.4、[技能系统](/system/skill) | 已覆盖 |
| Godot Documentation（High-level multiplayer、RPC） | 引擎 | 场景同步与 RPC 边界 | 教程 03 第 5 节、[数据帧与协议契约](/networking/04) | 已覆盖 |
| Cocos Creator 手册 | 引擎 | 小游戏平台约束与登录链路 | 教程 03 第 3 节、[小游戏平台与浏览器环境](/client/web/05) | 已覆盖 |
| skynet Wiki | 服务端框架 | 服务模型、定时器、内置库 | [Skynet：C 内核 + Lua Actor](/server/skynet) | 已覆盖 |
| Colyseus Documentation | 房间框架 | 房间生命周期、广播与状态同步 | [房间广播、弱网与国内网络环境](/networking/07)、[单局房间型游戏问题模型](/industry/models/02) | 已覆盖 |
| Nakama Documentation | 后端框架 | 账号、撮合、排行、存储、通知 | [账号、角色与基础系统](/system/services/01)、[排行榜](/system/leaderboard) | 已覆盖 |
| Agones Documentation | 承载编排 | 游戏服的扩缩容与就绪探针 | [扩容、缩容与动态加服](/server/capacity/02)、[协调层、跨服与控制平面](/server/services/03) | 已覆盖 |
| Mirror Documentation | 引擎联网 | 兴趣管理与传输层抽象 | [AOI：兴趣区域](/server/aoi)、[传输层与接入协议选择](/networking/03) | 已覆盖 |
| Photon Fusion Documentation | 引擎联网 | 预测、回滚与状态复制 | [预测、补偿与纠正](/server/sync/05) | 已覆盖 |
| Redis Documentation | 中间件 | 有序集合、哈希、脚本原子性 | [Redis、排行榜与锁](/database/cache/01)、[排行榜](/system/leaderboard) | 已覆盖 |
| PostgreSQL Documentation | 数据库 | 事务、索引、分区 | [事务、一致性与分库分表](/database/03) | 已覆盖 |
| MySQL Reference Manual | 数据库 | 主从、回滚段与在线 DDL | [关系型与非关系型数据库](/database/02)、[配置表与数据驱动管线](/production/05) | 已覆盖 |
| Protocol Buffers Documentation | 契约 | 字段演进与向后兼容 | [数据帧与协议契约](/networking/04) | 已覆盖 |
| gRPC Documentation | 契约 | 服务间调用与流式接口 | [服务发现、路由与协作](/server/services/04) | 已覆盖 |
| Kubernetes Documentation | 承载编排 | 副本、探针、扩缩容语义 | [扩容、缩容与动态加服](/server/capacity/02) | 已覆盖 |
| Steamworks Documentation | 平台 | 大厅、成就、内购与云存档 | [平台与渠道生态](/industry/platforms/01)、[登录、支付、社交与广告 SDK](/industry/platforms/03) | 已覆盖 |
| OpenTelemetry Documentation | 可观测 | Trace、Metric、日志三态 | [日志、指标、Tracing 与 OTel](/operation/observability/01) | 已覆盖 |
| 反作弊中间件官方说明（Easy Anti-Cheat、BattlEye） | 安全 | 客户端完整性与注入检测 | [安全与反作弊](/server/security/01) | 已覆盖 |
| FMOD Studio Documentation | 音频中间件 | 音频资源、事件与混音总线 | 教程 [21 音频与美术管线协作](/24-game-types-architecture/21-art-audio-pipeline) 第 3 节只讲管线不点中间件 | 部分 |
| Wwise Documentation | 音频中间件 | 事件驱动的音频触发与项目结构 | 同上 | 部分 |

**结论：23 个主题里 21 个已覆盖。引擎侧落点全部集中在教程 03 的分引擎专节，中间件侧落在 database、networking、server 三棵树的机制篇，两侧没有交叉，说明「客户端按引擎分、服务端按机制分」的分法能同时接住两类文档。2 个部分项都是音频中间件，第 3 节有音频管线专节，FMOD 与 Wwise 两个名字一次没出现；引擎专属 API 本仓按边界口径不收录，不计缺口。**

## 三处值得单独说的对照

- **Nakama 的 tournaments 与 leagues 只管到赛季这一层**：报名、时间窗、奖池、段位串联是现成的，但战令的免费轨与付费轨进度它不管。本仓[商业化数值示例模型](/numerical/06)把战令放进付费梯度，机制侧空着，落点见[覆盖差异表](/research/04-coverage-diff)的缺口清单第 6 条。
- **Colyseus 的房间广播是框架给的下行口**：`broadcast` 只负责把消息送到每个连接，频控、屏蔽、重要消息保序全在业务层。[房间广播、弱网与国内网络环境](/networking/07)讲到网络层就停了，游戏内公告的业务层因此没有落点。
- **反作弊中间件给的是客户端完整性，不是服务端权威**：EAC 与 BattlEye 拦的是注入与改内存，判定仍然要落在服务端，这条边界[安全与反作弊](/server/security/01)已经写了，调研未发现需要修订的地方。

## Related

关系链：官方文档清单 → 能力抽取 → 主题对照 → 判定 → 与缺口清单对接。逐段回答「为什么需要下一个」：

- 文档只列名字没有用，先把能力抽成可对照的主题，本页表格承担这一层。
- 主题对到篇目之后，才知道本仓对客户端的「够用」深度是否成立，2 个部分项都落在客户端侧。
- 判定为部分的两项与[覆盖差异表](/research/04-coverage-diff)合并处理，本页不单独补篇。

上层：[调研总览](/research/)。同层：[权威书籍调研](/research/01-authoritative-books)、[应用场景对照](/research/03-application-scenarios)、[覆盖差异表](/research/04-coverage-diff)。上游对照基准：[玩法品类与功能组件覆盖对照](/system/genre-coverage)。

## Reference

- 文档入口按各项目官方站点：docs.unity3d.com、dev.epicgames.com/documentation、docs.godotengine.org、docs.cocos.com、github.com/cloudwu/skynet/wiki、docs.colyseus.io、nakama.io/docs、agones.dev/site/docs、mirror-networking.com、doc.photonengine.com、redis.io/docs、postgresql.org/docs、dev.mysql.com/doc、protobuf.dev、grpc.io/docs、kubernetes.io/docs、partner.steamgames.com/doc、opentelemetry.io/docs、easyanticheat.com、battleye.com、fmod.com/docs、audiokinetic.com/wwise/docs。
- 中间件能力描述只写文档明确给出的语义，接口签名以各文档最新版为准；本页不记录版本号，避免改版后失真。
- 判定口径与检索日期同[权威书籍调研](/research/01-authoritative-books)：只认独立篇与专节，2026-10-08 全库 grep。
- 术语对照：Interest Management（兴趣管理）、Replication（复制）、Ready Probe（就绪探针）、Middleware（中间件）。
