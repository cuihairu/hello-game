# 网络游戏核心技术总览

本章基于《网络游戏核心技术与实战》（中嶋谦互）的经典框架，结合现代游戏开发实践，系统梳理游戏服务器的核心技术点。

## 1. 客户端-服务器架构基础

### 1.1 基本模型

```
┌─────────────┐     网络      ┌─────────────┐
│   客户端     │ ←──────────→ │   服务器     │
│  (Cocos/    │   TCP/UDP    │  (Go/C++/   │
│   Unity)    │   WebSocket  │   Java)     │
└─────────────┘              └─────────────┘
```

**客户端职责**：
- 渲染与表现（Unity/Cocos/Godot）
- 用户输入采集
- 本地预测与插值
- 资源加载与管理
- UI 交互逻辑

**服务端职责**：
- 游戏逻辑权威判定
- 状态持久化
- 反作弊校验
- 匹配与房间管理
- 社交与运营系统

### 1.2 Cocos Creator 客户端架构

```
Cocos Creator 项目结构：
├── assets/
│   ├── scripts/          # TypeScript 业务逻辑
│   │   ├── network/      # 网络层封装
│   │   ├── ui/           # UI 管理器
│   │   ├── audio/        # 音频管理
│   │   ├── resource/     # 资源加载
│   │   └── utils/        # 工具类
│   ├── scenes/           # 场景文件
│   ├── prefabs/          # 预制体
│   ├── animations/       # 动画
│   └── resources/        # 动态加载资源
├── settings/             # 项目配置
└── build/                # 构建输出
```

**网络层封装示例**：
```typescript
// NetworkManager.ts
export class NetworkManager {
    private ws: WebSocket;
    private heartbeatTimer: number;
    
    connect(url: string) {
        this.ws = new WebSocket(url);
        this.ws.onmessage = this.onMessage.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.startHeartbeat();
    }
    
    send(msgId: number, data: any) {
        const buffer = this.encode(msgId, data);
        this.ws.send(buffer);
    }
    
    private onMessage(event: MessageEvent) {
        const { msgId, data } = this.decode(event.data);
        this.dispatch(msgId, data);
    }
}
```

### 1.3 Unity 客户端架构

```
Unity 项目结构：
├── Assets/
│   ├── Scripts/
│   │   ├── Core/         # 核心框架
│   │   ├── Network/      # 网络层
│   │   ├── UI/           # UI 系统
│   │   ├── Audio/        # 音频系统
│   │   ├── Resource/     # 资源管理
│   │   └── Utils/        # 工具类
│   ├── Scenes/           # 场景
│   ├── Prefabs/          # 预制体
│   ├── Materials/        # 材质
│   └── Textures/         # 贴图
├── Packages/             # 包管理
└── ProjectSettings/      # 项目配置
```

**网络层封装示例**：
```csharp
// NetworkManager.cs
public class NetworkManager : MonoBehaviour {
    private WebSocket ws;
    private Queue<byte[]> sendQueue;
    
    async void Connect(string url) {
        ws = new WebSocket(url);
        ws.OnMessage += OnMessage;
        ws.OnClose += OnClose;
        await ws.Connect();
        StartCoroutine(SendLoop());
    }
    
    void Send(int msgId, byte[] data) {
        var packet = Packet.Encode(msgId, data);
        sendQueue.Enqueue(packet);
    }
    
    void OnMessage(byte[] data) {
        var (msgId, payload) = Packet.Decode(data);
        Dispatcher.Emit(msgId, payload);
    }
}
```

---

## 2. 通信协议设计

### 2.1 协议分层

```
┌─────────────────────────────────────┐
│           应用层协议                 │
│   (游戏消息: 移动、攻击、聊天等)     │
├─────────────────────────────────────┤
│           会话层协议                 │
│   (登录、心跳、断线重连)             │
├─────────────────────────────────────┤
│           传输层协议                 │
│   (TCP/UDP/WebSocket)               │
├─────────────────────────────────────┤
│           网络层协议                 │
│   (IP/路由)                         │
└─────────────────────────────────────┘
```

### 2.2 消息格式设计

**Protobuf 方案**（适合 Cocos/Unity）：
```protobuf
// game_msg.proto
message GameMessage {
    uint32 msg_id = 1;
    uint64 timestamp = 2;
    bytes payload = 3;
}

message MoveRequest {
    float x = 1;
    float y = 2;
    float z = 3;
    float rotation = 4;
}

message MoveResponse {
    uint64 player_id = 1;
    float x = 2;
    float y = 3;
    float z = 4;
}
```

**FlatBuffers 方案**（适合高性能场景）：
```flatbuffers
// game_msg.fbs
namespace GameProtocol;

struct Vec3 {
    x: float;
    y: float;
    z: float;
}

table MoveRequest {
    position: Vec3;
    rotation: float;
    timestamp: long;
}

root_type MoveRequest;
```

### 2.3 帧同步 vs 状态同步

| 特性 | 帧同步 | 状态同步 |
|------|--------|----------|
| **权威方** | 客户端（确定性） | 服务端 |
| **带宽** | 低（只传输入） | 高（传状态） |
| **延迟敏感** | 极高 | 中等 |
| **回放** | 天然支持 | 需要额外记录 |
| **反作弊** | 困难 | 容易 |
| **代表游戏** | 星际争霸、王者荣耀 | CS:GO、绝地求生 |

**帧同步实现要点**：
```go
// 服务端帧同步管理
type FrameSyncManager struct {
    currentFrame  uint32
    frameInputs   map[uint32][]PlayerInput
    frameDuration time.Duration
}

func (m *FrameSyncManager) AddInput(playerID uint64, input PlayerInput) {
    m.frameInputs[m.currentFrame] = append(m.frameInputs[m.currentFrame], PlayerInput{
        PlayerID: playerID,
        Input:    input,
    })
}

func (m *FrameSyncManager) BroadcastFrame() {
    frame := Frame{
        FrameNum: m.currentFrame,
        Inputs:   m.frameInputs[m.currentFrame],
    }
    m.broadcast(frame)
    m.currentFrame++
}
```

**状态同步实现要点**：
```go
// 服务端状态同步
type StateSyncManager struct {
    entities map[uint64]*Entity
    delta    map[uint64]*EntityDelta
}

func (m *StateSyncManager) UpdateEntity(entityID uint64, state EntityState) {
    m.entities[entityID] = &state
    m.delta[entityID] = m.computeDelta(entityID, state)
}

func (m *StateSyncManager) SyncToAll() {
    for _, delta := range m.delta {
        m.broadcast(delta)
    }
    m.clearDelta()
}
```

---

## 3. 游戏世界模型

### 3.1 AOI（兴趣区域）管理

**九宫格算法**：
```go
type AOIManager struct {
    gridWidth  int
    gridHeight int
    grids      map[int]*Grid
}

func (m *AOIManager) GetNearbyEntities(x, y float64, radius float64) []*Entity {
    gridX := int(x) / m.gridWidth
    gridY := int(y) / m.gridHeight
    
    var entities []*Entity
    for dx := -1; dx <= 1; dx++ {
        for dy := -1; dy <= 1; dy++ {
            key := (gridX+dx)*10000 + (gridY+dy)
            if grid, ok := m.grids[key]; ok {
                entities = append(entities, grid.Entities...)
            }
        }
    }
    return entities
}
```

**十字链表算法**：
```go
type CrossLinkedList struct {
    head *Entity
    tail *Entity
}

func (l *CrossLinkedList) Add(entity *Entity) {
    entity.prev = l.tail
    entity.next = nil
    l.tail.next = entity
    l.tail = entity
}

func (l *CrossLinkedList) GetNearby(entity *Entity, radius float64) []*Entity {
    var result []*Entity
    // 向前遍历
    for e := entity.prev; e != nil && entity.X-e.X < radius; e = e.prev {
        result = append(result, e)
    }
    // 向后遍历
    for e := entity.next; e != nil && e.X-entity.X < radius; e = e.next {
        result = append(result, e)
    }
    return result
}
```

### 3.2 实体状态管理

```go
type Entity struct {
    ID       uint64
    Type     EntityType
    Position Vector3
    Rotation Vector3
    State    EntityState
    Owner    uint64  // 玩家ID
    
    // 状态标记
    IsDirty  bool
    LastSync time.Time
}

type EntityState int
const (
    StateIdle EntityState = iota
    StateMoving
    StateAttacking
    StateDead
)
```

---

## 4. 玩家管理

### 4.1 登录流程

```
客户端                LoginServer              GameServer              DBServer
  │                      │                      │                      │
  │──── 登录请求 ────────→│                      │                      │
  │                      │──── 验证Token ───────→│                      │
  │                      │                      │──── 查询玩家 ────────→│
  │                      │                      │←──── 玩家数据 ────────│
  │                      │←──── 登录成功 ───────│                      │
  │←──── 返回Token ──────│                      │                      │
  │                      │                      │                      │
  │──── 进入游戏 ───────────────────────────────→│                      │
  │                      │                      │──── 加载数据 ────────→│
  │                      │                      │←──── 数据返回 ────────│
  │←──── 游戏数据 ───────────────────────────────│                      │
```

### 4.2 会话管理

```go
type Session struct {
    PlayerID   uint64
    Token      string
    ServerID   string
    LoginTime  time.Time
    LastActive time.Time
    IPAddress  string
    
    // 会话状态
    IsOnline   bool
    GameState  GameState
}

type SessionManager struct {
    sessions map[string]*Session  // token -> session
    playerMap map[uint64]string   // playerID -> token
}

func (m *SessionManager) CreateSession(playerID uint64, token string) *Session {
    session := &Session{
        PlayerID:   playerID,
        Token:      token,
        LoginTime:  time.Now(),
        LastActive: time.Now(),
        IsOnline:   true,
    }
    m.sessions[token] = session
    m.playerMap[playerID] = token
    return session
}
```

---

## 5. 游戏逻辑

### 5.1 游戏循环（Game Loop）

```
┌─────────────────────────────────────┐
│            游戏主循环                │
├─────────────────────────────────────┤
│  1. 处理网络消息                     │
│  2. 处理玩家输入                     │
│  3. 执行游戏逻辑                     │
│  4. 更新物理状态                     │
│  5. 计算 AOI                        │
│  6. 同步状态给客户端                 │
│  7. 持久化数据                       │
│  8. 等待下一帧                       │
└─────────────────────────────────────┘
```

**服务端 Tick 实现**：
```go
type GameServer struct {
    tickRate    int           // 每秒 Tick 数
    tickDuration time.Duration
    
    // 各个系统
    networkSys  *NetworkSystem
    logicSys    *LogicSystem
    aoiSys      *AOISystem
    syncSys     *SyncSystem
    dbSys       *DBSystem
}

func (s *GameServer) Run() {
    ticker := time.NewTicker(s.tickDuration)
    for range ticker.C {
        s.processNetworkMessages()
        s.processPlayerInputs()
        s.executeGameLogic()
        s.updatePhysics()
        s.calculateAOI()
        s.syncToClients()
        s.persistData()
    }
}
```

### 5.2 定时器管理

```go
type TimerManager struct {
    timers map[int64]*Timer
    nextID int64
}

type Timer struct {
    ID       int64
    Interval time.Duration
    Repeat   bool
    Callback func()
    lastFire time.Time
}

func (m *TimerManager) AddTimer(interval time.Duration, repeat bool, cb func()) int64 {
    m.nextID++
    timer := &Timer{
        ID:       m.nextID,
        Interval: interval,
        Repeat:   repeat,
        Callback: cb,
        lastFire: time.Now(),
    }
    m.timers[m.nextID] = timer
    return m.nextID
}

func (m *TimerManager) Update(now time.Time) {
    for _, timer := range m.timers {
        if now.Sub(timer.lastFire) >= timer.Interval {
            timer.Callback()
            timer.lastFire = now
            if !timer.Repeat {
                delete(m.timers, timer.ID)
            }
        }
    }
}
```

---

## 6. 数据持久化

### 6.1 数据分层

```
┌─────────────────────────────────────┐
│           热数据（Redis）            │
│   在线状态、实时数据、缓存           │
├─────────────────────────────────────┤
│           温数据（MySQL）            │
│   玩家档案、背包、装备               │
├─────────────────────────────────────┤
│           冷数据（归档）             │
│   历史记录、日志、统计               │
└─────────────────────────────────────┘
```

### 6.2 数据库设计

```sql
-- 玩家基础表
CREATE TABLE player (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id VARCHAR(64) UNIQUE NOT NULL,
    nickname VARCHAR(32),
    level INT DEFAULT 1,
    exp BIGINT DEFAULT 0,
    coin BIGINT DEFAULT 0,
    diamond INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 背包表
CREATE TABLE inventory (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_id BIGINT NOT NULL,
    item_id INT NOT NULL,
    count INT DEFAULT 1,
    extra JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES player(id)
);

-- 战斗记录表
CREATE TABLE battle_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_id BIGINT NOT NULL,
    battle_type TINYINT,
    result TINYINT,
    score INT,
    duration INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player_time (player_id, created_at)
);
```

### 6.3 缓存策略

```go
type CacheManager struct {
    redis *redis.Client
    db    *gorm.DB
}

func (m *CacheManager) GetPlayer(playerID uint64) (*Player, error) {
    // 1. 先查 Redis
    key := fmt.Sprintf("player:%d", playerID)
    data, err := m.redis.Get(ctx, key).Bytes()
    if err == nil {
        var player Player
        json.Unmarshal(data, &player)
        return &player, nil
    }
    
    // 2. 查 MySQL
    var player Player
    m.db.Where("id = ?", playerID).First(&player)
    
    // 3. 写入 Redis
    data, _ = json.Marshal(player)
    m.redis.Set(ctx, key, data, 30*time.Minute)
    
    return &player, nil
}

func (m *CacheManager) SavePlayer(player *Player) error {
    // 1. 写入 Redis
    key := fmt.Sprintf("player:%d", player.ID)
    data, _ := json.Marshal(player)
    m.redis.Set(ctx, key, data, 30*time.Minute)
    
    // 2. 异步写入 MySQL
    go m.db.Save(player)
    
    return nil
}
```

---

## 7. 安全与反作弊

### 7.1 客户端校验

```go
// 服务端校验客户端输入
func (s *GameServer) ValidateMove(playerID uint64, move MoveRequest) error {
    player := s.getPlayer(playerID)
    
    // 1. 检查移动距离
    distance := player.Position.DistanceTo(move.Position)
    if distance > MaxMoveDistance {
        return ErrMoveTooFar
    }
    
    // 2. 检查移动速度
    speed := distance / time.Since(player.LastMoveTime).Seconds()
    if speed > MaxMoveSpeed {
        return ErrMoveTooFast
    }
    
    // 3. 检查碰撞
    if s.checkCollision(player.Position, move.Position) {
        return ErrCollisionDetected
    }
    
    return nil
}
```

### 7.2 通信加密

```go
// TLS 加密通信
func (s *GameServer) StartTLSServer(addr string) error {
    cert, _ := tls.LoadX509KeyPair("server.crt", "server.key")
    config := &tls.Config{Certificates: []tls.Certificate{cert}}
    
    listener, err := tls.Listen("tcp", addr, config)
    if err != nil {
        return err
    }
    
    for {
        conn, err := listener.Accept()
        if err != nil {
            continue
        }
        go s.handleConnection(conn)
    }
}
```

### 7.3 反作弊策略

| 作弊类型 | 检测方法 | 处理方式 |
|---------|---------|---------|
| 加速挂 | 时间戳校验、速度检测 | 警告、封号 |
| 透视挂 | 服务端控制视野 | 服务端裁决 |
| 自动脚本 | 行为模式分析 | 验证码、封号 |
| 内存修改 | 关键数据校验 | 数据回滚 |
| 协议篡改 | 签名验证 | 断开连接 |

---

## 8. 性能优化

### 8.1 压力测试

```go
// 简单的压力测试客户端
type StressClient struct {
    conn      net.Conn
    playerID  uint64
    msgQueue  chan []byte
}

func (c *StressClient) Run(duration time.Duration) {
    deadline := time.Now().Add(duration)
    
    for time.Now().Before(deadline) {
        // 模拟玩家行为
        select {
        case <-time.After(100 * time.Millisecond):
            c.sendMove()
        case <-time.After(1 * time.Second):
            c.sendChat()
        case <-time.After(5 * time.Second):
            c.sendAttack()
        }
    }
}
```

### 8.2 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 响应时间 | < 100ms | P99 延迟 |
| 吞吐量 | > 10000 QPS | 每秒请求数 |
| 在线人数 | > 5000 | 单服承载 |
| CPU 使用率 | < 70% | 峰值 |
| 内存使用率 | < 80% | 峰值 |

---

## 9. 运维与部署

### 9.1 Docker 部署

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o server .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/server .
CMD ["./server"]
```

### 9.2 监控告警

```go
// Prometheus 指标
var (
    playerOnline = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "game_player_online",
            Help: "Current online players",
        },
    )
    
    requestDuration = prometheus.NewHistogram(
        prometheus.HistogramOpts{
            Name:    "game_request_duration_seconds",
            Buckets: prometheus.DefBuckets,
        },
    )
)

func init() {
    prometheus.MustRegister(playerOnline)
    prometheus.MustRegister(requestDuration)
}
```

---

## 10. 跨服与合服

### 10.1 跨服架构

```
┌─────────────────────────────────────┐
│           跨服服务器                 │
│   (匹配、排行榜、公会战)             │
├─────────────────────────────────────┤
│     ┌─────────┐  ┌─────────┐       │
│     │  服务器1 │  │  服务器2 │ ...   │
│     └─────────┘  └─────────┘       │
└─────────────────────────────────────┘
```

### 10.2 合服流程

```
1. 数据迁移
   ├── 玩家数据合并
   ├── 公会数据合并
   └── 排行榜重建

2. 冲突处理
   ├── 重名玩家处理
   ├── 公会名冲突处理
   └── 资产合并规则

3. 通知与补偿
   ├── 提前通知玩家
   ├── 合服补偿发放
   └── FAQ 与客服支持
```

---

## 下一步

根据《网络游戏核心技术与实战》的框架，建议按以下顺序深入：

1. **通信协议** → 协议设计、序列化、压缩
2. **游戏世界** → AOI、实体管理、状态同步
3. **玩家管理** → 登录、会话、权限
4. **游戏逻辑** → Tick、定时器、战斗系统
5. **数据持久化** → 数据库、缓存、归档
6. **安全反作弊** → 加密、校验、风控
7. **性能优化** → 压测、profiling、优化
8. **运维部署** → Docker、监控、扩缩容
