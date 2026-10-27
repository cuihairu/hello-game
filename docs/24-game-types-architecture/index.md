# Game Types and Architecture Selection Comparison

Game type determines the core constraints of the server architecture. Different game types have vastly different requirements for real-time-ness, consistency, state scale and concurrency model; choosing the wrong architecture leads to rework later, or even a full rebuild.

## By Real-Time Requirements

### Hard-Real-Time Competitive (latency-sensitive < 100ms)

**Typical game types**:
- FPS/TPS (CS:GO, Call of Duty Mobile)
- MOBA (Honor of Kings, League of Legends)
- Fighting games (Street Fighter, King of Fighters)
- Racing games (QQ Speed, KartRider)
- Bullet-hell shooters (Raiden, Plane Wars)

**Architectural characteristics**:
- Client-side prediction + server authoritative
- Frame sync or state sync
- Room-based: one room per match, short lifecycle
- State service process: a single process hosts a limited number of rooms
- Dedicated battle server (possibly deployed on bare metal)

**Technology choices**:
- Language: C++/Go/Rust (low latency requirements)
- Network: UDP (KCP/QUIC)
- Sync model: frame sync (deterministic) or state sync (authoritative server)
- Database: Redis (real-time state) + MySQL (persistence)

---

### Medium Real-Time (latency-tolerant 100–500ms)

**Typical game types**:
- Card battle (Hearthstone, Yu-Gi-Oh!)
- Turn-based (Fantasy Westward Journey, Onmyoji)
- Auto chess (Teamfight Tactics, Auto Chess)
- Strategy versus strategy (Civilization Awakening, Rise of Kingdoms)
- Barrage interaction (Douyin danmu games)

**Architectural characteristics**:
- Server authoritative + client presentation
- Room-based or matchmaking-based
- State can be updated in phases
- Relatively tolerant of latency

**Technology choices**:
- Language: Go/Java/C++
- Network: TCP/WebSocket/long-lived connections
- Sync model: turn-based sync or state broadcast
- Database: MySQL + Redis

---

### Soft Real-Time / Asynchronous (latency-tolerant > 1s)

**Typical game types**:
- Idle/AFK (Dota-style idle games, Journey to the West)
- Simulation/management (Happy Farm, Hay Day)
- Card raising (Onmyoji, Genshin Impact gacha)
- Strategy raising (Rate of the Lands, Three Kingdoms: Strategic Edition)
- Social casual (Animal Crossing)

**Architectural characteristics**:
- Primarily request-response
- State can be updated in batches
- Driven by background scheduled jobs
- Relatively lower concurrency demands

**Technology choices**:
- Language: Go/Python/Java
- Network: HTTP/WebSocket
- Sync model: request-response + push notifications
- Database: MySQL + Redis + scheduled jobs

---

## By Player Scale

### Single-Server Isolation (one server, one world)

**Typical game types**:
- Indie mobile games (single-player with online validation)
- Small casual games
- Products in testing

**Architectural characteristics**:
- A single process or a small number of processes
- All state in one database
- Simple deployment and operations

**Technology choices**:
- Language: Python/Node.js/Go
- Framework: Skynet / self-built lightweight framework
- Database: MySQL/SQLite

---

### Multi-Server Operations (independent servers)

**Typical game types**:
- Classic MMO (Legend of Mir, Miracle MU)
- Card raising (Fantasy Westward Journey)
- Strategy games (Rate of the Lands)

**Architectural characteristics**:
- Each server runs independently
- Players choose a server to enter
- Data isolation between servers
- Requires server-merge and rolling-server mechanisms

**Technology choices**:
- Language: C++/Java/Go
- Framework: MMORPG framework (BigWorld / self-built)
- Database: MySQL (per-server database sharding)
- Cache: Redis (independent per server)

---

### Server-Wide / Cross-Server (one server, many worlds)

**Typical game types**:
- Modern MMO (Genshin Impact, Tower of Fantasy)
- Battle royale (Game for Peace)
- Open world (Minecraft servers)
- Blockchain games

**Architectural characteristics**:
- A unified server-wide entry point
- Dynamic partitioning / sharding
- Cross-server matchmaking, cross-server combat
- State needs global visibility

**Technology choices**:
- Language: Go/C++/Java
- Architecture: microservices + service mesh
- Database: distributed database (TiDB/CockroachDB)
- Cache: Redis Cluster
- Messaging: Kafka/NATS

---

## By State Model

### Room-Based (short-lifecycle state)

**Typical game types**:
- MOBA/RTS (20–40 minutes per match)
- FPS (10–30 minutes per match)
- Auto chess (30–45 minutes per match)
- Board/card games (5–30 minutes per match)

**Architectural characteristics**:
- Room creation → in progress → settlement → destruction
- State is valid within the room's lifecycle
- Rooms can be dynamically assigned to different processes
- Easy to scale horizontally

**Design points**:
- Room manager: create, lookup, destroy
- Room state machine: waiting, in game, settling
- Room allocation: load balancing strategy
- Room migration: state recovery on process restart

---

### World-Based (long-lifecycle state)

**Typical game types**:
- MMO (Demi-Gods and Semi-Devils, JX3)
- Sandbox (Minecraft)
- Life simulation (Animal Crossing)
- Battle royale (Game for Peace)

**Architectural characteristics**:
- Player state persists
- Map/scene persistence
- Entity state needs cross-process synchronization
- AOI (area of interest) management is required

**Design points**:
- Map partitioning: grid/BSP/dynamic partitioning
- Entity management: players, NPCs, monsters, drops
- AOI management: nine-cell grid, cross-linked list, broadcast tree
- State sync: incremental sync, snapshot sync

---

### Data-Driven (data-centric state)

**Typical game types**:
- Card raising (Onmyoji, Genshin Impact)
- Strategy raising (Rate of the Lands)
- Simulation/management (Happy Farm)
- Idle/AFK (Dota-style idle games)

**Architectural characteristics**:
- State lives mainly in the database
- Read-heavy, write-light
- Batch processing by scheduled jobs
- High state-consistency requirements

**Design points**:
- Data tiering: hot/warm/cold data
- Cache strategy: LRU, scheduled write-back
- Transaction handling: critical operations need transactional guarantees
- Data archiving: historical data cleanup strategy

---

## By Social Model

### Weak Social (single-player dominant)

**Typical game types**:
- Single-player mobile games
- Idle/AFK
- Puzzle games
- Simulation/management

**Architectural characteristics**:
- Little player interaction
- Simple friend system
- Leaderboards are the main social feature
- No cross-server interaction needed

---

### Medium Social (guilds/friends)

**Typical game types**:
- Card raising
- Strategy games
- MMO
- Turn-based

**Architectural characteristics**:
- Guild system
- Friend interaction
- Cross-server guild wars
- Social state synchronization required

---

### Strong Social (real-time interaction)

**Typical game types**:
- MMO
- MOBA
- FPS
- Battle royale

**Architectural characteristics**:
- Real-time teaming
- Real-time chat
- Cross-server matchmaking
- Large-scale social state

---

## Architecture Selection Decision Tree

```text
游戏类型确定后，按以下顺序决策：

1. 实时性要求
   ├── 强实时（< 100ms）→ UDP + 帧同步/状态同步
   ├── 中等实时（100-500ms）→ TCP/WebSocket + 房间制
   └── 弱实时（> 1s）→ HTTP + 请求-响应

2. 玩家规模
   ├── 单服独立 → 简单架构
   ├── 分服运营 → MMORPG框架 + 分服分库
   └── 全服/跨服 → 微服务 + 分布式

3. 状态模型
   ├── 房间制 → 房间管理器 + 动态分配
   ├── 世界制 → AOI + 地图分区 + 实体管理
   └── 数据制 → 数据分层 + 缓存策略

4. 社交模型
   ├── 弱社交 → 简单好友 + 排行榜
   ├── 中社交 → 公会系统 + 跨服交互
   └── 强社交 → 实时社交 + 大规模同步
```

## Common Pitfalls

- **Pitfall 1**: every game uses MMO architecture → over-engineering, high maintenance cost
- **Pitfall 2**: hard-real-time games use HTTP → latency cannot be guaranteed
- **Pitfall 3**: idle games use frame sync → resource waste, high complexity
- **Pitfall 4**: multi-server games never do server merges → servers sit idle late in operations
- **Pitfall 5**: server-wide games never partition → performance bottleneck

## Next Steps

Before choosing a concrete architecture, answer three questions:
1. What is the player's most frequent core action?
2. Which states directly damage the experience the moment they go wrong?
3. Which failures cannot be recovered from, or whose recovery cost far exceeds prevention?

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [expansion](expansion.md)
