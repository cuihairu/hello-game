# 05 Concurrency Models: Seven Common Approaches and Where They Fit

> When I look at concurrency models, I ask three things first: **where does state live, who has the right to write it, and at which layer does concurrency happen**. Game genre, the team's tech stack, and the project stage change the answers; copying someone else's architecture diagram usually skips exactly these premises.
>
> **Reference books**: the model taxonomy follows the methodological framework of *Seven Concurrency Models in Seven Weeks*, the server architecture selection practice of *Million Online*, and the concurrency chapters of *Game Server Architecture and Optimization*.
>
> **Relationship to Chapter 6**: a framework is a concurrency model productized. Think through the concurrency model before picking a framework—Skynet is the Actor model productized, Netty is Reactor productized, the Go ecosystem is CSP productized. Once the model is clear, the framework choice usually follows naturally; picking the framework first and backfilling the model understanding later often ends in using the wrong framework.

---

## Why the Concurrency Model Is the Server's First-Principles Decision

### The Essential Difference Between Game Connections and Web Requests

The default assumption of a web backend is the "stateless request": a request comes in, the backend queries the database, computes, returns, releases the connection, and the next batch of requests has nothing to do with the last. This assumption makes horizontal scaling simple—any machine can handle any request.

Game servers cannot do that. A player's connection may last hours or even days, and during that time the server has to continuously maintain that player's position, inventory, quest progress, and combat state. More critically: **player A's actions affect the world that player B sees**—this cross-connection shared state is the main source of concurrency problems.

This means a game server's concurrency model must answer two questions at once:

1. **How to hold up a large number of long-lived connections** (the connection capacity problem)
2. **How to manage the mutually influencing shared state behind those connections** (the state consistency problem)

A web backend basically only needs to answer the first question; the second is pushed down to database transactions. A game server pulls the second question back inside the process—and that is exactly where it gets hard.

### An Easily Overlooked Arithmetic Ledger

Connection capacity is not just a question of "how many fds epoll can hold"; it is a resource ledger:

- 100 thousand connections each maintaining 1MB of state requires 100GB of memory
- 100 thousand OS threads each with MB-scale stacks—both memory and scheduling overhead spiral out of control
- 100 thousand connections squeezed into one event loop—any single 10ms block makes every player stutter at once

So choosing a concurrency model is, in essence, a trade-off across four dimensions: **connection capacity, development complexity, latency characteristics, and resource efficiency**. There is no model that wins everywhere, only a model that fits the current game's shape.

| Trade-off dimension | Key question | Typical failure scenario |
|---------|---------|------------|
| Connection capacity | How many connections can one process hold stably? | A gateway built on a thread model: past 5000 connections, memory and context-switch overhead spiral out of control |
| Development complexity | Can the team write it correctly, write it fast, and debug it? | A hand-rolled lock-free queue: when it breaks, nobody can debug it |
| Latency characteristics | Is tail latency under control at peak? | Average latency looks fine, but every few minutes a batch of requests times out |
| Resource efficiency | How much memory and CPU does each connection cost? | One goroutine plus one large buffer per connection: 100 thousand connections eat all the memory |

### Mapping the Seven Models to Mainstream Frameworks

Once you understand the models, look at the frameworks again and you will see that the spectrum of frameworks is really the spectrum of models:

| Concurrency model | Representative frameworks/runtimes | One-line summary |
|---------|---------------|-----------|
| Single-threaded event loop | Node.js, Redis, Nginx worker | One loop runs every event and never blocks |
| Thread pool | Java ExecutorService, C++ thread pools | Tasks enter a queue; a fixed number of threads consume them |
| Reactor | Netty, libuv, Boost.Asio | Readiness notification plus handler dispatch |
| Proactor | Windows IOCP, Linux io_uring | Completion notification; the data is already in your buffer |
| Actor | Erlang/OTP, Skynet, Orleans | State is encapsulated inside the Actor; message-driven |
| Coroutine | Go goroutines, Lua coroutines | Lightweight user-space execution units with blocking-style code |
| CSP | Go channels | No shared memory—communicate instead, exchanging data via channels |

---

## A Prerequisite Consensus First: The Main Logic Thread and the Single Writer

Before unpacking the seven models, one repeatedly validated industry conclusion needs to be stated clearly; otherwise "choosing a concurrency model" is easily misread as "pick one model and use it for everything".

**In the vast majority of shipped games, the core logic ultimately converges on "one single-threaded logic context per room/scene/partition."** No matter whether the outer layer uses Reactor, coroutines, or Actors, positions, HP, buffs, and skill timing inside a room are all advanced exclusively by one sequentially executing logic context.

This is not a coincidence; it is dictated by the nature of game logic:

- States inside a room are tightly coupled (damage triggers buffs, buffs change movement speed, movement speed affects adjudication); splitting them across threads creates a flood of locks and ordering problems
- Game logic is extremely sensitive to jitter—what kills it is not a slightly slower average but "occasionally very slow"
- Frame sync, replay, and adjudication all presuppose a deterministic, replayable execution order

This is the **single-writer principle**: at any moment, exactly one execution flow has the right to write a given piece of state. What the single writer buys you is not "speed" but **reasonability**—when something breaks you do not have to suspect concurrent interleaving; you just read the sequentially executed trace.

So a concurrency model design closer to reality is not "use one model for the whole server," but:

```text
        ┌──────────────────────────────────────────────┐
        │              连接层（高并发 I/O）              │
        │      Reactor / Proactor / 每连接一个协程       │
        └───────────────────┬──────────────────────────┘
                            │  消息（解码、校验后投递）
        ┌───────────────────▼──────────────────────────┐
        │           逻辑层（每房间/分区一个上下文）        │
        │     单线程 Tick 推进，状态单写，顺序确定         │
        └───────┬───────────────────────┬──────────────┘
                │ 消息/任务               │ 异步写队列
        ┌───────▼────────┐      ┌────────▼─────────────┐
        │  计算层（线程池） │      │  外围层（异步化）       │
        │ 寻路/AOI/数值批量 │      │  落库、日志、埋点、通知  │
        └────────────────┘      └──────────────────────┘
```

**Concurrency happens at the edge; serialization happens at the core.** The access layer uses a high-concurrency I/O model to hold connections, the compute layer uses a thread pool to digest heavy computation, the peripheral layer is made async to isolate slow operations, and the inside of a room stays single-threaded and sequential. Each of the seven models that follow is a candidate for one layer of this stack.

---

## The Seven Concurrency Models in Detail

Each model below follows the same structure: core idea → what problem it solves → what new problems it introduces → how it is really used in games → where it fits and its pitfalls.

### 1. Single-Threaded Event Loop

**Core idea**: one thread runs an infinite loop; each round processes a batch of ready I/O events, expired timers, and pending tasks, and no blocking of any kind is allowed during processing.

**Typical representatives**: Node.js, Redis, Nginx worker, single-process Lua game servers

```text
┌────────────────────────────────────┐
│            Event Loop               │
│                                    │
│   epoll_wait ──► 就绪事件队列        │
│       │                            │
│       ▼                            │
│   逐个执行 Handler（不阻塞）          │
│       │                            │
│       ▼                            │
│   到期定时器 ──► 下一轮 ◄──────────── │
└────────────────────────────────────┘
```

**What problem it solves**: it drops the complexity of concurrency problems straight to zero. No locks, no races, no memory-visibility issues; all state is naturally touched by only one thread, so the code logic and the execution order are exactly the same. Redis used this model to reach 100 thousand QPS on a single machine, proving that "simple" and "high performance" are not in conflict—provided every operation is a short, memory-level one.

**What new problems it introduces**: all operations share one execution flow, so **one slow operation drags everyone down**. One synchronous database query, one large JSON serialization, one GC pause—any of them puts every player's actions in a queue. This is also where it differs from a "single-threaded game main logic": operations in Redis are microsecond-scale, while game logic routinely involves database persistence and heavy computation; putting game logic raw into an event loop hurts.

**How it is really used in games**:

```go
// 轻量卡牌服的主循环骨架（伪代码）：
func mainLoop() {
    for {
        now := time.Now()
        // 1. 非阻塞地取网络事件（设置很短的超时）
        events := poller.Wait(1 * time.Millisecond)
        for _, ev := range events {
            msg := decode(ev)          // 只做解码，不做重活
            queue.Push(msg)            // 进待处理队列
        }
        // 2. 处理到期的定时器（体力恢复、建筑升级）
        timerWheel.Advance(now)
        // 3. 批量处理消息，限制每轮配额防止饿死定时器
        for i := 0; i < 500 && queue.Len() > 0; i++ {
            handleOne(queue.Pop())
        }
    }
}
```

Note the two defensive designs in this code: **decoding is separated from handling** (heavy work goes into a queue and is rate-limited), and **a per-round processing quota** (so a message flood cannot starve the timers). The single-threaded model is not "one while loop handles everything"; you must build your own scheduling discipline inside the single thread.

**Where it fits**: mini-game services (WeChat mini-game backends), the full logic of card/idle/turn-based games, the gateway layer, config and admin interfaces.

**Common pitfalls**:

- A synchronous blocking call slips into the loop (synchronous DB, synchronous HTTP, `time.Sleep`) and the whole service freezes
- Timers use unordered traversal instead of a timing wheel/min-heap; once timers multiply, per-round cost grows linearly
- Missing error handling: one handler panic takes down the whole loop (a classic Node.js incident)

### 2. Thread Pool

**Core idea**: pre-create a fixed number of worker threads; task objects enter a shared queue and the workers loop, pulling tasks to execute. Use a fixed thread count to digest a huge volume of short tasks.

**Typical representatives**: Java ExecutorService, the worker pool pattern in Go, custom C++ thread pools

**What problem it solves**: it lets the compute of a multi-core CPU be safely "wholesaled" out. Thread creation and destruction are expensive operations (MB-scale stack allocation, kernel scheduling setup); a thread pool amortizes that cost through reuse. For computations where **tasks are independent of one another and share no mutable state**, a thread pool gets near-linear multi-core speedup.

**What new problems it introduces**: the moment tasks need to touch shared data, you are back in the world of locks. The cost of locks goes far beyond the few lines that acquire and release them—thread waiting, context switches, cache invalidation, priority inversion—and it usually shows up as **worsening tail latency and occasional timeouts**, not a steady slowdown. This is the thread pool model's most hidden cost (expanded in the later section "The Real Cost of Locks").

**How it is really used in games**—in a game server the thread pool's standard position is "the compute layer next to the logic layer":

```go
// 房间逻辑线程发现需要给 200 个怪物重新寻路
// ——这是纯计算，不碰房间状态，丢给线程池
func (r *Room) onNeedPathBatch(targets []Movable) {
    task := func() {
        results := make([]Path, len(targets))
        for i, t := range targets {
            results[i] = pathfinder.Find(t.Pos, t.Dest)  // 只读快照
        }
        r.resultCh <- results   // 结果回投给房间线程合并
    }
    computePool.Submit(task)
}

// 房间线程在下一帧消费结果
func (r *Room) tick() {
    select {
    case results := <-r.resultCh:
        r.applyPaths(results)   // 唯一写状态的地方：房间线程自己
    default:
    }
    // ... 正常推进逻辑
}
```

Two key disciplines in this example: **the thread pool only touches snapshots or read-only data**, and **results are thrown back through a channel to the single writer to merge**. That way the thread pool supplies multi-core compute without introducing shared writes into the room logic.

**Where it fits**: pathfinding, AOI computation, large-scale numerical settlement, offline battle simulation, log compression and writing, image/spreadsheet processing, and other background jobs.

**Common pitfalls**:

- Tasks read and write a shared map/slice directly; after wrapping it in a lock, a hot lock appears on the high-frequency path
- The queue is unbounded; when the downstream stalls, tasks pile up without limit and memory climbs slowly until OOM
- Tasks have implicit dependencies (B needs A's result); with a fixed thread count they can wait on each other into starvation

### 3. The Reactor Model

**Core idea**: an event dispatcher (the Reactor) watches a set of I/O handles and, when a handle becomes ready (readable/writable), calls back into the corresponding handler. Reactor answers "**which connections are ready to read or write**"; the reading and writing itself is done by the handlers.

**Typical representatives**: Netty, libevent, libuv, Redis, Nginx, muduo

```text
单 Reactor：
  epoll ──► Reactor 分发 ──► Handler1 / Handler2 / Handler3 ...
                              （同一个线程内依次执行）

主从 Reactor（Netty 的 boss/worker）：
  mainReactor (boss)            subReactor (worker) x N
  只管 accept ──────────────►  每个管理一批连接的读写事件
  新连接分配到某个 worker        Handler 在 worker 线程内执行
```

**What problem it solves**: serving massive numbers of connections with a handful of threads. The standard answer to the C10K problem is Reactor—thread count is decoupled from connection count, and 10 thousand connections can be served by just 8 event-loop threads. For workloads that are I/O-intensive and compute-light, like "receive messages, forward messages," Reactor is the balance point between throughput and latency.

**What new problems it introduces**: handlers **execute synchronously** on the event-loop thread, so any time-consuming operation blocks every connection on that same loop. Reactor therefore has an iron rule: **inside the event-loop thread do only I/O and light processing; throw heavy work over to business threads/queues**. The programming paradigm Netty provides—an EventLoop separate from the business thread pool—exists precisely to enforce this discipline.

**How it is really used in games**—the gateway is Reactor's textbook scenario:

```java
// Netty 网关：mainReactor 管 accept，subReactor 管读写，业务逻辑转发
ServerBootstrap b = new ServerBootstrap();
b.group(bossGroup, workerGroup)          // 主从 Reactor
 .channel(NioServerSocketChannel.class)
 .childOption(ChannelOption.TCP_NODELAY, true)   // 游戏必开，禁 Nagle
 .childHandler(new ChannelInitializer<SocketChannel>() {
     protected void initChannel(SocketChannel ch) {
         ch.pipeline()
           .addLast(new LengthFieldDecoder())   // 解决粘包/拆包
           .addLast(new ProtobufDecoder())
           .addLast(new GatewayHandler());      // 鉴权 + 路由转发
     }
 });
```

A gateway handler usually does only three things: session authentication, protocol validation, and delivering messages into the queue of the corresponding room/logic process. The moment someone writes a synchronous database query inside a gateway handler, the latency of the whole access chain gets pinned to the slowest query—the most common accident in Reactor scenarios.

**Where it fits**: gateways/access layers, proxies and forwarding services, chat push, and services with high connection counts and low computation.

**Common pitfalls**:

- Blocking operations inside a handler (synchronous RPC, synchronous DB) and the event loop is dragged to death
- Not handling sticky/half packets (TCP is a byte stream; messages must be framed by length or delimiter)
- Forgetting `TCP_NODELAY`: small packets get batched up by the Nagle algorithm and real-time matches mysteriously gain tens of milliseconds of latency

### 4. The Proactor Model

**Core idea**: you initiate asynchronous I/O and return immediately; the operating system notifies the application **after the operation completes**. The essential difference from Reactor: Reactor tells you "it is ready to read" (you go read it yourself), while Proactor tells you "it has already been read" (the data is in your buffer). Readiness notification becomes completion notification.

**Typical representatives**: Windows IOCP, Linux io_uring, Boost.Asio's async mode

```text
Reactor：  内核："fd 可读了" ──► 你调用 read() 拷贝数据 ──► 处理
Proactor： 你预先提交"读到这个缓冲区" ──► 内核完成读取并拷贝完毕
           ──► 通知你："数据在 buffer 里，直接处理"
```

**What problem it solves**: it compresses the three steps "ready → issue syscall → copy" into a single step done by the kernel, reducing syscall counts and context switches. In high-IOPS scenarios (massive small-packet traffic, heavy disk writes) io_uring has a clear edge over epoll, and it also naturally supports batch submission and batch reaping.

**What new problems it introduces**: the callback style shatters the control flow—a connection's lifecycle gets split into a chain of callbacks, with error handling, timeouts, and resource cleanup scattered everywhere (callback hell). On top of that, io_uring's API carries a real mental burden and no shortage of version-compatibility issues; a team needs solid systems-programming skill to handle it.

**How it is really used in games**: game servers on Windows have long used IOCP directly (completion ports are close to the de facto standard for high-performance networking on Windows). On Linux, io_uring mostly shows up in two places: **ultra-high connection density at the gateway**, and **batched disk writes in the persistence layer** (accumulate each frame's dirty data into batches and write them with io_uring). If the team is not familiar with it, Reactor plus user-space buffer optimizations is usually enough; Proactor is an option to reach for "after confirming the bottleneck is at the syscall layer".

**Where it fits**: gateways chasing extreme I/O throughput, high-volume disk persistence, and nodes dense with cross-server communication.

**Common pitfalls**:

- Resources held in a callback but never released: buffers leak on connection error paths
- io_uring version differences (kernel 5.x versions have different capabilities), so dev and production behave inconsistently
- Business logic written into completion callbacks: the callback stack grows ever deeper until nobody can follow the execution order

### 5. The Actor Model

**Core idea**: split the system into Actors—each Actor owns private state and a mailbox, the outside world can **never touch its state directly** and can only drop messages into the mailbox; the Actor takes one message from the mailbox at a time, processes it, then takes the next. Concurrency safety is guaranteed not by locks but by the structure of "encapsulated state + serial consumption".

**Typical representatives**: Erlang/OTP, Skynet, Akka, Microsoft Orleans

```text
┌─────────┐   msg   ┌──────────────┐    msg    ┌─────────┐
│ Actor A │ ──────► │  Actor B     │ ────────► │ Actor C │
│ 私有状态 │         │ [邮箱: m3,m2] │           │ 私有状态 │
└─────────┘         │ 串行消费 m1→m2→m3                           │
                    └──────────────┘
   外部只能投递消息，永远不能直接读写 B 的状态
```

**What problem it solves**: it upgrades "don't share mutable state" from a programming discipline into a runtime structure. As long as the logic inside an Actor is sequential, the entire chain has no data races and needs no locks. Skynet makes this model extremely lightweight with "C services + Lua business logic"—every service is an Actor; a few worker threads pick ready services from a global queue and run them, so tens of thousands of services multiplex over a few dozen threads.

The Erlang family (including game applications like Loki/Poseidon) further proved this model's value for telecom-grade availability: process isolation means one Actor crashing does not affect other Actors, and supervision trees implement the fault-tolerance philosophy of "let some processes die and rebuild them".

**What new problems it introduces**:

1. **Cross-Actor operations become asynchronous**—asking Actor B for data means sending a message and waiting for a reply; code turns from "function call" into "request-response message pairs", which is verbose to write, and the failure cases (timeout, out-of-order, duplicates) must be handled yourself
2. **The mailbox is itself a queue**—a hot Actor's mailbox piles up, and piling up means rising latency, while most Actor frameworks default to unbounded mailboxes (the backpressure problem, covered later)
3. **Debugging is hard**—there is no traditional call stack; tracing a bug means reading message-flow logs instead of stepping through with breakpoints

**How it is really used in games**—Skynet-style service partitioning:

```lua
-- 每个房间一个 skynet service（Actor），状态封闭在服务内部
local skynet = require "skynet"

skynet.start(function()
    skynet.dispatch("lua", function(session, source, cmd, ...)
        if cmd == "join" then
            room:add_player(...)          -- 直接改 room，没有锁
        elseif cmd == "action" then
            local events = room:apply(...) -- 串行处理，顺序确定
            broadcast(events)              -- 结果广播出去
        end
    end)
end)

-- 网关服务把玩家消息路由到对应房间服务：
-- skynet.send(room_addr, "lua", "action", uid, payload)
```

The `room` Lua table is visible only inside the service; although there are only a few worker threads, at any moment a service executes on exactly one thread—the single-writer principle is guaranteed by the runtime structure.

**Where it fits**: room/scene management, MMO entity and service partitioning, chat systems, matchmaking services, and any topology with "many entities and low coupling between them".

**Common pitfalls**:

- Hot Actors (the global leaderboard, the world chat channel) become single-point bottlenecks—they need to be sharded by key into multiple Actors
- A deadlock variant: A sends B a message and synchronously waits for B's reply while B is waiting for A to process a message (circular waiting at the message level)
- Unbounded mailbox plus an unthrottled upstream equals latency quietly rotting to minutes before anyone notices

### 6. Coroutine

**Core idea**: lightweight user-space execution units scheduled by the runtime (not the kernel). Switching between coroutines is just saving/restoring a few registers—no kernel entry, cost on the order of hundreds of nanoseconds—and a coroutine's stack shrinks from MB-scale to KB-scale and grows on demand.

**Typical representatives**: Go goroutines, Kotlin coroutines, Lua coroutines, C++20 coroutines, Erlang processes (strictly speaking, the Erlang process is this idea taken to the extreme)

**What problem it solves**: it resolves the contradiction between "high concurrency" and "writable code". Callback/event-style code chops a linear flow into pieces; coroutines let you get **asynchronous, non-blocking performance** with **synchronous, blocking-style code**:

```go
// 一个连接一个 goroutine：写法完全是顺序的，读就是读，写就是写
func handleConn(conn net.Conn) {
    defer conn.Close()
    session := newSession(conn)
    for {
        msg, err := readMessage(conn)   // "阻塞"在这里——但只是这个
        if err != nil {                  // goroutine 被挂起，不占线程
            return
        }
        room := routeTo(msg)            // 投递到房间（channel/队列）
        room.Submit(session, msg)
    }
}

// 启动一万个连接就是一万个 goroutine：
// 10000 × 2KB 初始栈 ≈ 20MB，加上运行时数据也在百 MB 内
```

The same thing written with Reactor callbacks needs a state machine to track "half-read packets" and "requests awaiting replies"; written with coroutines, it is just ordinary functions. This is the core reason Go became a mainstream game-server language: **the cost of a concurrency unit dropped to a level where you can spawn them freely**.

**What new problems it introduces**:

1. **Coroutines do not eliminate concurrency problems; they just make them easier to ignore**—two goroutines writing one map at the same time is still a data race, and Go's map panics outright on concurrent writes. Coroutine ease of use makes it easier for newcomers to share state without noticing
2. **GC pressure**—goroutine stacks are objects the GC scans; goroutines in the millions make GC mark times noticeably longer
3. **Leaks**—a goroutine blocked on a channel that nobody ever wakes lives forever; leaks accumulate slowly

**How it is really used in games**: the common coroutine topology of a Go game server—one goroutine per connection; one goroutine per room (single writer inside the room); one consumer goroutine each for scheduled jobs, persistence, and logging. The role coroutines play here is "**isolating different concerns into independent sequential execution flows**", not "splitting one job into parallel pieces".

**Where it fits**: almost every Go game server; Lua coroutines serialize business flows inside Skynet services (for example "send message → await reply → continue processing" wrapped by a coroutine into synchronous-looking code).

**Common pitfalls**:

- Multiple goroutines writing a shared map cause a panic—converge on a single writer, add a lock, or shard
- A `go func(){...}` fired and forgotten: an unrecovered panic takes down the whole process, or the goroutine blocks forever and leaks
- Assuming coroutines are free: hang a 64KB buffer off every goroutine and a million of them cost 64GB

### 7. CSP (Communicating Sequential Processes)

**Core idea**: execution units share no memory and communicate through channels. The key difference from the Actor model is **how communication is addressed**: an Actor sends messages to a specific Actor (it must know the recipient's identity), while CSP sends messages to a Channel (the sender does not know or care who consumes them).

**Typical representatives**: Go channels (built into the language), Core.async (Clojure)

```text
Actor：   A ──msg──► [B 的邮箱] ──► B        （点对点，知道对方是谁）
CSP：     A ──msg──► [Channel] ──► 谁消费？──► B 或 C 或 B+C
                      （中介，发送方与消费方解耦）
```

**What problem it solves**: **topological decoupling** of senders and consumers. Behind one channel there can be one consumer, multiple consumers (load balancing), or multiple producers plus multiple consumers (fan-in); adding or removing either side does not affect the other side's code. The Go proverb "Do not communicate by sharing memory; share memory by communicating" describes exactly this structure.

**What new problems it introduces**: channel blocking semantics deserve serious attention—sending to a full channel blocks the sender, receiving from an empty channel blocks the receiver; with no consumer, producers quietly pile up or block; a `select` without a timeout branch may wait forever. CSP moves the question "who in the system is waiting on whom" from the world of locks to the world of channels; the form of the problem changed, but the required caution did not.

**How it is really used in games**—the most common form of CSP in game servers is the **pipeline**:

```go
// 接入 → 逻辑 → 落库 的三段流水线，每段独立伸缩
func gatewayStage(in <-chan Message, out chan<- Message) {
    for msg := range in {
        if valid(msg) { out <- msg }
    }
    close(out)
}

func logicStage(in <-chan Message, out chan<- PersistJob) {
    for msg := range in {
        room := roomTable.Get(msg.RoomID)
        room.Submit(msg)                    // 房间内部仍是单写者
        if dirty := room.TakeDirty(); dirty != nil {
            out <- PersistJob{RoomID: room.ID, Data: dirty}
        }
    }
    close(out)
}

func persistStage(in <-chan PersistJob) {
    for job := range in {
        batchBuffer.Add(job)                // 攒批
        if batchBuffer.Full() { flush() }   // 批量入库
    }
}
```

Adjacent stages are connected by buffered channels, and the buffer is an **explicit capacity cap**—when it fills, the upstream blocks and pressure propagates naturally toward the entrance instead of piling up in memory without limit (this is exactly backpressure, expanded in the later section "Flow Control and Backpressure").

**Where it fits**: the overall skeleton of a Go game server, multi-stage pipelines (access → logic → persistence), and multi-producer fan-in (events from every room aggregated into a stats service).

**Common pitfalls**:

- Unbuffered channels create an implicit synchronization point when sender and receiver drift out of rhythm, and throughput collapses
- Sending to a channel nobody reads anymore leaves a goroutine blocked forever (a leak)
- Passing large object references through a channel: the consumer mutates them unexpectedly, reproducing the "we shared memory" accident—what communication passes should be ownership

---

## Comparison Table of the Seven Models

| Model | Concurrency unit | State sharing | Communication | Typical latency | Dev difficulty | Place in games |
|------|---------|---------|---------|---------|---------|------------|
| Single-threaded event loop | Thread | Race-free | Queues/callbacks | Extremely low (when nothing blocks) | ⭐⭐ | Full logic of mini games, gateways |
| Thread pool | Thread | Locks required | Shared queue | Medium (lock-dependent) | ⭐⭐⭐ | Pathfinding/AOI/batch computation |
| Reactor | Event loop | Race-free (inside the loop) | Callbacks | Low | ⭐⭐⭐ | Gateways, access layers |
| Proactor | Completion port | Race-free (inside callbacks) | Completion callbacks | Extremely low | ⭐⭐⭐⭐ | Extreme-I/O gateways, disk persistence |
| Actor | Actor | No sharing (encapsulated) | Mailbox messages | Medium (includes queueing) | ⭐⭐ | Room/entity/service partitioning |
| Coroutine | goroutine | Discipline required | Channels | Extremely low | ⭐⭐ | Connections, rooms, async tasks |
| CSP | Sequential process | No sharing (via communication) | Channels | Low | ⭐⭐ | Pipelines, multi-stage decoupling |

Two notes on reading the table:

- **Low dev difficulty does not mean bugs are hard to write.** Coroutines rate low on difficulty because the style is natural, but shared-state mistakes are also harder to spot—difficulty measures the mental burden of writing correct code, and the coroutine model's mental burden concentrates on "can you resist sharing state"
- **The latency column refers to overhead introduced by the model itself**, excluding business processing time. The "medium" for Actor/CSP comes from queue waiting, and at high load that waiting is both a curse (latency rises) and a blessing (peak shaving)

---

## Hybrid Architectures in the Real World

Mature game servers almost never "use one model"; they mix by layer. Two typical cases:

### Case 1: Card/Idle Game Server (No Real-Time Sync)

```text
HTTP/WebSocket 网关（Reactor 或每连接一个 goroutine）
        │
        ▼
单进程业务逻辑（事件循环 or 单 goroutine 串行处理）
        │                │
        ▼                ▼
  定时器（最小堆）    异步任务队列（channel）
  体力恢复/建筑升级      ▼
                    落库消费者（攒批写入 MySQL）
```

Characteristics: serial logic alone suffices (a few thousand concurrent users per server); the emphasis is on **making the periphery asynchronous**—persistence, push notifications, and event settlement all go through channels to background consumers, and the main logic never waits on the database.

### Case 2: MOBA/FPS Room Server (Hard Real Time)

```text
网关层：主从 Reactor（每连接会话，TCP_NODELAY，长度字段分包）
        │ 消息解码+校验后投递
        ▼
房间层：每个房间一个 goroutine（或 Skynet service）
        内部以固定频率 Tick（如 15Hz 逻辑帧）
        状态单写，输入按帧序消费
        │
        ├──► 广播聚合：一帧内合并状态更新，减少包量
        ├──► 计算层：寻路/AOI 快照丢线程池，结果回投房间
        └──► 持久化 channel：战绩、结算异步落库
```

Characteristics: **the boundary of concurrency is drawn precisely at the room's door**—outside the room everything is messages, inside the room everything is sequence. This structure satisfies performance (I/O multiplexing), correctness (single writer), and observability (the in-room execution trace is replayable) at the same time.

### The Division-of-Labor Rule of Thumb for Hybrid Architectures

| Layer | Responsibility | Suitable models |
|----|------|-----------|
| Connection layer | Massive connections, codec, routing | Reactor / Proactor / one coroutine per connection |
| Logic layer | Advancing room/scene/partition state | Single-threaded tick (housed in a coroutine/Actor/service) |
| Compute layer | Heavy, parallelizable computation | Thread pool (touches snapshots only; results thrown back) |
| Peripheral layer | Persistence, logging, push, event tracking | Consumer coroutines + queues (async isolation) |

---

## The Second Half of Concurrency Models: Flow Control and Backpressure

Picking the right model is only the first half. Queues are the shared foundation of all these models (Actor mailboxes, CSP channels, thread-pool task queues), and **a queue's behavior decides how the system dies or survives under overload**.

### Why Queues Are the First to Collapse at Peak

When peak traffic arrives, the CPU often is not even saturated yet, but queues have already started to pile up: gateway write buffers, Actor mailboxes, persistence queues, pending broadcast lists. If the system's only response to the pileup is "keep accepting, keep stuffing", then:

1. Queues lengthen → tail latency climbs
2. Tail latency climbs → clients time out and retry
3. Retries amplify inbound traffic → queues grow longer

In the end the system did not "hold up"; it used its backlog to postpone the failure by a few minutes and then avalanched. **An unbounded queue is, in essence, a way of delaying the moment the failure becomes visible.**

### A Stable System Gives Every Queue Three Things

```go
// 有上限的落库队列：满时的策略是显式选择的
func enqueuePersist(persistCh chan<- PersistJob, job PersistJob) {
    select {
    case persistCh <- job:
        // 正常入队
    default:
        metrics.Inc("persist_queue_overflow")
        log.Warn("persist queue full, degrade to local file")
        appendToLocalWAL(job)   // 降级：先落本地，事后补偿
    }
}
```

1. **An explicit capacity cap**—the write-buffer cap per connection, the broadcast backlog cap per room, the persistence queue length cap are all design parameters written into the code, not "as long as memory holds out"
2. **An overflow policy**—reject, degrade, drop stale messages (e.g. position sync packets: drop old, keep new), or pause admission; choose one of the four based on each message's business value
3. **Priority isolation**—the primary path (login, combat broadcasts, settlement) and the peripheral path (announcements, red dots, event tracking) queue separately; no matter how squeezed the periphery is, it must not drag down the core

### Design the Degradation Order in Advance

A practical degradation ladder, enabled in order:

1. First drop low-priority, expirable messages (stale position packets, non-critical push)
2. Then degrade peripheral async paths (event-tracking sampling, reduced log frequency)
3. Then throttle new traffic at the entrance (login queueing, matchmaking rate limiting)
4. Only then touch the primary core path

The key question is not "how do we drop nothing" but: **if the system can only process half the traffic right now, which half must survive?** That answer is a product decision, and engineering has to turn it into code in advance.

### Why Backpressure Must Be Built in Early

Many teams plan to "load-test before launch and add flow control once bottlenecks show up". That order usually arrives too late—without capacity bounds, a load test cannot reveal the real failure shape; without priority isolation, a load test can only prove "the system dies together"; without degradation paths, a peak drill has nothing to grab onto. Flow control and backpressure should be part of the architecture, not an optimization item.

---

## The Real Cost of Locks: Why Veterans Prefer the Single Writer

Once you use a thread pool or multi-threaded shared structures, you cannot avoid locks. This section is set aside to break down the real cost of locks, because it is routinely underestimated.

### The Cost of Locks Is More Than Locking and Unlocking

| Cost | Description |
|------|------|
| Thread waiting and switching | On contention, threads suspend and wake—microseconds each, accumulating under high contention |
| Cache invalidation | The lock-protected cacheline bounces between cores; worse on NUMA machines |
| Tail latency degradation | Averages look fine but P99 has spikes; to players it feels like "occasional stutter" |
| Deadlock/livelock risk | Lock-order management gets exponentially harder as lock count grows |
| Poor reproducibility | Depends on thread scheduling timing; the problem never reproduces locally, only occasionally in production |

The last one is the most lethal in practice: lock-induced problems usually present as **occasional, hard to reproduce, timing-dependent**, and the debugging cost far exceeds the development time they save.

### High-Frequency Hot Locks in Game Servers

The places most likely to blow up in practice: the global player table, room/scene indexes, the broadcast connection list, timer containers, shared object pools, and cross-thread log aggregators. What they have in common: **they sit on high-frequency paths and are shared by all threads**.

### Finer-Grained Locks Usually Lose to Not Sharing at All

When lock contention appears, the first instinct is often "make the lock granularity finer". That direction sometimes works, but the more common and more reliable move is to ask first: **does this state really need to be shared?**

- **Sharding**: split the global player table into N shards by `playerID % N`, each with its own lock; contention drops straight to 1/N
- **Replication**: each thread holds a read-only snapshot, refreshed periodically; the read path is completely lock-free
- **Single writer**: state converges inside the room/Actor/coroutine that owns it, and the outside reads and writes through messages—the concurrency problem turns into a boundary problem
- **Async aggregation**: statistics accumulate locally per thread and merge periodically, instead of mutating a global counter in real time

### When Locks Are Still Reasonable

Locks are not the enemy; on low-frequency paths they are perfectly reasonable: hot config reloads, GM commands, startup-time initialization, low-frequency background jobs. There is only one principle: **do not let a lock appear on the high-frequency path of the core chain that should be advancing sequentially.**

If lock contention has already happened, a sound remediation order is:

1. Locate which piece of shared state is being contended on the hot path (use pprof's mutex profile rather than guessing)
2. Decide whether that state really needs to be shared across threads
3. Prefer structural solutions first: sharding, replication, single writer, async aggregation
4. Only when the structure cannot change, do lock-granularity optimization, read-write locks, or lock-free structures

---

## Code Example: A Minimal Single-Writer Room Server Skeleton

This chapter is concept-dense and its code is scattered across the per-model sections. This section packs the three keywords—**single writer, message-driven, backpressure**—into one readable minimal skeleton. It uses exactly the "coroutine + CSP + single-threaded logic context" combination from the model spectrum: the access layer is the coroutine model, delivery goes through channels (CSP), and the inside of a room is a single-threaded logic context. The Go frameworks of Chapter 6 are almost all productized wrappers of this skeleton.

### The Room: Single-Writer Context + Bounded Queue

```go
// 房间：单写者上下文。所有状态只被 Run 这一个 goroutine 碰
type Room struct {
    id      uint64
    players map[uint64]*Player // 位置、血量、Buff——只有下面 Run 里的代码有权写
    msgCh   chan Message       // 有界队列：容量是显式设计参数，不是"内存够就行"
}

const roomQueueSize = 4096

func NewRoom(id uint64) *Room {
    return &Room{
        id:      id,
        players: make(map[uint64]*Player),
        msgCh:   make(chan Message, roomQueueSize),
    }
}

// 提交消息：满时的策略是显式选择的，而不是默默阻塞调用方
func (r *Room) Submit(msg Message) error {
    select {
    case r.msgCh <- msg:
        return nil
    default:
        return ErrRoomBusy // 背压：调用方按消息价值决定丢弃、降级还是断开
    }
}

// 唯一的写者：顺序消费消息，天然无锁、顺序确定（可重演的前提）
func (r *Room) Run(tick <-chan time.Time) {
    for {
        select {
        case msg := <-r.msgCh:
            r.handle(msg)
            r.drainPending() // 积压一口气清掉，再推进帧
            r.advanceFrame() // 定时同步、回合结算、超时判定
        case <-tick:
            r.advanceFrame() // 没消息也照常推进：世界不能因为安静而停摆
        }
    }
}

// drainPending：非阻塞清空积压，配额上限防止极端洪峰占满一整帧
func (r *Room) drainPending() {
    for i := 0; i < 256; i++ {
        select {
        case msg := <-r.msgCh:
            r.handle(msg)
        default:
            return
        }
    }
}
```

Two defensive designs worth noting: **the queue capacity is written into the code** (echoing the trio from the "Flow Control and Backpressure" section) and **the per-round processing quota** (so a message flood cannot starve frame advancement). The single writer's dividend is cashed in here—`handle` can mutate any field without a lock, and when something breaks you only read the sequential execution trace instead of suspecting concurrent interleaving.

### The Access Layer: Concurrency Happens at the Edge

```go
// 一个连接一个 goroutine（协程模型）：写法是顺序的，成本是 KB 级的
func handleConn(conn net.Conn, table *RoomTable) {
    defer conn.Close()
    for {
        msg, err := decodeMessage(conn) // "阻塞"在这里——挂起的只是这个 goroutine
        if err != nil {
            table.Route(conn.ID).Submit(Message{Kind: KindDisconnect, ConnID: conn.ID})
            return                      // 断线也作为消息投递：状态变更仍只发生在房间里
        }
        room := table.Get(msg.RoomID)   // 连接层只解码、路由，不碰任何房间状态
        if err := room.Submit(msg); errors.Is(err, ErrRoomBusy) {
            if msg.Kind == KindMove {
                continue                // 丢旧保新：位置包过期即弃（背压退化第 1 档）
            }
            conn.Close()                // 核心消息进不去：说明房间已过载到值得断连
            return
        }
    }
}
```

This is the full form of "**concurrency at the edge, serialization at the core**": the connection layer absorbs blocking and disorder, while inside the room is a deterministic, sequential world. Note how the disconnect is handled—it does not delete the player directly; it delivers a `KindDisconnect` message so the room processes the dropout at the correct position in the sequence (naturally serializing it against timing issues like "settlement in progress").

### When the Room Wants More Cores: Delegate, Do Not Lock

```go
// 房间内遇到重计算（如 200 个怪批量寻路）：不阻塞逻辑线程，委托线程池
func (r *Room) handle(msg Message) {
    switch msg.Kind {
    case KindRepathAll:
        targets := r.snapshotMovables() // 1. 单写者内取只读快照，随后立即返回
        pool.Submit(func() {
            paths := pathfinder.Batch(targets)          // 2. 线程池并行计算，不碰房间状态
            r.Submit(Message{Kind: KindPathsReady, Data: paths}) // 3. 结果以消息回房间
        }) // 提交失败走降级：直接用旧路径，绝不阻塞房间
    case KindPathsReady:
        r.applyPaths(msg.Data.([]Path)) // 4. 写状态的仍然只有 Run——锁根本没有出现
    }
}
```

This is the direct answer to the hidden cost from the "Thread Pool" section: the moment a task touches shared data you are back in the world of locks—**unless the shared data has only one writer**. Here the thread pool never writes room state directly; it only throws results back as messages, so the compute layer gets multi-core speedup while the room stays at zero locks. The hybrid architecture's division-of-labor rule (high-concurrency I/O at access, thread pool for compute, single-threaded advancement at the core) all lands in this function.

Every extension of this skeleton—multiple rooms (one `Run` per room plus a room-table router), cross-server (messages leaving the process switch to RPC while the in-room model is unchanged), persistence (dirty data goes through the async write queue)—leaves the core decision of "single writer" untouched. The next section's selection guide—by language, by game type—is essentially swapping in different implementations for this skeleton's access and compute layers.

---

## Selection Guide

### Selecting by Language/Ecosystem

```text
团队主语言是什么？
│
├─ Go ────────────► goroutine + channel（CSP）为主干
│                    房间单 goroutine 单写者，连接每连接一个协程
│
├─ Java ──────────► Netty（Reactor）做接入
│                    业务逻辑单线程化或 Actor（Akka/Orleans）
│
├─ C++ ───────────► Reactor（muduo/asio）起步
│                    确认系统调用层是瓶颈后再考虑 io_uring
│
├─ C + Lua ───────► Skynet（Actor）几乎是默认答案
│
├─ Node.js ───────► 单线程事件循环 + worker_threads 分担重活
│                    只适合轻量/卡牌/回合制形态
│
└─ Python ────────► 单线程 asyncio 起步，确认规模后再谈重构
                     （Python 做游戏后端 usually 停留在原型/小规模）
```

### Selecting by Game Type

| Game type | Connection traits | State traits | Common combination |
|---------|---------|---------|---------|
| Card/idle/turn-based | HTTP is fine, a few persistent connections | Mostly player-private | Event loop/coroutines + async persistence queue |
| SLG/strategy | Persistent connections, low frequency | Alliance-level shared state | Coroutines + sharded alliance Actors |
| MMO | Massive high-frequency persistent connections | Strong sharing within a scene | Actors/one process per scene + single thread inside the scene |
| FPS/MOBA | Room-based, hard real time | Strong sharing inside a room | Reactor gateway + single-writer tick per room |
| Match/puzzle single-player | Request-response is enough | Almost entirely private | HTTP + event loop |

### Selecting by Project Stage

- **Prototype stage**: use the model you know best to get the logic running. A single-threaded event loop or serial coroutines both work; the correct decision at this point is "don't agonize over concurrency"
- **Growth stage**: once online scale rises, the first thing to add is **room/partition isolation** (splitting players into independent single-writer contexts), not multi-threaded sharing
- **Scale stage**: only now comes cross-process splitting (separating gateway, battle, and world), thread pools to digest compute hot spots, and deep I/O-layer optimization

This order matches Chapter 6's framework spectrum: **concurrency architecture grows along with online scale; it is not drawn once at project kickoff.**

---

## Common Pitfalls Checklist

1. **Optimizing concurrency too early**. Spending two weeks early in the project designing "the perfect multi-threaded architecture" when the DAU cannot support half that complexity. Get it running first and let real load tell you where the bottleneck is.
2. **Treating coroutines as free resources**. A goroutine itself is light, but the buffers, timers, and closure references hanging off it are not. 100 thousand connections × 64KB buffer each = 6.4GB—do this arithmetic at design time.
3. **Unbounded queues**. Every `make(chan T)` defaults to unbuffered or gets a casual buffer size on a whim, never asking what happens when it fills. Give every critical queue an explicit cap and an overflow policy.
4. **Not distinguishing concurrency from parallelism**. Concurrency is "interleaving multiple tasks"; parallelism is "executing multiple tasks at the same time". A single-threaded event loop is concurrent but not parallel; a thread pool is concurrent and parallel. Only by understanding this distinction can you see why "a single thread can also hold high concurrency" and "the extra cores go unused" are both true at once.
5. **Doing heavy work on the event-loop/Reactor thread**. Synchronous DB, large serialization, complex computation—any one of them buries every connection on the same loop with it.
6. **Goroutine leaks**. A `go`-launched goroutine blocked on a channel nobody writes to; a slowly climbing goroutine count in monitoring is the classic signal—there should be a goroutine-count metric before launch.
7. **Solving lock contention by adding machines**. Horizontal scaling cannot fix a hot lock inside one process—sharding/single writer is a structure problem, adding machines is a capacity problem; they are two different things.
8. **Ignoring how GC and concurrency interact**. Large numbers of live goroutines and high-frequency allocation lengthen GC mark times, and GC pauses stop every coroutine at once. Object-pool reuse, fewer small allocations, and tuning GC parameters when necessary are all routine scale-stage homework.

---

## Practical Case: Investigating a Peak-Hour Queue Runaway Where "a Restart Fixed It"

> This case is a demonstration example (not taken from a real project); numbers are rounded and simplified, focusing on the investigation approach and the backfill logic.

**Background and symptoms**

The first evening peak after a version event launched, gateway P99 broke **3** seconds and players timed out and reconnected in batches; peak CPU was only **45**%, and memory crept up about **240**MB per peak. The on-call response was to restart the process: instant recovery, recurrence a dozen or so minutes later, three restarts in one night. Inbound traffic to the event rooms rose to **2400** messages/second and the peak lasted **10** minutes; basic monitoring never fired a single alert.

### Step 1: Symptoms and Criteria

At the same moment, three sets of criteria each told a different story:

- **Basic monitoring**: CPU 45%, memory creeping up 240MB, all inside alert thresholds—"the system is healthy";
- **Gateway and players**: P99 of 3 seconds, batch timeouts and reconnects—"the system is unusable";
- **Queue perspective**: **0** queue-depth metrics—the first scene of the pileup was never recorded; queue depth was reconstructed after the fact from message volumes.

The criteria gap was not in the numbers but in missing perspectives: **0** queue metrics left "the pileup process" as a monitoring blind spot—add the perspective first, then talk attribution.

### Step 2: Layered Attribution

Walk the message processing chain layer by layer:

```text
接入层   连接 goroutine 正常，解码与路由无积压——入口流量真实涨到 2400 条/秒
房间层   活动房间消息队列是无界切片：入 2400、消费上限 2000，净增 400 条/秒持续堆积
落库层   落库队列随房间积压同步变长——是受害者不是首因，房间先卡、落库才慢
监控层   CPU、内存、错误数都有面板，队列深度一个指标都没有——堆积过程全程不可见
```

**The ledger converges**: consumption cap = 1 second ÷ **0.5**ms = **2000** messages/second; inbound **2400** − **2000** = a net gain of **400** messages/second; a **10**-minute peak (**600** seconds) backlogs 400 × 600 = **240** thousand messages; the last message waits 240 thousand × **0.5**ms = **120** seconds, far beyond the client's **3**-second timeout—the timeout triggers retries, inbound becomes 2400 × 1.2 = **2880** messages/second, the net gain rises to **880** messages/second, and the avalanche enters a positive feedback loop; on the memory side, 240 thousand × **1**KB = **240**MB, matching the creeping curve in monitoring.

### Step 3: Root Cause

1. **Direct cause**: the event room's message queue was unbounded—`append` into a slice with no cap ever set; when inbound exceeded consumption rate the only destination was the backlog, and a restart was the only operation that could clear it.
2. **Mechanism cause**: item **3** of the pitfalls checklist's **8** items, "unbounded queues", described exactly this; none of the queue trio's **3** pieces existed—no explicit capacity cap, no overflow policy (the **4**-way choice never got made), no priority isolation; none of the degradation order's **4** layers was implemented, and at peak not even the first rung, "drop stale position packets", existed.
3. **Deeper cause**: flow control and backpressure were treated as optimization items rather than part of the architecture—in the "load-test before launch, add flow control after finding the bottleneck" sequence, a load test without degradation paths can only prove "the system dies together"; connection capacity had its fd arithmetic done at design time, but nobody did the queue's arithmetic (the same ledger as "100 thousand connections × 64KB = 6.4GB must be computed at design time"—240 thousand messages × 1KB sat in the queue where nobody saw them).

### Step 4: Remediation and Backfill

1. **Bounded queues**: the event room's message queue became a bounded channel, its cap aligned with this chapter's skeleton's **4096**—capacity is a design parameter written into the code, not "as long as memory holds out".
2. **The four-way overflow choice**: position packets drop old and keep new (the same discipline as the Piece 04 checklist; the access layer discards them outright), and when full, core messages degrade to writing a local WAL for later compensation—an explicit choice by each message's business value.
3. **The queue perspective enters monitoring**: depth, **75**% watermark, and overflow count go onto dashboards, alerting the moment the watermark crosses the line—the "pileup process" becomes visible from then on.
4. **The degradation order enters code and drills**: the degradation order's **4** layers go into the code and into peak drills—drop expirable messages first, degrade the periphery next, throttle new traffic after that, and only then touch the core.

**Recheck**: at the next peak, P99 went from **3** seconds → **180**ms, backlog from **240** thousand → **0**, and CPU was still **45**%—same compute, no more stutter.

**Backfill checklist**:

| Backfill Item | Landing Point | Back-link |
|--------|------|------|
| Bounded room queues + the four-way overflow choice | Room skeleton | Piece 05's flow-control trio / code example |
| Queue depth, watermark, and overflow count onto monitoring dashboards | Monitoring and alerting | Piece 13's monitoring reconciliation |
| The four degradation layers into peak drill plans | Capacity plans | Piece 05's degradation order / Piece 17's release drills |
| The queue capacity ledger into design-time checklists | Design checks | Piece 05's arithmetic ledger / pitfalls checklist item 3 |

### Three Lessons from the Case

1. **Low CPU does not mean healthy**—queues are the shared foundation of every concurrency model, and pileups happen before compute tops out; without queue depth in monitoring, there is effectively no overload warning.
2. **Queue capacity is a design parameter, not a runtime outcome**—the cap goes into the code and the four-way overflow choice is made explicitly by business value; "as long as memory holds out" is not having no cap, it is deferring the failure to the peak and settling all at once.
3. **Backpressure is part of the architecture, not an optimization item**—the degradation order must be designed and drilled in advance; load testing cannot make up for missing flow control: a load test without degradation paths can only prove "the system dies together".

---

## Summary

| Key question | Answer |
|---------|------|
| What must game-server concurrency solve? | Massive persistent connections + the mutually influencing shared state behind them; the second point is the essential difference from web backends |
| What are the seven models? | Single-threaded event loop, thread pool, Reactor, Proactor, Actor, coroutine, CSP |
| The most important structural principle? | Single writer: concurrency at the edge (connections/compute/periphery), with one sequential execution flow per room/partition for core logic |
| Actor vs CSP? | An Actor sends messages to a specific Actor (it knows the recipient's identity); CSP sends to a channel (sender and consumer are decoupled) |
| Reactor vs Proactor? | Reactor notifies "ready to read/write" (you do the reading); Proactor notifies "completed" (the data is already prepared) |
| What did coroutines solve? | Asynchronous non-blocking performance with synchronous blocking-style code—the cost of a concurrency unit dropped to spawn-freely levels |
| What lets a system survive overload? | Explicit queue caps + overflow policies + priority isolation + a degradation order designed in advance |
| What about lock contention? | Ask first "does this state need to be shared": sharding/replication/single writer/async aggregation, and lock optimization only last |
| Which one to pick at the start? | Use the model you know best to get a prototype running; at scale, room isolation first, then process splitting, and only then multi-threaded sharing |

## References

- [Wikipedia · Game programming](https://en.wikipedia.org/wiki/Game_programming)
- [Wikipedia · Video game engine](https://en.wikipedia.org/wiki/Video_game_engine)

<!-- BACKLINKS-AUTO -->
## Related Pages

- [expansion](expansion.md)
