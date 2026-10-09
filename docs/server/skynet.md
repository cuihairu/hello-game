# Skynet：C 内核 + Lua Actor 的轻量服务端框架

## Category

server / 横向节点。节点定位：全站唯一一篇通读式源码解析——把 skynet 的两级队列、actor 纪律、厘秒时间轮与「哪些东西刻意不做」逐段钉在文件:行号上，为 runtime、services、sync 三棵子树里的结论提供第一手依据。

## Definition

> 本系列「常见游戏后端引擎源码级解析」与教程第 03 讲（前端引擎与客户端）互为镜像：那边讲客户端引擎如何反推服务端设计，这边直接读服务端引擎的源码。本文基于 skynet 仓库 commit `64391f7`（2026-09-29）浅克隆源码通读写成，引用均为短摘引并标注 文件:行号（MIT 协议允许）；查不到的内容如实标注「未见于源码」。
>
> 源码出处：上游官方仓 `https://github.com/cloudwu/skynet`（MIT），本文所有 文件:行号 均基于 commit `64391f7`。

## Problem

读框架源码最容易停在「看懂了就过」：知道 skynet 是 actor，却说不出服务内为什么不用加锁、定时器为什么只有厘秒精度、缺持久化与服务发现时哪些方案要自建。这三点恰好是 runtime（执行模型）、services（服务拆分）、sync（时间模型）三棵子树反复引用的前提——结论没有出处，评审就只能争口径。

本节点把每个结论钉回 commit 锚定的文件:行号，让「为什么服务内可以无锁」「为什么帧同步不该建在它上面」这类判断可以被逐条复核；正文按源码阅读顺序排列，节号（第 1~13 节）被站内其他节点直接引用，改动时保持节序与节号不变。

## Algorithm

### 1. 仓库定位与技术栈

skynet 是云风开源的**轻量级游戏服务端框架**：C 内核提供 actor 运行时（消息调度、网络、定时器），业务逻辑用 Lua 写成一个个服务。仓库规模克制——C 核心（`skynet-src/`）约 7000 行，Lua 层（`lualib/` + `service/`）约 1.5 万行，两边都可以完整通读。第三方依赖同样克制：内置 Lua（`3rd/lua/`）、jemalloc、lpeg 等（`3rd/` 目录）。

- 协议：MIT（`LICENSE`，Copyright 2012-2025 codingnow.com）
- 语言：C 内核 + Lua 业务；构建目标为单可执行文件加一组动态库
- IO 多路复用：Linux 用 epoll（`skynet-src/socket_epoll.h`），BSD/macOS 用 kqueue（`socket_kqueue.h`）
- 应用协议生态：sproto（`lualib/sproto.lua`）为主，另有 JSON 等通用格式

它不是「引擎」而是「框架」：没有实体同步、AOI、账号体系这些游戏引擎组件（未见于源码），它只回答一个问题——**一个进程里如何调度成百上千个并发服务**。

### 2. 进程/线程模型

skynet 是**单进程多线程**。线程拓扑在 `skynet_start.c:187` 的 `start(thread)` 里一次铺开：`pthread_t pid[thread+3]`（`skynet_start.c:188`），即 **thread 个 worker + 3 个固定线程**：

| 线程 | 数量 | 职责 | 出处 |
|------|------|------|------|
| monitor | 1 | 每 5 秒轮询检查各 worker 是否卡死 | `skynet_start.c:95` |
| timer | 1 | 2500 微秒一轮的节拍源，驱动定时器与系统时间 | `skynet_start.c:131`，`usleep(2500)` 在 `:140` |
| socket | 1 | 跑 IO 多路复用事件循环 | `skynet_start.c:64` |
| worker | 配置项 `thread`（示例配置 8） | 从全局队列抢服务队列、执行消息回调 | `skynet_start.c:157` |

worker 无活可干时靠条件变量睡眠，由 socket/timer 线程 `wakeup`（`skynet_start.c:55-61`）。与「每连接一进程/一线程」的模型相比，skynet 的线程数与连接数解耦：线程只服务消息，不绑定连接。

worker 之间有**权重分工**（`skynet_start.c:213-217`）：前 4 个 weight=-1（每次只处理 1 条，防止长队霸占），随后按 0/1/2/3 递增（一次最多处理 `队列长度 >> weight` 条，`skynet_server.c:316-318`）。低权 worker 保证交互类消息的公平，高权 worker 提升批量吞吐。

### 3. 启动流程（main 到服务就绪）

C 侧顺序（`skynet_start.c:266` 的 `skynet_start`）：

```text
harbor_init → handle_init → mq_init → module_init(模块搜索路径)
→ timer_init → socket_init → 创建 logger 服务并命名 ".logger"
→ bootstrap(logger, config->bootstrap)   // 解析 "snlua bootstrap" 启动引导服务
→ start(thread)                          // 起全部线程
→ 退出时 harbor_exit → socket_free → daemon_exit
```

`bootstrap`（`skynet_start.c:237-258`）把配置串拆成「服务名 + 参数」后 `skynet_context_new("snlua", "bootstrap")`——即用 C 服务 **snlua**（`service-src/service_snlua.c`）起一个 Lua 服务。snlua 的装载链条：新建 lua_State 并 `luaL_openlibs`（`service_snlua.c:390`）→ 执行 loader 脚本（`luaL_loadfile` 在 `:428`，`lua_pcall` 在 `:435`）→ `lualib/loader.lua` 按 `LUA_SERVICE` 模式串定位到 `service/bootstrap.lua`（`loader.lua:8-20`）。

Lua 引导（`service/bootstrap.lua`）：

```lua
local launcher = assert(skynet.launch("snlua","launcher"))   -- :7，命名 .launcher
-- harbor == 0：单机模式，起 cdummy 充当 .cslave（:11-19）
-- harbor != 0：standalone 时起 cmaster，随后各节点起 cslave（:21-33）
skynet.newservice "service_mgr"                              -- :40
pcall(skynet.newservice, skynet.getenv "start" or "main")    -- :50，启动业务入口
```

到 `start` 指向的 Lua 服务跑起来、监听端口就绪，服务才算就绪。示例入口 `examples/main.lua:6-21` 依次拉起 debug_console、simpledb、watchdog，并让 watchdog 监听 8888。

### 4. 网络层（acceptor / 连接管理 / 编解码）

**事件循环**：socket 线程循环调 `skynet_socket_poll`（`skynet_socket.c:79`）→ `socket_server_poll`（`socket_server.c:1708`）。就绪描述符由 epoll/kqueue 报告（`socket_epoll.h:31-49` 的 `EPOLLIN`/`EPOLLOUT` 控制），控制命令走一条 self-pipe 用 `select` 读（`socket_server.c:1295` 的 `recvctrl_fd`）——业务线程通过写管道向网络线程下达 connect/listen/close 指令，网络线程只输出事件，读写全部收敛在一个线程。

**事件到消息**：网络事件统一打成分发消息 `forward_message`（`skynet_socket.c:39`），类型覆盖 `SKYNET_SOCKET_TYPE_DATA / CLOSE / CONNECT / ERROR / ACCEPT / UDP / WARNING`（`skynet_socket.c:89-107`），以 `PTYPE_SOCKET`（`skynet.h:15`）投给目标服务。**网络即消息**：accept、可读、断开在 Lua 服务眼里是同一种东西。

**连接管理的官方姿势**是 C 层 gate + Lua 层 watchdog/agent 三件套：

- gate（`service-src/service_gate.c`）持 `listen_id`（`:25`）负责 listen 与限流，收到 `forward` 命令后把某个 fd 绑定给指定 agent（`:112-126` `_forward_agent`）
- watchdog（`examples/watchdog.lua:9-14`）收到 `SOCKET.open` 就 `skynet.newservice("agent")` 为该连接开一个专属 agent 服务
- agent（`examples/agent.lua:87`）调 `gate` 的 `forward`，此后该客户端的流量直投 agent——**连接与 actor 一一对应**，业务逻辑天然隔离

**编解码**：粘包拆分在 C 侧由 netpack 模块完成（`lualib-src/lua-netpack.c`）——帧格式是「uint16 大端长度 + 数据」，文件头注释写明「Each package is uint16 + data」（`:28`），打包侧在 `:436`；应用层协议生态以 sproto（`lualib/sproto.lua`）为代表。这对应教程第 03 讲 2.2 节「协议三件套」的 C 侧实现位：拆包器在引擎内，协议定义文件仍是两端共享的单一来源。

### 5. 消息分发与路由

**消息头**：`skynet.h:9-26` 定义消息类型——`PTYPE_TEXT`（0）、`PTYPE_RESPONSE`（1，RPC 回包）、`PTYPE_CLIENT`（3，客户端流量）、`PTYPE_SOCKET`（6）、`PTYPE_LUA`（10）等；类型编号存进消息长度的比特高位（`MESSAGE_TYPE_SHIFT`），一条 `skynet_message` 就是 `source + session + 指针`，零拷贝倾向明显。

**两级队列**：每个服务一个私有 `message_queue`，全局一个 `global_queue`（`skynet_mq.c:35-41`）。入队 `skynet_mq_push`（`:190`）把服务队列压进全局队列，出队 `skynet_mq_pop`（`:138`）由 worker 执行；两级各持一把 spinlock（`:22`、`:38`）——这是整个内核仅有的锁竞争点。

**调度循环**：`skynet_server.c:293` 的 `skynet_context_message_dispatch` 从全局队列弹一个服务队列 → `skynet_handle_grab` 找到服务上下文 → 按权重批量弹出消息 → `dispatch_message`（`:256-281`）调用服务注册的回调 `ctx->cb`，附带 CPU profile 统计与消息日志钩子。回调返回 0 时框架负责释放消息内存（`reserve_msg` 约定）。

**寻址与路由**：服务地址 `handle` 是 32 位整数，高位为 harbor id（`skynet_imp.h` 的 `HANDLE_REMOTE_SHIFT`），低位为本地槽位。本地注册用环形探测找空槽、槽满倍增（`skynet_handle.c:91-127`）；`skynet_send`（`skynet_server.c:696`）按 handle 投递，`skynet_sendname`（`:742`）按 `.name` 名字解析后投递。跨机消息交给 harbor 服务（`service-src/service_harbor.c`，配置 `harbor = 1`）；更大规模用 cluster 组件（`service/clusterd.lua` 系，master/slave/agent/sender 四件套）。

### 6. 并发模型（actor / 线程 / 协程）

skynet 的并发哲学一句话：**服务内串行、服务间靠消息、等待靠协程**。

- **actor 串行性**：一个服务的消息回调同时只有一个在执行（`dispatch_message` 有 `CHECKCALLING` 断言保护，`skynet_server.c:256-281`），服务内部不需要加锁
- **跨服务通信**：只有 `skynet.send`（`lualib/skynet.lua:694`，fire-and-forget）与 `skynet.call`（`:728`，request-response）
- **协程化 RPC**：`call` 内部用 session 关联协程——`session_id_coroutine` 等 4 张映射表（`lualib/skynet.lua:61-64`）记录「哪个 session 等在哪个协程上」，`PTYPE_RESPONSE` 回包到达时唤醒对应协程。Lua 协程让「发请求等回包」写成同步风格，回调不传染
- **辅助原语**：`skynet.sleep`（`:517`）、`skynet.wait`（`:537`）、`skynet.timeout`（`:497`）、`skynet.fork`（fork 队列定义在 `:72`、入队在 `:896-898`）

对服务端设计者的含义：**业务代码写起来像阻塞式，运行起来是事件驱动**——教程第 05 讲的「协程思路」在 skynet 里是一个完整落地样本，代价是任何一次忘记 `skynet.ret` 都会让协程永久悬挂（框架在多次调度后发现悬挂会报 `SUSPEND` 错误，`lualib/skynet.lua:450` 附近）。

### 7. 定时器与主循环

skynet 没有业务主循环——**timer 线程就是节拍源**（`skynet_start.c:131-157`）：每 2.5ms 调一次 `skynet_updatetime`（`skynet_timer.c:246`），推进系统时间与定时器。

定时器结构是**五级时间轮**：精度注释「centisecond: 1/100 second」（`skynet_timer.c:226`），近端 256 槽 + 4 层各 64 槽（`:17-22` 常量、`:40-41` 结构）。`timer_add`（`:89-99`）把到期事件交给 `add_node`（`:68-86`）按到期时间分级挂链；`timer_update`（`:166-178`）每厘秒执行「先派发、再进位、再派发」——先 `timer_execute`（`:153-163`）兜底派发 0 厘秒到期的极少数事件，再 `timer_shift`（`:112-132`）把近端走完的槽从高层级搬迁下来，最后再派发本厘秒到期事件。到期派发的形态仍是消息：`dispatch_list`（`:135-150`）给目标服务投一条 `PTYPE_RESPONSE` 空消息（session 即定时器 id）——定时器不引入新的分发通道，复用第 5 节那套队列。服务侧注册入口 `skynet_timeout`（`:205`）：到期时间非正的直接投递 `PTYPE_RESPONSE`，否则进时间轮。Lua 封装 `skynet.timeout/sleep`（`lualib/skynet.lua:497/517`）。

节拍不漂移的秘密在 `skynet_updatetime`（`:246-260`）：用 `CLOCK_MONOTONIC` 乘 100 取厘秒（`gettime`，`:236-243`），与上次时间点求差后**循环补 tick**——`usleep(2500)` 实际睡多久无所谓，欠了几厘秒就补几轮 `timer_update`。业务层不用感知线程调度抖动，这是服务端定时器实现里值得直接抄的一手。

**服务端提示**：厘秒是业务定时器的精度上限——对心跳、活动开关、每日重置这类分钟级/秒级任务绰绰有余；帧同步等亚 10ms 强实时逻辑不该建在它上面（对照教程第 03 讲 2.1 节的超时推导：阈值设计里「服务端处理余量」一项，在这套框架里取厘秒级粒度即可）。

### 8. 持久化

**skynet 本体不提供持久化**——`skynet-src/` 中没有任何存储组件（未见于源码）。这不是缺陷而是边界：skynet 把「内存中的 actor 世界」做扎实，落库交给业务：

- 数据库客户端库：`lualib/skynet/db/` 下的 `redis.lua`、`mysql.lua`、`mongo.lua`，全部架在 `lualib/skynet/socketchannel.lua` 之上——channel 工厂在 `:26`，`connect`（`:474`）带重连，`request`（`:510`）按 session 关联响应，消费侧支持按 session 派发（`dispatch_by_session`，`:96`）与单线程按序派发（`dispatch_by_order`，`:194`）两种模型。连接管理、断线重连、请求-响应配对这套脏活都在 channel 层做完，各数据库客户端只剩协议编解码
- 示例服务：`examples/main_mongodb.lua`、`examples/main_mysql.lua`；内存键值示例 `simpledb`（`examples/main.lua:17` 拉起）
- 需要跨服务共享热数据时用 sharedata/sharetable（`lualib/skynet/sharedata.lua`、`sharetable.lua`），仍是内存层——sharedata 提供只读共享表，sharetable 支持整表热加载替换，都不落盘

设计含义与教程第 03 讲 1.1 节「权威归服务端」同题：状态权威在服务内存里，**落库时机、对账、回档窗口全部由业务层显式设计**——框架不替你兜底，也不假装替你兜底。

### 9. 构建与最小运行

```bash
make linux          # 产物：skynet 可执行 + cservice/*.so（C 服务）+ luaclib/*.so（C Lua 模块）
./skynet examples/config
```

示例配置（`examples/config:4-12`）的关键字段：

```text
thread = 8                    # worker 线程数
harbor = 1                    # 节点 id；0 为单机模式
start = "main"                # 业务入口服务
bootstrap = "snlua bootstrap" # 引导服务
standalone = "0.0.0.0:2013"   # master 地址（多节点时）
```

最小业务服务只需一个 Lua 文件：`skynet.start(function() ... end)` 注册回调，`skynet.dispatch("lua", ...)` 处理消息、`skynet.ret(skynet.pack(...))` 回包（`examples/watchdog.lua:48-56` 的 dispatch 骨架）。

C 侧真正解析的配置键只有 8 个（`skynet_main.c:159-171`）：`thread`（worker 数，取值范围 1 到 `SKYNET_MAXTHREAD`）、`cpath`（C 服务模块搜索路径）、`harbor`、`bootstrap`、`daemon`、`logger`/`logservice`、`profile`；其余键（`start`、`standalone`、`master`、`address` 等）由 Lua 侧经 `skynet.getenv` 自取——`bootstrap.lua:5` 第一行就读了 `standalone`。配置体系于是分两层：C 内核只关心调度与 IO 的参数，业务参数全部留给 Lua 世界。

把最小骨架落成文件、按 `LUA_SERVICE` 模式串放进搜索路径、`start` 指向它，就是第 3 节启动链的终点：

```lua
local skynet = require "skynet"

skynet.start(function()
    skynet.error("hello from a minimal service")
    skynet.exit()
end)
```

### 10. 设计得失点评

**得**：

- **代码量可控、可通读**——C 内核约 7000 行把 actor 调度讲清楚了，出问题能靠读源码而不是猜
- **协程化 RPC 语义干净**——session + 协程表让 Lua 侧写出同步风格的异步代码，回调地狱不存在
- **网络线程单线程化**——IO 事件收敛一个线程，连接管理层无锁竞争，行为可预测
- **权重 worker 调度**——同进程内同时照顾低延迟交互与批量任务，是少见的精细设计

**失**：

- **单进程内存世界，分布式靠自组**——多机要理解 harbor/cmaster/cslave/clusterd 一整条链路（`service/bootstrap.lua:10-40`），概念负担在用户侧
- **定时器厘秒精度**——强实时场景不适用，需要另起高精度方案
- **工程配套缺席**——服务发现、指标、链路追踪、持久化框架均未内置（未见于源码），生产化需要大量自建
- **Lua GC 与消息传递成本**——跨服务传大表会触发序列化拷贝，大对象共享要靠 sharedata 等组件绕行

**与同类对比**：KBEngine（C++ 分布式引擎）内置空间管理、实体同步、账号体系，开箱即用但形状固定；skynet 反其道——只给调度与 IO，业务形状自己捏。Pomelo（Node.js）同为 actor 风格框架，但 JS 单线程事件循环没有 skynet 的多 worker 抢队列，吞吐模型不同。TrinityCore 是 MMO 专用单体服务端，与 skynet 的「通用框架」定位不可互换。回到教程第 03 讲 6 章的选型口径：skynet 属于「轻框架 + 自建配套」一端，团队工程能力决定上限；要全家桶就选重引擎，要自由度就选 skynet——它把选择权连同责任一起交给你。

### 11. 与其他引擎对比

四台引擎的结构性对照（只收可从源码结构直接核对的事实，各台细节以本系列对应篇目为准）：

| 维度 | skynet | KBEngine | TrinityCore | Pomelo |
|------|--------|----------|-------------|--------|
| 进程模型 | 单进程 N worker + 3 固定线程（`skynet_start.c:187-235`） | 多进程拓扑：baseapp/cellapp/loginapp/dbmgr/baseappmgr/cellappmgr/machine 各司其职（`kbe/src/server/` 目录即进程清单） | worldserver + bnetserver 两进程（`src/server/worldserver`、`src/server/bnetserver`） | master/monitor 进程管理 + 前后端分角色（`lib/components/master.js`、`monitor.js`、`connector.js`、`backendSession.js`） |
| 并发模型 | actor + Lua 协程，服务内串行 | 进程内多线程 + 实体事件回调 | 主更新循环 + 地图更新线程池（`src/server/game/Maps/MapUpdater.h`），网络走 boost::asio（`src/server/shared/Networking`） | Node.js 单线程事件循环，进程间 RPC |
| 网络与拆包 | 单 socket 线程 + netpack（uint16 大端长度帧） | 引擎内置网络层与消息分包（`kbe/src/lib/network`），面向实体事件 | boost::asio 异步 socket | connector 层内置多协议连接器（`lib/connectors/`） |
| 脚本层/热更 | Lua 即热更，语言原生 | Python 实体脚本（`kbe/src/lib/pyscript`）；server 源码 grep Reload 无命中，更新走重启 | 未内置脚本引擎（未见于源码），逻辑扩展走 C++ 编译 | JS 无原生热更，重启式 |
| AOI/空间 | 无（自建） | 内置 witness + range_trigger（`kbe/src/server/cellapp/witness.h`、`range_trigger_node.h`） | 内置地图与网格管理（`src/server/game/Maps/`，MMO 单场景特化） | 无（自建） |
| 上手成本 | 低——内核小，但要理解 actor 纪律 | 中高——cell/base/mailbox/entitydef 概念面大 | 高——C++ 重构建链 + 数据导入 | 低——JS 生态即插即用 |
| 生态与现状 | 中文社区为主，云风持续维护 | 社区开源，中英文档 | 魔兽服务器社区，数据与脚本积累规模大 | 上游最后提交 2019-11（浅克隆 HEAD），活跃度存疑 |
| 性能特征 | 长连接高并发，内存世界吞吐稳定 | 空间同步开销换 MMO 语义 | 单场景重模拟，CPU 密集 | V8 单线程吞吐上限 |

### 12. 设计优缺点与取舍

skynet 的每个设计选择都是一笔「用 X 换 Y」的明账：

- **C 内核 + Lua 服务，双语言分工**——换来：调度/网络/定时器这些热路径全是 C，性能可控；业务全在 Lua，改完即生效不用重编译。付出：两套心智模型，热点循环落在 Lua 就慢，跨语言边界（`lualib-src/` 的 C 模块）是额外维护面
- **服务 = 常驻 Lua VM**——换来：服务天然隔离（一个服务出问题不传染别家），内核只见 handle 与队列、调度单位统一。付出：每服务一个 VM 的内存基线，海量细粒度服务时内存放大，业务要按负载控制服务粒度
- **消息传递而非共享内存**——换来：业务代码无锁（服务内串行由内核保证），并发缺陷面大幅收窄。付出：跨服务传大数据要序列化拷贝，共享读多写少的数据得绕道 sharedata/sharetable（第 8 节），这是真实的性能税
- **单 socket 线程**——换来：连接管理层零锁竞争、事件顺序可预测，排查网络问题只有一条路径。付出：网络线程是单点，吞吐上限锁在一个核的 epoll 循环上——skynet 的应对是把「拿到数据之后的一切」都推给 worker 池，自己只做转发（`forward_message`，`skynet_socket.c:39`）
- **不内置持久化/服务发现/指标**——换来：内核约 7000 行的可通读性，以及按各家存储与运维栈自由组合的余地。付出：生产化配套全部自建，新团队从「跑起来」到「能上线」的距离比全家桶引擎长
- **协程 RPC**——换来：同步风格写异步（第 6 节），回调不传染。付出：纪律成本——`skynet.ret` 漏调用协程就悬挂，要靠监控而非语法兜底

一句话概括取舍逻辑：skynet 把「正确的并发结构」做进内核，把「性能、运维、存储」的选择权交给用户——它赌的是使用者的工程能力，这既是自由度的来源，也是使用门槛。

### 13. 适用游戏场景

按玩法特性对号入座，给出明确判断：

**适合，且是合理默认：**

- **卡牌 / 回合制 / 棋牌**——典型请求-响应型负载，`skynet.call` 的协程 RPC 与战斗结算的服务内串行天然匹配；单进程内存世界足够承载一套卡牌的房间与匹配
- **SLG / 放置挂机 / 模拟经营**——大量低频状态更新加定时任务（收菜、补给、赛季重置），时间轮厘秒粒度绰绰有余（第 7 节）
- **IO 密集长连接服务**——聊天、推送、公告、匹配池、网关聚合：netpack 拆包加 agent 一连接一服务，正是 gate/watchdog/agent 三件套的原生形态（第 4 节）

**可做，但要清楚自建成本：**

- **房间制竞技（MOBA 局内 / FPS 对局）**——帧驱动要在消息循环之上自建（以 `skynet.timeout` 驱动 tick 需评估厘秒粒度是否够用），强实时对局更适合专用对局服方案；房间管理与匹配部分仍适合 skynet
- **中小规模 MMO**——AOI 与实体管理不在框架内（第 1 节「未见于源码」清单），要自建或引入组件；社交、公会、邮件等非空间部分适合 skynet

**不适合，明确劝退：**

- **重物理 / 强 3D 服务端模拟**——Lua 不适合密集浮点与物理积分，框架也没有任何空间与物理设施；这类负载选 C++ 引擎形态（如 KBEngine/TrinityCore）或专用物理服
- **亚 10ms 级实时同步**——厘秒定时器加消息调度的延迟量级不支持，对 tick 精度有硬要求的帧同步服务端应另起方案
- **期望开箱即用全家桶、团队无意自建配套**——skynet 的自由度以工程能力为前提（第 12 节），没有这份投入就选带引擎设施的方案

一句话收束：玩法是请求-响应或状态聚合型，skynet 的设计就是为它长的；玩法吃计算精度或空间语义，就换有这些设施的引擎。

## Used By

- 服务端三棵子树的结论回引本文：[执行模型与运行时](/server/runtime/00) 的立场总览、[服务拆分与控制平面](/server/services/01) 的「按角色拆而非按进程拆」、[Tick 与时间推进](/server/sync/01) 的时间源——三处都按小节回引（第 2、5、7 节）
- 玩法系统侧的落点：[排行榜](/system/leaderboard) 的单写者服务语义、[PVP 匹配](/system/pvp-matchmaking) 的撮合器常驻 actor、[队伍匹配](/system/party-matchmaking) 的撮合池服务内串行
- 树根总览把本文与 [AOI](/server/aoi) 并列为 server 树的两枚横向节点：一个回答「一个进程怎么调度上千服务」，一个回答「同屏可见集怎么裁」；本文第 8 节恰好说明这两件事都属框架之外的边界

## Related

关系链：仓库定位 → 线程与队列 → 启动链 → 网络层 → 分发与路由 → 并发模型 → 定时器与主循环 → 持久化边界 → 构建与最小运行 → 得失点评 → 横向对比 → 取舍 → 适用场景。逐段回答「为什么需要下一个」：

- 定位先于实现：第 1 节先说清它不做什么，后面所有「未内置」才是边界而不是遗漏
- 线程与两级队列是全篇地基：分发、并发模型、定时器三节都复用第 5 节那套队列，没有第二套机制
- 持久化一节给的是反面约束：框架不兜底，落库时机与对账窗口必须由业务显式设计——这正是 database 树与 runtime 树的交界
- 横向对比放在得失之后：先自己评一遍再与四台引擎并排，结论才不会被对比表带着走

姊妹节点：[AOI](/server/aoi)（skynet 明确不内置、需自建的那一半）、[执行模型与运行时](/server/runtime/)、[服务拆分与控制平面](/server/services/)；与教程第 03 讲（前端引擎与客户端）互为镜像，那边反推服务端设计，这边读服务端框架源码。

## Reference

- 上游官方仓 `https://github.com/cloudwu/skynet`（MIT，Copyright 2012-2025 codingnow.com）；本文全部 文件:行号 基于 commit `64391f7`（2026-09-29 浅克隆）
- 站内其他节点引用 skynet 时按各自核对时的 commit 锚定（如 `64391f7`）；换 commit 后行号可能漂移，核对时以引用处标注的 commit 为准
- 术语对照：Service（服务 = 一个常驻 Lua VM）、Message Queue（服务私有队列）、Global Queue（全局队列）、Harbor（节点 id）、Cluster（集群组件）、Centisecond Time Wheel（厘秒时间轮）、Agent（连接专属服务）
- 本页为工程经验归纳；页内实战案例为教学示例（数字取整简化）

### 实战案例：一次「帧同步建在 skynet 上，tick 精度不够」的边界误判排查

> 案例为教学示例（非摘自真实项目），数字经过取整简化。它把本页第 7 节的厘秒精度与第 13 节的适用场景用到深水区：通用框架被当成专用对局服——这是边界误判的排查，也是「怎样让框架的边界成为选型的依据」的完整展开。

**背景与现象**：某团队把帧同步对局建在 skynet 上，上线后 tick 抖动 **20** 毫秒，对局双方节奏对不上；排查发现定时器厘秒精度与消息调度抖动叠加，帧同步要的亚 **10** 毫秒强实时这套框架给不了。

### 第一步：现象与口径——先分清是哪一层不够

精度口径：定时器是厘秒精度（**1/100** 秒），帧同步要亚 **10** 毫秒——精度上限差一个量级。

调度口径：消息经两级队列，worker 按权重抢队列，调度抖动叠加在 tick 上。

内存口径：服务 = 常驻 Lua VM，每服务一个 VM 的内存基线，服务粒度没按负载控制时内存放大。

### 第二步：分层归因——按本页边界清单比对

```text
tick 抖动归因  占比
  厘秒精度不满足亚 10ms 帧同步     55%
  消息调度抖动叠加                 27%
  服务粒度没按负载控制，内存放大    18%
```

逐项比对：厘秒精度差一个量级——命中「帧同步等亚 10ms 强实时逻辑不该建在它上面」；调度抖动——命中两级队列的 worker 抢队列有抖动；内存放大——命中「每服务一个 VM 的内存基线，海量细粒度服务时内存放大」。

### 第三步：根因——把通用框架当成了专用对局服

skynet 把「正确的并发结构」做进内核，把「性能、运维、存储」的选择权交给用户——它赌的是使用者的工程能力。帧同步对局是亚 **10** 毫秒强实时负载，厘秒定时器加消息调度的延迟量级不支持，这类负载该选专用对局服或 C++ 引擎形态。

### 第四步：处置与回填——各归各位，配套立项

1. 帧同步对局迁出：迁专用对局服方案，skynet 留请求-响应与状态聚合型玩法（卡牌、SLG、IO 密集长连接）。
2. 服务粒度按负载控制：收敛细粒度服务，内存基线回到合理区间。
3. 自建配套立项：服务发现、指标、链路追踪、持久化框架按正式项目立项，不写进业务服务。
4. 适用场景对号：玩法吃计算精度或空间语义就换有这些设施的引擎，skynet 的自由度以工程能力为前提。

复核账：tick 抖动 **20** 毫秒 → 专用对局服 **2** 毫秒；skynet 侧服务粒度收敛 **30**%；自建配套 **8** 项立项。

**回填清单**：

| 回填项 | 动作 | 回填处 |
|-----|------|--------|
| 精度边界 | 厘秒定时器不承载亚 10ms 帧同步 | Algorithm |
| 适用场景 | 请求-响应与状态聚合型留 skynet，强实时迁出 | Algorithm |
| 服务粒度 | 按负载控制粒度，收敛细粒度服务 | Problem |
| 配套立项 | 服务发现/指标/追踪/持久化按正式项目立项 | Reference |

### 案例的三个教训

1. **框架的边界是选型的依据**。厘秒精度加消息调度不支持亚 10ms 帧同步，通用框架不能当专用对局服。
2. **自由度以工程能力为前提**。skynet 把性能、运维、存储的选择权交给用户，配套要按正式项目立项。
3. **服务粒度是内存账**。每服务一个常驻 Lua VM，细粒度服务海量时内存放大。
