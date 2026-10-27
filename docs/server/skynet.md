# Skynet: a lightweight server framework with a C kernel + Lua actors

## Category

server / horizontal node. Node positioning: the only read-through source-code walkthrough on the whole site -- it pins skynet's two-level queues, actor discipline, centisecond time wheel, and "the things deliberately not done" one segment at a time to file:line numbers, supplying first-hand evidence for the conclusions inside the runtime, services, and sync subtrees.

## Definition

> This series' "common game backend engines, source-level analysis" is a mirror of the topical notes, Part 03 (frontend engines and the client): that side reasons backwards from the client engine to server design, this side reads the server engine's source directly. Written from a shallow-cloned source read-through of the skynet repository at commit `64391f7` (2026-09-29); all citations are short excerpts marked with file:line (the MIT license allows it), and anything not found is labeled honestly as "not present in the source."
>
> Source origin: the upstream official repository `https://github.com/cloudwu/skynet` (MIT); every file:line number in this article is based on commit `64391f7`.

## Problem

Reading a framework's source most often stops at "I understood it, so we move on": you know skynet is actor-based, yet you cannot say why services need no internal locks, why timers only have centisecond precision, or which solutions must be self-built when persistence and service discovery are missing. Those three points happen to be the premises that the runtime (execution model), services (service splitting), and sync (time model) subtrees repeatedly cite -- when a conclusion has no citation, review can only argue about wording.

This node pins every conclusion back to a file:line number anchored to a commit, so judgments like "why services can be lock-free internally" and "why frame sync should not be built on it" can be verified line by line. The body follows source-reading order; the section numbers (sections 1-13) are cited directly by other nodes on the site, so section order and section numbers must stay unchanged when editing.

## Algorithm

### 1. Repository positioning and technology stack

skynet is the **lightweight game server framework** open-sourced by Cloudwu (Yunfeng): the C kernel provides the actor runtime (message scheduling, networking, timers), and business logic is written in Lua as one service after another. The repository is restrained in size -- roughly 7000 lines for the C core (`skynet-src/`), roughly 15,000 lines for the Lua layer (`lualib/` + `service/`), and both sides can be read completely. Third-party dependencies are just as restrained: a bundled Lua (`3rd/lua/`), jemalloc, lpeg, and so on (the `3rd/` directory).

- License: MIT (`LICENSE`, Copyright 2012-2025 codingnow.com)
- Languages: C kernel + Lua business logic; the build target is one executable plus a set of shared libraries
- IO multiplexing: epoll on Linux (`skynet-src/socket_epoll.h`), kqueue on BSD/macOS (`socket_kqueue.h`)
- Application protocol ecosystem: sproto (`lualib/sproto.lua`) as the mainstay, plus generic formats such as JSON

It is a "framework," not an "engine": it has none of the game engine components such as entity sync, AOI, or an account system (not present in the source). It answers a single question -- **how to schedule hundreds or thousands of concurrent services inside one process**.

### 2. Process/thread model

skynet is **single-process multi-threaded**. The thread topology is laid out in one go inside `start(thread)` at `skynet_start.c:187`: `pthread_t pid[thread+3]` (`skynet_start.c:188`), that is, **thread workers + 3 fixed threads**:

| Thread | Count | Responsibility | Source |
|------|------|------|------|
| monitor | 1 | Polls every 5 seconds to check whether any worker is stuck | `skynet_start.c:95` |
| timer | 1 | The 2500-microsecond metronome source, driving timers and system time | `skynet_start.c:131`, `usleep(2500)` at `:140` |
| socket | 1 | Runs the IO multiplexing event loop | `skynet_start.c:64` |
| worker | the config item `thread` (8 in the example config) | Grabs a service queue from the global queue and runs message callbacks | `skynet_start.c:157` |

Workers with no work sleep on a condition variable and are woken by the socket/timer threads via `wakeup` (`skynet_start.c:55-61`). Compared with a "one process per connection / one thread per connection" model, skynet decouples the thread count from the connection count: threads serve messages only and are never bound to connections.

Workers have **weighted division of labor** (`skynet_start.c:213-217`): the first 4 have weight=-1 (each processes only 1 message, preventing a long queue from monopolizing them), and thereafter weights climb 0/1/2/3 (processing at most `queue length >> weight` messages per round, `skynet_server.c:316-318`). Low-weight workers guarantee fairness for interactive messages; high-weight workers raise batch throughput.

### 3. Startup flow (from main to service readiness)

The C-side order (`skynet_start` at `skynet_start.c:266`):

```text
harbor_init → handle_init → mq_init → module_init(模块搜索路径)
→ timer_init → socket_init → 创建 logger 服务并命名 ".logger"
→ bootstrap(logger, config->bootstrap)   // 解析 "snlua bootstrap" 启动引导服务
→ start(thread)                          // 起全部线程
→ 退出时 harbor_exit → socket_free → daemon_exit
```

`bootstrap` (`skynet_start.c:237-258`) splits the config string into "service name + arguments," then calls `skynet_context_new("snlua", "bootstrap")` -- that is, it uses the C service **snlua** (`service-src/service_snlua.c`) to bring up a Lua service. snlua's loading chain: create a lua_State and `luaL_openlibs` (`service_snlua.c:390`) -> run the loader script (`luaL_loadfile` at `:428`, `lua_pcall` at `:435`) -> `lualib/loader.lua` locates `service/bootstrap.lua` using the `LUA_SERVICE` pattern (`loader.lua:8-20`).

Lua bootstrap (`service/bootstrap.lua`):

```lua
local launcher = assert(skynet.launch("snlua","launcher"))   -- :7，命名 .launcher
-- harbor == 0：单机模式，起 cdummy 充当 .cslave（:11-19）
-- harbor != 0：standalone 时起 cmaster，随后各节点起 cslave（:21-33）
skynet.newservice "service_mgr"                              -- :40
pcall(skynet.newservice, skynet.getenv "start" or "main")    -- :50，启动业务入口
```

Only once the Lua service pointed to by `start` is running and its listening port is ready is the service considered ready. The example entry point `examples/main.lua:6-21` brings up debug_console, simpledb, and watchdog in turn, and has watchdog listen on 8888.

### 4. Network layer (acceptor / connection management / codec)

**Event loop**: the socket thread repeatedly calls `skynet_socket_poll` (`skynet_socket.c:79`) -> `socket_server_poll` (`socket_server.c:1708`). Ready descriptors are reported by epoll/kqueue (`EPOLLIN`/`EPOLLOUT` control at `socket_epoll.h:31-49`); control commands travel over a self-pipe read with `select` (`recvctrl_fd` at `socket_server.c:1295`) -- business threads write to the pipe to issue connect/listen/close commands to the network thread, and the network thread emits events only, with reads and writes all converging in one thread.

**Events to messages**: network events are uniformly packaged as dispatchable `forward_message`s (`skynet_socket.c:39`), covering `SKYNET_SOCKET_TYPE_DATA / CLOSE / CONNECT / ERROR / ACCEPT / UDP / WARNING` (`skynet_socket.c:89-107`), and delivered as `PTYPE_SOCKET` (`skynet.h:15`) to the target service. **Networking is messaging**: accept, readable, and disconnect are one and the same thing from a Lua service's point of view.

**The officially endorsed connection-management posture** is a three-piece set of C-level gate + Lua-level watchdog/agent:

- gate (`service-src/service_gate.c`) holds the `listen_id` (`:25`) and is responsible for listen and rate limiting; on receiving a `forward` command it binds a given fd to a specified agent (`:112-126` `_forward_agent`)
- watchdog (`examples/watchdog.lua:9-14`) calls `skynet.newservice("agent")` on receiving `SOCKET.open`, opening one dedicated agent service for that connection
- agent (`examples/agent.lua:87`) calls `gate`'s `forward`, after which that client's traffic is delivered straight to the agent -- **connections map one-to-one to actors**, and business logic is isolated by construction

**Codec**: packet de-framing is done on the C side by the netpack module (`lualib-src/lua-netpack.c`) -- the frame format is "uint16 big-endian length + data," as stated in the file-header comment "Each package is uint16 + data" (`:28`), with the packing side at `:436`; the application-layer protocol ecosystem is represented by sproto (`lualib/sproto.lua`). This is the C-side implementation slot corresponding to the topical notes Part 03 section 2.2 "protocol three-piece set": the de-framer lives inside the engine, while the protocol definition files remain the single shared source on both ends.

### 5. Message dispatch and routing

**Message header**: `skynet.h:9-26` defines the message types -- `PTYPE_TEXT` (0), `PTYPE_RESPONSE` (1, the RPC reply), `PTYPE_CLIENT` (3, client traffic), `PTYPE_SOCKET` (6), `PTYPE_LUA` (10), and so on; the type number is stored in the high bits of the message length (`MESSAGE_TYPE_SHIFT`), and a `skynet_message` is just `source + session + pointer`, with a clear zero-copy lean.

**Two-level queues**: every service has a private `message_queue`, and there is one global `global_queue` (`skynet_mq.c:35-41`). Enqueueing `skynet_mq_push` (`:190`) pushes the service queue into the global queue; dequeueing `skynet_mq_pop` (`:138`) is performed by a worker; each level holds one spinlock (`:22`, `:38`) -- these are the only two lock-contention points in the whole kernel.

**Dispatch loop**: `skynet_context_message_dispatch` at `skynet_server.c:293` pops one service queue from the global queue -> `skynet_handle_grab` finds the service context -> messages are popped in batches according to weight -> `dispatch_message` (`:256-281`) invokes the callback registered by the service, `ctx->cb`, with CPU profile statistics and a message log hook. When the callback returns 0, the framework takes responsibility for freeing the message memory (the `reserve_msg` convention).

**Addressing and routing**: a service address `handle` is a 32-bit integer, with the high bits as the harbor id (`HANDLE_REMOTE_SHIFT` in `skynet_imp.h`) and the low bits as the local slot. Local registration finds a free slot by linear probing and doubles the table when full (`skynet_handle.c:91-127`); `skynet_send` (`skynet_server.c:696`) delivers by handle, and `skynet_sendname` (`:742`) resolves by `.name` and then delivers. Cross-machine messages are handed to the harbor service (`service-src/service_harbor.c`, configured with `harbor = 1`); larger scale uses the cluster components (the `service/clusterd.lua` family, a four-piece set of master/slave/agent/sender).

### 6. Concurrency model (actor / threads / coroutines)

skynet's concurrency philosophy in one sentence: **serial within a service, messaging between services, coroutines for waiting**.

- **Actor seriality**: only one message callback of a service runs at a time (`dispatch_message` has `CHECKCALLING` assertion protection, `skynet_server.c:256-281`), so no locks are needed inside a service
- **Cross-service communication**: only `skynet.send` (`lualib/skynet.lua:694`, fire-and-forget) and `skynet.call` (`:728`, request-response)
- **Coroutineified RPC**: `call` uses sessions to associate coroutines internally -- four mapping tables including `session_id_coroutine` (`lualib/skynet.lua:61-64`) record "which session is waiting on which coroutine," and the corresponding coroutine is woken when the `PTYPE_RESPONSE` reply arrives. Lua coroutines let "send request, wait for reply" be written in synchronous style, so callbacks do not propagate
- **Auxiliary primitives**: `skynet.sleep` (`:517`), `skynet.wait` (`:537`), `skynet.timeout` (`:497`), `skynet.fork` (the fork queue is defined at `:72`, enqueued at `:896-898`)

The implication for server designers: **business code reads like blocking code but runs event-driven** -- the "coroutine approach" from the topical notes Part 05 has a complete worked implementation here, at the cost that any forgotten `skynet.ret` leaves the coroutine hanging forever (the framework reports a `SUSPEND` error after observing a hang across several dispatch rounds, around `lualib/skynet.lua:450`).

### 7. Timers and the main loop

skynet has no business main loop -- **the timer thread is the metronome source** (`skynet_start.c:131-157`): every 2.5ms it calls `skynet_updatetime` (`skynet_timer.c:246`), advancing system time and timers.

The timer structure is a **five-level time wheel**: the precision comment reads "centisecond: 1/100 second" (`skynet_timer.c:226`), with a near ring of 256 slots plus four outer rings of 64 slots each (constants at `:17-22`, structure at `:40-41`). `timer_add` (`:89-99`) hands an expiring event to `add_node` (`:68-86`), which chains it at the level matching its expiry time; `timer_update` (`:166-178`) runs "dispatch first, then carry over, then dispatch" each centisecond -- first `timer_execute` (`:153-163`) sweeps out the very few events expiring at 0 centiseconds, then `timer_shift` (`:112-132`) migrates fully walked near-ring slots down from the higher levels, and finally it dispatches the events expiring in this centisecond. Expiry dispatch is still in the form of a message: `dispatch_list` (`:135-150`) delivers an empty `PTYPE_RESPONSE` message (the session is the timer id) to the target service -- timers introduce no new dispatch channel and reuse the queues from section 5. The service-side registration entry point is `skynet_timeout` (`:205`): a non-positive expiry is delivered as `PTYPE_RESPONSE` outright, otherwise it enters the time wheel. The Lua wrappers are `skynet.timeout/sleep` (`lualib/skynet.lua:497/517`).

The secret behind the non-drifting beat is in `skynet_updatetime` (`:246-260`): it multiplies `CLOCK_MONOTONIC` by 100 to get centiseconds (`gettime`, `:236-243`), and after differencing against the previous time point it **loops to make up ticks** -- how long `usleep(2500)` actually sleeps does not matter; however many centiseconds are short, that many rounds of `timer_update` are run. The business layer need not perceive thread scheduling jitter; this is first-hand material in server timer implementation worth copying directly.

**Server-side tip**: centiseconds are the precision ceiling for business timers -- more than enough for minute- or second-level tasks like heartbeats, event switches, and daily resets; sub-10ms hard-real-time logic such as frame sync should not be built on it (compare the topical notes Part 03 section 2.1 timeout derivation: for the "server processing headroom" item in threshold design, centisecond granularity suffices in this framework).

### 8. Persistence

**skynet proper provides no persistence** -- there is no storage component anywhere in `skynet-src/` (not present in the source). This is a boundary, not a defect: skynet makes "the in-memory actor world" solid and leaves hitting the database to business code:

- Database client libraries: `redis.lua`, `mysql.lua`, `mongo.lua` under `lualib/skynet/db/`, all built on top of `lualib/skynet/socketchannel.lua` -- the channel factory is at `:26`, `connect` (`:474`) comes with reconnection, `request` (`:510`) associates responses by session, and the consumer side supports two models: dispatch by session (`dispatch_by_session`, `:96`) and single-threaded in-order dispatch (`dispatch_by_order`, `:194`). The dirty work of connection management, disconnection reconnection, and request-response pairing is all done at the channel layer, leaving each database client with only protocol encoding and decoding
- Example services: `examples/main_mongodb.lua`, `examples/main_mysql.lua`; the in-memory key-value example `simpledb` (brought up at `examples/main.lua:17`)
- For hot data shared across services use sharedata/sharetable (`lualib/skynet/sharedata.lua`, `sharetable.lua`), still at the in-memory layer -- sharedata provides read-only shared tables, sharetable supports whole-table hot-load replacement, and neither writes to disk

The design implication is the same topic as the topical notes Part 03 section 1.1 "authority belongs to the server": state authority lives in server memory, and **the timing of persistence, reconciliation, and the rollback window are all explicitly designed by the business layer** -- the framework neither covers for you nor pretends to cover for you.

### 9. Build and minimal run

```bash
make linux          # 产物：skynet 可执行 + cservice/*.so（C 服务）+ luaclib/*.so（C Lua 模块）
./skynet examples/config
```

The key fields of the example config (`examples/config:4-12`):

```text
thread = 8                    # worker 线程数
harbor = 1                    # 节点 id；0 为单机模式
start = "main"                # 业务入口服务
bootstrap = "snlua bootstrap" # 引导服务
standalone = "0.0.0.0:2013"   # master 地址（多节点时）
```

A minimal business service needs only one Lua file: `skynet.start(function() ... end)` registers the callback, `skynet.dispatch("lua", ...)` handles messages, and `skynet.ret(skynet.pack(...))` replies (`examples/watchdog.lua:48-56` has the dispatch skeleton).

On the C side only 8 config keys are actually parsed (`skynet_main.c:159-171`): `thread` (worker count, range 1 to `SKYNET_MAXTHREAD`), `cpath` (C service module search path), `harbor`, `bootstrap`, `daemon`, `logger`/`logservice`, `profile`; the remaining keys (`start`, `standalone`, `master`, `address`, etc.) are picked up by the Lua side via `skynet.getenv` -- `bootstrap.lua:5` reads `standalone` on its very first line. The config system thus splits into two layers: the C kernel only cares about scheduling and IO parameters, and all business parameters are left to the Lua world.

Drop a minimal skeleton into a file, place it in the search path according to the `LUA_SERVICE` pattern, and point `start` at it -- that is the end of the startup chain in section 3:

```lua
local skynet = require "skynet"

skynet.start(function()
    skynet.error("hello from a minimal service")
    skynet.exit()
end)
```

### 10. Design appraisal: gains and losses

**Gains**:

- **Controlled code volume, readable through end to end** -- the C kernel explains actor scheduling in about 7000 lines, so when something breaks you can read the source instead of guessing
- **Clean coroutineified RPC semantics** -- sessions plus coroutine tables let the Lua side write synchronous-style asynchronous code; callback hell does not exist
- **Single-threaded network layer** -- IO events converge into one thread, connection management has no lock contention, and behavior is predictable
- **Weighted worker scheduling** -- within one process it serves both low-latency interaction and batch work at once, a rare refinement

**Losses**:

- **Single-process in-memory world, distribution assembled by yourself** -- multi-machine requires understanding the whole harbor/cmaster/cslave/clusterd chain (`service/bootstrap.lua:10-40`), and the conceptual burden sits on the user side
- **Centisecond timer precision** -- unsuitable for hard-real-time scenarios, requiring a separate high-precision solution
- **Missing engineering tooling** -- service discovery, metrics, tracing, and persistence frameworks are all unbuilt (not present in the source), so productionization needs a lot of self-building
- **Lua GC and message-passing cost** -- passing large tables across services triggers a serialization copy, and large-object sharing has to route around via components like sharedata

**Compared with peers**: KBEngine (a C++ distributed engine) ships space management, entity sync, and an account system built in, usable out of the box but with a fixed shape; skynet goes the opposite way -- it gives only scheduling and IO, and the shape of the business is yours to mold. Pomelo (Node.js) is likewise an actor-style framework, but a JS single-threaded event loop lacks skynet's multi-worker queue grabbing, so the throughput model differs. TrinityCore is a monolithic MMO-specific server, and it is not interchangeable with skynet's "general framework" positioning. Back to the selection caliber in the topical notes Part 03 chapter 6: skynet sits on the "light framework + self-built tooling" end, and the team's engineering capability sets the ceiling; if you want the full set, choose a heavy engine, and if you want freedom, choose skynet -- it hands you the choice together with the responsibility.

### 11. Comparison with other engines

A structural contrast of the four engines (only facts directly verifiable from source structure are included; per-engine details follow the corresponding articles in this series):

| Dimension | skynet | KBEngine | TrinityCore | Pomelo |
|------|--------|----------|-------------|--------|
| Process model | Single process with N workers + 3 fixed threads (`skynet_start.c:187-235`) | Multi-process topology: baseapp/cellapp/loginapp/dbmgr/baseappmgr/cellappmgr/machine each with its own role (the `kbe/src/server/` directory is itself the process list) | Two processes, worldserver + bnetserver (`src/server/worldserver`, `src/server/bnetserver`) | master/monitor process management + role-split frontend/backend (`lib/components/master.js`, `monitor.js`, `connector.js`, `backendSession.js`) |
| Concurrency model | actor + Lua coroutines, serial within a service | Multi-threaded within a process + entity event callbacks | Main update loop + map update thread pool (`src/server/game/Maps/MapUpdater.h`), networking via boost::asio (`src/server/shared/Networking`) | Node.js single-threaded event loop, RPC between processes |
| Networking and de-framing | Single socket thread + netpack (uint16 big-endian length frames) | Engine-builtin network layer and message de-framing (`kbe/src/lib/network`), oriented at entity events | boost::asio async sockets | Connector layer with builtin multi-protocol connectors (`lib/connectors/`) |
| Script layer / hot update | Lua is hot update, native to the language | Python entity scripts (`kbe/src/lib/pyscript`); grepping the server source for Reload yields no hits, updates go through restart | No script engine built in (not present in the source), logic extension goes through C++ compilation | No native hot update in JS, restart-based |
| AOI / space | None (self-built) | Builtin witness + range_trigger (`kbe/src/server/cellapp/witness.h`, `range_trigger_node.h`) | Builtin maps and grid management (`src/server/game/Maps/`, an MMO single-scene specialization) | None (self-built) |
| Learning cost | Low -- the kernel is small, but actor discipline must be understood | Medium-high -- cell/base/mailbox/entitydef are a large concept surface | High -- heavy C++ build chain + data import | Low -- the JS ecosystem is plug and play |
| Ecosystem and current state | Chinese-speaking community as the mainstay, continuously maintained by Cloudwu | Community open source, Chinese and English documentation | World of Warcraft server community, large accumulation of data and scripts | Last upstream commit 2019-11 (shallow-clone HEAD), activity doubtful |
| Performance characteristics | High-concurrency long connections, stable in-memory throughput | Space sync overhead in exchange for MMO semantics | Heavy single-scene simulation, CPU intensive | V8 single-threaded throughput ceiling |

### 12. Design pros, cons, and trade-offs

Every design choice in skynet is an explicit ledger entry of "trading X for Y":

- **C kernel + Lua services, a two-language division** -- Gains: hot paths such as scheduling, networking, and timers are all C, so performance is controllable; all business lives in Lua, so changes take effect without recompilation. Costs: two mental models, hot loops land in Lua and become slow, and the cross-language boundary (the C modules under `lualib-src/`) is an extra maintenance surface
- **Service = resident Lua VM** -- Gains: services are isolated by nature (one service misbehaving does not spread to others), and the kernel only ever sees handles and queues, with a uniform unit of scheduling. Costs: a per-service VM memory baseline, memory amplification when services are finely grained at massive scale, so business must control service granularity according to load
- **Message passing rather than shared memory** -- Gains: lock-free business code (serial-within-service is guaranteed by the kernel), and a much narrower surface for concurrency defects. Costs: large data across services must be serialized and copied, and read-heavy/write-light data has to route around via sharedata/sharetable (section 8) -- this is a real performance tax
- **Single socket thread** -- Gains: zero lock contention in connection management, predictable event ordering, and only one path to investigate for network problems. Costs: the network thread is a single point, and the throughput ceiling is locked to one core's epoll loop -- skynet's answer is to push "everything after receiving data" onto the worker pool and do nothing itself but forwarding (`forward_message`, `skynet_socket.c:39`)
- **No builtin persistence / service discovery / metrics** -- Gains: the readability of a roughly 7000-line kernel, and room to freely combine whatever storage and operations stack each team uses. Costs: all productionization tooling is self-built, and for a new team the distance from "it runs" to "it can ship" is longer than with a full-set engine
- **Coroutine RPC** -- Gains: synchronous-style async (section 6), and callbacks do not propagate. Costs: a discipline cost -- a missed `skynet.ret` and the coroutine hangs, and this must be caught by monitoring rather than by syntax

The trade-off logic in one sentence: skynet builds "the correct concurrency structure" into the kernel and hands the choice over "performance, operations, and storage" to the user -- it is betting on the user's engineering capability, which is at once the source of the freedom and the barrier to entry.

### 13. Suitable game scenarios

Match by gameplay trait, and give a clear verdict:

**Suitable, and a sound default:**

- **Card / turn-based / board games** -- the textbook request-response workload, naturally matching `skynet.call`'s coroutine RPC and the serial-within-service combat settlement; a single-process in-memory world is enough to carry one card set's rooms and matchmaking
- **SLG / idle / management simulation** -- lots of low-frequency state updates plus scheduled tasks (harvesting, resupply, season reset), and the time wheel's centisecond granularity is more than enough (section 7)
- **IO-intensive long-connection services** -- chat, push, announcements, matchmaking pools, gateway aggregation: netpack de-framing plus one-service-per-connection agent is exactly the native form of the gate/watchdog/agent three-piece set (section 4)

**Feasible, but be clear about the self-building cost:**

- **Room-based competitive play (in-round MOBA / FPS matches)** -- frame-driven advancement must be self-built on top of the message loop (driving ticks with `skynet.timeout` requires evaluating whether centisecond granularity is enough), and hard-real-time matches are better served by a dedicated match-server solution; room management and matchmaking are still a good fit for skynet
- **Small-to-mid-scale MMO** -- AOI and entity management are not in the framework (section 1's "not present in the source" list), so they must be self-built or taken in as components; the social, guild, and mail parts that are not spatial are a good fit for skynet

**Not suitable, and an explicit dissuasion:**

- **Heavy physics / hard 3D server-side simulation** -- Lua is not fit for dense floating point and physics integration, and the framework has no space or physics facilities at all; pick a C++ engine shape (KBEngine/TrinityCore, for example) or a dedicated physics server for this class of workload
- **Sub-10ms real-time sync** -- the latency class of a centisecond timer plus message scheduling does not support it; frame sync servers with a hard requirement on tick precision should start a separate solution
- **Expecting an out-of-the-box full set, with no team intention to build tooling** -- skynet's freedom is conditional on engineering capability (section 12), and without that investment choose a solution with engine facilities

The closing verdict: if the gameplay is request-response or state-aggregation shaped, skynet's design is shaped for it; if the gameplay eats computational precision or spatial semantics, switch to an engine that has those facilities.

## Used By

- The three server subtrees cite this article back: [Execution model and runtime](/server/runtime/00) for the stance overview, [Service splitting and the control plane](/server/services/01) for "split by role, not by process," and [Tick and time advancement](/server/sync/01) for the time source -- all three cite back by subsection (sections 2, 5, and 7)
- Gameplay-system landing points: the single-writer service semantics of [Leaderboard](/system/leaderboard), the resident broker actor of [PVP matchmaking](/system/pvp-matchmaking), and the serial-within-service broker pool of [Party matchmaking](/system/party-matchmaking)
- The tree root places this article alongside [AOI](/server/aoi) as the two horizontal nodes of the server tree: one answers "how does a process schedule a thousand services," the other answers "how is the co-visible set cropped"; section 8 here happens to show that both fall outside the framework's boundary

## Related

The dependency chain: repository positioning -> threads and queues -> startup chain -> network layer -> dispatch and routing -> concurrency model -> timers and the main loop -> persistence boundary -> build and minimal run -> appraisal -> horizontal comparison -> trade-offs -> applicable scenarios. Each segment answers "why is the next one needed":

- Positioning comes before implementation: section 1 first states what it does not do, so every later "not built in" is a boundary and not an omission
- Threads and two-level queues are the foundation of the whole page: dispatch, concurrency model, and timers all reuse the queues from section 5, with no second mechanism
- The persistence section gives a negative constraint: the framework does not cover for you, so the timing of persistence and the reconciliation window must be explicitly designed by business code -- this is exactly the boundary between the database tree and the runtime tree
- The horizontal comparison comes after the appraisal: only after reviewing it yourself once and then lining it up against four engines will the conclusion not be dragged along by the comparison table

Sister nodes: [AOI](/server/aoi) (the half that skynet explicitly does not build in and requires self-building), [Execution model and runtime](/server/runtime/), [Service splitting and the control plane](/server/services/); this article is a mirror of the topical notes Part 03 (frontend engines and the client), where that side reasons backwards to server design and this side reads the server framework's source.

## Reference

- Upstream official repository `https://github.com/cloudwu/skynet` (MIT, Copyright 2012-2025 codingnow.com); every file:line number in this article is based on commit `64391f7` (2026-09-29 shallow clone)
- Other nodes on the site that cite skynet anchor to the commit at the time of their own verification (for example `64391f7`); after switching commits, line numbers may drift, so when verifying use the commit labeled at the citation site
- Terminology cross-reference: Service (a service = one resident Lua VM), Message Queue (a service's private queue), Global Queue (the global queue), Harbor (node id), Cluster (the cluster component), Centisecond Time Wheel (centisecond time wheel), Agent (a connection-dedicated service)
- This page is a synthesis of engineering experience; the practical case in the page is a demonstration example (numbers rounded and simplified)

### Practical case: triaging a boundary misjudgment of "frame sync built on skynet, tick precision insufficient"

> This case is a demonstration example (not drawn from a real project), with numbers rounded and simplified. It pushes section 7's centisecond precision and section 13's applicable scenarios into deep water: a general framework treated as a dedicated match server -- this is the triage of a boundary misjudgment, and also a full unfolding of "how to let a framework's boundary become the basis for selection."

**Background and symptoms**: a team built frame sync matches on skynet; after launch, tick jitter was **20** milliseconds and the two sides' tempo could not be aligned. Investigation found the centisecond timer precision and the message scheduling jitter stacked, and the sub-**10** millisecond hard-real-time that frame sync requires is not something this framework can deliver.

### Step 1: symptoms and caliber -- first sort out which layer is insufficient

Precision caliber: the timer is centisecond precision (**1/100** of a second), and frame sync wants sub-**10** milliseconds -- the precision ceiling differs by an order of magnitude.

Scheduling caliber: messages pass through two-level queues, and workers grab queues by weight, so scheduling jitter stacks onto the tick.

Memory caliber: a service is a resident Lua VM, with a per-service VM memory baseline; memory amplifies when service granularity is not controlled by load.

### Step 2: layered attribution -- check against this page's boundary list

```text
tick 抖动归因  占比
  厘秒精度不满足亚 10ms 帧同步     55%
  消息调度抖动叠加                 27%
  服务粒度没按负载控制，内存放大    18%
```

Comparing item by item: centisecond precision differs by an order of magnitude -- hits "sub-10ms hard-real-time logic such as frame sync should not be built on it"; scheduling jitter -- hits the two-level queues where workers grabbing queues jitter; memory amplification -- hits "a per-service VM memory baseline, memory amplification when services are finely grained at massive scale."

### Step 3: root cause -- a general framework was treated as a dedicated match server

skynet builds "the correct concurrency structure" into the kernel and hands the choice over "performance, operations, and storage" to the user -- it is betting on the user's engineering capability. Frame sync matches are a sub-**10** millisecond hard-real-time workload, and the latency class of a centisecond timer plus message scheduling does not support it; this class of workload should use a dedicated match server or a C++ engine shape.

### Step 4: remediation and backfill -- put each thing in its place, and set up tooling projects

1. Migrate frame sync matches out: move to a dedicated match server solution, and keep skynet for request-response and state-aggregation gameplay (cards, SLG, IO-intensive long connections).
2. Control service granularity by load: converge fine-grained services and bring the memory baseline back into a reasonable range.
3. Set up self-built tooling projects: service discovery, metrics, tracing, and the persistence framework are established as formal projects and are not written into business services.
4. Match applicable scenarios: if the gameplay eats computational precision or spatial semantics, switch to an engine with those facilities; skynet's freedom is conditional on engineering capability.

Verification ledger: tick jitter **20** milliseconds -> dedicated match server **2** milliseconds; service granularity on the skynet side converged by **30**%; **8** self-built tooling items established as projects.

**Backfill checklist**:

| Backfill item | Action | Backfill location |
|-----|------|--------|
| Precision boundary | Centisecond timers do not carry sub-10ms frame sync | Algorithm |
| Applicable scenarios | Keep request-response and state-aggregation on skynet, migrate hard-real-time out | Algorithm |
| Service granularity | Control granularity by load and converge fine-grained services | Problem |
| Tooling projects | Establish service discovery / metrics / tracing / persistence as formal projects | Reference |

### Three lessons from the case

1. **A framework's boundary is the basis for selection**. Centisecond precision plus message scheduling does not support sub-10ms frame sync, and a general framework cannot stand in for a dedicated match server.
2. **Freedom is conditional on engineering capability**. skynet hands the choice over performance, operations, and storage to the user, and tooling must be established as formal projects.
3. **Service granularity is a memory ledger**. Each service is a resident Lua VM, and memory amplifies when fine-grained services are numerous.

## References

- [GitHub · cloudwu/skynet](https://github.com/cloudwu/skynet)
- [Wikipedia · Actor model](https://en.wikipedia.org/wiki/Actor_model)

<!-- BACKLINKS-AUTO -->
## Related pages

- [10](/glossary/10.md)
- [knowledge](/knowledge.md)
- [02-engine-middleware-docs](/research/02-engine-middleware-docs.md)
- [index](index.md)
- [map](map.md)
- [leaderboard](/system/leaderboard.md)
- [party-matchmaking](/system/party-matchmaking.md)
- [pvp-matchmaking](/system/pvp-matchmaking.md)
