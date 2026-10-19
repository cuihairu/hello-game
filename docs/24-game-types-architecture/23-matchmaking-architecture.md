# 玩家匹配：自建架构的职责与落位

> 来源：https://chatgpt.com/s/t_6ad4f0bc70048191928126950fda2517
> 取回：2026-10-18
>
> **性质：外部建议，不是既有事实。** 涉及「某仓已明确规定」的断言，实施前需回到对应仓库的架构文档核对。

本文记录我对组队、匹配和房间分配如何落入现有服务边界的架构判断。开源项目的完整选型比较见[匹配功能：开源项目选型调研](/24-game-types-architecture/22-matchmaking-oss)；[队伍匹配](/system/party-matchmaking)与[PVP 匹配](/system/pvp-matchmaking)则分别从组队撮合、评分与匹配池机制展开。它们是同一主题的不同角度，保留各自内容并互相参照。

通用的重点不是固定某一种匹配算法，而是组队、排队、匹配结果、房间预留和服务器分配之间的协议及生命周期。不同游戏可以采用不同策略，但不必各自重写组队管理、排队状态机、断线恢复和房间分配机制。

## 一、先区分三个概念

| 能力 | 解决什么问题 | 示例 |
|--------|--------|--------|
| Party / 组队 | 哪些玩家想一起玩 | 3 个好友组队，邀请第 4 人 |
| Matchmaking / 匹配 | 哪些玩家或队伍应该一起玩 | 按段位、延迟、地区匹配两支 5 人队伍 |
| Room Allocation / 房间分配 | 匹配成功后去哪里玩 | 预留一间游戏房，找到或启动服务器，返回连接凭证 |

这三个功能有关联，但不是同一件事。例如一场 5v5 对战会经过玩家鉴权、组队、匹配、房间预留和服务器入场；MMO 主世界则通常通过区服发现与路由进入，不需要每次登录都经过 Matchmaker。

这类拆分也适用于 MOBA、FPS、棋牌、回合制、PVE 副本和直播互动玩法；具体项目可以只启用组队、匹配或房间分配中的部分能力。

## 二、在现有服务体系中的职责边界

这里必须尊重 Atlas、Courier、Apollo、Chorus 已有的边界。

| 项目 | 应该承担的职责 |
|--------|--------|
| **Courier** | 向客户端提供组队与匹配 SDK/API，验证玩家身份，通过 Provider 转发 |
| **独立 Session Coordination Service** | Party、队列、匹配决策、房间分配、会话生命周期 |
| **Atlas** | 提供可用服务器、地区、版本、负载、拓扑和接入候选 |
| **Apollo / Chorus / BigWorld** | 创建真实游戏实例或房间，验证席位、接收玩家、执行游戏逻辑 |
| **Cockpit / Agones** | 负责启动、托管、停止和扩缩容游戏进程 |
| **Cage** | 编译和版本化匹配策略配置 |
| **Croupier** | 配置、审批、灰度发布、GM 操作和匹配运维监控 |
| **Oddsmaker** | 评价匹配质量、胜率偏差、匹配时长及玩家流失 |

为什么我建议独立的 Session Coordination Service，而不是直接放进 Atlas？

因为 Atlas 的架构文档已经明确规定：**匹配、排队、房间、实例分配属于 Scheduler 的职责，不属于 Atlas。** citeturn734851view5

Courier 也明确把实时多人匹配排除在它当前的核心范围之外。citeturn529554view5

我建议保持这两个设计决定。Courier 增加客户端匹配契约和 Provider 就够了，真正的调度服务独立运行。

## 三、怎样把不同游戏的匹配做成通用系统？

核心设计是 **固定协议 + 可配置策略 + 可替换适配器**。

**统一 Session API**

CreateParty · JoinQueue · Cancel · GetMatch · JoinRoom

**Party Engine**

组队状态机、邀请、队长、成员、准备状态

**Queue Engine**

排队票据、超时、取消、原子认领

**Match Policy Engine**

读取每款游戏、每种玩法的匹配策略

**Room Allocator**

ExistingRoom / ExistingInstance / DedicatedServer / NewInstance

### 匹配规则通过配置决定

例如，一个 5v5 竞技游戏可以采用下面的策略：

```yaml

game_id: arena
mode_id: ranked_5v5

teams:
  count: 2
  size: 5

party:
  max_size: 5
  keep_together: true

constraints:
  strict:
    - game_version
    - platform_pool
    - anti_cheat_pool

  skill:
    initial_mmr_delta: 100
    widen_every_seconds: 10
    widen_by: 50
    max_mmr_delta: 400

  network:
    preferred_rtt_ms: 80
    max_rtt_ms: 150

allocation:
  strategy: dedicated_server
  region_preference: lowest_latency

timeout_seconds: 120
```

这份配置是建议的通用策略格式，并不是 Cage 或 Open Match 已经原生支持的现成格式。

策略引擎先满足硬条件，比如游戏版本、反作弊分区和平台兼容性，再逐渐放宽 MMR、延迟等软约束。已组队玩家必须作为不可拆分的整体参与队伍组合。

而棋牌游戏可以配置成四人房间、按先来先服务、房满即开。PVE 副本可以按职业和战力匹配。Chorus 直播互动玩法则可以按主播会话、参与人数、超时和机器人填充来决定是否开局。

**通用框架只负责执行策略接口，不应该把 5v5、MMR 或职业搭配写死在基础设施代码中。**

## 四、房间分配是另一个必须抽象的关键

你已经有多个游戏服务器，它们的资源模型不一样。

Apollo

可以在已有 World/Executor 中创建临时 Instance

Room / Instance

适合副本、塔防、竞技等临时会话

Chorus

绑定直播 Session，在 EngineHost 创建互动会话

Stream Session

按主播或活动分配权威处理实例

BigWorld

优先使用已有 Realm、Space 或 Cell

World / Space

通常不需要为每次进入世界启动新服务器

所以 Room Allocator 应提供统一接口，例如：

```go

type AllocationRequest struct {
    GameID        string
    Environment   string
    MatchID       string
    ModeID        string
    Region        string
    PlayerIDs     []string
    ConfigVersion string
}

type AllocationResult struct {
    RoomID      string
    InstanceID  string
    ServerID    string
    Endpoint    string // 返回给客户端的安全接入端点
    Reservation string // 短期预留凭据
    ExpiresAt   time.Time
}

type RoomAllocator interface {
    Allocate(
        ctx context.Context,
        req AllocationRequest,
    ) (AllocationResult, error)

    Release(
        ctx context.Context,
        matchID string,
    ) error
}
```

底层可以提供不同适配器：`ApolloAllocator` 调用 World/Instance 创建接口；`ChorusAllocator` 创建或绑定直播 Session；`AgonesAllocator` 申请专用服务器；`BigWorldAllocator` 分配进入已有 World/Space 的资源。

这里有一个很重要的并发问题：**Atlas 的服务器推荐不能直接当作原子预留。**

比如 Atlas 返回某台服务器还有 10 个席位，两个并发分配请求都选择它，可能造成超额分配。Allocator 必须与对应的权威容量所有者完成原子预留，或者通过 Agones 这样的分配接口完成操作。citeturn669744search0turn734851view1

客户端也不能仅靠拿到 IP 就直接加入。游戏服务器应校验绑定了玩家、游戏、房间和有效期的短期入场凭证，并确保凭证不可重复滥用。

## 五、必须处理的生产级状态机

真正难的不是写匹配算法，而是处理失败、重复和重试。

匹配状态机（建议）

成功后等待玩家确认入场，游戏服务器确认就绪后进入 RUNNING；取消、超时或不可恢复错误进入 CANCELLED / EXPIRED / FAILED 等终态。

建议所有实现都遵守这些规则：

- 每个玩家在相互排斥的匹配队列中只能拥有一个有效 Ticket，组队变动必须有版本控制。
- 匹配结果先原子认领 Ticket，成功分配房间后才提交 Assignment；失败必须释放或重新排队。
- 同一个 `match_id` 的重试必须幂等，不能因为网络超时创建两间房。
- 房间预留有 TTL；玩家未入场应释放席位，断线重连使用单独的恢复凭证。
- 游戏服务器宕机后，通过租约和 reconciliation 恢复真实状态，而不是依赖内存中的布尔值。

这些机制应成为框架的默认能力，游戏开发者只需要关注匹配策略和游戏逻辑。

## 六、Courier 的支付、虚拟资产和商业化应该怎么扩展？

既然你决定把这一部分交给 Courier，我建议保留它原有的可替换 Provider 设计，但扩大支付域的能力范围。

目前 Courier 的 README 明确写的是：Payment 定义 Order / Purchase / Receipt 契约，内置沙箱渠道，同时不假定所有游戏必须共用钱包。citeturn529554view5

所以扩展时要让“公司级统一账号”与“每个游戏独立资产体系”同时成立。

| Courier 子系统 | 应负责的事情 |
|--------|--------|
| Commerce Catalog | 商品、价格、币种、促销和销售渠道 |
| Payment | 创建订单、渠道回调、购买凭证验证、退款对账 |
| Wallet &amp; Ledger | 按游戏/币种隔离的钱包、不可变流水、原子记账 |
| Entitlement | 已购买权益、订阅状态、领取资格 |
| Fulfillment | 向权威游戏服务器可靠发放权益或道具 |
| Risk &amp; Audit | 交易异常、审计、对账及与 Oddsmaker 对接 |

**需要特别区分“通用虚拟货币”与“游戏内权威资产”。**

Courier 可以管理充值货币和支付权益，提供可选的统一钱包或每游戏独立钱包。但 Apollo、BigWorld 内部的战斗装备、角色成长、背包状态，不应该被 Courier 直接接管。

例如玩家购买一件装备，Courier 负责验证支付、记录订单和产生发货指令；游戏服务器负责检查游戏业务条件并将装备写入权威背包，然后回传幂等发放结果。

这条链路要支持重复回调、网络失败、发货重试、退款与补偿，并确保账本和订单状态可核对。

## 七、实施路线：我建议先做小，再逐渐兼容更多游戏

(P0)

**建立最小通用匹配服务**

先支持单人/多人组队、邀请、队长、准备状态、排队、取消、人数与地区匹配，使用简单的公平候选选择算法。

使用 Courier 的认证与客户端契约。先只接 Apollo，完成从 2 人组队到成功进入游戏 Instance 的流程。

---

(P1)

**抽象匹配与分配的策略接口**

接入 Open Match 或参考其 Match Function 模型，增加 MMR、队伍平衡、延迟约束、候选冲突处理和动态放宽规则。

同时实现 Atlas Discovery Adapter 和 Apollo Allocator，处理预留失败、重试、回收及断线恢复。

---

(P2)

**适配不同游戏运行时**

接入 Chorus 和 BigWorld，分别验证直播会话匹配、持续世界接入和副本分配。

将匹配策略放入 Cage 版本管理，由 Croupier 审批发布；将游戏实例与 Cockpit/Agones 的分配和部署链路连接。

---

(P3)

**生产级可靠性和匹配质量优化**

增加多副本、原子队列认领、故障恢复、扩缩容、匹配质量指标、负载测试及跨区域调度。由 Oddsmaker 评估等待时间、对局质量与长期留存。

## 我的结论

在你的现有项目体系下，我会这样决定：

**Courier 承担商业化完整闭环和客户端通用 SDK；单独建设轻量级 Party + Matchmaking + Room Allocation 服务；Atlas 保持服务器目录职责；Apollo、Chorus、BigWorld 保持游戏运行时权威。**

技术路线方面，我更倾向：

- **第一阶段：** 自己实现通用组队与会话编排接口，匹配算法先简单可用，房间分配先适配 Apollo。
- **第二阶段：** 需要复杂匹配和水平扩展时引入 Open Match；需要 Kubernetes 专用服务器池时引入 Agones。
- **第三阶段：** 再让 Cage、Croupier、Cockpit、Oddsmaker 参与配置、发布、运维和效果分析。

这样做出来的不是一套写死某种玩法的匹配系统，而是一套多游戏可复用的 **Game Session Coordination Platform**。

它将补上现有游戏服务端生态中很关键的一层，而且不会破坏 Courier、Atlas 和各游戏运行时已经明确的职责边界。
