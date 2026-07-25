# 06 常见框架：从最轻到最重

游戏服务器框架按复杂度从轻到重排列，从一个简单的 HTTP Server 到完整的游戏引擎级框架。理解每种框架的定位，有助于在不同阶段选择合适的工具。

---

## 框架光谱：从轻到重

```
轻 ◀──────────────────────────────────────────────────▶ 重

HTTP Server → Netty → Skynet → Pitaya → Photon → KBEngine → BigWorld
(通用)      (网络库)  (Actor)  (Go框架)  (商业)   (Python)   (商业)
```

| 重量级 | 框架 | 语言 | 核心模型 | 学习曲线 | 生产力 |
|-------|------|------|---------|---------|-------|
| 🪶 轻 | HTTP Server | 任意 | 请求-响应 | ⭐ | ⭐⭐ |
| 📦 中轻 | Netty | Java | Reactor | ⭐⭐ | ⭐⭐⭐ |
| 🎯 中 | Skynet | C + Lua | Actor | ⭐⭐⭐ | ⭐⭐⭐ |
| 🚀 中 | Pitaya | Go | Actor + Cluster | ⭐⭐ | ⭐⭐⭐⭐ |
| 💼 中重 | Photon Server | C# | Actor + 状态机 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 🏗️ 重 | KBEngine | C++ + Python | Entity + Cell | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 🏔️ 最重 | BigWorld | C++ + Python | Entity + Space | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 1. HTTP Server（通用 HTTP 服务）

### 最简单的起点

```go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Token   string `json:"token,omitempty"`
	Error   string `json:"error,omitempty"`
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	resp := LoginResponse{Success: true, Token: "tok_abc123"}
	json.NewEncoder(w).Encode(resp)
}

func main() {
	http.HandleFunc("/api/login", loginHandler)
	fmt.Println("HTTP server on :8080")
	http.ListenAndServe(":8080", nil)
}
```

**适用**：登录服、支付回调、活动接口、后台管理 API
**局限**：无状态管理、无实时推送、无房间概念
**谁在用**：几乎所有游戏都有 HTTP 层做辅助服务

---

## 2. Netty（Java 网络框架）

### Java 游戏服务器的基石

Netty 本身不是游戏框架，但它是 Java 游戏服务器最常用的网络层。

```
┌─────────────────────────────────────┐
│           Netty Pipeline            │
│  ┌──────┐ ┌──────┐ ┌────────────┐  │
│  │Decode│→│Logic │→│   Encode   │  │
│  └──────┘ └──────┘ └────────────┘  │
│       ↑                  ↓          │
│  ByteBuf in          ByteBuf out   │
└─────────────────────────────────────┘
```

**核心特性**：
- Reactor 线程模型，epoll/kqueue 高性能
- 零拷贝、内存池
- Channel Pipeline 编解码链
- 心跳检测、断线重连

**Java 游戏服务器常见架构**：
```
Netty (网络层) + Spring (业务层) + Redis (缓存) + MySQL (持久化)
```

**代表项目**：
- Apollo（携程开源游戏服务器）
- JKing
- 各种自研 Java MMO 框架

**优点**：Java 生态成熟、高并发验证充分
**缺点**：内存占用大、启动慢、GC 停顿

---

## 3. Skynet（C + Lua Actor 框架）

### 轻量级 Actor 框架的代表

Skynet 是云风开源的 C 语言游戏服务器框架，核心是 **Actor + Lua 协程**。

```
┌──────────────────────────────────────────┐
│               Skynet                     │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │Service1│ │Service2│ │Service3│  ...   │
│  │ (Lua)  │ │ (Lua)  │ │ (C)   │       │
│  └───┬────┘ └───┬────┘ └───┬────┘       │
│      └────┬─────┘──────────┘            │
│           ↓                              │
│     消息队列 (全局单队列)                 │
│  ┌──────────────────────────────────┐   │
│  │    Timer   │   Network   │  IO   │   │
│  └──────────────────────────────────┘   │
│        多个工作线程消费队列               │
└──────────────────────────────────────────┘
```

**架构特点**：
- 一个 Skynet 实例 = 一组 C 线程 + 一组 Lua 服务
- 每个服务是独立 Actor，通过消息通信
- Lua 协程实现异步 I/O 的同步写法
- 全局消息队列，工作线程竞争消费

**代码示例：Skynet 服务**

```lua
-- gate.lua - 简化的连接管理服务
local skynet = require "skynet"

local connections = {}

skynet.register_protocol {
    name = "client",
    id = skynet.PTYPE_CLIENT,
}

function init()
    skynet.error("gate service started")
end

function handle_message(fd, msg)
    if not connections[fd] then
        connections[fd] = { id = fd, login_time = os.time() }
        skynet.error(string.format("player %d connected", fd))
    end

    -- 转发给对应玩家服务
    skynet.send("player_service", "lua", "on_message", fd, msg)
end

function handle_disconnect(fd)
    connections[fd] = nil
    skynet.error(string.format("player %d disconnected", fd))
end
```

**谁在用**：
- 《阴阳师》（网易）
- 众多中小型游戏
- 大量独立游戏后端

**优点**：轻量（整个框架 ~100KB）、Actor 模型清晰、C 扩展性能好
**缺点**：Lua 性能有限、单进程、调试工具有限

---

## 4. Pitaya（Go Actor + 集群框架）

### Go 生态的现代游戏服务器框架

Pitaya 由 TFG Co 开源，基于 Go + Protobuf，内置 Actor 模型和集群支持。

```
┌─────────────────────────────────────────┐
│              Pitaya 架构                 │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ Frontend │  │ Backend  │  │ Agent │ │
│  │ (网关)   │→│ (逻辑)   │→│(玩家) │ │
│  └──────────┘  └──────────┘  └───────┘ │
│       │             │            │       │
│       └───────── NATS ──────────┘       │
│              (消息总线)                   │
└─────────────────────────────────────────┘
```

**代码示例：Pitaya 服务**

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/topfreegames/pitaya/v2"
	"github.com/topfreegames/pitaya/v2/component"
)

// 玩家模块 - 绑定到 Player 实体
type Player struct {
	component.Base
	ID   string
	Name string
	HP   int
}

// RPC 方法 - 可被其他服务远程调用
func (p *Player) GetInfo(ctx context.Context, msg *PlayerInfoRequest) (*PlayerInfoResponse, error) {
	return &PlayerInfoResponse{
		Id:   p.ID,
		Name: p.Name,
		Hp:   int32(p.Hp),
	}, nil
}

// 客户端调用的方法
func (p *Player) Move(ctx context.Context, msg *MoveRequest) (*MoveResponse, error) {
	fmt.Printf("player %s moved to (%.0f, %.0f)\n", p.ID, msg.X, msg.Y)
	return &MoveResponse{Success: true}, nil
}

func main() {
	// 创建 Pitaya 实例
	app := pitaya.New(pitaya.Cluster)

	// 注册玩家组件
	app.Register("player", &Player{})

	// 启动服务器
	app.Start(context.Background())
}
```

**核心特性**：
- Go 原生，goroutine 并发
- 内置集群发现（NATS / etcd）
- Frontend / Backend 分离
- Protobuf RPC

**优点**：Go 生态、现代化、内置集群、文档完善
**缺点**：社区相对小、需要自己搭建运维

---

## 5. Photon Server（商业游戏服务器）

### 商业级多人游戏引擎

Photon 是 Exit Games 公司的商业产品，广泛用于手游和独立游戏。

**核心特性**：
- C# 开发
- 内置 Actor（Player）模型
- 状态同步 + 帧同步
- 房间管理、匹配系统
- 客户端 SDK 支持 Unity / Unreal / WebGL / Native

**代码示例（C# 伪代码）**：

```csharp
// Photon Server 自定义 GameLogic
public class MyGame : GameLogic
{
    public override void OnJoinGame(Player player)
    {
        BroadcastEvent("PlayerJoined", player.ID);
    }

    public override void OnEvent(byte eventCode, Player sender, object data)
    {
        switch (eventCode)
        {
            case EventCode.Move:
                var pos = (Position)data;
                // 可靠广播给所有房间内玩家
                BroadcastEvent("PlayerMoved", new { sender.ID, pos });
                break;
        }
    }
}
```

**Photon 家族产品**：

| 产品 | 定位 | 价格 |
|------|------|------|
| Photon Server | 本地部署，完全控制 | 付费 |
| Photon Cloud | 云托管，开箱即用 | 按 CCU 计费 |
| PUN (Unity) | Unity 插件，最易用 | 按 CCU |
| Quantum | 帧同步框架 | 付费 |
| Fusion | 状态同步框架 | 免费/付费 |

**优点**：功能完整、客户端 SDK 成熟、文档丰富、社区活跃
**缺点**：商业授权费用、黑箱、定制性有限

---

## 6. KBEngine（开源 MMO 引擎）

### Python + C++ 的完整 MMO 框架

KBEngine 是一款开源 MMO 服务端引擎，源自蜗牛游戏，用 Python（CellApp）+ C++（底层引擎）。

```
┌──────────────────────────────────────────┐
│            KBEngine 架构                  │
│                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Loginapp│  │ CellApp │  │ DBApp   │  │
│  │ (登录)  │  │ (逻辑)  │  │ (数据库)│  │
│  └────┬────┘  └────┬────┘  └────┬────┘  │
│       │            │             │        │
│       └────── Message Router ───┘        │
│              (消息路由)                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Baseapp │  │Manager  │  │Botapp   │  │
│  │(网关)   │  │(管理器)  │  │(机器人) │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└──────────────────────────────────────────┘
```

**核心概念**：
- **Entity**：游戏中的一切（玩家、NPC、道具）
- **Space**：地图/场景
- **CellApp**：Entity 的逻辑处理器
- **Baseapp**：客户端连接网关

**Python 脚本示例**：

```python
# KBEngine Entity 定义
class Player(Entity):
    def __init__(self):
        Entity.__init__(self)
        self.hp = 100
        self.name = ""
        self.spaceID = 0

    def onSpawn(self):
        """玩家在场景中出生"""
        print(f"Player {self.id} spawned in space {self.spaceID}")
        self.addCellTimer("regenerate", 5.0, -1)  # 每5秒回血

    def onDie(self):
        """玩家死亡"""
        print(f"Player {self.id} died")
        self.hp = 100
        self.teleportTo(0)  # 传送回出生点

    def regenerate(self):
        """定时器回调：自动回血"""
        if self.hp < 100:
            self.hp = min(100, self.hp + 5)
            self.client.onHPChanged(self.hp)

    def requstMove(self, x, y, z):
        """客户端请求移动"""
        self.position.x = x
        self.position.y = y
        self.position.z = z
        self.broadcastToOtherClients("onPlayerMoved", self.position)
```

**优点**：完整 MMO 方案、Entity 模型直观、文档中文友好
**缺点**：架构偏旧、Python 性能瓶颈、维护活跃度下降

---

## 7. BigWorld（商业 MMO 引擎）

### 重量级商业解决方案

BigWorld 是最老牌的 MMO 服务端引擎，被《坦克世界》等大作采用。

**架构特点**：
- 完整的 Entity/Space 模型
- 自动空间分割和兴趣管理（AOI）
- Cell 分布式处理
- 成熟的数据库集成

**与 KBEngine 的关系**：KBEngine 的设计深受 BigWorld 影响，是开源的"精神续作"。

---

## 框架选型矩阵

| 维度 | HTTP Server | Netty | Skynet | Pitaya | Photon | KBEngine | BigWorld |
|------|------------|-------|--------|--------|--------|----------|----------|
| 语言 | 任意 | Java | C+Lua | Go | C#/Java | C++/Python | C++/Python |
| 并发模型 | 进程/线程 | Reactor | Actor | Actor+Cluster | Actor | Entity/Cell | Entity/Space |
| 集群支持 | ❌ | 需自建 | 需自建 | ✅ 内置 | ✅ 云 | ✅ | ✅ |
| 房间管理 | ❌ | 需自建 | 需自建 | 需自建 | ✅ 内置 | ✅ 内置 | ✅ 内置 |
| AOI 支持 | ❌ | ❌ | 插件 | ❌ | 有限 | ✅ | ✅ |
| 状态同步 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 帧同步 | ❌ | ❌ | ❌ | ❌ | ✅ Quantum | 插件 | 插件 |
| 学习成本 | ⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 社区活跃度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| 适合项目 | 辅助服务 | 高并发网络 | 中小游戏 | 中型 MMO | 手游/独立 | 大型 MMO | 超大型 MMO |

---

## 按项目阶段选型

### 阶段一：原型验证（1-3 人）

```
推荐：HTTP Server + 简单 WebSocket
原因：最快出活，验证玩法是否可行
```

### 阶段二：小规模上线（3-10 人）

```
推荐：Skynet 或 Pitaya
原因：足够支撑 1000+ 在线，有成熟的 Actor 模型
```

### 阶段三：中型项目（10-30 人）

```
推荐：Pitaya + Redis + 集群
原因：Go 生态、水平扩展、维护成本低
```

### 阶段四：大型 MMO（30+ 人）

```
推荐：自研 或 KBEngine 魔改
原因：需要完全控制 Entity 模型、AOI、状态同步
```

### 阶段五：手游快速上线

```
推荐：Photon (PUN/Quantum/Fusion)
原因：客户端 SDK 完善，匹配/房间开箱即用
```

---

## 自研 vs 使用框架

| 维度 | 自研框架 | 使用开源框架 | 使用商业框架 |
|------|---------|------------|------------|
| 开发周期 | 长 | 中 | 短 |
| 技术掌控 | 完全掌控 | 部分掌控 | 黑箱 |
| 维护成本 | 高（需专人） | 中 | 低 |
| 定制性 | 完全 | 高 | 有限 |
| 风险 | 技术债务 | 社区活跃度 | 厂商依赖 |
| 适合阶段 | 大厂/长期项目 | 中型项目 | 快速上线 |

---

## 小结

| 关键问题 | 答案 |
|---------|------|
| 最简单的起步方式？ | HTTP Server + WebSocket，半小时出原型 |
| 做 MMO 选什么？ | Go (Pitaya) 或 C++/Python (KBEngine) |
| 手游最快上线？ | Photon Cloud，客户端 SDK 买现成的 |
| 为什么 Go 游戏服务器越来越多？ | goroutine 并发简单、CSP 模型天然适合多服务解耦、部署轻量 |
| Skynet 适合什么？ | 中小型项目、Lua 开发者团队、追求极致内存效率 |
| 需要帧同步？ | Photon Quantum 或自研 |
| 需要状态同步？ | Photon Fusion 或自研 (Entity + Interest Management) |
