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
