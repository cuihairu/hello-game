# 06 Common Frameworks: From the Lightest to the Heaviest

> When I compiled these game server frameworks, I mainly compared their design trade-offs, suitable scenarios, and evolution paths. Combined with the "incremental design" idea in *Game Programming Patterns*, my inclination is to start from the simplest solution the current problem needs, and introduce a more complex framework only once a clear requirement appears.
>
> **Scope note**: the framework observations here aim to be grounded in source code and production practice. A single piece cannot cover all of a framework's complexity; I care more about the boundaries that would change a selection decision, and about how each framework's key internal mechanisms actually work.

---

## 0. Why Understand the Framework Spectrum?

Many teams face a choice at project kickoff: which framework? The question looks simple but hides a huge trap—**over-engineering**. Using KBEngine for a card game is like fishing from an aircraft carrier. Using a bare HTTP Server for an MMO is like taking a bicycle onto the highway.

The essence of a game server framework is **the choice of concurrency model**. Different frameworks offer different ways to answer one question: when 5000 players are online at the same time, how do you process their operations efficiently without interference?

The key to understanding the framework spectrum is not memorizing each framework's API, but understanding **what problem each framework solves, and what new problems it introduces**. As *Game Server Architecture and Optimization* emphasizes: there is no single "right" framework, only the framework best suited to the current stage.

### First Principles of Framework Selection

Before picking a framework, answer three questions:

1. **What interaction pattern does your game have?** Card/turn-based (request-response suffices) or real-time competitive (persistent connection and state sync required)?
2. **What is your team's tech stack?** If the team knows Go, do not force C++; if it knows Lua, do not force a switch to Java.
3. **What stage is your project in?** Prototype validation needs fast delivery; launch needs stability and reliability.

### The Framework Spectrum: From Light to Heavy

```text
轻 ◀──────────────────────────────────────────────────▶ 重
HTTP Server → Netty → Skynet → Pitaya → Photon → KBEngine → BigWorld
(通用)      (网络库)  (Actor)  (Go框架)  (商业)   (Python)   (商业)
```

| Weight class | Framework | Language | Core model | Learning curve | Productivity |
|-------|------|------|---------|---------|-------|
| Light | HTTP Server | Any | Request-response | ⭐ | ⭐⭐ |
| Medium-light | Netty | Java | Reactor | ⭐⭐ | ⭐⭐⭐ |
| Medium | Skynet | C + Lua | Actor | ⭐⭐⭐ | ⭐⭐⭐ |
| Medium | Pitaya | Go | Actor + Cluster | ⭐⭐ | ⭐⭐⭐⭐ |
| Medium-heavy | Photon Server | C# | Actor + state machine | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Heavy | KBEngine | C++ + Python | Entity + Cell | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Heaviest | BigWorld | C++ + Python | Entity + Space | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

> **The *Million Online* lesson**: when choosing a framework, what to watch is not "what can it do," but "at what scale it starts to have problems." Small frameworks are simple and efficient at low concurrency, but hit a ceiling at ten-thousand online players; large frameworks handle ten-thousands and up with ease, but standing up a minimum viable system requires a large amount of configuration.

### Why Is the Concurrency Model the Core?

Every game server framework, in the end, answers the same question: **how do multiple players' operations run concurrently without interfering with each other?**

Different frameworks give different answers:

| Concurrency model | Representative framework | Core idea | Strengths | Weaknesses |
|---------|---------|---------|------|------|
| Request-response | HTTP Server | Every request handled independently | Simple, stateless | No real-time push |
| Reactor | Netty | Event-driven, non-blocking I/O | High network throughput | You must manage state yourself |
| Actor | Skynet | Message-driven, service isolation | Naturally avoids locks, lightweight | A global queue can become a bottleneck |
| Actor+Cluster | Pitaya | Actor + distributed messaging | Horizontal scaling, rich ecosystem | GC pauses |
| Entity/Cell | KBEngine | Entity model + space partitioning | Natively supports MMO worlds | Complex architecture |

---

## 1. HTTP Server: The Simplest Starting Point

### Why Can HTTP Be a Game Server?

The HTTP Server is **the starting point of every game project**. The reason is simple: login validation, payment callbacks, event APIs, backend admin — these systems are request-response by nature and need neither a persistent connection nor real-time push.

*Online Game Core Technologies and Practice* points out that many systems that appear to "need real time" only need "near real time." Offline earnings calculation in idle games, gacha results in card games, building upgrades in strategy games — all of these operations can go over plain HTTP APIs.

**Use cases**: the entire server logic of card/turn-based games; the login server / payment callbacks / event APIs of any game; most of an SLG's logic; offline earnings calculation in idle games; admin backends / GM tools.

**Limitations**: no state management, no real-time push, no room concept, connection model unsuitable for high-frequency interaction.

### The Essence of the HTTP Protocol: Why It Is "Not Game-Enough"

**1. The inherent limits of the request-response model**

The HTTP protocol is designed as "the client sends a request, the server returns a response." The server **can never proactively push a message to the client**. Even if you supplement push with WebSocket, the HTTP framework's entire design paradigm (routing, middleware, statelessness) is still built around request-response.

**2. What "stateless" means**

HTTP "statelessness" means every request is independent. The server does not remember what the previous request said. In a game scenario this means: every request must carry complete authentication information, server-side session state needs extra storage, and persistent concepts such as "room," "scene," and "team" cannot be expressed naturally.

### Core Code Example: A Login Server That Actually Works

```go
func loginHandler(w http.ResponseWriter, r *http.Request) {
    var req LoginRequest
    json.NewDecoder(r.Body).Decode(&req)

    var player Player
    if err := db.Where("username = ?", req.Username).First(&player).Error; err != nil {
        http.Error(w, "用户不存在", 401)
        return
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "player_id": player.ID,
        "exp":       time.Now().Add(24 * time.Hour).Unix(),
    })
    tokenStr, _ := token.SignedString([]byte(secretKey))
    json.NewEncoder(w).Encode(map[string]string{"token": tokenStr})
}
```

### The Complete HTTP Architecture of a Card Game

Taking a typical card game as an example, this shows how to build a complete server side with pure HTTP:

**Turn-based battle handling**:

```go
func battleActionHandler(w http.ResponseWriter, r *http.Request) {
    playerID := getPlayerFromToken(r)
    var req BattleActionRequest
    json.NewDecoder(r.Body).Decode(&req)

    battle, err := getBattleState(playerID, req.BattleID)
    if err != nil {
        http.Error(w, "战斗不存在", 404)
        return
    }

    if battle.CurrentTurn != playerID {
        http.Error(w, "不是你的回合", 400)
        return
    }

    result, err := executeAction(battle, req.Action)
    aiResult := calculateAIResponse(battle)
    updateBattleState(battle, result, aiResult)

    json.NewEncoder(w).Encode(BattleResponse{
        PlayerAction: result,
        AIAction: aiResult,
        NewState: battle.State,
        IsOver: battle.IsFinished(),
    })
}
```

**Offline earnings calculation**:

```go
func calculateOfflineReward(player *Player) OfflineReward {
    lastLoginTime := player.LastLoginTime
    currentTime := time.Now()
    offlineDuration := currentTime.Sub(lastLoginTime)

    maxOffline := 24 * time.Hour
    if offlineDuration > maxOffline {
        offlineDuration = maxOffline
    }

    baseRewardPerMinute := player.BuildingLevel * 10
    totalReward := int64(offlineDuration.Minutes()) * int64(baseRewardPerMinute)
    totalReward = int64(float64(totalReward) * player.VIPBonus)

    return OfflineReward{
        Gold: totalReward,
        Duration: offlineDuration,
        BonusMultiplier: player.VIPBonus,
    }
}
```

### WebSocket Supplements Real-Time Capability

When an HTTP Server cannot meet real-time needs, WebSocket is the most natural complement:

```go
var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool { return true },
}

type ConnectionManager struct {
    connections map[int64]*websocket.Conn
    mu          sync.RWMutex
}

func (cm *ConnectionManager) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    token := r.URL.Query().Get("token")
    playerID, err := validateToken(token)
    if err != nil {
        http.Error(w, "Invalid token", 401)
        return
    }

    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil { return }

    cm.Register(playerID, conn)
    defer cm.Unregister(playerID)

    for {
        _, message, err := conn.ReadMessage()
        if err != nil { break }
        cm.HandleMessage(playerID, message)
    }
}
```

### Performance Tuning in Practice

**Connection pool optimization**:

```go
// 连接池调优：复用连接，避免每个请求重建 TCP
func newHTTPClient() *http.Client {
    transport := &http.Transport{
        MaxIdleConns:        200,
        MaxIdleConnsPerHost: 20,
        IdleConnTimeout:     90 * time.Second,
    }
    return &http.Client{Transport: transport, Timeout: 5 * time.Second}
}
```

**Rate-limit protection**:

```go
type RateLimiter struct {
    tokens   chan struct{}
    fillRate time.Duration
}

func NewRateLimiter(rate int, burst int) *RateLimiter {
    rl := &RateLimiter{
        tokens:   make(chan struct{}, burst),
        fillRate: time.Second / time.Duration(rate),
    }
    go rl.fill()
    return rl
}

func (rl *RateLimiter) Allow() bool {
    select {
    case <-rl.tokens:
        return true
    default:
        return false
    }
}
```

### Common Production Problems and Solutions

**Problem 1: Player cheating** — the client tampers with request data

Solution: server-authoritative computation. All numeric calculations happen on the server; the client only sends action commands.

```go
// 错误做法
type BadAttackRequest struct {
    Damage int `json:"damage"` // 可被篡改
}

// 推荐做法
type GoodAttackRequest struct {
    TargetID int64 `json:"target_id"` // 只发送目标
    SkillID  int   `json:"skill_id"`  // 只发送技能ID
}
```

**Problem 2: Payment callback lost** — inconsistent order state

Solution: active querying + reconciliation. Periodically check unconfirmed orders and reconcile against the payment platform.

**Problem 3: Login endpoint abused** — brute force / bot logins

Solution: layered defense (IP rate limiting + CAPTCHA + device fingerprint).

### When Should You Move Off HTTP?

1. **You need real-time sync**: a player moves and the other 50 need to see it immediately
2. **You need room management**: a 5v5 match needs matchmaking, room formation, and state sync
3. **You need state persistence**: a player disconnects and the scene must be restored
4. **Your code is starting to get complicated**: simulating room state over HTTP

### References

- *Go Web Programming* (Xie Mengjun)
- *HTTP: The Definitive Guide*
- gorilla/websocket docs
- The "server prediction" pattern in *Game Programming Patterns*

---

## 2. Netty: The Cornerstone of Java Game Servers

### Netty Is Not a Game Framework, but It Is Where Java Games Start

Netty itself is a high-performance network framework, not a game server framework. Yet almost every Java game server is built on top of Netty. The key to understanding Netty is the **Reactor model**: one thread accepts connections, and a group of threads handles I/O events.

*Million Online* points out that the biggest advantage of Java game servers is a **mature ecosystem**: Spring for the business layer, Redis for cache, MySQL for persistence, Kafka for the message queue. The biggest disadvantage is **GC pauses**: once the online count passes 5000, a Full GC pause of a few seconds can drop large numbers of players at once.

### The Three Variants of the Reactor Model

**Single-threaded Reactor (the simplest)**: one thread handles all events; slow business logic blocks network I/O.

**Multi-threaded Reactor (Netty's default mode)**: accept and I/O handling are separated, and workers run in parallel. Netty uses this mode by default.

**Master-slave Reactor (ultra-high-performance scenarios)**: multiple sub-Reactors each handle the I/O events of a portion of the connections, suitable for tens of thousands of concurrent connections.

### Netty Pipeline: How Data Flows Through Your Code

The pipeline is Netty's most central design. Every Channel (connection) has a pipeline, and data passes through a series of handlers in the pipeline.

```text
入站方向 ────────────────────────────────>

  [Decode] -> [Frame] -> [Game Logic] -> [Auth]
  (解码)     (拆包)     (业务逻辑)     (鉴权)

出站方向 <───────────────────────────────

  [Encode] <- [Compress] <- [Game Response]
  (编码)      (压缩)        (响应数据)
```

**InboundHandler**: handles received data. **OutboundHandler**: handles data being sent.

### ByteBuf Internal Mechanics

Netty's ByteBuf is a wrapper and extension of java.nio.ByteBuffer:

**1. Expandable capacity**: ByteBuf grows automatically, so there is no need to handle "buffer overflow" exceptions by hand.

**2. Reference counting**: call `release()` after use; when the reference count drops to 0 the memory is reclaimed.

**3. Pooled reuse**: `PooledByteBufAllocator` cuts memory allocation by 90%.

**4. Separate read/write pointers**: `readerIndex` and `writerIndex` are independent, so `flip()` is unnecessary.

### Game Protocol Design in Practice

**TLV (Type-Length-Value) protocol**:

```java
public class GameDecoder extends MessageToMessageDecoder<ByteBuf> {
    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        if (in.readableBytes() < 8) return;

        in.markReaderIndex();
        short msgId = in.readShort();
        int length = in.readInt();

        if (in.readableBytes() < length + 2) {
            in.resetReaderIndex();
            return;
        }

        byte[] body = new byte[length];
        in.readBytes(body);
        short crc = in.readShort();

        if (crc != calculateCRC(msgId, length, body)) {
            ctx.close();
            return;
        }

        out.add(new GameMessage(msgId, body));
    }
}
```

**Protobuf protocol (recommended)**:

```protobuf
syntax = "proto3";
package game;

message PlayerMove {
    int64 player_id = 1;
    float x = 2;
    float y = 3;
    float z = 4;
    float rotation = 5;
    int64 timestamp = 6;
}

message GameMessage {
    int32 msg_id = 1;
    oneof payload {
        PlayerMove move = 10;
        PlayerAttack attack = 11;
    }
}
```

Protobuf advantages: small serialized size (3-5x smaller than JSON), fast parsing (5-10x faster than JSON), backward compatible, cross-language.

### Heartbeat Detection and Reconnection

```java
pipeline.addLast("idle", new IdleStateHandler(30, 15, 0));

public class HeartbeatHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
        if (evt instanceof IdleStateEvent) {
            IdleStateEvent event = (IdleStateEvent) evt;
            switch (event.state()) {
                case READER_IDLE:
                    ctx.close();
                    break;
                case WRITER_IDLE:
                    ctx.writeAndFlush(new HeartbeatMessage());
                    break;
            }
        }
    }
}
```

**Client reconnection (exponential backoff)**:

```java
public class ReconnectHandler {
    private int retryCount = 0;
    private static final int MAX_RETRY = 5;
    private static final long BASE_DELAY = 1000;

    private void reconnect() {
        if (retryCount >= MAX_RETRY) { showNetworkError(); return; }
        long delay = BASE_DELAY * (long) Math.pow(2, retryCount);
        retryCount++;
        scheduler.schedule(() -> {
            try {
                Channel channel = bootstrap.connect(host, port).sync().channel();
                if (channel.isActive()) { retryCount = 0; }
            } catch (Exception e) { reconnect(); }
        }, delay, TimeUnit.MILLISECONDS);
    }
}
```

### A Typical Java Game Server Architecture

```text
Netty (网络层) + Spring (业务层) + Redis (缓存) + MySQL (持久化)
```

Full architecture: gateway layer (Netty + connection management + protocol codec) → logic layer (Spring microservices: battle / social / inventory / quest / guild / leaderboard) → storage layer (Redis + MySQL + Kafka)

### Core Code Example

```java
ServerBootstrap bootstrap = new ServerBootstrap();
bootstrap.group(bossGroup, workerGroup)
    .channel(NioServerSocketChannel.class)
    .option(ChannelOption.SO_BACKLOG, 1024)
    .childOption(ChannelOption.TCP_NODELAY, true)
    .childHandler(new ChannelInitializer<SocketChannel>() {
        protected void initChannel(SocketChannel ch) {
            ChannelPipeline p = ch.pipeline();
            p.addLast("idle", new IdleStateHandler(30, 0, 0));
            p.addLast("decoder", new LengthFieldBasedFrameDecoder(65535, 0, 4, 0, 4));
            p.addLast("encoder", new LengthFieldPrepender(4));
            p.addLast("handler", new GameMessageHandler());
        }
    });
```

### Performance Tuning in Practice

**1. Worker thread count**: `NioEventLoopGroup workerGroup = new NioEventLoopGroup(cpuCores * 2);`

**2. Memory pool configuration**: use `PooledByteBufAllocator`; JVM flags `-XX:+UseG1GC -XX:MaxGCPauseMillis=200`

**3. TCP parameter tuning**: SO_BACKLOG=4096, SO_RCVBUF=32768, TCP_NODELAY=true

**4. Zero-copy optimization**: use `FileRegion` (large file transfer) and `CompositeByteBuf` (merging multiple ByteBufs)

### GC Tuning: The Achilles' Heel of Java Game Servers

**G1 GC tuning**:

```bash
java -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:G1HeapRegionSize=16m \
     -XX:InitiatingHeapOccupancyPercent=45 -Xms4g -Xmx4g -jar game-server.jar
```

**ZGC (Java 11+, recommended)**:

```bash
java -XX:+UseZGC -Xms4g -Xmx4g -XX:MaxDirectMemorySize=512m -jar game-server.jar
```

ZGC advantages: pause time under 1ms regardless of heap size, and support for TB-scale heap memory.

**Object pool reuse**: use Netty's Recycler to implement object pools, cutting memory allocation by 90%.

### Common Production Problems and Solutions

**Problem 1: OOM from too many connections** — cap the maximum connection count + clean up dead connections with heartbeats + monitor connection count

**Problem 2: TCP sticky packets / split packets** — handled automatically with `LengthFieldBasedFrameDecoder`

**Problem 3: GC pauses drop players** — use ZGC + increase heartbeat timeout + have the server send heartbeats too

### When Not to Use Netty

- The team does not know Java
- You need built-in game logic (Netty is only a network framework)
- You need hot updates (Java does not support runtime hot updates)
- Memory is extremely sensitive
- You need a built-in cluster

### References

- *Netty in Action* (Norman Maurer)
- *Java Concurrency in Practice*
- *Deep Dive into the Java Virtual Machine* (Zhou Zhiming)
- Netty official examples: https://github.com/netty/netty/tree/main/example

---

## 3. Skynet: The Representative of Lightweight Actor Frameworks

### Why Is Skynet So Popular in the Chinese Game Development Community?

Skynet was open-sourced by Cloud Wu, whose core design philosophy is **doing the most with the least resources**. A single Skynet instance can support 5000 online players in under 100MB of memory. Skynet's Actor model solves one core problem: **how to efficiently handle a large volume of concurrent tasks inside a single process?** Every service is an independent Actor, communicating through message queues. Lua coroutines let you write asynchronous code in a synchronous style.

### A Deep Look at Skynet's Source Code Architecture

Skynet's source layout is extremely lean, with the entire core C codebase under 5000 lines:

```text
skynet-src/
├── skynet.h              # 核心头文件，定义所有公开API
├── skynet_main.c         # 主入口，解析配置文件，启动引擎
├── skynet_server.c       # 服务管理，消息调度的核心
├── skynet_handle.c       # 服务句柄管理（名称->ID映射）
├── skynet_mq.c           # 消息队列实现
├── skynet_timer.c        # 定时器实现
├── skynet_socket.c       # 网络I/O（epoll/kqueue）
├── skynet_harbor.c       # 多节点集群通信
├── skynet_cluster.c      # 新版集群实现
├── skynet_monitor.c      # 死锁检测
├── skynet_modules.c      # C模块动态加载
├── skynet_imp.c          # 印象管理（统计模块耗时）
├── skynet_log.c          # 日志系统
└── malloc_hook.c         # 内存分配钩子
```

### The Core APIs in skynet.h in Detail

```c
// 1. 消息发送——Actor 间通信的核心
int skynet_send(struct skynet_context *context,
                int type,          // PTYPE_TEXT/PTYPE_LUA/PTYPE_SOCKET等
                int session,       // 会话ID（用于request-response模式）
                int source,        // 发送者ID
                int dest,          // 接收者ID
                int proto,         // 协议类型
                void *msg,         // 消息体指针
                size_t sz);        // 消息体大小

// 消息类型：
// PTYPE_TEXT=0, PTYPE_LUA=1, PTYPE_SOCKET=2, PTYPE_RESPONSE=3

// 2. 服务管理
int skynet_localname(struct skynet_handle *handle, const char *name);

// 3. 内存管理
void * skynet_malloc(size_t size);
void skynet_free(void *ptr);

// 4. 定时器
int skynet_timeout(uint32_t handle, int time, int session);
```

### The Complete Lifecycle of a Service

```text
创建: skynet.newservice() -> skynet_server_create() -> 创建上下文 -> 分配消息队列 -> 加载Lua脚本 -> 执行main函数

运行: 消息队列有消息 -> 工作线程取出 -> skynet_server_dispatch() -> 执行回调(CMD.xxx)
      如果有I/O操作: 协程挂起(skynet.yield) -> I/O完成后恢复(skynet.wakeup)

销毁: skynet.exit() -> 释放消息队列 -> 移除句柄映射
```

### The Message-Passing Mechanism in Detail

**1. One-way message (fire-and-forget)**:

```lua
skynet.send("player_service", "lua", "on_message", player_id, msg)
```

**2. Request-response pattern**:

```lua
local result = skynet.call("db_service", "lua", "query_player", player_id)
-- 当前协程挂起，等接收方返回响应后恢复
```

**3. Multicast**:

```lua
local mc = require "skynet.multicast"
local channel = mc.new()
channel:subscribe(function(msg) end)
channel:publish("update_config", new_config)
```

### A Deep Look at the Global Message Queue

The most central, and most controversial, design in Skynet is the **single global message queue**:

```c
// 消息入队
void skynet_mq_push(struct message_queue *q, struct skynet_message *message) {
    SPIN_LOCK(q->lock);
    q->queue[q->tail] = *message;
    q->tail = (q->tail + 1) % q->cap;
    if (q->in_global == 0) {
        q->in_global = 1;
        global_queue_push(q);
    }
    SPIN_UNLOCK(q->lock);
}
```

**Pros and cons of the global queue**:

Pros: automatic load balancing, no manual thread assignment needed, simple and efficient.

Cons: **one slow service drags down the whole system** (for example the chat service's sensitive-word filtering blocking the battle service), no real-time guarantees, and difficult debugging.

Countermeasures: put time-consuming operations into standalone C services, and use skynet.fork to spawn a new coroutine for expensive tasks.

### The Lua Coroutine Scheduling Mechanism

```lua
function CMD.handle_request(request)
    -- 看起来是同步代码，但实际上是异步执行的
    local player = skynet.call("db_service", "lua", "query", request.player_id)
    -- 当前协程挂起，Skynet 执行其他消息，数据库查询完成后协程被唤醒

    if not check_permission(player, request.action) then
        return {error = "permission denied"}
    end

    local result = execute_logic(player, request)
    skynet.call("db_service", "lua", "save", player.id, result)
    return {success = true, data = result}
end
```

### Memory Management

Skynet uses the standard library's malloc/free by default, but provides a hook mechanism that lets you swap in jemalloc or tcmalloc:

```bash
# 使用 jemalloc 编译 Skynet
make jemalloc-static
```

**Production configuration**:

```lua
-- skynet.conf
thread = 4              -- 工作线程数（CPU核心数 * 2）
logger = "logger"
harbor = 0              -- 单节点模式
start = "main"
lua_path = "./lualib/?.lua;./lualib/?/init.lua"
lua_cpath = "./luaclib/?.so"
```

### The Hot Update Mechanism in Detail

Skynet supports updating Lua code without restarting the server:

```lua
-- 热更新：替换函数定义，不重置全局状态
function hot_update(service_name, new_code_file)
    local new_module = dofile(new_code_file)
    for k, v in pairs(new_module) do
        CMD[k] = v
    end
    if new_module.init then new_module.init() end
end
```

**Hot update limitations**: C modules cannot be hot-updated, global variables are not reset, and closures are not updated. Common practice: use the module pattern (`local M = {}` ... `return M`).

### The Cluster Implementation

```yaml
# cluster.yaml
node1:
    addr = "127.0.0.1:7001"
node2:
    addr = "127.0.0.1:7002"
```

```lua
local cluster = require "skynet.cluster"
-- 跨节点调用
local result = cluster.call("node2", "@player_service", "get_info", player_id)
-- 单向消息
cluster.send("node2", "@chat_service", "broadcast", "hello")
-- 暴露服务
cluster.open("player_service")
```

### In Practice: A Complete Game Server Architecture

```text
┌──────────────────────────────────────────┐
│              Skynet 进程                  │
│  ┌──────┐ ┌────────┐ ┌───────┐          │
│  │ gate │→│watchdog│→│ login │          │
│  └──────┘ └────────┘ └───────┘          │
│  ┌───────┐ ┌────────┐ ┌──────┐          │
│  │ world │ │ battle │ │ chat │          │
│  └───────┘ └────────┘ └──────┘          │
│  ┌─────┐ ┌───────┐ ┌───────┐           │
│  │ bag │ │ task  │ │ guild │           │
│  └─────┘ └───────┘ └───────┘           │
│  ┌─────┐ ┌───────┐ ┌───────┐           │
│  │ db  │ │ timer │ │harbor │           │
│  └─────┘ └───────┘ └───────┘           │
└──────────────────────────────────────────┘
```

**World service (world management + AOI)**:

```lua
local world = {}
local GRID_SIZE = 100

function world.get_nearby_players(scene_id, x, y, radius)
    local grid_x = math.floor(x / GRID_SIZE)
    local grid_y = math.floor(y / GRID_SIZE)
    local result = {}
    for dx = -1, 1 do
        for dy = -1, 1 do
            local grid_key = string.format("%d_%d", grid_x + dx, grid_y + dy)
            local grid_players = scenes[scene_id].grids[grid_key] or {}
            for _, pid in ipairs(grid_players) do
                local p = players[pid]
                if p then
                    local dist = math.sqrt((p.x - x)^2 + (p.y - y)^2)
                    if dist <= radius then
                        table.insert(result, pid)
                    end
                end
            end
        end
    end
    return result
end
```

### Performance Tuning in Practice

**1. Reduce message serialization overhead**: pass only the fields that are actually needed, and do not serialize complex objects.

**2. Batch operations**: use `skynet.call("db_service", "lua", "save_items_batch", items)` instead of saving one item at a time.

**3. Coroutine tuning**: use skynet.fork to handle time-consuming operations so the main coroutine is not blocked.

### Common Production Problems and Solutions

**Problem 1: Deadlocks from circular calls between services** — use skynet.send instead of skynet.call.

**Problem 2: Memory keeps growing** — set cache size limits and clean up periodically.

**Problem 3: High network latency** — monitor message queue length and optimize the critical path.

### References

- Cloud Wu's "Skynet Design Overview" article series
- *Programming in Lua* (Robert Ierusalimschy)
- Official Skynet repository: https://github.com/cloudwu/skynet
- Cloud Wu's blog: https://blog.codingnow.com/

---

## 4. Pitaya: A Modern Game Server Framework in the Go Ecosystem

### Why Is Go Becoming the Mainstream Choice for Game Servers?

Go's goroutines are a natural fit for the concurrency model of game servers. One goroutine per player connection, and a million goroutines take only a few hundred MB of memory. Go's CSP (Communicating Sequential Processes) model aligns closely with the "message-driven" architecture of game servers.

Pitaya's position among Go game frameworks is a **batteries-included Actor + cluster framework**. It solves Skynet's biggest pain point — built-in cluster support. With etcd for service discovery and NATS as the message bus, Pitaya makes cross-server communication and load balancing easy.

### A Deep Look at Pitaya's Architecture

```text
┌──────────────────────────────────────────┐
│              Pitaya 架构                  │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  │
│  │ Frontend │  │ Backend  │  │ Agent │  │
│  │ (网关)   │->│ (逻辑)   │->│(玩家) │  │
│  └──────────┘  └──────────┘  └───────┘  │
│       |             |            |        │
│       +--------- NATS ----------+        │
│              (消息总线)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  │
│  │  etcd    │  │  Redis   │  │ MySQL │  │
│  │(服务发现)│  │ (缓存)   │  │(持久化)│  │
│  └──────────┘  └──────────┘  └───────┘  │
└──────────────────────────────────────────┘
```

**Core strengths**: built-in clustering (etcd/NATS), Protobuf serialization, the Actor model, and a rich Go ecosystem.

### etcd Integration in Detail

etcd is the heart of Pitaya's service discovery:

```go
// 接入 etcd 服务发现并启动（bootstrap 的完整形态）
func startServer() {
    config := pitaya.DefaultConfig()
    config.Discovery.Type = "etcd"
    config.Discovery.Etcd.RootPath = "/pitaya"
    config.Discovery.Etcd.Endpoints = []string{
        "10.0.0.1:2379",
        "10.0.0.2:2379",
        "10.0.0.3:2379",
    }

    app := pitaya.New(config)
    app.ConfigureServer("game", "1", map[string]string{
        "region": "asia",
        "version": "1.0.0",
    })
    app.Start()
}
```

What etcd stores:

```text
/pitaya/servers/game/1 -> {"addr":"10.0.0.1:8001",...}
/pitaya/servers/game/2 -> {"addr":"10.0.0.2:8001",...}
/pitaya/servers/chat/1 -> {"addr":"10.0.0.1:8002",...}
```

Watch mechanism: when a server comes online or goes offline, all clients are notified automatically.

### The NATS Message Bus in Detail

NATS is Pitaya's message bus, responsible for communication between services:

```go
// 发送 RPC 请求
func (c *NATSClient) Call(target string, method string, args interface{}) (interface{}, error) {
    msg := &RPCMessage{
        Source: c.serverID,
        Target: target,
        Method: method,
        Args:   args,
        Response: make(chan interface{}, 1),
    }
    data, _ := json.Marshal(msg)
    c.conn.Publish("pitaya.rpc."+target, data)

    select {
    case resp := <-msg.Response:
        return resp, nil
    case <-time.After(5 * time.Second):
        return nil, fmt.Errorf("RPC call timeout")
    }
}

// 接收 RPC 请求
func (c *NATSClient) subscribe() {
    c.conn.Subscribe("pitaya.rpc."+c.serverID, func(msg *nats.Msg) {
        var rpcMsg RPCMessage
        json.Unmarshal(msg.Data, &rpcMsg)
        result, err := c.server.Call(rpcMsg.Method, rpcMsg.Args)
        response := map[string]interface{}{"result": result, "error": err}
        respData, _ := json.Marshal(response)
        c.conn.Publish("pitaya.response."+rpcMsg.Source, respData)
    })
}
```

### The Component Model in Detail

**Handler (handling client requests)**:

```go
func (p *PlayerComponent) Move(ctx context.Context, msg *pb.MoveRequest) (*pb.MoveResponse, error) {
    if !p.validateMove(msg.X, msg.Y) {
        return &pb.MoveResponse{Success: false, Error: "invalid move"}, nil
    }
    p.Position.X = msg.X
    p.Position.Y = msg.Y

    p.GetServer().BroadcastToScene(p.Scene, "PlayerMoved", &pb.PlayerMoved{
        PlayerId: p.PlayerID,
        X: msg.X, Y: msg.Y,
    })
    return &pb.MoveResponse{Success: true, X: msg.X, Y: msg.Y}, nil
}
```

**Remote (service-to-service calls)**:

```go
func (p *PlayerComponent) GetInfo(ctx context.Context, msg *pb.GetInfoRequest) (*pb.PlayerInfo, error) {
    return &pb.PlayerInfo{
        PlayerId: p.PlayerID,
        Name:     p.Name,
        Level:    p.Level,
        Hp:       p.HP,
    }, nil
}
```

### Session Management in Detail

```go
func (p *PlayerComponent) OnConnected(ctx context.Context) {
    session := p.GetSession()
    session.Set("login_time", time.Now())
    session.Set("ip", session.RemoteAddr())

    if !p.authenticate(session) {
        session.Close()
        return
    }

    err := session.Bind(p.PlayerID)
    if err != nil { return }
    p.joinScene(session)
}

func (p *PlayerComponent) OnDisconnected(ctx context.Context) {
    p.leaveScene()
    p.saveToDB()
    p.GetServer().BroadcastToScene(p.Scene, "PlayerOffline", &pb.PlayerOffline{
        PlayerId: p.PlayerID,
    })
}
```

### A Complete Game Server Example

```go
func main() {
    cfg := config.NewDefaultConfig()
    cfg.Discovery.Type = "etcd"
    cfg.Discovery.Etcd.Endpoints = []string{"10.0.0.1:2379"}
    cfg.Nats.URL = "nats://10.0.0.1:4222"

    app := pitaya.NewDefaultConfig()
    app.ConfigureServer("game", "1", map[string]string{"region": "asia"})

    app.Register("player", &PlayerComponent{}, pitaya.WithComponentTags("game"))
    app.Register("battle", &BattleComponent{}, pitaya.WithComponentTags("game"))
    app.Register("chat", &ChatComponent{}, pitaya.WithComponentTags("social"))

    app.AddRoute("game", func(server pitaya.Server, msg *pitaya.Message,
        lastRoute string, payload interface{}) (string, error) {
        return "game", nil
    })

    app.Start()
}
```

### Pitaya vs Skynet

| Dimension | Pitaya | Skynet |
|------|--------|--------|
| Language | Go | C + Lua |
| Concurrency model | goroutine (CSP) | Actor + coroutines |
| Cluster support | Built-in (etcd/NATS) | Build your own |
| Memory efficiency | Medium (GC) | Extremely high (no GC) |
| Development efficiency | 5/5 | 3/5 |
| Performance | 4/5 | 5/5 |
| Hot updates | Not supported | Supported at the Lua layer |

### Performance Tuning in Practice

**1. goroutine pooling**: use a WorkerPool to control concurrency and avoid creating too many goroutines.

**2. Batched message processing**: `BatchBroadcast` reduces network overhead, `BatchSend` reduces system calls.

**3. Connection pool management**: Redis pool MaxIdle=50, MaxActive=200; configure NATS for unlimited reconnection.

### Common Production Problems and Solutions

**Problem 1: NATS message backlog** — increase consumer concurrency + use NATS JetStream.

**Problem 2: etcd cluster split-brain** — use an odd number of nodes + configure a degradation strategy.

**Problem 3: Lost session data** — asynchronously persist to Redis immediately after critical operations.

### References

- Pitaya official docs: https://github.com/topfreegames/pitaya/tree/main/docs
- *Go in Action* (William Kennedy)
- NATS official docs: https://docs.nats.io/
- etcd official docs: https://etcd.io/docs/

---

## 5. KBEngine: The Open-Source MMO Engine

### KBEngine's Positioning: An Open-Source Solution for Large MMOs

KBEngine comes from Snail Games and implements a complete MMO server architecture with Python (Cellapp) + C++ (the underlying engine). Its core concept is **Entity + Cell**: every online player is an Entity, a scene is split into multiple Cells, and Entities migrate between Cells.

**Why choose KBEngine?** Complete (login, matchmaking, battle, inventory, guilds all present), open source (free to use and deeply customizable), rich documentation (an active Chinese community), and excellent performance (the C++ core guarantees critical-path performance).

### A Deep Look at KBEngine's Architecture

```text
+----------------------------------------------------------+
|                    KBEngine 架构                           |
|                                                          |
|  +----------+  +----------+  +----------+                |
|  | Loginapp |  | Loginapp |  | Loginapp |                |
|  | (登录服) |  | (登录服) |  | (登录服) |                |
|  +----+-----+  +----+-----+  +----+-----+                |
|       |              |              |                     |
|       +--------------+--------------+                     |
|                      |                                    |
|  +----------------------------------------+              |
|  |              Baseapp 集群               |              |
|  |  管理客户端连接, 路由消息到 Cellapp      |              |
|  |  处理登录认证, 管理 Base Entity          |              |
|  +----------------------------------------+              |
|                      |                                    |
|  +----------------------------------------+              |
|  |              Cellapp 集群               |              |
|  |  每个 Cell 负责一个场景区域              |              |
|  |  Entity 在 Cell 之间迁移                |              |
|  |  AOI 自动计算可见范围                   |              |
|  |  战斗移动技能等核心逻辑                  |              |
|  +----------------------------------------+              |
|                      |                                    |
|  +----------------------------------------+              |
|  |              DBApp 集群                 |              |
|  |  异步读写数据库, 数据缓存和脏标记        |              |
|  |  分库分表支持                           |              |
|  +----------------------------------------+              |
+----------------------------------------------------------+
```

### The Entity / Cell / Base Three-Layer Architecture in Detail

**1. Entity** — every online player, NPC, and monster is an Entity:

```python
class Player(KBEngine.Entity):
    def __init__(self):
        KBEngine.Entity.__init__(self)
        self.hp = 100
        self.mp = 50
        self.level = 1
        self.position = (0, 0, 0)

    def setHP(self, value):
        self.hp = max(0, min(value, self.maxHP))
        # KBEngine 自动将变化同步给客户端

    def requestMove(self, x, y, z):
        if not self.validateMove(x, y, z):
            return False
        self.position = (x, y, z)
        self.cell.onMove(x, y, z)
        return True
```

**2. Base (base entity)** — runs on Baseapp and is responsible for database reads/writes and cross-Cell communication:

```python
class PlayerBase(KBEngine.Entity):
    def __init__(self):
        KBEngine.Entity.__init__(self)
        self.accountName = ""

    def onLoad(self, data):
        self.hp = data.get("hp", 100)
        self.level = data.get("level", 1)
        self.items = data.get("items", [])

    def onSaved(self, success):
        if success:
            KBEngine.LOG_INFO("玩家数据保存成功: %d" % self.id)

    def sendToCell(self, methodName, *args):
        if self.cell:
            self.cell.cellCall(methodName, *args)
```

**3. Cell (scene entity)** — runs on Cellapp and is responsible for scene logic and AOI:

```python
class PlayerCell(KBEngine.Entity):
    def __init__(self):
        KBEngine.Entity.__init__(self)
        self.spaceID = 0

    def onEnterSpace(self, spaceID):
        self.spaceID = spaceID
        self.aoi.onEnter(spaceID, self.position)

    def onLeaveSpace(self):
        self.aoi.onLeave(self.spaceID, self.position)
        self.spaceID = 0

    def onMove(self, x, y, z):
        oldNearby = self.aoi.getNearbyEntities()
        self.position = (x, y, z)
        newNearby = self.aoi.getNearbyEntities()

        for entity in newNearby - oldNearby:
            entity.base.onPlayerEnter(self.id)
        for entity in oldNearby - newNearby:
            entity.base.onPlayerLeave(self.id)
```

### The Message Routing Mechanism

```text
客户端 -> Baseapp -> Cellapp -> 目标 Entity
  |         |         |         |
  |    路由到合理的  路由到合理的  执行方法
  |    Baseapp     Cellapp
```

### AOI (Area of Interest) Implementation in Detail

**Nine-grid AOI algorithm**:

```python
class AOIManager:
    def __init__(self, gridSize=100):
        self.gridSize = gridSize
        self.grids = {}

    def getGrid(self, x, y):
        return (int(x / self.gridSize), int(y / self.gridSize))

    def getNearbyEntities(self, x, y, radius):
        gridX, gridY = self.getGrid(x, y)
        result = []
        for dx in range(-1, 2):
            for dy in range(-1, 2):
                grid = (gridX + dx, gridY + dy)
                if grid in self.grids:
                    for entityID in self.grids[grid]:
                        entity = getEntity(entityID)
                        if entity and self.inRange(x, y, entity.position, radius):
                            result.append(entityID)
        return result
```

**Quadtree spatial index**: uses a quadtree to accelerate spatial queries, suitable for large-world scenes.

**Skip-list AOI**: uses two skip lists to manage the X and Y coordinates separately, with O(logN) query efficiency.

### The Database Layer in Detail

```python
# 异步数据库操作
class Player(KBEngine.Entity):
    def saveData(self):
        self.writeToDB()

    def loadData(self):
        self.readFromDB(callback=self.onDataLoaded)

    def onDataLoaded(self, success, data):
        if success:
            self.hp = data.get("hp", 100)
```

**Sharding**: distribute across databases based on the hash value of the Entity ID.

**Redis cache for hot data**: read from the Redis cache first, and fall back to the database on a cache miss.

### Client SDK Integration

```csharp
// Unity SDK
public class GameClient : MonoBehaviour {
    void Start() {
        KBEngineApp.app.init("127.0.0.1", 20013);
        KBEngineApp.app.login("test", "password", "test");
    }

    void onLoginSuccessfully() {
        KBEngineApp.app.entityCall("Player", "onLogin");
    }

    void onPlayerEnterWorld(KBEngine.Entity entity) {
        InitGameUI(entity);
    }
}
```

### Performance Tuning in Practice

**1. Cellapp performance**: reduce unnecessary property synchronization, and use setProximityOptimize to cut AOI computation.

**2. Database performance**: batch saves, and cache hot data in Redis.

**3. Network performance**: message compression (gzip) and message batching.

### Common Production Problems and Solutions

**Problem 1: The Python GIL bottlenecks a single Cellapp** — spread the load across multiple Cellapps + push hot logic down into C++.

**Problem 2: Memory leaks** — use weakref to avoid circular references + check memory usage periodically.

**Problem 3: Database connection pools exhausted** — increase pool size + use asynchronous database operations.

### References

- **Deep-dive analysis**: [KBEngine source analysis and learning guide](https://github.com/cuihairu/kbengine) (129 documents, 58430 lines, covering all core modules including Entity/Cell/AOI/networking/persistence/hot updates)
- KBEngine official docs: https://kbengine.github.io/cn/docs/
- KBEngine GitHub: https://github.com/kbengine/kbengine
- *Core Python Programming*
- *Large-Scale C++ Software Design*

---

## 6. BigWorld: The Heavyweight Commercial MMO Engine

### BigWorld's Historical Position

BigWorld is the "aircraft carrier" of the game server engine world. Developed by BigWorld Pty Ltd in Australia, it was adopted by large MMOs such as *World of Tanks*. BigWorld's core value is not "best performance" but **the most complete** — it solves the engineering problem of "how do 100,000 players interact freely in one seamless world".

### The Six Core Process Types in Detail

#### 1. Loginapp (login server)

Loginapp is the first touchpoint for players entering the game, handling authentication and initial routing:

```python
class Loginapp:
    def __init__(self):
        self.pendingLogins = {}
        self.onlinePlayers = {}

    def onPlayerConnect(self, accountName, password):
        if not self.verifyAccount(accountName, password):
            return {"error": "invalid_credentials"}

        if accountName in self.onlinePlayers:
            oldBaseapp = self.onlinePlayers[accountName]
            oldBaseapp.kickPlayer(accountName)

        baseapp = self.selectBaseapp()
        if baseapp is None:
            return {"error": "server_full"}

        token = self.generateToken(accountName, baseapp)
        return {"baseapp_addr": baseapp.addr, "token": token}

    def selectBaseapp(self):
        minPlayers = float('inf')
        selected = None
        for baseapp in self.baseapps:
            if baseapp.playerCount < minPlayers:
                minPlayers = baseapp.playerCount
                selected = baseapp
        return selected
```

#### 2. Baseapp (gateway / base)

Baseapp is the bridge between clients and the server, managing connections and message routing:

```python
class Baseapp:
    def __init__(self):
        self.connections = {}
        self.baseEntities = {}

    def onClientMessage(self, playerID, msgType, data):
        entity = self.baseEntities.get(playerID)
        if entity is None:
            return

        if msgType == "scene_message":
            cellapp = self.getCellappForPlayer(playerID)
            cellapp.forwardMessage(playerID, data)
        elif msgType == "base_message":
            entity.handleMessage(data)
```

#### 3. Cellapp (scene / logic processing)

Cellapp is the core of BigWorld, responsible for all logic in the game world:

```python
class Cellapp:
    def __init__(self):
        self.spaces = {}
        self.entities = {}

    def createSpace(self, spaceID, width, height, config):
        space = Space(spaceID, width, height)
        space.loadConfig(config)
        self.spaces[spaceID] = space
        return space

    def onEntityMove(self, entityID, x, y, z):
        entity = self.entities.get(entityID)
        if entity is None:
            return

        oldPos = entity.position
        entity.position = (x, y, z)

        space = self.spaces[entity.spaceID]
        space.updateEntityAOI(entity, oldPos, (x, y, z))

        if space.shouldMigrate(entity):
            self.migrateEntity(entity)
```

#### 4. DBapp (database proxy)

```python
class DBapp:
    def __init__(self):
        self.cache = {}
        self.dirty = set()
        self.dbConnections = []

    def loadEntity(self, entityID, entityType):
        if entityID in self.cache:
            return self.cache[entityID]

        db = self.getConnection()
        data = db.query("SELECT * FROM %s WHERE id = %%s" % entityType, entityID)
        if data:
            self.cache[entityID] = data
        return data

    def saveEntity(self, entityID, data):
        self.cache[entityID] = data
        self.dirty.add(entityID)

    def flushDirtyData(self):
        for entityID in self.dirty:
            data = self.cache.get(entityID)
            if data:
                db = self.getConnection()
                db.update("UPDATE %s SET ... WHERE id = %%s" % data['type'],
                         data['values'], entityID)
        self.dirty.clear()
```

#### 5. Manager (cluster management)

```python
class Manager:
    def __init__(self):
        self.processes = {}

    def registerProcess(self, processID, processType, addr):
        self.processes[processID] = {
            "type": processType,
            "addr": addr,
            "status": "running",
            "lastHeartbeat": time.time()
        }

    def checkHealth(self):
        now = time.time()
        for processID, info in self.processes.items():
            if now - info["lastHeartbeat"] > 30:
                info["status"] = "dead"
                self.handleProcessDeath(processID)
```

### Space Management in Detail

BigWorld's Space is the basic unit of the game world:

**Dynamic Space splitting**: when the entity count of a Cell exceeds a threshold, it automatically splits into two Cells.

**Entity migration protocol**:
1. The source Cellapp detects that a migration is needed
2. Serialize the Entity's full state
3. Notify the target Cellapp to prepare to receive
4. Send the Entity state to the target Cellapp
5. The target Cellapp deserializes and creates the Entity
6. Notify the client to update the Entity's position
7. The source Cellapp removes the Entity
8. Update the AOI system

### AOI Algorithms in Detail

**Cross-linked-list AOI**: uses two linked lists to manage the X and Y coordinates separately, with O(1) insert/delete and O(K) query efficiency.

**AOI notification mechanism**: when an entity enters or leaves view, notify the relevant entities.

### Database Synchronization Strategy

**Dirty-flag mechanism**: save only changed data.

**Batched writes**: reduce database pressure by flushing once every 5 seconds.

### A Complete Toolchain

- **Scene editor (Visual Editor)**: visually edit game scenes, drag and drop NPCs / monsters / triggers
- **Profiler**: monitor CPU / memory / network usage
- **Debug console (Console)**: view server state in real time, execute GM commands
- **Automated testing framework**: unit tests, integration tests, stress tests

### What Game Types Suit BigWorld?

| Game type | Fit | Reason |
|---------|--------|------|
| Large MMO (World of Warcraft-style) | 5/5 | This is exactly its core design goal |
| Sandbox (Minecraft-style) | 4/5 | Spatial partitioning is natively supported |
| SLG (Rise of Kingdoms-style) | 3/5 | Usable, but killing a chicken with an ox-cleaver |
| Card / turn-based | 1/5 | Completely unsuitable, far too heavy |
| Real-time competitive (Honor of Kings-style) | 2/5 | AOI is usable, but frame sync is not supported |

### Performance Tuning in Practice

**1. Cellapp performance**: reduce Entity property synchronization and set AOI optimization parameters.

**2. Memory optimization**: use object pools and memory pools.

**3. Network optimization**: message compression, message batching, and UDP for real-time messages.

### Common Production Problems and Solutions

**Problem 1: Data loss during Entity migration** — full serialization + verify the integrity of migrated data.

**Problem 2: AOI computation becomes a bottleneck** — use spatial indexes + lower the update frequency + use LOD.

**Problem 3: Database write latency** — add database connections + use asynchronous writes + use a message queue.

### BigWorld's Fatal Flaws

**1. Expensive commercial licensing**: USD 100k-500k plus annual maintenance fees.

**2. Steep learning curve**: 3-6 months before you truly master it.

**3. Closed community**: closed-source commercial software with no active open-source community.

**4. Python-layer performance bottleneck**: a single Cellapp becomes a bottleneck beyond 3000 Entities.

**5. Complex deployment**: multiple process types must be configured, with high operational complexity.

### BigWorld vs KBEngine vs Building It Yourself

| Dimension | BigWorld | KBEngine | Build it yourself |
|------|----------|----------|------|
| Cost | Expensive (USD 100k-500k) | Free | Free (but high labor cost) |
| Completeness | 5/5 | 4/5 | 2/5 |
| AOI | Built-in, mature | Needs a plugin | Build it yourself |
| Entity migration | Built-in, seamless | Supported | Build it yourself |
| Learning curve | Steep (3-6 months) | Medium (1-3 months) | Depends on the team |
| Community | Closed | Active Chinese community | None |

### References

- **Deep-dive analysis**: [BigWorld source analysis and architecture study](https://github.com/cuihairu/BigWorld) (43 documents, 12794 lines, covering all core modules including Entity/AOI/networking/threads/memory/security/deployment)
- *Million Online*: a classic on large-scale MMO architecture design
- *Game Programming Patterns*
- *Distributed Systems: Concepts and Design* (Coulouris et al.)

---

## 7. HTTP Server in Depth: Production-Grade Architecture Design

### Microservice Decomposition Strategy

When the game grows, a monolithic HTTP Server hits its ceiling. At that point you need to split into microservices:

```text
┌──────────────────────────────────────────────────────┐
│                    API Gateway (Nginx)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 路由规则  │  │ 限流熔断  │  │ 鉴权校验  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└──────┬───────────────┬───────────────┬───────────────┘
       │               │               │
       ▼               ▼               ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ 登录服务  │  │ 游戏逻辑  │  │ 支付服务  │
│ (Go)     │  │ (Go)     │  │ (Go)     │
└──────────┘  └──────────┘  └──────────┘
       │               │               │
       ▼               ▼               ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Redis   │  │  MySQL   │  │  MQ      │
│ (缓存)   │  │ (持久化) │  │ (异步)   │
└──────────┘  └──────────┘  └──────────┘
```

**Principles of microservice decomposition**:

1. **Split by business domain**: login, battle, inventory, and social each become an independent service
2. **Split by change frequency**: frequently changing modules (such as the event system) deploy independently
3. **Split by team**: different teams own different services, reducing coordination cost

### Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/conf.d/game.conf
upstream login_servers {
    least_conn;  # 最少连接负载均衡
    server 10.0.0.1:8080 weight=3;
    server 10.0.0.2:8080 weight=2;
    server 10.0.0.3:8080 backup;  # 备用服务器
}

upstream game_servers {
    ip_hash;  # IP哈希，保证同一客户端路由到同一服务器
    server 10.0.1.1:8080;
    server 10.0.1.2:8080;
}

server {
    listen 443 ssl;
    server_name api.game.com;

    ssl_certificate /etc/ssl/game.crt;
    ssl_certificate_key /etc/ssl/game.key;

    # 登录接口
    location /api/login {
        proxy_pass http://login_servers;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    # 游戏接口
    location /api/game {
        proxy_pass http://game_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;  # WebSocket长连接
    }

    # 静态资源
    location /assets {
        alias /data/game/assets;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Rate Limiting and Circuit Breaking

```go
// 令牌桶限流器
type TokenBucket struct {
    tokens    chan struct{}
    fillRate  time.Duration
    mu        sync.Mutex
}

func NewTokenBucket(rate int, burst int) *TokenBucket {
    tb := &TokenBucket{
        tokens:   make(chan struct{}, burst),
        fillRate: time.Second / time.Duration(rate),
    }
    go tb.fill()
    return tb
}

func (tb *TokenBucket) fill() {
    ticker := time.NewTicker(tb.fillRate)
    for range ticker.C {
        select {
        case tb.tokens <- struct{}{}:
        default:
        }
    }
}

func (tb *TokenBucket) Allow() bool {
    select {
    case <-tb.tokens:
        return true
    default:
        return false
    }
}

// 熔断器
type CircuitBreaker struct {
    failures    int
    threshold   int
    resetTimeout time.Duration
    lastFailure time.Time
    state       string  // "closed", "open", "half-open"
    mu          sync.RWMutex
}

func (cb *CircuitBreaker) Allow() bool {
    cb.mu.RLock()
    defer cb.mu.RUnlock()

    if cb.state == "open" {
        if time.Since(cb.lastFailure) > cb.resetTimeout {
            cb.state = "half-open"
            return true
        }
        return false
    }
    return true
}

func (cb *CircuitBreaker) RecordSuccess() {
    cb.mu.Lock()
    defer cb.mu.Unlock()
    cb.failures = 0
    cb.state = "closed"
}

func (cb *CircuitBreaker) RecordFailure() {
    cb.mu.Lock()
    defer cb.mu.Unlock()
    cb.failures++
    cb.lastFailure = time.Now()
    if cb.failures >= cb.threshold {
        cb.state = "open"
    }
}
```

### Distributed Session Management

```go
// Redis 实现分布式 Session
type SessionManager struct {
    redis *redis.Client
    ttl   time.Duration
}

func NewSessionManager(redis *redis.Client, ttl time.Duration) *SessionManager {
    return &SessionManager{redis: redis, ttl: ttl}
}

func (sm *SessionManager) Create(playerID int64) (string, error) {
    sessionID := generateSessionID()
    data := map[string]interface{}{
        "player_id": playerID,
        "created_at": time.Now().Unix(),
        "last_active": time.Now().Unix(),
    }

    pipe := sm.redis.Pipeline()
    pipe.HSet("session:"+sessionID, data)
    pipe.Expire("session:"+sessionID, sm.ttl)
    pipe.SAdd("player_sessions:"+strconv.FormatInt(playerID, 10), sessionID)
    _, err := pipe.Exec()

    return sessionID, err
}

func (sm *SessionManager) Get(sessionID string) (map[string]string, error) {
    data, err := sm.redis.HGetAll("session:" + sessionID).Result()
    if err != nil || len(data) == 0 {
        return nil, fmt.Errorf("session not found")
    }

    // 续期
    sm.redis.Expire("session:"+sessionID, sm.ttl)

    // 更新最后活跃时间
    sm.redis.HSet("session:"+sessionID, "last_active", time.Now().Unix())

    return data, nil
}

func (sm *SessionManager) Destroy(sessionID string) error {
    // 获取关联的 playerID
    playerID, _ := sm.redis.HGet("session:"+sessionID, "player_id").Int64()

    pipe := sm.redis.Pipeline()
    pipe.Del("session:" + sessionID)
    if playerID > 0 {
        pipe.SRem("player_sessions:"+strconv.FormatInt(playerID, 10), sessionID)
    }
    _, err := pipe.Exec()
    return err
}
```

### Security Protection

**1. SQL injection protection**:

```go
// 错误做法：字符串拼接（参数注入查询结构，绝不可用）
func queryBad(playerName string) string {
    query := "SELECT * FROM players WHERE name = '" + playerName + "'"
    return query
}

// 推荐做法：参数化查询（占位符由驱动转义）
func queryGood(playerName string) {
    query := "SELECT * FROM players WHERE name = ?"
    db.Query(query, playerName)
}
```

**2. XSS protection**:

```go
func sanitizeInput(input string) string {
    // 转义HTML特殊字符
    replacer := strings.NewReplacer(
        "<", "&lt;",
        ">", "&gt;",
        "\"", "&quot;",
        "'", "&#x27;",
        "/", "&#x2F;",
    )
    return replacer.Replace(input)
}
```

**3. CSRF protection**:

```go
func csrfMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("X-CSRF-Token")
        if token == "" || token != getCSRFToken(r) {
            http.Error(w, "CSRF token invalid", 403)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

**4. Frequency limiting (anti-abuse)**:

```go
// 基于 IP 的频率限制
type IPRateLimiter struct {
    limiters map[string]*TokenBucket
    mu       sync.RWMutex
}

func (rl *IPRateLimiter) Allow(ip string) bool {
    rl.mu.RLock()
    limiter, exists := rl.limiters[ip]
    rl.mu.RUnlock()

    if !exists {
        rl.mu.Lock()
        limiter = NewTokenBucket(10, 20)  // 每秒10次，突发20次
        rl.limiters[ip] = limiter
        rl.mu.Unlock()
    }

    return limiter.Allow()
}

// 中间件
func rateLimitByIP(rl *IPRateLimiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ip := r.RemoteAddr
            if !rl.Allow(ip) {
                http.Error(w, "Rate limit exceeded", 429)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

### Monitoring and Alerting

```go
// Prometheus 指标
var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "path", "status"},
    )

    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )

    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)

// 监控中间件
func metricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        activeConnections.Inc()
        defer activeConnections.Dec()

        next.ServeHTTP(w, r)

        duration := time.Since(start).Seconds()
        httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, "200").Inc()
        httpRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
    })
}
```

### Testing Strategy

```go
// 单元测试
func TestLoginHandler(t *testing.T) {
    // 创建测试数据库
    db := setupTestDB(t)
    defer cleanupTestDB(db)

    // 创建请求
    body := `{"username":"test","password":"123456"}`
    req := httptest.NewRequest("POST", "/login", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")

    // 创建响应记录器
    w := httptest.NewRecorder()

    // 调用处理器
    loginHandler(w, req)

    // 验证结果
    if w.Code != http.StatusOK {
        t.Errorf("expected status 200, got %d", w.Code)
    }

    var response map[string]string
    json.Unmarshal(w.Body.Bytes(), &response)
    if response["token"] == "" {
        t.Error("expected token in response")
    }
}

// 压力测试
func BenchmarkLoginHandler(b *testing.B) {
    db := setupBenchmarkDB(b)
    defer cleanupBenchmarkDB(db)

    body := `{"username":"test","password":"123456"}`
    req := httptest.NewRequest("POST", "/login", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        w := httptest.NewRecorder()
        loginHandler(w, req)
    }
}
```


## 8. Netty in Depth: Production-Grade Game Server Architecture

### Codec Patterns in Detail

**1. Length-based codec (recommended)**:

```java
// 解码器：处理TCP粘包/拆包
public class GameDecoder extends MessageToMessageDecoder<ByteBuf> {
    private static final int MAX_FRAME_LENGTH = 65535;

    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        if (in.readableBytes() < 4) return;  // 等待长度字段

        in.markReaderIndex();
        int length = in.readInt();

        if (length > MAX_FRAME_LENGTH || length < 0) {
            ctx.close();  // 非法帧
            return;
        }

        if (in.readableBytes() < length) {
            in.resetReaderIndex();  // 数据不够，等待
            return;
        }

        byte[] data = new byte[length];
        in.readBytes(data);

        // 解析消息ID和消息体
        int msgId = Bytes.readInt(data, 0);
        byte[] body = Arrays.copyOfRange(data, 4, length);

        out.add(new GameMessage(msgId, body));
    }
}

// 编码器
public class GameEncoder extends MessageToMessageEncoder<GameMessage> {
    @Override
    protected void encode(ChannelHandlerContext ctx, GameMessage msg, List<Object> out) {
        ByteBuf buf = ctx.alloc().buffer();
        byte[] body = msg.getBody();
        buf.writeInt(4 + body.length);  // 长度 = 消息ID(4) + 消息体
        buf.writeInt(msg.getMsgId());
        buf.writeBytes(body);
        out.add(buf);
    }
}
```

**2. Protobuf codec**:

```java
public class ProtobufDecoder extends MessageToMessageDecoder<ByteBuf> {
    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        int msgId = in.readInt();
        int length = in.readInt();
        byte[] data = new byte[length];
        in.readBytes(data);

        // 根据消息ID选择对应的Protobuf消息类型
        Message.Builder builder = getMessageBuilder(msgId);
        if (builder != null) {
            builder.mergeFrom(data);
            out.add(new GameMessage(msgId, builder.build()));
        }
    }
}

private Message.Builder getMessageBuilder(int msgId) {
    switch (msgId) {
        case 1001: return PlayerMove.parser();
        case 1002: return PlayerAttack.parser();
        case 1003: return ChatMessage.parser();
        default: return null;
    }
}
```

### The EventLoop Model in Depth

Netty's EventLoop is the core of its high performance:

```java
// EventLoop 的工作流程
// 1. 一个 EventLoop 绑定一个线程
// 2. 该线程负责处理所有注册到这个 EventLoop 的 Channel 的 I/O 事件
// 3. 事件处理是单线程的，无需加锁

// 配置 EventLoop
EventLoopGroup bossGroup = new NioEventLoopGroup(1);  // 1个线程处理Accept
EventLoopGroup workerGroup = new NioEventLoopGroup(0); // 0表示使用默认值(CPU核心数*2)

// EventLoop 的任务队列
// 每个 EventLoop 有一个任务队列，可以提交异步任务
EventLoop loop = workerGroup.next();
loop.execute(() -> {
    // 在 EventLoop 线程中执行任务
    // 保证线程安全，无需加锁
});

// 定时任务
loop.schedule(() -> {
    // 延迟执行
}, 5, TimeUnit.SECONDS);

// 周期性任务
loop.scheduleAtFixedRate(() -> {
    // 每秒执行一次
}, 0, 1, TimeUnit.SECONDS);
```

### Zero-Copy Techniques in Detail

```java
// 1. FileRegion：文件传输零拷贝
File file = new File("game_resource.zip");
FileRegion region = new DefaultFileRegion(
    new FileInputStream(file).getChannel(), 0, file.length());
ctx.writeAndFlush(region);
// 内核直接将文件数据发送到网络，无需用户态拷贝

// 2. CompositeByteBuf：合并多个ByteBuf
CompositeByteBuf composite = ctx.alloc().compositeBuffer();
ByteBuf header = Unpooled.buffer(8);
ByteBuf body = Unpooled.wrappedBuffer(gameData);
composite.addComponent(true, header);  // true = 自动更新writerIndex
composite.addComponent(true, body);
ctx.writeAndFlush(composite);
// 无需拷贝header和body的数据

// 3. Slice：零拷贝切片
ByteBuf original = ctx.alloc().buffer(1024);
ByteBuf slice = original.slice(0, 100);  // 共享底层内存
// 修改slice会影响original
```

### Memory Leak Detection

```java
// Netty 提供了内存泄漏检测机制
// 在开发环境启用
ResourceLeakDetector.setLevel(ResourceLeakDetector.Level.PARANOID);

// 自定义泄漏检测
public class GameMessageHandler extends ChannelInboundHandlerAdapter {
    private ResourceLeakTracker<GameMessage> leak;

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        GameMessage gameMsg = (GameMessage) msg;
        leak = ResourceLeakDetector.track(gameMsg);

        try {
            // 处理消息
            processMessage(ctx, gameMsg);
        } finally {
            if (leak != null) {
                leak.close();  // 标记为已处理
            }
        }
    }
}
```

### Load Balancing Strategies

```java
// 客户端负载均衡
public class GameClient {
    private final List<ServerAddress> servers;
    private final LoadBalancer loadBalancer;

    public GameClient(List<ServerAddress> servers) {
        this.servers = servers;
        this.loadBalancer = new RoundRobinBalancer(servers);
    }

    public Channel connect() {
        ServerAddress server = loadBalancer.select();
        Bootstrap bootstrap = new Bootstrap();
        bootstrap.group(new NioEventLoopGroup())
            .channel(NioSocketChannel.class)
            .handler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) {
                    ch.pipeline().addLast(new GameDecoder());
                    ch.pipeline().addLast(new GameEncoder());
                    ch.pipeline().addLast(new GameClientHandler());
                }
            });

        return bootstrap.connect(server.getHost(), server.getPort()).sync().channel();
    }
}

// 轮询负载均衡
public class RoundRobinBalancer implements LoadBalancer {
    private final AtomicInteger index = new AtomicInteger(0);
    private final List<ServerAddress> servers;

    @Override
    public ServerAddress select() {
        int idx = index.getAndIncrement() % servers.size();
        return servers.get(Math.abs(idx));
    }
}

// 加权轮询负载均衡
public class WeightedRoundRobinBalancer implements LoadBalancer {
    private final List<WeightedServer> servers;
    private final AtomicInteger index = new AtomicInteger(0);

    @Override
    public ServerAddress select() {
        int totalWeight = servers.stream().mapToInt(WeightedServer::getWeight).sum();
        int idx = index.getAndIncrement() % totalWeight;

        int current = 0;
        for (WeightedServer server : servers) {
            current += server.getWeight();
            if (idx < current) {
                return server.getAddress();
            }
        }
        return servers.get(0).getAddress();
    }
}
```

### Connection Management and Timeout Control

```java
// 连接管理器
public class ConnectionManager {
    private final Map<Long, Channel> connections = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public void register(long playerId, Channel channel) {
        connections.put(playerId, channel);

        // 设置空闲检测
        channel.pipeline().addLast("idle", new IdleStateHandler(60, 30, 0));
        channel.pipeline().addLast("handler", new IdleConnectionHandler(this));
    }

    public void unregister(long playerId) {
        Channel channel = connections.remove(playerId);
        if (channel != null && channel.isActive()) {
            channel.close();
        }
    }

    public void sendToPlayer(long playerId, Object message) {
        Channel channel = connections.get(playerId);
        if (channel != null && channel.isActive()) {
            channel.writeAndFlush(message);
        }
    }

    // 心跳处理
    public class IdleConnectionHandler extends ChannelInboundHandlerAdapter {
        private final ConnectionManager manager;

        @Override
        public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
            if (evt instanceof IdleStateEvent) {
                IdleStateEvent event = (IdleStateEvent) evt;
                if (event.state() == IdleState.READER_IDLE) {
                    // 读空闲，关闭连接
                    long playerId = getPlayerId(ctx.channel());
                    manager.unregister(playerId);
                    ctx.close();
                } else if (event.state() == IdleState.WRITER_IDLE) {
                    // 写空闲，发送心跳
                    ctx.writeAndFlush(new HeartbeatMessage());
                }
            }
        }
    }
}
```

### Common Practices for the Thread Model

```java
// 业务逻辑线程池（避免阻塞Netty的IO线程）
ExecutorService businessPool = Executors.newFixedThreadPool(
    Runtime.getRuntime().availableProcessors() * 2);

// 在Handler中使用业务线程池
public class GameMessageHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        GameMessage gameMsg = (GameMessage) msg;

        // 提交到业务线程池处理
        businessPool.submit(() -> {
            try {
                Object response = processBusinessLogic(gameMsg);
                ctx.writeAndFlush(response);
            } catch (Exception e) {
                log.error("处理消息异常", e);
                ctx.writeAndFlush(new ErrorResponse(e.getMessage()));
            }
        });
    }
}

// 定时任务线程池
ScheduledExecutorService timerPool = Executors.newScheduledThreadPool(4);

// 游戏主循环（每秒执行一次）
timerPool.scheduleAtFixedRate(() -> {
    try {
        gameLoop.tick();
    } catch (Exception e) {
        log.error("游戏主循环异常", e);
    }
}, 0, 100, TimeUnit.MILLISECONDS);  // 100ms = 10 FPS
```

### Performance Monitoring and Tuning

```java
// Netty 内置的指标监控
ChannelPipeline pipeline = ch.pipeline();
pipeline.addLast("metrics", new ChannelTrafficHandler());

// 自定义性能监控
public class PerformanceMonitor extends ChannelInboundHandlerAdapter {
    private final AtomicLong messageCount = new AtomicLong(0);
    private final AtomicLong totalBytes = new AtomicLong(0);
    private final long startTime = System.currentTimeMillis();

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        messageCount.incrementAndGet();
        if (msg instanceof ByteBuf) {
            totalBytes.addAndGet(((ByteBuf) msg).readableBytes());
        }
        ctx.fireChannelRead(msg);
    }

    public void printStats() {
        long elapsed = System.currentTimeMillis() - startTime;
        double qps = messageCount.get() * 1000.0 / elapsed;
        double throughput = totalBytes.get() * 1000.0 / elapsed / 1024 / 1024;
        log.info("QPS: {:.2f}, 吞吐量: {:.2f} MB/s", qps, throughput);
    }
}
```


## 9. Skynet in Depth: Production-Grade Game Server Architecture

### A Complete MMO Server Architecture Design

Taking a typical MMO game as an example, here is how Skynet can be used to build a complete, scalable server-side architecture:

```text
┌──────────────────────────────────────────────────────────┐
│                    Skynet 集群架构                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              节点1: 网关服务器                      │    │
│  │  ┌──────┐ ┌────────┐ ┌───────┐ ┌───────┐        │    │
│  │  │ gate │→│watchdog│→│ login │→│auth   │        │    │
│  │  └──────┘ └────────┘ └───────┘ └───────┘        │    │
│  └──────────────────────────────────────────────────┘    │
│                         |                                │
│                    Cluster TCP                           │
│                         |                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │              节点2: 世界服务器                      │    │
│  │  ┌───────┐ ┌────────┐ ┌───────┐ ┌───────┐       │    │
│  │  │ world │ │ battle │ │ aoi   │ │ npc   │       │    │
│  │  └───────┘ └────────┘ └───────┘ └───────┘       │    │
│  └──────────────────────────────────────────────────┘    │
│                         |                                │
│                    Cluster TCP                           │
│                         |                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │              节点3: 社交服务器                      │    │
│  │  ┌──────┐ ┌───────┐ ┌──────┐ ┌─────────┐        │    │
│  │  │ chat │ │ guild │ │ mail │ │ friend  │        │    │
│  │  └──────┘ └───────┘ └──────┘ └─────────┘        │    │
│  └──────────────────────────────────────────────────┘    │
│                         |                                │
│                    Cluster TCP                           │
│                         |                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │              节点4: 数据服务器                      │    │
│  │  ┌─────┐ ┌───────┐ ┌───────┐ ┌─────────┐        │    │
│  │  │ db  │ │ cache │ │ queue │ │ log     │        │    │
│  │  └─────┘ └───────┘ └───────┘ └─────────┘        │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Gate Service (Network Layer): Complete Implementation

```lua
-- gate.lua：监听端口，接受连接，分发到 watchdog
local skynet = require "skynet"
local socket = require "skynet.socket"
require "skynet.manager"

local gate = {}
local listen_fd = nil
local connection_count = 0
local max_connections = 10000

function gate.start(conf)
    -- 1. 启动网络监听
    listen_fd = skynet.socket.listen(conf.host, conf.port)
    skynet.error(string.format("Gate 监听 %s:%d", conf.host, conf.port))

    -- 2. 启动监控协程
    skynet.fork(monitor_connections)

    -- 3. 接受连接循环
    while true do
        local fd, addr = skynet.socket.accept(listen_fd)
        if fd then
            if connection_count >= max_connections then
                skynet.error("连接数已满，拒绝新连接: " .. addr)
                socket.close(fd)
            else
                connection_count = connection_count + 1
                skynet.fork(function()
                    handle_connection(fd, addr)
                end)
            end
        end
    end
end

function handle_connection(fd, addr)
    -- 设置连接超时
    socket.timeout(fd, 10)  -- 10秒内需要完成握手

    -- 等待客户端发送握手消息
    local ok, msg = pcall(socket.read, fd)
    if not ok or not msg then
        socket.close(fd)
        connection_count = connection_count - 1
        return
    end

    -- 解析握手消息
    local token = parse_handshake(msg)
    if not token then
        socket.write(fd, "handshake_fail")
        socket.close(fd)
        connection_count = connection_count - 1
        return
    end

    -- 验证 token
    local result = skynet.call("auth_service", "lua", "verify_token", token)
    if not result then
        socket.write(fd, "auth_fail")
        socket.close(fd)
        connection_count = connection_count - 1
        return
    end

    -- 创建 watchdog 服务
    local watchdog = skynet.newservice("watchdog")
    skynet.call(watchdog, "lua", "start", {
        gate = skynet.self(),
        fd = fd,
        address = addr,
        player_id = result.player_id,
    })

    socket.write(fd, "handshake_ok")
end

function monitor_connections()
    while true do
        skynet.error(string.format("当前连接数: %d", connection_count))
        skynet.sleep(6000)  -- 每60秒打印一次
    end
end

return gate
```

### Watchdog Service (Connection Management): Complete Implementation

```lua
-- watchdog.lua：管理单个玩家连接
local skynet = require "skynet"
local socket = require "skynet.socket"

local watchdog = {}
local fd = nil
local player_id = nil
local heartbeat_timer = nil

function watchdog.start(conf)
    fd = conf.fd
    player_id = conf.player_id

    -- 设置心跳检测
    start_heartbeat(fd)

    -- 注册到玩家管理服务
    skynet.call("player_manager", "lua", "register", player_id, skynet.self())

    -- 读取消息循环
    while true do
        local ok, msg = pcall(socket.read, fd)
        if not ok then
            -- 连接断开
            handle_disconnect()
            return
        end

        -- 解析消息
        local ok, parsed = pcall(parse_message, msg)
        if not ok then
            skynet.error("消息解析失败: " .. tostring(msg))
            socket.write(fd, "error:invalid_message")
        else
            -- 路由到对应的服务
            route_message(parsed)
        end
    end
end

function start_heartbeat(fd)
    -- 服务端心跳：每30秒发送心跳包
    heartbeat_timer = skynet.fork(function()
        while true do
            skynet.sleep(3000)  -- 30秒
            local ok = pcall(socket.write, fd, "heartbeat")
            if not ok then
                break  -- 连接已断开
            end
        end
    end)
end

function handle_disconnect()
    -- 取消心跳定时器
    if heartbeat_timer then
        skynet.kill(heartbeat_timer)
    end

    -- 通知玩家管理服务
    if player_id then
        skynet.send("player_manager", "lua", "unregister", player_id)
        skynet.send("player_service", "lua", "on_logout", player_id)
    end

    -- 关闭连接
    socket.close(fd)
    connection_count = connection_count - 1

    -- 销毁 watchdog 服务
    skynet.exit()
end

function route_message(msg)
    local cmd = msg.cmd
    if cmd == "move" then
        skynet.send("world_service", "lua", "on_move", player_id, msg.data)
    elseif cmd == "attack" then
        skynet.send("battle_service", "lua", "on_attack", player_id, msg.data)
    elseif cmd == "chat" then
        skynet.send("chat_service", "lua", "on_chat", player_id, msg.data)
    elseif cmd == "bag" then
        skynet.send("bag_service", "lua", "on_bag_op", player_id, msg.data)
    else
        socket.write(fd, "error:unknown_command")
    end
end

return watchdog
```

### World Service (World Management + AOI): Complete Implementation

```lua
-- world.lua：管理游戏世界和 AOI
local skynet = require "skynet"

local world = {}
local players = {}      -- player_id -> {x, y, scene_id, service}
local scenes = {}       -- scene_id -> {grids={}, width, height}
local GRID_SIZE = 100   -- 网格大小

-- 初始化场景
function world.init_scene(scene_id, width, height)
    scenes[scene_id] = {
        width = width,
        height = height,
        grids = {},
    }
end

-- 玩家进入场景
function world.enter_scene(player_id, scene_id, x, y)
    players[player_id] = {
        x = x,
        y = y,
        scene_id = scene_id,
        service = skynet.call("player_manager", "lua", "get_service", player_id),
    }

    -- 添加到网格索引
    local grid_x, grid_y = world.get_grid(x, y)
    local grid_key = string.format("%d_%d", grid_x, grid_y)
    if not scenes[scene_id].grids[grid_key] then
        scenes[scene_id].grids[grid_key] = {}
    end
    table.insert(scenes[scene_id].grids[grid_key], player_id)

    -- 通知视野内的玩家
    local nearby = world.get_nearby_players(scene_id, x, y, 500)
    for _, pid in ipairs(nearby) do
        if pid ~= player_id then
            skynet.send(players[pid].service, "lua", "player_enter_view",
                player_id, players[player_id])
        end
    end

    -- 通知新玩家视野内的实体
    for _, pid in ipairs(nearby) do
        skynet.send(players[player_id].service, "lua", "player_enter_view",
            pid, players[pid])
    end
end

-- 玩家移动
function world.on_move(player_id, msg)
    local x, y = msg.x, msg.y
    local old = players[player_id]
    if not old then return end

    local old_grid_x, old_grid_y = world.get_grid(old.x, old.y)
    local new_grid_x, new_grid_y = world.get_grid(x, y)

    -- 更新位置
    players[player_id].x = x
    players[player_id].y = y

    -- 更新网格索引（如果跨越网格）
    if old_grid_x ~= new_grid_x or old_grid_y ~= new_grid_y then
        world.update_grid_index(player_id, old.scene_id,
            old_grid_x, old_grid_y, new_grid_x, new_grid_y)
    end

    -- 计算视野变化
    local old_nearby = world.get_nearby_players(old.scene_id, old.x, old.y, 500)
    local new_nearby = world.get_nearby_players(old.scene_id, x, y, 500)

    -- 通知新进入视野的玩家
    local entered = set_difference(new_nearby, old_nearby)
    for _, pid in ipairs(entered) do
        skynet.send(players[pid].service, "lua", "player_enter_view",
            player_id, players[player_id])
        skynet.send(players[player_id].service, "lua", "player_enter_view",
            pid, players[pid])
    end

    -- 通知离开视野的玩家
    local left = set_difference(old_nearby, new_nearby)
    for _, pid in ipairs(left) do
        skynet.send(players[pid].service, "lua", "player_leave_view", player_id)
        skynet.send(players[player_id].service, "lua", "player_leave_view", pid)
    end

    -- 广播移动消息给视野内的玩家
    for _, pid in ipairs(new_nearby) do
        if pid ~= player_id then
            skynet.send(players[pid].service, "lua", "player_moved",
                player_id, x, y)
        end
    end
end

-- 获取网格坐标
function world.get_grid(x, y)
    return math.floor(x / GRID_SIZE), math.floor(y / GRID_SIZE)
end

-- 获取附近玩家
function world.get_nearby_players(scene_id, x, y, radius)
    local grid_x, grid_y = world.get_grid(x, y)
    local result = {}
    local scene = scenes[scene_id]
    if not scene then return result end

    for dx = -1, 1 do
        for dy = -1, 1 do
            local grid_key = string.format("%d_%d", grid_x + dx, grid_y + dy)
            local grid_players = scene.grids[grid_key] or {}
            for _, pid in ipairs(grid_players) do
                local p = players[pid]
                if p and p.scene_id == scene_id then
                    local dist = math.sqrt((p.x - x)^2 + (p.y - y)^2)
                    if dist <= radius then
                        table.insert(result, pid)
                    end
                end
            end
        end
    end

    return result
end

-- 更新网格索引
function world.update_grid_index(player_id, scene_id, old_gx, old_gy, new_gx, new_gy)
    local scene = scenes[scene_id]
    local old_key = string.format("%d_%d", old_gx, old_gy)
    local new_key = string.format("%d_%d", new_gx, new_gy)

    -- 从旧网格移除
    if scene.grids[old_key] then
        for i, pid in ipairs(scene.grids[old_key]) do
            if pid == player_id then
                table.remove(scene.grids[old_key], i)
                break
            end
        end
    end

    -- 添加到新网格
    if not scene.grids[new_key] then
        scene.grids[new_key] = {}
    end
    table.insert(scene.grids[new_key], player_id)
end

return world
```

### DB Service (Database Operations): Complete Implementation

```lua
-- db.lua：异步数据库操作
local skynet = require "skynet"
local mysql = require "skynet.mysql"

local db = {}
local connection = nil

function db.start(conf)
    -- 建立数据库连接
    connection = mysql.connect({
        host = conf.host,
        port = conf.port,
        database = conf.database,
        user = conf.username,
        password = conf.password,
        charset = "utf8mb4",
    })
    skynet.error("数据库连接成功")
end

-- 查询玩家数据
function CMD.query_player(player_id)
    local result = connection:query(string.format(
        "SELECT * FROM players WHERE id = %d", player_id))
    if result and #result > 0 then
        return result[1]
    end
    return nil
end

-- 保存玩家数据
function CMD.save_player(player_id, data)
    local sql = string.format(
        "UPDATE players SET hp=%d, mp=%d, level=%d, gold=%d WHERE id=%d",
        data.hp, data.mp, data.level, data.gold, player_id)
    connection:query(sql)
    return true
end

-- 批量保存
function CMD.save_batch(operations)
    connection:query("BEGIN")
    for _, op in ipairs(operations) do
        connection:query(op.sql)
    end
    connection:query("COMMIT")
    return true
end

-- 查询背包
function CMD.query_inventory(player_id)
    local result = connection:query(string.format(
        "SELECT * FROM inventory WHERE player_id = %d", player_id))
    return result or {}
end

-- 添加物品
function CMD.add_item(player_id, item_id, count)
    local sql = string.format(
        "INSERT INTO inventory (player_id, item_id, count) VALUES (%d, %d, %d) "
        .. "ON DUPLICATE KEY UPDATE count = count + %d",
        player_id, item_id, count, count)
    connection:query(sql)
    return true
end

return db
```

### Common Practices for Hot Updates

```lua
-- 热更新管理器
local hot_update = {}
local update_log = {}

-- 版本化的热更新
function hot_update.update_with_version(service_name, new_code_file, version)
    -- 1. 记录更新日志
    table.insert(update_log, {
        service = service_name,
        version = version,
        time = os.time(),
        file = new_code_file,
    })

    -- 2. 加载新代码
    local ok, new_module = pcall(dofile, new_code_file)
    if not ok then
        skynet.error("热更新失败: " .. tostring(new_module))
        return false
    end

    -- 3. 备份旧的 CMD 表
    local old_cmd = {}
    for k, v in pairs(CMD) do
        old_cmd[k] = v
    end

    -- 4. 应用新代码
    for k, v in pairs(new_module) do
        CMD[k] = v
    end

    -- 5. 验证新代码
    if new_module.init then
        local ok, err = pcall(new_module.init)
        if not ok then
            -- 回滚
            CMD = old_cmd
            skynet.error("热更新验证失败，已回滚: " .. tostring(err))
            return false
        end
    end

    skynet.error(string.format("热更新成功: %s v%s", service_name, version))
    return true
end

-- 安全的热更新（带回滚）
function hot_update.safe_update(service_name, new_code_file)
    -- 1. 加载新代码
    local ok, new_module = pcall(dofile, new_code_file)
    if not ok then
        return false, "加载新代码失败"
    end

    -- 2. 保存当前状态
    local old_state = {}
    for k, v in pairs(CMD) do
        old_state[k] = v
    end

    -- 3. 尝试应用
    for k, v in pairs(new_module) do
        CMD[k] = v
    end

    -- 4. 如果有 init 函数，执行它
    if new_module.init then
        local ok, err = pcall(new_module.init)
        if not ok then
            -- 回滚
            for k, v in pairs(old_state) do
                CMD[k] = v
            end
            return false, "init 执行失败: " .. tostring(err)
        end
    end

    return true, "success"
end

return hot_update
```

### Performance Monitoring and Tuning

```lua
-- 性能监控服务
local monitor = {}
local stats = {
    messages_per_second = 0,
    avg_response_time = 0,
    memory_usage = 0,
    service_count = 0,
}

-- 监控协程
function monitor.start()
    skynet.fork(function()
        while true do
            -- 收集统计信息
            stats.memory_usage = collectgarbage("count")
            stats.service_count = get_service_count()

            -- 打印统计信息
            skynet.error(string.format(
                "性能统计 - 内存: %.2f MB, 服务数: %d",
                stats.memory_usage / 1024,
                stats.service_count
            ))

            -- 重置计数器
            stats.messages_per_second = 0

            skynet.sleep(10000)  -- 每10秒统计一次
        end
    end)
end

-- 消息计数器
function monitor.count_message()
    stats.messages_per_second = stats.messages_per_second + 1
end

-- 响应时间记录
function monitor.record_response_time(time_ms)
    stats.avg_response_time = (stats.avg_response_time + time_ms) / 2
end

return monitor
```


## 10. Pitaya in Depth: Production-Grade Game Server Architecture

### A Complete MMO Server Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    Pitaya 集群架构                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Frontend (网关服务器)                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │ TCP      │  │ WebSocket│  │ UDP      │       │    │
│  │  │ Listener │  │ Listener │  │ Listener │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │ Player   │  │ Session  │  │ Router   │       │    │
│  │  │ Agent    │  │ Manager  │  │          │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘       │    │
│  └──────────────────────────────────────────────────┘    │
│                         |                                │
│                    NATS 消息总线                          │
│                         |                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Backend (逻辑服务器)                   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │ Game     │  │ Battle   │  │ Chat     │       │    │
│  │  │ Server   │  │ Server   │  │ Server   │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │ Guild    │  │ Mail     │  │ Rank     │       │    │
│  │  │ Server   │  │ Server   │  │ Server   │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘       │    │
│  └──────────────────────────────────────────────────┘    │
│                         |                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Infrastructure                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │  etcd    │  │  NATS    │  │  Redis   │       │    │
│  │  │(服务发现)│  │(消息总线)│  │ (缓存)   │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘       │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Handler vs Remote: Differences and Use Cases

**Handler**: handles requests from clients (routed through the Frontend).

```go
// Handler 命名规则：func (c *Component) Method(ctx, msg) (*Response, error)
// Handler 调用方式：客户端 -> Frontend -> Backend

type PlayerHandler struct {
    base.Component
}

// 客户端调用：player.player.move
func (h *PlayerHandler) Move(ctx context.Context, msg *pb.MoveRequest) (*pb.MoveResponse, error) {
    session := h.GetSession()
    playerID := session.UID()

    // 获取玩家组件
    playerComp := h.getEntityComponent(playerID)
    if playerComp == nil {
        return nil, fmt.Errorf("player not found")
    }

    // 执行移动逻辑
    err := playerComp.Move(msg.X, msg.Y, msg.Z)
    if err != nil {
        return nil, err
    }

    return &pb.MoveResponse{Success: true}, nil
}
```

**Remote**: handles calls from other services (through NATS RPC).

```go
// Remote 命名规则：func (c *Component) RemoteMethod(ctx, msg) (*Response, error)
// Remote 调用方式：Backend -> NATS -> Backend

type PlayerRemote struct {
    base.Component
}

// 其他服务调用：player.player.getInfo
func (r *PlayerRemote) GetInfo(ctx context.Context, msg *pb.GetInfoRequest) (*pb.PlayerInfo, error) {
    playerID := msg.PlayerId

    // 从数据库获取玩家信息
    player, err := r.getPlayerFromDB(playerID)
    if err != nil {
        return nil, err
    }

    return &pb.PlayerInfo{
        PlayerId: player.ID,
        Name:     player.Name,
        Level:    player.Level,
        Hp:       player.HP,
        Mp:       player.MP,
    }, nil
}
```

**Use-case comparison**:

| Scenario | Handler | Remote |
|------|---------|--------|
| Client movement request | Yes | No |
| Client attack request | Yes | No |
| Get player info (cross-service) | No | Yes |
| Broadcast chat messages (cross-service) | No | Yes |
| Guild operations (cross-service) | No | Yes |

### Routing Strategies in Detail

```go
// 路由策略：决定消息发送到哪个服务器实例
func setupRoutes(app *pitaya.App) {
    // 1. 广播路由：发送到所有匹配的服务器
    app.AddRoute("game", func(server pitaya.Server, msg *pitaya.Message,
        lastRoute string, payload interface{}) (string, error) {
        return "game", nil  // 所有 game 前缀的消息路由到 game 服务器
    })

    // 2. 精确路由：发送到特定服务器
    app.AddRoute("game", func(server pitaya.Server, msg *pitaya.Message,
        lastRoute string, payload interface{}) (string, error) {
        // 根据玩家ID路由到特定服务器
        var req pb.MoveRequest
        proto.Unmarshal(msg.GetPayload(), &req)

        // 使用一致性哈希，保证同一玩家总是路由到同一服务器
        serverID := consistentHash.Get(req.PlayerId)
        return "game." + serverID, nil
    })

    // 3. 场景路由：根据场景ID路由
    app.AddRoute("game", func(server pitaya.Server, msg *pitaya.Message,
        lastRoute string, payload interface{}) (string, error) {
        var req pb.SceneMessage
        proto.Unmarshal(msg.GetPayload(), &req)

        // 根据场景ID路由
        sceneID := req.SceneId
        serverID := sceneServerMap[sceneID]
        return "game." + serverID, nil
    })
}
```

### A Complete Game Server Example

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/topfreegames/pitaya"
    "github.com/topfreegames/pitaya/config"
    "github.com/topfreegames/pitaya/remote"
)

// 玩家组件
type PlayerComponent struct {
    base.Component
    PlayerID   int64
    Name       string
    Level      int
    HP         int
    MP         int
    Position   Position
    Scene      string
    Items      []Item
    Skills     []Skill
}

type Position struct {
    X, Y, Z float64
}

type Item struct {
    ID    int32
    Count int32
}

type Skill struct {
    ID       int32
    Level    int32
    Cooldown int64
}

// 初始化
func (p *PlayerComponent) Init() {
    p.Level = 1
    p.HP = 100
    p.MP = 50
    log.Printf("玩家组件初始化: %d", p.PlayerID)
}

// 销毁
func (p *PlayerComponent) Shutdown() {
    p.saveToDB()
    log.Printf("玩家组件销毁: %d", p.PlayerID)
}

// 移动
func (p *PlayerComponent) Move(ctx context.Context, msg *pb.MoveRequest) (*pb.MoveResponse, error) {
    // 验证移动合法性
    if !p.validateMove(msg.X, msg.Y, msg.Z) {
        return &pb.MoveResponse{Success: false, Error: "invalid move"}, nil
    }

    // 更新位置
    oldPos := p.Position
    p.Position = Position{X: msg.X, Y: msg.Y, Z: msg.Z}

    // 更新 AOI
    p.updateAOI(oldPos, p.Position)

    // 广播移动消息
    p.broadcastToScene("PlayerMoved", &pb.PlayerMoved{
        PlayerId: p.PlayerID,
        X: msg.X, Y: msg.Y, Z: msg.Z,
    })

    return &pb.MoveResponse{Success: true, X: msg.X, Y: msg.Y, Z: msg.Z}, nil
}

// 攻击
func (p *PlayerComponent) Attack(ctx context.Context, msg *pb.AttackRequest) (*pb.AttackResponse, error) {
    // 验证攻击合法性
    if !p.canAttack(msg.SkillId) {
        return &pb.AttackResponse{Success: false, Error: "cannot attack"}, nil
    }

    // 计算伤害（服务端权威）
    damage := p.calculateDamage(msg.TargetId, msg.SkillId)

    // 应用伤害
    p.applyDamage(msg.TargetId, damage)

    // 扣除蓝量
    p.MP -= p.getSkillCost(msg.SkillId)

    // 广播攻击动画
    p.broadcastToScene("PlayerAttacked", &pb.PlayerAttacked{
        AttackerId: p.PlayerID,
        TargetId:   msg.TargetId,
        SkillId:    msg.SkillId,
        Damage:     damage,
    })

    return &pb.AttackResponse{Success: true, Damage: damage}, nil
}

// 使用物品
func (p *PlayerComponent) UseItem(ctx context.Context, msg *pb.UseItemRequest) (*pb.UseItemResponse, error) {
    // 查找物品
    item := p.findItem(msg.ItemId)
    if item == nil {
        return &pb.UseItemResponse{Success: false, Error: "item not found"}, nil
    }

    // 应用物品效果
    effect := getItemEffect(item.ID)
    switch effect.Type {
    case "heal":
        p.HP = min(p.HP+effect.Value, p.getMaxHP())
    case "mana":
        p.MP = min(p.MP+effect.Value, p.getMaxMP())
    case "buff":
        p.applyBuff(effect.BuffID, effect.Duration)
    }

    // 扣除物品
    p.removeItem(msg.ItemId, 1)

    return &pb.UseItemResponse{Success: true}, nil
}

// 获取玩家信息（供其他服务调用）
func (p *PlayerComponent) GetInfo(ctx context.Context, msg *pb.GetInfoRequest) (*pb.PlayerInfo, error) {
    return &pb.PlayerInfo{
        PlayerId: p.PlayerID,
        Name:     p.Name,
        Level:    p.Level,
        Hp:       p.HP,
        Mp:       p.MP,
        Position: &pb.Position{
            X: float32(p.Position.X),
            Y: float32(p.Position.Y),
            Z: float32(p.Position.Z),
        },
    }, nil
}

// 断开连接
func (p *PlayerComponent) OnDisconnected(ctx context.Context) {
    // 保存数据
    p.saveToDB()

    // 从场景移除
    p.leaveScene()

    // 通知其他玩家
    p.broadcastToScene("PlayerOffline", &pb.PlayerOffline{
        PlayerId: p.PlayerID,
    })
}

func main() {
    // 配置
    cfg := config.NewDefaultConfig()
    cfg.Discovery.Type = "etcd"
    cfg.Discovery.Etcd.Endpoints = []string{"10.0.0.1:2379"}
    cfg.Nats.URL = "nats://10.0.0.1:4222"

    // 创建 Pitaya 实例
    app := pitaya.New(cfg)
    app.ConfigureServer("game", "1", map[string]string{
        "region": "asia",
    })

    // 注册组件
    app.Register("player", &PlayerComponent{}, pitaya.WithComponentTags("game"))
    app.Register("battle", &BattleComponent{}, pitaya.WithComponentTags("game"))
    app.Register("chat", &ChatComponent{}, pitaya.WithComponentTags("social"))

    // 路由
    app.AddRoute("game", func(server pitaya.Server, msg *pitaya.Message,
        lastRoute string, payload interface{}) (string, error) {
        return "game", nil
    })

    // 启动
    app.Start()
}
```

### Session Persistence and Reconnection

```go
// Session 持久化
func (p *PlayerComponent) persistSession() error {
    session := p.GetSession()
    data := map[string]interface{}{
        "uid":       session.UID(),
        "server_id": session.ServerID(),
        "data":      session.GetData(),
        "timestamp": time.Now().Unix(),
    }

    // 保存到 Redis
    return redis.HSet("session:"+session.ID(), data).Err()
}

// 断线重连
func (p *PlayerComponent) OnReconnect(ctx context.Context) error {
    session := p.GetSession()
    oldSessionID := session.Get("old_session_id")

    if oldSessionID != nil {
        // 恢复旧 Session 的数据
        oldData, err := redis.HGetAll("session:" + oldSessionID.(string)).Result()
        if err == nil && len(oldData) > 0 {
            // 恢复玩家状态
            p.restoreState(oldData)
        }
    }

    // 重新加入场景
    p.joinScene(p.Scene)

    // 通知其他玩家
    p.broadcastToScene("PlayerReconnected", &pb.PlayerReconnected{
        PlayerId: p.PlayerID,
    })

    return nil
}
```

### Performance Optimization

```go
// 1. 消息批处理
func (p *PlayerComponent) batchBroadcast(scene string, messages []*pb.Message) {
    // 合并多个消息为一个包
    batch := &pb.BatchMessage{
        Messages: messages,
    }
    data, _ := proto.Marshal(batch)

    // 一次性发送
    players := getScenePlayers(scene)
    for _, player := range players {
        player.Session.Send(data)
    }
}

// 2. 对象池复用
var messagePool = sync.Pool{
    New: func() interface{} {
        return &pb.GameMessage{}
    },
}

func (p *PlayerComponent) sendMessage(msgType string, data interface{}) {
    msg := messagePool.Get().(*pb.GameMessage)
    defer messagePool.Put(msg)

    msg.Type = msgType
    msg.Data = data

    p.GetSession().Send(msg)
}

// 3. 异步处理耗时操作
func (p *PlayerComponent) handleExpensiveOperation(data interface{}) {
    // 使用 goroutine 处理耗时操作
    go func() {
        result := expensiveComputation(data)
        // 发送结果
        p.GetSession().Send(result)
    }()
}
```


## 11. KBEngine in Depth: Production-Grade MMO Deployment

### A Complete MMO Deployment Topology

```text
+----------------------------------------------------------+
|                    生产环境部署拓扑                         |
|                                                          |
|  ┌──────────────────────────────────────────────────┐    |
|  │              负载均衡层 (Nginx/LVS)                │    |
|  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    |
|  │  │ Nginx-1  │  │ Nginx-2  │  │ Nginx-3  │       │    |
|  │  └──────────┘  └──────────┘  └──────────┘       │    |
|  └──────────────────────────────────────────────────┘    |
|                         |                                |
|  ┌──────────────────────────────────────────────────┐    |
|  │              Loginapp 集群 (3个实例)               │    |
|  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    |
|  │  │ Login-1  │  │ Login-2  │  │ Login-3  │       │    |
|  │  │ 10.0.1.1 │  │ 10.0.1.2 │  │ 10.0.1.3 │       │    |
|  │  └──────────┘  └──────────┘  └──────────┘       │    |
|  └──────────────────────────────────────────────────┘    |
|                         |                                |
|  ┌──────────────────────────────────────────────────┐    |
|  │              Baseapp 集群 (6个实例)                │    |
|  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    |
|  │  │ Base-1   │  │ Base-2   │  │ Base-3   │       │    |
|  │  │ 10.0.2.1 │  │ 10.0.2.2 │  │ 10.0.2.3 │       │    |
|  │  └──────────┘  └──────────┘  └──────────┘       │    |
|  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    |
|  │  │ Base-4   │  │ Base-5   │  │ Base-6   │       │    |
|  │  │ 10.0.2.4 │  │ 10.0.2.5 │  │ 10.0.2.6 │       │    |
|  │  └──────────┘  └──────────┘  └──────────┘       │    |
|  └──────────────────────────────────────────────────┘    |
|                         |                                |
|  ┌──────────────────────────────────────────────────┐    |
|  │              Cellapp 集群 (10个实例)               │    |
|  │  每个实例处理 2-3 个场景，每个场景最大 500 人       │    |
|  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    |
|  │  │ Cell-1   │  │ Cell-2   │  │ Cell-3   │       │    |
|  │  │ 场景1,2  │  │ 场景3,4  │  │ 场景5,6  │       │    |
|  │  └──────────┘  └──────────┘  └──────────┘       │    |
|  │  ... 共10个实例                                  │    |
|  └──────────────────────────────────────────────────┘    |
|                         |                                |
|  ┌──────────────────────────────────────────────────┐    |
|  │              DBApp 集群 (3个实例)                  │    |
|  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    |
|  │  │ DB-1     │  │ DB-2     │  │ DB-3     │       │    |
|  │  │ MySQL主  │  │ MySQL从1 │  │ MySQL从2 │       │    |
|  │  └──────────┘  └──────────┘  └──────────┘       │    |
|  └──────────────────────────────────────────────────┘    |
+----------------------------------------------------------+
```

### Configuration Files in Detail

```xml
<!-- kbengine.xml -->
<root>
    <!-- 数据库配置 -->
    <db>
        <host>127.0.0.1</host>
        <port>3306</port>
        <username>kbengine</username>
        <password>password</password>
        <database>kbengine</database>
        <maxConnections>200</maxConnections>
    </db>

    <!-- Loginapp 配置 -->
    <loginapp>
        <host>0.0.0.0</host>
        <port>20013</port>
        <backlog>128</backlog>
    </loginapp>

    <!-- Baseapp 配置 -->
    <baseapp>
        <host>0.0.0.0</host>
        <port>20014</port>
        <backlog>128</backlog>
        <maxConnections>10000</maxConnections>
        <heartbeatTick>60</heartbeatTick>
    </baseapp>

    <!-- Cellapp 配置 -->
    <cellapp>
        <host>0.0.0.0</host>
        <port>20015</port>
        <backlog>128</backlog>
        <maxEntitiesPerCellapp>5000</maxEntitiesPerCellapp>
    </cellapp>

    <!-- DBApp 配置 -->
    <dbapp>
        <host>0.0.0.0</host>
        <port>20016</port>
        <backlog>128</backlog>
    </dbapp>

    <!-- 集群配置 -->
    <cluster>
        <primary dbapp>127.0.0.1:20016</primary>
        <loginapp>127.0.0.1:20013</loginapp>
        <baseapp>127.0.0.1:20014</baseapp>
        <cellapp>127.0.0.1:20015</cellapp>
    </cluster>
</root>
```

### AOI Optimization Configuration

```python
# AOI 配置优化
aoi_config = {
    # 九宫格 AOI 参数
    "grid_size": 100,           # 网格大小（米）
    "view_radius": 500,         # 视野半径（米）
    "update_interval": 0.1,     # 更新间隔（秒）

    # 跳表 AOI 参数（大世界场景）
    "use_skiplist": True,       # 使用跳表 AOI
    "skplist_update_threshold": 10,  # 跳表更新阈值

    # LOD（Level of Detail）参数
    "lod_enabled": True,        # 启用 LOD
    "lod_distances": {          # 不同 LOD 级别的距离
        "high": 200,            # 高精度：200米内
        "medium": 500,          # 中精度：200-500米
        "low": 1000,            # 低精度：500-1000米
    },

    # 同步频率优化
    "sync_frequencies": {       # 不同类型实体的同步频率
        "player": 0.1,          # 玩家：每0.1秒同步一次
        "npc": 0.5,             # NPC：每0.5秒同步一次
        "monster": 0.2,         # 怪物：每0.2秒同步一次
    },
}
```

### Database Optimization

```sql
# 数据库表结构优化
CREATE TABLE players (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_name VARCHAR(64) UNIQUE NOT NULL,
    player_name VARCHAR(32) NOT NULL,
    level INT DEFAULT 1,
    hp INT DEFAULT 100,
    mp INT DEFAULT 50,
    gold BIGINT DEFAULT 0,
    diamond INT DEFAULT 0,
    exp BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account (account_name),
    INDEX idx_level (level),
    INDEX idx_last_login (last_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_id BIGINT NOT NULL,
    item_id INT NOT NULL,
    count INT DEFAULT 1,
    slot INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player (player_id),
    INDEX idx_item (item_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 分库分表策略
-- 根据 player_id % 16 分到 16 个数据库
-- 每个数据库中的表根据 player_id % 1024 分表
```

### Performance Tuning in Practice

```python
# 1. Cellapp 性能优化
# 减少不必要的属性同步
class Player(KBEngine.Entity):
    # 只同步需要的属性
    PROXIMITY_OPTIMIZE = True  # 启用 AOI 优化

    def __init__(self):
        KBEngine.Entity.__init__(self)
        self.hp = 100      # 需要同步
        self.mp = 50       # 需要同步
        self.tempData = {}  # 不需要同步

    def onMove(self, x, y, z):
        # 只在跨越网格边界时更新 AOI
        if self.crossedGridBoundary(x, y, z):
            self.updateAOI()

# 2. 数据库性能优化
# 批量保存
def saveAllPlayers():
    players = getOnlinePlayers()
    for player in players:
        player.writeToDB()  # 异步保存

# 使用 Redis 缓存热数据
import redis
r = redis.Redis(host='127.0.0.1', port=6379, db=0)

def getPlayerData(playerID):
    cached = r.get("player:%d" % playerID)
    if cached:
        return json.loads(cached)

    data = db.query("SELECT * FROM players WHERE id = %s", playerID)
    r.setex("player:%d" % playerID, 3600, json.dumps(data))
    return data

# 3. 网络性能优化
# 消息压缩
def sendCompressedMessage(client, data):
    compressed = gzip.compress(json.dumps(data).encode())
    client.send(compressed)

# 消息合并
def batchSendMessages(client, messages):
    combined = {"type": "batch", "messages": messages}
    client.send(json.dumps(combined))
```

---

## 12. BigWorld in Depth: Production-Grade MMO Deployment

### A Complete Deployment Topology

```text
+----------------------------------------------------------+
|                    BigWorld 生产部署                       |
|                                                          |
|  ┌──────────────────────────────────────────────────┐    |
|  │              Manager 集群 (3个实例)                │    |
|  │  主备模式，自动故障转移                            │    |
|  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    |
|  │  │ Mgr-1    │  │ Mgr-2    │  │ Mgr-3    │       │    |
|  │  │ (主)     │  │ (备)     │  │ (备)     │       │    |
|  │  └──────────┘  └──────────┘  └──────────┘       │    |
|  └──────────────────────────────────────────────────┘    |
|                         |                                |
|  ┌──────────────────────────────────────────────────┐    |
|  │              Loginapp 集群 (5个实例)               │    |
|  │  负载均衡，处理玩家登录                            │    |
|  └──────────────────────────────────────────────────┘    |
|                         |                                |
|  ┌──────────────────────────────────────────────────┐    |
|  │              Baseapp 集群 (10个实例)               │    |
|  │  管理客户端连接，路由消息                          │    |
|  │  每个实例最大 5000 连接                           │    |
|  └──────────────────────────────────────────────────┘    |
|                         |                                |
|  ┌──────────────────────────────────────────────────┐    |
|  │              Cellapp 集群 (20个实例)               │    |
|  │  处理游戏世界逻辑                                  │    |
|  │  每个实例处理 3-5 个 Space                        │    |
|  │  每个 Space 最大 500 个 Entity                    │    |
|  └──────────────────────────────────────────────────┘    |
|                         |                                |
|  ┌──────────────────────────────────────────────────┐    |
|  │              DBapp 集群 (5个实例)                  │    |
|  │  数据库代理，读写分离                              │    |
|  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    |
|  │  │ DB-主    │  │ DB-从1   │  │ DB-从2   │       │    |
|  │  │ (写)     │  │ (读)     │  │ (读)     │       │    |
|  │  └──────────┘  └──────────┘  └──────────┘       │    |
|  └──────────────────────────────────────────────────┘    |
+----------------------------------------------------------+
```

### Space Configuration in Detail

```python
# Space 配置
space_configs = {
    "main_city": {
        "type": "outdoor",
        "width": 5000,
        "height": 5000,
        "grid_size": 100,
        "max_entities": 2000,
        "aoi_radius": 500,
        "cell_size": 500,  # 每个 Cell 500x500 米
        "max_entities_per_cell": 500,
    },
    "dungeon_01": {
        "type": "indoor",
        "width": 200,
        "height": 200,
        "grid_size": 50,
        "max_entities": 100,
        "aoi_radius": 200,
        "cell_size": 200,
        "max_entities_per_cell": 100,
    },
    "world_map": {
        "type": "outdoor",
        "width": 100000,
        "height": 100000,
        "grid_size": 500,
        "max_entities": 10000,
        "aoi_radius": 1000,
        "cell_size": 1000,
        "max_entities_per_cell": 1000,
    },
}
```

### The Complete Entity Migration Process

```python
# Entity 迁移的完整实现
def migrate_entity(entity, target_cellapp):
    # 1. 序列化 Entity 完整状态
    state = {
        "entityID": entity.id,
        "entityType": entity.type,
        "position": entity.position,
        "rotation": entity.rotation,
        "properties": entity.getProperties(),
        "inventory": entity.inventory,
        "skills": entity.skills,
        "questState": entity.questState,
        "buffs": entity.buffs,
        "cooldowns": entity.cooldowns,
        "timestamp": time.time(),
    }

    # 2. 验证序列化完整性
    validate_migration_state(state)

    # 3. 通知目标 Cellapp 准备接收
    target_cellapp.prepare_receive_entity(state)

    # 4. 发送 Entity 状态
    target_cellapp.receive_migrated_entity(state)

    # 5. 从源 Cellapp 移除
    source_cellapp.remove_entity(entity.id)

    # 6. 通知客户端
    source_cellapp.notify_client_entity_migrated(
        entity.id, target_cellapp.addr
    )

    # 7. 更新 AOI
    source_cellapp.recalculate_aoi()
    target_cellapp.recalculate_aoi()

def validate_migration_state(state):
    required_fields = ["entityID", "entityType", "position", "properties"]
    for field in required_fields:
        if field not in state:
            raise ValueError("迁移数据不完整: 缺少 %s" % field)

    if not isinstance(state["position"], tuple) or len(state["position"]) != 3:
        raise ValueError("位置数据格式错误")

    if state["entityID"] <= 0:
        raise ValueError("Entity ID 无效")
```


### Database Read/Write Splitting

```python
# 数据库读写分离配置
db_config = {
    "write": {
        "host": "10.0.0.1",
        "port": 3306,
        "database": "kbengine",
        "username": "write_user",
        "password": "password",
    },
    "read": [
        {
            "host": "10.0.0.2",
            "port": 3306,
            "database": "kbengine",
            "username": "read_user",
            "password": "password",
            "weight": 3,
        },
        {
            "host": "10.0.0.3",
            "port": 3306,
            "database": "kbengine",
            "username": "read_user",
            "password": "password",
            "weight": 2,
        },
    ],
}

class DatabaseManager:
    def __init__(self):
        self.write_db = connect(db_config["write"])
        self.read_dbs = [connect(cfg) for cfg in db_config["read"]]

    def read(self, sql, params=None):
        # 读操作负载均衡
        db = random.choice(self.read_dbs)
        return db.query(sql, params)

    def write(self, sql, params=None):
        # 写操作走主库
        return self.write_db.execute(sql, params)

    def batch_write(self, operations):
        # 批量写入
        self.write_db.begin()
        for op in operations:
            self.write_db.execute(op["sql"], op["params"])
        self.write_db.commit()
```

### Monitoring and Alerting

```python
# 监控指标
metrics = {
    "loginapp": {
        "connections": Gauge("loginapp_connections", "Loginapp connections"),
        "logins_per_second": Counter("loginapp_logins", "Logins per second"),
    },
    "baseapp": {
        "connections": Gauge("baseapp_connections", "Baseapp connections"),
        "messages_per_second": Counter("baseapp_messages", "Messages per second"),
    },
    "cellapp": {
        "entities": Gauge("cellapp_entities", "Entities per Cellapp"),
        "aoi_updates": Counter("cellapp_aoi_updates", "AOI updates per second"),
    },
    "dbapp": {
        "queries": Counter("dbapp_queries", "Database queries"),
        "query_time": Histogram("dbapp_query_time", "Query execution time"),
    },
}

# 告警规则
alert_rules = {
    "high_cpu": {
        "metric": "cpu_usage",
        "threshold": 80,
        "duration": "5m",
        "severity": "warning",
    },
    "high_memory": {
        "metric": "memory_usage",
        "threshold": 90,
        "duration": "5m",
        "severity": "critical",
    },
    "entity_count": {
        "metric": "cellapp_entities",
        "threshold": 4500,
        "duration": "1m",
        "severity": "warning",
        "message": "Cellapp Entity 数量接近上限",
    },
}
```


---

## 13. Framework Selection Matrix

### Overall Comparison

| Dimension | HTTP Server | Netty | Skynet | Pitaya | KBEngine | BigWorld |
|------|------------|-------|--------|--------|----------|----------|
| Language | Any | Java | C+Lua | Go | C++/Python | C++/Python |
| Concurrency model | Processes/threads | Reactor | Actor | Actor+Cluster | Entity/Cell | Entity/Space |
| Cluster support | None | Build it yourself | Build it yourself | Built-in | Built-in | Built-in |
| AOI support | None | None | Plugin | None | Built-in | Built-in |
| Hot updates | None | None | Lua layer | None | Python layer | Python layer |
| Learning cost | 1/5 | 2/5 | 3/5 | 2/5 | 4/5 | 5/5 |
| Fits | Auxiliary services | High-concurrency networking | Small-to-mid games | Mid-size MMO | Large MMO | Very large MMO |

### Performance Reference Data

| Metric | HTTP Server | Netty | Skynet | Pitaya | KBEngine | BigWorld |
|------|------------|-------|--------|--------|----------|----------|
| QPS | 10K-50K | 50K-200K | 20K-100K | 30K-150K | 10K-50K | 10K-50K |
| Memory per connection | 10-50KB | 5-20KB | 2-10KB | 5-20KB | 20-50KB | 20-50KB |
| Max connections | 1K-10K | 10K-100K | 5K-50K | 10K-100K | 5K-50K | 5K-50K |
| GC pauses | None | Yes | None | Yes | Yes | Yes |
| Startup time | <1s | 5-10s | <1s | <1s | 10-30s | 30-60s |

---

## 14. Selection by Project Stage

### Stage One: Prototype Validation (1-3 people, 1-2 weeks)

**Recommendation**: HTTP Server + a simple WebSocket

**Why**: the fastest way to produce something and verify the gameplay works. Do not introduce any complex framework at this stage.

**Expected capacity**: 100-500 concurrent players

### Stage Two: Small-Scale Launch (3-10 people, 1-3 months)

**Recommendation**: Skynet or Pitaya

**Why**: enough to support 1K-10K concurrent players, with a mature Actor model. Teams that know Lua pick Skynet; teams that know Go pick Pitaya.

**Expected capacity**: 1K-10K concurrent players

### Stage Three: Mid-Size Project (10-30 people, 3-6 months)

**Recommendation**: Pitaya + Redis + a cluster

**Why**: the Go ecosystem, horizontal scaling, and low maintenance cost.

**Expected capacity**: 10K-50K concurrent players

### Stage Four: Large MMO (30+ people, 6-12 months)

**Recommendation**: build it yourself or heavily modify KBEngine

**Why**: you need full control over the Entity model, AOI, and state sync.

**Expected capacity**: 50K-500K concurrent players

### Stage Five: Fast Mobile Launch (1-3 months)

**Recommendation**: Photon (PUN/Quantum/Fusion)

**Why**: complete client SDKs, matchmaking/rooms work out of the box.

**Expected capacity**: 1K-100K concurrent players

---

## 15. Framework Migration Guide

### Core Principles of Migration

Migration is not "tear it all down and start over" — it is "progressive replacement". Keep what works, replace the problematic parts step by step. Each migration solves exactly one core problem.

### Migrating from HTTP Server to Skynet/Pitaya

1. Keep the HTTP layer for auxiliary services such as login/payments
2. Add Skynet/Pitaya instances to handle real-time game logic
3. The HTTP layer talks to the game servers over internal RPC
4. Gradually migrate stateful logic to the game servers
5. Retire the stateful logic in the HTTP layer

### Migrating from Photon to Building It Yourself

1. Analyze Photon's game logic layer
2. Extract the core game logic and remove the Photon dependency
3. Implement your own network layer (Netty/Pitaya work)
4. Implement room management and matchmaking
5. Replace the Photon SDK step by step

**Pitfall**: many of Photon's features are implemented implicitly (such as state-sync interpolation and prediction) and are easy to miss during migration.

### Migrating from KBEngine to Pitaya

1. Extract the Python-layer game logic
2. Rewrite the business logic in Go
3. Keep the database layer (the SQL is reusable)
4. Implement custom AOI (Pitaya does not ship with it)
5. Implement the Entity migration logic

---

## 16. Building It Yourself vs Using a Framework

| Dimension | Build your own framework | Use an open-source framework | Use a commercial framework |
|------|---------|------------|------------|
| Development cycle | Long | Medium | Short |
| Technical control | Full control | Partial control | Black box |
| Maintenance cost | High (needs dedicated staff) | Medium | Low |
| Customizability | Full | High | Limited |
| Risk | Technical debt | Community vitality | Vendor dependency |
| Best fit stage | Large studios/long-term projects | Mid-size projects | Fast launch |

---

## 17. Common Pitfalls and How to Avoid Them

### Pitfall One: Over-Selecting

"We're making a card game, but considering we might do an MMO in the future, so we picked KBEngine……"

In many projects this is a fairly common mistake. **Do not choose a framework you do not need today for hypothetical future requirements**.

### Pitfall Two: Ignoring the Team's Tech Stack

However good a framework is, it is worth zero if the team cannot use it. A team that only knows Python forced onto a Go framework may be less productive than with a Python framework.

### Pitfall Three: Looking Only at Performance Numbers, Not Development Experience

Skynet is more memory-efficient than Pitaya, but Pitaya's development efficiency is higher than Skynet's. If your team has 5 Go engineers, Pitaya's total output may far exceed Skynet's.

### Pitfall Four: Underestimating Operations Cost

An open-source framework means you handle deployment, monitoring, logs, and alerting yourself. When choosing a framework, calculate the "total cost of ownership".

### Pitfall Five: Chasing the "Perfect Architecture"

Architecture should evolve as the business grows; it does not happen in one step. As *Game Programming Patterns* puts it: "Perfect is the enemy of good."

---

## 18. Summary

| Key question | Answer |
|---------|------|
| The simplest way to start? | HTTP Server + WebSocket — a prototype in half an hour |
| What to pick for an MMO? | Go (Pitaya) or C++/Python (KBEngine) |
| The fastest mobile launch? | Photon Cloud — buy the ready-made client SDK |
| Why are Go game servers increasingly common? | goroutines make concurrency simple, the CSP model naturally fits multi-service decoupling, and deployment is lightweight |
| What does Skynet fit? | Small-to-mid projects, Lua developer teams, maximum memory efficiency |
| Need frame sync (lockstep)? | Photon Quantum or build it yourself |
| Small team? | Start with HTTP Server and evolve step by step |
| Limited budget? | KBEngine or Pitaya — free and feature-complete |

### The Framework Selection Decision Tree

```text
你的游戏是什么类型？
+-- 卡牌/回合制 --> HTTP Server 足够
+-- SLG（策略） --> HTTP Server + 定时任务
+-- 射击/动作（小规模） --> Photon Fusion
+-- MOBA/RTS（帧同步） --> Photon Quantum 或自行开发
+-- MMO（中型） --> Pitaya + 集群
+-- MMO（大型） --> KBEngine 或自行开发
+-- 不确定 --> HTTP Server 先验证玩法
```

### Final Recommendation

*Game Programming Patterns* tells us that a good architecture is "just enough architecture". When choosing a framework, start with the simplest solution and introduce something more complex only when you actually hit a bottleneck. Worth remembering: **frameworks are tools, not a religion**.

### Book List

| Title | Author | Relation to this chapter |
|------|------|------------|
| *Game Programming Patterns* | Robert Nystrom | The classic on game architecture design |
| *Million Online* | - | Large-scale MMO architecture design |
| *Game Server Architecture and Optimization* | - | Framework selection and performance optimization |
| *Online Game Core Technologies and Practice* | - | Getting started with game server development |
| *Netty in Action* | Norman Maurer | The authoritative guide to Netty development |
| *Go in Action* | William Kennedy | The authoritative guide to Go |
| *Programming in Lua* | Robert Ierusalimschy | The Lua bible |
| *Core Python Programming* | - | The authoritative guide to Python |
| *Deep Dive into the Java Virtual Machine* | Zhou Zhiming | The authoritative JVM tuning reference |
| *Distributed Systems: Concepts and Design* | Coulouris et al. | The classic distributed-systems textbook |
| *Large-Scale C++ Software Design* | - | C++ performance optimization |

---

> **Chapter summary**: every framework has its own design philosophy and suitable scenarios. There is no "best" framework, only the framework "best suited to the current stage". Understanding a framework's internals — not just its surface features — is what makes a sound selection decision. This chapter's deep introductions cover each framework's source architecture, internal mechanisms, production practice, and common problems — this knowledge will help you make wise choices in real projects.

---

## 19. Practical Case: An Investigation Into Missed Implicit Behavior Behind "Movement Stuttering After Migration"

> The case is a demonstration example (not taken from a real project) and the numbers are rounded for simplicity. It takes the "Stage Five" selection from Section 14, the "Migrating from Photon to Building It Yourself" path from Section 15, and the operations-cost pitfall from Section 17 into deep water: the migration was checked against a feature checklist rather than a behavior checklist — this is the downstream bill of a selection decision, and the full unfolding of "frameworks are tools, not a religion".

**Background and symptoms**: an 8-person team building a lightweight casual shooter (small-scale matches) picked Photon following the "shooting/action (small-scale)" row of the selection decision tree — exactly the Stage Five "fast mobile launch" playbook: complete client SDK, matchmaking/rooms out of the box. Six months after launch, DAU grew from **20** thousand to **90** thousand, the monthly Photon bill grew from **12** thousand to **38** thousand, and custom room rules kept running into the SDK's black box. Following the five steps of "Migrating from Photon to Building It Yourself" from the migration guide — extract the game logic, build your own gateway (Pitaya + a self-built room service), replace the SDK step by step — the migration took **10** weeks and all **86** items on the feature checklist passed acceptance; the self-built monthly cost was **15** thousand, a book saving of **23** thousand per month. **3** days after full gray release, the community and customer support received **540** reports of "movement stuttering/teleporting" — the disconnect rate had not risen, the crash rate had not risen, yet the game feel had clearly changed.

### Step 1: Symptoms and Criteria — Turning "The Feel Changed" Into a Bucketed Ledger

Feedback was given a unified intake criterion: only "movement presentation" feedback was collected (stuttering/teleporting/smearing), kept separate from login and settlement issues. Bucketed by player RTT:

- **<50ms**: **20** reports
- **50-100ms**: **90** reports
- **100-200ms**: **180** reports
- **>200ms**: **250** reports

Of the **540** reports, the high-latency buckets above **100ms** together held **430** — roughly **80**%. Strongly latency-correlated, but not a network problem: the disconnect rate of **0.4**% was flat versus before the migration, and there were **0** authoritative state-validation errors. The link delivers the packets and the authority computes nothing wrong — so the "stutter" must be in how the client uses those packets.

### Step 2: Layered Attribution — A Link-to-Presentation Ledger

```text
链路层   掉线率 0.4% 持平、重传率 1.1%——链路健康，排除网络劣化
权威层   服务端状态校验错误 0 起、帧耗时 P99 8ms——权威逻辑没有变差
表现层   新旧版本同机回放同一段 160ms 抖动录像：旧版平滑、新版逐包跳变
         旧版在两个位置包之间补了过渡帧——新版只画最新包，没有插值
清单层   迁移验收的 86 条全是显式 API 与功能点；插值、预测、抖动缓冲 0 条在清单上
```

The four-layer ledger pins the problem on the presentation layer and the checklist layer: **those things in the old client that "were written down nowhere yet kept happening all along" had simply not been implemented in the new version**.

### Step 3: Root Cause — The Wrong Migration Baseline: Feature Checklist, Not Behavior Snapshot

Photon did three things automatically on the client that never appeared on the feature checklist: **interpolation smoothing** (filling transition frames between two position packets), **client-side prediction and reconciliation** (act locally first, let the server correct), and **jitter buffering** (absorbing jitter in packet arrival intervals). This chapter's migration guide records the risk — "many of Photon's features are implemented implicitly (such as state-sync interpolation and prediction) and are easy to miss during migration" — the pitfall was not unpredicted, it was that the process failed to catch it: **the migration acceptance criteria had no "behavior" column**. What the presentation layer actually needed was the double-buffering read/write split from Chapter 09: one canvas computes the latest state while the other gives the screen a smooth view of the past — the old SDK quietly did it for us, and nobody does it in the new version.

### Step 4: Remediation and Backfill — Turn Implicit Behavior Into an Explicit Checklist, Then Fill In the Implementation

Following the snap-back criteria from Chapter 04, the three presentation-layer items were filled in: an interpolation buffer of **100**ms, a prediction window of **3** frames, and snap-back on reconciliation overshoot, plus a behavior comparison added to the migration process. A review two weeks later: weekly reports went from **540** to **70**, with the **>200ms** bucket down from **250** to **35**; monthly cost went from **38** thousand to **15** thousand — the **23** thousand on the books was finally real savings this time. The first migration version nearly turned a cost optimization into a reputation incident.

**Backfill checklist**:

| Landing point | Action | Backfilled into |
|-----|------|--------|
| Migration baseline | Upgrade the feature checklist into a "behavior snapshot checklist": record the old version's presentation item by item (screen recording + packet capture) as the acceptance baseline | Migration Guide (15) |
| Implicit-behavior inventory | Before replacing/upgrading an SDK, name every "thing that happens automatically": interpolation, prediction, buffering, reconnection, encryption | Common Pitfalls (17) |
| Acceptance bucketing | Accept the new version by reading feel feedback in RTT buckets, not global averages — percentile criteria in Chapter 13 | Monitoring criteria (Chapter 13) |
| Cost decisions | Cost comparisons must carry an "behavioral completeness" precondition to prevent cost savings from turning into a reputation incident | Selection by Stage (14) |

### Three Lessons from the Case

1. **Implicit implementation is not a free feature; it is an unregistered dependency** — what an SDK does for you has no name on the checklist, and disappears at migration time.
2. **The acceptance baseline determines migration quality**: features passing does not mean behavior is right; screen recordings and bucketed feedback come closer to "game feel" than an API checklist.
3. **Progressive replacement is not about being slow; it is about having a control group at every step** — each migration solves exactly one core problem, so you can tell whose fault a rollback is.

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [01-authoritative-books](/research/01-authoritative-books.md)
