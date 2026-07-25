# 容量规划与系统结构设计

容量规划是网络游戏架构设计中最容易被忽视却最致命的环节。游戏上线后暴露的性能问题，往往不是代码写得不好，而是在架构阶段就选错了方案。本章基于《网络游戏核心技术与实战》（中嶋谦互）的框架，系统讲解服务器基本结构设计、空间分区策略，以及资源估算方法。

## 1. 服务器基本结构设计

### 1.1 单进程架构

最简单的服务器结构，所有逻辑在一个进程中运行。

```
┌─────────────────────────────────────┐
│           单进程游戏服务器            │
├─────────────────────────────────────┤
│  网络模块  │  游戏逻辑  │  数据模块   │
│  (连接管理  │  (战斗/    │  (DB/Redis) │
│   消息收发) │   移动/AOI)│             │
├─────────────────────────────────────┤
│           单进程内存空间              │
└─────────────────────────────────────┘
```

**适用场景**：
- 小型休闲游戏（同时在线 < 500）
- 独立手游（单机联网验证）
- 早期原型/MVP 验证阶段

**优点**：
- 开发简单，调试方便
- 无进程间通信开销
- 数据一致性天然保证

**缺点**：
- CPU 受单核限制
- 内存受限于单机
- 故障影响全部玩家
- 无法水平扩展

### 1.2 多进程分布式架构

大型 MMO 和实时对战的标准架构。

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Login      │  │   Gate       │  │   Chat       │
│   Server     │  │   Server     │  │   Server     │
│  (登录验证)   │  │  (连接代理)   │  │  (聊天频道)   │
└──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│   World      │  │   Battle     │
│   Server     │  │   Server     │
│  (世界状态)   │  │  (战斗实例)   │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│   MySQL      │  │   Redis      │
│  (持久化)     │  │  (缓存/热数据) │
└──────────────┘  └──────────────┘
```

**进程职责划分**：

| 进程 | 职责 | 扩展方式 |
|------|------|---------|
| Login Server | 账号验证、Token 签发 | 少量实例，无状态 |
| Gate Server | 连接代理、消息路由、心跳 | 多实例，连接均分 |
| World Server | 世界状态、AOI、NPC 逻辑 | 按地图分区扩展 |
| Battle Server | 实战逻辑（帧同步/状态同步） | 按房间数扩展 |
| Chat Server | 聊天频道、公告、邮件 | 按频道扩展 |
| DB Server | 数据持久化、读写分离 | 主从 + 分库分表 |

### 1.3 微服务架构

全服/跨服游戏的终极形态。

```
┌─────────────────────────────────────────┐
│              API Gateway                │
│         (限流/鉴权/路由/熔断)            │
├─────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │Auth │ │Gate │ │Game │ │Chat │ ...   │
│  │Svc  │ │Svc  │ │Svc  │ │Svc  │      │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘      │
│     │       │       │       │           │
│  ┌──┴───────┴───────┴───────┴──┐        │
│  │        Service Mesh         │        │
│  │     (Istio / Linkerd)       │        │
│  └─────────────┬───────────────┘        │
│     ┌──────────┼──────────┐             │
│  ┌──┴──┐  ┌──┴──┐  ┌──┴──┐            │
│  │MySQL│  │Redis│  │Kafka│             │
│  └─────┘  └─────┘  └─────┘            │
└─────────────────────────────────────────┘
```

**选型决策依据**：

```
单服独立（< 5000 DAU）
  → 单进程或少量进程

分服运营（5000-100000 DAU/服）
  → 多进程分布式

全服/跨服（> 100000 DAU）
  → 微服务 + 服务网格
```

---

## 2. 空间分区策略

### 2.1 为什么需要空间分区

MMO 中一个典型的问题：当 5000 个玩家同时在线时，每个玩家的每一次移动都需要广播给周围所有玩家。如果用暴力 O(N²) 方案，每次移动需要通知 5000 人，系统瞬间崩溃。

空间分区的本质是将 O(N²) 降低到 O(N log N) 或 O(N)。

### 2.2 静态网格分区

最经典的方案，将地图划分为固定大小的网格。

```
┌────┬────┬────┬────┬────┐
│ 0,0│ 1,0│ 2,0│ 3,0│ 4,0│
├────┼────┼────┼────┼────┤
│ 0,1│ 1,1│ 2,1│ 3,1│ 4,1│
├────┼────┼────┼────┼────┤
│ 0,2│ 1,2│ 2,2│ 3,2│ 4,2│
├────┼────┼────┼────┼────┤
│ 0,3│ 1,3│ 2,3│ 3,3│ 4,3│
├────┼────┼────┼────┼────┤
│ 0,4│ 1,4│ 2,4│ 3,4│ 4,4│
└────┴────┴────┴────┴────┘
```

**网格大小选择原则**：
- 太小：管理开销大，跨网格消息多
- 太大：单网格内实体太多，AOI 查询慢
- 经验值：网格边长 ≈ 2 × AOI 半径

```go
type GridManager struct {
    gridSize   int           // 网格边长
    grids      map[int]*Grid // key: gridX * 10000 + gridY
}

type Grid struct {
    X, Y       int
    Entities   map[uint64]*Entity
    Players    map[uint64]*Player  // 仅玩家，用于快速广播
}

func (m *GridManager) GetGridKey(x, y float64) int {
    gridX := int(x) / m.gridSize
    gridY := int(y) / m.gridSize
    return gridX*10000 + gridY
}

func (m *GridManager) GetNearbyPlayers(x, y float64) []*Player {
    gridX := int(x) / m.gridSize
    gridY := int(y) / m.gridSize
    
    var players []*Player
    for dx := -1; dx <= 1; dx++ {
        for dy := -1; dy <= 1; dy++ {
            key := (gridX+dx)*10000 + (gridY+dy)
            if grid, ok := m.grids[key]; ok {
                for _, p := range grid.Players {
                    players = append(players, p)
                }
            }
        }
    }
    return players
}

func (m *GridManager) MoveEntity(entity *Entity, oldX, oldY, newX, newY float64) {
    oldKey := m.GetGridKey(oldX, oldY)
    newKey := m.GetGridKey(newX, newY)
    
    if oldKey != newKey {
        // 跨网格移动：从旧格子移除，加入新格子
        m.removeFromGrid(oldKey, entity.ID)
        m.addToGrid(newKey, entity)
        
        // 通知视野变化的玩家
        m.notifyAOIChange(entity, oldKey, newKey)
    }
}
```

### 2.3 十字链表法

适合实体分布不均匀的场景（如城市/野外混合地图）。

```
X 轴链表: P1 ——→ P3 ——→ P5 ——→ P7
Y 轴链表: P2 ——→ P4 ——→ P6 ——→ P8

查找 P5 附近实体:
  1. 沿 X 轴向左/向右遍历，直到距离 > AOI 半径
  2. 沿 Y 轴向上/向下遍历，直到距离 > AOI 半径
  3. 取交集得到精确的附近实体
```

**与网格法对比**：

| 特性 | 网格法 | 十字链表法 |
|------|--------|-----------|
| 实现复杂度 | 低 | 中 |
| 均匀分布性能 | 优秀 | 优秀 |
| 不均匀分布性能 | 较差（热点格子） | 优秀 |
| 跨格子检测 | 需要维护 | 自动 |
| 内存占用 | 固定 | 与实体数成正比 |

### 2.4 四叉树分区

适合实体分布差异极大的开放世界游戏。

```go
type QuadTree struct {
    bounds    Rectangle
    entities  []*Entity
    children  [4]*QuadTree  // NW, NE, SW, SE
    maxEntities int
    maxDepth    int
    depth       int
}

func (qt *QuadTree) Insert(entity *Entity) {
    if len(qt.entities) < qt.maxEntities || qt.depth >= qt.maxDepth {
        qt.entities = append(qt.entities, entity)
        return
    }
    
    if qt.children[0] == nil {
        qt.subdivide()
    }
    
    for _, child := range qt.children {
        if child.bounds.Contains(entity.Position) {
            child.Insert(entity)
            return
        }
    }
    qt.entities = append(qt.entities, entity)
}

func (qt *QuadTree) Query(range_ Rectangle) []*Entity {
    var result []*Entity
    
    if !qt.bounds.Intersects(range_) {
        return nil
    }
    
    for _, e := range qt.entities {
        if range_.Contains(e.Position) {
            result = append(result, e)
        }
    }
    
    for _, child := range qt.children {
        if child != nil {
            result = append(result, child.Query(range_)...)
        }
    }
    return result
}
```

### 2.5 分区方案选择

```
地图特点判断:
  ├── 地图小、玩家少 → 无需分区，广播全量
  ├── 地图中等、分布均匀 → 静态网格（最简单）
  ├── 地图大、分布不均 → 十字链表或动态网格
  └── 开放世界、极端分布差异 → 四叉树 + 动态负载均衡
```

---

## 3. 实例方法（Instance Method）

### 3.1 核心概念

实例方法是指将游戏世界划分为多个独立运行的"实例"，每个实例拥有自己的状态和逻辑处理能力。

```
┌─────────────────────────────────────┐
│           世界管理器                  │
│     (实例注册、负载均衡、路由)         │
├─────────┬─────────┬─────────┬───────┤
│实例 A   │实例 B   │实例 C   │实例 D │
│地图1-主城│地图2-野外│地图3-副本│地图4-  │
│500人    │300人    │50人    │战场200│
└─────────┴─────────┴─────────┴───────┘
```

### 3.2 实例生命周期

```go
type Instance struct {
    ID          string
    MapID       int
    Players     map[uint64]*Player
    NPCs        map[uint64]*NPC
    State       InstanceState
    CreatedAt   time.Time
    
    // 每个实例独立的 Tick 循环
    tickRate    int
    tickTicker  *time.Ticker
}

type InstanceState int
const (
    InstanceStateIdle     InstanceState = iota  // 空闲
    InstanceStateActive                         // 运行中
    InstanceStateClosing                        // 关闭中
    InstanceStateClosed                         // 已关闭
)

type InstanceManager struct {
    instances  map[string]*Instance
    maxPerNode int  // 每个节点最大实例数
}

func (m *InstanceManager) CreateInstance(mapID int) *Instance {
    inst := &Instance{
        ID:        generateUUID(),
        MapID:     mapID,
        Players:   make(map[uint64]*Player),
        NPCs:      make(map[uint64]*NPC),
        State:     InstanceStateActive,
        CreatedAt: time.Now(),
        tickRate:  20,  // 20 TPS
    }
    
    m.instances[inst.ID] = inst
    inst.startTickLoop()
    return inst
}

func (m *InstanceManager) GetInstance(instID string) *Instance {
    return m.instances[instID]
}

func (m *InstanceManager) RemoveInstance(instID string) {
    if inst, ok := m.instances[instID]; ok {
        inst.stopTickLoop()
        delete(m.instances, instID)
    }
}
```

### 3.3 副本实例 vs 场景实例

```
副本实例（Dungeon Instance）:
  ├── 创建条件：玩家组队进入
  ├── 生命周期：通关/超时后销毁
  ├── 隔离性：不同队伍互不影响
  └── 典型：副本、竞技场、世界 Boss

场景实例（Zone Instance）:
  ├── 创建条件：地图负载达到阈值
  ├── 生命周期：长期存在，按需创建
  ├── 隔离性：同地图不同实例玩家互不可见
  └── 典型：主城分线、野外分线
```

**场景分线实现**：

```go
type ZoneInstanceManager struct {
    zones    map[int][]*ZoneInstance  // mapID -> instances
    config   *ZoneConfig
}

type ZoneConfig struct {
    MaxPlayersPerZone int     // 每个分线最大玩家数
    MinZones          int     // 最小分线数
    MaxZones          int     // 最大分线数
    SpawnThreshold    float64 // 新建分线的触发阈值（玩家数/最大容量）
    MergeThreshold    float64 // 合并分线的触发阈值
}

func (m *ZoneInstanceManager) EnterZone(player *Player, mapID int) *ZoneInstance {
    instances := m.zones[mapID]
    
    // 1. 寻找有空位的分线
    for _, inst := range instances {
        if float64(len(inst.Players)) < float64(m.config.MaxPlayersPerZone)*m.config.SpawnThreshold {
            inst.AddPlayer(player)
            return inst
        }
    }
    
    // 2. 所有分线都满了，创建新分线
    if len(instances) < m.config.MaxZones {
        newInst := m.createZoneInstance(mapID)
        newInst.AddPlayer(player)
        return newInst
    }
    
    // 3. 已达最大分线数，强制加入最空闲的
    least := instances[0]
    for _, inst := range instances[1:] {
        if len(inst.Players) < len(least.Players) {
            least = inst
        }
    }
    least.AddPlayer(player)
    return least
}
```

---

## 4. 并行世界方法（Parallel World Method）

### 4.1 核心思想

并行世界方法是在多核 CPU 上将游戏世界的不同区域分配到不同线程/进程并行处理。

```
┌─────────────────────────────────────────┐
│            世界分区并行                   │
├────────────┬────────────┬───────────────┤
│  Thread 1  │  Thread 2  │  Thread 3     │
│  主城区域   │  野外区域   │  副本区域      │
│  ┌──┐ ┌──┐ │  ┌──┐ ┌──┐ │  ┌──┐ ┌──┐  │
│  │A │ │B │ │  │C │ │D │ │  │E │ │F │  │
│  └──┘ └──┘ │  └──┘ └──┘ │  └──┘ └──┘  │
├────────────┴────────────┴───────────────┤
│          跨区域消息队列                   │
│    (玩家跨区域移动、跨区域战斗等)          │
└─────────────────────────────────────────┘
```

### 4.2 单线程瓶颈问题

传统单线程游戏服务器的 Tick 循环：

```
单线程 Tick (20 TPS = 50ms):

  [收消息 5ms] → [AOI 计算 15ms] → [战斗逻辑 10ms] → [状态同步 10ms] → [持久化 10ms]
  ←────────────────── 50ms 一个 Tick ──────────────────→
  
  问题：AOI 计算随玩家数平方增长，很快超过 50ms
```

### 4.3 多线程并行方案

```go
type ParallelWorld struct {
    regions    []*Region
    crossQueue chan CrossRegionMessage
    tickRate   int
}

type Region struct {
    ID        int
    entities  map[uint64]*Entity
    aoi       *AOIManager
    logic     *LogicSystem
    workerID  int
}

func (pw *ParallelWorld) Start() {
    for _, region := range pw.regions {
        go pw.runRegion(region)
    }
    go pw.processCrossRegionMessages()
}

func (pw *ParallelWorld) runRegion(region *Region) {
    ticker := time.NewTicker(time.Second / time.Duration(pw.tickRate))
    for range ticker.C {
        // 1. 处理本区域网络消息
        region.processMessages()
        
        // 2. AOI 计算（只在本区域）
        region.aoi.Calculate()
        
        // 3. 游戏逻辑
        region.logic.Update()
        
        // 4. 收集跨区域消息
        region.collectCrossMessages(pw.crossQueue)
    }
}
```

### 4.4 边界处理

区域之间的边界是最难处理的部分。当玩家位于两个区域的交界处时：

```
┌──────────┐  边界  ┌──────────┐
│ Region A │ ←──→  │ Region B │
│  ● ←──玩家在A侧   │          │
│          │   →→  │  ● ←──玩家进入B
└──────────┘       └──────────┘

解决方案：
1. 边界缓冲区：边界两侧各扩展一个缓冲带
2. 锁定转移：进入缓冲区后锁定，完成迁移后解锁
3. 延迟可见：先在新区域出现，后从旧区域消失
```

```go
// 跨区域消息类型
type CrossRegionMessage struct {
    Type      CrossMsgType
    PlayerID  uint64
    FromRegion int
    ToRegion  int
    Data      interface{}
}

type CrossMsgType int
const (
    CrossMsgPlayerMove CrossMsgType = iota  // 玩家跨区域移动
    CrossMsgAOISync                         // AOI 跨区域同步
    CrossMsgBattleSync                      // 战斗跨区域同步
    CrossMsgChat                            // 跨区域聊天
)
```

### 4.5 并行世界方案对比

| 方案 | 并行度 | 复杂度 | 边界处理 | 适用场景 |
|------|--------|--------|---------|---------|
| 单线程 | 无 | 低 | 无 | 小型游戏 |
| 多进程（区域分离） | 高 | 中 | 进程间通信 | 大型 MMO |
| 多线程（区域分离） | 中 | 中 | 线程间同步 | 多核服务器 |
| Actor 模型 | 高 | 高 | 消息传递 | 超大规模 |
| ECS + Job System | 极高 | 极高 | 组件同步 | 物理密集型 |

---

## 5. 服务器资源估算

### 5.1 CPU 估算

```
CPU 需求 = 在线人数 × 每人每秒操作数 × 单次操作 CPU 时间

示例（MMO 主城场景）：
  - 在线人数：2000 人
  - 每人每秒操作：10 次（移动 + 攻击 + 技能）
  - 单次操作 CPU 时间：50μs
  - CPU 需求 = 2000 × 10 × 50μs = 1 核 100% 利用率

实际工程系数（考虑 AOI、碰撞、NPC AI）：
  - AOI 计算：占 CPU 40%
  - 战斗逻辑：占 CPU 25%
  - NPC AI：占 CPU 15%
  - 网络处理：占 CPU 10%
  - 其他（定时器、日志等）：占 CPU 10%

安全系数：取 1.5~2 倍余量
最终 CPU 需求 = 1 核 × 1.5~2 = 2 核
```

### 5.2 内存估算

```
内存需求 = 玩家数据 + 地图数据 + NPC 数据 + 系统开销

示例：
  每个玩家：
    - 会话对象：~512 bytes
    - 背包数据（懒加载）：~2 KB
    - AOI 订阅列表：~1 KB
    - 网络缓冲区：~4 KB
    ≈ 8 KB / 玩家

  每个 NPC：
    - AI 状态：~256 bytes
    - 战斗属性：~1 KB
    ≈ 1.3 KB / NPC

  每个地图：
    - 地形数据（懒加载）：~50 MB
    - 寻路数据：~20 MB
    ≈ 70 MB / 地图

示例场景（2000 人，500 NPC，3 张地图）：
  玩家内存：2000 × 8 KB = 16 MB
  NPC 内存：500 × 1.3 KB = 0.65 MB
  地图内存：3 × 70 MB = 210 MB
  系统开销：~100 MB（GC、线程栈、连接缓冲等）
  总计 ≈ 327 MB
  
  安全系数 × 2 → 需要 640 MB ~ 1 GB 内存
```

### 5.3 连接数估算

```
最大连接数 = Gate Server 数量 × 单连接数上限

示例：
  - 目标同时在线：10000 人
  - 单 Gate Server 最大连接：5000
  - Gate Server 数量 = 10000 / 5000 = 2 台
  
  每个连接占用：
    - 文件描述符：1 个
    - TCP 缓冲区：~32 KB（读写各 16 KB）
    - 连接状态：~1 KB
    ≈ 33 KB / 连接

  总连接内存：10000 × 33 KB ≈ 330 MB
```

### 5.4 服务器配置推荐

| 游戏规模 | 同时在线 | CPU | 内存 | 磁盘 | 网络 |
|---------|---------|-----|------|------|------|
| 小型休闲 | < 1000 | 2 核 | 4 GB | 50 GB SSD | 10 Mbps |
| 中型 MMO | 1000-5000 | 8 核 | 16 GB | 100 GB SSD | 50 Mbps |
| 大型 MMO | 5000-20000 | 16 核 | 32 GB | 200 GB SSD | 100 Mbps |
| 超大型 MMO | > 20000 | 32 核+ | 64 GB+ | 500 GB SSD | 1 Gbps+ |

---

## 6. 带宽成本估算

### 6.1 带宽计算公式

```
总带宽 = (上行消息量 + 下行消息量) × 在线人数 × 2（TCP/IP 头部开销）

上行（客户端 → 服务器）：
  - 移动包：100 bytes × 10 次/秒 = 1 KB/s
  - 操作包：200 bytes × 2 次/秒 = 400 B/s
  - 心跳包：32 bytes × 1 次/秒 = 32 B/s
  ≈ 1.4 KB/s / 玩家

下行（服务器 → 客户端）：
  - 位置广播：60 bytes × 20 人/次 × 10 次/秒 = 12 KB/s
  - 状态同步：100 bytes × 5 次/秒 = 500 B/s
  - 系统消息：200 bytes × 1 次/秒 = 200 B/s
  ≈ 12.7 KB/s / 玩家

总带宽 = (1.4 + 12.7) KB/s × 2000 人 × 8 bit/byte × 1.2（IP 头部）
       ≈ 540 Mbps ≈ 67.5 MB/s
```

### 6.2 不同游戏类型的带宽特征

| 游戏类型 | 上行 (KB/s/人) | 下行 (KB/s/人) | 峰值系数 |
|---------|---------------|---------------|---------|
| FPS/TPS | 5-10 | 20-50 | 3-5x |
| MOBA | 3-8 | 15-30 | 2-4x |
| MMO 主城 | 1-2 | 5-15 | 1.5-2x |
| MMO 战斗 | 2-5 | 10-25 | 2-3x |
| 卡牌对战 | 0.5-1 | 2-5 | 1.5x |
| 回合制 | 0.3-0.5 | 1-3 | 1.2x |

### 6.3 带宽优化策略

```
1. 压缩
   ├── 位置数据：Delta 编码 + varint
   ├── 状态数据：Protobuf 天然压缩
   └── 资源数据：gzip/zstd 压缩

2. 减少包量
   ├── 合包：多个小消息合并为一个大包
   ├── 采样：远距离实体降低同步频率
   └── 过滤：只发送变化的数据

3. 节流
   ├── 客户端限速：限制发送频率
   ├── 服务端合并：服务端合并后再广播
   └── 优先级队列：重要消息优先发送

4. 传输优化
   ├── UDP + 自定义重传（KCP/QUIC）
   ├── 连接池复用
   └── CDN 加速静态资源
```

**合并消息示例**：

```go
type MessageBatch struct {
    Messages []*GameMessage
    Timestamp int64
}

func (s *GameServer) batchAndSend(player *Player) {
    // 收集 50ms 内的消息，一次性发送
    batch := &MessageBatch{
        Timestamp: time.Now().UnixMilli(),
    }
    
    for _, msg := range player.pendingMessages {
        batch.Messages = append(batch.Messages, msg)
    }
    player.pendingMessages = nil
    
    data, _ := protobuf.Marshal(batch)
    player.Send(data)
}
```

### 6.4 成本估算

```
云服务器带宽计费模式：
  - 按固定带宽：100 Mbps ≈ ¥5000/月（国内）
  - 按流量计费：¥0.8/GB（国内）

示例（5000 人 MMO）：
  下行带宽：5000 × 10 KB/s = 50 MB/s = 400 Mbps
  月流量：50 MB/s × 86400 × 30 = 129.6 TB
  
  按固定带宽：需 500 Mbps 线路 ≈ ¥25000/月
  按流量计费：129.6 TB × ¥0.8/GB = ¥103,680/月
  
  结论：高并发场景固定带宽更划算
```

---

## 7. 数据库性能预测

### 7.1 数据库负载模型

```
数据库 QPS = 在线人数 × 每人每秒操作数 × 写操作比例 × 1.2（峰值系数）

示例（5000 人 MMO）：
  在线人数：5000
  每人每秒操作：5 次
  写操作比例：30%
  数据库 QPS = 5000 × 5 × 0.3 × 1.2 = 9000 QPS
```

### 7.2 常见操作的数据库开销

| 操作 | 类型 | 频率 | 单次耗时 | QPS 贡献 |
|------|------|------|---------|---------|
| 玩家登录 | 读 | 每人一次 | 5-10ms | 低 |
| 移动同步 | 写 | 10次/秒 | 0.1ms | 中 |
| 战斗结算 | 写 | 每局一次 | 20-50ms | 中 |
| 背包操作 | 读写 | 不定 | 2-5ms | 低 |
| 排行榜 | 读 | 1次/秒 | 10-50ms | 高 |
| 聊天记录 | 写 | 1次/秒 | 1-2ms | 低 |
| 签到/任务 | 读写 | 每日一次 | 5-10ms | 极低 |

### 7.3 MySQL 性能基准

```
单机 MySQL（SSD）性能参考：
  - 单表简单查询：5000-10000 QPS
  - 单表简单更新：3000-5000 QPS
  - 复杂 JOIN 查询：500-2000 QPS
  - 事务操作：1000-3000 QPS

瓶颈点：
  - 写锁竞争：UPDATE 同一行 → 串行执行
  - 表锁：大表 DDL → 全表锁定
  - 连接数：默认 max_connections=151
  - 复制延迟：主从复制延迟 100ms-1s
```

### 7.4 数据库扩展方案

```
方案一：读写分离
  ┌──────────┐
  │  Master  │ ←── 写操作
  └────┬─────┘
       │ 复制
  ┌────┴─────┐
  │  Slave   │ ←── 读操作
  └──────────┘
  适用：读多写少（90% 读 / 10% 写）

方案二：分库分表
  玩家表按 ID 取模分 16 个库：
  DB_0: player_0 ~ player_15 (id % 16 == 0)
  DB_1: player_0 ~ player_15 (id % 16 == 1)
  ...
  DB_15: player_0 ~ player_15 (id % 16 == 15)
  适用：单表数据量超过 500 万行

方案三：Redis + MySQL
  ┌──────────┐     ┌──────────┐
  │  Redis   │ ←── │  MySQL   │
  │ (热数据)  │     │ (冷数据)  │
  └──────────┘     └──────────┘
  热数据：在线玩家状态、排行榜、会话
  冷数据：离线玩家数据、历史记录
```

### 7.5 数据库 QPS 预测工具

```go
type DBLoadPredictor struct {
    onlineCount  int
    actionsPerSec float64
    writeRatio    float64
    peakFactor    float64
}

type DBLoadResult struct {
    TotalQPS      float64
    ReadQPS       float64
    WriteQPS      float64
    EstimatedLag  time.Duration  // 预估主从延迟
    Recommendation string
}

func (p *DBLoadPredictor) Predict() *DBLoadResult {
    totalQPS := float64(p.onlineCount) * p.actionsPerSec * p.writeRatio * p.peakFactor
    readQPS := totalQPS * (1 - p.writeRatio)
    writeQPS := totalQPS * p.writeRatio
    
    result := &DBLoadResult{
        TotalQPS: totalQPS,
        ReadQPS:  readQPS,
        WriteQPS: writeQPS,
    }
    
    // 评估是否需要扩展
    if writeQPS > 3000 {
        result.Recommendation = "建议读写分离或分库分表"
    } else if writeQPS > 1000 {
        result.Recommendation = "建议主从复制 + Redis 缓存"
    } else {
        result.Recommendation = "单机 MySQL 可满足"
    }
    
    // 估算主从延迟
    result.EstimatedLag = time.Duration(writeQPS/100) * time.Millisecond
    
    return result
}

func PredictDBLoad(onlineCount int, actionsPerSec, writeRatio, peakFactor float64) *DBLoadResult {
    predictor := &DBLoadPredictor{
        onlineCount:   onlineCount,
        actionsPerSec: actionsPerSec,
        writeRatio:    writeRatio,
        peakFactor:    peakFactor,
    }
    return predictor.Predict()
}
```

### 7.6 性能优化清单

```
数据库性能优化：
├── 索引优化
│   ├── 为高频查询字段建立索引
│   ├── 避免索引过多（影响写入性能）
│   └── 使用覆盖索引减少回表
├── 查询优化
│   ├── 避免 SELECT *，只查需要的字段
│   ├── 使用连接池，避免频繁建连
│   └── 批量操作代替逐条操作
├── 架构优化
│   ├── 读写分离
│   ├── 分库分表
│   ├── Redis 缓存热数据
│   └── 异步写入（消息队列）
└── 监控预警
    ├── 慢查询日志
    ├── 连接数监控
    ├── 复制延迟监控
    └── QPS/TPS 监控
```

---

## 8. 容量规划实战清单

```
上线前容量规划 Checklist：

□ 1. 确定目标 DAU 和同时在线人数
□ 2. 估算峰值流量（通常取平均的 2-3 倍）
□ 3. 选择服务器架构（单进程/分布式/微服务）
□ 4. 选择空间分区方案
□ 5. 计算 CPU/内存/连接数需求
□ 6. 计算带宽需求和成本
□ 7. 评估数据库 QPS，选择扩展方案
□ 8. 制定缓存策略
□ 9. 设计监控告警
□ 10. 进行压力测试验证
□ 11. 准备扩容方案
□ 12. 制定降级预案
```

## 下一步

容量规划完成后，需要设计通信协议来承载所有游戏数据的传输。下一章将深入讲解协议设计：从 8 种协议类型到二进制协议实现，再到压缩与加密技术。
