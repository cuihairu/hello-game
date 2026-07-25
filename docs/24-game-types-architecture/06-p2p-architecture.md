# P2P 架构与网络对战

本章基于《网络游戏核心技术与实战》（中嶋谦互）第5章关于P2P架构的论述，对比C/S架构，深入分析NAT穿越、共享内存与RPC模型、竞态条件处理以及中继服务器设计。

## 1. P2P vs C/S 架构对比

### 1.1 架构模型概览

```
C/S（客户端-服务器）架构：
┌────────┐      ┌─────────────────────┐      ┌────────┐
│ 客户端A │ ←──→ │      服务端          │ ←──→ │ 客户端B │
└────────┘      │  (权威判定中心)      │      └────────┘
                │  (状态持久化)        │
                │  (反作弊校验)        │
                └─────────────────────┘

P2P（点对点）架构：
┌────────┐      直连/穿越       ┌────────┐
│ 客户端A │ ←─────────────────→ │ 客户端B │
└────────┘                      └────────┘
      ↕           ↕
┌────────┐              ┌────────┐
│ 客户端C │ ←──────────→ │ 客户端D │
└────────┘              └────────┘
```

### 1.2 详细对比

| 特性 | C/S 架构 | P2P 架构 |
|------|---------|---------|
| **权威方** | 服务端（单一权威） | 任一客户端（去中心化） |
| **延迟** | 客户端→服务器→客户端（双跳） | 客户端↔客户端（单跳） |
| **带宽成本** | 高（服务端承担所有转发） | 低（客户端直连） |
| **服务器成本** | 高（需大量服务器） | 低（仅需协调服务器） |
| **反作弊** | 容易（服务端权威校验） | 困难（客户端互相校验） |
| **作弊风险** | 低 | 高（需额外防护） |
| **扩展性** | 水平扩展（加服务器） | 受限于单局玩家数 |
| **公平性** | 高（统一判定） | 低（网络延迟差异大） |
| **可靠性** | 高（服务端保证） | 低（任一玩家掉线影响全局） |
| **适用场景** | MMO、MOBA、FPS（竞技） | 格斗、赛车、休闲对战 |

### 1.3 混合架构（Hybrid）

```
混合模型：P2P 直连 + 协调服务器

┌────────┐                    ┌────────┐
│ 玩家A   │ ←─── 游戏数据 ──→ │ 玩家B   │
│ (Host)  │                   │(Client) │
└────┬───┘                    └────┬───┘
     │     P2P 直连通道            │
     └────────────────────────────┘
              ↕
        ┌──────────┐
        │ 协调服务器 │
        │ (匹配/   │
        │  房间管理)│
        └──────────┘

职责分离：
├─ 协调服务器：匹配、房间创建、NAT穿越协调、断线重连
├─ Host（主玩家）：游戏逻辑执行、状态广播
└─ Client（从玩家）：输入上报、本地渲染
```

---

## 2. NAT 穿越（NAT Traversal）

### 2.1 NAT 类型与可达性矩阵

```
NAT 类型定义：
├─ Full Cone（完全锥形）：任意外部IP可访问映射端口
├─ Restricted Cone（受限锥形）：只有内部主动连接过的IP可访问
├─ Port Restricted Cone（端口受限锥形）：只有内部主动连接过的IP:Port可访问
└─ Symmetric（对称型）：每次连接映射不同端口，最严格

可达性矩阵（行→列能否直连）：
         ┌──────┬──────┬──────┬──────┐
         │Full  │Restr │PortR │Symm  │
├────────┼──────┼──────┼──────┼──────┤
│Full    │  ✓   │  ✓   │  ✓   │  ✓   │
│Restr   │  ✓   │  ✓   │  ✓   │  ✗   │
│PortR   │  ✓   │  ✓   │  ✗*  │  ✗   │
│Symm    │  ✓   │  ✗   │  ✗   │  ✗   │
└────────┴──────┴──────┴──────┴──────┘
* 需要端口预测，成功率有限
```

### 2.2 STUN（Session Traversal Utilities for NAT）

```
STUN 工作流程：

1. 客户端向 STUN 服务器发送 Binding Request
2. STUN 服务器从公网端口返回客户端的公网映射地址
3. 客户端获知自己的 NAT 类型和公网 IP:Port

客户端                    STUN服务器
  │                          │
  │── Binding Request ──────→│
  │   (含 XOR-MAPPED-ADDR)  │
  │                          │
  │←── Binding Response ────│
  │   (含公网映射地址)       │
  │                          │
  │── Binding Request ──────→│ (从不同端口，测试对称型)
  │                          │
  │←── Binding Response ────│
  │   (比较两次返回地址)      │
  │   相同→非对称型           │
  │   不同→对称型            │
```

**STUN 客户端实现**：

```go
type STUNClient struct {
    serverAddr string
    conn       *net.UDPConn
}

type NATInfo struct {
    PublicIP    net.IP
    PublicPort  int
    NATType     NATType
}

func (c *STUNClient) Discover() (*NATInfo, error) {
    // 发送 Binding Request
    req := buildBindingRequest()
    c.conn.WriteToUDP(req, c.serverAddr)

    // 接收响应
    buf := make([]byte, 1500)
    n, _, err := c.conn.ReadFromUDP(buf)
    if err != nil {
        return nil, err
    }

    // 解析公网映射地址
    pubIP, pubPort := parseXORMappedAddr(buf[:n])

    // 检测 NAT 类型（通过比较不同源端口的映射）
    natType := c.detectNATType(pubIP, pubPort)

    return &NATInfo{
        PublicIP:   pubIP,
        PublicPort: pubPort,
        NATType:    natType,
    }, nil
}
```

### 2.3 TURN（Traversal Using Relays around NAT）

```
TURN 工作流程：

当 NAT 穿越失败时，使用 TURN 中继：

客户端A ──── TURN服务器 ──── 客户端B
           (转发所有数据)

客户端A 连接 TURN 服务器
├─ 分配中继地址（relay address）
├─ 绑定端口
└─ 通过中继地址转发给客户端B

缺点：
├─ 增加延迟（经过中继）
├─ 带宽成本高（所有流量经中继）
└─ 服务器负载高
```

### 2.4 ICE（Interactive Connectivity Establishment）

```
ICE 完整流程：

1. 收集候选地址（Candidates）
├─ Host Candidate：本地网络地址
├─ Server Reflexive：STUN 获取的公网地址
└─ Relay Candidate：TURN 分配的中继地址

2. 交换候选地址（通过信令服务器 SDP）
├─ Offer/Answer 模型
└─ 包含所有候选地址对

3. 连通性检查（STUN Binding）
├─ 对每对候选地址发送 STUN 检查
├─ 优先级：Host > ServerReflexive > Relay
└─ 选择最先成功的路径

4. 建立连接
├─ 使用最优路径通信
├─ 备用路径用于切换（如WiFi→4G）
└─ 持续检测连接质量
```

---

## 3. 共享内存 vs RPC

### 3.1 模型对比

```
共享内存模型（Shared Memory）：
┌─────────────────────────────────────┐
│           共享内存区域               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │玩家1│ │玩家2│ │玩家3│ │怪物 │  │
│  │状态 │ │状态 │ │状态 │ │状态 │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
│                                     │
│  所有进程直接读写同一块内存          │
│  需要锁机制保证一致性                │
└─────────────────────────────────────┘

RPC 模型（Remote Procedure Call）：
┌────────┐    请求/响应     ┌────────┐
│客户端 A │ ←─────────────→ │服务端  │
└────────┘                  └────────┘
       ↕                      ↕
┌────────┐                ┌────────┐
│客户端 B │ ←─────────────→ │服务端  │
└────────┘                  └────────┘
   所有操作通过网络调用
   天然隔离，无共享状态
```

### 3.2 特性对比

| 特性 | 共享内存 | RPC |
|------|---------|-----|
| **延迟** | 极低（纳秒级） | 较高（毫秒级） |
| **一致性** | 需手动保证 | 框架保证 |
| **隔离性** | 差（一个进程崩溃影响全局） | 好（进程隔离） |
| **可扩展性** | 有限（受内存限制） | 好（可水平扩展） |
| **实现复杂度** | 中等（需处理锁） | 高（序列化、网络） |
| **适用场景** | 单机多进程、高性能 | 分布式系统、微服务 |

### 3.3 游戏中的混合使用

```
实际游戏项目通常混合使用两种模型：

进程内：共享内存 / 对象引用
├─ 同一进程内的不同系统间通信
├─ 主线程与渲染线程间的状态共享
└─ 缓存层与逻辑层间的数据传递

进程间：RPC / 消息队列
├─ 登录服务器 ↔ 游戏服务器
├─ 游戏服务器 ↔ 数据库服务器
├─ 不同场景服务器间的跨服操作
└─ 微服务间通信
```

**共享内存竞态保护实现**：

```go
type SharedWorld struct {
    mu       sync.RWMutex
    entities map[uint64]*Entity
    players  map[uint64]*Player
}

// 读操作：允许多个读取者并发
func (w *SharedWorld) GetEntity(id uint64) *Entity {
    w.mu.RLock()
    defer w.mu.RUnlock()
    return w.entities[id]
}

// 写操作：独占锁
func (w *SharedWorld) UpdateEntity(id uint64, state EntityState) {
    w.mu.Lock()
    defer w.mu.Unlock()
    w.entities[id].State = state
}

// 批量读写：读-修改-写
func (w *SharedWorld) BatchUpdate(updates map[uint64]EntityState) {
    w.mu.Lock()
    defer w.mu.Unlock()
    for id, state := range updates {
        w.entities[id].State = state
    }
}
```

---

## 4. 竞态条件处理

### 4.1 P2P 中的竞态条件来源

```
竞态条件场景：

场景1：双客户端同时攻击
├─ 玩家A 在帧5 发出攻击指令
├─ 玩家B 在帧5 也发出攻击指令
├─ 两个攻击同时到达，如何判定先后？
└─ 不同客户端可能有不同判定结果 → 不同步

场景2：资源争夺
├─ 玩家A 和玩家B 同时拾取一个道具
├─ 两人都认为自己拿到了
└─ 道具消失但两人都没有 → 数据不一致

场景3：网络延迟差异
├─ 玩家A（50ms）在帧5 发出移动
├─ 玩家B（150ms）在帧5 发出移动
├─ A的输入先到达 Host
├─ 如果 A 先执行，A 有优势
└─ 公平性受损
```

### 4.2 解决方案：确定性锁步同步

```
确定性锁步同步（Deterministic Lockstep）：

核心思想：
├─ 所有客户端执行完全相同的输入序列
├─ 只要计算逻辑确定性，结果必然一致
└─ 客户端不需要网络状态，只需输入序列

帧管理流程：
1. 各客户端输入发送到 Host
2. Host 等待所有玩家输入（超时则补空输入）
3. Host 将完整帧输入广播给所有客户端
4. 所有客户端在该帧执行相同的输入
5. 进入下一帧
```

```go
type LockstepManager struct {
    currentFrame    uint32
    frameInputs     map[uint32][]PlayerInput
    waitingInputs   map[uint32]map[uint64]bool // 帧→玩家→是否已收到
    playerCount     int
    frameTimeout    time.Duration
    inputBuffer     chan PlayerInput
}

func (m *LockstepManager) OnPlayerInput(playerID uint64, input PlayerInput) {
    input.Frame = m.currentFrame
    m.frameInputs[m.currentFrame] = append(m.frameInputs[m.currentFrame], input)
    m.waitingInputs[m.currentFrame][playerID] = true
}

func (m *LockstepManager) TryAdvanceFrame() bool {
    // 检查当前帧是否收齐所有输入
    for pid := range m.waitingInputs[m.currentFrame] {
        if !m.waitingInputs[m.currentFrame][pid] {
            return false // 还有玩家输入未到
        }
    }

    // 收齐，广播帧数据
    frameData := FrameData{
        Frame:   m.currentFrame,
        Inputs:  m.frameInputs[m.currentFrame],
    }
    m.broadcast(frameData)

    // 准备下一帧
    m.currentFrame++
    m.waitingInputs[m.currentFrame] = make(map[uint64]bool)
    for pid := range m.waitingInputs[m.currentFrame-1] {
        m.waitingInputs[m.currentFrame][pid] = false
    }

    return true
}

// 超时处理：为未输入的玩家补空输入
func (m *LockstepManager) OnTimeout() {
    frame := m.currentFrame
    for pid := range m.waitingInputs[frame] {
        if !m.waitingInputs[frame][pid] {
            m.frameInputs[frame] = append(m.frameInputs[frame], PlayerInput{
                PlayerID: pid,
                Frame:    frame,
                Empty:    true, // 空输入，表示该玩家未操作
            })
            m.waitingInputs[frame][pid] = true
        }
    }
}
```

### 4.3 客户端预测与回滚

```
客户端预测（Client Prediction）：

不等待服务端确认，先在本地执行，再校正：

┌─────────────────────────────────────────────┐
│  时间线                                      │
│  ├─ T0: 玩家按下移动键                       │
│  ├─ T1: 本地立即执行移动（预测）              │
│  ├─ T2: 发送输入给服务端/Host                │
│  ├─ T3: 收到服务端确认（可能不同）           │
│  └─ T4: 如有差异 → 回滚到T0 → 用确认结果重演│
└─────────────────────────────────────────────┘
```

```go
type ClientPrediction struct {
    localState    EntityState
    inputHistory  []PlayerInput
    pendingInputs []PlayerInput  // 等待确认的输入
}

func (cp *ClientPrediction) ApplyInput(input PlayerInput) {
    // 1. 立即本地执行
    cp.localState = cp.predictNextState(cp.localState, input)
    cp.inputHistory = append(cp.inputHistory, input)

    // 2. 发送到服务端
    cp.sendToServer(input)

    // 3. 保存到待确认队列
    cp.pendingInputs = append(cp.pendingInputs, input)
}

func (cp *ClientPrediction) OnServerConfirm(serverState EntityState, confirmedFrame uint32) {
    // 1. 移除已确认的输入
    cp.pendingInputs = cp.removeConfirmedInputs(confirmedFrame)

    // 2. 对比本地预测与服务端结果
    if !cp.statesMatch(cp.localState, serverState) {
        // 3. 回滚：从服务端状态开始，重放未确认的输入
        cp.localState = serverState
        for _, input := range cp.pendingInputs {
            cp.localState = cp.predictNextState(cp.localState, input)
        }
    }
}
```

### 4.4 Lag Compensation（延迟补偿）

```
延迟补偿：服务端回退时间验证客户端操作

场景：玩家A（150ms延迟）射击玩家B

时间线：
├─ T0: 玩家A 在本地看到玩家B的位置 P0
├─ T1: 玩家A 发射子弹（本地判断命中）
├─ T2: 子弹数据到达服务端（此时B已移动到 P1）
├─ T3: 服务端需要回退到 T0 验证：
│      ├─ 将所有实体状态回退到 T0 时刻
│      ├─ 在 T0 的状态下判断子弹是否命中
│      └─ 如命中 → 判定有效
└─ T4: 恢复当前状态，应用伤害

注意：延迟补偿有上限（如150ms），超过则不回退
```

```go
type LagCompensation struct {
    maxRewindTime time.Duration
    stateHistory  *StateHistory // 状态快照历史
}

func (lc *LagCompensation) RewindToTime(targetTime time.Time) *WorldSnapshot {
    return lc.stateHistory.GetSnapshotAt(targetTime)
}

func (lc *LagCompensation) CheckHit(
    shooter *Player,
    hitPos Vector3,
    latency time.Duration,
) bool {
    // 1. 计算回退时间（射击时刻 = 当前时刻 - 延迟）
    rewindTime := time.Now().Add(-latency)

    // 2. 检查是否在允许范围内
    if time.Since(rewindTime) > lc.maxRewindTime {
        return false // 延迟过大，不补偿
    }

    // 3. 获取回退时刻的世界快照
    snapshot := lc.RewindToTime(rewindTime)

    // 4. 在快照状态下判断命中
    for _, entity := range snapshot.Entities {
        if entity.Type == EntityTypePlayer && entity.ID != shooter.ID {
            if entity.Bounds.Contains(hitPos) {
                return true
            }
        }
    }
    return false
}
```

---

## 5. 中继服务器（Relay Server）

### 5.1 中继服务器的作用

```
中继服务器在 P2P 架构中的位置：

场景1：NAT 穿越失败
├─ 客户端A（Symmetric NAT）
├─ 客户端B（Symmetric NAT）
├─ 无法直连 → 通过中继服务器转发

场景2：优化路由
├─ 客户端A（中国）
├─ 客户端B（美国）
├─ 直连延迟高 → 通过就近中继节点降低延迟

场景3：防作弊辅助
├─ 所有数据经过中继服务器
├─ 服务器可以做日志审计
└─ 可以做简单的完整性校验
```

### 5.2 中继服务器架构

```
                    ┌──────────────────┐
                    │   协调服务器      │
                    │  (匹配/房间管理)  │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │   中继集群        │
                    │                   │
              ┌─────┴─────┐     ┌──────┴─────┐
              │ 中继节点1  │     │ 中继节点2   │
              │ (华东)     │     │ (华南)      │
              └─────┬─────┘     └──────┬─────┘
                    │                   │
        ┌───────┬───┘                   └───┬───────┐
        │       │                           │       │
   ┌────┴──┐ ┌──┴───┐                 ┌───┴──┐ ┌───┴──┐
   │玩家 A │ │玩家 B │                 │玩家C │ │玩家D │
   └───────┘ └──────┘                 └──────┘ └──────┘

路由策略：
├─ 就近分配：根据客户端 IP 分配最近的中继节点
├─ 负载均衡：根据中继节点负载动态分配
├─ 容灾切换：节点故障时自动切换到备用节点
└─ 降级策略：直连优先，失败再走中继
```

### 5.3 中继服务器实现

```go
type RelayServer struct {
    rooms    map[string]*RelayRoom
    listener net.Listener
}

type RelayRoom struct {
    RoomID     string
    Players    map[uint64]*RelayPlayer
    PacketBuf  chan RelayPacket
    mu         sync.RWMutex
}

type RelayPlayer struct {
    PlayerID  uint64
    Conn      net.Conn
    PublicKey []byte // 用于加密
    LastSeen  time.Time
}

type RelayPacket struct {
    FromPlayer uint64
    ToPlayer   uint64   // 0 = 广播给所有玩家
    Data       []byte
    Timestamp  int64
}

func (rs *RelayServer) HandleConnection(conn net.Conn) {
    // 1. 身份验证
    player, err := rs.authenticate(conn)
    if err != nil {
        conn.Close()
        return
    }

    // 2. 加入房间
    room := rs.getOrCreateRoom(player.RoomID)
    room.AddPlayer(player)
    defer room.RemovePlayer(player)

    // 3. 转发循环
    buf := make([]byte, 65535)
    for {
        n, err := conn.Read(buf)
        if err != nil {
            break
        }

        pkt := RelayPacket{
            FromPlayer: player.PlayerID,
            Data:       buf[:n],
            Timestamp:  time.Now().UnixMilli(),
        }

        // 简单转发：发给房间内其他玩家
        room.BroadcastExcept(player.PlayerID, pkt)
    }
}

func (rr *RelayRoom) BroadcastExcept(excludeID uint64, pkt RelayPacket) {
    rr.mu.RLock()
    defer rr.mu.RUnlock()

    for pid, player := range rr.Players {
        if pid != excludeID {
            // 直接转发，不做处理
            player.Conn.Write(pkt.Data)
        }
    }
}
```

### 5.4 中继服务器优化

```
优化策略：

1. 协议优化
├─ 包头压缩（使用 Varint 编码长度）
├─ 批量转发（合并小包，减少系统调用）
├─ 连接复用（多路复用，减少 TCP 连接数）
└─ UDP 中继（对延迟敏感的数据用 UDP）

2. 内存优化
├─ 零拷贝转发（sendfile/splice）
├─ 连接池管理
├─ 缓冲区预分配
└─ GC 调优（减少 STW）

3. 带宽优化
├─ 流量限速（防止单连接占满带宽）
├─ 优先级队列（重要消息优先转发）
├─ 丢包策略（拥塞时丢弃旧包）
└─ 压缩转发（可选的 zlib/zstd 压缩）
```

**带宽限速实现**：

```go
type BandwidthLimiter struct {
    maxBytesPerSec int64
    windowSize     time.Duration
    currentUsage   int64
    windowStart    time.Time
    mu             sync.Mutex
}

func (bl *BandwidthLimiter) Allow(dataSize int) bool {
    bl.mu.Lock()
    defer bl.mu.Unlock()

    now := time.Now()

    // 重置窗口
    if now.Sub(bl.windowStart) > bl.windowSize {
        bl.currentUsage = 0
        bl.windowStart = now
    }

    // 检查是否超限
    if bl.currentUsage+int64(dataSize) > bl.maxBytesPerSec {
        return false // 超限，丢弃该包
    }

    bl.currentUsage += int64(dataSize)
    return true
}
```

---

## 6. P2P 网络对战的完整流程

```
P2P 对战建立流程：

1. 匹配阶段
├─ 玩家A 发起匹配请求
├─ 协调服务器寻找合适的对手
├─ 匹配成功，创建房间
└─ 分配中继节点（备用）

2. NAT 穿越阶段
├─ 各客户端通过 STUN 检测 NAT 类型
├─ 交换候选地址（通过信令服务器 SDP）
├─ ICE 连通性检查
├─ 成功 → 直连建立
└─ 失败 → 降级到 TURN 中继

3. 游戏同步阶段
├─ Host 确定（通常由协调服务器指定或由玩家协商）
├─ 输入同步：客户端 → Host → 广播
├─ 状态同步：Host → 所有客户端
└─ 心跳检测：定期检查连接状态

4. 游戏结束阶段
├─ Host 汇总游戏结果
├─ 上报给协调服务器
├─ 更新排行榜/成就
└─ 释放房间资源

5. 异常处理
├─ 玩家掉线：Host 检测 → 超时判负 → 其他玩家继续
├─ Host 掉线：选举新 Host → 状态恢复
├─ 中继节点故障：切换到备用节点
└─ 全员掉线：房间销毁，判定无效
```

---

## 7. 常见问题与实践建议

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| NAT 穿越成功率低 | Symmetric NAT 普遍 | 部署 TURN 中继作为兜底 |
| 不同步（Desync） | 浮点数精度差异 | 使用定点数 + 确定性数学库 |
| 延迟补偿导致不公平 | 回退时间差异大 | 设置最大补偿时间上限 |
| 中继服务器带宽成本高 | 所有流量经中继 | 直连优先 + 智能降级 |
| 玩家掉线影响所有人 | P2P 无中心权威 | Host 掉线自动迁移 + 超时机制 |
| 作弊检测困难 | 无服务端权威 | 中继服务器日志审计 + 行为分析 |

## 8. 小结

P2P 架构在降低服务器成本方面有显著优势，但需要解决一系列技术挑战：

1. **NAT 穿越是首要挑战**：STUN/TURN/ICE 完整方案是基础
2. **确定性是同步的核心**：定点数 + 确定性数学 + 锁步同步
3. **竞态条件需主动处理**：延迟补偿、客户端预测、状态回滚
4. **中继服务器是必要组件**：即使主要采用 P2P 直连，中继仍是兜底
5. **选择适合的模型**：根据游戏类型在纯 P2P、混合架构、纯 C/S 间权衡
