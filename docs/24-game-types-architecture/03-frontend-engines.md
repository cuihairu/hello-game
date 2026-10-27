# 03 Frontend Engines and the Client

> In my server-side work I keep running into client constraints feeding back into server design: protocol selection, timeout and reconnection strategy, multi-platform account identity, response size, and the resource version interface all revolve around the engine, the network layer, and the asset system. Here I organize observations along these boundary lines; no prior client implementation experience is required of the reader.
>
> **Reference books**: the engine characteristics reference each engine's official documentation plus the multi-platform adaptation practice in *Million Online*; the method for analyzing the frontend/backend boundary references the "Frontend/Backend Boundary and Network Layer" piece on the knowledge base main line.

---

## 1. Why the Server Side Should Understand Frontend Engines

Many server-side developers feel "the frontend is the client's business, none of mine". But the reality is: **your API design, protocol formats, and message push strategies all need to account for client engine limits and characteristics**.

For example, the WeChat mini-game main package is only 4MB; if your protocol definition file is too large, the client simply cannot fit it. Another example: Unity's WebSocket implementation gets suspended by the system when iOS apps go to the background. If you don't know this, you will make mistakes designing the reconnection mechanism — misreading "background switched back to foreground" as "network exception" and triggering unnecessary re-logins.

Understanding frontend engines is not about writing client code; it is about understanding three things: **what are the client's constraints? How does the client's network layer work? What limits does the client's asset management have?**

### 1.1 The Most Important Boundary: Three Classes of Logic

Most long-running wrangling in frontend/backend collaboration traces back to having no clear standard for "who implements this piece of logic". A reasonably safe division splits logic into three classes:

| Logic Class | Content | Ownership | Server-Side Point |
|---------|------|------|----------|
| Presentation logic | Effects, animation, camera, UI transitions, local hints | Client | No server involvement needed |
| Interaction logic | Input response, page state, local validation, local prediction | Client (with boundaries) | Server retains final adjudication |
| Authoritative logic | Asset changes, combat adjudication, matchmaking results, room state, payment results | **Server** | Client presents server results |

The first two classes stay on the client in exchange for fluid experience; the third must be decided by the server. The most error-prone zone is the blurry boundary: the client did an "optimistic deduction" (deduct local diamonds first, then send the request) while the server has no reconciliation logic — once the request fails, the locally deducted diamonds become an accounting black hole. **The standard: for any operation affecting numbers, assets, or win/loss, the client may only "anticipate", never "decide".**

### 1.2 The Impact of Engine Choice on the Server

| Engine | Language | Platforms | Network Solution | Impact on the Server |
|------|------|------|---------|--------------|
| **Unity** | C# | All platforms | WebSocket/Mirror | Needs connection manager, heartbeat mechanism |
| **UE5** | C++/Blueprints | PC/Console | Built-in network framework/UDP | May need a custom UDP reliability layer |
| **Cocos Creator** | TypeScript | Mini-games/Web | WebSocket/HTTP | Mini-game package limits, HTTP-dominant |
| **Godot** | GDScript/C# | All platforms | MultiplayerAPI | ENet/UDP reliability layer |
| **LayaAir** | TypeScript/AS3 | Mini-games/Web | WebSocket/HTTP | Similar to Cocos Creator; common for 3D mini-games |

Engine selection decision tree (client perspective):

```text
选择什么引擎？
│
├── 微信/抖音小游戏
│   ├── Cocos Creator（生态最好）
│   └── LayaAir（3.0 性能优化好）
│
├── 手游（iOS/Android）
│   ├── Unity（人才最多，生态成熟）
│   └── Cocos Creator（小游戏+手游一体化）
│
├── PC/主机 3A
│   ├── Unreal Engine 5（画面上限高）
│   └── Unity（中等品质，效率高）
│
└── 独立游戏
    ├── Godot（开源免费，MIT 协议）
    ├── Unity
    └── Unreal Engine
```

Viewed from the server side, this decision tree says: **the first two branches (mini-games, mobile) are basically the WebSocket + Protobuf combination**, and the server needs only one access protocol; UE5 projects require considering a custom UDP protocol; if the product covers both mini-game and App (a very common publishing strategy), the server needs **the same logic serving two access forms** — unified protocol layer, access layer routed per platform.

### 1.3 The Server's Deep Water in Multi-Platform Publishing: One Person's Many IDs

"The same logic serving two access forms", landing on the account system, is multi-platform publishing's most typical problem: **the same real player is a different platform identity on each platform**.

| Platform-Side Identity | How Obtained | Trust Scope | Notes |
|-----------|---------|---------|------|
| openid (WeChat) | code2session | Unique only within the current appid | Different mini-programs/Apps under the same entity have different openids |
| unionid (WeChat) | Returned with login after binding to the WeChat Open Platform | Unique across platforms under the same Open Platform entity | **Without the App binding to the Open Platform you cannot get it** |
| Phone number | Carrier one-tap login / SMS verification code | Stable across all platforms | The most reliable cross-platform anchor, but with cost and coverage issues |
| Guest ID | Device identifier / client-generated UUID | This device only | Lost on uninstall or device change; must support later upgrade binding |

The server needs an independent identity binding table, mounting multiple platform identities around the in-game UID:

```sql
CREATE TABLE user_identity (
  id_type    TINYINT  NOT NULL,     -- 1=wechat_openid 2=unionid 3=phone 4=guest
  id_value   VARCHAR(128) NOT NULL,
  uid        BIGINT   NOT NULL,     -- 游戏内唯一 ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_type, id_value),
  KEY idx_uid (uid)
);
```

The login decision logic is straightforward: look up `uid` by `(id_type, id_value)`; on hit, log in; on miss, create a new player and write the binding. All the trouble is in **merge conflicts**: a player played for a week as a guest (uid=1001, has topped up), then one day logs in with WeChat — and that WeChat identity had already created uid=2002 on another device. Both uids hold real assets, and neither can be silently dropped. Common adjudication approaches:

- **Let the player choose** (which progress to keep) instead of backend auto-merge — there is no universally convincing answer for merging inventories, payment records, and leaderboard ranks; auto-merge almost inevitably produces complaints
- If the product decides on auto-merge, the merged account enters a "contestable freeze period" during which customer support can roll back per records
- Identity anchors are tiered by trust: unionid and phone number are high-trust anchors; openid is trusted only within its appid; **never use weak signals like "same nickname" as merge grounds**

> **Trap**: many teams discover only after launching mini-game + App on both ends that accounts are not interoperable; the root cause is that the App side never went through the WeChat Open Platform binding flow — no unionid available, openid inherently non-interoperable, and at that point only phone-number rebinding can save it, costing a full operational cycle. **Confirm the identity anchor plan at dual-platform project approval** — this is the question the server side should proactively ask in the approval review.

---

## 2. Unity: The Backbone of the Mobile Market

### 2.1 The Typical Structure of Unity's Client Network Layer

The Unity client's network layer is usually split into four layers: **transport** (WebSocket/TCP/KCP) → **protocol** (Protobuf/JSON) → **message dispatcher** (Dispatcher) → **game logic**.

Two points matter to the server. First, Unity's WebSocket behaves differently per platform: iOS suspends the connection in the background; Android restricts network activity in power-saving mode. This requires the server's timeout judgment to be tolerant enough — **"temporarily silent" is not "disconnected"**. Second, Unity projects usually handle network I/O with async/await; the client is insensitive to tens of milliseconds of response latency, but this is no reason to ignore performance — high latency is directly felt by players in key interactions like combat and gacha.

The heartbeat timeout threshold can be set from a simple derivation:

```text
超时阈值 ≥ 客户端最长合法静默时长 + 网络最大抖动 + 服务端处理余量
```

The problem is that "longest legitimate silence" has no stable value on mobile: iOS backgrounding typically lasts minutes and the connection auto-recovers when the user returns; under some Android vendors' power-saving policies, silence can exceed 10 minutes. With a 10-second heartbeat interval and a 30-second threshold (tolerating 2 lost heartbeats), backgrounded players get batch-misjudged as disconnected — and they come back minutes later and should not have to suffer re-login and state loss.

So mobile long connections generally use **explicit suspension** instead of guessing: the client sends a `suspend` packet when going to the background and a `resume` packet when returning to the foreground. On receiving suspend, the server freezes that session's heartbeat timer and manages it by a "grace period" (minutes to half an hour, set by product form); within the grace period, resources are not released and messages keep queuing; on resume, timing resumes and messages from the offline period are re-sent. Only grace period expiry truly disconnects and goes through the full reconnection flow. **The basis for judging "disconnected" changes from "no heartbeat received" to "the client said suspend and the grace period has passed"**, and the misjudgment rate drops by an order of magnitude. Without suspend/resume, the fallback is loosening the heartbeat threshold to minute-level, at the cost of truly dead links taking minutes to reclaim.

### 2.2 The Protocol Integration Trio

Unity teams usually use Protobuf + WebSocket. The server needs to provide:

1. **Protobuf definition files** (.proto): client and server share one protocol definition, from which both sides' codec code is generated (see protocol governance in Chapter 4)
2. **Message ID encoding rule**: module(8bit) + action(16bit) + type(8bit), both sides using the same ID constant table
3. **Error code system**: unified format; the client decides popup, toast, or silent retry by error type

### 2.3 Common Problems and Server Responses

| Problem | Cause | Server Response Strategy |
|------|------|--------------|
| Message sticking | TCP stream transport | Message header contains a length field (see the chapter 4 unbundler) |
| State lost after disconnect | Client cache expiry | Provide a state snapshot interface |
| Large message splitting | Protocol limits | Support segmented sending + message reassembly |
| SSL certificate issues | Platform differences | Complete certificate chain, compatible with system certificate stores |
| Background connection killed | iOS/Android restrictions | Reconnection mechanism + state recovery |

"Reconnection + state recovery" deserves expansion because it is designed in, not patched in. The server needs a set of supporting interfaces: **session retention** (when the connection breaks the session token persists; reconnecting with the token skips re-login), **incremental recovery** (the client reports the last sequence number it received, and the server re-sends only the gap, not a full re-push), **snapshot fallback** (when the gap is too large, send a full snapshot directly — cheaper than re-sending hundreds of messages). The re-send window can be implemented with a ring buffer:

```go
// 会话：连接断开后并不销毁，而是进入"待重连"状态
type Session struct {
    UID       int64
    Token     string        // 会话凭证；重连校验通过即复用，无需重新走登录
    SendSeq   uint64        // 本会话已下发的最后一条消息序号
    Pending   *RingBuffer   // 未确认消息的环形缓冲（容量 = 补发窗口）
    Snapshot  func() []byte // 全量快照生成器（业务层注册，兜底用）
}

// 重连处理：客户端携带 token 和它最后收到的 seq
func (s *Session) OnReconnect(conn Conn, lastAck uint64) error {
    gap := s.SendSeq - lastAck
    if gap == 0 {
        return nil // 没有缺口，直接恢复收发
    }
    if gap <= uint64(s.Pending.Cap()) {
        // 缺口在补发窗口内：按序重放，客户端按序号去重
        return s.Pending.Replay(conn, lastAck+1)
    }
    // 缺口太大（窗口外的消息已不在内存）：快照兜底更便宜
    conn.Send(&Msg{Type: MsgSnapshot, Body: s.Snapshot()})
    return nil
}
```

Three design points deserve attention. **The re-send window size is a trade-off between memory and snapshot cost**: the larger the window, the more disconnection scenarios it covers, but the more memory each awaiting-reconnect session occupies — 10,000 online players with a 1,000-message window each means tens of millions of resident elements. **The snapshot generator is registered by the business layer**, because only the business knows "what counts as complete state"; this is also why snapshot fallback is usually split by module (inventory snapshot, room snapshot) rather than one big serialization of everything. **SendSeq is session-scoped** and does not reset on reconnect — the client's "where did I get to" is anchored to the sequence number, not the connection. This mechanism and the chapter 4 broadcast design, plus the "Consistency, Recovery, and Reconnection" piece on the knowledge base main line, are the client-side view of the same thing.

---

## 3. Cocos Creator and the Mini-Game Platforms

Cocos Creator is the mainstream engine for WeChat and Douyin mini-games. Its technical characteristics and platform constraints directly shape server design.

### 3.1 The Hard Constraints of Mini-Game Platforms

WeChat mini-games have a series of hard constraints — these are "limits", not "suggestions":

- **Package size**: main package 4MB + subpackages 20MB (total cap adjusts by version; the platform docs are authoritative). Protocol definition files and first-screen configs all count against the first-package budget
- **Memory limits**: iOS/Android have caps (device-dependent); the client cannot cache too much data — list-type interfaces the server sends must support pagination, and the client may discard non-current-page data at any time
- **Domain whitelist**: only whitelisted, filed domains can be connected; must be configured before launch — including WebSocket domains and CDN domains; missing one is a live incident
- **Open data domain isolation**: social data like friend leaderboards runs in a separate data domain that cannot communicate directly with the main domain, only through specific interfaces — when designing leaderboards, the server must know that "platform friend relationships" go through platform open data, while "in-game friends" go through your own services

The combined meaning of these constraints: **API response size must be small**. Measure the gap between two encodings with the same leaderboard data:

```go
type PlayerBrief struct {
    UID    int64  // varint，小数值实际 1-2 字节
    Name   string // UTF-8，长度前缀 + 内容
    Level  int32
    Score  int64
    Avatar string // URL，通常是最大头
}

// 100 人排行榜，同一份数据的序列化体积对比：
func compareSizes(players []PlayerBrief, pbPlayers *pb.RankList) (int, int) {
    jsonBytes, _ := json.Marshal(players)     // ≈ 14 KB —— 字段名每人重复一遍是大头
    protoBytes, _ := proto.Marshal(pbPlayers) // ≈ 3 KB  —— 字段号编码，字段名只在 .proto 里出现一次
    return len(jsonBytes), len(protoBytes)
}
```

The gap comes from two things: JSON re-transmits field names on every record (`"uid":10001,"name":"..."`), while Protobuf transmits only field numbers and values; integers in Protobuf use varint variable-length encoding, so a number like level 35 takes only 1 byte. For mini-games this is not just traffic — it is also load-wait time on weak networks and client memory footprint. **The acceptance criteria for list-type interfaces should include a response size cap** (commonly within 5KB), rather than waiting for the client to complain about slow loading before trimming fields. Priority for trimming fields: first cut what "the client's current page cannot use", then consider not returning large fields in list interfaces (replace avatar URLs with avatar IDs and let the client assemble the CDN address).

### 3.2 Network Layer Characteristics: Build Everything Yourself

Cocos's WebSocket implementation is close to the browser-native API: no built-in reconnection mechanism, no built-in message queue (sends are lost when the connection breaks), heartbeat must be self-implemented. This means the quality of a mini-game's client network layer **depends heavily on the team building it themselves**, and the server must design for "the client is unreliable": messages carry sequence numbers so the client can deduplicate, key interfaces are idempotent (re-sending the same request produces no side effects), and pushes during disconnection allow the client to pull after returning (a dual-channel design of push + pull fallback).

### 3.3 The Mini-Game Login Chain

Mini-game login has a platform-specific sequence, and the server must implement the corresponding interfaces:

```text
1. 客户端调用 wx.login() 获得 code（临时凭证，5分钟有效）
2. 客户端把 code 发给你的服务端
3. 服务端拿 code + appid + secret 调微信 code2session 接口
   → 换得 openid（用户唯一标识）+ session_key
4. 服务端绑定 openid ↔ 游戏账号，签发自己的会话 token
5. 之后所有请求带游戏会话 token，不再依赖微信会话
```

Key points: **the secret can only live on the server**; session_key decrypts platform-sensitive data and must not be sent down to the client; session expiry is decoupled from the WeChat state — a player may be online in WeChat while your session has expired, or vice versa; both expiry paths must be handled.

The server handler skeleton is roughly:

```go
func (h *LoginHandler) WxLogin(ctx context.Context, code string) (*LoginResult, error) {
    if code == "" {
        return nil, ErrEmptyCode
    }
    // code 是一次性的：同一个 code 第二次调 code2session 会被微信拒绝。
    // 本地先做一次性标记，把重放请求挡在自己这一层，也避免无效请求打到微信侧限流
    if !h.codeSeen.MarkOnce(code, 5*time.Minute) {
        return nil, ErrCodeReplay
    }
    resp, err := h.wx.Code2Session(ctx, h.appID, h.appSecret, code)
    if err != nil {
        return nil, fmt.Errorf("code2session: %w", err)
    }
    // openid 仅在当前 appid 内唯一；unionid 只有绑定了开放平台才可能有值（见 1.3）
    uid, err := h.identities.ResolveOrCreate(ctx,
        IdentityWechatOpenID, resp.OpenID,
        IdentityUnionID, resp.UnionID) // 可能为空，空则跳过该锚点
    if err != nil {
        return nil, err
    }
    // session_key 只在需要解密手机号等敏感数据时使用：留在服务端、短 TTL、用完即弃
    // 会话 token 是自家签发的，有效期、续期、踢人均与微信态无关
    token, err := h.sessions.Issue(uid, 7*24*time.Hour)
    if err != nil {
        return nil, err
    }
    return &LoginResult{UID: uid, Token: token}, nil
}
```

Two easily missed details. **code2session is an external call and needs timeout and degradation**: occasional WeChat-side timeouts leave players stuck on the login page; the timeout is usually set at 2-3 seconds, and on consecutive failures return a clear "login service busy" instead of an infinite spinner. **ResolveOrCreate is a concurrency hotspot**: the same player double-tapping login or racing with reconnect recovery may arrive concurrently; a unique key on `(id_type, id_value)` plus a read-back on insert conflict is the standard handling (relying on the database unique constraint for idempotency, same principle as the chapter 8 persistence strategy).

### 3.4 The Server Adaptation Checklist for Mini-Games

```text
小游戏服务端适配检查清单：

□ 1. API 响应体积控制在 5KB 以内，列表接口分页
□ 2. 使用 Protobuf 而非 JSON（体积减少 60-80%）
□ 3. 实现断线重连机制（小游戏切前后台极频繁）
□ 4. suspend/resume 挂起协议 + 宽限期（区分"切后台"与"真掉线"）
□ 5. 状态快照 + 增量恢复接口（重连后恢复状态）
□ 6. 域名白名单配置（WebSocket 域名 + CDN 域名）
□ 7. 分包资源的 CDN 地址管理
□ 8. 微信登录链路（code2session + code 防重放）与支付异步通知
□ 9. 身份锚点方案确认（unionid 可用性 / 手机号补绑路径，双端发行前置）
□ 10. 防刷机制（小游戏环境更容易被脚本批量访问）
□ 11. 推送 + 拉取双通道（断线期间的推送可回补）
```

---

## 4. Unreal Engine 5: The Price of AAA Quality

UE5 is the first-choice engine for AAA games; its networking framework is very mature — and very complex. Server-side developers need to understand UE5's network model to integrate correctly.

### 4.1 The Authoritative Server Model

UE5 uses the **authoritative server (Dedicated Server)** model: the server is the authority over the game world, and clients are "observers" and "input providers". Clients may predict (Prediction), but final results are validated by the server (Validation). This matches exactly the "server authority" principle this book stresses repeatedly — UE5 turned the idea into built-in engine infrastructure.

Core network mechanisms:

- **Property replication (Replication)**: the server automatically synchronizes Actor properties to clients, supporting conditional sync (only on change, only to relevant players)
- **RPC**: client/server remote procedure calls, distinguishing reliable/unreliable
- **Actor replication**: entire Actors synchronize between server and clients, with Relevancy controlling the sync scope

### 4.2 Working with a Custom Server

Many projects use UE5 for the client but Go/Java for a custom server (instead of the UE5 Dedicated Server) — because account, social, economy, and cross-server logic for a big world is more efficient on a general-purpose backend stack. In this hybrid mode:

- Implement a NetworkComponent inside UE5 handling connection management, message send/receive, and heartbeat toward the custom server
- Strongly engine-bound parts like combat/physics stay in the UE5 Dedicated Server; accounts/trading/social go to the custom server
- The two server classes need an internal protocol bridge between them (usually gRPC or an internal TCP protocol)

### 4.3 Special Challenges

| Challenge | Cause | Solution |
|------|------|---------|
| UDP reliability | UE5 defaults to UDP | The engine ships a reliability layer; use KCP/QUIC when integrating a custom server |
| Large-scale sync | MMO scenes | Grouped sync + AOI (area of interest management) |
| Property sync conflicts | Multiple ends modifying at once | Server authority + client prediction + server rollback correction |
| Cross-platform differences | PC/console/mobile | Adapt network parameters and sync frequency per platform |

### 4.4 Server Cooperation for Prediction and Correction

The "server authority + client prediction + rollback correction" (reconciliation) mechanism in the table row above — the server-side cooperation determines the correction experience. The flow: the client makes a **prediction** for local input (immediately presenting the movement result), each input carrying an input sequence number to the server; the server **adjudicates** by authoritative logic and broadcasts the result together with "the last adjudicated input sequence number"; the client finds an input whose authoritative result differs from its prediction and **re-simulates locally** from that input onward.

The server should mind three things:

- **Answer each input immediately; do not batch.** Batching the adjudication of multiple inputs into one packet to save bandwidth delays the client's re-simulation — the larger the correction latency, the harsher the rollback amplitude, and what the player sees is a visual "spike". The right place for bandwidth optimization is compressed encoding and merging unreliable updates (Chapter 4), not delaying correction packets
- **Correction packets must carry the adjudicated input sequence number.** Without it the client cannot locate where to start re-simulating and can only resync wholesale (screen jumps back) — worse than no correction
- **Prediction deviation rate is a risk-control signal.** A normal client's prediction deviation should fluctuate within a tiny percentage; persistently abnormal deviation (the server always vetoing the same movement step) usually means the client has been tampered with, and can feed the chapter 18 risk-control metric system

---

## 5. Godot: The Open-Source Engine and the Indie Trade-Off

Godot is a presence that keeps rising outside the commercial engines: fully open source under the MIT license, zero license fees, no revenue-share clauses, engine source distributed with the project, readable and modifiable. After the 4.x renderer rewrite, its 2D workflow and runtime filled in the long-standing gap (2D and 3D share one scene tree; 2D is not a down-projected 3D), and a batch of recognized premium indie titles has shipped on it — Brotato, Dome Keeper, Buckshot Roulette. Its position for the server side in one sentence: these projects mostly start as small teams in P2P or lightweight-backend form, but once they connect to a custom authoritative server, Godot is just an ordinary network client, and the standard client network layer of Section 8.3 applies as-is.

### 5.1 The Typical Structure of the Client Network Layer

Godot's high-level multiplayer capability is the **MultiplayerAPI**: transport is provided by **MultiplayerPeer** implementations — built-in ENet (UDP plus a reliability layer), WebSocket, and WebRTC — or by wiring StreamPeer yourself; on the logic side, the `@rpc` annotation declares remote calls (reliable/unreliable, any_peer/authority), paired with MultiplayerSpawner and MultiplayerSynchronizer for node spawning and property sync. Its default mental model is the **room-peer architecture**: peer 1 is the host, which can be either a dedicated server or one player's client, with the remaining peers connecting to it — a one-server-per-room model that naturally matches cooperative/competitive small sessions and P2P hosting, and is also the architecture where the Section 1.1 boundary of "authority belongs to the server" most often falls:

```text
房间对等（MultiplayerAPI 默认）         自定义权威（自建服务端）
peer 1 = 主机（玩家客户端或 Godot 专服）  Go/Java 权威服务端（普通 WS/TCP 入口）
peer 2/3/4 连向主机，流量可 P2P 直连      各客户端连服务端，绕开 MultiplayerAPI
RPC 帧与 peer 握手 = Godot 私有格式       协议帧 = Protobuf/JSON，两端各自编解码
```

When integrating a custom authoritative server the conclusion is clear: **bypass the MultiplayerAPI and integrate as an ordinary WebSocket/TCP client**. Two reasons: first, the high-level multiplayer protocol (peer handshake, RPC frames) is a Godot-private format with no equivalent implementation on the Go/Java side; second, ENet's reliable UDP layer is likewise a private protocol that does not interoperate with a self-built KCP gateway — making the server speak ENet is reverse adaptation; the correct direction is converging the server entrance on WebSocket/TCP (add KCP for hard real-time, Chapter 4). After bypassing it, build the Section 8.3 four-layer structure (transport → protocol → dispatch → logic) yourself; the impact of platform background policies on connections also returns to the old Section 2.1 problem — suspend/resume explicit suspension is engine-independent and applies equally to Godot projects.

### 5.2 Protocol Integration

The default path starts with HTTP/REST + JSON (built-in HTTPRequest/HTTPClient), with WebSocketPeer self-framing for long connections. The serialization trap is in binary: Godot's built-in Variant serialization (`var_to_bytes`/`bytes_to_var`) is an engine-private format that changes across major versions, and `bytes_to_var` can restore arbitrary Variants — a cross-language server can neither parse it easily nor should it trust Variant bytes sent by a client (the deserialization surface is the attack surface). Cross-platform protocols return to universal formats: Protobuf or JSON (the serialization selection standard of Chapter 4). Godot has no officially bundled Protobuf plugin, and community generators vary in coverage; when choosing, treat "the same .proto can produce code for both the GDScript and C# sides" as an acceptance condition; projects on the C# (.NET) track can directly reuse the official C# Protobuf ecosystem and share one set of generated artifacts with Unity projects. The trio does not change with the engine: single-source .proto, message ID constant table, unified error code system (Section 2.2) — the language changes, the checklist stays.

### 5.3 Common Problems and Server Responses

| Problem | Cause | Server Response Strategy |
|------|------|--------------|
| High-level RPC cannot connect to a self-built server | MultiplayerAPI's default peer architecture; peer 1 is the server | Client bypasses the high-level API and integrates as ordinary WebSocket/TCP (Section 8.3 standard structure) |
| Server forced to implement ENet | ENet's reliability layer is a private protocol with no mature Go implementation | Server entrance converges on WebSocket/TCP (add KCP for hard real-time); no reverse adaptation |
| `bytes_to_var` parse failure or injection | Variant serialization is an engine-private format that can nest objects | Cross-platform protocols use Protobuf/JSON; Variant bytes never leave the engine boundary |
| Protocol misalignment on major-version upgrades | Godot 4.x major versions carry breaking changes in GDScript and serialization | Protocol carries a version field + minimum-playable-version gate (Section 8.6) |
| Blank screen for Web exports in production | CDN/gateway strips COOP/COEP response headers | Both response headers configured into CDN and gateway and included in inspections (Section 5.5) |

### 5.4 The Trade-Off Versus Unity

The comparison concentrates on three places. Licensing structure: MIT's zero license fee and no revenue share is a real cost difference for small premium teams; Unity is subscription-per-seat, and its 2023 runtime-fee proposal (introduced then withdrawn) put its terms' certainty through a round of trust rebuilding. Ecosystem and pipeline: Unity's asset store, ad/attribution/payment SDK chains, and talent pool are larger, with mobile monetization working out of the box; Godot's corresponding links mostly need self-wrapping or community plugins. Technical boundary: both can cover 2D premium and conventional mobile games; UE5-grade heavyweight AAA visuals are outside Godot's usual range. For the server side, this debate is nearly invisible — protocol, timeout, reconnection are all team-defined, and the server does not perceive the engine; only two things need writing into the project approval review in advance: when target platforms include mini-games, the Godot chain is missing (Section 3.1), and when the Web end uses Godot 4, COOP/COEP is a hard prerequisite (Section 5.5).

### 5.5 Multi-Platform Publishing Notes

- **PC/Steam home ground**: GodotSteam (a community extension) makes Steamworks' achievements, cloud saves, lobbies, network relay, tickets, and other interfaces fully available, and indie projects' publishing chains are built around it. Two server points: Steam tickets must be validated server-side (against forged and replayed tickets); when Steam network relay is enabled, player traffic may bypass your servers, so the server's "online" standard must reconcile against platform state
- **Mobile**: iOS/Android export chains are usable, but platform SDKs for push, payment, and ads officially mostly ship only Unity/Cocos versions, so Godot projects rely on self-wrapped plugins — login credential and payment callback formats must be aligned between both ends in advance; do not let the client invent them on the spot during joint debugging
- **Consoles**: the console platform layer is outside the open-source repository due to platform NDAs; export capability is obtained through platform authorization and third-party porting partnerships; project scheduling must budget this external dependency cycle
- **Mini-games**: there is no official WeChat/Douyin mini-game export chain, and community adaptations are experimental — for mini-game projects go straight back to the Section 3.1 hard constraints for engine selection; do not wedge Godot into a mini-game schedule
- **Web**: Godot 4's Web export depends on SharedArrayBuffer, so the site must carry the two COOP/COEP response headers, and the CDN and gateway must not strip them — cache layers stripping headers is a common root cause of production blank screens (Section 8.5); this is a typical case of an engine requirement being written back into server/ops configuration

---

## 6. LayaAir (Layabox): The Other Mainstay of the Mini-Game Ecosystem

LayaAir is the Layabox team's mini-game/H5 engine, a mainline choice in the mini-game ecosystem alongside Cocos Creator: 1.x/2.x offered ActionScript3 and TypeScript dual languages; 3.x converged to pure TypeScript with a rewritten architecture. The engine library is lightweight and takes little of the mini-game first-package budget; its 3D capability has been polished in mini-game scenarios since 2.x, and 3D mini-game projects often compare it head-to-head with Cocos Creator. Its position for the server side in one sentence: the network chain is fully isomorphic to Cocos (Section 3.2), so one pass of the Section 3.4 checklist covers both engines; the incremental knowledge is in the version fragmentation of "three engine generations coexisting".

### 6.1 The Typical Structure of the Client Network Layer

LayaAir's network layer is isomorphic to Cocos: the engine provides only basics — the Socket wrapper (WebSocket connection management, event callbacks) and Byte binary read/write (endianness, typed fields) — with no built-in multiplayer framework or state sync; the Section 8.3 four-layer structure (transport → protocol → dispatch → logic) is likewise project-built. Two details worth the server's knowing: first, the Byte class ships endianness and typed read/write, and clients habitually use it to self-assemble binary frames — legacy projects from the AS3 era (ByteArray) are especially prone to custom binary protocols rather than Protobuf, and the Section 7.1 Cocos2d-x caveat holds equally here; second, the WebSocket inside the mini-game container is proxied by the platform, so foreground/background switching and heartbeat behavior return to the Section 3.1 platform constraints, and the Section 2.1 suspend/resume + grace-period skeleton applies unchanged.

### 6.2 Protocol Integration

The default combination matches Cocos: WebSocket + Protobuf/JSON (the serialization selection standard of Chapter 4), with the TypeScript side using protobuf.js directly; legacy AS3 projects mostly use ByteArray self-assembled binary protocols or Protobuf port libraries from the AS3 ecosystem. The trio as usual: single-source .proto, message ID constant table, unified error code system (Section 2.2). The LayaAir-specific item the server should mind is **generational fragmentation**: 1.x/2.x (AS3 + TS) and 3.x (pure TS, rewritten architecture) are mutually incompatible, so when one product upgrades across generations the server faces two coexisting client codec implementations — the protocol compatibility window must be computed by engine generation (Section 8.6), not linearly by version number.

### 6.3 Mini-Game Platform Constraints and Server Responses

The four hard constraints — package size, memory, whitelist, open data domain — and the login chain hold equally for LayaAir (Sections 3.1, 3.3); the differences are only in trigger probability and the long tail:

| Problem | Cause | Server Response Strategy |
|------|------|--------------|
| First package over limit, review rejected | Engine library + first-scene assets crowd the 4MB main-package red line (Section 3.1) | Engine library slimming + subpackage delivery in concert; assets on CDN (Section 8.5) |
| Request domain missed in whitelist | The mini-game container only allows whitelisted domains; 3D mini-games have more asset domains | Domain list into the launch checklist with drills (item 6 of the Section 3.4 checklist) |
| Legacy AS3 client protocol long tail | 1.x/2.x AS3 projects still in operation; generations do not interoperate | Protocol layer compatible per generation + minimum-playable-version gate (Section 8.6) |
| 3D asset loading drags down weak-network experience | 3D mini-game asset volume exceeds 2D; weak-network waiting is amplified | Response size caps + list pagination (Section 3.1) + CDN prewarming (Section 8.5) |

### 6.4 The Trade-Off Versus Cocos Creator

The comparison concentrates on three places. Ecosystem: Cocos's community size, documentation notes, and hiring pool are wider; LayaAir's ecosystem concentrates on mini-games, especially 3D mini-games. Tech stack: on 3.x both sides are TypeScript; LayaAir 1.x/2.x's AS3 legacy is a real migration burden. 3D timeline: LayaAir has pushed mini-game 3D since 2.x, while Cocos Creator only merged 3D capability at 3.0 — the historical reason many 3D mini-games chose LayaAir. For the server side this trade-off is likewise nearly invisible: WebSocket + Protobuf + code2session login chain is the same set shared by both engines (Section 3.3), and one adaptation pass per the Section 3.4 checklist covers both ends; what truly needs an owner at project approval review is still those two things — the whitelist domain list and the package/memory red lines.

---

## 7. A Quick Look at Other Engines

### 7.1 Cocos2d-x (Lua)

An engine that "ages well", still in heavy use by legacy projects. Its core advantage is **Lua hot updates** — editing Lua scripts hot-updates without re-releasing. Impact on the server: such projects usually use custom TCP protocols and binary encoding (rather than Protobuf), and the server needs to support this legacy protocol; Lua hot updates rely on CDN asset distribution (see Section 8.5).

---

## 8. Core Points of Frontend/Backend Collaboration

### 8.1 Choosing a Protocol Format

| Format | Size | Codec Speed | Strong Typing | Code Generation | Applicable Scenario |
|------|------|-----------|--------|---------|---------|
| **Protobuf** | ★★★★★ | ★★★★ | ✓ | ✓ | Large games (mainstream choice) |
| **FlatBuffers** | ★★★★★ | ★★★★★ | ✓ | ✓ | High-performance hot paths |
| **MessagePack** | ★★★★ | ★★★ | ✓ | ✓ | Medium games |
| **JSON** | ★★ | ★★ | ✗ | ✗ | Admin interfaces/prototypes |

Large games use Protobuf, low-latency hot paths use FlatBuffers, admin backends and prototypes use JSON — **choose format per chain, no one-size-fits-all** (detailed comparison and compatibility discipline in Chapter 4).

### 8.2 Client-Server Interaction Patterns

```text
模式1：请求-响应（最常用）
客户端 ──请求──→ 服务端 ──响应──→ 客户端
适用：登录、商店、背包、排行榜

模式2：服务端推送
服务端 ──推送──→ 客户端
适用：公告、活动通知、排行榜更新

模式3：实时同步（状态同步）
客户端 ──输入──→ 服务端 ──状态广播──→ 所有客户端
适用：MMO、实时对战

模式4：帧同步
客户端 ──输入──→ 服务端收集 ──帧广播──→ 所有客户端计算
适用：MOBA、RTS
```

The four patterns have different protocol demands: patterns 1/2 go over reliable channels with request IDs and error codes; patterns 3/4 carry sequence numbers and timestamps, allowing drop-old-keep-new (Chapter 4). **Annotating which pattern each message belongs to during protocol design** is far easier than sorting it out after launch.

### 8.3 The Standard Structure of the Client Network Layer

What the server integrates with is really a "standard-form" client network layer; knowing it helps the server provide the right support:

```text
┌─────────────────────────────────────────┐
│              游戏逻辑层                   │
│   发起请求（带回调）/ 接收推送更新状态      │
├─────────────────────────────────────────┤
│           消息分发器 Dispatcher           │
│   按 MsgID 路由到注册的处理函数             │
├─────────────────────────────────────────┤
│              请求管理器                   │
│   请求队列 + 超时重试 + 序列号 + 去重       │
├─────────────────────────────────────────┤
│        传输层（WebSocket/TCP/KCP）        │
│   连接管理、心跳、断线重连、编解码           │
└─────────────────────────────────────────┘
```

The server's corresponding support responsibilities: return the request ID as-is (the client drops duplicate responses by ID after timeout retries), message sequence numbers (the client reports the last sequence number when it comes back from a disconnect, and the server re-sends the increment), heartbeat replies (the server must answer pong; the client measures RTT from it), and idempotent key interfaces (retries produce no side effects).

### 8.4 Engineering Support During Joint Debugging

The efficiency of frontend/backend joint debugging depends not on communication attitude but on engineering support:

- **Auto-generated interface documentation**: generate docs directly from .proto / IDL; hand-maintained Word documents are forbidden — drift between hand-written docs and code is the number one source of joint-debugging wrangling
- **Mock services**: after protocol definition and before server implementation, the client can integrate against mock data to debug UI; the server can also use mock clients for load testing
- **Layered environments**: dev/test/staging/production, four levels, with protocol versions and config versions verified level by level; the joint-debugging environment's server must support one-click data reset
- **Common joint-debugging problems** and conventions:

| Problem | Cause | Solution |
|------|------|---------|
| Message loss | Network jitter | Retry mechanism + message ID deduplication |
| Message reordering | UDP / concurrent processing | Sequence numbers + receive buffer reordering |
| Version incompatibility | Frontend and backend releasing out of sync | Protocol version numbers + compatibility window (see Chapter 4) |
| State inconsistency | Client prediction deviation | Server authority + validation correction packets |
| Performance bottlenecks | Too many, too fragmented messages | Message merging + priorities (see Chapter 4) |

### 8.5 CDN and Asset Distribution

CDN (content delivery network) is the core infrastructure for game client asset distribution. For server-side developers, understanding CDN is for designing asset update strategies and troubleshooting asset loading problems.

**The three major uses of CDN in games**:

| Use | Description | Typical Scenario |
|------|------|---------|
| **Hot-update assets** | Client code, Lua/JS scripts, config tables | Version updates, bug fixes, event configs |
| **Static assets** | Images, audio, video, prefabs | Art assets, UI materials, cutscenes |
| **Config delivery** | Event configs, announcements, version info | Operational events, urgent announcements |

**How it works**: the client requests an asset → DNS resolves to the nearest CDN node → a node cache hit returns directly (fastest); on miss it goes back to the origin, caches, and returns. For game hot updates the usual flow is:

```text
1. 服务端生成版本号 + 资源清单（manifest）
2. 客户端启动时请求版本号
3. 对比本地版本，计算差异资源
4. 从 CDN 下载差异资源
5. 客户端加载新资源，完成热更新
```

**CDN selection considerations**: node coverage (domestic/overseas, city tiers), back-to-origin bandwidth cost, cache policy (long cache for static assets, short for configs), HTTPS support, hotlink protection, prewarming (pushing assets to nodes before a new version launches).

**Server-CDN cooperation**:

- **Version management**: the server maintains version numbers and asset manifests; the client downloads assets via CDN
- **Gray release**: deliver manifests of different versions by channel/region/ratio
- **Rollback mechanism**: the server switches the version-number pointer; the client downloads the old version's assets (asset files retained per version, not overwritten)
- **Monitoring and alerting**: CDN download failure rate, back-to-origin rate, latency monitoring

> **Field experience**: CDN cache refresh is not instantaneous. When launching a new version, ensure asset file names carry a version number or content hash (e.g. `bundle_a3f9c2.bundle`) rather than relying on CDN cache refresh. That way, even if the CDN cache is stale, the client fetches the latest assets via the new file name — **content addressing in place of cache invalidation** is the first principle of all CDN scenarios.

### 8.6 The Server View of the Asset Version Pipeline

The asset system connects content production, version release, runtime memory, and live repair capability; the interface responsibilities the server bears in it:

- **Version check interface** (checkversion): the client reports platform, channel, and current version; the server returns the latest version number, manifest address, and whether a forced update is required
- **Manifest interface**: the asset manifest itself goes over CDN, but the manifest's **index** is delivered by the server — so version switching, gray release, and rollback are all just the server changing a pointer
- **Force-update semantics**: versions with breaking incompatibility must be able to force upgrades (return a "minimum playable version"; clients below it are gated into the update page)
- **Download fallback**: a backup source for large-scale CDN failure (origin with rate-limited direct download) is the last resort — unused normally, but drilled

The version check interface's core logic is short and worth reading whole:

```go
// 版本比较必须按数值逐段比，不能按字符串比：
// 字符串序里 "9.9.10" < "9.9.9"，会把最新版误判为旧版
func compareVersion(a, b string) int {
    as, bs := strings.Split(a, "."), strings.Split(b, ".")
    for i := 0; i < len(as) || i < len(bs); i++ {
        av, bv := 0, 0
        if i < len(as) {
            av, _ = strconv.Atoi(as[i])
        }
        if i < len(bs) {
            bv, _ = strconv.Atoi(bs[i])
        }
        switch {
        case av < bv:
            return -1
        case av > bv:
            return 1
        }
    }
    return 0
}

func (h *VersionHandler) CheckVersion(platform, channel, cur string) *VersionInfo {
    // 不同渠道可以处在不同版本（渠道审核节奏不同是常态）
    latest := h.rules.Latest(platform, channel)
    info := &VersionInfo{
        Latest:   latest.String(),
        Manifest: h.manifestURL(latest), // 清单地址指向 CDN；切版本/回滚只改这里
    }
    if compareVersion(cur, h.rules.MinPlayable(platform, channel)) < 0 {
        info.ForceUpdate = true // 低于最低可玩版本：客户端拦截进更新页
    }
    return info
}
```

**Gray release also lands on this interface**: deciding which `latest` different players get, by channel, UID tail digit, device whitelist, and other dimensions — implementation-wise just one more routing rule inside `h.rules.Latest`; the full design of gray strategy and compatibility windows is in Chapter 17.

Asset packaging strategy (first-package/subpackage/hot-update splits, dependency governance) belongs to client engineering, but its artifact — the structure of the version manifest — needs to be defined by frontend and backend together. The fuller versioning and release system is in Chapter 17.

---

## 9. Code Example: A Session Skeleton for Background Switching, Reconnection, and Re-Sends

Sections 2.1 and 2.3 of this chapter gave point-form snippets; this section assembles "explicit suspension + grace period" and "bounded re-send window + snapshot fallback" into one readable minimal skeleton. The example is a minimal Go demonstration of this chapter's design decisions (not taken from a real project); the code blocks within the section compile through `go vet` and `go build` after merging, and are covered by the repo-wide code block regression test.

### Explicit Suspension: Disconnection Judged by Grace Period Instead of Heartbeat

```go
type sessState uint8

const (
    sessActive    sessState = iota // 在线：正常收发，期待心跳
    sessSuspended                  // 客户端上报切后台：心跳计时冻结
    sessClosed
)

// 宽限期：分钟到半小时量级，按产品形态定。
// iOS 切后台典型几分钟、部分 Android 省电策略下静默可达 10 分钟以上
const gracePeriod = 15 * time.Minute

// Conn：一个会话的运行态。切后台不等于掉线——
// 判定依据从「没收到心跳」改成「挂起后宽限期已过」（2.1 节）
type Conn struct {
    UID       int64
    state     sessState
    suspendAt time.Time // 进入宽限期的时刻；active 态恒为零值
}

// Suspend：客户端切后台时发 suspend 包触发。
// 资源不释放、消息继续入队，宽限期内随时可无损回来
func (c *Conn) Suspend(now time.Time) {
    if c.state == sessActive {
        c.state = sessSuspended
        c.suspendAt = now // 重复 suspend 不刷新计时：防异常客户端无限续期
    }
}

// Resume：切回前台发 resume 包，恢复心跳计时并补发离线期间的消息
func (c *Conn) Resume() {
    c.state = sessActive
    c.suspendAt = time.Time{} // 计时归零：误判率在这里下降一个量级
}

// Sweep：后台定时任务逐会话调用。返回 true 才真正断开、走完整重连流程
func (c *Conn) Sweep(now time.Time) bool {
    return c.state == sessSuspended && now.Sub(c.suspendAt) >= gracePeriod
}
```

`Suspend`/`Resume` are triggered by the client's foreground/background switch events, and the server merely records the state transitions faithfully — exactly the Section 2.1 idea of "explicit suspension in place of guessing". Note three details: `Suspend` only takes effect in the active state, and repeated suspends do not refresh the timer, so an abnormal client cannot use it to extend indefinitely; `Resume` zeroes `suspendAt` instead of deleting the field, keeping state machine transitions explicit and replayable; `Sweep` is the only path that can close a session, with the condition "grace period expired after suspension" — a player who backgrounded iOS for a few minutes is not killed here by mistake, and the reclaim delay for truly dead links is explicitly priced by the grace-period length.

### The Bounded Re-Send Window: The Dividing Line Between Ring Buffer and Snapshot Fallback

```go
// Msg：下发的业务消息。Seq 是会话级序号，重连不重置（2.3 节）
type Msg struct {
    Seq  uint64
    Body []byte
}

// Writer：客户端连接的最小抽象（真实项目是 WebSocket/TCP 连接的封装）
type Writer interface {
    Write(m Msg) error
}

// Replay：补发窗口的环形缓冲实现。容量创建时定死，
// 写满后覆盖最老消息——窗口外的内容不再可补，这是快照兜底的触发条件
type Replay struct {
    buf  []Msg
    head int // 下一个写入位置；写满一圈后它同时指向最老的消息
    full bool
}

func NewReplay(capacity int) *Replay {
    return &Replay{buf: make([]Msg, capacity)}
}

// Push：每条下发消息在发送前先入窗（发送失败无需特殊处理：
// 序号在缓冲里，重连后按序号补发）
func (r *Replay) Push(m Msg) {
    r.buf[r.head] = m
    r.head++
    if r.head == len(r.buf) {
        r.head = 0
        r.full = true
    }
}

// oldest：窗口内最老的序号。窗口未满时从 1 起全部可得
func (r *Replay) oldest() uint64 {
    if !r.full {
        return 1
    }
    return r.buf[r.head].Seq
}

// ReplayTo：把 lastAck 之后的消息按序写给重连的客户端。
// 返回 false 表示缺口起点已滚出窗口：调用方转快照兜底，不再尝试重放
func (r *Replay) ReplayTo(w Writer, lastAck uint64) bool {
    if lastAck+1 < r.oldest() {
        return false
    }
    for i := 0; i < len(r.buf); i++ {
        m := r.buf[(r.head+i)%len(r.buf)] // 从最老到最新遍历
        if m.Seq > lastAck {
            _ = w.Write(m) // 写失败交由传输层重试；序号还在窗口里
        }
    }
    return true
}
```

`Replay` is exactly the self-contained implementation of the `Pending` field in Section 2.3. The window capacity is fixed at creation: 10,000 online players with 1,000 messages each means tens of millions of resident elements — this account must be done at design time (the "setting the re-send window to infinite" row in this chapter's common pitfalls table). `ReplayTo`'s return value is the dividing line between two recovery strategies: if the gap is still in the window, replay in order and the client deduplicates by sequence number; if the starting point has rolled out of the window, return false and let the caller switch to snapshot fallback — whether "re-sending hundreds of messages" or "resending one full snapshot" is cheaper is decided by this boolean, not by ad-hoc judgment inside the reconnection handler.

Assembling the two pieces gives the full foundation of Section 2.3's `OnReconnect`: the reconnection request first passes session validation; `gap == 0` resumes send/receive directly; a gap inside the window goes through `ReplayTo` replay; outside the window, the business-registered snapshot generator is the fallback. Session retention, incremental recovery, and snapshot fallback each take shape independently, and their composition appears exactly once at the reconnection entry — this mechanism and the Chapter 4 broadcast design plus the knowledge base main line's "Consistency, Recovery, and Reconnection" are the client-side view of the same thing.

---

## 10. Summary of Engine Choice's Impact on the Server

| Engine Choice | Protocol Type | Connection | Message Format | Special Requirements |
|---------|---------|---------|---------|---------|
| Unity + WebSocket | TCP | Long connection | Protobuf/JSON | Heartbeat tolerant of background suspension |
| UE5 + custom server | UDP | Long connection | Custom/KCP | Reliable UDP layer + internal bridge |
| Cocos Creator | WebSocket | Long connection | Protobuf/JSON | Mini-game adaptation + login chain |
| Cocos2d-x (Lua) | TCP | Long connection | Custom binary | Lua hot updates + legacy protocol |
| Godot + custom server | WebSocket/TCP | Long connection | Protobuf/JSON | Bypass MultiplayerAPI + Web export COOP/COEP |
| Web games | HTTP/WS | Short + long connections | JSON | RESTful API |
| Multi-platform release | Unified logic layer | Routed per platform | Unified protocol layer | Access-layer adaptation, logic reuse |

---

## 11. Practical Advice

### 11.1 What Server-Side Developers Must Know

1. **Know the client's limits**: mini-game package and memory caps, mobile background suspension behavior, web platform browser restrictions
2. **Draw the three logic-class boundaries clearly**: presentation to the client, interaction to the client with boundaries, authority to the server — review every "who computes this" question against this standard
3. **Fix identity anchors before multi-platform release**: confirm unionid availability and the phone-number rebinding path; settle the identity binding table and merge rules before writing the first line of login code
4. **Choose the right protocol**: WebSocket is most universal, UDP/KCP for hard real-time; choose serialization format per chain
5. **Design an extensible protocol**: message IDs split by module, reserved extension fields, version compatibility design (Chapter 4)
6. **Provide complete engineering support**: auto-generated docs, mock services, error code explanations — joint-debugging efficiency is designed, not begged for

### 11.2 Performance Optimization Checklist

```text
□ 协议优化：Protobuf 优先、消息压缩、一帧内消息合并
□ 连接优化：心跳间隔匹配平台行为、断线重连 + 增量恢复
□ 体积优化：列表分页、字段裁剪、按接收者定制粒度
□ 资源优化：内容寻址的文件名、版本清单指针化、CDN 预热
□ 监控优化：接口延迟分平台统计、CDN 命中率、重连率
```

---

## 12. Summary of Common Pitfalls

This chapter's pitfalls mostly lie not in "can't write it" but in "don't know what happens on the client side":

| Pitfall | Consequence | Correct Practice |
|------|------|---------|
| Treating background switching as disconnect and kicking by heartbeat timeout | Players return to re-login and state loss; broken experience | suspend/resume explicit suspension + grace period (Section 2.1) |
| code2session without replay protection | The same code gets rejected by WeChat on the second call; invalid requests hit WeChat's rate limits | Local one-time marker (MarkOnce); reject replays outright (Section 3.3) |
| Dual-platform release without confirming identity anchors in advance | After launch, accounts don't interoperate; only phone rebinding saves it, costing an operational cycle | Confirm unionid availability and rebinding path at project approval (Section 1.3) |
| Auto-merging multi-platform accounts | Asset-conflict complaints; rollback is hard | Let the player choose, or leave a contestable freeze period after merge (Section 1.3) |
| Comparing version numbers as strings | `"9.9.10" < "9.9.9"`; the newest version misjudged as old, triggering wrong forced updates | Numeric segment-by-segment comparison (Section 8.6) |
| Whitelist missing the CDN domain | After review passes, all live asset loading breaks | Domain list into the launch checklist with drills (Section 3.1) |
| Batching correction packets | Client re-simulation lags; visual spikes | Answer each input immediately; find bandwidth savings elsewhere (Section 4.4) |
| Setting the re-send window to infinite | Awaiting-reconnect sessions eat all memory | The combination of bounded window + snapshot fallback (Section 2.3) |
| Client optimistic deduction without server reconciliation | Accounting black hole after request failure | Authoritative logic trusts only server results; the client merely "anticipates" (Section 1.1) |
| Making the server implement ENet for Godot | Reverse adaptation: no mature ENet implementation on the Go side; the reliability layer is reinvented | Server converges on a WebSocket/TCP entrance; the client bypasses MultiplayerAPI (Section 5.1) |

---

## 13. Summary

| Key Question | Answer |
|---------|------|
| Why must the server side understand the client? | The design space for APIs, protocols, timeouts, and reconnection is reverse-determined by the client's platform constraints |
| How to divide frontend/backend logic? | Presentation to the client, interaction to the client with boundaries, authority to the server; anything affecting numbers and assets is decided only by the server |
| What about accounts in multi-platform release? | An identity binding table mounts multiple platform identities; unionid/phone number are high-trust anchors; merges let the player choose, never automatic |
| What matters most on mini-game platforms? | The three hard constraints of package/memory/whitelist + the code2session login chain + extremely frequent foreground/background switching |
| Server essentials for Unity projects? | suspend/resume distinguishes backgrounding from disconnect; reconnection = session retention + incremental recovery + snapshot fallback |
| What is the UE5 hybrid architecture? | Combat inside the engine + custom server for accounts/economy/social, bridged by an internal protocol; correction packets answered per input immediately |
| Server essentials for Godot projects? | Room-peer is the default mental model; integrate with an authoritative server as an ordinary WebSocket/TCP client; Web export must have COOP/COEP |
| Essentials of the version check interface? | Numeric segment-wise version comparison, manifest address as pointer, minimum-playable-version forced-update gate, gray release lands here |
| The first principle of CDN use? | Content addressing (file names with hashes) instead of cache refresh; version switching is just the server changing a pointer |
| What does the client network layer look like? | Transport → request manager (sequence numbers/retries/dedup) → dispatcher → logic layer; the server provides support accordingly |
| What does joint-debugging efficiency rest on? | Auto-generated docs + mock services + layered environments — not communication attitude |

---

## 14. Practical Case: Investigating a "Switch to WeChat and Get Logged Out" Background-Switch Misjudgment

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified, focusing on the troubleshooting approach and backfill logic.

**Background and symptoms**

In the second release week after mobile launch, complaints concentrated on one sentence: "I switch out to reply on WeChat, come back, and I'm logged out — my whole screen state is gone". **486** complaints; sampling **3,000** reconnects in gateway logs, **2,210** of which had disconnect reason "heartbeat timeout", with disconnect moments matching the client's background-switch moments — a **74**% misjudgment rate. Worse was the evening peak: reconnect requests formed a spike that crowded even players who had not switched into disconnection.

### Step 1: Symptoms and Measurement

Align measurement against the Section 2.1 timeout derivation formula, finding answers item by item among the formula's **3** terms:

- **Server side**: heartbeat interval **10** seconds, timeout threshold **30** seconds — tolerating **2** lost heartbeats; the link itself showed no packet-loss anomaly;
- **Platform side**: iOS suspends the connection on backgrounding, typically silent for minutes; under some Android power-saving policies silence can exceed **10** minutes — all **legitimate silence**;
- **Measurement gap**: the **30**-second threshold was taken by PC-era habit — **20** times shorter than mobile legitimate silence (counted as **600** seconds).

The measurement standard stands first: those kicked offline were not "dead links" but "live links in legitimate silence" — two completely different denominators.

### Step 2: Layered Attribution

```text
传输层   心跳 10 秒一次，30 秒阈值内无丢包——链路本身无罪
平台层   iOS 切后台挂起连接、Android 省电限网——静默分钟级是平台行为，不是异常
会话层   判定掉线即销毁会话：token 作废、待补发队列清空——玩家回来只能重新登录 + 全量重拉
观测层   只有「在线数」下跌被当成正常波动，「误判掉线率」从未被度量
```

**Ledger convergence**: 50,000 DAU, 6 background switches per person per day, **40**% of which stay silent over **30** seconds — **120,000** person-times misjudged as disconnected daily (50000 × 6 × 40%); each misjudgment costs a re-login plus full re-fetch of **18** interfaces. At the evening peak, 800 instantaneous returns per minute × **18** interfaces = **14,400** QPS hitting the login and query services — returning players crowd out the ones who never left, and the storm gains second-order damage.

### Step 3: Root Cause

1. **Direct cause**: the "longest legitimate silence" term of the timeout threshold directly inherited the PC-era habitual value — 1 of the derivation formula's 3 terms taken wrong; the **30**-second threshold was blind to mobile platform behavior.
2. **Mechanism cause**: the post-judgment action was "destroy the session", while the Section 2.1 alternative — suspend/resume explicit suspension + grace period — had not a single line implemented; item **4** of the Section 3.4 adaptation checklist's **11** items, "suspend/resume suspension protocol + grace period", was written for exactly this case, and the checklist lay in the documents with nobody reconciling against it.
3. **Deep cause**: row **1** of the Section 12 pitfalls table's **10** rows, "treating background switching as disconnect and kicking by heartbeat timeout", matched this case word for word — symptoms, consequences, correct practice, all three columns present — but it never entered any review checklist; "disconnect" was treated as a pure network problem, and nobody set parameters against platform behavior.

### Step 4: Remediation and Backfill

1. **Explicit suspension**: ship suspend/resume — the client sends suspend on backgrounding and resume on return; grace period set to **15** minutes (mid-range of the minutes-to-half-hour scale), covering iOS's minutes and Android power-saving's **10** minutes of legitimate silence; repeated suspends do not refresh the timer, so abnormal clients cannot extend indefinitely.
2. **Judgment switch**: disconnect judgment changed from "no heartbeat for **30** seconds" to "grace period expired after suspension" — the Sweep scan is the only path that closes a session, and the reclaim delay for truly dead links is explicitly priced by the grace period (at most **15** minutes).
3. **Sessions not destroyed**: within the grace period the session persists and messages keep queuing; the re-send window set to **1,000** messages, reconnection re-sends the increment by sequence number, and gaps rolled out of the window switch to snapshot fallback — reconnection cost drops from "re-login + 18 interfaces" to "one resume + a few re-sends".
4. **Observation backfill**: "misjudged disconnect rate" and reconnection rate go onto dashboards, split by platform — mobile disconnect monitoring finally has the right denominator.

**Recheck**: one week after shipping, misjudged disconnects **120,000**/day → **0**; complaints **486** → **9** (down **98**%); the evening-peak reconnect spike from **14,400** QPS → **1,000** (down **93**%, the remainder true disconnects); truly dead links reclaimed within **15** minutes on average — "switching to WeChat" is now just switching to WeChat.

**Backfill checklist**:

| Backfill item | Landing point | Backlink |
|--------|------|------|
| suspend/resume + 15-minute grace period | Session gateway | Chapter 03 Section 2.1 / Section 9 skeleton |
| 1,000-message re-send window + snapshot fallback | Session gateway | Chapter 03 Section 2.3 / Section 9 skeleton |
| Misjudged disconnect rate + reconnection rate split by platform onto dashboards | Monitoring and alerting | Chapter 03 Section 11.2 / Chapter 13 |
| Platform silence behavior table into timeout parameter review | Access config | Chapter 03 Section 2.1 derivation formula / Section 3.4 checklist |

### Three Lessons from the Case

1. **Disconnect is a function of platform behavior, not of heartbeats** — if the "longest legitimate silence" term of the three-term timeout derivation is taken from the wrong platform, the other two terms however accurate are still wrong (Section 2.1 derivation formula).
2. **The session lifecycle needs a state for "people who will come back"** — destroy and suspend are two cost structures: destroy saves memory and transfers the cost to returning players; suspend spends a little memory and turns reconnection into one resume (Sections 2.1/2.3).
3. **A storm's account must include second-order damage** — misjudged disconnection is itself an experience problem, but the reconnect spike formed at the return peak can saturate the login service and hurt players who never switched; capacity accounts must be computed on storm terms, not daily terms (ledger convergence).

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [05](/client/web/05.md)
- [index](/history/index.md)
- [knowledge](/knowledge.md)
- [02-engine-middleware-docs](/research/02-engine-middleware-docs.md)
