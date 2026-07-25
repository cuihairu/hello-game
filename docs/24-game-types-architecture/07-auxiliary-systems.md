# 辅助系统

辅助系统是网络游戏的"管家团队"——它们不直接参与游戏战斗，但管理着玩家从登录到退出的每一个环节。匹配、大厅、聊天、好友、成就、排行榜、支付……这些系统看似独立，实际上紧密交织，共同构成了玩家体验的基石。本章基于《网络游戏核心技术与实战》（中嶋谦互）的框架，系统讲解在线游戏的各类辅助系统设计与实现。

## 1. 辅助系统全景

### 1.1 系统分类

辅助系统可以按功能分为四大类：

| 类别 | 系统 | 核心职责 |
|------|------|---------|
| 社交连接 | 匹配、大厅、好友、黑名单、聊天、语音 | 将玩家连接在一起 |
| 数据管理 | 成就、存储、排行榜、玩家状态 | 记录和展示玩家成长 |
| 运营支撑 | 客户端更新、新闻发布、敏感词过滤、数据浏览 | 保障游戏运营 |
| 商业变现 | 支付认证、虚拟货币、储值卡 | 支撑商业模式 |

### 1.2 系统间关系

```
                          ┌──────────────┐
                          │   登录网关    │
                          └──────┬───────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
              ▼                  ▼                   ▼
        ┌──────────┐      ┌──────────┐        ┌──────────┐
        │  游戏大厅  │      │ 匹配系统  │        │ 锁服务器  │
        └─────┬────┘      └─────┬────┘        └──────────┘
              │                  │
     ┌────────┼────────┐        │
     │        │        │        │
     ▼        ▼        ▼        ▼
 ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
 │ 聊天  │ │好友  │ │状态  │ │对战  │
 │ 系统  │ │列表  │ │系统  │ │服务器│
 └──────┘ └──────┘ └──────┘ └──────┘
              │
     ┌────────┼────────┐
     │        │        │
     ▼        ▼        ▼
 ┌──────┐ ┌──────┐ ┌──────┐
 │成就  │ │排行  │ │邮箱  │
 │系统  │ │榜    │ │系统  │
 └──────┘ └──────┘ └──────┘
```

## 2. 匹配系统（Matchmaking）

匹配系统负责将水平相近、条件匹配的玩家组合在一起。好的匹配系统能让玩家享受势均力敌的对局，坏的匹配系统则会让玩家感到沮丧。

### 2.1 匹配算法

#### 2.1.1 Elo 评分系统

Elo 系统是最经典的玩家评分算法，广泛用于国际象棋和各类竞技游戏。

```go
// Elo 评分计算
// K 值决定每场比赛的分数波动幅度，K越大波动越大
const DefaultK = 32

// ExpectedScore 计算 A 对 B 的期望胜率
// 公式: 1 / (1 + 10^((Rb - Ra) / 400))
func ExpectedScore(ratingA, ratingB float64) float64 {
    return 1.0 / (1.0 + math.Pow(10, (ratingB-ratingA)/400.0))
}

// UpdateRatings 根据比赛结果更新双方评分
// actualA: A 的实际得分 (1=胜, 0.5=平, 0=负)
func UpdateRatings(ratingA, ratingB float64, k float64, actualA float64) (newA, newB float64) {
    expA := ExpectedScore(ratingA, ratingB)
    expB := ExpectedScore(ratingB, ratingA)
    
    newA = ratingA + k*(actualA-expA)
    newB = ratingB + k*(1.0-actualA-expB)
    
    // 设置下限，防止分数为负
    if newA < 100 { newA = 100 }
    if newB < 100 { newB = 100 }
    
    return newA, newB
}

// MatchResult 比赛结果
type MatchResult struct {
    WinnerID    uint64
    LoserID     uint64
    IsDraw      bool
    WinnerScore float64
    LoserScore  float64
}

// CalculateNewRatings 根据比赛结果计算新评分
func CalculateNewRatings(winner, loser Player, k float64, isDraw bool) (float64, float64) {
    if isDraw {
        return UpdateRatings(winner.Rating, loser.Rating, k, 0.5)
    }
    newW, newL := UpdateRatings(winner.Rating, loser.Rating, k, 1.0)
    return newW, newL
}
```

#### 2.1.2 Glicko-2 评分系统

Glicko-2 在 Elo 基础上引入了评分偏差（RD）和波动性（σ），更精确地反映玩家的真实水平。

```go
// Glicko-2 评分系统
type Glicko2Rating struct {
    Rating       float64  // μ (mu): 隐藏评分，默认 1500→ 转换后 μ=0
    Deviation    float64  // φ (phi): 评分偏差，表示评分的不确定性
    Volatility   float64  // σ (sigma): 评分波动性
    LastPlayed   time.Time
}

// 默认参数
const (
    DefaultRating    = 1500.0
    DefaultDeviation = 350.0  // 新玩家偏差大
    DefaultVolatility = 0.06
    Tau              = 0.5    // 系统常数
    Epsilon          = 0.000001
)

// NewPlayer 创建新玩家的 Glicko-2 评分
func NewPlayer() *Glicko2Rating {
    return &Glicko2Rating{
        Rating:     DefaultRating,
        Deviation:  DefaultDeviation,
        Volatility: DefaultVolatility,
        LastPlayed: time.Now(),
    }
}

// Glicko2Update Glicko-2 评分更新（简化版）
func Glicko2Update(player *Glicko2Rating, opponents []MatchOutcome) {
    // 1. 根据时间流逝更新偏差
    daysSinceLast := time.Since(player.LastPlayed).Hours() / 24.0
    phi := math.Sqrt(player.Deviation*player.Deviation + 
        float64(int(daysSinceLast/46))*1.0*1.0*25.0)
    
    // 2. 计算预估评分
    // ... (使用 Glicko-2 的 g 函数和 E 函数)
    
    // 3. 计算新的偏差和波动性
    // ... (通过迭代算法求解)
    
    // 4. 更新评分
    player.Deviation = phi
    player.LastPlayed = time.Now()
}

// MatchOutcome 比赛结果
type MatchOutcome struct {
    OpponentRating float64
    OpponentRD     float64
    Score          float64  // 1=胜, 0.5=平, 0=负
}
```

#### 2.1.3 匹配池设计

```go
// MatchQueue 匹配队列
type MatchQueue struct {
    mu          sync.RWMutex
    players     []*MatchRequest
    maxWaitTime time.Duration
    ratingRange float64  // 初始评分范围
    expandRate  float64  // 每秒扩展的评分范围
}

// MatchRequest 匹配请求
type MatchRequest struct {
    PlayerID   uint64
    Rating     float64
    QueueTime  time.Time
    GameMode   string
    Region     string
    Status     int  // 0=等待中, 1=匹配成功, 2=超时
}

// TryMatch 尝试匹配一对玩家
// 核心思想：等待越久，评分范围扩展越大
func (q *MatchQueue) TryMatch() []*MatchRequest {
    q.mu.Lock()
    defer q.mu.Unlock()
    
    if len(q.players) < 2 {
        return nil
    }
    
    now := time.Now()
    
    for i := 0; i < len(q.players); i++ {
        p1 := q.players[i]
        wait1 := now.Sub(p1.QueueTime)
        
        // 动态扩展评分范围：范围 = 初始范围 + 等待时间(秒) × 扩展速率
        range1 := q.ratingRange + wait1.Seconds()*q.expandRate
        
        for j := i + 1; j < len(q.players); j++ {
            p2 := q.players[j]
            wait2 := now.Sub(p2.QueueTime)
            range2 := q.ratingRange + wait2.Seconds()*q.expandRate
            
            // 使用双方中较小的范围（先等到的玩家）
            effectiveRange := math.Min(range1, range2)
            
            if math.Abs(p1.Rating-p2.Rating) <= effectiveRange &&
                p1.GameMode == p2.GameMode && p1.Region == p2.Region {
                // 匹配成功，移出队列
                q.players = append(q.players[:i], q.players[i+1:]...)
                q.players = append(q.players[:j-1], q.players[j:]...)
                return []*MatchRequest{p1, p2}
            }
        }
    }
    
    return nil
}

// 匹配超时处理
func (q *MatchQueue) HandleTimeout() {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()
    
    for range ticker.C {
        q.mu.Lock()
        now := time.Now()
        var remaining []*MatchRequest
        
        for _, req := range q.players {
            if now.Sub(req.QueueTime) > q.maxWaitTime {
                // 超时：通知客户端匹配失败
                notifyTimeout(req.PlayerID)
                continue
            }
            remaining = append(remaining, req)
        }
        q.players = remaining
        q.mu.Unlock()
    }
}
```

### 2.2 组队匹配

组队匹配比单人匹配更复杂，需要平衡队伍整体评分和单人评分。

```go
// Team 组队信息
type Team struct {
    ID       uint64
    Leader   uint64   // 队长
    Members  []*Player
    Mode     string   // 游戏模式
    Region   string
    AvgRating float64 // 队伍平均评分
}

// CalculateTeamRating 计算队伍综合评分
func CalculateTeamRating(members []*Player) float64 {
    if len(members) == 0 {
        return 0
    }
    
    // 方法1：简单平均（不推荐，容易被低分带高分）
    // sum := 0.0
    // for _, m := range members { sum += m.Rating }
    // return sum / float64(len(members))
    
    // 方法2：加权平均（推荐）
    // 低分玩家权重更高，防止"带分"
    totalWeight := 0.0
    weightedSum := 0.0
    
    for _, m := range members {
        // 使用排名作为权重，最高分权重最低
        weight := 1.0 + (float64(len(members))-float64(m.RankIndex))*0.5
        weightedSum += m.Rating * weight
        totalWeight += weight
    }
    
    return weightedSum / totalWeight
}

// TeamMatchRequest 组队匹配请求
type TeamMatchRequest struct {
    Team       *Team
    QueueTime  time.Time
    RatingRange float64
}

// MatchTeams 匹配两支队伍
func MatchTeams(teams []*TeamMatchRequest) (*Team, *Team) {
    if len(teams) < 2 {
        return nil, nil
    }
    
    for i := 0; i < len(teams); i++ {
        t1 := teams[i]
        wait1 := time.Since(t1.QueueTime).Seconds()
        
        for j := i + 1; j < len(teams); j++ {
            t2 := teams[j]
            wait2 := time.Since(t2.QueueTime).Seconds()
            
            // 队伍平均评分差在允许范围内
            ratingDiff := math.Abs(t1.Team.AvgRating-t2.Team.AvgRating)
            maxDiff := t1.RatingRange + math.Min(wait1, wait2)*5 // 每秒扩展5分
            
            if ratingDiff <= maxDiff &&
                t1.Team.Mode == t2.Team.Mode &&
                t1.Team.Region == t2.Team.Region &&
                len(t1.Team.Members) == len(t2.Team.Members) {
                return t1.Team, t2.Team
            }
        }
    }
    
    return nil, nil
}
```

### 2.3 匹配质量评估

```go
// MatchQuality 匹配质量评估
type MatchQuality struct {
    Team1Rating    float64
    Team2Rating    float64
    RatingDiff     float64   // 评分差
    WaitTime       float64   // 等待时间（秒）
    Quality        float64   // 质量分数 0-1
}

// EvaluateQuality 评估匹配质量
func EvaluateQuality(t1Rating, t2Rating, waitTime float64) *MatchQuality {
    diff := math.Abs(t1Rating - t2Rating)
    
    // 质量评分：评分差越小、等待越短，质量越高
    ratingScore := 1.0 - math.Min(diff/500.0, 1.0)     // 500分差=0质量
    waitScore := 1.0 - math.Min(waitTime/120.0, 1.0)   // 120秒=0质量
    
    quality := ratingScore*0.7 + waitScore*0.3 // 评分差权重70%
    
    return &MatchQuality{
        Team1Rating: t1Rating,
        Team2Rating: t2Rating,
        RatingDiff:  diff,
        WaitTime:    waitTime,
        Quality:     quality,
    }
}
```

## 3. 游戏大厅（Game Lobby）

游戏大厅是玩家进入游戏后的第一个交互界面，负责展示房间列表、等待状态和匹配进度。

### 3.1 大厅架构

```go
// LobbyServer 游戏大厅服务器
type LobbyServer struct {
    rooms       map[uint64]*Room        // 房间列表
    players     map[uint64]*LobbyPlayer // 在线玩家
    channels    map[string]*Channel     // 聊天频道
    mu          sync.RWMutex
    maxRooms    int
    maxPlayers  int
}

// Room 游戏房间
type Room struct {
    ID          uint64
    Name        string
    Host        uint64
    Players     []*LobbyPlayer
    MaxPlayers  int
    GameMode    string
    MapID       int
    State       RoomState
    CreatedAt   time.Time
}

// RoomState 房间状态
type RoomState int

const (
    RoomStateWaiting  RoomState = iota // 等待中
    RoomStateStarting                  // 游戏启动中
    RoomStatePlaying                   // 游戏进行中
    RoomStateFinished                  // 游戏结束
)

// LobbyPlayer 大厅中的玩家
type LobbyPlayer struct {
    ID       uint64
    Name     string
    Rating   float64
    Level    int
    Status   PlayerStatus
    RoomID   uint64  // 当前所在房间，0 表示大厅
    conn     net.Conn
}

// PlayerStatus 玩家状态
type PlayerStatus int

const (
    StatusOnline     PlayerStatus = iota // 在线
    StatusInLobby                        // 在大厅
    StatusInRoom                         // 在房间中
    StatusInGame                         // 在游戏中
    StatusAway                           // 离开
    StatusBusy                           // 忙碌
)

// HandleJoin 处理玩家加入大厅
func (s *LobbyServer) HandleJoin(player *LobbyPlayer) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    if len(s.players) >= s.maxPlayers {
        return fmt.Errorf("大厅已满")
    }
    
    s.players[player.ID] = player
    player.Status = StatusInLobby
    
    // 广播玩家加入通知
    s.broadcast(&LobbyEvent{
        Type:     EventPlayerJoin,
        PlayerID: player.ID,
        Player:   player,
    })
    
    return nil
}

// HandleRoomList 获取房间列表
func (s *LobbyServer) HandleRoomList(filter *RoomFilter) []*Room {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    var result []*Room
    for _, room := range s.rooms {
        if filter.GameMode != "" && room.GameMode != filter.GameMode {
            continue
        }
        if filter.HasSpace && len(room.Players) >= room.MaxPlayers {
            continue
        }
        result = append(result, room)
    }
    
    // 按创建时间排序，新的在前
    sort.Slice(result, func(i, j int) bool {
        return result[i].CreatedAt.After(result[j].CreatedAt)
    })
    
    return result
}

// RoomFilter 房间过滤条件
type RoomFilter struct {
    GameMode string
    MapID    int
    HasSpace bool
    MinLevel int
    MaxLevel int
}
```

### 3.2 房间管理

```go
// CreateRoom 创建房间
func (s *LobbyServer) CreateRoom(host *LobbyPlayer, config *RoomConfig) (*Room, error) {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    if len(s.rooms) >= s.maxRooms {
        return nil, fmt.Errorf("房间数量已达上限")
    }
    
    room := &Room{
        ID:         generateRoomID(),
        Name:       config.Name,
        Host:       host.ID,
        Players:    []*LobbyPlayer{host},
        MaxPlayers: config.MaxPlayers,
        GameMode:   config.GameMode,
        MapID:      config.MapID,
        State:      RoomStateWaiting,
        CreatedAt:  time.Now(),
    }
    
    s.rooms[room.ID] = room
    host.RoomID = room.ID
    host.Status = StatusInRoom
    
    // 通知房间创建成功
    s.notifyRoomCreated(room)
    
    return room, nil
}

// JoinRoom 加入房间
func (s *LobbyServer) JoinRoom(player *LobbyPlayer, roomID uint64) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    room, ok := s.rooms[roomID]
    if !ok {
        return fmt.Errorf("房间不存在")
    }
    
    if room.State != RoomStateWaiting {
        return fmt.Errorf("房间已开始游戏")
    }
    
    if len(room.Players) >= room.MaxPlayers {
        return fmt.Errorf("房间已满")
    }
    
    room.Players = append(room.Players, player)
    player.RoomID = roomID
    player.Status = StatusInRoom
    
    // 通知房间内所有玩家
    s.notifyRoomUpdate(room, &LobbyEvent{
        Type:     EventPlayerJoinRoom,
        PlayerID: player.ID,
        Player:   player,
    })
    
    return nil
}

// LeaveRoom 离开房间
func (s *LobbyServer) LeaveRoom(player *LobbyPlayer) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    room, ok := s.rooms[player.RoomID]
    if !ok {
        return nil
    }
    
    // 从房间中移除
    for i, p := range room.Players {
        if p.ID == player.ID {
            room.Players = append(room.Players[:i], room.Players[i+1:]...)
            break
        }
    }
    
    player.RoomID = 0
    player.Status = StatusInLobby
    
    // 如果房间为空，删除房间
    if len(room.Players) == 0 {
        delete(s.rooms, room.ID)
        return nil
    }
    
    // 如果离开的是房主，转移房主
    if room.Host == player.ID {
        room.Host = room.Players[0].ID
        s.notifyRoomUpdate(room, &LobbyEvent{
            Type:     EventHostChanged,
            PlayerID: room.Host,
        })
    }
    
    // 通知房间内剩余玩家
    s.notifyRoomUpdate(room, &LobbyEvent{
        Type:     EventPlayerLeaveRoom,
        PlayerID: player.ID,
    })
    
    return nil
}
```

## 4. 中继服务器（Relay Server）

中继服务器用于 P2P 游戏中的 NAT 穿透和数据转发。当两个玩家无法直接建立 P2P 连接时，中继服务器作为中间人转发数据包。

### 4.1 中继架构

```
玩家 A                    中继服务器                    玩家 B
  │                         │                          │
  │── 发送数据包 ──────────→│                          │
  │   {seq:1, data:...}     │                          │
  │                         │── 转发数据包 ────────────→│
  │                         │   {seq:1, data:...}      │
  │                         │                          │
  │                         │←── 发送数据包 ───────────│
  │                         │   {seq:1, data:...}      │
  │←── 转发数据包 ──────────│                          │
  │   {seq:1, data:...}     │                          │
```

### 4.2 中继服务器实现

```go
// RelayServer 中继服务器
type RelayServer struct {
    sessions map[uint64]*RelaySession
    mu       sync.RWMutex
}

// RelaySession 中继会话（一对玩家）
type RelaySession struct {
    SessionID uint64
    PlayerA   *RelayPeer
    PlayerB   *RelayPeer
    CreatedAt time.Time
    BytesRelayed uint64
    PacketsRelayed uint64
}

// RelayPeer 中继端点
type RelayPeer struct {
    PlayerID uint64
    Addr     *net.UDPAddr
    conn     *net.UDPConn
    lastSeen time.Time
}

// NewRelaySession 创建中继会话
func (s *RelayServer) NewRelaySession(playerA, playerB uint64) *RelaySession {
    session := &RelaySession{
        SessionID: generateSessionID(),
        PlayerA:   &RelayPeer{PlayerID: playerA},
        PlayerB:   &RelayPeer{PlayerID: playerB},
        CreatedAt: time.Now(),
    }
    
    s.mu.Lock()
    s.sessions[session.SessionID] = session
    s.mu.Unlock()
    
    return session
}

// ForwardPacket 转发数据包
func (s *RelayServer) ForwardPacket(sessionID uint64, fromPlayer uint64, data []byte) error {
    s.mu.RLock()
    session, ok := s.sessions[sessionID]
    s.mu.RUnlock()
    
    if !ok {
        return fmt.Errorf("会话不存在")
    }
    
    var to *RelayPeer
    if fromPlayer == session.PlayerA.PlayerID {
        to = session.PlayerB
    } else if fromPlayer == session.PlayerB.PlayerID {
        to = session.PlayerA
    } else {
        return fmt.Errorf("玩家不属于此会话")
    }
    
    // 转发数据
    _, err := to.conn.WriteToUDP(data, to.Addr)
    if err != nil {
        return fmt.Errorf("转发失败: %w", err)
    }
    
    // 统计
    session.BytesRelayed += uint64(len(data))
    session.PacketsRelayed++
    
    return nil
}

// RelayProtocol 中继协议头
type RelayProtocol struct {
    SessionID  uint32  // 会话 ID
    SequenceNum uint32 // 序列号（用于检测丢包和乱序）
    PayloadType uint8  // 载荷类型：0=数据, 1=控制, 2=心跳
    Flags       uint8  // 标志位：0x01=重要, 0x02=可靠
    Checksum    uint16 // 校验和
}

// EncodeRelayPacket 编码中继数据包
func EncodeRelayPacket(sessionID uint32, seq uint32, payload []byte) []byte {
    header := make([]byte, 12)
    binary.BigEndian.PutUint32(header[0:4], sessionID)
    binary.BigEndian.PutUint32(header[4:8], seq)
    header[8] = 0 // 数据包
    header[9] = 0 // 标志位
    
    // 计算校验和
    checksum := crc16.Checksum(payload)
    binary.BigEndian.PutUint16(header[10:12], checksum)
    
    packet := append(header, payload...)
    return packet
}

// DecodeRelayPacket 解码中继数据包
func DecodeRelayPacket(data []byte) (*RelayProtocol, []byte, error) {
    if len(data) < 12 {
        return nil, nil, fmt.Errorf("数据包过短")
    }
    
    header := &RelayProtocol{
        SessionID:   binary.BigEndian.Uint32(data[0:4]),
        SequenceNum: binary.BigEndian.Uint32(data[4:8]),
        PayloadType: data[8],
        Flags:       data[9],
        Checksum:    binary.BigEndian.Uint16(data[10:12]),
    }
    
    payload := data[12:]
    
    // 校验和验证
    if crc16.Checksum(payload) != header.Checksum {
        return nil, nil, fmt.Errorf("校验和不匹配")
    }
    
    return header, payload, nil
}
```

### 4.3 中继策略

```go
// RelayStrategy 中继策略
type RelayStrategy int

const (
    RelayStrategyNone     RelayStrategy = iota // 直连
    RelayStrategySTUN                          // STUN 穿透
    RelayStrategyTURN                          // TURN 中继
)

// SelectRelayStrategy 选择中继策略
func SelectRelayStrategy(natTypeA, natTypeB int) RelayStrategy {
    // NAT 类型：0=无NAT, 1=完全锥形, 2=受限锥形, 3=端口受限, 4=对称
    
    // 双方都没有 NAT，直连
    if natTypeA == 0 && natTypeB == 0 {
        return RelayStrategyNone
    }
    
    // 一方是完全锥形 NAT，可以穿透
    if natTypeA == 1 || natTypeB == 1 {
        return RelayStrategySTUN
    }
    
    // 其他情况需要 TURN 中继
    return RelayStrategyTURN
}

// RelayAllocation 中继分配（TURN 风格）
type RelayAllocation struct {
    ID        uint64
    PeerAddr  *net.UDPAddr
    RelayAddr *net.UDPAddr  // 分配的中继地址
    Lifetime  time.Duration
    CreatedAt time.Time
}

// AllocateRelay 分配中继资源
func (s *RelayServer) AllocateRelay(playerID uint64) (*RelayAllocation, error) {
    // 分配一个可用的中继端口
    relayPort, err := allocatePort()
    if err != nil {
        return nil, err
    }
    
    allocation := &RelayAllocation{
        ID:        generateAllocationID(),
        RelayAddr: &net.UDPAddr{IP: getPublicIP(), Port: relayPort},
        Lifetime:  5 * time.Minute,
        CreatedAt: time.Now(),
    }
    
    return allocation, nil
}
```

## 5. 聊天系统（Chat System）

聊天系统是游戏中最重要的社交工具之一，支持私聊、组队聊天、公会聊天和世界聊天等多种模式。

### 5.1 聊天频道

```go
// ChatChannel 聊天频道
type ChatChannel struct {
    ID          string
    Name        string
    Type        ChannelType
    Players     map[uint64]*ChatPlayer
    MaxPlayers  int
    CreatedAt   time.Time
}

// ChannelType 频道类型
type ChannelType int

const (
    ChannelWorld     ChannelType = iota // 世界频道
    ChannelRegion                       // 区域频道
    ChannelTeam                         // 组队频道
    ChannelGuild                        // 公会频道
    ChannelPrivate                      // 私聊
    ChannelSystem                       // 系统频道
)

// ChatPlayer 聊天玩家
type ChatPlayer struct {
    ID       uint64
    Name     string
    Level    int
    IsMuted  bool  // 是否被禁言
    MuteEnd  time.Time
}

// ChatManager 聊天管理器
type ChatManager struct {
    channels map[string]*ChatChannel
    mu       sync.RWMutex
}

// NewChatManager 创建聊天管理器
func NewChatManager() *ChatManager {
    m := &ChatManager{
        channels: make(map[string]*ChatChannel),
    }
    
    // 创建默认频道
    m.channels["world"] = &ChatChannel{
        ID:         "world",
        Name:       "世界频道",
        Type:       ChannelWorld,
        Players:    make(map[uint64]*ChatPlayer),
        MaxPlayers: 10000,
    }
    
    return m
}

// SendChatMessage 发送聊天消息
func (m *ChatManager) SendChatMessage(player *ChatPlayer, channelID string, content string) error {
    m.mu.RLock()
    channel, ok := m.channels[channelID]
    m.mu.RUnlock()
    
    if !ok {
        return fmt.Errorf("频道不存在")
    }
    
    // 检查玩家是否在频道中
    if _, ok := channel.Players[player.ID]; !ok {
        return fmt.Errorf("你不在该频道中")
    }
    
    // 检查玩家是否被禁言
    if player.IsMuted {
        if time.Now().Before(player.MuteEnd) {
            return fmt.Errorf("你已被禁言，解禁时间: %v", player.MuteEnd)
        }
        player.IsMuted = false
    }
    
    // 敏感词过滤（详见第19节）
    filteredContent, err := FilterSensitiveWords(content)
    if err != nil {
        return fmt.Errorf("消息包含敏感词")
    }
    
    // 创建消息
    msg := &ChatMessage{
        ID:        generateMessageID(),
        ChannelID: channelID,
        SenderID:  player.ID,
        SenderName: player.Name,
        Content:   filteredContent,
        Timestamp: time.Now(),
    }
    
    // 广播消息
    m.broadcast(channel, msg)
    
    return nil
}

// Broadcast 广播消息到频道所有玩家
func (m *ChatManager) broadcast(channel *ChatChannel, msg *ChatMessage) {
    data := encodeMessage(msg)
    
    for _, player := range channel.Players {
        // 异步发送，避免阻塞
        go func(p *ChatPlayer) {
            p.conn.Write(data)
        }(player)
    }
}
```

### 5.2 私聊系统

```go
// PrivateChat 私聊管理
type PrivateChat struct {
    conversations map[string]*Conversation  // key: "playerA:playerB" (排序后)
    mu            sync.RWMutex
}

// Conversation 私聊会话
type Conversation struct {
    ID         string
    PlayerA    uint64
    PlayerB    uint64
    Messages   []*ChatMessage
    MaxHistory int
}

// SendPrivateMessage 发送私聊消息
func (p *PrivateChat) SendPrivateMessage(from, to uint64, content string) error {
    p.mu.Lock()
    
    // 获取或创建会话
    key := conversationKey(from, to)
    conv, ok := p.conversations[key]
    if !ok {
        conv = &Conversation{
            ID:         key,
            PlayerA:    from,
            PlayerB:    to,
            Messages:   make([]*ChatMessage, 0),
            MaxHistory: 1000,
        }
        p.conversations[key] = conv
    }
    
    msg := &ChatMessage{
        ID:        generateMessageID(),
        SenderID:  from,
        Content:   content,
        Timestamp: time.Now(),
    }
    
    // 保存消息（循环缓冲）
    if len(conv.Messages) >= conv.MaxHistory {
        conv.Messages = conv.Messages[1:]
    }
    conv.Messages = append(conv.Messages, msg)
    
    p.mu.Unlock()
    
    // 通知接收者
    notifyPlayer(to, msg)
    
    return nil
}

// GetHistory 获取私聊历史
func (p *PrivateChat) GetHistory(playerA, playerB uint64, limit int) []*ChatMessage {
    p.mu.RLock()
    defer p.mu.RUnlock()
    
    key := conversationKey(playerA, playerB)
    conv, ok := p.conversations[key]
    if !ok {
        return nil
    }
    
    if limit > len(conv.Messages) {
        limit = len(conv.Messages)
    }
    
    return conv.Messages[len(conv.Messages)-limit:]
}

func conversationKey(a, b uint64) string {
    if a < b {
        return fmt.Sprintf("%d:%d", a, b)
    }
    return fmt.Sprintf("%d:%d", b, a)
}
```

### 5.3 表情和快捷回复

```go
// QuickReply 快捷回复
type QuickReply struct {
    ID      int
    Content string
    Icon    string
}

// 预定义快捷回复
var DefaultQuickReplies = []QuickReply{
    {1, "请求支援！", "help"},
    {2, "目标已标记", "marker"},
    {3, "撤退！", "retreat"},
    {4, "进攻！", "attack"},
    {5, "等待我", "wait"},
    {6, "GG", "gg"},
}

// Emoji 表情定义
type Emoji struct {
    Code    string  // 如 [哈哈]
    ImageID int     // 对应图片资源ID
    Category string
}
```

## 6. 邮件系统（Email / In-Game Mail）

游戏内邮件系统用于发送系统奖励、玩家间通信和运营通知。

### 6.1 邮件系统设计

```go
// GameMail 游戏邮件
type GameMail struct {
    ID          uint64
    SenderID    uint64  // 0=系统邮件
    SenderName  string
    ReceiverID  uint64
    Title       string
    Content     string
    MailType    MailType
    Attachments []*MailAttachment  // 附件（道具、货币等）
    IsRead      bool
    IsClaimed   bool  // 附件是否已领取
    CreatedAt   time.Time
    ExpireAt    time.Time  // 过期时间
}

// MailType 邮件类型
type MailType int

const (
    MailTypeSystem      MailType = iota // 系统邮件
    MailTypePlayer                      // 玩家邮件
    MailTypeGM                          // GM邮件
    MailTypeReward                      // 奖励邮件
)

// MailAttachment 邮件附件
type MailAttachment struct {
    ItemType  int     // 道具类型
    ItemID    uint64  // 道具ID
    Count     int     // 数量
    ExpireAt  time.Time // 道具过期时间
}

// Mailbox 邮箱管理
type Mailbox struct {
    mails     map[uint64][]*GameMail  // playerID -> mails
    mu        sync.RWMutex
    maxMails  int  // 每个玩家最大邮件数
}

// NewMailbox 创建邮箱
func NewMailbox(maxMails int) *Mailbox {
    return &Mailbox{
        mails:    make(map[uint64][]*GameMail),
        maxMails: maxMails,
    }
}

// SendMail 发送邮件
func (m *Mailbox) SendMail(mail *GameMail) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    mails := m.mails[mail.ReceiverID]
    
    // 检查邮件数量限制
    if len(mails) >= m.maxMails {
        // 删除最旧的已读无附件邮件
        if !deleteOldestReadMail(mails) {
            return fmt.Errorf("邮箱已满")
        }
    }
    
    mail.ID = generateMailID()
    mail.CreatedAt = time.Now()
    m.mails[mail.ReceiverID] = append(m.mails[mail.ReceiverID], mail)
    
    // 通知玩家有新邮件
    notifyNewMail(mail.ReceiverID, mail.ID)
    
    return nil
}

// ClaimAttachment 领取邮件附件
func (m *Mailbox) ClaimAttachment(playerID, mailID uint64) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    mails := m.mails[playerID]
    for _, mail := range mails {
        if mail.ID == mailID {
            if mail.IsClaimed {
                return fmt.Errorf("附件已领取")
            }
            if len(mail.Attachments) == 0 {
                return fmt.Errorf("邮件没有附件")
            }
            
            // 将附件添加到玩家背包
            for _, att := range mail.Attachments {
                addItemToInventory(playerID, att.ItemType, att.ItemID, att.Count)
            }
            
            mail.IsClaimed = true
            return nil
        }
    }
    
    return fmt.Errorf("邮件不存在")
}

// SendSystemMail 系统批量邮件
func (m *Mailbox) SendSystemMail(title, content string, attachments []*MailAttachment, receiverIDs []uint64) {
    for _, receiverID := range receiverIDs {
        mail := &GameMail{
            SenderID:    0,
            SenderName:  "系统",
            ReceiverID:  receiverID,
            Title:       title,
            Content:     content,
            MailType:    MailTypeSystem,
            Attachments: attachments,
            ExpireAt:    time.Now().Add(30 * 24 * time.Hour), // 30天过期
        }
        m.SendMail(mail)
    }
}

// CleanupExpired 清理过期邮件
func (m *Mailbox) CleanupExpired() {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    now := time.Now()
    for playerID, mails := range m.mails {
        var valid []*GameMail
        for _, mail := range mails {
            if mail.ExpireAt.After(now) {
                valid = append(valid, mail)
            }
        }
        if len(valid) == 0 {
            delete(m.mails, playerID)
        } else {
            m.mails[playerID] = valid
        }
    }
}

func deleteOldestReadMail(mails []*GameMail) bool {
    for i, mail := range mails {
        if mail.IsRead && len(mail.Attachments) == 0 {
            m.mails[mail.ReceiverID] = append(mails[:i], mails[i+1:]...)
            return true
        }
    }
    return false
}
```

## 7. 好友系统（Friends List）

好友系统管理玩家之间的社交关系，包括添加好友、删除好友和好友状态查询。

### 7.1 好友关系管理

```go
// FriendList 好友列表管理
type FriendList struct {
    friends     map[uint64]*FriendRelation  // playerID -> relations
    mu          sync.RWMutex
    maxFriends  int
}

// FriendRelation 好友关系
type FriendRelation struct {
    PlayerID    uint64
    FriendID    uint64
    Relation    FriendRelationType
    Remark      string   // 备注名
    AddedAt     time.Time
    GroupID     int      // 好友分组
}

// FriendRelationType 好友关系类型
type FriendRelationType int

const (
    FriendTypeFriend     FriendRelationType = iota // 好友
    FriendTypeBlocked                              // 黑名单
    FriendTypeGuild                                // 公会成员
)

// AddFriend 添加好友
func (f *FriendList) AddFriend(playerID, friendID uint64) error {
    f.mu.Lock()
    defer f.mu.Unlock()
    
    if playerID == friendID {
        return fmt.Errorf("不能添加自己为好友")
    }
    
    relations := f.friends[playerID]
    if relations == nil {
        relations = &FriendRelationSet{}
        f.friends[playerID] = relations
    }
    
    // 检查是否已经是好友
    if relations.HasFriend(friendID) {
        return fmt.Errorf("已经是好友了")
    }
    
    // 检查好友数量限制
    if relations.Count() >= f.maxFriends {
        return fmt.Errorf("好友数量已达上限")
    }
    
    // 检查是否在黑名单中
    if relations.IsBlocked(friendID) {
        return fmt.Errorf("该玩家在你的黑名单中")
    }
    
    // 双向添加
    relation := &FriendRelation{
        PlayerID: playerID,
        FriendID: friendID,
        Relation: FriendTypeFriend,
        AddedAt:  time.Now(),
    }
    
    relations.Add(relation)
    
    // 对方也添加
    friendRelations := f.friends[friendID]
    if friendRelations == nil {
        friendRelations = &FriendRelationSet{}
        f.friends[friendID] = friendRelations
    }
    friendRelations.Add(&FriendRelation{
        PlayerID: friendID,
        FriendID: playerID,
        Relation: FriendTypeFriend,
        AddedAt:  time.Now(),
    })
    
    // 通知双方
    notifyFriendAdded(playerID, friendID)
    notifyFriendAdded(friendID, playerID)
    
    return nil
}

// RemoveFriend 删除好友
func (f *FriendList) RemoveFriend(playerID, friendID uint64) error {
    f.mu.Lock()
    defer f.mu.Unlock()
    
    relations := f.friends[playerID]
    if relations == nil {
        return fmt.Errorf("好友关系不存在")
    }
    
    relations.Remove(friendID)
    
    // 对方也删除
    if friendRelations := f.friends[friendID]; friendRelations != nil {
        friendRelations.Remove(playerID)
    }
    
    // 通知双方
    notifyFriendRemoved(playerID, friendID)
    notifyFriendRemoved(friendID, playerID)
    
    return nil
}

// GetOnlineFriends 获取在线好友
func (f *FriendList) GetOnlineFriends(playerID uint64) []*OnlineFriend {
    f.mu.RLock()
    defer f.mu.RUnlock()
    
    relations := f.friends[playerID]
    if relations == nil {
        return nil
    }
    
    var online []*OnlineFriend
    for _, rel := range relations.GetAll() {
        if rel.Relation != FriendTypeFriend {
            continue
        }
        
        status := getPlayerStatus(rel.FriendID)
        if status != nil && status.IsOnline {
            online = append(online, &OnlineFriend{
                ID:       rel.FriendID,
                Name:     status.Name,
                Level:    status.Level,
                Status:   status.GameStatus,
                RoomID:   status.RoomID,
                Remark:   rel.Remark,
            })
        }
    }
    
    return online
}

// OnlineFriend 在线好友信息
type OnlineFriend struct {
    ID     uint64
    Name   string
    Level  int
    Status string  // "在线", "游戏中", "组队中"
    RoomID uint64
    Remark string
}
```

### 7.2 黑名单系统

```go
// Blacklist 黑名单管理
type Blacklist struct {
    mu          sync.RWMutex
    lists       map[uint64][]uint64  // playerID -> blocked IDs
    maxBlocked  int
}

// BlockPlayer 拉黑玩家
func (b *Blacklist) BlockPlayer(playerID, blockedID uint64) error {
    b.mu.Lock()
    defer b.mu.Unlock()
    
    blocked := b.lists[playerID]
    if len(blocked) >= b.maxBlocked {
        return fmt.Errorf("黑名单已满")
    }
    
    // 检查是否已拉黑
    for _, id := range blocked {
        if id == blockedID {
            return fmt.Errorf("已在黑名单中")
        }
    }
    
    b.lists[playerID] = append(blocked, blockedID)
    
    // 同时从好友列表中移除
    removeFromFriends(playerID, blockedID)
    
    // 通知被拉黑玩家
    notifyBlocked(blockedID, playerID)
    
    return nil
}

// UnblockPlayer 取消拉黑
func (b *Blacklist) UnblockPlayer(playerID, blockedID uint64) error {
    b.mu.Lock()
    defer b.mu.Unlock()
    
    blocked := b.lists[playerID]
    for i, id := range blocked {
        if id == blockedID {
            b.lists[playerID] = append(blocked[:i], blocked[i+1:]...)
            return nil
        }
    }
    
    return fmt.Errorf("该玩家不在黑名单中")
}

// IsBlocked 检查是否被拉黑
func (b *Blacklist) IsBlocked(playerID, targetID uint64) bool {
    b.mu.RLock()
    defer b.mu.RUnlock()
    
    // 检查 target 是否拉黑了 player
    for _, id := range b.lists[targetID] {
        if id == playerID {
            return true
        }
    }
    return false
}
```

## 8. 玩家状态系统（Player Status）

玩家状态系统管理玩家的在线状态、游戏状态和活动信息。

### 8.1 状态管理

```go
// StatusManager 状态管理器
type StatusManager struct {
    statuses map[uint64]*PlayerStatusInfo
    mu       sync.RWMutex
}

// PlayerStatusInfo 玩家状态信息
type PlayerStatusInfo struct {
    PlayerID     uint64
    IsOnline     bool
    Status       GameStatus
    GameMode     string   // 当前游戏模式
    RoomID       uint64   // 当前房间
    ServerID     string   // 当前服务器
    LoginTime    time.Time
    LastActive   time.Time
    IP           string
    Platform     string   // PC, Mobile, Console
    CustomStatus string   // 自定义状态签名
}

// GameStatus 游戏状态
type GameStatus int

const (
    GameStatusOnline     GameStatus = iota // 在线
    GameStatusIdle                         // 空闲
    GameStatusInLobby                      // 在大厅
    GameStatusInRoom                       // 在房间
    GameStatusPlaying                      // 游戏中
    GameStatusSpectating                   // 观战中
    GameStatusAway                         // 离开
    GameStatusBusy                         // 忙碌
)

// UpdateStatus 更新玩家状态
func (m *StatusManager) UpdateStatus(playerID uint64, status GameStatus, extra map[string]string) {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    info, ok := m.statuses[playerID]
    if !ok {
        info = &PlayerStatusInfo{
            PlayerID: playerID,
        }
        m.statuses[playerID] = info
    }
    
    info.Status = status
    info.LastActive = time.Now()
    
    if extra != nil {
        if v, ok := extra["game_mode"]; ok {
            info.GameMode = v
        }
        if v, ok := extra["room_id"]; ok {
            info.RoomID, _ = strconv.ParseUint(v, 10, 64)
        }
        if v, ok := extra["custom_status"]; ok {
            info.CustomStatus = v
        }
    }
}

// GetPlayerStatus 获取玩家状态
func (m *StatusManager) GetPlayerStatus(playerID uint64) *PlayerStatusInfo {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    info, ok := m.statuses[playerID]
    if !ok {
        return nil
    }
    return info
}

// GetOnlineCount 获取在线人数
func (m *StatusManager) GetOnlineCount() int {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    count := 0
    for _, info := range m.statuses {
        if info.IsOnline {
            count++
        }
    }
    return count
}
```

### 8.2 锁服务器（Lock Server）

锁服务器用于确保同一账号在同一时间只能在一台服务器上登录，防止多设备同时登录。

```go
// LockServer 锁服务器
type LockServer struct {
    locks     map[string]*Lock  // key -> lock
    mu        sync.RWMutex
    timeout   time.Duration
}

// Lock 锁信息
type Lock struct {
    Key       string
    Owner     uint64  // 持有锁的玩家 ID
    ServerID  string  // 持有锁的服务器
    AcquiredAt time.Time
    ExpiresAt  time.Time
}

// AcquireLock 获取锁
func (s *LockServer) AcquireLock(key string, playerID uint64, serverID string) (bool, error) {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    lock, exists := s.locks[key]
    
    // 锁不存在，直接获取
    if !exists {
        s.locks[key] = &Lock{
            Key:        key,
            Owner:      playerID,
            ServerID:   serverID,
            AcquiredAt: time.Now(),
            ExpiresAt:  time.Now().Add(s.timeout),
        }
        return true, nil
    }
    
    // 锁已过期，强制获取
    if time.Now().After(lock.ExpiresAt) {
        s.locks[key] = &Lock{
            Key:        key,
            Owner:      playerID,
            ServerID:   serverID,
            AcquiredAt: time.Now(),
            ExpiresAt:  time.Now().Add(s.timeout),
        }
        return true, nil
    }
    
    // 锁被其他服务器持有
    if lock.ServerID != serverID {
        return false, fmt.Errorf("账号已在其他服务器登录")
    }
    
    // 同一服务器，续期
    lock.ExpiresAt = time.Now().Add(s.timeout)
    return true, nil
}

// ReleaseLock 释放锁
func (s *LockServer) ReleaseLock(key string, serverID string) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    lock, exists := s.locks[key]
    if !exists {
        return nil
    }
    
    if lock.ServerID != serverID {
        return fmt.Errorf("无权释放此锁")
    }
    
    delete(s.locks, key)
    return nil
}

// CleanupExpiredLocks 清理过期锁
func (s *LockServer) CleanupExpiredLocks() {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    now := time.Now()
    for key, lock := range s.locks {
        if now.After(lock.ExpiresAt) {
            delete(s.locks, key)
        }
    }
}

// 使用示例：登录流程
func loginWithLock(lockServer *LockServer, player *Player) error {
    key := fmt.Sprintf("account:%d", player.AccountID)
    
    acquired, err := lockServer.AcquireLock(key, player.ID, getServerID())
    if err != nil {
        return err
    }
    
    if !acquired {
        return fmt.Errorf("账号已在其他地方登录")
    }
    
    // 登录成功，保持锁
    return nil
}
```

## 9. 语音聊天（Voice Chat）

语音聊天为玩家提供实时语音交流，是团队游戏的核心功能。

### 9.1 语音架构

```
玩家 A                      语音服务器                      玩家 B
  │                           │                            │
  │── 音频流 ────────────────→│                            │
  │   (Opus 编码)             │                            │
  │                           │── 转发/混音 ──────────────→│
  │                           │   (Opus 解码)              │
  │                           │                            │
  │←── 音频流 ────────────────│←── 发言请求 ──────────────│
  │   (Opus 编码)             │   (PTT/SVC)                │
```

### 9.2 语音服务实现

```go
// VoiceServer 语音服务器
type VoiceServer struct {
    rooms     map[uint64]*VoiceRoom
    mu        sync.RWMutex
}

// VoiceRoom 语音房间
type VoiceRoom struct {
    ID        uint64
    Players   map[uint64]*VoicePlayer
    MaxPlayers int
}

// VoicePlayer 语音玩家
type VoicePlayer struct {
    ID        uint64
    AudioLevel float64  // 音量级别
    IsMuted    bool     // 麦克风静音
    IsDeafened bool     // 耳机静音
    Codec      string   // Opus, etc.
    IsSpeaking bool     // 是否在说话
}

// VoicePacket 语音数据包
type VoicePacket struct {
    RoomID    uint64
    SenderID  uint64
    Codec     string   // Opus
    Sequence  uint32
    Data      []byte   // 编码后的音频数据
    Timestamp int64
}

// HandleVoicePacket 处理语音数据包
func (s *VoiceServer) HandleVoicePacket(packet *VoicePacket) error {
    s.mu.RLock()
    room, ok := s.rooms[packet.RoomID]
    s.mu.RUnlock()
    
    if !ok {
        return fmt.Errorf("语音房间不存在")
    }
    
    // 检查发送者是否在房间中
    sender, ok := room.Players[packet.SenderID]
    if !ok {
        return fmt.Errorf("不在语音房间中")
    }
    
    if sender.IsMuted {
        return fmt.Errorf("麦克风已静音")
    }
    
    // 转发给房间内其他玩家（排除发送者）
    for _, player := range room.Players {
        if player.ID == packet.SenderID || player.IsDeafened {
            continue
        }
        
        go func(p *VoicePlayer) {
            // 转发语音包
            sendToPlayer(p.ID, packet)
        }(player)
    }
    
    return nil
}

// VoiceCodec 语音编解码
type VoiceCodec struct {
    SampleRate  int
    Channels    int
    Bitrate     int
    FrameSize   int  // 每帧采样数
}

// Opus 编码参数
var OpusSettings = &VoiceCodec{
    SampleRate: 48000,
    Channels:   1,  // 单声道
    Bitrate:    32000, // 32kbps
    FrameSize:  960,  // 20ms at 48kHz
}

// PTT 按键说话模式
type PTTMode struct {
    Enabled    bool
    KeyBind    string  // 按键绑定
    PushDelay  time.Duration
}
```

### 9.3 空间音频

```go
// SpatialAudio 空间音频系统
type SpatialAudio struct {
    listenerPos  Vector3
    listenerDir  Vector3
    maxDistance   float64  // 最大听距
    rolloffFactor float64  // 衰减因子
}

// Vector3 3D向量
type Vector3 struct {
    X, Y, Z float64
}

// ProcessSpatialAudio 处理空间音频
func (s *SpatialAudio) ProcessSpatialAudio(sourcePos Vector3, audioData []byte) []byte {
    // 计算距离
    dx := listenerPos.X - sourcePos.X
    dy := listenerPos.Y - sourcePos.Y
    dz := listenerPos.Z - sourcePos.Z
    distance := math.Sqrt(dx*dx + dy*dy + dz*dz)
    
    // 超出范围，不处理
    if distance > s.maxDistance {
        return nil
    }
    
    // 计算音量衰减
    volume := 1.0 / (1.0 + s.rolloffFactor*distance)
    
    // 计算左右声道平衡（简化版）
    pan := dx / math.Max(distance, 0.001)
    
    // 调整音频数据
    return adjustVolumeAndPan(audioData, volume, pan)
}
```

## 10. 成就系统（Achievement Management）

成就系统记录玩家的里程碑，提供长期目标和成就感。

### 10.1 成就数据模型

```go
// Achievement 成就定义
type Achievement struct {
    ID          uint64
    Name        string
    Description string
    Category    string   // 战斗、收集、社交、探索
    Icon        string
    Points      int      // 成就点数
    Criteria    []AchievementCriteria  // 达成条件
    Rewards     []Reward  // 奖励
    IsHidden    bool     // 是否隐藏成就
    MaxProgress int      // 最大进度（如：击杀1000个敌人）
}

// AchievementCriteria 成就条件
type AchievementCriteria struct {
    Type     string  // kill, collect, win, play_time, etc.
    Target   int     // 目标值
    Param    string  // 附加参数（如：特定敌人类型）
}

// PlayerAchievement 玩家成就进度
type PlayerAchievement struct {
    PlayerID    uint64
    AchievementID uint64
    Progress    int     // 当前进度
    UnlockedAt  *time.Time  // 解锁时间，nil表示未解锁
    IsCompleted bool
}

// AchievementManager 成就管理器
type AchievementManager struct {
    definitions map[uint64]*Achievement
    progress    map[uint64][]*PlayerAchievement  // playerID -> achievements
    mu          sync.RWMutex
}

// NewAchievementManager 创建成就管理器
func NewAchievementManager() *AchievementManager {
    return &AchievementManager{
        definitions: make(map[uint64]*Achievement),
        progress:    make(map[uint64][]*PlayerAchievement),
    }
}

// CheckAndUnlock 检查并解锁成就
func (m *AchievementManager) CheckAndUnlock(playerID uint64, eventType string, value int) {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    for _, achievement := range m.definitions {
        for _, criteria := range achievement.Criteria {
            if criteria.Type == eventType {
                // 更新进度
                m.updateProgress(playerID, achievement.ID, value)
                
                // 检查是否达成
                pa := m.getPlayerAchievement(playerID, achievement.ID)
                if pa != nil && pa.Progress >= criteria.Target && !pa.IsCompleted {
                    pa.IsCompleted = true
                    now := time.Now()
                    pa.UnlockedAt = &now
                    
                    // 发放奖励
                    m.grantRewards(playerID, achievement.Rewards)
                    
                    // 通知玩家
                    notifyAchievementUnlocked(playerID, achievement)
                }
            }
        }
    }
}

// updateProgress 更新成就进度
func (m *AchievementManager) updateProgress(playerID, achievementID uint64, delta int) {
    pa := m.getPlayerAchievement(playerID, achievementID)
    if pa == nil {
        // 首次记录
        pa = &PlayerAchievement{
            PlayerID:      playerID,
            AchievementID: achievementID,
            Progress:      0,
        }
        m.progress[playerID] = append(m.progress[playerID], pa)
    }
    
    pa.Progress += delta
    
    achievement := m.definitions[achievementID]
    if pa.Progress > achievement.MaxProgress {
        pa.Progress = achievement.MaxProgress
    }
}

// GetPlayerAchievements 获取玩家所有成就
func (m *AchievementManager) GetPlayerAchievements(playerID uint64) []*PlayerAchievement {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    return m.progress[playerID]
}

// GetAchievementStats 获取成就统计
func (m *AchievementManager) GetAchievementStats(playerID uint64) *AchievementStats {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    stats := &AchievementStats{
        Total: len(m.definitions),
    }
    
    for _, pa := range m.progress[playerID] {
        if pa.IsCompleted {
            stats.Completed++
            stats.TotalPoints += m.definitions[pa.AchievementID].Points
        }
    }
    
    stats.CompletionRate = float64(stats.Completed) / float64(stats.Total)
    
    return stats
}

type AchievementStats struct {
    Total         int
    Completed     int
    TotalPoints   int
    CompletionRate float64
}
```

## 11. 存储系统（Storage）

存储系统负责持久化玩家数据，包括角色信息、道具背包和游戏进度。

### 11.1 分层存储架构

```go
// StorageLayer 存储层
type StorageLayer int

const (
    StorageHot   StorageLayer = iota  // 热数据：内存 + Redis
    StorageWarm                        // 温数据：Redis + SSD
    StorageCold                        // 冷数据：HDD / S3
)

// PlayerStorage 玩家存储管理
type PlayerStorage struct {
    hotCache   *redis.Client     // 热缓存
    warmStore  *redis.Client     // 温存储
    coldStore  *sql.DB           // 冷存储（MySQL/PostgreSQL）
    mu         sync.RWMutex
}

// SavePlayerData 保存玩家数据
func (s *PlayerStorage) SavePlayerData(player *PlayerData) error {
    // 1. 序列化数据
    data, err := json.Marshal(player)
    if err != nil {
        return fmt.Errorf("序列化失败: %w", err)
    }
    
    // 2. 写入热缓存（立即生效）
    key := fmt.Sprintf("player:%d", player.ID)
    if err := s.hotCache.Set(ctx, key, data, 30*time.Minute).Err(); err != nil {
        log.Printf("热缓存写入失败: %v", err)
    }
    
    // 3. 写入温存储（异步）
    go func() {
        if err := s.warmStore.Set(ctx, key, data, 24*time.Hour).Err(); err != nil {
            log.Printf("温存储写入失败: %v", err)
        }
    }()
    
    // 4. 写入冷存储（定期批量写入）
    s.enqueueColdWrite(player)
    
    return nil
}

// LoadPlayerData 加载玩家数据
func (s *PlayerStorage) LoadPlayerData(playerID uint64) (*PlayerData, error) {
    key := fmt.Sprintf("player:%d", playerID)
    
    // 1. 尝试热缓存
    data, err := s.hotCache.Get(ctx, key).Bytes()
    if err == nil {
        var player PlayerData
        if err := json.Unmarshal(data, &player); err == nil {
            return &player, nil
        }
    }
    
    // 2. 尝试温存储
    data, err = s.warmStore.Get(ctx, key).Bytes()
    if err == nil {
        var player PlayerData
        if err := json.Unmarshal(data, &player); err == nil {
            // 回写热缓存
            s.hotCache.Set(ctx, key, data, 30*time.Minute)
            return &player, nil
        }
    }
    
    // 3. 从冷存储加载
    return s.loadFromColdStorage(playerID)
}

// PlayerData 玩家数据
type PlayerData struct {
    ID          uint64
    AccountID   uint64
    Name        string
    Level       int
    Experience  int64
    Gold        int64
    Diamonds    int64
    Inventory   []*InventoryItem
    Equipment   map[string]*InventoryItem  // 装备栏位 -> 道具
    Skills      []*Skill
    Stats       *PlayerStats
    UpdatedAt   time.Time
}

// 冷存储批量写入队列
func (s *PlayerStorage) enqueueColdWrite(player *PlayerData) {
    // 使用消息队列或批处理，定期写入冷存储
    // 这里简化为直接写入
    query := `INSERT INTO players (id, data, updated_at) VALUES (?, ?, ?)
              ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)`
    
    data, _ := json.Marshal(player)
    s.coldStore.Exec(query, player.ID, data, time.Now())
}
```

## 12. 客户端更新系统（Client Updates）

客户端更新系统负责检测版本、下载补丁和热更新资源。

### 12.1 版本管理

```go
// UpdateServer 更新服务器
type UpdateServer struct {
    versions    []*VersionInfo
    patches     map[string]*PatchInfo  // version -> patch
    cdnBaseURL  string
}

// VersionInfo 版本信息
type VersionInfo struct {
    Version     string  // 语义化版本：1.2.3
    BuildNumber int
    Platform    string  // windows, ios, android
    ReleaseDate time.Time
    IsRequired  bool    // 是否强制更新
    MinVersion  string  // 最低版本要求
    ReleaseNotes string
}

// PatchInfo 补丁信息
type PatchInfo struct {
    FromVersion string
    ToVersion   string
    Files       []*PatchFile
    TotalSize   int64
    Checksum    string
}

// PatchFile 补丁文件
type PatchFile struct {
    Path        string  // 文件相对路径
    Size        int64
    MD5         string
    DiffSize    int64   // 差异包大小（如果是增量更新）
    IsNew       bool    // 是否新增文件
    IsDelete    bool    // 是否删除文件
}

// CheckUpdate 检查更新
func (s *UpdateServer) CheckUpdate(currentVersion, platform string) (*UpdateResult, error) {
    // 查找最新版本
    var latest *VersionInfo
    for _, v := range s.versions {
        if v.Platform == platform && isNewer(v.Version, currentVersion) {
            if latest == nil || isNewer(v.Version, latest.Version) {
                latest = v
            }
        }
    }
    
    if latest == nil {
        return &UpdateResult{HasUpdate: false}, nil
    }
    
    // 查找增量补丁
    patch := s.findPatch(currentVersion, latest.Version)
    
    return &UpdateResult{
        HasUpdate:    true,
        Version:      latest.Version,
        IsRequired:   latest.IsRequired,
        Patch:        patch,
        ReleaseNotes: latest.ReleaseNotes,
    }, nil
}

// UpdateResult 更新结果
type UpdateResult struct {
    HasUpdate    bool
    Version      string
    IsRequired   bool
    Patch        *PatchInfo
    ReleaseNotes string
    FullURL      string  // 全量包下载地址（无增量包时）
}

// 语义化版本比较
func isNewer(a, b string) bool {
    aParts := strings.Split(a, ".")
    bParts := strings.Split(b, ".")
    
    for i := 0; i < 3; i++ {
        aNum, _ := strconv.Atoi(aParts[i])
        bNum, _ := strconv.Atoi(bParts[i])
        if aNum > bNum { return true }
        if aNum < bNum { return false }
    }
    return false
}

// 差异包生成（简化版）
func GenerateDiffPatch(oldFiles, newFiles map[string][]byte) []*PatchFile {
    var patches []*PatchFile
    
    for path, newData := range newFiles {
        oldData, exists := oldFiles[path]
        if !exists {
            // 新文件
            patches = append(patches, &PatchFile{
                Path:   path,
                Size:   int64(len(newData)),
                MD5:    md5hex(newData),
                IsNew:  true,
            })
            continue
        }
        
        // 检查是否有变化
        if md5hex(oldData) == md5hex(newData) {
            continue
        }
        
        // 生成差异
        diff := binaryDiff(oldData, newData)
        patches = append(patches, &PatchFile{
            Path:     path,
            Size:     int64(len(newData)),
            MD5:      md5hex(newData),
            DiffSize: int64(len(diff)),
        })
    }
    
    // 检查删除的文件
    for path := range oldFiles {
        if _, exists := newFiles[path]; !exists {
            patches = append(patches, &PatchFile{
                Path:     path,
                IsDelete: true,
            })
        }
    }
    
    return patches
}
```

## 13. 排行榜系统（Leaderboard）

排行榜展示玩家排名，是重要的竞争激励手段。

### 13.1 排行榜实现

```go
// Leaderboard 排行榜
type Leaderboard struct {
    Name      string
    Type      LeaderboardType
    Scores    *sortedmap.Map  // 使用有序集合
    mu        sync.RWMutex
    maxLength int
}

// LeaderboardType 排行榜类型
type LeaderboardType int

const (
    LeaderboardTypeRank     LeaderboardType = iota  // 排名（分数越高越好）
    LeaderboardTypeLevel                             // 等级
    LeaderboardTypeScore                             // 积分
    LeaderboardTypeSpeed                             // 速度（时间越短越好）
)

// LeaderboardEntry 排行榜条目
type LeaderboardEntry struct {
    Rank      int
    PlayerID  uint64
    PlayerName string
    Score     int64
    Extra     map[string]interface{}  // 额外信息
    UpdatedAt time.Time
}

// NewLeaderboard 创建排行榜
func NewLeaderboard(name string, lbType LeaderboardType, maxLength int) *Leaderboard {
    return &Leaderboard{
        Name:      name,
        Type:      lbType,
        Scores:    sortedmap.New(),
        maxLength: maxLength,
    }
}

// UpdateScore 更新分数
func (lb *Leaderboard) UpdateScore(playerID uint64, playerName string, score int64) error {
    lb.mu.Lock()
    defer lb.mu.Unlock()
    
    // 获取旧分数
    oldScore, exists := lb.Scores.Get(playerID)
    
    // 检查是否需要更新
    if exists {
        switch lb.Type {
        case LeaderboardTypeSpeed:
            if score >= oldScore.(int64) {
                return nil  // 速度排行榜，时间越短越好
            }
        default:
            if score <= oldScore.(int64) {
                return nil  // 其他排行榜，分数越高越好
            }
        }
    }
    
    // 更新分数
    lb.Scores.Set(playerID, score)
    
    // 如果超出最大长度，移除最低分
    if lb.Scores.Len() > lb.maxLength {
        lb.Scores.RemoveMin()
    }
    
    return nil
}

// GetRank 获取玩家排名
func (lb *Leaderboard) GetRank(playerID uint64) int {
    lb.mu.RLock()
    defer lb.mu.RUnlock()
    
    rank := lb.Scores.GetRank(playerID)
    if rank < 0 {
        return -1  // 不在排行榜中
    }
    return rank + 1  // 从1开始
}

// GetTopN 获取前N名
func (lb *Leaderboard) GetTopN(n int) []*LeaderboardEntry {
    lb.mu.RLock()
    defer lb.mu.RUnlock()
    
    var entries []*LeaderboardEntry
    items := lb.Scores.GetTopN(n)
    
    for i, item := range items {
        entries = append(entries, &LeaderboardEntry{
            Rank:       i + 1,
            PlayerID:   item.Key.(uint64),
            Score:      item.Value.(int64),
            UpdatedAt:  item.UpdatedAt,
        })
    }
    
    return entries
}

// GetAroundMe 获取我附近的排名
func (lb *Leaderboard) GetAroundMe(playerID uint64, count int) []*LeaderboardEntry {
    lb.mu.RLock()
    defer lb.mu.RUnlock()
    
    rank := lb.Scores.GetRank(playerID)
    if rank < 0 {
        return nil
    }
    
    start := rank - count/2
    if start < 0 {
        start = 0
    }
    end := start + count
    
    var entries []*LeaderboardEntry
    items := lb.Scores.GetRange(start, end)
    
    for i, item := range items {
        entries = append(entries, &LeaderboardEntry{
            Rank:       start + i + 1,
            PlayerID:   item.Key.(uint64),
            Score:      item.Value.(int64),
            UpdatedAt:  item.UpdatedAt,
        })
    }
    
    return entries
}

// 赛季排行榜
type SeasonLeaderboard struct {
    CurrentSeason int
    Boards        map[string]*Leaderboard
    History       map[string][]*SeasonResult  // 历史赛季结果
}

// SeasonResult 赛季结果
type SeasonResult struct {
    Season    int
    Rank      int
    Score     int64
    Rewards   []*Reward
    EndedAt   time.Time
}

// EndSeason 结束赛季
func (sl *SeasonLeaderboard) EndSeason() {
    for name, board := range sl.Boards {
        // 记录最终排名
        top := board.GetTopN(100)
        sl.History[name] = append(sl.History[name], &SeasonResult{
            Season:  sl.CurrentSeason,
            EndedAt: time.Now(),
        })
        
        // 发放赛季奖励
        for rank, entry := range top {
            rewards := calculateSeasonRewards(rank + 1)
            grantSeasonRewards(entry.PlayerID, rewards)
        }
        
        // 重置排行榜
        sl.Boards[name] = NewLeaderboard(name, board.Type, board.maxLength)
    }
    
    sl.CurrentSeason++
}
```

## 14. 新闻发布系统（News Publishing）

新闻发布系统用于向玩家推送游戏公告、活动信息和更新日志。

### 14.1 新闻系统设计

```go
// NewsManager 新闻管理器
type NewsManager struct {
    articles   []*NewsArticle
    mu         sync.RWMutex
    maxArticles int
}

// NewsArticle 新闻文章
type NewsArticle struct {
    ID          uint64
    Title       string
    Content     string  // 支持 HTML/Markdown
    Summary     string  // 摘要
    Category    string  // 公告, 活动, 更新, 攻略
    ImageURL    string  // 封面图
    Author      string
    Priority    int     // 优先级，越高越靠前
    IsPinned    bool    // 是否置顶
    IsPublished bool    // 是否已发布
    PublishAt   time.Time
    ExpireAt    time.Time
    Tags        []string
    ViewCount   int64
}

// PublishArticle 发布文章
func (m *NewsManager) PublishArticle(article *NewsArticle) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    article.ID = generateArticleID()
    article.PublishAt = time.Now()
    article.IsPublished = true
    
    // 按优先级插入
    inserted := false
    for i, a := range m.articles {
        if article.Priority > a.Priority {
            m.articles = append(m.articles[:i+1], m.articles[i:]...)
            m.articles[i] = article
            inserted = true
            break
        }
    }
    if !inserted {
        m.articles = append(m.articles, article)
    }
    
    // 限制文章数量
    if len(m.articles) > m.maxArticles {
        m.articles = m.articles[:m.maxArticles]
    }
    
    // 推送通知
    pushNewsNotification(article)
    
    return nil
}

// GetArticles 获取文章列表
func (m *NewsManager) GetArticles(category string, page, pageSize int) []*NewsArticle {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    var filtered []*NewsArticle
    now := time.Now()
    
    for _, article := range m.articles {
        if !article.IsPublished {
            continue
        }
        if article.ExpireAt.Before(now) {
            continue
        }
        if category != "" && article.Category != category {
            continue
        }
        filtered = append(filtered, article)
    }
    
    start := page * pageSize
    if start >= len(filtered) {
        return nil
    }
    
    end := start + pageSize
    if end > len(filtered) {
        end = len(filtered)
    }
    
    return filtered[start:end]
}
```

## 15. 支付认证系统（Payment Authentication）

支付系统处理玩家充值、购买和退款，是游戏商业化的核心。

### 15.1 支付流程

```
玩家购买 → 生成订单 → 发起支付 → 支付平台 → 回调通知 → 发放道具
   │          │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼          ▼
  客户端    订单服务    支付网关    第三方     订单服务    道具服务
```

### 15.2 支付系统实现

```go
// PaymentManager 支付管理器
type PaymentManager struct {
    orders     map[string]*Order  // orderID -> order
    mu         sync.RWMutex
}

// Order 订单
type Order struct {
    OrderID     string
    PlayerID    uint64
    ProductID   string
    Amount      float64   // 金额（元）
    Currency    string    // 货币类型
    Platform    string    // ios, android, web
    Status      OrderStatus
    ChannelID   string    // 支付渠道
    ChannelOrderID string  // 渠道订单号
    CreatedAt   time.Time
    PaidAt      *time.Time
    ExpireAt    time.Time
    CallbackURL string
    Extra       map[string]string
}

// OrderStatus 订单状态
type OrderStatus int

const (
    OrderStatusPending   OrderStatus = iota // 待支付
    OrderStatusPaid                          // 已支付
    OrderStatusDelivered                     // 已发货
    OrderStatusRefunded                      // 已退款
    OrderStatusExpired                       // 已过期
    OrderStatusFailed                        // 支付失败
)

// CreateOrder 创建订单
func (m *PaymentManager) CreateOrder(playerID uint64, productID string, amount float64, platform string) (*Order, error) {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    order := &Order{
        OrderID:    generateOrderID(),
        PlayerID:   playerID,
        ProductID:  productID,
        Amount:     amount,
        Currency:   "CNY",
        Platform:   platform,
        Status:     OrderStatusPending,
        CreatedAt:  time.Now(),
        ExpireAt:   time.Now().Add(30 * time.Minute), // 30分钟超时
    }
    
    m.orders[order.OrderID] = order
    
    return order, nil
}

// ProcessPayment 处理支付回调
func (m *PaymentManager) ProcessPayment(channelOrderID string, status string, amount float64) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // 查找订单
    var order *Order
    for _, o := range m.orders {
        if o.ChannelOrderID == channelOrderID {
            order = o
            break
        }
    }
    
    if order == nil {
        return fmt.Errorf("订单不存在")
    }
    
    // 验证金额
    if math.Abs(order.Amount-amount) > 0.01 {
        return fmt.Errorf("金额不匹配: 期望 %.2f, 实际 %.2f", order.Amount, amount)
    }
    
    // 更新状态
    switch status {
    case "success":
        order.Status = OrderStatusPaid
        now := time.Now()
        order.PaidAt = &now
        
        // 发放道具
        deliverProduct(order.PlayerID, order.ProductID)
        order.Status = OrderStatusDelivered
        
    case "failed":
        order.Status = OrderStatusFailed
        
    case "refunded":
        order.Status = OrderStatusRefunded
        // 回收道具
        revokeProduct(order.PlayerID, order.ProductID)
    }
    
    return nil
}

// VerifyReceipt 验证收据（移动端）
func (m *PaymentManager) VerifyReceipt(receipt string, platform string) (*ReceiptInfo, error) {
    switch platform {
    case "ios":
        return verifyAppleReceipt(receipt)
    case "android":
        return verifyGoogleReceipt(receipt)
    default:
        return nil, fmt.Errorf("不支持的平台")
    }
}

// ReceiptInfo 收据信息
type ReceiptInfo struct {
    Valid       bool
    ProductID   string
    TransactionID string
    PurchaseTime time.Time
    ExpireTime   *time.Time
}
```

## 16. 虚拟货币管理（Virtual Currency）

虚拟货币系统管理游戏内各种货币的获取、消耗和展示。

### 16.1 货币系统设计

```go
// CurrencyType 货币类型
type CurrencyType int

const (
    CurrencyGold      CurrencyType = iota // 金币（游戏中获取）
    CurrencyDiamond                       // 钻石（充值获取）
    CurrencyCoupon                        // 优惠券
    CurrencyHonor                         // 荣誉值
    CurrencyArena                         // 竞技币
    CurrencyGuild                         // 公会贡献
)

// CurrencyInfo 货币信息
type CurrencyInfo struct {
    Type        CurrencyType
    Name        string
    Icon        string
    MaxStorage  int64    // 最大存储量
    MaxDailyGain int64   // 每日最大获取量
    CanExchange bool     // 是否可兑换
    ExchangeRate float64 // 兑换比率
}

// PlayerCurrency 玩家货币
type PlayerCurrency struct {
    PlayerID     uint64
    Balances     map[CurrencyType]int64
    DailyGain    map[CurrencyType]int64  // 今日已获取
    LastResetDay string                  // 上次重置日期
    mu           sync.RWMutex
}

// CurrencyManager 货币管理器
type CurrencyManager struct {
    currencies map[CurrencyType]*CurrencyInfo
    balances   map[uint64]*PlayerCurrency
    mu         sync.RWMutex
}

// NewCurrencyManager 创建货币管理器
func NewCurrencyManager() *CurrencyManager {
    m := &CurrencyManager{
        currencies: make(map[CurrencyType]*CurrencyInfo),
        balances:   make(map[uint64]*PlayerCurrency),
    }
    
    // 初始化货币定义
    m.currencies[CurrencyGold] = &CurrencyInfo{
        Type: CurrencyGold, Name: "金币", MaxStorage: 999999999,
        MaxDailyGain: 100000, CanExchange: false,
    }
    m.currencies[CurrencyDiamond] = &CurrencyInfo{
        Type: CurrencyDiamond, Name: "钻石", MaxStorage: 999999,
        MaxDailyGain: 999999, CanExchange: true, ExchangeRate: 10,
    }
    
    return m
}

// AddCurrency 增加货币
func (m *CurrencyManager) AddCurrency(playerID uint64, ctype CurrencyType, amount int64, source string) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    info := m.currencies[ctype]
    if info == nil {
        return fmt.Errorf("未知货币类型")
    }
    
    pc := m.getPlayerCurrency(playerID)
    
    // 检查每日获取限制
    if amount > 0 && pc.DailyGain[ctype]+amount > info.MaxDailyGain {
        return fmt.Errorf("今日获取已达上限")
    }
    
    // 检查存储上限
    newBalance := pc.Balances[ctype] + amount
    if newBalance > info.MaxStorage {
        return fmt.Errorf("货币数量已达上限")
    }
    
    if newBalance < 0 {
        return fmt.Errorf("货币不足")
    }
    
    pc.Balances[ctype] = newBalance
    if amount > 0 {
        pc.DailyGain[ctype] += amount
    }
    
    // 记录流水
    logCurrencyTransaction(playerID, ctype, amount, source, newBalance)
    
    return nil
}

// SpendCurrency 消耗货币
func (m *CurrencyManager) SpendCurrency(playerID uint64, ctype CurrencyType, amount int64, source string) error {
    return m.AddCurrency(playerID, ctype, -amount, source)
}

// GetBalance 获取余额
func (m *CurrencyManager) GetBalance(playerID uint64, ctype CurrencyType) int64 {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    pc := m.balances[playerID]
    if pc == nil {
        return 0
    }
    return pc.Balances[ctype]
}

// ExchangeCurrency 兑换货币
func (m *CurrencyManager) ExchangeCurrency(playerID uint64, fromType, toType CurrencyType, fromAmount int64) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    fromInfo := m.currencies[fromType]
    toInfo := m.currencies[toType]
    
    if !fromInfo.CanExchange || !toInfo.CanExchange {
        return fmt.Errorf("该货币不可兑换")
    }
    
    toAmount := int64(float64(fromAmount) * fromInfo.ExchangeRate / toInfo.ExchangeRate)
    
    pc := m.getPlayerCurrency(playerID)
    
    if pc.Balances[fromType] < fromAmount {
        return fmt.Errorf("货币不足")
    }
    
    pc.Balances[fromType] -= fromAmount
    pc.Balances[toType] += toAmount
    
    return nil
}

// ResetDailyGain 重置每日获取量（每日凌晨执行）
func (m *CurrencyManager) ResetDailyGain() {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    today := time.Now().Format("2006-01-02")
    
    for _, pc := range m.balances {
        if pc.LastResetDay != today {
            for ctype := range pc.DailyGain {
                pc.DailyGain[ctype] = 0
            }
            pc.LastResetDay = today
        }
    }
}
```

## 17. 数据浏览工具（Game Data Browsing / Query Tools）

数据浏览工具供运营和开发人员查看游戏数据，用于分析和排查问题。

### 17.1 数据查询接口

```go
// DataQueryService 数据查询服务
type DataQueryService struct {
    db     *sql.DB
    cache  *redis.Client
}

// PlayerQuery 玩家数据查询
type PlayerQuery struct {
    PlayerID   uint64
    AccountID  uint64
    Name       string
    Level      int
    Gold       int64
    Diamonds   int64
    LoginCount int
    LastLogin  time.Time
    IP         string
    DeviceID   string
    BanStatus  string
    Notes      string  // GM备注
}

// QueryPlayer 查询玩家信息
func (s *DataQueryService) QueryPlayer(query string) ([]*PlayerQuery, error) {
    // 支持按ID、账号、名字查询
    sql := `SELECT id, account_id, name, level, gold, diamonds, 
            login_count, last_login, ip, device_id, ban_status, notes
            FROM players WHERE `
    
    var args []interface{}
    if id, err := strconv.ParseUint(query, 10, 64); err == nil {
        sql += "id = ?"
        args = append(args, id)
    } else {
        sql += "name LIKE ? OR account_id = ?"
        args = append(args, "%"+query+"%", query)
    }
    
    rows, err := s.db.Query(sql, args...)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var results []*PlayerQuery
    for rows.Next() {
        var p PlayerQuery
        rows.Scan(&p.PlayerID, &p.AccountID, &p.Name, &p.Level,
            &p.Gold, &p.Diamonds, &p.LoginCount, &p.LastLogin,
            &p.IP, &p.DeviceID, &p.BanStatus, &p.Notes)
        results = append(results, &p)
    }
    
    return results, nil
}

// ItemQuery 道具查询
type ItemQuery struct {
    PlayerID  uint64
    ItemID    uint64
    ItemType  string
    ItemName  string
    Count     int
    AcquiredAt time.Time
    Source    string  // 获取途径
}

// QueryPlayerItems 查询玩家道具
func (s *DataQueryService) QueryPlayerItems(playerID uint64) ([]*ItemQuery, error) {
    sql := `SELECT player_id, item_id, item_type, item_name, count, acquired_at, source
            FROM inventory WHERE player_id = ? ORDER BY acquired_at DESC`
    
    rows, err := s.db.Query(sql, playerID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var results []*ItemQuery
    for rows.Next() {
        var item ItemQuery
        rows.Scan(&item.PlayerID, &item.ItemID, &item.ItemType,
            &item.ItemName, &item.Count, &item.AcquiredAt, &item.Source)
        results = append(results, &item)
    }
    
    return results, nil
}

// TransactionLog 交易日志
type TransactionLog struct {
    ID        uint64
    PlayerID  uint64
    Type      string  // gold, diamond, item
    Amount    int64
    Before    int64
    After     int64
    Source    string  // shop, quest, battle, etc.
    Timestamp time.Time
}

// QueryTransactions 查询交易记录
func (s *DataQueryService) QueryTransactions(playerID uint64, txType string, limit int) ([]*TransactionLog, error) {
    sql := `SELECT id, player_id, type, amount, before_balance, after_balance, 
            source, timestamp FROM transaction_logs 
            WHERE player_id = ? AND type = ? 
            ORDER BY timestamp DESC LIMIT ?`
    
    rows, err := s.db.Query(sql, playerID, txType, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var results []*TransactionLog
    for rows.Next() {
        var tx TransactionLog
        rows.Scan(&tx.ID, &tx.PlayerID, &tx.Type, &tx.Amount,
            &tx.Before, &tx.After, &tx.Source, &tx.Timestamp)
        results = append(results, &tx)
    }
    
    return results, nil
}

// 统计数据查询
type GameStats struct {
    TotalPlayers    int64
    OnlinePlayers   int64
    DailyActive     int64
    MonthlyActive   int64
    NewPlayers      int64
    RetentionRate   float64
    AveragePlayTime float64
    Revenue         float64
}

// GetGameStats 获取游戏统计数据
func (s *DataQueryService) GetGameStats() (*GameStats, error) {
    stats := &GameStats{}
    
    // 今日活跃
    s.db.QueryRow(`SELECT COUNT(DISTINCT player_id) FROM login_logs 
        WHERE DATE(login_time) = CURDATE()`).Scan(&stats.DailyActive)
    
    // 本月活跃
    s.db.QueryRow(`SELECT COUNT(DISTINCT player_id) FROM login_logs 
        WHERE login_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`).Scan(&stats.MonthlyActive)
    
    // 新增玩家
    s.db.QueryRow(`SELECT COUNT(*) FROM players 
        WHERE DATE(created_at) = CURDATE()`).Scan(&stats.NewPlayers)
    
    // 留存率
    s.db.QueryRow(`SELECT COUNT(DISTINCT l2.player_id) * 1.0 / 
        (SELECT COUNT(*) FROM players WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY))
        FROM login_logs l1 JOIN login_logs l2 ON l1.player_id = l2.player_id
        WHERE DATE(l1.login_time) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        AND DATE(l2.login_time) = CURDATE()`).Scan(&stats.RetentionRate)
    
    return stats, nil
}
```

## 18. 敏感词过滤（Sensitive Word Filtering）

敏感词过滤系统用于屏蔽不当言论，维护游戏环境。

### 18.1 过滤算法

```go
// SensitiveWordFilter 敏感词过滤器
type SensitiveWordFilter struct {
    trie      *Trie       // AC自动机或Trie树
    whitelist map[string]bool
    mu        sync.RWMutex
}

// Trie 节点
type Trie struct {
    children map[rune]*Trie
    isEnd    bool
    word     string
    category string  // 词类别：色情、暴力、广告等
}

// NewTrie 创建Trie节点
func NewTrie() *Trie {
    return &Trie{children: make(map[rune]*Trie)}
}

// Insert 插入敏感词
func (t *Trie) Insert(word string, category string) {
    node := t
    for _, ch := range word {
        if _, ok := node.children[ch]; !ok {
            node.children[ch] = NewTrie()
        }
        node = node.children[ch]
    }
    node.isEnd = true
    node.word = word
    node.category = category
}

// Search 搜索文本中的敏感词
func (t *Trie) Search(text string) []*SensitiveWord {
    var results []*SensitiveWord
    runes := []rune(text)
    
    for i := 0; i < len(runes); i++ {
        node := t
        j := i
        for j < len(runes) {
            child, ok := node.children[runes[j]]
            if !ok {
                break
            }
            node = child
            if node.isEnd {
                results = append(results, &SensitiveWord{
                    Word:     node.word,
                    Category: node.category,
                    Start:    i,
                    End:      j + 1,
                })
            }
            j++
        }
    }
    
    return results
}

// SensitiveWord 敏感词匹配结果
type SensitiveWord struct {
    Word     string
    Category string
    Start    int
    End      int
}

// NewSensitiveWordFilter 创建敏感词过滤器
func NewSensitiveWordFilter() *SensitiveWordFilter {
    f := &SensitiveWordFilter{
        trie:      NewTrie(),
        whitelist: make(map[string]bool),
    }
    
    // 加载敏感词库
    f.LoadWordList("sensitive_words.txt")
    
    return f
}

// LoadWordList 加载敏感词列表
func (f *SensitiveWordFilter) LoadWordList(filename string) error {
    file, err := os.Open(filename)
    if err != nil {
        return err
    }
    defer file.Close()
    
    scanner := bufio.NewScanner(file)
    for scanner.Scan() {
        line := scanner.Text()
        parts := strings.SplitN(line, "\t", 2)
        word := parts[0]
        category := "general"
        if len(parts) > 1 {
            category = parts[1]
        }
        
        f.trie.Insert(word, category)
    }
    
    return scanner.Err()
}

// Filter 过滤文本
func (f *SensitiveWordFilter) Filter(text string) (string, bool) {
    f.mu.RLock()
    defer f.mu.RUnlock()
    
    matches := f.trie.Search(text)
    
    if len(matches) == 0 {
        return text, false
    }
    
    runes := []rune(text)
    filtered := make([]rune, len(runes))
    copy(filtered, runes)
    
    for _, match := range matches {
        // 检查白名单
        if f.whitelist[match.Word] {
            continue
        }
        
        // 替换为星号
        for i := match.Start; i < match.End; i++ {
            filtered[i] = '*'
        }
    }
    
    return string(filtered), true
}

// AddToWhitelist 添加白名单
func (f *SensitiveWordFilter) AddToWhitelist(word string) {
    f.mu.Lock()
    defer f.mu.Unlock()
    f.whitelist[word] = true
}

// FilterSensitiveWords 全局敏感词过滤函数
var globalFilter *SensitiveWordFilter

func FilterSensitiveWords(text string) (string, error) {
    if globalFilter == nil {
        return text, nil
    }
    
    filtered, found := globalFilter.Filter(text)
    if found {
        return filtered, fmt.Errorf("包含敏感词")
    }
    return text, nil
}

// AC自动机优化版本（用于大规模词库）
type ACAutomaton struct {
    root     *Trie
    failLink map[*Trie]*Trie  // 失败指针
    output   map[*Trie][]*Trie // 输出指针
}

// BuildACAutomaton 构建AC自动机
func BuildACAutomaton(words []string) *ACAutomaton {
    ac := &ACAutomaton{
        root:     NewTrie(),
        failLink: make(map[*Trie]*Trie),
        output:   make(map[*Trie][]*Trie),
    }
    
    // 1. 构建Trie
    for _, word := range words {
        ac.root.Insert(word, "general")
    }
    
    // 2. BFS构建失败指针
    queue := []*Trie{ac.root}
    ac.failLink[ac.root] = ac.root
    
    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]
        
        for ch, child := range node.children {
            fail := ac.failLink[node]
            for fail != ac.root {
                if _, ok := fail.children[ch]; ok {
                    break
                }
                fail = ac.failLink[fail]
            }
            if f, ok := fail.children[ch]; ok && f != child {
                ac.failLink[child] = f
            } else {
                ac.failLink[child] = ac.root
            }
            queue = append(queue, child)
        }
    }
    
    return ac
}

// Match 使用AC自动机匹配
func (ac *ACAutomaton) Match(text string) []*SensitiveWord {
    var results []*SensitiveWord
    node := ac.root
    
    for i, ch := range text {
        for node != ac.root {
            if _, ok := node.children[ch]; ok {
                break
            }
            node = ac.failLink[node]
        }
        
        if child, ok := node.children[ch]; ok {
            node = child
        } else {
            node = ac.root
        }
        
        // 检查输出
        temp := node
        for temp != ac.root {
            if temp.isEnd {
                results = append(results, &SensitiveWord{
                    Word:     temp.word,
                    Category: temp.category,
                    Start:    i - len([]rune(temp.word)) + 1,
                    End:      i + 1,
                })
            }
            temp = ac.failLink[temp]
        }
    }
    
    return results
}
```

### 18.2 变体检测

```go
// VariantDetector 变体检测器
// 检测玩家通过谐音、拼音、符号等方式绕过敏感词过滤
type VariantDetector struct {
    homophoneMap map[rune][]rune  // 谐音映射：如 "草" -> ["操", "曹"]
    symbolMap    map[string]rune  // 符号映射：如 "@" -> "a"
}

// ExpandVariants 展开通配符变体
func (d *VariantDetector) ExpandVariants(text string) []string {
    runes := []rune(text)
    results := []string{""}
    
    for _, ch := range runes {
        var variants []rune
        
        // 原始字符
        variants = append(variants, ch)
        
        // 谐音变体
        if homophones, ok := d.homophoneMap[ch]; ok {
            variants = append(variants, homophones...)
        }
        
        // 符号变体
        for symbol, replacement := range d.symbolMap {
            if replacement == ch {
                variants = append(variants, []rune(symbol)...)
            }
        }
        
        // 展开
        var newResults []string
        for _, prefix := range results {
            for _, v := range variants {
                newResults = append(newResults, prefix+string(v))
            }
        }
        results = newResults
    }
    
    return results
}

// IsVariant 检查文本是否是已知敏感词的变体
func (d *VariantDetector) IsVariant(text string, filter *SensitiveWordFilter) bool {
    variants := d.ExpandVariants(text)
    for _, v := range variants {
        if _, found := filter.Filter(v); found {
            return true
        }
    }
    return false
}
```

## 19. P2P 与 C/S 架构下的辅助系统差异

### 19.1 架构对比

| 系统 | P2P 模式 | C/S 模式 |
|------|---------|---------|
| 匹配 | 客户端直连匹配服务器 | 匹配服务器集中管理 |
| 大厅 | 分布式房间列表 | 集中式房间管理 |
| 中继 | 必须部署 TURN 服务器 | 服务器天然可中继 |
| 聊天 | P2P 消息传递 | 服务器转发 |
| 好友 | 本地缓存 + 同步 | 服务器集中存储 |
| 成就 | 客户端记录 + 服务器验证 | 服务器完全控制 |
| 排行榜 | 需要中心化服务器 | 服务器直接管理 |
| 支付 | 必须通过服务器 | 服务器处理 |

### 19.2 P2P 模式下的特殊考虑

```go
// P2PAuxiliaryManager P2P 辅助系统管理
type P2PAuxiliaryManager struct {
    localState    *LocalState    // 本地状态
    syncService   *SyncService   // 状态同步服务
    conflictResolver *ConflictResolver // 冲突解决器
}

// LocalState 本地状态
type LocalState struct {
    Achievements  map[uint64]*PlayerAchievement
    Friends       []*FriendRelation
    Mailbox       []*GameMail
    Leaderboard   *Leaderboard
}

// SyncService 状态同步服务
type SyncService struct {
    peers       map[uint64]*PeerConnection
    syncQueue   chan *SyncTask
    mu          sync.RWMutex
}

// SyncTask 同步任务
type SyncTask struct {
    Type     string  // achievement, friend, mail, etc.
    Data     []byte
    Priority int
}

// ConflictResolver 冲突解决器
type ConflictResolver struct {
    strategies map[string]ResolveStrategy
}

// ResolveStrategy 冲突解决策略
type ResolveStrategy int

const (
    ResolveLatestWins ResolveStrategy = iota // 最新的赢
    ResolveMerge                             // 合并
    ResolveServerWins                        // 服务器赢
    ResolvePlayerWins                        // 玩家赢
)

// 解决成就同步冲突
func (cr *ConflictResolver) ResolveAchievementConflict(
    local, remote *PlayerAchievement) *PlayerAchievement {
    
    if local.Progress > remote.Progress {
        return local  // 本地进度更高，保留本地
    }
    if remote.Progress > local.Progress {
        return remote  // 远程进度更高，使用远程
    }
    
    // 进度相同，使用更新时间
    if local.UnlockedAt != nil && remote.UnlockedAt != nil {
        if local.UnlockedAt.After(*remote.UnlockedAt) {
            return local
        }
        return remote
    }
    
    return local
}
```

## 20. 辅助系统最佳实践

### 20.1 系统设计原则

1. **松耦合**：辅助系统之间应该通过事件总线或消息队列通信，避免直接依赖
2. **可扩展**：新系统应该能够轻松接入，不影响现有系统
3. **高可用**：辅助系统故障不应影响核心游戏逻辑
4. **数据一致性**：关键数据（货币、道具）必须保证强一致性
5. **性能优先**：高频操作（聊天、状态更新）要低延迟

### 20.2 性能优化

```go
// 辅助系统性能优化策略

// 1. 批量处理
// 将多次小操作合并为一次批量操作
type BatchProcessor struct {
    buffer    []*Operation
    batchSize int
    flushInterval time.Duration
}

// 2. 读写分离
// 高频读操作走缓存，写操作走数据库
type ReadWriteSplitter struct {
    readCache   *redis.Client
    writeDB     *sql.DB
}

// 3. 异步处理
// 非关键操作异步执行
type AsyncExecutor struct {
    workers    int
    taskQueue  chan *Task
}

// 4. 预计算
// 提前计算排行榜、统计数据等
type PrecomputeEngine struct {
    scheduler *cron.Cron
}
```

### 20.3 监控和告警

```go
// SystemMonitor 系统监控
type SystemMonitor struct {
    metrics map[string]*Metric
}

// Metric 指标
type Metric struct {
    Name      string
    Value     float64
    Timestamp time.Time
    Labels    map[string]string
}

// 监控指标示例
var SystemMetrics = map[string]string{
    "match_queue_size":      "匹配队列长度",
    "match_wait_time":       "匹配等待时间",
    "chat_messages_per_sec": "每秒聊天消息数",
    "online_players":        "在线玩家数",
    "memory_usage":          "内存使用率",
    "cpu_usage":             "CPU使用率",
}
```

## 21. 本章小结

辅助系统虽然不直接参与游戏战斗，但它们是玩家体验的基石：

- **匹配系统**通过 Elo/Glicko-2 算法确保公平对局
- **游戏大厅**提供房间管理和社交空间
- **中继服务器**解决 P2P NAT 穿透问题
- **聊天系统**支持多种频道和消息类型
- **好友系统**管理玩家社交关系
- **锁服务器**防止账号多设备登录
- **成就系统**提供长期目标和成就感
- **存储系统**通过分层架构平衡性能和可靠性
- **排行榜**激发玩家竞争欲望
- **支付和货币系统**支撑游戏商业模式
- **敏感词过滤**维护健康游戏环境

这些系统看似独立，实际上紧密交织。设计时要考虑系统间的协作关系，确保整体架构的可扩展性和可维护性。

---

> 本章基于《网络游戏核心技术与实战》（中嶋谦互）第6章内容，结合实际工程实践编写。辅助系统的设计需要根据具体游戏类型和规模进行调整，没有放之四海而皆准的方案。
