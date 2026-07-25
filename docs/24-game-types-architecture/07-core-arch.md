# 网络游戏核心技术总览

本章基于《网络游戏核心技术与实战》（中嶋谦互）的经典框架，结合现代游戏开发实践，系统梳理游戏服务器的核心技术点。

> **本章目标**：让服务端开发者掌握游戏服务器的核心架构设计，理解从单服到分布式架构的演进路径，并能设计出可支撑百万级在线的游戏后端系统。

---

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

### 1.2 完整架构分层

```
┌──────────────────────────────────────────────────────────────────┐
│                       游戏服务器架构分层                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐      │
│  │                    接入层 (Gateway)                     │      │
│  │  ├── 连接管理（TCP/WebSocket/UDP）                      │      │
│  │  ├── 协议解析（Protobuf/JSON）                         │      │
│  │  ├── 消息路由（消息ID → 服务分发）                      │      │
│  │  ├── 心跳检测                                          │      │
│  │  └── 限流/黑名单                                       │      │
│  └────────────────────────┬───────────────────────────────┘      │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────┐      │
│  │                    逻辑层 (Game Logic)                  │      │
│  │  ├── 登录/注册                                         │      │
│  │  ├── 战斗系统                                          │      │
│  │  ├── 背包系统                                          │      │
│  │  ├── 排行榜系统                                        │      │
│  │  └── 公会/社交系统                                     │      │
│  └────────────────────────┬───────────────────────────────┘      │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────┐      │
│  │                    数据层 (Data Layer)                  │      │
│  │  ├── 热数据（Redis）：在线状态、排行榜、会话            │      │
│  │  ├── 温数据（MySQL）：玩家档案、背包、装备              │      │
│  │  └── 冷数据（归档）：历史记录、日志                     │      │
│  └────────────────────────┬───────────────────────────────┘      │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────┐      │
│  │                    基础设施层 (Infrastructure)           │      │
│  │  ├── 服务发现（etcd/Consul）                           │      │
│  │  ├── 配置中心                                          │      │
│  │  ├── 日志系统（ELK）                                   │      │
│  │  ├── 监控告警（Prometheus/Grafana）                     │      │
│  │  └── 消息队列（Kafka/RabbitMQ）                        │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 Cocos Creator 客户端架构

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

### 1.4 Unity 客户端架构

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

### 2.3 传输层选择

| 传输层 | 可靠性 | 延迟 | 带宽 | 适用场景 | 实现复杂度 |
|--------|--------|------|------|---------|-----------|
| **TCP** | ✓ | 中 | 中 | 大部分游戏 | 低 |
| **WebSocket** | ✓ | 中 | 中 | Web/小游戏 | 低 |
| **UDP** | ✗ | 低 | 低 | 实时对战 | 高 |
| **KCP** | ✓ | 低 | 中 | 手游 | 中 |
| **QUIC** | ✓ | 低 | 低 | 未来趋势 | 高 |

### 2.4 消息头设计

```go
// 消息头结构
type MessageHeader struct {
    // 方案1：固定4字节头
    // [2字节长度][2字节消息ID]
    
    // 方案2：固定8字节头（推荐）
    // [4字节长度][4字节消息ID]
    
    // 方案3：扩展头（适合复杂场景）
    // [4字节长度][4字节消息ID][4字节序列号][4字节标记位]
}

// 示例：消息编解码
type PacketCodec struct {
    headerSize int
    maxMessageSize int
}

func (c *PacketCodec) Encode(msgID uint32, payload []byte) []byte {
    totalLen := c.headerSize + len(payload)
    buf := make([]byte, totalLen)
    
    // 写入长度（大端序）
    binary.BigEndian.PutUint32(buf[0:4], uint32(totalLen))
    // 写入消息ID
    binary.BigEndian.PutUint32(buf[4:8], msgID)
    // 写入数据
    copy(buf[c.headerSize:], payload)
    
    return buf
}

func (c *PacketCodec) Decode(data []byte) (uint32, []byte, error) {
    if len(data) < c.headerSize {
        return 0, nil, errors.New("消息太短")
    }
    
    totalLen := binary.BigEndian.Uint32(data[0:4])
    msgID := binary.BigEndian.Uint32(data[4:8])
    
    if int(totalLen) > c.maxMessageSize {
        return 0, nil, errors.New("消息太大")
    }
    
    payload := data[c.headerSize:totalLen]
    return msgID, payload, nil
}
```

### 2.5 消息压缩

```go
// 消息压缩器
type MessageCompressor struct {
    // 选择压缩算法
    // - gzip: 压缩率高，CPU 开销大
    // - snappy: 压缩率中等，CPU 开销小
    // - lz4: 压缩率低，CPU 开销最小
    
    minCompressSize int // 最小压缩阈值（字节）
}

func (c *MessageCompressor) Compress(data []byte) ([]byte, error) {
    // 小消息不压缩
    if len(data) < c.minCompressSize {
        return data, nil
    }
    
    // 使用 snappy 压缩
    compressed := snappy.Encode(nil, data)
    
    // 压缩后更小才使用
    if len(compressed) < len(data) {
        // 标记为已压缩（消息头加标记位）
        return compressed, nil
    }
    
    return data, nil
}

func (c *MessageCompressor) Decompress(data []byte, isCompressed bool) ([]byte, error) {
    if !isCompressed {
        return data, nil
    }
    return snappy.Decode(nil, data)
}
```

### 2.6 帧同步 vs 状态同步

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

### 2.7 帧同步详细实现

```go
// 帧同步完整实现示例
type FrameSyncServer struct {
    // 帧配置
    frameRate    int           // 帧率（如：15帧/秒）
    frameDuration time.Duration // 每帧时长
    
    // 帧状态
    currentFrame uint32
    frameInputs  map[uint32][]*PlayerInput
    
    // 玩家管理
    players      map[uint64]*FramePlayer
    playerOrder  []uint64  // 玩家顺序（确定性）
    
    // 定时器
    ticker       *time.Ticker
}

type FramePlayer struct {
    ID           uint64
    Ready        bool
    LastInputFrame uint32
    InputBuffer  []*PlayerInput
}

type PlayerInput struct {
    PlayerID  uint64
    FrameNum  uint32
    InputData []byte
    Checksum  uint32  // 校验和（检测不同步）
}

type Frame struct {
    FrameNum uint32
    Inputs   []*PlayerInput
}

func NewFrameSyncServer(frameRate int) *FrameSyncServer {
    return &FrameSyncServer{
        frameRate:    frameRate,
        frameDuration: time.Second / time.Duration(frameRate),
        frameInputs:  make(map[uint32][]*PlayerInput),
        players:      make(map[uint64]*FramePlayer),
    }
}

// 启动帧同步
func (s *FrameSyncServer) Start() {
    s.ticker = time.NewTicker(s.frameDuration)
    go func() {
        for range s.ticker.C {
            s.tick()
        }
    }()
}

// 每帧处理
func (s *FrameSyncServer) tick() {
    // 1. 收集当前帧的所有玩家输入
    inputs := s.collectInputs()
    
    // 2. 如果有玩家没输入，使用空输入
    for _, player := range s.players {
        if !s.hasInput(player.ID, s.currentFrame) {
            inputs = append(inputs, &PlayerInput{
                PlayerID: player.ID,
                FrameNum: s.currentFrame,
                InputData: []byte{},
            })
        }
    }
    
    // 3. 广播帧数据给所有玩家
    frame := &Frame{
        FrameNum: s.currentFrame,
        Inputs:   inputs,
    }
    s.broadcastFrame(frame)
    
    // 4. 进入下一帧
    s.currentFrame++
}

// 收集玩家输入
func (s *FrameSyncServer) collectInputs() []*PlayerInput {
    var inputs []*PlayerInput
    for _, player := range s.players {
        for _, input := range player.InputBuffer {
            if input.FrameNum == s.currentFrame {
                inputs = append(inputs, input)
            }
        }
    }
    return inputs
}

// 检查玩家是否有输入
func (s *FrameSyncServer) hasInput(playerID uint64, frameNum uint32) bool {
    player, ok := s.players[playerID]
    if !ok {
        return false
    }
    return player.LastInputFrame >= frameNum
}

// 广播帧数据
func (s *FrameSyncServer) broadcastFrame(frame *Frame) {
    data := s.encodeFrame(frame)
    for _, player := range s.players {
        player.conn.Send(data)
    }
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

### 3.2 AOI 详细实现

```go
// AOI（Area of Interest）完整实现
type AOIManager struct {
    gridWidth  int           // 网格宽度
    gridHeight int           // 网格高度
    grids      sync.Map      // 网格ID -> Grid
    entityGrid sync.Map      // 实体ID -> 网格ID
}

type Grid struct {
    ID       int
    Entities map[uint64]*Entity
    Mu       sync.RWMutex
}

type Entity struct {
    ID       uint64
    X, Y     float64
    GridID   int
}

func NewAOIManager(gridWidth, gridHeight int) *AOIManager {
    return &AOIManager{
        gridWidth:  gridWidth,
        gridHeight: gridHeight,
    }
}

// 计算实体所在的网格ID
func (m *AOIManager) getGridID(x, y float64) int {
    gridX := int(x) / m.gridWidth
    gridY := int(y) / m.gridHeight
    return gridX*10000 + gridY
}

// 获取九宫格范围内的所有实体
func (m *AOIManager) GetNearbyEntities(x, y float64, radius float64) []*Entity {
    gridID := m.getGridID(x, y)
    gridX := gridID / 10000
    gridY := gridID % 10000
    
    var entities []*Entity
    for dx := -1; dx <= 1; dx++ {
        for dy := -1; dy <= 1; dy++ {
            nearbyGridID := (gridX+dx)*10000 + (gridY+dy)
            if grid, ok := m.grids.Load(nearbyGridID); ok {
                g := grid.(*Grid)
                g.Mu.RLock()
                for _, entity := range g.Entities {
                    // 距离过滤
                    dist := math.Sqrt(math.Pow(entity.X-x, 2) + math.Pow(entity.Y-y, 2))
                    if dist <= radius {
                        entities = append(entities, entity)
                    }
                }
                g.Mu.RUnlock()
            }
        }
    }
    return entities
}

// 实体移动
func (m *AOIManager) MoveEntity(entity *Entity, newX, newY float64) (enterGrid, leaveGrid []*Entity) {
    oldGridID := entity.GridID
    newGridID := m.getGridID(newX, newY)
    
    if oldGridID == newGridID {
        // 在同一个网格内移动
        entity.X = newX
        entity.Y = newY
        return nil, nil
    }
    
    // 离开旧网格
    m.leaveGrid(entity, oldGridID)
    
    // 进入新网格
    m.enterGrid(entity, newGridID)
    
    entity.X = newX
    entity.Y = newY
    entity.GridID = newGridID
    
    return
}

func (m *AOIManager) leaveGrid(entity *Entity, gridID int) {
    m.entityGrid.Delete(entity.ID)
    
    if grid, ok := m.grids.Load(gridID); ok {
        g := grid.(*Grid)
        g.Mu.Lock()
        delete(g.Entities, entity.ID)
        g.Mu.Unlock()
    }
}

func (m *AOIManager) enterGrid(entity *Entity, gridID int) {
    m.entityGrid.Store(entity.ID, gridID)
    
    // 获取或创建网格
    grid, _ := m.grids.LoadOrStore(gridID, &Grid{
        ID:       gridID,
        Entities: make(map[uint64]*Entity),
    })
    g := grid.(*Grid)
    g.Mu.Lock()
    g.Entities[entity.ID] = entity
    g.Mu.Unlock()
}
```

### 3.3 实体状态管理

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

### 3.4 实体组件系统（ECS）

```go
// 实体组件系统（Entity Component System）
type Entity struct {
    ID         uint64
    Components map[string]IComponent
}

type IComponent interface {
    GetType() string
}

// 位置组件
type PositionComponent struct {
    X, Y, Z float64
}

func (c *PositionComponent) GetType() string {
    return "position"
}

// 移动组件
type MovementComponent struct {
    Speed     float64
    Direction float64
    IsMoving  bool
}

func (c *MovementComponent) GetType() string {
    return "movement"
}

// 生命值组件
type HealthComponent struct {
    HP      int
    MaxHP   int
    IsAlive bool
}

func (c *HealthComponent) GetType() string {
    return "health"
}

// 系统接口
type ISystem interface {
    Update(entities []*Entity, dt float64)
}

// 移动系统
type MovementSystem struct{}

func (s *MovementSystem) Update(entities []*Entity, dt float64) {
    for _, entity := range entities {
        pos, ok := entity.Components["position"].(*PositionComponent)
        if !ok {
            continue
        }
        
        mov, ok := entity.Components["movement"].(*MovementComponent)
        if !ok || !mov.IsMoving {
            continue
        }
        
        // 更新位置
        pos.X += math.Cos(mov.Direction) * mov.Speed * dt
        pos.Y += math.Sin(mov.Direction) * mov.Speed * dt
    }
}

// 战斗系统
type BattleSystem struct{}

func (s *BattleSystem) Update(entities []*Entity, dt float64) {
    // 检查碰撞
    // 计算伤害
    // 更新生命值
    // 处理死亡
}
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

### 4.2 登录流程详细实现

```go
// 登录服务实现
type LoginServer struct {
    sessionMgr   *SessionManager
    db           *gorm.DB
    redis        *redis.Client
    config       *Config
}

type LoginRequest struct {
    Account  string `json:"account"`
    Password string `json:"password"`
    DeviceID string `json:"device_id"`
    Platform int    `json:"platform"` // 1=iOS, 2=Android, 3=Web
}

type LoginResponse struct {
    Code      int    `json:"code"`
    Token     string `json:"token"`
    PlayerID  uint64 `json:"player_id"`
    ServerURL string `json:"server_url"`
}

func (s *LoginServer) Login(req *LoginRequest) (*LoginResponse, error) {
    // 1. 参数校验
    if req.Account == "" || req.Password == "" {
        return &LoginResponse{Code: 400, Token: ""}, errors.New("参数错误")
    }
    
    // 2. 查询玩家
    var player Player
    result := s.db.Where("account = ?", req.Account).First(&player)
    if result.Error != nil {
        // 新玩家注册
        player = Player{
            Account:  req.Account,
            Password: hashPassword(req.Password),
            Nickname: fmt.Sprintf("玩家%d", time.Now().UnixNano()%100000),
            Level:    1,
        }
        s.db.Create(&player)
    } else {
        // 验证密码
        if !verifyPassword(req.Password, player.Password) {
            return &LoginResponse{Code: 401}, errors.New("密码错误")
        }
    }
    
    // 3. 生成Token
    token, err := s.generateToken(player.ID)
    if err != nil {
        return &LoginResponse{Code: 500}, err
    }
    
    // 4. 创建会话
    session := s.sessionMgr.CreateSession(player.ID, token)
    session.IPAddress = req.DeviceID
    session.Platform = req.Platform
    
    // 5. 缓存到Redis
    sessionData, _ := json.Marshal(session)
    s.redis.Set(ctx, "session:"+token, sessionData, 24*time.Hour)
    
    return &LoginResponse{
        Code:      200,
        Token:     token,
        PlayerID:  player.ID,
        ServerURL: s.config.GameServerURL,
    }, nil
}

func (s *LoginServer) generateToken(playerID uint64) (string, error) {
    claims := jwt.MapClaims{
        "player_id": playerID,
        "exp":       time.Now().Add(24 * time.Hour).Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(s.config.JWTSecret))
}
```

### 4.3 会话管理

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

### 4.4 断线重连机制

```go
// 断线重连管理器
type ReconnectManager struct {
    sessions     map[uint64]*Session    // 玩家ID -> 会话
    pendingData  map[uint64][]*GameMessage  // 玩家ID -> 待发送消息
    mu           sync.RWMutex
    timeout      time.Duration
}

func NewReconnectManager(timeout time.Duration) *ReconnectManager {
    return &ReconnectManager{
        sessions:    make(map[uint64]*Session),
        pendingData: make(map[uint64][]*GameMessage),
        timeout:     timeout,
    }
}

// 玩家断线时调用
func (m *ReconnectManager) OnDisconnect(playerID uint64) {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    if session, ok := m.sessions[playerID]; ok {
        session.IsOnline = false
        session.DisconnectTime = time.Now()
    }
}

// 玩家重连时调用
func (m *ReconnectManager) OnReconnect(playerID uint64, conn net.Conn) (*Session, error) {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    session, ok := m.sessions[playerID]
    if !ok {
        return nil, errors.New("会话不存在")
    }
    
    // 检查是否超时
    if time.Since(session.DisconnectTime) > m.timeout {
        delete(m.sessions, playerID)
        return nil, errors.New("重连超时")
    }
    
    // 恢复会话
    session.IsOnline = true
    session.Conn = conn
    
    // 发送待处理的消息
    if pending, ok := m.pendingData[playerID]; ok {
        for _, msg := range pending {
            conn.Write(msg.Encode())
        }
        delete(m.pendingData, playerID)
    }
    
    return session, nil
}

// 缓存玩家消息（断线期间）
func (m *ReconnectManager) CacheMessage(playerID uint64, msg *GameMessage) {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    if session, ok := m.sessions[playerID]; ok && !session.IsOnline {
        m.pendingData[playerID] = append(m.pendingData[playerID], msg)
        
        // 限制缓存大小
        if len(m.pendingData[playerID]) > 1000 {
            m.pendingData[playerID] = m.pendingData[playerID][500:]
        }
    }
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

### 5.2 游戏循环详细实现

```go
// 游戏服务器主循环
type GameServer struct {
    tickRate     int
    tickDuration time.Duration
    
    // 系统
    network    *NetworkSystem
    logic      *GameLogic
    aoi        *AOIManager
    sync       *SyncSystem
    db         *DBSystem
    
    // 玩家管理
    players    map[uint64]*Player
    
    // 帧同步
    frameSync  *FrameSyncManager
    
    // 状态
    running    bool
    currentTick uint64
}

func (s *GameServer) Run() {
    s.running = true
    ticker := time.NewTicker(s.tickDuration)
    
    for s.running {
        select {
        case <-ticker.C:
            s.tick()
        case msg := <-s.network.MessageChan:
            s.handleMessage(msg)
        case input := <-s.network.InputChan:
            s.handleInput(input)
        }
    }
}

func (s *GameServer) tick() {
    startTime := time.Now()
    
    // 1. 处理玩家输入
    s.processInputs()
    
    // 2. 执行游戏逻辑
    s.logic.Update(s.players, s.tickDuration.Seconds())
    
    // 3. 更新物理
    s.updatePhysics()
    
    // 4. 计算 AOI
    s.aoi.Update()
    
    // 5. 同步状态
    s.sync.SyncToClients(s.players)
    
    // 6. 持久化（每10帧持久化一次）
    if s.currentTick%10 == 0 {
        s.db.AsyncSave(s.players)
    }
    
    // 7. 帧同步广播
    if s.frameSync != nil {
        s.frameSync.BroadcastFrame()
    }
    
    s.currentTick++
    
    // 监控：tick耗时
    duration := time.Since(startTime)
    if duration > s.tickDuration {
        log.Warn("tick耗时超标", "tick", s.currentTick, "duration", duration)
    }
}

func (s *GameServer) processInputs() {
    for playerID, inputs := range s.inputBuffer {
        player, ok := s.players[playerID]
        if !ok {
            continue
        }
        
        for _, input := range inputs {
            switch input.Type {
            case InputMove:
                s.handleMove(player, input)
            case InputAttack:
                s.handleAttack(player, input)
            case InputSkill:
                s.handleSkill(player, input)
            }
        }
    }
    s.inputBuffer = make(map[uint64][]*PlayerInput)
}
```

### 5.3 定时器管理

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

### 5.4 定时器优化实现

```go
// 优先队列定时器（更高效）
type PriorityTimerManager struct {
    timers    *PriorityQueue
    mu        sync.RWMutex
}

type TimerItem struct {
    ID        int64
    FireTime  time.Time
    Interval  time.Duration
    Repeat    bool
    Callback  func()
    Index     int  // 在堆中的位置
}

func (m *PriorityTimerManager) AddTimer(delay time.Duration, repeat bool, cb func()) int64 {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    item := &TimerItem{
        ID:       generateID(),
        FireTime: time.Now().Add(delay),
        Interval: delay,
        Repeat:   repeat,
        Callback: cb,
    }
    
    heap.Push(m.timers, item)
    return item.ID
}

func (m *PriorityTimerManager) Update() {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    now := time.Now()
    
    for m.timers.Len() > 0 {
        item := m.timers.Peek().(*TimerItem)
        
        if item.FireTime.After(now) {
            break
        }
        
        // 触发定时器
        heap.Pop(m.timers)
        go item.Callback()
        
        // 重复定时器重新入队
        if item.Repeat {
            item.FireTime = now.Add(item.Interval)
            heap.Push(m.timers, item)
        }
    }
}

// 优先队列实现
type PriorityQueue []*TimerItem

func (pq PriorityQueue) Len() int { return len(pq) }

func (pq PriorityQueue) Less(i, j int) bool {
    return pq[i].FireTime.Before(pq[j].FireTime)
}

func (pq PriorityQueue) Swap(i, j int) {
    pq[i], pq[j] = pq[j], pq[i]
    pq[i].Index = i
    pq[j].Index = j
}

func (pq *PriorityQueue) Push(x interface{}) {
    n := len(*pq)
    item := x.(*TimerItem)
    item.Index = n
    *pq = append(*pq, item)
}

func (pq *PriorityQueue) Pop() interface{} {
    old := *pq
    n := len(old)
    item := old[n-1]
    old[n-1] = nil
    item.Index = -1
    *pq = old[0 : n-1]
    return item
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

### 6.4 缓存高级策略

```go
// 缓存管理器高级实现
type AdvancedCacheManager struct {
    redis      *redis.Client
    db         *gorm.DB
    
    // 写入队列
    writeChan  chan *Player
    
    // 本地缓存
    localCache sync.Map
    cacheTTL   time.Duration
    
    // 统计
    hitCount   int64
    missCount  int64
}

func NewAdvancedCacheManager(redis *redis.Client, db *gorm.DB) *AdvancedCacheManager {
    m := &AdvancedCacheManager{
        redis:     redis,
        db:        db,
        writeChan: make(chan *Player, 10000),
        cacheTTL:  30 * time.Minute,
    }
    
    // 启动异步写入协程
    go m.asyncWriteLoop()
    
    return m
}

// 读取玩家数据（带本地缓存）
func (m *AdvancedCacheManager) GetPlayer(playerID uint64) (*Player, error) {
    // 1. 检查本地缓存
    if cached, ok := m.localCache.Load(playerID); ok {
        atomic.AddInt64(&m.hitCount, 1)
        return cached.(*Player), nil
    }
    
    // 2. 检查 Redis
    key := fmt.Sprintf("player:%d", playerID)
    data, err := m.redis.Get(ctx, key).Bytes()
    if err == nil {
        var player Player
        json.Unmarshal(data, &player)
        
        // 写入本地缓存
        m.localCache.Store(playerID, &player)
        atomic.AddInt64(&m.hitCount, 1)
        return &player, nil
    }
    
    // 3. 查询数据库
    var player Player
    result := m.db.Where("id = ?", playerID).First(&player)
    if result.Error != nil {
        atomic.AddInt64(&m.missCount, 1)
        return nil, result.Error
    }
    
    // 4. 写入 Redis
    data, _ = json.Marshal(player)
    m.redis.Set(ctx, key, data, m.cacheTTL)
    
    // 5. 写入本地缓存
    m.localCache.Store(playerID, &player)
    
    atomic.AddInt64(&m.missCount, 1)
    return &player, nil
}

// 保存玩家数据（异步写入）
func (m *AdvancedCacheManager) SavePlayer(player *Player) error {
    // 1. 更新本地缓存
    m.localCache.Store(player.ID, player)
    
    // 2. 更新 Redis
    key := fmt.Sprintf("player:%d", player.ID)
    data, _ := json.Marshal(player)
    m.redis.Set(ctx, key, data, m.cacheTTL)
    
    // 3. 加入异步写入队列
    select {
    case m.writeChan <- player:
    default:
        // 队列满，直接写入
        m.db.Save(player)
    }
    
    return nil
}

// 异步写入循环
func (m *AdvancedCacheManager) asyncWriteLoop() {
    ticker := time.NewTicker(time.Second)
    batch := make([]*Player, 0, 100)
    
    for {
        select {
        case player := <-m.writeChan:
            batch = append(batch, player)
            if len(batch) >= 100 {
                m.batchSave(batch)
                batch = batch[:0]
            }
        case <-ticker.C:
            if len(batch) > 0 {
                m.batchSave(batch)
                batch = batch[:0]
            }
        }
    }
}

// 批量保存
func (m *AdvancedCacheManager) batchSave(players []*Player) {
    m.db.SaveInBatches(players, 100)
}

// 获取缓存命中率
func (m *AdvancedCacheManager) GetHitRate() float64 {
    total := atomic.LoadInt64(&m.hitCount) + atomic.LoadInt64(&m.missCount)
    if total == 0 {
        return 0
    }
    return float64(atomic.LoadInt64(&m.hitCount)) / float64(total)
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

### 7.2 反作弊详细实现

```go
// 反作弊系统
type AntiCheatSystem struct {
    // 规则配置
    rules []AntiCheatRule
    
    // 玩家行为记录
    playerRecords map[uint64]*PlayerCheatRecord
    
    // 处罚记录
    punishRecords map[uint64]*PunishRecord
}

type AntiCheatRule struct {
    Name       string
    Type       CheatType
    Threshold  float64
    Action     PunishAction
    Weight     int  // 权重（多次触发才处罚）
}

type CheatType int
const (
    CheatSpeedHack CheatType = iota  // 加速挂
    CheatTeleport                      // 瞬移挂
    CheatAutoAttack                    // 自动脚本
    CheatMemoryHack                    // 内存修改
    CheatProtocolHack                  // 协议篡改
)

type PunishAction int
const (
    PunishNone PunishAction = iota
    PunishWarning                       // 警告
    PunishKick                          // 踢出
    PunishBan1Day                       // 封号1天
    PunishBan7Day                       // 封号7天
    PunishBanForever                    // 永久封号
)

type PlayerCheatRecord struct {
    PlayerID    uint64
    Violations  map[CheatType]int  // 违规次数
    LastCheck   time.Time
    TrustScore  float64           // 信任分（0-100）
}

// 检测移动作弊
func (s *AntiCheatSystem) CheckMoveCheat(playerID uint64, move *MoveRequest) PunishAction {
    record := s.getOrCreateRecord(playerID)
    
    // 1. 速度检测
    speed := calculateSpeed(move)
    if speed > MaxAllowedSpeed {
        record.Violations[CheatSpeedHack]++
        record.TrustScore -= 10
        
        // 根据违规次数决定处罚
        if record.Violations[CheatSpeedHack] >= 3 {
            return PunishBan1Day
        }
        return PunishWarning
    }
    
    // 2. 瞬移检测
    if move.Distance > MaxTeleportDistance {
        record.Violations[CheatTeleport]++
        record.TrustScore -= 20
        
        if record.Violations[CheatTeleport] >= 2 {
            return PunishKick
        }
        return PunishWarning
    }
    
    // 3. 信任分过低
    if record.TrustScore < 20 {
        return PunishKick
    }
    
    return PunishNone
}

// 检测自动脚本
func (s *AntiCheatSystem) CheckAutoAttack(playerID uint64) PunishAction {
    record := s.getOrCreateRecord(playerID)
    
    // 分析攻击间隔
    intervals := record.AttackIntervals
    if len(intervals) < 10 {
        return PunishNone
    }
    
    // 计算标准差（太规律可能是脚本）
    mean := calculateMean(intervals)
    stddev := calculateStdDev(intervals, mean)
    
    if stddev < 1.0 {  // 标准差太小，太规律
        record.Violations[CheatAutoAttack]++
        record.TrustScore -= 15
        
        if record.Violations[CheatAutoAttack] >= 5 {
            return PunishBan7Day
        }
        return PunishWarning
    }
    
    return PunishNone
}
```

### 7.3 通信加密

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

### 7.4 反作弊策略

| 作弊类型 | 检测方法 | 处理方式 |
|---------|---------|---------|
| 加速挂 | 时间戳校验、速度检测 | 警告、封号 |
| 透视挂 | 服务端控制视野 | 服务端裁决 |
| 自动脚本 | 行为模式分析 | 验证码、封号 |
| 内存修改 | 关键数据校验 | 数据回滚 |
| 协议篡改 | 签名验证 | 断开连接 |

### 7.5 协议签名验证

```go
// 协议签名验证
type ProtocolSigner struct {
    secretKey []byte
}

func (s *ProtocolSigner) Sign(msg *GameMessage) []byte {
    // 1. 生成签名字符串
    signStr := fmt.Sprintf("%d:%d:%s", msg.MsgID, msg.Timestamp, string(msg.Payload))
    
    // 2. 计算 HMAC-SHA256
    mac := hmac.New(sha256.New, s.secretKey)
    mac.Write([]byte(signStr))
    
    return mac.Sum(nil)
}

func (s *ProtocolSigner) Verify(msg *GameMessage) bool {
    // 1. 获取签名
    expected := s.Sign(msg)
    
    // 2. 比较签名
    return hmac.Equal(msg.Signature, expected)
}

// 消息包装
type SignedMessage struct {
    *GameMessage
    Signature []byte
}

func (m *SignedMessage) Encode() []byte {
    // 编码消息 + 签名
    data := m.GameMessage.Encode()
    return append(data, m.Signature...)
}

func (m *SignedMessage) Decode(data []byte) error {
    // 解码消息 + 签名
    msgLen := len(data) - 32  // SHA256 输出 32 字节
    if msgLen <= 0 {
        return errors.New("消息太短")
    }
    
    m.GameMessage = &GameMessage{}
    m.GameMessage.Decode(data[:msgLen])
    m.Signature = data[msgLen:]
    
    return nil
}
```

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

### 8.2 压力测试工具

```go
// 完整的压力测试框架
type StressTestSuite struct {
    serverURL string
    clients   []*StressClient
    stats     *TestStats
}

type TestStats struct {
    TotalConnections  int64
    ActiveConnections int64
    TotalMessages     int64
    FailedMessages    int64
    AvgResponseTime   float64
    MaxResponseTime   float64
    StartTime         time.Time
}

type StressClient struct {
    id         int
    conn       net.Conn
    stats      *TestStats
    connected  bool
    msgCount   int64
}

func NewStressTestSuite(serverURL string, clientCount int) *StressTestSuite {
    return &StressTestSuite{
        serverURL: serverURL,
        clients:   make([]*StressClient, clientCount),
        stats:     &TestStats{StartTime: time.Now()},
    }
}

// 运行压力测试
func (s *StressTestSuite) Run(duration time.Duration) *TestStats {
    var wg sync.WaitGroup
    
    // 启动所有客户端
    for i := 0; i < len(s.clients); i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            s.runClient(id, duration)
        }(i)
    }
    
    // 等待测试完成
    wg.Wait()
    
    return s.stats
}

func (s *StressTestSuite) runClient(id int, duration time.Duration) {
    // 1. 建立连接
    conn, err := net.Dial("tcp", s.serverURL)
    if err != nil {
        log.Error("连接失败", "id", id, "error", err)
        return
    }
    defer conn.Close()
    
    atomic.AddInt64(&s.stats.TotalConnections, 1)
    atomic.AddInt64(&s.stats.ActiveConnections, 1)
    
    // 2. 模拟玩家行为
    deadline := time.Now().Add(duration)
    ticker := time.NewTicker(100 * time.Millisecond)  // 10Hz
    
    for time.Now().Before(deadline) {
        select {
        case <-ticker.C:
            // 发送移动消息
            startTime := time.Now()
            msg := s.createMoveMessage(id)
            conn.Write(msg)
            
            // 等待响应
            resp := make([]byte, 1024)
            conn.Read(resp)
            
            responseTime := time.Since(startTime).Seconds()
            s.updateStats(responseTime)
            
        case <-time.After(time.Second):
            // 发送聊天消息
            msg := s.createChatMessage(id, "Hello!")
            conn.Write(msg)
        }
    }
    
    atomic.AddInt64(&s.stats.ActiveConnections, -1)
}

func (s *StressTestSuite) updateStats(responseTime float64) {
    atomic.AddInt64(&s.stats.TotalMessages, 1)
    
    // 更新平均响应时间（滑动窗口）
    for {
        old := atomic.LoadUint64((*uint64)(unsafe.Pointer(&s.stats.AvgResponseTime)))
        newAvg := responseTime
        if atomic.CompareAndSwapUint64(
            (*uint64)(unsafe.Pointer(&s.stats.AvgResponseTime)),
            old,
            *(*uint64)(unsafe.Pointer(&newAvg)),
        ) {
            break
        }
    }
}
```

### 8.3 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 响应时间 | < 100ms | P99 延迟 |
| 吞吐量 | > 10000 QPS | 每秒请求数 |
| 在线人数 | > 5000 | 单服承载 |
| CPU 使用率 | < 70% | 峰值 |
| 内存使用率 | < 80% | 峰值 |

### 8.4 性能优化策略

```go
// 性能优化工具
type PerformanceOptimizer struct {
    // 连接池
    connPool *sync.Pool
    
    // 对象池
    msgPool *sync.Pool
    
    // 批量处理
    batchSize int
    batchChan chan []*GameMessage
}

func NewPerformanceOptimizer() *PerformanceOptimizer {
    return &PerformanceOptimizer{
        connPool: &sync.Pool{
            New: func() interface{} {
                return &net.Conn{}
            },
        },
        msgPool: &sync.Pool{
            New: func() interface{} {
                return &GameMessage{
                    Payload: make([]byte, 0, 256),
                }
            },
        },
        batchSize: 100,
        batchChan: make(chan []*GameMessage, 1000),
    }
}

// 消息合并发送
func (p *PerformanceOptimizer) BatchSend(conn net.Conn, msgs []*GameMessage) {
    // 1. 编码所有消息
    var buf bytes.Buffer
    for _, msg := range msgs {
        data := msg.Encode()
        buf.Write(data)
    }
    
    // 2. 一次性发送
    conn.Write(buf.Bytes())
}

// 消息优先级队列
type PriorityMessageQueue struct {
    high   chan *GameMessage
    normal chan *GameMessage
    low    chan *GameMessage
}

func (q *PriorityMessageQueue) Send(msg *GameMessage) {
    switch msg.Priority {
    case PriorityHigh:
        select {
        case q.high <- msg:
        default:
            // 高优先级队列满，丢弃低优先级消息
        }
    case PriorityNormal:
        q.normal <- msg
    case PriorityLow:
        select {
        case q.low <- msg:
        default:
            // 低优先级队列满，丢弃
        }
    }
}
```

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

### 9.3 完整监控体系

```go
// 完整的监控系统
type MonitorSystem struct {
    // Prometheus 指标
    playerOnline   prometheus.Gauge
    requestTotal   *prometheus.CounterVec
    requestDuration *prometheus.HistogramVec
    errorTotal     *prometheus.CounterVec
    
    // 告警规则
    alerts []AlertRule
    
    // 日志
    logger *zap.Logger
}

type AlertRule struct {
    Name      string
    Condition string
    Threshold float64
    Duration  time.Duration
    Action    func()
}

func NewMonitorSystem() *MonitorSystem {
    m := &MonitorSystem{
        playerOnline: prometheus.NewGauge(prometheus.GaugeOpts{
            Name: "game_player_online",
            Help: "Current online players",
        }),
        requestTotal: prometheus.NewCounterVec(
            prometheus.CounterOpts{
                Name: "game_request_total",
                Help: "Total game requests",
            },
            []string{"method", "status"},
        ),
        requestDuration: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Name:    "game_request_duration_seconds",
                Help:    "Request duration in seconds",
                Buckets: prometheus.DefBuckets,
            },
            []string{"method"},
        ),
        errorTotal: prometheus.NewCounterVec(
            prometheus.CounterOpts{
                Name: "game_error_total",
                Help: "Total game errors",
            },
            []string{"type"},
        ),
    }
    
    // 注册指标
    prometheus.MustRegister(m.playerOnline)
    prometheus.MustRegister(m.requestTotal)
    prometheus.MustRegister(m.requestDuration)
    prometheus.MustRegister(m.errorTotal)
    
    return m
}

// 记录请求
func (m *MonitorSystem) RecordRequest(method string, status string, duration float64) {
    m.requestTotal.WithLabelValues(method, status).Inc()
    m.requestDuration.WithLabelValues(method).Observe(duration)
}

// 记录错误
func (m *MonitorSystem) RecordError(errorType string) {
    m.errorTotal.WithLabelValues(errorType).Inc()
}

// 检查告警
func (m *MonitorSystem) CheckAlerts() {
    for _, rule := range m.alerts {
        if m.evaluateCondition(rule) {
            go rule.Action()
        }
    }
}
```

### 9.4 告警规则配置

```yaml
# alerts.yaml
groups:
  - name: game_server
    rules:
      # 在线人数告警
      - alert: HighPlayerCount
        expr: game_player_online > 5000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "在线人数过高"
          
      # 错误率告警
      - alert: HighErrorRate
        expr: rate(game_error_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "错误率过高"
          
      # 响应时间告警
      - alert: HighResponseTime
        expr: histogram_quantile(0.99, rate(game_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99响应时间过长"
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

### 10.2 跨服架构详细设计

```go
// 跨服服务器架构
type CrossServerManager struct {
    // 本地服务器
    localServer *GameServer
    
    // 跨服服务器连接
    crossServers map[string]*CrossServerConnection
    
    // 跨服功能
    matchMaker   *CrossMatchMaker
    rankManager  *CrossRankManager
    guildManager *CrossGuildManager
}

type CrossServerConnection struct {
    ServerID   string
    Address    string
    Conn       net.Conn
    LastActive time.Time
    Status     ServerStatus
}

// 跨服匹配
type CrossMatchMaker struct {
    // 匹配队列
    matchQueue chan *MatchRequest
    
    // 匹配规则
    rules []MatchRule
    
    // 跨服连接
    crossConns map[string]*CrossServerConnection
}

type MatchRequest struct {
    PlayerID   uint64
    ServerID   string
    Rank       int
    WaitTime   time.Duration
    MatchType  MatchType
}

// 跨服排行榜
type CrossRankManager struct {
    // 排行榜数据
    ranks map[RankType]*RankList
    
    // 跨服同步
    syncChan chan *RankUpdate
}

// 跨服排行榜同步
func (m *CrossRankManager) SyncRank(update *RankUpdate) {
    // 1. 更新本地排行榜
    m.updateLocalRank(update)
    
    // 2. 广播到其他服务器
    for serverID, conn := range m.crossConns {
        if serverID != update.ServerID {
            conn.Send(update.Encode())
        }
    }
}
```

### 10.3 合服流程

```
1. 数据迁移
   ├── 玩家数据合并
   │   ├── 重名玩家处理（加后缀）
   │   ├── 账号冲突处理
   │   └── 数据完整性校验
   ├── 公会数据合并
   │   ├── 重名公会处理
   │   ├── 公会成员合并
   │   └── 公会资产合并
   └── 排行榜重建
       ├── 清空旧排行榜
       ├── 重新计算排名
       └── 发放排行榜奖励

2. 冲突处理
   ├── 重名玩家处理
   │   ├── 加服务器后缀（如：玩家1_2服）
   │   ├── 发放改名卡
   │   └── 通知玩家改名
   ├── 公会名冲突处理
   │   ├── 加服务器后缀
   │   ├── 发放公会改名卡
   │   └── 通知公会改名
   └── 资产合并规则
       ├── 货币取最大值
       ├── 装备保留最强
       └── 道具合并数量

3. 通知与补偿
   ├── 提前通知玩家
   │   ├── 游戏内公告
   │   ├── 邮件通知
   │   └── 客服通知
   ├── 合服补偿发放
   │   ├── 钻石补偿
   │   ├── 道具补偿
   │   └── 特殊称号
   └── FAQ 与客服支持
       ├── 合服说明文档
       ├── 常见问题解答
       └── 客服热线
```

### 10.4 合服实现

```go
// 合服管理器
type MergeServerManager struct {
    // 源服务器列表
    sourceServers []string
    
    // 目标服务器
    targetServer string
    
    // 合服进度
    progress *MergeProgress
    
    // 数据迁移器
    migrator *DataMigrator
}

type MergeProgress struct {
    Phase     string
    Total     int
    Completed int
    StartTime time.Time
    Status    string
}

// 合服流程
func (m *MergeServerManager) Merge() error {
    // 1. 预处理
    if err := m.preProcess(); err != nil {
        return fmt.Errorf("预处理失败: %v", err)
    }
    
    // 2. 数据迁移
    if err := m.migrateData(); err != nil {
        return fmt.Errorf("数据迁移失败: %v", err)
    }
    
    // 3. 冲突处理
    if err := m.resolveConflicts(); err != nil {
        return fmt.Errorf("冲突处理失败: %v", err)
    }
    
    // 4. 后处理
    if err := m.postProcess(); err != nil {
        return fmt.Errorf("后处理失败: %v", err)
    }
    
    // 5. 发放补偿
    m发放补偿()
    
    return nil
}

func (m *MergeServerManager) migrateData() error {
    for _, serverID := range m.sourceServers {
        // 迁移玩家数据
        if err := m.migratePlayers(serverID); err != nil {
            return err
        }
        
        // 迁移公会数据
        if err := m.migrateGuilds(serverID); err != nil {
            return err
        }
        
        // 迁移排行榜数据
        if err := m.migrateRanks(serverID); err != nil {
            return err
        }
    }
    return nil
}
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
9. **分布式架构** → 服务拆分、跨服、合服
