# 服务端语言与运行时

## Category

server / 横向节点 / 语言与选型。一句话：服务端语言选型不是语法偏好，而是「对局逻辑以什么运行时模型执行、热更边界切在哪层」的选型。

## Definition

客户端语言地图（[engines/02](/client/engines/02)）的四问——人才、熟悉度、生态、历史——在服务端同样成立，但服务端多出两条自己的硬约束：**实时性**（tick 预算与 GC 停顿直接决定帧抖动）与**权威性**（权威逻辑要在运营期改，改的通道就是热更面）。所以成熟的服务端语言形态几乎都是双层：一门核心语言承载权威与并发，一层脚本承载高频变化的玩法逻辑。语言选择的实质，是给这两层各选一个运行时。

## Problem

- **按榜单选**：性能榜单和语法偏好不回答「这个运行时的停顿形态能否塞进 tick 预算」。GC 停顿形态（并发标记 vs 全停顿）不同，同一段代码的帧表现可以差一个量级。
- **单语言理想主义**：客户端与服务端的要求本来就不同（多语言并存是常态，见 [engines/02](/client/engines/02) 的多语言边界）。服务端全用脚本，CPU 密集段顶不住；全用编译型，每次改活动逻辑都要走发版。
- **热更与权威打架**：服务端是权威，运营期又要频繁改数值与活动逻辑。没有脚本层的服务端用「重启发版」硬扛；有脚本层的服务端若不把热更边界画清楚，权威口径跟着漂移（热更体系见 [system/scripting/04](/system/scripting/04)）。
- **低估人才与生态的地心引力**：并发友好的语言很多，能招到人、协议栈 / DB 驱动 / 可观测生态齐备的不多——engines/02 四问里生态一问在服务端最贵。

## Algorithm

### 运行时四型

| 运行时模型 | 代表 | 逻辑执行形态 | 热更面 | 典型代价 |
|-----------|------|-------------|--------|---------|
| 编译核心 + 嵌入脚本 VM | BigWorld（C++ + Python）、KBEngine（C++ + Python）、skynet（C + Lua） | 权威与 IO 在编译核心，玩法逻辑在脚本 | 脚本层热载 | 两套语言心智，跨语言边界要管理 |
| 托管运行时 | Orleans（.NET）、Nakama（Go 核心 + Lua/TS/Go 扩展） | GC 换生产力，Actor / 粒度并发 | 运行时插件 / 灰度部署 | 停顿形态要配容量模型 |
| 原生并发 GC 语言 | leaf、nano（Go） | goroutine / channel 化的并发 | 编译期，靠模块化 + 发版 | 运营期改逻辑慢 |
| 事件循环脚本运行时 | Colyseus（Node.js） | 单线程事件循环，房间级隔离 | 部署期换代码 | CPU 密集上限低，多核靠多进程 |

### 选型四问（engines/02 四问的服务端投影）

1. tick 预算下，这个运行时的停顿形态可容忍吗？
2. 它的并发模型与对局模型匹配吗（房间制并行 vs 大世界单世界串行）？
3. 热更边界切在哪一层，谁有权改权威逻辑？
4. 人才存量与生态（协议、DB 驱动、可观测性）接得住吗？

落地路径：先按运行时模型定性，再用四问收窄，最后对照 [开源服务器地图](./map.md) 看有没有形态匹配的现成实现——能选形态就不要从语言开始造。

## Used By

- **BigWorld**（commit `088d3b84`，路径相对 `programming/bigworld/`）：C++ 服务端 + 嵌入式 Python（`README.md:21`）——引擎侧承载 AOI、同步与持久化，实体玩法方法全部写在 Python 脚本层。
- **KBEngine**（commit `0bc93d5`）：同构的双层选择——「The engine is written in C++」（`README.md:71`），Python 脚本「supports hotfixing」（`README.md:67`），Python 3.12 嵌入运行时（`README.md:132`）。
- **skynet**（commit `64391f7`）：「multi-user Lua framework supporting the actor model」（`README.md:3`）——C 只做内核与调度，业务逻辑全部是 Lua Actor。
- **Nakama**（commit `e920249`）：Go 编译核心 + 三选一运行时扩展（Lua / TypeScript / Go，`README.md:27`），`go.mod:1` 声明 Go 模块——平台核心编译、玩法扩展脚本化的混合形态。
- **leaf**（commit `af71eb0`）：「A pragmatic game server framework in Go」（`README.md:3`）；**nano**（commit `dbf22c7`）：Go 网络库（`README.md:12`）——原生并发语言形态的轻量端。
- **Colyseus**（commit `e620123`）：「Authoritative Multiplayer Framework for Node.js」（`README.md:21`）——事件循环形态，房间模拟 60fps 推进（`packages/core/src/Room.ts:57-58`）。
- **Orleans**（commit `b084e03`）：.NET 上的 Virtual Actor Model（`README.md:10`、`:16`）——托管运行时把分布式复杂性收进运行时，开发者只写 grain。

## Related

关系链：实时性与权威两条硬约束 → 双层结构 → 运行时四型 → 选型四问 → 落地地图。逐段回答「为什么需要下一个」：

- 约束定了才有双层：实时性与权威性决定「核心承载权威、脚本承载变化」的分工（脚本层定位见 [脚本层定位与语言选择](/system/scripting/01)）。
- 双层定了才选运行时：两层的语言合起来才是完整的技术栈决定，单说「服务端用什么语言」说不清。
- 运行时定了要过四问：人才、生态、热更、停顿把候选收窄到可执行的一两个。
- 四问过了要落地：[开源服务器地图](./map.md) 按形态给出可对照的现成实现，避免从零造。

上游：[engines/02 语言地图](/client/engines/02)（四问的客户端版）、[engines/03 选型综合](/client/engines/03)（自研/框架/现成方案的判断）；下游：[开源服务器地图](./map.md)（形态落地）、[执行模型与运行时](/server/runtime/)（并发模型的展开）。

## Reference

- 本页为工程经验归纳；各家引擎事实以文内 commit 锚定的源码引用为准
- 术语对照：Runtime Model（运行时模型）、Embedded Scripting（嵌入式脚本）、Hotfix（热修复）、GC Pause（GC 停顿）
