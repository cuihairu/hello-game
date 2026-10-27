# 04 Communication Protocol Design

> My order for protocol design is: **first decompose message semantics, then choose the transport, and only lastly discuss format and optimization**. Treating the protocol as a long-lived contract that will evolve across multiple client versions, multiple server modules, and the toolchain saves you from the rework left by bolting on JSON fields ad hoc later.
>
> **Reference books**: This chapter is based on the protocol design framework from *Online Game Core Technologies and Practice* (Kenji Nakajima), combined with high-concurrency protocol practice from *Million Online*.
>
> **A common pitfall**: Protocol design is not "defining a few JSON interfaces"—it is a **long-lived contract** between multiple client versions, multiple server modules, the access layer, the toolchain, gray-release packages, and backend systems. Many production incidents are not caused by the network going down, but by different participants interpreting the same message differently.

---

## 1. Why Protocol Design Matters

Protocol design is the most underestimated part of game server development. Many teams casually define some JSON interfaces at the start of a project, only to discover after launch: message sizes are too large and bandwidth is insufficient, protocol incompatibility prevents old client versions from updating, and lack of version management causes interface chaos.

**Once a protocol ships, it is very hard to modify**—because you must support both old and new client versions simultaneously. So protocol design needs to "look forward," reserve extension space, and account for future business requirements.

A counter-example: a mobile game used a simple JSON protocol in v1.0, with message IDs as plain strings (e.g., "login", "move"). By v3.0, when cross-server gameplay needed to be supported, they found string message IDs could not be routed efficiently and had to do a painful protocol migration. Had they used numerically-encoded modular message IDs from the start, this problem would never have appeared.

### 1.1 Why Protocol Problems Always Get Heavier Late

Protocols usually look simple in the early project phase: assign a message number, add a few fields, and local integration works. But a game project's protocol will almost certainly keep evolving:

- New fields added, old fields deprecated, enums extended
- Compression, encryption, or header strategy changes
- Hot-update packages and channel packages coexist
- Client and server versions are not perfectly in sync (channel review windows, players delaying updates)

Without a contract mindset early on, the system can only rely on a fragile assumption: **all participants always upgrade together, and never misinterpret fields**. This assumption never holds in real projects.

### 1.2 What a Protocol Contract Should Contain

A mature protocol contract is not just about "what the fields look like." At minimum, it should include:

- Business semantics of message numbers/types (not just numbers, but what they "mean")
- Request and response structure definitions, field meanings, default values, optionality rules
- Enum extension rules (how to handle unknown enum values received)
- Error code semantics and client handling strategies
- Compatibility windows and version negotiation methods
- Agreements for handling malformed packets and illegal values

### 1.3 Three Principles of Protocol Design

1. **Extensibility**: new features do not require modifying existing protocols, only adding new messages
2. **Efficiency**: message sizes as small as possible, encode/decode speed as fast as possible
3. **Security**: tamper-proofing, replay protection, flood protection

The priority of these three principles is not fixed—a casual turn-based game can deprioritize "efficiency" heavily (JSON is totally fine), while a hard-real-time competitive game treats every principle as a hard constraint. The basis for judgment comes from the semantic analysis in the next section.

---

## 2. Decompose Semantics First, Then Discuss Protocols

"Should we use TCP or UDP?" is the most common opening line of a networking discussion, but it is usually the wrong first question. A more useful order is: **first look at message semantics, then transport requirements, and only lastly the specific protocol**.

### 2.1 Connection, Session, and Message Must Be Kept Separate

Much of the confusion in networking design discussions comes from "connection dropped," "session gone," and "message never arrived" being treated as the same kind of problem. Their lifecycles are actually entirely different:

| Layer | Meaning | Lifecycle |
|----|------|---------|
| Connection | Physical or logical channel over TCP/WebSocket/UDP | Can drop at any time |
| Session | Business context bound to the player (login state, room state) | Can survive across connections |
| Message | Smallest business unit flowing within a connection and session | A single failure need not drag down the session |

Reconnection, kick-off, routing, and session recovery are, at their core, all about managing the mapping relationships among these three. Designing the session as "connection drops but session survives" turns reconnection from "log in again and rebuild everything" into "swap to a new connection and keep playing."

### 2.2 Classify Messages by Semantics

Traffic in a game project can be divided into at least five categories, which differ entirely in priority, reliability, and discardability:

| Message Category | Typical Examples | Core Requirement | Discardable? |
|---------|---------|---------|---------|
| Strong control | Login, authentication, entering a room, settlement, asset changes | Reliable, idempotent, explicit acknowledgment | No |
| Hard real-time | Movement input, skills, facing, firing | Timeliness; the value of stale messages decays quickly | Old ones can be dropped |
| Soft real-time | Ready state, channel state, low-frequency position updates | As timely as possible; occasional delay is acceptable | Can be throttled |
| Peripheral notifications | Mail, red dots, announcements, friend online | No loss required; delay-insensitive | Can be delayed |
| Large-packet transfer | Hot-update assets, configs, replays, battle reports | Stable throughput; must not compete with real-time links for bandwidth | Can resume from breakpoint |

The first principle of game networking design: **do not try to cover all messages with one handling approach**. Incidents like "chat slowing down combat" and "the download link affecting broadcast" all root in traffic of different semantics being mixed into the same processing path.

### 2.3 Reliability, Ordering, and Compatibility Are Three Separate Things

"Delivered reliably," "correctly ordered," and "cross-version compatible" are often mentioned together, but they are not the same thing: reliable does not mean ordered, and ordered does not mean compatible. Conflating them is the starting point of many protocol governance problems.

- **Reliability** concerns whether messages are eventually delivered and processed—payment results, asset grants, settlement confirmations
- **Ordering** concerns the relative order in which messages are consumed—consecutive input frames, state changes of the same object
- **Compatibility** concerns whether participants of different versions can consistently understand the same message—gray releases, channel package delayed updates

The three will affect each other but need separate governance: reliability relies on acknowledgment and retransmission (or choosing TCP), ordering relies on sequence numbers and sorting windows, compatibility relies on field-evolution discipline and version negotiation. When designing each message, ask "what are its requirements for each of these three"—far more useful than vaguely saying "this message is important."

---

## 3. Protocol Types and Message Patterns

### 3.1 Eight Basic Types

Protocols in online games can be divided into eight basic types by transmission direction, reliability, and usage scenario:

| Type | Direction | Reliability | Typical Scenario | Transport Layer |
|------|------|--------|---------|--------|
| Request-response | C→S→C | Reliable | Login, inventory operations, shop purchases | TCP/WebSocket |
| Server push | S→C | Reliable | System announcements, mail, quest completion | TCP/WebSocket |
| Broadcast notification | S→C | Unreliable | Chat messages, world announcements | UDP |
| Real-time sync | C↔S | Unreliable | Position sync, combat state | UDP |
| Heartbeat packet | C↔S | Unreliable | Connection keep-alive, latency probing | UDP |
| Acknowledgment packet | C↔S | Reliable | Operation confirmation, data verification | TCP |
| Batch sync | S→C | Reliable | Login initial data, full sync | TCP |
| Cross-server message | S↔S | Reliable | Cross-server matchmaking, cross-server chat | gRPC/TCP |

Different business scenarios have completely different requirements for "reliability" and "latency": login operations need reliability, latency can be slightly higher; position sync needs low latency, occasional packet loss is acceptable; system announcements need reliability (must not be lost) but are delay-insensitive. If all business goes over TCP request-response, position sync will be dragged down by TCP retransmission latency jitter; if login goes over UDP, you cannot tell whether a failure is a network problem or a server-side rejection.

### 3.2 The Boundary Between Request-Response and Push/Broadcast

Request-response is best suited for scenarios needing **explicit causality and explicit acknowledgment**: login, entering a room, purchasing, gacha, claiming rewards, pulling configs. Its value lies in clear causality, clear error handling, and easily organized client state machines.

But it is not suitable for carrying continuous state synchronization. Once you force "state changes" into "send request, wait for reply" too, the link becomes verbose and the reply bloated, and the server also pays the cost of many meaningless acknowledgments. As long as players share the same room/scene/event state, push and broadcast are inevitable—and the essence of broadcast is not "send to everyone" but **"who should know what change"**. If this question is not answered well, both bandwidth and client consumption costs will quickly spiral out of control (see Section 10 for details).

### 3.3 Selection Decision Tree

```text
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

## 4. Transport Layer Selection: TCP, UDP, and Their Encapsulations

### 4.1 What TCP Solves, and What It Brings

TCP's value is not just "reliable"—it is that it delegates a bundle of foundational semantics to a mature protocol stack: connected, ordered, reliable, flow-controlled, congestion-controlled. This significantly reduces the cost of the access layer maintaining transport semantics on its own—so control messages, session messages, peripheral push, and general room interactions are all well suited to run on TCP or WebSocket.

TCP's explicit costs:

- **Head-of-line blocking**: one lost packet ahead, and all data behind it must wait for retransmission—this amplifies mutual interference between mixed-semantics traffic
- Old messages can slow down new messages: in position sync, a stale old position packet arriving via retransmission already has negative value
- All messages are forced into the same reliable semantics; you cannot have "this one can be dropped, that one must arrive"

This does not mean TCP is bad; it means: **do not cram all links into the same TCP semantics**.

### 4.2 What UDP Solves, and What It Makes You Bear

UDP's core value is control. You can decide yourself:

- Which messages get acknowledged and retransmitted, and which get dropped directly
- Whether to not resend old messages once they expire (a timestamp comparison is enough)
- Unaffected by head-of-line blocking—a lost message does not prevent other messages from arriving

The corresponding cost: reliable transport, ordering, congestion control—things TCP gives for free—must all be rebuilt by you (or through libraries like KCP). A common combination is "most traffic over TCP/WebSocket, only in-match hard-real-time messages over UDP + a custom reliability layer."

### 4.3 Where WebSocket, KCP, and QUIC Fit

| Solution | Essence | Suited For | Caveats |
|------|------|------|--------|
| WebSocket | Full-duplex protocol over TCP | H5/minigames, needing to traverse HTTP infrastructure | Inherits TCP head-of-line blocking; some proxies/gateways have short timeouts, requiring heartbeat keep-alive |
| KCP | Reliable ARQ over UDP | Hard real-time and can accept non-standard protocols | Trades 10%-20% bandwidth for lower retransmission latency; NAT traversal and encryption must be handled yourself |
| QUIC | Modern reliable transport over UDP | New projects, needing multiplexing without head-of-line blocking | Domestic mobile networks show significant QoS differences for high UDP ports, requiring real-device testing; client integration cost is high |

A pragmatic reminder: domestic mobile networks have very different QoS policies for different UDP port ranges—UDP advantages are obvious in the lab, but commercial environments may be throttled by carriers. **Transport selection requires real-device testing across many regions nationwide, not just looking at benchmarks.**

### 4.4 Common Game Combinations

- **Card/Turn-based/SLG**: All TCP (or HTTP + WebSocket push), no UDP
- **MMO**: TCP/WebSocket primary link + optional UDP position channel
- **FPS/MOBA competitive**: TCP control plane (login/matchmaking/settlement) + UDP/KCP data plane (input and state sync)
- **Fighting/Racing 1v1**: P2P (UDP direct + TURN fallback), see Chapter 11 for relay servers

---

## 5. API Specification Design

### 5.1 Message Naming Convention

A good naming convention makes the protocol self-explanatory—seeing a message ID tells you which module and what operation it is. A common naming format: `module_action_direction`.

| Module | Description | Message ID Prefix |
|------|------|------------|
| AUTH | Authentication related | 0x01 |
| PLAYER | Player related | 0x02 |
| BATTLE | Combat related | 0x03 |
| CHAT | Chat related | 0x04 |
| SHOP | Shop related | 0x05 |
| GUILD | Guild related | 0x06 |
| MAIL | Mail related | 0x07 |
| ACTIVITY | Event related | 0x08 |

Direction markers: REQ (request), RSP (response), NTF (notification), SYNC (sync).

Example: `AUTH_LOGIN_REQ` = login request for the authentication module, message ID = `EncodeMsgID(0x01, 0x0001, 0x01)`.

### 5.2 Message ID Encoding

Recommended encoding: **module (8 bit) + action (16 bit) + type (8 bit)**, totaling 4 bytes as uint32:

- 8-bit module = up to 256 modules
- 16-bit action = up to 65,536 actions per module
- 8-bit type = four message types: REQ/RSP/NTF/SYNC

```go
// 消息 ID 编解码：模块(8) + 动作(16) + 类型(8)
func EncodeMsgID(module uint8, action uint16, kind uint8) uint32 {
    return uint32(module)<<24 | uint32(action)<<8 | uint32(kind)
}

func DecodeMsgID(id uint32) (module uint8, action uint16, kind uint8) {
    return uint8(id >> 24), uint16(id >> 8), uint8(id)
}

// 路由时只需一次位运算和一次查表，不需要解析字符串
var handlers = map[uint32]Handler{
    EncodeMsgID(0x01, 0x0001, 0x01): handleLogin,
    EncodeMsgID(0x03, 0x0007, 0x01): handleCastSkill,
}
```

The real value of numeric encoding is in **routing efficiency and cross-server forwarding**: the gateway takes a uint32 and can look up and forward, whereas string IDs need to be parsed and compared first, and cannot do prefix wildcarding (e.g., "forward all BATTLE module messages to the battle server" is done with a single check, `(id>>24)==0x03`).

### 5.3 Error Code Design

Error codes should carry enough information for the client to know "what went wrong" and "how to tell the player." Recommended format: **module (8 bit) + error type (8 bit) + error number (16 bit)**.

| Error Type | Value | Client Strategy |
|---------|-----|----------|
| Parameter error | 0x01 | Prompt "please check your input," generally no need to report |
| Logic error | 0x02 | Display specific reason text (insufficient gold, level too low), the text ID is delivered by the server |
| System error | 0x03 | Prompt "please try again later," automatic retries must include backoff and count toward rate limiting |

A frequently overlooked design point: **error text should be localized by the client based on error codes, or the server should deliver a text ID—not the server directly sending Chinese sentences**—otherwise any multilingual support or text revision requires touching the server.

---

## 6. Packet Format Design

### 6.1 Common Packet Header

The packet header is the protocol's "envelope," containing routing, checksum, and control metadata:

| Field | Size | Description |
|------|------|------|
| Magic | 2 bytes | Magic number for quickly identifying valid packets (e.g., 0x474D = "GM") |
| Version | 1 byte | Protocol version number |
| Flags | 1 byte | Flag bits (compression/encryption/fragmentation/priority) |
| MsgID | 4 bytes | Message ID |
| SeqNum | 4 bytes | Sequence number (anti-replay and message deduplication) |
| BodyLength | 4 bytes | Message body length |
| Checksum | 4 bytes | Checksum |

The header is a fixed 20 bytes. Flags is a field worth careful design—compression, encryption, and fragmentation, these "body handling methods," are all marked by it, letting the receiver know how to decode without extra messages.

### 6.2 Why a Magic Number Is Needed: TCP Sticky Packets and Split Packets

TCP is a stream protocol with no concept of a "packet." A single `read` may return half a packet, one packet, or three half-packets (sticky packets/split packets). So a message boundary mechanism is needed; the most common is **length-field framing**: the header declares BodyLength, and the receiver splits the byte stream by length.

```go
// 拆包器：从字节流中切出完整消息（处理粘包/半包）
func (d *Decoder) Next() ([]byte, error) {
    for {
        if d.buf.Len() < headerSize {
            return nil, io.EOF // 数据不够，等下一次读
        }
        header := d.buf.Bytes()[:headerSize]
        if binary.LittleEndian.Uint16(header) != magicNumber {
            // 魔数不对：字节流错位（脏数据或攻击），丢弃一个字节重新同步
            d.buf.ReadByte()
            continue
        }
        bodyLen := binary.LittleEndian.Uint32(header[12:16])
        if bodyLen > maxBodySize {          // 上限校验：防止恶意超长包
            return nil, ErrPacketTooLarge
        }
        if d.buf.Len() < headerSize+int(bodyLen) {
            return nil, io.EOF              // 半包，继续等
        }
        packet := make([]byte, headerSize+int(bodyLen))
        d.buf.Read(packet)
        return packet, nil
    }
}
```

This code has three production-grade defenses: **byte-by-byte resync on magic number mismatch** rather than disconnecting, **an upper bound check on BodyLength** (otherwise a forged 4-byte length could make the server preallocate 4 GB of memory), and **correctly waiting on half-packets** rather than erroring out.

### 6.3 Fragmentation and Reassembly of Large Messages

When the message body exceeds the MTU (typically 1500 bytes on Ethernet, with an even lower effective value on mobile networks), application-layer fragmentation is needed. The key is that **every fragment carries fragmentation information** (fragment ID, total fragment count, current index), and the receiver reassembles once all fragments are collected.

The most common pitfall for a reassembler is **timeout cleanup**: a fragment never arrives due to packet loss, and the reassembly buffer keeps occupying memory. You need a timeout for each incomplete fragment group (e.g., 5 seconds), discarding on timeout. Fragmentation is itself a flag bit in Flags—a packet with the fragmentation flag goes through the reassembly flow rather than being processed directly.

---

## 7. Choosing a Serialization Format

### 7.1 Candidate Format Comparison

| Format | Size | Encode/Decode Speed | Readability | Schema | Suited For |
|------|------|-----------|--------|--------|------|
| JSON | Large (baseline) | Slow | Good | None | Admin backend, debugging, logging |
| Protobuf | 60-80% smaller | 5-10x faster | Poor | .proto files | Core game protocols |
| FlatBuffers | Small | Extremely fast (zero-copy) | Poor | .fbs files | Low-latency hot paths |
| Custom binary | Smallest | Extremely fast | Worst | Documentation conventions | High-frequency small packets like position sync |

### 7.2 Protobuf Version Compatibility Discipline

The reason Protobuf became the go-to for game protocols is the combined advantage of size, speed, strong typing, and code generation. But what makes it able to support a "long-lived contract" is **the discipline of field evolution**—these rules matter more than performance:

1. **Never reuse field numbers**: deprecated fields have their number and name locked with `reserved`, rather than being deleted and having a new field take its place. Reusing a number makes old and new versions interpret completely different data as the same field
2. **New fields must be optional**: old versions receiving a message with unknown fields will skip them (proto3 default behavior), which is the foundation of forward compatibility
3. **Enums only grow, values never change**: when the client receives an unknown enum value, handle it as "unknown type," do not crash or default to the first branch
4. **Do not use required** (the proto1/2 lesson): a required field, once it exists, cannot be downgraded to optional
5. **Nested messages over parallel fields**: leave room for "whole-block replacement" in the future

```protobuf
message PlayerSync {
  reserved 3, 7;              // 已废弃：3=旧战力字段, 7=旧皮肤模型
  reserved "legacy_power";
  uint64 player_id = 1;
  Position pos = 2;           // 嵌套消息，未来可整体替换
  optional int32 skin_id = 4; // 后加的字段，必须 optional
}
```

### 7.3 When to Use JSON

| Scenario | Recommended Format | Reason |
|------|---------|------|
| Core game logic | Protobuf | Small size, fast speed |
| Login/payment interfaces | JSON | Good readability, easy debugging, commonly used for third-party integration |
| Admin backend API | JSON | Native browser support |
| Logging/monitoring | JSON | ELK ecosystem support |
| Real-time sync data | Protobuf/FlatBuffers | High performance requirements |

JSON is not "outdated"—for low-frequency but human-readable interfaces like payment callbacks and operations backends, JSON's debuggability outweighs Protobuf's performance. **Choose the format per link, not one-size-fits-all across the whole project.**

### 7.4 Manual Binary Encoding Techniques

For scenarios with extremely high performance requirements (position sync at dozens of packets per second), you can bypass general-purpose serialization and hand-encode:

```go
// 位置同步包：24 字节固定布局
// | Seq uint32 | X int32 | Y int32 | Z int32 | Flags uint8 | Pad 3B |
func encodePosition(seq uint32, p Position, flags uint8) []byte {
    buf := make([]byte, 20)
    binary.LittleEndian.PutUint32(buf[0:4], seq)
    binary.LittleEndian.PutUint32(buf[4:8], quantize(p.X)) // 浮点→定点
    binary.LittleEndian.PutUint32(buf[8:12], quantize(p.Y))
    binary.LittleEndian.PutUint32(buf[12:16], quantize(p.Z))
    buf[16] = flags
    return buf
}

// 坐标压缩：浮点转定点整数，精度 0.01
// -10000.00 ~ 10000.00 映射到 int32，比 float32 省 0 字节
// 但避免了浮点跨平台误差，还方便 delta 压缩
func quantize(v float32) uint32 {
    return uint32(int32(v*100) + 1000000) // 偏移保证非负
}
```

Three key techniques:

- **Varint encoding**: small values use fewer bytes (<128 takes 1 byte, <16384 takes 2 bytes)—suitable for small numbers like IDs and levels
- **Fixed-point coordinates**: float to integer (precision 0.01), also eliminating cross-platform floating-point errors
- **Bitfield encoding**: one byte stores 8 booleans (standing/moving/attacking/invincible...), replacing 8 bool fields

The cost is zero readability and a manual byte-layout document to maintain. So it is only used on hot paths where **profiling has confirmed the need**, not rolled out across the whole project.

---

## 8. Compression and Message Coalescing

### 8.1 Compression Thresholds and Algorithm Selection

Not every message needs compression—compression has CPU overhead, and small messages may not be worth it:

```text
消息类型判断:
  ├── 小消息（< 64 bytes）→ 不压缩
  ├── 中等消息（64-256 bytes）→ 根据频率决定
  ├── 大消息（> 256 bytes）→ 压缩
  └── 批量数据 → 需要压缩

压缩算法选择:
  ├── LZ4 → 速度快，压缩率低（适合实时消息）
  ├── zlib → 平衡（适合一般消息）
  ├── zstd → 压缩率高，速度适中（适合大文件）
  └── Snappy → 极快，压缩率最低（适合日志）
```

The compression toggle lives in the header Flags, letting each message decide independently—this way you can turn compression off during debugging to capture packets, and only compress large packets in production.

### 8.2 Delta Compression (Incremental Sync)

Delta compression is one of the most important optimizations in game synchronization: **send only changed data, not the full payload**.

A player's position sync includes coordinates (x,y,z), facing, velocity, and state. If only coordinates changed, send only coordinates. A common implementation is a **dirty-flag bitmask**:

```go
const (
    FieldX uint16 = 1 << iota
    FieldY
    FieldZ
    FieldRotation
    FieldVelocity
    FieldState
)

func encodeDelta(prev, cur *PlayerState) []byte {
    mask := uint16(0)
    if prev.X != cur.X { mask |= FieldX }
    // ... 逐字段比较
    buf := writeUint16(mask)        // 先写 2 字节位掩码
    if mask&FieldX != 0 { buf = append(buf, quantize(cur.X)...) }
    // ... 只写变化的字段
    return buf
}
```

The receiver unpacks bit by bit according to the mask, and fields not present keep their local old values. This optimization can reduce sync traffic by 50-80%. A matching discipline: **if the delta exceeds half the full payload, send the full payload directly**, otherwise the mask-plus-delta overhead is actually greater.

### 8.3 Message Coalescing

Coalescing multiple small messages into one large message before sending can amortize the ~40-byte IP+TCP header overhead per packet: sending 10 ten-byte small messages costs 360 bytes more in header overhead than sending one 100-byte message.

The coalescing granularity is driven by the frame: at the end of each logic frame (e.g., 15 Hz), all messages destined for the same player within that frame are combined into one packet. This also naturally echoes Chapter 5's room single-writer model—**state changes within a frame are aggregated in the room thread, and broadcast once as a finished unit**. Note to use this in conjunction with `TCP_NODELAY` (see Chapter 5): coalescing solves "too many packets," and disabling Nagle solves "small packets being held back unsent"—together they form a complete sending strategy.

---

## 9. Security Design

### 9.1 Encryption Layers

```text
┌─────────────────────────────────────┐
│           应用层加密                  │
│   (消息签名、防篡改、字段级加密)       │
├─────────────────────────────────────┤
│           传输层加密                  │
│   (TLS / DTLS)                      │
├─────────────────────────────────────┤
│           网络层加密                  │
│   (IPSec / VPN，机房间链路)           │
└─────────────────────────────────────┘
```

A common strategy: general games use TLS transport encryption + message signing for critical operations; high-security requirements (involving assets) add application-layer AES. Two reminders: UDP links need DTLS or a self-implemented encryption—TLS does not cover UDP; and application-layer encryption keys must not be hardcoded in the client (they will be extracted by reverse engineering)—session-level key negotiation is needed.

### 9.2 Replay Attack Defense

A replay attack is when an attacker intercepts a legitimate message and resends it—for example, replaying a "purchase" message 100 times. The defense is **sequence numbers + a sliding window**:

```go
type ReplayGuard struct {
    latest uint32   // 已见过的最大序列号
    seen   []uint64 // 位图，记录窗口内的历史序列号
}

const windowBits = 512

func (g *ReplayGuard) Check(seq uint32) bool {
    if seq > g.latest {                       // 新序列号：前移窗口
        shift := seq - g.latest
        if shift >= windowBits {
            g.seen = make([]uint64, windowBits/64) // 窗口整体滑过
        } else {
            for i := uint32(0); i < shift; i++ {   // 滑动并清理
                g.shiftOne()
            }
        }
        g.latest = seq
        g.mark(seq)
        return true
    }
    if seq+windowBits <= g.latest { return false } // 窗口外：拒绝
    return !g.test(seq)                            // 窗口内未见：放行
}
```

Each connection maintains its own guard (reset after successful login). Sequence numbers also serve as message deduplication—when reconnecting to resume a session, use them to identify "which messages have already been processed."

### 9.3 Rate Limiting

A token bucket is the foundation for flood protection: one bucket per client, tokens are replenished at a steady rate, sending messages consumes tokens, and if there are no tokens, reject (or drop):

```go
type TokenBucket struct {
    tokens float64
    max    float64
    rate   float64 // 每秒补充量
    last   time.Time
}

func (b *TokenBucket) Allow(n int) bool {
    now := time.Now()
    b.tokens = min(b.max, b.tokens+now.Sub(b.last).Seconds()*b.rate)
    b.last = now
    if b.tokens < float64(n) {
        return false            // 触发限流：计入指标，连续超限可踢线
    }
    b.tokens -= float64(n)
    return true
}
```

Tiered rate limiting is more practical: a global threshold (e.g., 50 msg/s) to prevent scripted packet flooding, with separate thresholds for specific operations (gacha 1/s, movement 30 packets/s). Rate limit triggers must leave evidence (logs + metrics); it is the first signal source for Chapter 18's anti-cheat system.

### 9.4 Client Reports Are Only Claims

A security principle that runs through all of protocol design: **all data sent by the client is merely a "claim," and the server is responsible for adjudication**. A movement packet claims "I moved here"—the server validates whether the speed is possible; a damage packet claims "I hit"—the server recalculates according to combat rules. When designing protocol fields, think clearly: which fields can the client forge freely (all need validation), and which are purely presentational (harmless). The full elaboration of this principle is in Chapter 18, Security and Risk Control.

---

## 10. Broadcasting, Weak Networks, and Real Network Environments

### 10.1 The Two Amplifiers of Room Broadcasting

Room-based scenarios differ from peer-to-peer interaction and naturally have two amplifiers:

- **One player's anomaly affects the whole room**: a single weak-network player can drag down the sync cadence for the entire room
- **The same change goes to many people**: the sending cost of a state change = number of changes × number of recipients

When one player is on a weak network, it is not just that player who stutters—it can also trigger: room broadcast backlog, slowed sync cadence, rising retransmission and catch-up costs, and other players seeing that player's state as abnormal. So broadcast design and weak-network governance need to be done together, not each on its own.

### 10.2 Broadcast Optimization Is First and Foremost Semantic Optimization

The easiest mistake is to send the full payload to everyone as soon as state changes. It works with a small headcount, but as players, objects, and weak-network connections grow, it immediately breaks down. A more robust approach:

- **Distinguish critical from non-critical broadcasts**: combat events must be delivered; chit-chat emotes can be dropped
- **Allow latest to overwrite old**: a lost position packet need not be retransmitted, the next packet naturally updates
- **Coalesce, throttle, and prune**: players far away sync at 5 Hz, those in view at 15 Hz; those out of view only get existence updates
- **Customize granularity per recipient**: you receive full state, others only receive the parts that affect them

The core question is **"what is worth sending, and at what granularity"**, not just "how to compress the packet." Compression (Section 8) is the last layer of optimization; semantic pruning is the first layer.

### 10.3 The Everyday Reality of Domestic Mobile Networks

Acknowledge these realities directly in design, rather than treating them as special incidents:

- Wi-Fi and cellular switching is very frequent (going outside, entering an elevator)
- Elevators, subways, and underground garages cause brief outages and large jitter
- Different carriers and regions show obvious link quality differences
- Backgrounding, screen locking, and incoming calls interrupt network behavior
- Device performance affects send/receive cadence and reconnection speed

Concrete requirements for protocol design: **reconnection must be lightweight** (session persistence + incremental sync, not redoing the full login); **heartbeat intervals must account for carrier NAT timeouts** (typically 30-60s, too short wastes battery and data, too long gets cut off by NAT); **the client should proactively degrade on weak networks** (auto-throttle sync, buffer input) rather than waiting for a timeout.

### 10.4 P2P and NAT Traversal

| Feature | C/S Architecture | P2P Architecture |
|------|---------|---------|
| Authority | Server (single authority) | Any client / no authority |
| Latency | Two hops (C→S→C) | One hop (C↔C) |
| Bandwidth cost | High (server forwarding) | Low (client direct connection) |
| Anti-cheat | Easy (server authority) | Hard (lock-step input sync / rollback adjudication) |
| Applicable scenarios | MMO, MOBA, competitive FPS | Fighting, racing, casual PvP |

Most modern competitive games use a **hybrid architecture**: matchmaking, room management, and NAT traversal coordination go through the server, in-match data goes over P2P direct connection, and falls back to server forwarding on direct connection failure. GGPO's rollback network stack, commonly used in fighting games, is a combination of "P2P + input delay + deterministic rollback."

NAT type determines whether two clients can connect directly:

| | Full Cone | Restricted Cone | Port Restricted | Symmetric |
|---|-----------|-----------------|-----------------|-----------|
| Full Cone | ✓ | ✓ | ✓ | ✗ |
| Restricted Cone | ✓ | ✓ | ✗ | ✗ |
| Port Restricted | ✓ | ✗ | ✗ | ✗ |
| Symmetric | ✗ | ✗ | ✗ | ✗ |

Common techniques: **STUN** (discover your public mapping), **TURN** (relay fallback), and **ICE** (orchestrating the two above into a complete connectivity check flow). The key engineering metric is **direct connection success rate**—the proportion of Symmetric NAT on mobile cellular networks is not low, and 10%-30% of sessions will ultimately need TURN relay, so relay server deployment costs must be planned for in advance.

---

## 11. Protocol Governance: Making the Contract Enforceable

### 11.1 Single Source of Truth

Protocol definitions need a single authoritative source—usually a `.proto` file repository (or equivalent IDL repository), from which client and server encode/decode code, message ID constants, error code tables, and documentation are generated. No side should hand-write message structures—drift in hand-written versions is the beginning of "both sides interpreting the same message differently."

### 11.2 Protocol Change Process

A minimum viable configuration:

1. **Changes go through MR/PR review**: the blast radius of a protocol change (which modules, which versions) is confirmed by a second reviewer
2. **Numbers are only allocated, never reclaimed**: deprecated messages keep their definitions marked deprecated, and numbers are never reused
3. **Explicit compatibility windows**: how long the old protocol is retained after a new one ships (one channel review cycle + one major version, typically 4-8 weeks)
4. **Dual-run validation**: critical messages run old and new formats in parallel for a period, comparing results for consistency before switching traffic

### 11.3 Version Negotiation

The client reports its protocol version at login, and the server decides: serve directly, serve in degraded mode (masking new-feature messages), or require a forced update. The Version field in the packet header is reserved for this. Projects with long channel review cycles (iOS review takes a week) must design the protocol compatibility window around the **slowest participant**, not their own release cadence.

---

## 12. Protocol Design Checklist

```text
□ 1. 消息按语义分类（强控制/强实时/弱实时/外围/大包），分链路处理
□ 2. 消息命名规范统一（模块_动作_方向），ID 数字编码
□ 3. 消息 ID 按模块分段，预留扩展空间，编号永不复用
□ 4. 错误码含模块+类型+编号，客户端处理策略明确
□ 5. 包头包含魔数、版本、Flags、长度、序列号
□ 6. 拆包器处理粘包/半包/错位/超长包
□ 7. 大消息支持分片重组，重组缓冲有超时清理
□ 8. Protobuf 字段演化纪律（reserved/optional/枚举只增）
□ 9. 压缩按消息阈值开关，算法按场景选择
□ 10. 高频同步用 Delta + 位掩码，差异过大回退全量
□ 11. 一帧内消息合并发送，配合 TCP_NODELAY
□ 12. 防重放：序列号 + 滑动窗口，按连接隔离
□ 13. 速率限制：全局 + 分级令牌桶，触发留证据
□ 14. 客户端上报只是声明，服务端裁决
□ 15. 弱网场景：轻量重连、降级同步、心跳匹配 NAT 超时
□ 16. 协议单一事实源 + 代码生成，变更走评审
□ 17. 兼容窗口按最慢参与方设计，关键消息双跑验证
```

---

## 13. Code Example: The Complete Journey of a Frame's Message

The preceding sections unfolded parts by design dimension—message IDs, packet headers, the decoder, replay defense, rate limiting. This section assembles them into **one complete receive pipeline**, showing what defenses a frame's message passes through in sequence from byte stream to business processing. The example is a minimal implementation for explanation (omitting engineering details like timeouts, metrics reporting, and connection management), but its backbone is isomorphic to a production implementation.

### Packet Header and Full-Frame Encoding/Decoding

```go
// 包头固定 20 字节，与 6.1 的字段表一一对应
const (
    magicNumber = 0x474D // "GM"：字节流错位时逐字节重同步的锚点
    headerSize  = 20
)

type Header struct {
    Version uint8  // 协议版本，版本协商用（见 11.3）
    Flags   uint8  // 压缩/加密/分片标记位，接收方按位决定如何解包
    MsgID   uint32 // 模块(8)+动作(16)+类型(8)，路由的唯一依据
    SeqNum  uint32 // 防重放与去重，按连接单调递增
}

// 编码：定长包头在前，包体紧随其后
func EncodeFrame(h *Header, body []byte) []byte {
    buf := make([]byte, headerSize+len(body))
    binary.LittleEndian.PutUint16(buf[0:2], magicNumber)
    buf[2] = h.Version
    buf[3] = h.Flags
    binary.LittleEndian.PutUint32(buf[4:8], h.MsgID)
    binary.LittleEndian.PutUint32(buf[8:12], h.SeqNum)
    binary.LittleEndian.PutUint32(buf[12:16], uint32(len(body)))  // 长度上限校验的依据
    binary.LittleEndian.PutUint32(buf[16:20], crc32.ChecksumIEEE(body))
    copy(buf[headerSize:], body)
    return buf
}
```

Field order, once shipped, is a contract—this is what Section 6.1 means when it calls the header the "envelope." **The checksum covers only the body**: a header error is equivalent to the entire byte stream being misaligned, which the magic number is responsible for detecting and resyncing—two mechanisms, each guarding one layer.

### Receive Pipeline: Defenses Ordered by Cost

```go
// 一帧消息的旅程：拆包产物 → 防重放 → 限流 → 路由 → 按需解压 → 业务
// 防线排序原则：便宜的在前，昂贵的在后，让伪造包在早期就被拦下
func (s *Server) OnPacket(conn *Conn, packet []byte) {
    h, body, err := decodeFrame(packet)      // 1. 魔数/长度/校验（6.2 拆包器的产物）
    if err != nil {
        conn.CloseWithError(err)             // 结构性错误：踢线，不做字节级猜测
        return
    }
    if !conn.replay.Check(h.SeqNum) {        // 2. 防重放（9.2），每个连接独立 guard
        metrics.Inc("replay_dropped")        // 静默丢弃：不回错误包，不向攻击者暴露探测信号
        return
    }
    if !conn.limiter.Allow(1) {              // 3. 令牌桶限流（9.3），全局 + 分操作阈值
        metrics.Inc("rate_limited")          // 触发留证据：限流是风控体系的第一道信号源
        return
    }
    handler := s.route[h.MsgID]              // 4. 一次位运算 + 一次查表（5.2 的路由红利）
    if handler == nil {
        s.replyError(conn, h.MsgID, ErrUnknownMsg)
        return
    }
    if h.Flags&flagCompressed != 0 {         // 5. 按需解压：只有通过前三道防线的包才值得花 CPU
        if body, err = decompress(body); err != nil {
            return
        }
    }
    handler(conn.Session, body)              // 6. 进入业务逻辑，此时消息已可信、有界
}
```

**Order is design**. Replay defense is an O(1) bitmap operation, and the token bucket is O(1) floating-point arithmetic—both far cheaper than decompression and business processing; placing decompression after the defenses means forged traffic cannot consume decompression CPU. The three production-grade defenses from 6.2 (resync, length upper bound, half-packet waiting) all happen before step 1—the decoder blocks structural attacks, and this pipeline blocks semantic attacks.

### Fragment Reassembler: Timeout Cleanup Is the Soul

```go
type fragmentGroup struct {
    total    int               // 预期分片数，来自首个分片的包头
    received map[int][]byte    // 已收到的分片，按索引存放
    deadline time.Time         // 单组生存期：超时整体丢弃
}

func (r *Reassembler) Accept(f Fragment) []byte {
    g := r.groups[f.Key()]
    if g == nil {
        g = &fragmentGroup{received: make(map[int][]byte), deadline: time.Now().Add(5 * time.Second)}
        r.groups[f.Key()] = g                // 首个分片到达时建组
    }
    g.received[f.Index] = f.Payload
    if len(g.received) < g.total {
        return nil                           // 未收齐，继续等
    }
    delete(r.groups, f.Key())                // 收齐：重组并释放
    return join(g.received)
}

// 后台定时清理：丢包或攻击都会制造永远等不齐的组
func (r *Reassembler) Sweep(now time.Time) {
    for key, g := range r.groups {
        if now.After(g.deadline) {
            delete(r.groups, key)            // 超时丢组：内存防线的最后一环
        }
    }
}
```

What the reassembler most easily omits is precisely `Sweep`—without it, a single fragment lost in transit leaks a whole buffer group until process restart; and when fragment IDs are maliciously forged, it is also a **memory defense**. This is consistent with 6.3's conclusion: half the complexity of fragmentation lies in timeout governance of reassembly.

These three sections together are the executable form of items 5 through 13 on this chapter's Checklist. In a real deployment, decoding, replay defense, and rate limiting are all completed in the access layer, so the business handler already receives clean, bounded, and trustworthy messages—**the goal of protocol design is to let business code safely "defend against nothing."**

---

## 14. Chapter Summary

| Key Question | Answer |
|---------|------|
| What is the first action of protocol design? | Decompose message semantics (five categories), not choosing TCP or UDP |
| Why are reliability, ordering, and compatibility discussed separately? | Their governance methods are entirely different: acknowledgment + retransmission / sequence number window / field-evolution discipline |
| How to design message IDs? | uint32 of module(8)+action(16)+type(8); numeric encoding supports efficient routing |
| How to solve TCP sticky packets? | Length-field framing + magic number checksum + length upper bound; the decoder's four tasks are all indispensable |
| What is the foundation of Protobuf compatibility? | Never reuse field numbers (reserved), new fields optional, enums only grow |
| What is the most effective bandwidth optimization? | Not compression, but semantic pruning: Delta sync + distance-based throttling + drop-old-keep-new |
| How to do replay defense? | Sequence numbers + sliding window bitmap, isolated per connection |
| What is the essential question of broadcast? | "Who should know what change"—prune semantics first, then discuss compression |
| How to maintain protocols long-term? | Single source of truth + code generation + change review + compatibility window designed around the slowest participant |

---

## 15. Practical Case: Diagnosing a "Character Walking Backwards" Sync Rollback During Combat

> This case is a demonstration example (not drawn from a real project); numbers are rounded for simplicity. It pushes 10.1's broadcast amplifiers, 10.2's semantic pruning, and 6.3/13's fragment reassembly timeout into deep water: walking through each position packet to answer "who sent each frame of the backward movement"—this is message-level troubleshooting of network synchronization, and the full elaboration of the four-character summary "drop old, keep new."

**Background and symptom**: Two days after the MOBA's new season "Speed Mode" launched, high-ranked players progressively reported that during combat their character "walked backwards"—a step already taken, then the character gets yanked back half a step, and then resumes. A customer complaint sample of **5,000** matches found **50** with pull-backs, a pull-back match rate of **1%**; the previous version at the same baseline was only **0.1%**, making it **10x** after the version. Pull-back is not a disconnect and not a teleport; the visuals are smooth throughout—all three sides claim they have no issue.

### Step 1: Symptom and Baseline—First Define "Pull-Back" as a Reconcilable Event

The pull-back judgment baseline is unified as: **the client-predicted position is pulled back by the server's authoritative state, with a deviation exceeding 2 body lengths of visual correction**. Three baselines sampled from the same batch of matches:

- **Client event tracking**: **50** matches triggered pull-backs—the sole recorder of the symptom
- **Server authoritative position logs**: **0** anomalies flagged—sequence numbers are contiguous, no gaps; from the server's perspective everything is normal
- **Observability dashboard**: RTT median **45 ms** all green, but RTT P95 for pull-back matches is **210 ms**, **4.7x** higher than the median—the average baseline hid the incident matches inside the percentile (same lesson as Chapter 13's "all-green monitoring")

The baseline disagreement itself is a clue: **messages all arrived, and the order was correct, but the state rolled back**—this rules out reliability problems (the three things in 2.3) and narrows the investigation to "how old and new state are used": this is not packet loss, it is consumption discipline.

### Step 2: Layered Attribution—A Message Ledger from Link to Broadcast

```text
链路层   RTT 中位 45ms、重传率 1.2%——链路健康，排除网络劣化
协议层   回拉帧前后序列号连续、无重传缺口——排除丢包与乱序
消息层   回拉前断流 1.2s 无位置包，恢复后一帧突发 12 条（10Hz × 1.2s）全是断流前旧值
         客户端逐条消费旧值，把角色一步步拖回去——丢旧保新（10.2）未实现
广播层   96 人房间：95 个接收者 × 每秒 10 次 = 950 条/秒/发送者，全房间 9.12 万条/秒
         断流玩家的接收队列被持续灌满，1.2s 断流（10.3 电梯/地铁场景）后积压是必然
特效链路 4200 字节大招特效包按 1400 字节 MTU 分 3 片，2% 丢包下整包收齐率 0.98³ ≈ 94%
         6% 的帧因分片不齐被跳过，下一帧到达时触发第二次纠偏
```

The ledger converges: a **96**-person room at **950** messages/s per sender, **91,200** messages/s for the whole room; **1.2 s** of outage followed by a burst of **12** stale position packets (**10 Hz × 1.2 s**); the **4,200**-byte ult effect packet split into **3** fragments at a **1,400**-byte MTU, with a full-packet reception rate of **94%** under **2%** packet loss and a **6%** missing-frame rate.

- **By link**: position over UDP/KCP data plane, events over TCP control plane (the competitive combination in 4.4)—backward movement only occurs on the position link
- **By scenario**: **46** matches occurred during weak-network periods, stable Wi-Fi only reproduced **4** matches—overlapping with the outage map in 10.3

### Step 3: Root Cause—Three Conditions Held Simultaneously, and No Contract Blocked Any of Them

1. **Direct cause**: position packets use "latest wins" semantics (10.2), but the client consumed them one by one—the **12** stale values backlogged during the outage were applied step by step as state, dragging the character back; layered with the **6%** ult effect fragment missing-frame rate triggering a second correction, the pull-back was amplified into visible "walking backwards"
2. **Mechanism cause**: the broadcast amplifiers (10.1) were wide open—a 96-person room pushing at **950** messages/s per sender with no distance-based throttling from 10.2 (5 Hz/15 Hz) and no critical/non-critical classification—the backlogged weak-network player was a certainty of the design, not an accident
3. **Contract cause**: the **17** items on §12's Protocol Design Checklist include fragment timeout (item 7) and replay defense (item 12), but uniquely lack "broadcast message budget" and "position packet old/new overwrite discipline"—10.2's semantic pruning stopped at a recommendation; without entering contract review there is no gate. This is the same kind of gap as Chapter 19's "the budget sheet only has memory watermarks, no render budget": security and format have a ledger, but budget and consumption discipline do not

### Step 4: Remediation and Backfill

Remediation ordered by "benefit / cost":

1. Client position consumption adds sequence-number old/new checks; on outage recovery only take the latest value: pull-back from 50 matches → **5** matches
2. Effect packets classified per 10.2: critical skill reliable channel over TCP, non-critical effects compressed to a single **900**-byte unfragmented packet (< 1400 MTU)
3. Position broadcast tiered by distance: **10** players in view × **15** Hz + **85** players out of view × **1** Hz = **235** messages/s per sender, a **75%** reduction from **950**
4. Backlog depth, fragment reassembly discard rate, and pull-back rate enter monitoring percentiles (Chapter 13 baseline)

Verification: a sample of 5,000 matches found **5** pull-backs (**0.1%**, back to the previous version baseline, a **90%** reduction); pull-back match RTT P95 went from 210 → **70 ms**, back to the same order of magnitude as the median; the position link no longer depends on fragment reassembly.

**Backfill checklist** (echoing Chapter 14's retrospective backfill discipline):

| Backfill Item | Owner | Completion Standard |
|--------|------|---------|
| Add "broadcast message budget" and "position packet old/new overwrite discipline" to §12 Checklist, enter protocol review | Protocol governance | Review passed and one change cycle run |
| Position sync acceptance gate: pull-back rate ≤ 0.1%, distance-based tiering effective (echoing Chapter 20's performance acceptance thresholds) | QA/Client | Enter version acceptance checklist |
| Monitoring percentiles: broadcast backlog count, fragment reassembly discard rate, pull-back rate reported at P95 (echoing Chapter 13 baseline) | Server/Data | Dashboard live |
| Protocol contract adds "broadcast message/byte budget," managed with equal weight to security items (echoing Chapter 19's budget lesson) | Server/Protocol governance | Contract review passed |

### Three Lessons from This Case

1. **"Delivered" and "ordered" can both be correct, and the state can still be wrong**. 2.3 separates reliability, ordering, and compatibility into three things; this case adds a fourth question: **who decides between old and new**—drop-old-keep-new is protocol semantics, not a client implementation detail
2. **The average baseline hid the incident again**. RTT median 45 ms alongside P95 210 ms—the networking version of Chapter 13's "all-green monitoring": if percentiles do not enter the dashboard, incidents only live in customer complaints
3. **Broadcast cost = number of changes × number of recipients (10.1), so the budget must be set per room size**. 950 messages/s is not a performance problem, it is a contract missing a budget item—isomorphic to Chapter 19's "the budget sheet has no render budget"

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [index](/games/index.md)
- [index](/history/index.md)
