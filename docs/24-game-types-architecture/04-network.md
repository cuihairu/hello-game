# 通信协议设计

协议设计是网络游戏的"语言"——它决定了客户端和服务器如何对话。设计不当的协议会导致性能瓶颈、安全漏洞，甚至无法支持新功能。本章基于《网络游戏核心技术与实战》（中嶋谦互）的框架，系统讲解协议分类、API 规范、包格式设计，以及压缩加密技术。

## 1. 协议的八种类型

网络游戏中的协议可以按传输方向、可靠性和使用场景分为八种基本类型。

### 1.1 八种类型总览

| 类型 | 方向 | 可靠性 | 典型场景 | 传输层 |
|------|------|--------|---------|--------|
| 请求-响应 | C→S→C | 可靠 | 登录、背包操作、商店购买 | TCP/WebSocket |
| 服务端推送 | S→C | 可靠 | 系统公告、邮件、任务完成 | TCP/WebSocket |
| 广播通知 | S→C | 不可靠 | 聊天消息、世界公告 | UDP |
| 实时同步 | C↔S | 不可靠 | 位置同步、战斗状态 | UDP |
| 心跳包 | C↔S | 不可靠 | 连接保活、延迟探测 | UDP |
| 确认包 | C↔S | 可靠 | 操作确认、数据校验 | TCP |
| 批量同步 | S→C | 可靠 | 登录初始数据、全量同步 | TCP |
| 跨服消息 | S↔S | 可靠 | 跨服匹配、跨服聊天 | gRPC/TCP |

### 1.2 请求-响应协议

最基本的协议模式，客户端发起请求，服务器返回结果。

```
客户端                服务器
  │── 购买请求 ────────→│
  │   {item_id: 1001}   │
  │                     │  处理逻辑
  │←── 购买结果 ────────│
  │   {success: true,   │
  │    item_count: 1}   │
```

```go
// 请求-响应处理器
type RequestResponseHandler struct {
    handlers map[uint32]func(*Player, []byte) ([]byte, error)
}

func (h *RequestResponseHandler) Register(msgID uint32, handler func(*Player, []byte) ([]byte, error)) {
    h.handlers[msgID] = handler
}

func (h *RequestResponseHandler) Handle(player *Player, msgID uint32, payload []byte) {
    handler, ok := h.handlers[msgID]
    if !ok {
        player.SendError(msgID, ErrUnknownMessage)
        return
    }
    
    resp, err := handler(player, payload)
    if err != nil {
        player.SendError(msgID, err)
        return
    }
    
    player.SendResponse(msgID, resp)
}
```

### 1.3 服务端推送协议

服务器主动向客户端发送数据，无需客户端请求。

```go
// 服务端推送管理器
type PushManager struct {
    pushChannels map[uint64]chan *PushMessage  // playerID -> channel
}

type PushMessage struct {
    MsgID   uint32
    Payload []byte
    Priority int  // 优先级：0-普通，1-重要，2-紧急
}

func (m *PushManager) Push(playerID uint64, msg *PushMessage) {
    if ch, ok := m.pushChannels[playerID]; ok {
        select {
        case ch <- msg:
        default:
            // 队列满了，丢弃低优先级消息
            if msg.Priority < 2 {
                log.Warn("push queue full, dropping message", playerID, msg.MsgID)
            }
        }
    }
}

// 推送发送协程
func (m *PushManager) pushLoop(playerID uint64) {
    ch := m.pushChannels[playerID]
    ticker := time.NewTicker(50 * time.Millisecond)  // 50ms 一次批量发送
    
    batch := make([]*PushMessage, 0, 10)
    for {
        select {
        case msg := <-ch:
            batch = append(batch, msg)
            if len(batch) >= 10 {
                m.flushPush(playerID, batch)
                batch = batch[:0]
            }
        case <-ticker.C:
            if len(batch) > 0 {
                m.flushPush(playerID, batch)
                batch = batch[:0]
            }
        }
    }
}
```

### 1.4 实时同步协议

高频、低延迟的位置和状态同步，使用 UDP 传输。

```go
// 实时同步消息（UDP）
type SyncMessage struct {
    PlayerID  uint64
    SeqNum    uint32   // 序列号，用于丢包检测
    Timestamp int64    // 服务端时间戳
    Position  [3]float32
    Rotation  float32
    Velocity  [3]float32
    State     uint8    // 状态标记
}

// 客户端插值补偿
type InterpolationBuffer struct {
    buffer    []SyncMessage
    maxSize   int
    playDelay time.Duration  // 播放延迟
}

func (b *InterpolationBuffer) Add(msg SyncMessage) {
    b.buffer = append(b.buffer, msg)
    if len(b.buffer) > b.maxSize {
        b.buffer = b.buffer[1:]
    }
}

func (b *InterpolationBuffer) GetInterpolated(now time.Time) SyncMessage {
    targetTime := now.Add(-b.playDelay)
    
    // 找到 targetTime 前后的两个快照
    for i := 1; i < len(b.buffer); i++ {
        if b.buffer[i].Timestamp >= targetTime.UnixMilli() {
            prev := b.buffer[i-1]
            curr := b.buffer[i]
            
            // 线性插值
            t := float64(targetTime.UnixMilli()-prev.Timestamp) /
                 float64(curr.Timestamp-prev.Timestamp)
            
            return lerpSyncMessage(prev, curr, t)
        }
    }
    return b.buffer[len(b.buffer)-1]
}
```

### 1.5 心跳协议

连接保活和延迟探测。

```go
type HeartbeatManager struct {
    interval    time.Duration  // 心跳间隔
    timeout     time.Duration  // 超时时间
    players     map[uint64]*HeartbeatState
}

type HeartbeatState struct {
    LastPing     time.Time
    LastPong     time.Time
    PingRTT      time.Duration  // 往返延迟
    MissedBeats  int            // 连续丢失次数
}

func (m *HeartbeatManager) Start() {
    ticker := time.NewTicker(m.interval)
    for range ticker.C {
        for playerID, state := range m.players {
            if time.Since(state.LastPong) > m.timeout {
                // 超时，断开连接
                m.disconnectPlayer(playerID)
                continue
            }
            
            // 发送心跳
            state.LastPing = time.Now()
            m.sendPing(playerID)
        }
    }
}

func (m *HeartbeatManager) HandlePong(playerID uint64) {
    if state, ok := m.players[playerID]; ok {
        state.LastPong = time.Now()
        state.PingRTT = time.Since(state.LastPing)
        state.MissedBeats = 0
    }
}
```

### 1.6 协议选型决策

```
需要可靠传输？
  ├── 是 → TCP/WebSocket
  │        ├── 客户端发起？ → 请求-响应
  │        └── 服务器发起？ → 服务端推送 / 批量同步
  └── 否 → UDP
           ├── 高频小包？ → 实时同步
           └── 低频通知？ → 广播通知

需要跨服通信？
  └── 是 → gRPC / 内部 TCP
```

---

## 2. API 规范设计

### 2.1 消息命名规范

```
消息命名格式：{模块}_{动作}_{方向}

模块列表：
  AUTH    - 认证相关
  PLAYER  - 玩家相关
  BATTLE  - 战斗相关
  CHAT    - 聊天相关
  SHOP    - 商店相关
  GUILD   - 公会相关
  MAIL    - 邮件相关
  ACTIVITY - 活动相关

方向标记：
  REQ  - 请求（客户端 → 服务器）
  RSP  - 响应（服务器 → 客户端）
  NTF  - 通知（服务器 → 客户端）
  SYNC - 同步（双向）

示例：
  AUTH_LOGIN_REQ      - 登录请求
  AUTH_LOGIN_RSP      - 登录响应
  PLAYER_MOVE_NTF     - 玩家移动通知
  BATTLE_SYNC         - 战斗状态同步
```

### 2.2 消息 ID 分配

```go
// 消息 ID 编码：模块(8bit) + 动作(16bit) + 类型(8bit)
func EncodeMsgID(module, action, msgType uint32) uint32 {
    return (module << 24) | (action << 8) | msgType
}

func DecodeMsgID(msgID uint32) (module, action, msgType uint32) {
    module = (msgID >> 24) & 0xFF
    action = (msgID >> 8) & 0xFFFF
    msgType = msgID & 0xFF
    return
}

// 模块定义
const (
    ModuleAuth     uint32 = 0x01
    ModulePlayer   uint32 = 0x02
    ModuleBattle   uint32 = 0x03
    ModuleChat     uint32 = 0x04
    ModuleShop     uint32 = 0x05
    ModuleGuild    uint32 = 0x06
    ModuleMail     uint32 = 0x07
    ModuleActivity uint32 = 0x08
)

// 消息类型
const (
    MsgTypeREQ  uint32 = 0x01
    MsgTypeRSP  uint32 = 0x02
    MsgTypeNTF  uint32 = 0x03
    MsgTypeSYNC uint32 = 0x04
)

// 示例消息 ID
var (
    MsgAuthLoginReq = EncodeMsgID(ModuleAuth, 0x0001, MsgTypeREQ)
    MsgAuthLoginRsp = EncodeMsgID(ModuleAuth, 0x0001, MsgTypeRSP)
    MsgPlayerMoveNtf = EncodeMsgID(ModulePlayer, 0x0001, MsgTypeNTF)
)
```

### 2.3 错误码设计

```go
// 错误码格式：模块(8bit) + 错误类型(8bit) + 错误号(16bit)
type ErrorCode uint32

func NewErrorCode(module, errType, errNo uint32) ErrorCode {
    return ErrorCode((module << 24) | (errType << 16) | errNo)
}

// 通用错误码
var (
    ErrSuccess           = NewErrorCode(0x00, 0x00, 0x0000)
    ErrUnknown           = NewErrorCode(0x00, 0x01, 0x0001)
    ErrInvalidParam      = NewErrorCode(0x00, 0x01, 0x0002)
    ErrNotLogin          = NewErrorCode(0x00, 0x01, 0x0003)
    ErrServerError       = NewErrorCode(0x00, 0x02, 0x0001)
    ErrServiceUnavailable = NewErrorCode(0x00, 0x02, 0x0002)
)

// 认证模块错误码
var (
    ErrAuthInvalidToken    = NewErrorCode(ModuleAuth, 0x01, 0x0001)
    ErrAuthTokenExpired    = NewErrorCode(ModuleAuth, 0x01, 0x0002)
    ErrAuthAccountBanned   = NewErrorCode(ModuleAuth, 0x01, 0x0003)
    ErrAuthDuplicateLogin  = NewErrorCode(ModuleAuth, 0x01, 0x0004)
)

// 玩家模块错误码
var (
    ErrPlayerNotFound      = NewErrorCode(ModulePlayer, 0x01, 0x0001)
    ErrPlayerLevelTooLow   = NewErrorCode(ModulePlayer, 0x01, 0x0002)
    ErrPlayerCoinNotEnough = NewErrorCode(ModulePlayer, 0x01, 0x0003)
    ErrPlayerBagFull       = NewErrorCode(ModulePlayer, 0x01, 0x0004)
)

// 错误码解析
func ParseErrorCode(code ErrorCode) (module, errType, errNo uint32) {
    module = (uint32(code) >> 24) & 0xFF
    errType = (uint32(code) >> 16) & 0xFF
    errNo = uint32(code) & 0xFFFF
    return
}
```

### 2.4 API 版本管理

```go
// 协议版本号
type ProtocolVersion struct {
    Major uint16  // 主版本号（不兼容变更）
    Minor uint16  // 次版本号（兼容变更）
    Patch uint16  // 补丁版本号（修复）
}

// 版本协商
func (s *GameServer) HandleVersionNegotiation(player *Player, req *VersionNegotiationReq) {
    clientVersion := ProtocolVersion{
        Major: req.Major,
        Minor: req.Minor,
        Patch: req.Patch,
    }
    
    serverVersion := ProtocolVersion{Major: 1, Minor: 2, Patch: 0}
    
    // 检查兼容性
    if clientVersion.Major != serverVersion.Major {
        // 主版本不同，不兼容
        player.SendResponse(MsgVersionNegotiationRsp, &VersionNegotiationRsp{
            Success: false,
            Reason:  "版本不兼容，请更新客户端",
            LatestVersion: &serverVersion,
        })
        return
    }
    
    // 主版本相同，兼容
    player.SendResponse(MsgVersionNegotiationRsp, &VersionNegotiationRsp{
        Success: true,
        ServerVersion: &serverVersion,
    })
}
```

---

## 3. 包格式设计

### 3.1 通用包头设计

```go
// 通用包头
type PacketHeader struct {
    Magic       uint16  // 魔数：0x474D ("GM" = Game Message)
    Version     uint8   // 协议版本
    Flags       uint8   // 标志位
    MsgID       uint32  // 消息 ID
    SeqNum      uint32  // 序列号
    BodyLength  uint32  // 消息体长度
    Checksum    uint32  // 校验和
}

// 标志位定义
const (
    FlagCompressed  uint8 = 0x01  // 已压缩
    FlagEncrypted   uint8 = 0x02  // 已加密
    FlagFragmented  uint8 = 0x04  // 分片
    FlagResponse    uint8 = 0x08  // 是响应包
    FlagPriority    uint8 = 0x10  // 高优先级
)

const HeaderSize = 20  // 包头固定长度

// 编码包头
func (h *PacketHeader) Encode() []byte {
    buf := make([]byte, HeaderSize)
    binary.BigEndian.PutUint16(buf[0:2], h.Magic)
    buf[2] = h.Version
    buf[3] = h.Flags
    binary.BigEndian.PutUint32(buf[4:8], h.MsgID)
    binary.BigEndian.PutUint32(buf[8:12], h.SeqNum)
    binary.BigEndian.PutUint32(buf[12:16], h.BodyLength)
    binary.BigEndian.PutUint32(buf[16:20], h.Checksum)
    return buf
}

// 解码包头
func DecodeHeader(data []byte) (*PacketHeader, error) {
    if len(data) < HeaderSize {
        return nil, ErrPacketTooShort
    }
    
    header := &PacketHeader{
        Magic:      binary.BigEndian.Uint16(data[0:2]),
        Version:    data[2],
        Flags:      data[3],
        MsgID:      binary.BigEndian.Uint32(data[4:8]),
        SeqNum:     binary.BigEndian.Uint32(data[8:12]),
        BodyLength: binary.BigEndian.Uint32(data[12:16]),
        Checksum:   binary.BigEndian.Uint32(data[16:20]),
    }
    
    if header.Magic != 0x474D {
        return nil, ErrInvalidMagic
    }
    
    return header, nil
}
```

### 3.2 完整数据包结构

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Magic (0x474D)        |  Version  |     Flags         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           MsgID                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          SeqNum                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       BodyLength                              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Checksum                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
|                         Body (N bytes)                        |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### 3.3 分片协议

当消息体超过 MTU（通常 1500 字节）时需要分片。

```go
type FragmentHeader struct {
    FragmentID  uint16  // 分片 ID
    TotalCount  uint16  // 总分片数
    FragmentIndex uint16  // 当前分片索引
}

// 分片编码
func FragmentMessage(data []byte, maxFragmentSize int) []*Packet {
    fragments := make([]*Packet, 0)
    totalSize := len(data)
    totalFragments := (totalSize + maxFragmentSize - 1) / maxFragmentSize
    
    for i := 0; i < totalFragments; i++ {
        start := i * maxFragmentSize
        end := start + maxFragmentSize
        if end > totalSize {
            end = totalSize
        }
        
        fragment := &Packet{
            Header: &PacketHeader{
                Magic:       0x474D,
                Version:     1,
                Flags:       FlagFragmented,
                BodyLength:  uint32(end - start),
            },
            Fragment: &FragmentHeader{
                FragmentID:    generateFragmentID(),
                TotalCount:    uint16(totalFragments),
                FragmentIndex: uint16(i),
            },
            Body: data[start:end],
        }
        fragments = append(fragments, fragment)
    }
    return fragments
}

// 分片重组
type FragmentReassembler struct {
    fragments map[uint16]*FragmentSet  // fragmentID -> fragments
}

type FragmentSet struct {
    Fragments   [][]byte
    TotalCount  uint16
    Received    uint16
    CreatedAt   time.Time
}

func (r *FragmentReassembler) AddFragment(pkt *Packet) []byte {
    fragID := pkt.Fragment.FragmentID
    
    set, ok := r.fragments[fragID]
    if !ok {
        set = &FragmentSet{
            Fragments:  make([][]byte, pkt.Fragment.TotalCount),
            TotalCount: pkt.Fragment.TotalCount,
            CreatedAt:  time.Now(),
        }
        r.fragments[fragID] = set
    }
    
    if set.Fragments[pkt.Fragment.FragmentIndex] == nil {
        set.Fragments[pkt.Fragment.FragmentIndex] = pkt.Body
        set.Received++
    }
    
    // 检查是否收齐
    if set.Received == set.TotalCount {
        delete(r.fragments, fragID)
        return r.concatFragments(set.Fragments)
    }
    
    return nil
}
```

### 3.4 Protobuf 包格式

```protobuf
// game_packet.proto
syntax = "proto3";

message GamePacket {
    uint32 msg_id = 1;
    uint32 seq_num = 2;
    uint64 timestamp = 3;
    bytes body = 4;
}

// 登录请求
message LoginRequest {
    string account = 1;
    string token = 2;
    uint32 client_version = 3;
    string device_id = 4;
    string platform = 5;  // ios/android/pc
}

// 登录响应
message LoginResponse {
    uint32 result_code = 1;
    uint64 player_id = 2;
    string session_token = 3;
    PlayerInfo player_info = 4;
    ServerInfo server_info = 5;
}

message PlayerInfo {
    string nickname = 1;
    uint32 level = 2;
    uint64 exp = 3;
    uint64 coin = 4;
    uint32 diamond = 5;
}

message ServerInfo {
    string server_id = 1;
    string server_name = 2;
    uint32 online_count = 3;
    uint32 state = 4;  // 0=正常, 1=维护, 2=爆满
}

// 位置同步
message PositionSync {
    uint64 player_id = 1;
    float x = 2;
    float y = 3;
    float z = 4;
    float rotation = 5;
    float speed = 6;
    uint32 state = 7;
    int64 timestamp = 8;
}

// 战斗操作
message BattleAction {
    uint64 player_id = 1;
    uint32 action_type = 2;  // 1=移动, 2=攻击, 3=技能
    uint32 skill_id = 3;
    uint64 target_id = 4;
    float x = 5;
    float y = 6;
    float z = 7;
    int64 timestamp = 8;
}
```

---

## 4. 二进制协议实现

### 4.1 手动编码（高性能场景）

```go
// 二进制编码器
type BinaryEncoder struct {
    buf    []byte
    offset int
}

func NewBinaryEncoder(size int) *BinaryEncoder {
    return &BinaryEncoder{
        buf:    make([]byte, size),
        offset: 0,
    }
}

func (e *BinaryEncoder) WriteUint8(v uint8) {
    e.buf[e.offset] = v
    e.offset++
}

func (e *BinaryEncoder) WriteUint16(v uint16) {
    binary.BigEndian.PutUint16(e.buf[e.offset:e.offset+2], v)
    e.offset += 2
}

func (e *BinaryEncoder) WriteUint32(v uint32) {
    binary.BigEndian.PutUint32(e.buf[e.offset:e.offset+4], v)
    e.offset += 4
}

func (e *BinaryEncoder) WriteUint64(v uint64) {
    binary.BigEndian.PutUint64(e.buf[e.offset:e.offset+8], v)
    e.offset += 8
}

func (e *BinaryEncoder) WriteFloat32(v float32) {
    bits := math.Float32bits(v)
    binary.BigEndian.PutUint32(e.buf[e.offset:e.offset+4], bits)
    e.offset += 4
}

func (e *BinaryEncoder) WriteString(s string) {
    // 长度前缀 + UTF-8 数据
    e.WriteUint16(uint16(len(s)))
    copy(e.buf[e.offset:], s)
    e.offset += len(s)
}

func (e *BinaryEncoder) WriteBytes(data []byte) {
    e.WriteUint32(uint32(len(data)))
    copy(e.buf[e.offset:], data)
    e.offset += len(data)
}

func (e *BinaryEncoder) Bytes() []byte {
    return e.buf[:e.offset]
}
```

### 4.2 Varint 编码（压缩整数）

```go
// Varint 编码：小数字用更少的字节
func EncodeVarint(value uint64) []byte {
    var buf []byte
    for value >= 0x80 {
        buf = append(buf, byte(value)|0x80)
        value >>= 7
    }
    buf = append(buf, byte(value))
    return buf
}

func DecodeVarint(data []byte) (uint64, int) {
    var result uint64
    var shift uint
    for i, b := range data {
        result |= uint64(b&0x7F) << shift
        if b < 0x80 {
            return result, i + 1
        }
        shift += 7
    }
    return 0, 0
}

// 坐标压缩：将浮点数转为定点整数
func CompressPosition(x, y, z float32) []int32 {
    // 精度 0.01，范围 -10000 ~ 10000
    return []int32{
        int32(x * 100),  // -1000000 ~ 1000000
        int32(y * 100),
        int32(z * 100),
    }
}

func DecompressPosition(compressed [3]int32) (float32, float32, float32) {
    return float32(compressed[0]) / 100.0,
           float32(compressed[1]) / 100.0,
           float32(compressed[2]) / 100.0
}
```

### 4.3 位域编码（紧凑标志位）

```go
// 位域编码：用一个字节存储多个布尔值
type BitField uint8

const (
    BitCanMove   BitField = 1 << iota  // 可以移动
    BitCanAttack                         // 可以攻击
    BitCanSkill                          // 可以释放技能
    BitIsDead                            // 已死亡
    BitIsStunned                         // 被眩晕
    BitIsSilenced                        // 被沉默
    BitIsInvisible                       // 隐身
    BitIsInvincible                      // 无敌
)

func (f BitField) Has(flag BitField) bool {
    return f&flag != 0
}

func (f BitField) Set(flag BitField) BitField {
    return f | flag
}

func (f BitField) Clear(flag BitField) BitField {
    return f & ^flag
}

// 使用示例
func EncodePlayerState(player *Player) []byte {
    var flags BitField
    if player.CanMove() {
        flags = flags.Set(BitCanMove)
    }
    if player.CanAttack() {
        flags = flags.Set(BitCanAttack)
    }
    if player.IsDead() {
        flags = flags.Set(BitIsDead)
    }
    
    enc := NewBinaryEncoder(64)
    enc.WriteUint64(player.ID)
    enc.WriteFloat32(player.X)
    enc.WriteFloat32(player.Y)
    enc.WriteFloat32(player.Z)
    enc.WriteFloat32(player.Rotation)
    enc.WriteUint8(uint8(flags))
    
    return enc.Bytes()
}
```

### 4.4 消息注册表

```go
// 消息注册表：自动编码/解码
type MessageRegistry struct {
    encoders map[uint32]func(interface{}) ([]byte, error)
    decoders map[uint32]func([]byte) (interface{}, error)
}

func NewMessageRegistry() *MessageRegistry {
    return &MessageRegistry{
        encoders: make(map[uint32]func(interface{}) ([]byte, error)),
        decoders: make(map[uint32]func([]byte) (interface{}, error)),
    }
}

func (r *MessageRegistry) Register(msgID uint32, encoder func(interface{}) ([]byte, error), decoder func([]byte) (interface{}, error)) {
    r.encoders[msgID] = encoder
    r.decoders[msgID] = decoder
}

func (r *MessageRegistry) Encode(msgID uint32, msg interface{}) ([]byte, error) {
    encoder, ok := r.encoders[msgID]
    if !ok {
        return nil, ErrUnknownMessage
    }
    return encoder(msg)
}

func (r *MessageRegistry) Decode(msgID uint32, data []byte) (interface{}, error) {
    decoder, ok := r.decoders[msgID]
    if !ok {
        return nil, ErrUnknownMessage
    }
    return decoder(data)
}

// 使用 Protobuf 注册
func RegisterProtobufMessages(registry *MessageRegistry) {
    // 登录请求
    registry.Register(MsgAuthLoginReq,
        func(msg interface{}) ([]byte, error) {
            return proto.Marshal(msg.(*LoginRequest))
        },
        func(data []byte) (interface{}, error) {
            var msg LoginRequest
            err := proto.Unmarshal(data, &msg)
            return &msg, err
        },
    )
    
    // 登录响应
    registry.Register(MsgAuthLoginRsp,
        func(msg interface{}) ([]byte, error) {
            return proto.Marshal(msg.(*LoginResponse))
        },
        func(data []byte) (interface{}, error) {
            var msg LoginResponse
            err := proto.Unmarshal(data, &msg)
            return &msg, err
        },
    )
}
```

---

## 5. 压缩技术

### 5.1 压缩策略选择

```
消息类型判断:
  ├── 小消息（< 64 bytes）→ 不压缩
  ├── 中等消息（64-256 bytes）→ 根据频率决定
  ├── 大消息（> 256 bytes）→ 压缩
  └── 批量数据 → 必须压缩

压缩算法选择:
  ├── LZ4 → 速度快，压缩率低（适合实时消息）
  ├── zlib → 平衡（适合一般消息）
  ├── zstd → 压缩率高，速度适中（适合大文件）
  └── Snappy → 极快，压缩率最低（适合日志）
```

### 5.2 消息级压缩

```go
type Compressor struct {
    threshold int  // 压缩阈值（字节）
}

func NewCompressor(threshold int) *Compressor {
    return &Compressor{threshold: threshold}
}

// 根据消息大小决定是否压缩
func (c *Compressor) Compress(data []byte) ([]byte, bool) {
    if len(data) < c.threshold {
        return data, false
    }
    
    compressed, err := lz4.Encode(nil, data)
    if err != nil {
        return data, false
    }
    
    // 只有压缩后更小才使用
    if len(compressed) < len(data) {
        return compressed, true
    }
    return data, false
}

func (c *Compressor) Decompress(data []byte, compressed bool) ([]byte, error) {
    if !compressed {
        return data, nil
    }
    
    decoded, err := lz4.Decode(nil, data)
    if err != nil {
        return nil, err
    }
    return decoded, nil
}
```

### 5.3 Delta 压缩（增量同步）

只发送变化的数据，而非全量数据。

```go
type DeltaEncoder struct {
    lastState map[uint64][]byte  // 上次同步的状态快照
}

func (d *DeltaEncoder) EncodeDelta(playerID uint64, currentState []byte) []byte {
    last, ok := d.lastState[playerID]
    if !ok {
        // 第一次同步，发送全量
        d.lastState[playerID] = currentState
        return currentState
    }
    
    // 计算差异
    delta := computeDelta(last, currentState)
    
    // 如果差异小于全量的 50%，发送差异
    if len(delta) < len(currentState)/2 {
        d.lastState[playerID] = currentState
        return delta
    }
    
    // 差异太大，发送全量
    d.lastState[playerID] = currentState
    return currentState
}

func computeDelta(old, new []byte) []byte {
    // 简单实现：标记哪些字段变化了
    // 生产环境可用 xdiff 或类似算法
    var delta []byte
    
    for i := 0; i < len(new); i++ {
        if i >= len(old) || old[i] != new[i] {
            delta = append(delta, byte(i))  // 字段索引
            delta = append(delta, new[i])    // 新值
        }
    }
    
    return delta
}
```

### 5.4 消息合并压缩

将多个小消息合并为一个大消息后再压缩。

```go
type MessageBatcher struct {
    maxSize     int
    maxWait     time.Duration
    pendingMsgs []*GameMessage
    mu          sync.Mutex
}

func (b *MessageBatcher) Add(msg *GameMessage) []*GameMessage {
    b.mu.Lock()
    defer b.mu.Unlock()
    
    b.pendingMsgs = append(b.pendingMsgs, msg)
    
    if len(b.pendingMsgs) >= b.maxSize {
        return b.flush()
    }
    return nil
}

func (b *MessageBatcher) flush() []*GameMessage {
    batch := b.pendingMsgs
    b.pendingMsgs = nil
    return batch
}

// 编码批次
func EncodeBatch(msgs []*GameMessage) []byte {
    enc := NewBinaryEncoder(4096)
    
    // 写入消息数量
    enc.WriteUint16(uint16(len(msgs)))
    
    // 写入每个消息
    for _, msg := range msgs {
        enc.WriteUint32(msg.MsgID)
        enc.WriteUint16(uint16(len(msg.Body)))
        enc.WriteBytes(msg.Body)
    }
    
    data := enc.Bytes()
    
    // 对整个批次压缩
    compressed, _ := lz4.Encode(nil, data)
    if len(compressed) < len(data) {
        return compressed
    }
    return data
}
```

---

## 6. 加密技术

### 6.1 加密层次

```
┌─────────────────────────────────────┐
│           应用层加密                 │
│   (消息签名、防篡改)                  │
├─────────────────────────────────────┤
│           传输层加密                 │
│   (TLS/DTLS)                        │
├─────────────────────────────────────┤
│           网络层加密                 │
│   (IPSec/VPN)                       │
└─────────────────────────────────────┘

推荐策略：
  - 一般游戏：TLS 传输加密 + 消息签名
  - 高安全需求：TLS + AES 应用层加密 + 消息签名
  - 金融级：TLS + RSA 混合加密 + HMAC 签名
```

### 6.2 TLS 传输加密

```go
// TLS 服务端配置
func CreateTLSConfig(certFile, keyFile string) (*tls.Config, error) {
    cert, err := tls.LoadX509KeyPair(certFile, keyFile)
    if err != nil {
        return nil, err
    }
    
    config := &tls.Config{
        Certificates: []tls.Certificate{cert},
        MinVersion:   tls.VersionTLS12,
        CipherSuites: []uint16{
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
        },
        PreferServerCipherSuites: true,
    }
    
    return config, nil
}

// 启动 TLS 服务器
func StartTLSServer(addr string, config *tls.Config) error {
    listener, err := tls.Listen("tcp", addr, config)
    if err != nil {
        return err
    }
    
    log.Info("TLS server started", addr)
    
    for {
        conn, err := listener.Accept()
        if err != nil {
            log.Error("TLS accept error", err)
            continue
        }
        go handleTLSConnection(conn)
    }
}
```

### 6.3 AES 对称加密

```go
type AESEncryptor struct {
    key []byte  // 16/24/32 字节
}

func NewAESEncryptor(key []byte) *AESEncryptor {
    return &AESEncryptor{key: key}
}

// AES-GCM 加密（推荐）
func (e *AESEncryptor) Encrypt(plaintext []byte) ([]byte, error) {
    block, err := aes.NewCipher(e.key)
    if err != nil {
        return nil, err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    
    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }
    
    ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
    return ciphertext, nil
}

// AES-GCM 解密
func (e *AESEncryptor) Decrypt(ciphertext []byte) ([]byte, error) {
    block, err := aes.NewCipher(e.key)
    if err != nil {
        return nil, err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    
    nonceSize := gcm.NonceSize()
    if len(ciphertext) < nonceSize {
        return nil, ErrCiphertextTooShort
    }
    
    nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
    plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return nil, err
    }
    
    return plaintext, nil
}
```

### 6.4 消息签名（防篡改）

```go
type MessageSigner struct {
    hmacKey []byte
}

func NewMessageSigner(key []byte) *MessageSigner {
    return &MessageSigner{hmacKey: key}
}

// 生成签名
func (s *MessageSigner) Sign(data []byte) []byte {
    mac := hmac.New(sha256.New, s.hmacKey)
    mac.Write(data)
    return mac.Sum(nil)
}

// 验证签名
func (s *MessageSigner) Verify(data, signature []byte) bool {
    expected := s.Sign(data)
    return hmac.Equal(expected, signature)
}

// 带签名的包格式
type SignedPacket struct {
    Header    *PacketHeader
    Body      []byte
    Signature [32]byte  // HMAC-SHA256
}

func (p *SignedPacket) Encode(signer *MessageSigner) []byte {
    // 1. 编码头部和消息体
    headerBytes := p.Header.Encode()
    data := append(headerBytes, p.Body...)
    
    // 2. 计算签名
    signature := signer.Sign(data)
    copy(p.Signature[:], signature)
    
    // 3. 组合完整数据包
    result := make([]byte, 0, len(data)+32)
    result = append(result, data...)
    result = append(result, p.Signature[:]...)
    
    return result
}

func (p *SignedPacket) Verify(signer *MessageSigner) bool {
    // 提取数据和签名
    dataLen := len(p.Body) + HeaderSize
    data := make([]byte, dataLen)
    copy(data, p.Header.Encode())
    copy(data[HeaderSize:], p.Body)
    
    return signer.Verify(data, p.Signature[:])
}
```

### 6.5 密钥交换

```go
// Diffie-Hellman 密钥交换
type KeyExchange struct {
    privateKey *big.Int
    publicKey  *big.Int
    prime      *big.Int
    generator  *big.Int
}

func NewKeyExchange() *KeyExchange {
    // 使用 2048 位 DH 参数
    prime, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF16")
    generator := big.NewInt(2)
    
    privateKey, _ := rand.Int(rand.Reader, prime)
    publicKey := new(big.Int).Exp(generator, privateKey, prime)
    
    return &KeyExchange{
        privateKey: privateKey,
        publicKey:  publicKey,
        prime:      prime,
        generator:  generator,
    }
}

// 计算共享密钥
func (ke *KeyExchange) ComputeSharedSecret(otherPublicKey *big.Int) []byte {
    shared := new(big.Int).Exp(otherPublicKey, ke.privateKey, ke.prime)
    return shared.Bytes()
}
```

---

## 7. 协议安全实践

### 7.1 防重放攻击

```go
type ReplayProtection struct {
    windowSize  uint64
    maxSeqNum   uint64
    bitmap      uint64
    mu          sync.Mutex
}

func NewReplayProtection(windowSize uint64) *ReplayProtection {
    return &ReplayProtection{windowSize: windowSize}
}

func (r *ReplayProtection) Check(seqNum uint64) bool {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    if seqNum > r.maxSeqNum {
        // 新消息，更新窗口
        shift := seqNum - r.maxSeqNum
        if shift < 64 {
            r.bitmap <<= shift
            r.bitmap |= 1
        } else {
            r.bitmap = 1
        }
        r.maxSeqNum = seqNum
        return true
    }
    
    // 旧消息，检查是否在窗口内
    diff := r.maxSeqNum - seqNum
    if diff >= r.windowSize {
        return false  // 超出窗口，拒绝
    }
    
    // 检查是否已处理
    bit := uint64(1) << diff
    if r.bitmap&bit != 0 {
        return false  // 重复消息，拒绝
    }
    
    // 标记为已处理
    r.bitmap |= bit
    return true
}
```

### 7.2 速率限制

```go
type RateLimiter struct {
    limits    map[string]*TokenBucket
    mu        sync.RWMutex
}

type TokenBucket struct {
    tokens    float64
    maxTokens float64
    refillRate float64
    lastRefill time.Time
}

func (l *RateLimiter) Allow(key string, cost float64) bool {
    l.mu.Lock()
    defer l.mu.Unlock()
    
    bucket, ok := l.limits[key]
    if !ok {
        bucket = &TokenBucket{
            tokens:     10,
            maxTokens:  10,
            refillRate: 1.0,  // 每秒补充 1 个令牌
            lastRefill: time.Now(),
        }
        l.limits[key] = bucket
    }
    
    // 补充令牌
    elapsed := time.Since(bucket.lastRefill).Seconds()
    bucket.tokens = math.Min(bucket.maxTokens, bucket.tokens+elapsed*bucket.refillRate)
    bucket.lastRefill = time.Now()
    
    // 检查是否有足够令牌
    if bucket.tokens >= cost {
        bucket.tokens -= cost
        return true
    }
    
    return false
}

// 使用示例
func (s *GameServer) HandlePlayerMessage(player *Player, msg *GameMessage) {
    // 检查消息频率限制
    if !s.rateLimiter.Allow(fmt.Sprintf("msg:%d", player.ID), 1.0) {
        player.SendError(msg.MsgID, ErrRateLimited)
        return
    }
    
    // 处理消息
    s.processMessage(player, msg)
}
```

### 7.3 协议版本兼容

```go
// 协议适配器：处理不同版本的协议
type ProtocolAdapter struct {
    adapters map[uint32]func([]byte) ([]byte, error)  // version -> adapter
}

func NewProtocolAdapter() *ProtocolAdapter {
    return &ProtocolAdapter{
        adapters: make(map[uint32]func([]byte) ([]byte, error)),
    }
}

// 注册版本适配器
func (a *ProtocolAdapter) RegisterAdapter(version uint32, adapter func([]byte) ([]byte, error)) {
    a.adapters[version] = adapter
}

// 适配消息
func (a *ProtocolAdapter) Adapt(version uint32, data []byte) ([]byte, error) {
    adapter, ok := a.adapters[version]
    if !ok {
        return data, nil  // 无适配器，原样返回
    }
    return adapter(data)
}

// 示例：旧版登录请求适配器
func adaptLoginV1(data []byte) ([]byte, error) {
    // V1 格式: account(16) + token(32)
    // V2 格式: account(varies) + token(varies) + version(4) + device(varies)
    
    if len(data) < 48 {
        return nil, ErrInvalidData
    }
    
    account := string(bytes.TrimRight(data[:16], "\x00"))
    token := string(bytes.TrimRight(data[16:48], "\x00"))
    
    // 转换为 V2 格式
    v2 := &LoginRequest{
        Account:        account,
        Token:          token,
        ClientVersion:  1,
        Platform:       "unknown",
    }
    
    return proto.Marshal(v2)
}
```

---

## 8. 协议设计最佳实践

```
协议设计 Checklist：

□ 1. 消息命名规范统一（模块_动作_方向）
□ 2. 消息 ID 分配合理，预留扩展空间
□ 3. 错误码设计清晰，便于调试
□ 4. 包头包含魔数、版本、长度等关键字段
□ 5. 大消息支持分片和重组
□ 6. 高频消息使用 UDP + 可靠性层
□ 7. 消息体支持压缩（阈值 + 算法选择）
□ 8. 关键操作使用 AES 加密
□ 9. 所有消息支持签名验证
□ 10. 实现防重放保护
□ 11. 实现速率限制
□ 12. 协议版本管理，支持旧版兼容
□ 13. 编写协议文档和测试用例
□ 14. 性能测试：编码/解码速度、压缩率
□ 15. 安全审计：加密强度、签名算法
```

## 下一步

协议设计完成后，接下来需要深入游戏逻辑的实现细节：从实体管理到状态同步，从战斗系统到 AI 系统，每一个模块都需要精心设计才能支撑大规模在线游戏的运行。
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


---

## 附录：同步、战斗与实时交互

> 以下内容整合自《同步战斗详解》专题，深入讨论游戏同步体系的设计哲学与工程实践。

### Tick 与时间推进

实时战斗里最容易被低估的，不是协议，也不是带宽，而是时间本身。很多所谓"同步问题"，根因其实是时间模型先乱了。

**四种时间必须分开**：

- **墙钟时间**：真实世界时间，来自系统时钟
- **渲染时间**：屏幕刷新和动画播放节奏，可能波动
- **逻辑时间**：战斗模拟推进的步长，通常用固定 Tick 表示
- **网络时间**：消息发送、接收、排队、补发和追帧窗口

**固定 Tick 仍然是主流**，因为它最容易定义顺序、记录回放、做状态哈希和处理跨端一致性。

**补帧、追帧和帧预算必须提前设计**：

- 单帧最多补多少逻辑步，避免进入死亡螺旋
- 追帧时关闭部分表现或降级特效
- 落后太多时转向快照恢复，而不是无限逐帧硬追
- 明确哪些系统允许跳表现，哪些绝不能跳裁决

### 同步模型

同步模型回答的不是抽象理论问题，而是这局战斗到底怎样收敛成一份所有参与者都能接受的结果。

**不要只按"发输入还是发状态"分类**，更有用的理解方式是从几组更硬的维度同时看：

- 权威归属：最终结果由客户端、房主、协调服务器还是权威服务器决定
- 共享粒度：同步的是整包状态、关键事件、输入序列还是周期快照
- 一致性时机：输入发生时立即达成、延后若干帧达成，还是先本地演后服务端收敛
- 客户端职责：只是显示权威结果，还是要参与完整模拟
- 作弊面：客户端能伪造多少，服务端能验证多少

| 维度 | 服务端权威状态同步 | 帧同步/输入锁步 | 混合方案 |
| --- | --- | --- | --- |
| 裁决权 | 服务端集中 | 参与方共享或服务器协调 | 分层分对象 |
| 带宽形态 | 状态或事件广播较多 | 输入包较轻 | 混合 |
| 确定性要求 | 中等 | 很高 | 局部很高 |
| 本地手感 | 依赖预测补偿 | 依赖领先帧或局部前馈 | 依赖边界设计 |
| 重连恢复 | 快照更自然 | 需要快照、追帧、默认输入 | 视子系统而定 |
| 回放实现 | 状态与事件回放更常见 | 输入回放更自然 | 通常两者并用 |
| 作弊面 | 更易控制 | 更难控制 | 取决于权威边界 |

### 帧同步详解

帧同步的最小定义：所有参与者在第 N 逻辑帧消费同一组输入，然后按同一规则推进到第 N+1 帧。

**一套能上线的帧同步至少依赖**：

- `frame_id`：当前逻辑帧号
- `input_delay`：本地输入领先多少帧提交
- `input_buffer`：存放未来若干帧输入的缓冲区
- `default_input`：超时或掉线时的保底输入
- `state_hash`：周期性校验当前状态是否一致
- `checkpoint`：用于重连的定期快照
- `catch_up_policy`：客户端落后时如何追帧

### 暂停、继续、追帧与断线重连

**联网战斗里真正的"暂停"只有一种**：权威战斗时钟暂停推进。不只是客户端画面停住，而是服务端或房间协调端明确把逻辑帧锁在某一帧上。

**重连恢复的目标是尽快回到当前权威状态**，不是忠实重播断线期间的每一个历史表现细节。

**恢复档位**：

- 落后很少：直接快速追帧
- 落后中等：加载最近检查点，再补一小段增量帧
- 落后太多：直接状态跳转到最新检查点
- 超过恢复窗口：不再强行恢复，转为重新入局、托管或判负

### 预测、补偿与纠正

**不是所有状态都应该预测**：

- 适合大胆预测：本地移动、朝向、起手动作
- 适合有限预测：技能起手、投射物出手、局部命中特效预播
- 更适合权威确认：资源扣除、死亡、击飞击退最终落点、关键控制

**一套更现实的状态分层**：

- 本地体验层：优先快，允许短时间偏差
- 权威裁决层：必须准，宁可慢一点也不能错
- 表现收敛层：负责把前两层之间的差异做平滑处理

### 确定性与数值一致性

**最常见的分叉来源**：

- 浮点误差在不同 CPU、平台、编译器上的差异
- 集合遍历顺序不稳定
- 随机数源没统一
- 多线程更新顺序不固定
- 物理引擎或碰撞库在不同平台表现不同

**分层确定性**：

- 必须强确定：核心裁决、技能命中、关键资源变更和回放证据
- 尽量一致：角色移动、投射物、Buff 触发和重要时序状态
- 可以放宽：纯表现特效、镜头微调、局部插值和音效

### 回放、观战与裁决

回放和观战是同步体系最诚实的验收标准。一个系统如果无法稳定重建关键对局过程，就很难证明自己的裁决可信。

**三种回放记录方式**：

- 输入流回放：体积轻，但对确定性要求极高
- 状态快照回放：更直观，但存储成本更高
- 输入加检查点混合：更稳妥，定期保存检查点，检查点之间记录输入

### 技能系统设计

技能系统本质上是在回答：技能如何描述、如何实例化、如何执行、如何同步、如何被调试、如何被内容团队持续扩展。

**技能系统必须和同步边界一起定**：

- 哪些阶段允许客户端预播
- 哪些结果必须等待权威确认
- 技能实例的哪些状态需要进入回放和重连恢复
- 目标选择和效果结算是否依赖严格逻辑帧


---

## 附录：消息系统与进程间通信

> 以下内容整合自《消息系统IPC》专题，讨论通信方案的选择与工程边界。

### IPC 基础与场景边界

**哪些问题天然适合消息化**：

- 生产方不必同步等待结果
- 允许消费者按自己的节奏处理
- 链路更关注削峰和解耦，而不是最低延迟
- 同一个事件需要被多个下游复用
- 下游失败不应该直接拖垮上游主流程

**哪些问题不该轻易消息化**：

- 强实时、强顺序、强交互反馈、上下文高度耦合、出错后难以补偿的链路
- 例如：局内战斗输入处理、每帧对象同步、场景控制权实时切换

### 通信模式

**最常见的几类通信模式**：

- **同步请求-响应**：调用方发起请求，等待明确结果。适合玩家操作必须立即反馈的场景
- **异步投递**：调用方把任务投递出去，不同步等待。适合削峰和缓冲
- **发布订阅**：一个事件发生后，多个订阅者各自处理。适合一个事实被多个系统复用
- **请求接收+后台完成**：入口先同步确认"请求已受理"，真正的重操作在后台异步完成

### 主链路与外围链路差异

**主链路**直接决定当前玩家体验，对延迟敏感、需要明确结果、失败必须及时反馈。**外围链路**围绕主事实展开后续处理，允许晚一点完成、异步重试、多消费者并行。

**判断标准**：

- 玩家是否必须立刻知道结果 → 偏主链路
- 当前运行时状态是否要立即收敛 → 偏主链路
- 下游失败是否允许不阻断当前主流程 → 适合事件化外围处理

### 消息语义、幂等与顺序

**幂等几乎是必备能力**：只要系统存在重试、消费者超时后重新拉取、上游重复发送，就几乎一定需要幂等。

**缩小顺序作用域**：更稳妥的方式不是追求全局严格顺序，而是同一玩家的资产操作保序、同一房间的结算事件保序、同一订单状态流转保序。

### 如何选通信方案

**选型顺序**：

1. 先定义链路语义和失败代价
2. 再区分它是命令型还是事件型
3. 再判断它更偏低延迟还是更偏高吞吐
4. 最后才在候选组件里选最省治理成本的一种

| 方案 | 擅长 | 不擅长 |
| --- | --- | --- |
| 进程内事件总线 | 低成本模块解耦 | 跨进程可靠治理 |
| 同步 RPC | 明确实时交互和反馈 | 削峰和多消费者广播 |
| Broker 式 MQ | 异步解耦、削峰和扩散 | 实时主链路控制 |
| 后台任务系统 | 长耗时处理 | 伪装成立即完成的请求 |
