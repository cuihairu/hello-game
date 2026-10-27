# 01 Game Backend Technology Landscape

> This piece starts from the historical evolution of games and the backend differences across project types, recording my synthesis of what makes game backends distinctive. The constraints introduced by game state, real-time interaction, and long-term operations often lead this field to architectural trade-offs quite different from those of common internet services.

---

## 1.1 Game History and Technical Evolution

Only by understanding how game technology evolved can you understand why today's architectures are designed the way they are.

### The Birth and Early Development of Games (1950s-1970s)

| Era | Milestone | Technology | Significance |
|------|--------|------|------|
| 1958 | Tennis for Two | Analog computer + oscilloscope | The first interactive electronic game |
| 1962 | Spacewar! | PDP-1 minicomputer | The first multiplayer combat game |
| 1971 | Computer Space | Hardwired logic | The first commercial arcade machine |
| 1972 | Pong | Atari | Start of the golden age of arcade games |
| 1978 | Space Invaders | Z80 CPU | Rise of the Japanese game industry |

**Technical characteristics**: programmed directly on hardware with no OS; game logic fixed in hardware; mostly single-machine, physical side-by-side play (arcade cabinets); no concept of networking, no persistence.

### The Home Console Era (1980s)

| Era | Representative Games | New Gameplay | Technical Breakthrough |
|------|---------|--------|---------|
| 1980 | Pac-Man | Maze chase | AI pathfinding |
| 1981 | Donkey Kong | Platform jumping | Level design |
| 1983 | Fire Emblem | Tactical strategy | Turn-based combat |
| 1985 | Super Mario Bros. | Side-scrolling action | Scrolling |
| 1986 | The Legend of Zelda | Action adventure | Battery saves |
| 1987 | Final Fantasy | Turn-based RPG | Storytelling |
| 1989 | Tetris | Puzzle clearing | Easy to pick up, deep strategy |

**Technical evolution**: CPUs jumped from 8-bit to 16-bit; memory expanded from 2KB to 64KB; displays went from monochrome to color; storage went from cartridges to battery saves; sound went from single tone to multi-channel.

### The Sprouting of Online Games (1990s)

```text
网络协议演进时间线：

1990  MUD1 (文字MUD) ──── TCP Telnet
  │
1991  DOOM ─────────────── IPX局域网
  │
1996  Quake ────────────── UDP + 客户端预测
  │
1997  Ultima Online ────── TCP + 大规模在线
  │
1999  EverQuest ────────── TCP + 3D MMORPG
  │
1999  Counter-Strike ───── UDP + 帧同步
```

**MUD** (1978) was the first multiplayer online game, using TCP Telnet, pure-text interaction, server authority, and supporting many players online at once.

**DOOM** (1993) pioneered FPS combat, using the IPX LAN protocol and client-side prediction, syncing only inputs and not state (the prototype of frame sync).

**Quake** (1996) was the first internet FPS and chose UDP transport:
- TCP's retransmission mechanism causes latency jitter, in-order delivery blocks out-of-order processing, and its congestion control is unsuitable for real-time games
- UDP has no retransmission, delivers out of order, and has no congestion control; the application layer controls reliability itself

### The Golden Age of MMORPGs (1997-2010)

| Era | Representative Games | Technical Characteristics | Concurrent Players |
|------|---------|---------|---------|
| 1997 | Ultima Online | Open world, player economy | 5,000 |
| 1999 | EverQuest | 3D world, guild system | 10,000 |
| 2004 | World of Warcraft | Mature MMO, instanced dungeon system | 12,000,000 |
| 2005 | Fantasy Westward Journey | Turn-based, social system | 2,000,000 |

**Architectural evolution**: first generation (single server, all logic in one process) → second generation (distributed, multiple processes + Redis cache) → third generation (microservices, service discovery + message queue + containerization).

### The Mobile Game Era (2008-Present)

```text
移动游戏技术栈演进：

2008-2012：功能机 → 智能机
├── Cocos2d-x（C++/Lua）
├── Unity3D（C#）
└── 简单 HTTP 请求

2013-2016：手游爆发
├── WebSocket（长连接）
├── TCP/WebSocket 混合
└── 微信小游戏

2017-至今：多元化
├── UDP/KCP（低延迟）
├── gRPC（微服务通信）
└── 云游戏
```

### Network Protocol Landscape

```text
协议演进：
1990s  TCP Telnet (MUD)
  │
1996   UDP (Quake互联网)
  │
2000s  TCP/MMORPG (魔兽世界)
  │
2008   HTTP (早期手游)
  │
2012   WebSocket (HTML5游戏)
  │
2015   KCP (可靠UDP)
  │
2016   QUIC (Google新一代协议)
  │
2020   WebTransport (Web实时通信)
```

### Protocol Selection Decision Tree

```text
游戏需要什么？
│
├── 实时性要求高（< 50ms）
│   ├── 需要可靠性 → KCP
│   └── 不需要可靠性 → UDP
│
├── 实时性要求中等（50-200ms）
│   ├── 双向通信 → WebSocket
│   └── 服务端推送 → SSE
│
├── 实时性要求低（> 200ms）
│   ├── 请求-响应 → HTTP
│   └── 消息推送 → MQTT
│
└── 重要操作（不能丢）
    └── TCP
```

### The Real State of Game Server Tech Stacks

Game server technology selection **does not evolve linearly**; it is **chosen based on game type and team background**. There is no path where "everyone migrates from C++ to Go".

**The real state of the industry**:

| Game Type | Mainstream Tech Stack | Reason |
|---------|-----------|------|
| Large MMOs | C++/Python (KBEngine/BigWorld) or Go | Need high performance, AOI, entity migration |
| Mobile game backends | Go (Pitaya) or Java (Netty) | Development efficiency, mature ecosystem |
| Mini-games/H5 | Node.js/Go + WebSocket | Fast iteration, simple deployment |
| Indie games | Photon (commercial) or self-built | Fast launch, no deep customization needed |
| Board/card games | Java/Go + HTTP | The request-response model is enough |
| Shooter/MOBA | C++/Go + UDP/KCP | Extremely low latency requirements |

**Practical considerations for language choice**:

- **C++**: high performance ceiling, but low development efficiency; suitable for low-level engines and high-performance modules
- **Go**: simple concurrency, lightweight deployment; becoming the mainstream choice for game servers
- **Java**: mature ecosystem, deep talent pool, but GC pauses are a hard flaw
- **Lua**: convenient hot updates, good embeddability; the Skynet ecosystem
- **Python**: fast iteration, but obvious performance bottlenecks (the Python layer of KBEngine/BigWorld)
- **Node.js**: suitable for H5/mini-games, but not for real-time competitive play

**The reality of deployment**:

- **Physical machines/VMs**: still mainstream, especially for scenarios that need GPUs or special hardware
- **Docker + K8s**: spreading, but the stateful nature of game servers makes K8s more complicated to use
- **Hybrid deployment**: login servers/gateways containerized, battle servers/world servers on physical machines — in many projects this counts as a fairly common approach

---

## 1.2 Game Types and Backend Differences

Different game types have radically different backend needs; this is the fundamental starting point of architecture design.

### Core Classification Dimensions

```text
                    实时性要求
                    高
                    │
          FPS/TPS   │   MMO开放世界
          格斗      │   沙盒
                    │
    低 ─────────────┼────────────── 高
    交互复杂度      │
                    │
          挂机/放置 │   SLG策略
          棋牌      │   卡牌RPG
                    │
                    低
```

### Backend Characteristics by Type

| Game Type | Real-Time | Concurrency Model | Sync Method | Typical Protocol | Data Consistency | Backend Complexity |
|---------|--------|---------|---------|---------|-----------|-----------|
| FPS/TPS | Extremely high (<16ms) | Room-based | Frame sync/state sync | UDP/KCP | Eventual consistency | ⭐⭐⭐⭐⭐ |
| MOBA | Extremely high (<16ms) | Room-based | Frame sync/state sync | UDP/KCP | Eventual consistency | ⭐⭐⭐⭐⭐ |
| Turn-based | Low (>500ms) | Room-based | Request-response | TCP/WebSocket | Strong consistency | ⭐⭐ |
| MMO | Medium (100ms) | World-based | State sync | TCP/WebSocket | Strong consistency | ⭐⭐⭐⭐ |
| Card games | Low | Room-based | Request-response | HTTP/TCP | Strong consistency | ⭐⭐ |
| Board/card games | Low | Room-based | Request-response | TCP/WebSocket | Strong consistency | ⭐⭐ |
| SLG | Low | Asynchronous | Scheduled batch | HTTP/TCP | Strong consistency | ⭐⭐⭐ |
| Idle games | Extremely low | Asynchronous | Scheduled sync | HTTP/TCP | Eventual consistency | ⭐ |
| Sandbox | Medium | World-based | Incremental sync | TCP/KCP | Eventual consistency | ⭐⭐⭐⭐⭐ |

### Core Backend Challenges by Type

**FPS/MOBA (real-time competitive)**
- Core tension: network latency vs game fairness
- Key technologies: client-side prediction, server-side validation, latency compensation, rollback/fast-forward
- Backend responsibility: authoritative referee, not authoritative simulator
- Typical solution: room matchmaking → game instance → state broadcast

**MMO (massively online)**
- Core tension: massive player counts vs world consistency
- Key technologies: AOI (interest management), zone/shard splitting, instanced dungeon system
- Backend responsibility: authoritative storage and distribution of world state
- Typical solution: gateway cluster → scene servers → database cluster

**Card/board games (turn-based)**
- Core tension: fairness vs cheat protection
- Key technologies: server authority, operation confirmation, result validation
- Backend responsibility: rule execution and outcome adjudication
- Typical solution: HTTP interface + state machine + database

**SLG (strategy)**
- Core tension: asynchronous interaction vs time consistency
- Key technologies: timer system, queue system, battle report generation
- Backend responsibility: timeline management and event triggering
- Typical solution: HTTP API + scheduled tasks + battle simulator

---

## 1.3 The Essence of Game Backends

With the history and classification understood, we need to answer a fundamental question: **what problem is a game backend actually solving?**

### Game Backend vs Internet Backend: The Essential Difference

```text
互联网后端（电商、社交、内容）          游戏后端（竞技、MMO、策略）
────────────────────────────          ────────────────────────────
核心：信息的存储与分发                 核心：虚拟世界的实时模拟
延迟容忍：200-500ms 可接受            延迟容忍：<50ms 才能玩
一致性模型：最终一致（可接受）         一致性模型：强一致（作弊 = 死亡）
并发模型：请求-响应为主               并发模型：持续连接 + 状态推送
数据特征：读多写少                    数据特征：高频读写、状态机驱动
故障影响：用户体验下降                故障影响：游戏崩溃、玩家流失
生死线：可用性（不能宕机）            生死线：一致性（不能出bug）
```

### Six Essential Characteristics of Game Backends

#### 1. Real-Time (Real-time)

Game backends need to respond to player actions within extremely short time windows. Different types of games have different real-time requirements:

```text
实时性层级：

L0 — 极实时（< 16ms，60fps）
     FPS、格斗、竞速
     → 每帧都可能产生网络交互
     → 需要使用 UDP/KCP

L1 — 高实时（< 50ms）
     MOBA、RTS
     → 关键操作需要快速响应
     → UDP/KCP 或优化的 TCP

L2 — 中实时（50-200ms）
     MMO、沙盒
     → 允许一定延迟，但不能卡顿
     → TCP/WebSocket

L3 — 低实时（> 200ms）
     回合制、卡牌、挂机
     → 操作之间有思考时间
     → HTTP/TCP 均可
```

**Real-time performance is not a matter of "the faster the better"**; it is about finding a balance among latency, bandwidth, and fairness. Quake chose UDP not because TCP is "slow", but because TCP's retransmission mechanism introduces unpredictable latency jitter, which is fatal for real-time competitive play.

#### 2. Consistency

Game backends have far higher consistency requirements than internet backends. In an e-commerce system, an order arriving a few seconds late is acceptable; in a game, one player sees themselves hit an opponent while the opponent sees themselves dodge — that is "inconsistency", and it directly destroys the game experience.

```text
一致性模型选择：

强一致（Strong Consistency）
├── 适用：棋牌、卡牌、交易系统
├── 特点：所有玩家看到相同状态
├── 代价：延迟较高、吞吐量较低
└── 实现：服务端权威 + 操作确认

最终一致（Eventual Consistency）
├── 适用：MMO 世界状态、排行榜
├── 特点：短暂不一致可接受，最终收敛
├── 代价：可能出现"幽灵"状态
└── 实现：乐观更新 + 异步同步

悲观一致（Pessimistic Consistency）
├── 适用：FPS/MOBA 的关键判定
├── 特点：先加锁再操作，保证绝对一致
├── 代价：延迟最高、并发最低
└── 实现：服务端校验 + 回滚修正
```

#### 3. Concurrency

Concurrency for a game backend is not simply "how many requests are processed at the same time", but "how many active game states are maintained at the same time".

```text
互联网并发模型：
  请求 → 处理 → 响应 → 释放
  （无状态，水平扩展简单）

游戏并发模型：
  连接 → 进入游戏 → 持续交互 → 状态更新 → 退出
  （有状态，需要亲和性）
```

**Stateful connections** are the core challenge of game backend concurrency. An MMO scene server must simultaneously maintain the positions, states, inventories, and quest progress of thousands of players — and this state cannot simply be migrated between processes.

#### 4. Scalability

Game backend scaling faces a unique "ceiling" problem:

```text
互联网扩展：                    游戏扩展：
用户增加 → 加机器 → 解决       玩家增加 → 加机器 → 但世界是共享的！
                                │
                                ├── 分服：简单但割裂体验
                                ├── 分区：复杂但无缝
                                └── 实例化：副本、房间
```

**World sharing** is the fundamental contradiction of game scaling. E-commerce can process each user independently, but in an MMO all players share the same virtual world — you cannot put player A's trade and player B's trade in different databases, because they may be trading the same piece of equipment.

#### 5. Operability

Operating a game backend is more complicated than operating an internet backend, because:

```text
互联网运维：                     游戏运维：
├── 故障：服务降级              ├── 故障：玩家数据丢失、游戏崩溃
├── 回滚：重新部署              ├── 回滚：需要数据修复
├── 扩容：无感知                ├── 扩容：需要世界迁移
├── 监控：QPS、延迟             ├── 监控：QPS、延迟、玩家状态、外挂检测
└── 告警：服务不可用            └── 告警：服务不可用 + 数据不一致 + 外挂
```

**Hot updates** are a hard requirement for game backends. Operational events, numerical adjustments, and bug fixes must all take effect without stopping the servers — this requires the architecture to support hot config reloading, hot logic replacement, and hot data migration.

#### 6. Security

The security threats facing game backends far exceed those facing internet backends:

```text
互联网安全威胁：                 游戏安全威胁：
├── SQL 注入                    ├── SQL 注入
├── XSS                         ├── 封包篡改（协议逆向）
├── CSRF                        ├── 加速外挂（时间操控）
└── DDoS                        ├── 内存修改（数值作弊）
                                ├── 透视外挂（信息泄露）
                                ├── 自动脚本（机器人）
                                ├── 协议重放（重放攻击）
                                └── DDoS（定向攻击）
```

**Server authority** is the cornerstone of game security. Clients can be cracked, modified, and reverse-engineered — but the server's data and logic are trustworthy. All critical adjudication must be completed on the server.

### The Essential Definition of a Game Backend

Synthesizing the six characteristics above, we can give the essential definition of a game backend:

> **A game backend is a real-time, stateful, highly consistent virtual world simulator.**
>
> Its core responsibility is to maintain a consistent, fair, and scalable virtual world for all players under the constraints of network latency.

This definition contains three key constraints:
1. **The network latency constraint**: players connect over the internet, and the laws of physics set an upper limit on information propagation
2. **The consistency constraint**: all players need to see (eventually) the same virtual world
3. **The fairness constraint**: differences in network conditions must not cause differences in game experience

Understand these three constraints and you understand why game backends need seemingly complex technologies such as client-side prediction, server-side validation, latency compensation, and frame sync/state sync — they are all searching for the optimal solution among these three constraints.

### Core Principles of Game Backend Architecture Design

Based on the analysis above, game backend architecture design should follow these principles:

```text
1. 服务端权威（Server Authority）
   → 所有关键逻辑在服务端执行，客户端只是表现层

2. 最小数据传输（Minimal Data Transfer）
   → 只传必要的信息，压缩、差分、预测

3. 状态机驱动（State Machine Driven）
   → 所有实体用状态机管理，转换需要经过服务端校验

4. 分层解耦（Layered Decoupling）
   → 网关层、逻辑层、数据层分离，各自独立扩展

5. 故障隔离（Fault Isolation）
   → 单个房间/场景的故障不能影响整个服务

6. 可观测性（Observability）
   → 日志、指标、链路追踪三位一体，快速定位问题
```

---

## Code Example: A Minimal Game Server

This chapter is a panoramic introduction and has not yet entered any specialist topic. But the essential definition given in Section 1.3 — **a real-time, stateful, highly consistent virtual world simulator** — can be shown intuitively with a skeleton of under a hundred lines. The example below writes three of the six core principles directly into code: **server authority**, **minimal data transfer**, and **layered decoupling** (separating the connection layer from the logic layer). Later chapters will replace each of its parts layer by layer.

```go
// 最小游戏服务器：单房间、单写者、帧广播
// 它回答了游戏后端最核心的三个本质问题：
// 状态放在哪（Room）、谁有权写它（只有 Run 这个 goroutine）、怎么对外表现（每帧广播）
func main() {
    ln, _ := net.Listen("tcp", ":7000")
    room := NewRoom()
    go room.Run(15 * time.Millisecond) // 15Hz 逻辑帧：游戏后端的"心跳"（第 7 章 Tick）
    for {
        conn, _ := ln.Accept()
        go handleConn(conn, room)      // 一个连接一个 goroutine（第 5 章协程模型）
    }
}

type Vec struct{ X, Y float64 }

type Player struct {
    ID   uint64
    Pos  Vec     // 权威状态：服务端认这一份，客户端的位置只是表现
    conn net.Conn
}

type Room struct {
    players map[uint64]*Player
    join    chan *Player
    leave   chan uint64
    input   chan Input
}

func NewRoom() *Room {
    return &Room{
        players: make(map[uint64]*Player),
        join:    make(chan *Player, 16),
        leave:   make(chan uint64, 16),
        input:   make(chan Input, 256), // 有界队列：容量是显式的设计参数（第 5 章背压）
    }
}

// Run 是房间里唯一的写者：玩家增减、移动、广播全部顺序执行，天然无竞态
func (r *Room) Run(frame time.Duration) {
    t := time.NewTicker(frame)
    defer t.Stop()
    for {
        select {
        case p := <-r.join:
            r.players[p.ID] = p
        case id := <-r.leave:
            delete(r.players, id)
        case in := <-r.input:
            r.applyInput(in)   // 校验后写入权威状态
        case <-t.C:
            r.broadcastFrame() // 每帧把"谁在哪"发给所有人
        }
    }
}

// 服务端权威：客户端上报只是声明，超速移动直接丢弃（第 18 章风控的第一道防线）
func (r *Room) applyInput(in Input) {
    p, ok := r.players[in.PlayerID]
    if !ok {
        return
    }
    moved := p.Pos.Add(in.Dir)
    if dist(p.Pos, moved) > maxStep { // 速度校验：按服务端的规则重算
        return
    }
    p.Pos = moved
}

// 最小数据传输：每帧只广播"谁在哪"这一份必要信息
// 真实实现会在此做 Delta 压缩、兴趣区域裁剪与消息合并（第 4 章）
func (r *Room) broadcastFrame() {
    frame := make([]PlayerPos, 0, len(r.players))
    for _, p := range r.players {
        frame = append(frame, PlayerPos{p.ID, p.Pos})
    }
    for _, p := range r.players {
        p.conn.Send(frame)
    }
}

// 连接层只做解码与投递，不写任何房间状态——分层解耦
func handleConn(conn net.Conn, room *Room) {
    p := &Player{ID: nextID(), conn: conn}
    room.join <- p
    defer func() { room.leave <- p.ID; conn.Close() }()
    for {
        in, err := decodeInput(conn) // 长度分帧解码（第 4 章拆包器）
        if err != nil {
            return
        }
        room.input <- in             // 只投递声明；写者只有 Run
    }
}
```

Set against the technology evolution history in Section 1.1, this skeleton is a direct descendant of the prototype servers of the 1990s MUD era — which also shows that the core problems of game backends have not changed in thirty years: **where state lives, who can write it, how it syncs**. Each step of its further growth corresponds to a later chapter: more rooms require single-writer isolation and message delivery (Chapter 5), the skeleton gets wrapped by a framework (Chapter 6), processes split into gateways and battle servers (Chapter 7), broadcasts get compression and culling (Chapter 4).

---

> **Chapter summary**: a game backend is not "internet backend + game logic"; it is a completely different technical field. The six challenges it faces — real-time, consistency, concurrency, scaling, operations, security — require us to think about architecture design from first principles instead of simply applying common internet practices.

In the chapters that follow, we will go deeper into the concrete architecture of each game type and see how these principles land in practice.


---

## Appendix: Game-Type Problem Models and Classification Methods

> The following content is consolidated from the "Game Types and Problem Models" chapter of the knowledge base, mapping different game types against technical problems.

### Why Problem Models Are Needed

Game projects cannot be understood only through the genre names players know. The safer approach is to accept that two layers of fact exist at the same time: the first layer is the gameplay types used in everyday communication among players, the market, and the team; the second layer is the technical problem models that actually drive the architecture behind that gameplay.

What really determines networking, sync, service organization, data governance, and operating costs is usually not "whether it is called an RPG, FPS, or SLG", but the following questions:

- Whether players share the same real-time state
- Whether a time difference of tens to hundreds of milliseconds directly changes outcomes
- Whether critical state closes within a session or accumulates over months
- Whether the most expensive failure is an experience failure, an asset failure, or a platform collaboration failure
- Whether pressure blows up first on the server, the client, or the payment and channel chain

### Six Questions for Typing a Project

When you take on a new project, you can first ask the following six questions in sequence:

**1. Do players share the same real-time state**

If one action by player A must change the world player B currently sees within a few hundred milliseconds, the project has already entered the room-based, hard-real-time, or persistent-online-world band. If players mainly influence each other through leaderboards, battle reports, trading, gifting, alliances, and asynchronous progression, the project is closer to the long-cycle progression or platform type.

**2. Are outcomes determined by time precision**

`Whether an input difference of 50 to 150 milliseconds is enough to significantly change the outcome`. If yes, then the sync model, prediction, adjudication, replay, and anti-cheat need to enter core design as early as possible.

**3. Does core state close within a session, or accumulate long-term**

When judging, do not just ask "is there progression"; ask "where does the player's most expensive state actually live — in-session or out-of-session".

**4. Is the most expensive failure an experience failure or an asset failure**

This step helps the team decide whether systems should prioritize "low latency" or "strong auditability".

**5. Are external platforms part of the primary path**

Can this product still fully stand without channels, payments, ads, social platforms, creator ecosystems, or external review.

**6. Does pressure blow up first on the server or the client**

If the concurrent player count stays the same and you only double the on-screen objects, skill effects, asset sizes, and script volume, will the project die first.

### Problem Model Typing Table

| The project looks more like this | Dominant model | What to design first in phase one | Most feared live incident |
| --- | --- | --- | --- |
| Players form sessions quickly; most in-session state is cleared after settlement | Room-based session | Matchmaking, room assembly, lifecycle, reconnection, settlement | Cannot start a session, cannot get back in, settlement errors |
| Input time differences directly change outcomes | Hard-real-time competitive | Tick, sync model, prediction and correction, adjudication, replay | Desync, misjudgment, cheats, disputes with no evidence |
| The world-player relationship persists long-term | Persistent online world | Zone sharding, migration, scene organization, recovery, control plane | Frozen scenes, state loss during migration, server merge and cross-server incidents |
| Long-term assets and events drive retention | Long-cycle progression and asynchronous interaction | Asset model, config pipeline, reward chain, compensation and repair | Wrong or missed payouts, event incidents, data pollution |
| Growth and revenue depend on platforms and external ecosystems | Economy and platform | Accounts, order state machine, callback compensation, reconciliation, risk control | Missed orders, duplicate deliveries, risk control failure |
| Extremely high on-screen object and presentation density | High-frequency objects and heavy presentation | Object lifecycle, asset budget, network culling, performance budget | Frame drops, memory blowups, load avalanches, broadcast overload |

### Details of Each Problem Model

#### Problem Model for Room-Based Session Games

The core characteristic of room-based session games is not "lightweight gameplay" but that `most critical state closes within a single session`. Mahjong, Dou Dizhu, party games, billiards, lightweight shooters, and room-based mini-games are all closer to this problem structure.

Technical pressure usually lands on:

- **Matchmaking and room assembly**: whether players can be organized into a session quickly, correctly, and stably
- **Room lifecycle**: create, wait, start, run, disconnect, end, settle, destroy
- **In-session authority and broadcast**: who is authoritative, what gets broadcast, whether spectating and delegated AI control are allowed
- **Reconnection and delegated AI control**: whether a disconnected player can return to the original room, and what state can be restored when they return
- **Trustworthy settlement**: trustworthy win/loss, trustworthy rewards, trackable match records, idempotency and audit

#### Problem Model for Hard-Real-Time Competitive Games

The key point for hard-real-time competitive games is not "has PVP" but that `time differences between player inputs are enough to directly change outcomes`. Sync, prediction, adjudication, replay, and anti-cheat are no longer supporting facilities but part of the core experience.

Common sync solutions:

- **Authoritative server state sync**: anti-cheat and arbitration converge more easily; the cost is heavy investment in fixing local game feel
- **Input lockstep/frame sync**: in theory, consistency and replay come more naturally; the cost is extremely high requirements on determinism, timeouts, and reconnection
- **Hybrid solutions**: local objects organized by frame, other parts synced by authoritative state

#### Problem Model for Persistent Online World Games

The most essential characteristic of persistent online world games is that `world state is not wholesale cleared when a session ends`. Scenes, entities, player positions, social relationships, and economic activity can all persist.

Technical pressure usually lands first on:

- **World partitioning and scene organization**: split by map or by world instance
- **State ownership**: long-term character state, scene state, world-level public state, social and organizational state
- **Cross-scene migration and state handoff**: who takes over state when a character moves from scene A to scene B
- **Control plane and operations orchestration**: dynamic scale-out, scale-in, server merges, cross-server, hotfixes, and version switching
- **Recovery and rollback**: the cost of failure in world projects is far higher than in room projects

#### Problem Model for Long-Cycle Progression and Asynchronous Interaction Games

The core of these games is not real-time competition but that `player assets and progression paths accumulate long-term, and a large share of interaction is completed asynchronously`. Technical difficulty lands more on data consistency, idempotency and audit, config systems, quest and event systems, risk control, and compensation.

#### Problem Model for Economy and Platform Games

The core difficulty of these projects lies in `trading, channels, payments, ads, social virality, and external platform ecosystems`. The first pressure on the technical system comes from "trusted collaboration with the outside world". Key issues include: accounts and identity, order state machines, audit and reconciliation, SDK adaptation and isolation, risk control and compliance.

#### Problem Model for High-Frequency Object and Heavy Presentation Games

The salient contradiction of this model is that `both object counts and presentation density are high`. Bullet-hell shooters, large-scale units on screen, effect-heavy ARPGs, and complex simulations all push client rendering, asset loading, logic updates, and network broadcast to their limits at the same time. Object lifecycle, asset systems, network culling, client presentation budgets, and server-side object organization are all architecture questions.

### Combinations of Models

Real projects are almost never a single model. When judging combined models, the two most dangerous approaches are:

- Labeling the project with one tag and ignoring that the other models will bite back at the primary path sooner or later
- Seeing that the project is complex and then building every model to the highest standard all at once

Three dimensions for identifying the dominant model:

1. **What players churn over first** → the problem that least deserves to be held hostage by peripheral systems
2. **Where the most expensive failure happens** → the system that most deserves priority defense
3. **Where the team spends most of its development time** → the most honest indicator

### Game-Type Technology Quick Reference Table

| Gameplay type | What players care about first | First technical alarm | Common dominant model |
| --- | --- | --- | --- |
| Board/tabletop sessions | Fairness, turn order, delegated AI control, settlement | Room state machine, trustworthy randomness, dispute evidence | Room-based session |
| Party/room-based light competitive | Fast session start, can group with friends, can return after disconnect | Matchmaking, room assembly, broadcast, reconnection | Room-based session |
| MOBA | Game feel, fairness, skill dueling, team fights | Sync, adjudication, replay, anti-cheat | Hard-real-time competitive |
| FPS/TPS/tactical shooters | Gun feel, hit registration, view, fairness | Hit adjudication, weak networks, compensation, cheats | Hard-real-time competitive |
| Fighting/racing/sports competition | Frame feel, turn order, frame-perfect inputs | Rollback, determinism, input latency | Hard-real-time competitive |
| RTS/real-time tactics | Multi-unit control, global operations | Command sync, pathfinding, batched updates | Hard-real-time competitive / high-frequency objects |
| Card/CCG/auto-battler | Deck building, randomness, lineups, settlement | State machines, RNG, effect chains, economy systems | Long-cycle progression / room-based |
| Turn-based RPG/tactics | Settlement order, numbers, description consistency | Effect chains, checkpoint recovery, log review | Long-cycle progression |
| MMORPG/large-world online | Long-term characters, shared world coexistence, guild social | Zone sharding, migration, cross-server, operations | Persistent online world |
| ARPG/loot/dungeon-driven | Combat satisfaction, builds, drop progression | Skill systems, room dungeons, asset audit | Combined |
| Idle/management/simulation raising | Long-term accumulation, offline earnings, event cadence | Asset consistency, offline settlement, config operations | Long-cycle progression |
| SLG/4X/seasonal sandboxes | City building, alliances, marching, seasons | Persistent world, asynchronous collaboration, relationship chains | Persistent online world / long-cycle progression |
| Survival/building/sandbox | Building, destruction, shared world | Object persistence, zone load, asset organization | Persistent online world / high-frequency objects |
| Roguelike/Roguelite | Restart speed, randomness feel, out-of-session progression | Random seeds, reproduction, in-session/out-of-session split | Room-based / long-cycle progression |
| UGC/platform ecosystems | Creation, sharing, distribution, trading | Moderation, permissions, sandbox isolation, ecosystem governance | Economy and platform |

### Focused Analysis by Game Type

#### Room-Based and Lightweight Online

For this kind of product the technical pressure is usually not on the "big world" but on "high-frequency session starts and stable session wraps". Architecture priorities:

- Out-of-session services must be stable: login, matchmaking, teaming, settlement, and leaderboards usually expose problems earlier than in-session logic
- Room services must be light: single-room processes or single-session instances should be as simple as possible, fast to start and fast to reclaim
- Disconnect recovery must be explicit: either support reliable reconnection, or explicitly not support it and compensate in the product

**Common pitfalls**: reading "lightweight online" as "the backend can be very light"; building room-based games with a monolithic MMO-style architecture; underestimating the importance of the settlement chain.

#### Hard-Real-Time Competitive

The hardest part of these products is not writing the rules out, but letting all players see a world that is "consistent enough, timely enough, and not easily exploited by cheating". Architecture priorities:

- The sync model is the first decision
- The network chain is part of the core gameplay
- Anti-cheat must be moved up front
- Spectating, replay, and arbitration are often not accessory features

**Common pitfalls**: watching only average latency and ignoring jitter and tail latency; building combat first and patching sync and anti-cheat later; treating weak-network optimization as a client detail.

#### Persistent Online World

Once the world persists, the technical question upgrades from "correct within a session" to "stable over the long term". Architecture priorities:

- How the world is split determines the ceiling
- State ownership must be very clear
- Cross-scene and cross-server chains need care
- Operations capability is product capability

**Common pitfalls**: reading "persistent online" as "all state must be shared in real time"; promising a "seamless big world" too early; underestimating how deeply operations intrude into systems.

#### Long-Cycle Progression and Management

For long-cycle progression products the system focus usually shifts from "single-session experience" to "long-term operability". The core problems the technical team must solve are usually:

- Whether asset changes are trackable, rollback-able, and auditable
- Whether config changes are safe, gray-releasable, and attributable
- Whether the event system supports fast composition
- Whether data definitions are stable and can support operational judgment

**Common pitfalls**: assuming the server side is simple because it is not hard real-time; valuing combat over assets; building the event system as a pile of temporary scripts.

#### Platform and Ecosystem Games

What these products face is not a single tech-stack problem but a "platform governance" problem. Architecture priorities:

- The content pipeline needs independence
- Identity and permission systems get heavy
- Risk control and governance cannot be retrofitted
- Multi-platform adaptation will exist long-term

**Common pitfalls**: treating UGC as an upload feature; only considering platform constraints right before launch; underestimating the importance of creator tools.

---

## Practical Case: Investigating a Typing Misjudgment That "Built an MMO Architecture and Died at Session Start"

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified, and the typing criteria match the appendix section "Six Questions for Typing a Project".

**Background and symptoms**. A party tabletop game (a collection of small-session gameplay such as Pictionary, billiards, and battle cards, on the WeChat mini-game platform) was greenlit; the core members came from an MMO project and the team started with the world-type architecture they knew best: world sharding, strongly consistent global state, and a big unified gateway. The wipe test targeted **20,000** concurrent players; the day-one peak was **8,000**. The three most expensive items on the books: a session-start success rate of only **82**% (nearly **18** failures per 100 session starts), matchmaking P95 wait of **45** seconds, and monthly server costs **60**% over budget. Player-side feedback, however, was concentrated: not "laggy", but "cannot start a session" and "dropped and cannot get back in".

### Step 1: Symptoms and Measurement

Split the metrics by chain: the in-session chain actually met its targets — in-room round-trip P99 of **80**ms and almost **0** sync-related complaints; everything bad was in the session-start chain — room assembly failures at **18**% (exactly complementary to the 82% session-start success rate), matchmaking P95 of **45** seconds, and **230** tickets about match records and rewards not arriving after a session ended. Conclusion: the "world" did not have problems; the "rooms" did — and what players of this kind of product care about first is precisely "fast session start, can group with friends, can return after disconnect" (verbatim from the "Party/room-based light competitive" row of the appendix quick reference table).

### Step 2: Layered Attribution: Re-Ask the Six Questions for This Project

Take the six questions from the appendix and re-ask them one by one:

1. Do players share the same real-time state? — Only within **4**-player small sessions, cleared the moment a session ends; everything out-of-session is asynchronous (friends, leaderboards, match records)
2. Are outcomes determined by time precision? — No; actions still make it within the **500**ms range (turn-based)
3. Does core state close within a session, or accumulate long-term? — It closes within a session; the player's most expensive state is out-of-session (collections and cosmetics)
4. Is the most expensive failure an experience failure or an asset failure? — "Cannot start a session, cannot get back in, settlement errors" — exactly the three fears the typing table's row 1 lists for room-based session games
5. Are external platforms part of the primary path? — Yes (mini-game platform; login and sharing are both on the chain)
6. Does pressure blow up first on the server or the client? — The server, and in the session-start chain rather than the world chain

**5** of the **6** questions point to "room-based session". This project was not "a smaller MMO"; its dominant problem model was room-based from the very beginning.

### Step 3: Root Cause

The root cause of the typing misjudgment is that it hit both dangerous approaches called out in the appendix section "Combinations of Models": **labeling the project with one tag** (slapping on the "WeChat mini-game" genre label and skipping the problem model), and **building every model to the highest standard all at once** (maxing out all world-type components following MMO experience). The investment ledger is the most honest:

```text
分型账本（服务端工时投入）
世界型组件（分片/迁移/跨服）  55%
房间型五件事（匹配/组房/生命周期/重连/结算）  15%
常规业务功能（好友/排行/战绩）  30%
```

The problem was not that the five tasks went unfinished, but that the phase-one five tasks the typing table prescribes for room-based session games — **matchmaking, room assembly, lifecycle, reconnection, settlement** — were allotted only **15**%: set against **55**% of world-type investment, all the most expensive failures landed inside that **15**%. The three dimensions for identifying the dominant model also read true in reverse: what players churn over first (cannot start a session), where the most expensive failure happens (the session-start chain), where the team spends most of its development time (world-type components) — all three are evidence of the typing misjudgment.

### Step 4: Remediation and Backfill

The architecture's center of gravity migrated rather than being torn down and rewritten: world sharding was taken offline and rooms were changed to per-session instantiation — modeled on this chapter's "minimal game server" skeleton (single room, single writer, broadcast every frame), one instance per session, created at session start and destroyed at settlement, which is exactly the prototype form of the single-writer isolation in Chapter 05 and the Tick main loop in Chapter 07; reconnection "back to the original room" was explicitly modeled in the room lifecycle; the settlement chain got idempotency and reconciliation added (each of the **230** payout complaints closed one by one). World-type components were not deleted but frozen for reuse (to be re-enabled for later seasons and guild gameplay).

Two things were backfilled into process: the project-approval review checklist gained the "six questions for typing a project"; the technical review template gained the three dimensions for identifying the dominant model and a scheduling gate for the "room-type five tasks" (no review unless the five tasks have a work-hour share).

**Backfill checklist**:

| Backfill item | Landing point |
|------|------|
| Six-question typing into project-approval review | Appendix "Six Questions for Typing a Project" |
| Three dominant-model identification dimensions into the technical review template | Appendix "Three Dimensions for Identifying the Dominant Model" |
| Room-type five tasks into the scheduling gate | Appendix "Problem Model Typing Table" row 1 |
| Two dangerous approaches into architecture review checklists | Appendix "Combinations of Models" |

Recheck: session-start success rate **82**% → **98**% (room assembly failures **18**% → **2**%), matchmaking P95 **45** seconds → **8** seconds, monthly server costs from **60**% over budget back within budget — what got released was precisely the world-sharding cluster.

### Three Lessons from the Case

1. **Team familiarity is not an architectural basis; the problem model is**. "We know MMO" built the world-type components the team was familiar with, not the session-start chain this project needed — the cost went where failures were least likely.
2. **Do the typing at project approval, not in the wipe-test bill**. Five of the six questions pointed to room-based; the answers were there all along — what was missing was only asking the six questions out loud.
3. **The dominant model sets phase-one priorities; it does not veto the other models**. World-type components were frozen for reuse rather than deleted — the right posture for combined models is phased construction, not "build everything to the highest standard at once".

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [knowledge](/knowledge.md)
- [01-authoritative-books](/research/01-authoritative-books.md)
